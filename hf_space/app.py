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


MODEL_PATH = Path(__file__).with_name("best_model.pth")


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
    classes = checkpoint.get("classes") or checkpoint.get("config", {}).get("classes")
    state_dict = checkpoint.get("model")
    if not classes or not state_dict:
        raise RuntimeError("Checkpoint must contain 'model' and 'classes'.")

    model = LeafDiseaseConvNeXt(num_classes=len(classes))
    model.load_state_dict(state_dict)
    model.eval()

    config = checkpoint.get("config", {})
    img_size = int(config.get("img_size", 224))
    return {
        "model": model,
        "classes": list(classes),
        "preprocess": preprocess(img_size),
        "img_size": img_size,
        "best_acc": checkpoint.get("best_acc"),
        "epoch": checkpoint.get("epoch"),
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


def classify_image(image: Image.Image, top_k: int = 5) -> dict[str, Any]:
    bundle = load_bundle()
    model: LeafDiseaseConvNeXt = bundle["model"]
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
        "model_version": f"convnext_tiny_epoch_{bundle.get('epoch', 'unknown')}",
        "model_accuracy": bundle.get("best_acc"),
        "image_size": bundle["img_size"],
    }


app = FastAPI(title="Agromind CNN API")


@app.on_event("startup")
def warm_model() -> None:
    load_bundle()


@app.get("/health")
def health() -> dict[str, Any]:
    bundle = load_bundle()
    return {
        "status": "ok",
        "classes": len(bundle["classes"]),
        "model_version": f"convnext_tiny_epoch_{bundle.get('epoch', 'unknown')}",
        "model_accuracy": bundle.get("best_acc"),
    }


@app.post("/predict")
async def predict(request: Request):
    content_type = request.headers.get("content-type", "").lower()

    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        image = form.get("image")
        if not isinstance(image, UploadFile) and not hasattr(image, "read"):
            raise HTTPException(status_code=400, detail="Missing image.")
        top_k = int(form.get("top_k", 5))
        pil_image = Image.open(BytesIO(await image.read())).convert("RGB")
        return classify_image(pil_image, top_k=top_k)

    payload = PredictRequest.model_validate(await request.json())
    if payload.image_data_url:
        pil_image = Image.open(BytesIO(decode_data_url(payload.image_data_url))).convert("RGB")
        return classify_image(pil_image, top_k=payload.top_k)

    raise HTTPException(status_code=400, detail="Missing image or image_data_url.")
