from __future__ import annotations

import base64
import binascii
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any

import torch
from fastapi import FastAPI, HTTPException, Request, UploadFile
from pydantic import BaseModel
from PIL import Image
from torch import nn
from torchvision import models, transforms
from ultralytics import YOLO


MODEL_PATH = Path(__file__).with_name("agromindaimodel.pth")
YOLO_MODEL_PATH = Path(__file__).with_name("yolo_leaf.pt")
YOLO_CONFIDENCE_THRESHOLD = 0.35
YOLO_CROP_PADDING_RATIO = 0.08


class PredictRequest(BaseModel):
    image_data_url: str | None = None
    top_k: int = 5


class LeafDiseaseConvNeXt(nn.Module):
    def __init__(self, num_classes: int):
        super().__init__()
        self.backbone = models.convnext_tiny(weights=None)
        self.backbone.classifier = nn.Sequential(self.backbone.classifier[0])
        self.local_attn = nn.Sequential(nn.Linear(768, 256), nn.GELU(), nn.Linear(256, 1))
        self.global_head = nn.Linear(768, num_classes)
        self.local_head = nn.Linear(768, num_classes)
        self.head = nn.Sequential(
            nn.Linear(2304, 1152),
            nn.LayerNorm(1152),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(1152, num_classes),
        )

    def forward(self, image: torch.Tensor) -> torch.Tensor:
        features = self.backbone.features(image)
        pooled = self.backbone.avgpool(features)
        global_feat = self.backbone.classifier[0](pooled).flatten(1)

        patches = features.flatten(2).transpose(1, 2)
        attn = torch.softmax(self.local_attn(patches).squeeze(-1), dim=1)
        local_feat = (patches * attn.unsqueeze(-1)).sum(dim=1)

        fused = torch.cat([global_feat, local_feat, global_feat * local_feat], dim=1)
        return self.head(fused)


def preprocess(img_size: int):
    return transforms.Compose(
        [
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ]
    )


@lru_cache(maxsize=1)
def load_bundle() -> dict[str, Any]:
    checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
    config = checkpoint.get("config", {})

    # The new training pipeline saves a standard torchvision ConvNeXt checkpoint.
    # Keep the legacy branch for older development checkpoints.
    new_state_dict = checkpoint.get("model_state_dict")
    class_to_index = checkpoint.get("class_to_index")
    if new_state_dict and class_to_index:
        classes = [label for label, _ in sorted(class_to_index.items(), key=lambda item: item[1])]
        model = models.convnext_tiny(weights=None)
        model.classifier[2] = nn.Linear(model.classifier[2].in_features, len(classes))
        model.load_state_dict(new_state_dict)
        model_name = str(checkpoint.get("model_name") or "convnext_tiny")
        epoch = checkpoint.get("epoch")
        best_acc = checkpoint.get("best_macro_f1")
        img_size = int(checkpoint.get("input_size") or 224)
    else:
        classes = checkpoint.get("classes") or config.get("classes")
        state_dict = checkpoint.get("model")
        if not classes or not state_dict:
            raise RuntimeError("Checkpoint must contain model_state_dict/class_to_index.")
        model = LeafDiseaseConvNeXt(num_classes=len(classes))
        model.load_state_dict(state_dict)
        model_name = "convnext_tiny_legacy"
        epoch = checkpoint.get("epoch")
        best_acc = checkpoint.get("best_acc")
        img_size = int(config.get("img_size", 224))

    model.eval()
    return {
        "model": model,
        "classes": list(classes),
        "preprocess": preprocess(img_size),
        "img_size": img_size,
        "best_acc": best_acc,
        "epoch": epoch,
        "model_name": model_name,
    }


def split_class_name(class_name: str) -> tuple[str, str]:
    if "___" not in class_name:
        return "", class_name.replace("_", " ")
    plant, disease = class_name.split("___", 1)
    return plant.replace("_", " "), disease.replace("_", " ")


def decode_data_url(data_url: str) -> bytes:
    if "," in data_url and data_url.split(",", 1)[0].lower().startswith("data:"):
        data_url = data_url.split(",", 1)[1]
    try:
        return base64.b64decode(data_url, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 image data.") from exc


def image_to_data_url(image: Image.Image, image_format: str = "JPEG") -> str:
    buffer = BytesIO()
    image.convert("RGB").save(buffer, format=image_format, quality=92)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    mime = "image/jpeg" if image_format.upper() in {"JPEG", "JPG"} else "image/png"
    return f"data:{mime};base64,{encoded}"


@lru_cache(maxsize=1)
def load_yolo_model() -> YOLO:
    if not YOLO_MODEL_PATH.exists():
        raise RuntimeError(f"YOLO model not found at {YOLO_MODEL_PATH}")
    return YOLO(str(YOLO_MODEL_PATH))


def detect_leaf_and_crop(image: Image.Image) -> dict[str, Any]:
    source = image.convert("RGB")
    model = load_yolo_model()
    results = model.predict(source, conf=YOLO_CONFIDENCE_THRESHOLD, verbose=False)
    result = results[0] if results else None

    if result is None or result.boxes is None or len(result.boxes) == 0:
        return {
            "is_leaf": False,
            "confidence": 0.0,
            "reason": "YOLO không phát hiện được lá cây. Hãy chụp rõ hơn hoặc kiểm tra lại đây có phải ảnh lá hay không.",
            "detections": [],
        }

    width, height = source.size
    detections: list[dict[str, Any]] = []
    best_detection: dict[str, Any] | None = None

    for box in result.boxes:
        xyxy = [float(value) for value in box.xyxy[0].tolist()]
        confidence = float(box.conf[0].item())
        class_id = int(box.cls[0].item()) if box.cls is not None else 0
        class_name = str(model.names.get(class_id, class_id)) if hasattr(model, "names") else str(class_id)
        x1, y1, x2, y2 = xyxy
        area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        detection = {
            "class_id": class_id,
            "class_name": class_name,
            "confidence": confidence,
            "bbox_xyxy": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
            "area_ratio": area / max(1, width * height),
        }
        detections.append(detection)
        if best_detection is None or confidence > best_detection["confidence"]:
            best_detection = detection

    if best_detection is None or best_detection["confidence"] < YOLO_CONFIDENCE_THRESHOLD:
        return {
            "is_leaf": False,
            "confidence": best_detection["confidence"] if best_detection else 0.0,
            "reason": "YOLO phát hiện vùng nghi ngờ nhưng độ tin cậy thấp. Hãy chụp lá rõ hơn, đủ sáng và gần khung hình hơn.",
            "detections": detections,
        }

    x1, y1, x2, y2 = best_detection["bbox_xyxy"]
    pad = YOLO_CROP_PADDING_RATIO * max(x2 - x1, y2 - y1)
    crop_box = (
        max(0, int(x1 - pad)),
        max(0, int(y1 - pad)),
        min(width, int(x2 + pad)),
        min(height, int(y2 + pad)),
    )
    cropped = source.crop(crop_box)

    return {
        "is_leaf": True,
        "confidence": best_detection["confidence"],
        "reason": "YOLO đã phát hiện lá cây và crop vùng lá trước khi chuyển sang CNN.",
        "bbox_xyxy": best_detection["bbox_xyxy"],
        "crop_box_xyxy": list(crop_box),
        "cropped_width": cropped.width,
        "cropped_height": cropped.height,
        "cropped_image_data_url": image_to_data_url(cropped),
        "detections": detections,
        "cropped_image": cropped,
    }


def classify_image(image: Image.Image, top_k: int = 5) -> dict[str, Any]:
    bundle = load_bundle()
    model: nn.Module = bundle["model"]
    classes: list[str] = bundle["classes"]
    transform = bundle["preprocess"]

    tensor = transform(image.convert("RGB")).unsqueeze(0)
    with torch.inference_mode():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
        count = max(1, min(top_k, len(classes)))
        values, indices = torch.topk(probs, k=count)

    top_predictions = []
    for value, index in zip(values.tolist(), indices.tolist()):
        label = classes[index]
        plant_name, disease_name = split_class_name(label)
        top_predictions.append(
            {
                "class_name": label,
                "plant_name": plant_name,
                "disease_name": disease_name,
                "confidence": float(value),
            }
        )

    best = top_predictions[0]
    return {
        "plant_name": best["plant_name"],
        "disease_name": best["disease_name"],
        "class_name": best["class_name"],
        "confidence": best["confidence"],
        "top_predictions": top_predictions,
        "model_version": f"{bundle.get('model_name', 'cnn')}_epoch_{bundle.get('epoch', 'unknown')}",
        "model_accuracy": bundle.get("best_acc"),
        "image_size": bundle["img_size"],
    }


app = FastAPI(title="Agromind CNN API")


@app.on_event("startup")
def warm_model() -> None:
    # Free CPU Space memory is tight. Load and cache models on first request.
    return None


@app.get("/health")
def health() -> dict[str, Any]:
    try:
        bundle = load_bundle()
    except Exception as exc:
        return {
            "status": "error",
            "model_ready": False,
            "model_error": f"{type(exc).__name__}: {exc}",
            "yolo_enabled": YOLO_MODEL_PATH.exists(),
        }
    return {
        "status": "ok",
        "model_ready": True,
        "classes": len(bundle["classes"]),
        "model_version": f"{bundle.get('model_name', 'cnn')}_epoch_{bundle.get('epoch', 'unknown')}",
        "model_accuracy": bundle.get("best_acc"),
        "yolo_enabled": YOLO_MODEL_PATH.exists(),
    }


@app.post("/detect-leaf")
async def detect_leaf(request: Request):
    image = await image_from_request(request)
    payload = detect_leaf_and_crop(image)
    payload.pop("cropped_image", None)
    return payload


async def image_from_request(request: Request) -> Image.Image:
    content_type = request.headers.get("content-type", "").lower()

    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        image = form.get("image")
        if not isinstance(image, UploadFile) and not hasattr(image, "read"):
            raise HTTPException(status_code=400, detail="Missing image.")
        return Image.open(BytesIO(await image.read())).convert("RGB")

    payload = PredictRequest.model_validate(await request.json())
    if payload.image_data_url:
        return Image.open(BytesIO(decode_data_url(payload.image_data_url))).convert("RGB")

    raise HTTPException(status_code=400, detail="Missing image or image_data_url.")


@app.post("/predict")
async def predict(request: Request):
    top_k = 5
    content_type = request.headers.get("content-type", "").lower()
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        try:
            top_k = int(form.get("top_k", 5))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="top_k must be a number.")
        image = form.get("image")
        if not isinstance(image, UploadFile) and not hasattr(image, "read"):
            raise HTTPException(status_code=400, detail="Missing image.")
        pil_image = Image.open(BytesIO(await image.read())).convert("RGB")
    else:
        payload = PredictRequest.model_validate(await request.json())
        top_k = payload.top_k
        if not payload.image_data_url:
            raise HTTPException(status_code=400, detail="Missing image or image_data_url.")
        pil_image = Image.open(BytesIO(decode_data_url(payload.image_data_url))).convert("RGB")

    yolo_payload = detect_leaf_and_crop(pil_image)
    cropped_image = yolo_payload.pop("cropped_image", None)
    if not yolo_payload["is_leaf"] or cropped_image is None:
        raise HTTPException(status_code=400, detail=yolo_payload["reason"])

    result = classify_image(cropped_image, top_k=top_k)
    result["yolo_payload"] = yolo_payload
    result["input_image"] = "yolo_crop"
    return result
