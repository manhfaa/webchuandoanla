from __future__ import annotations

import base64
import binascii
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any

from django.conf import settings


class CnnModelUnavailable(RuntimeError):
    pass


def _deps():
    try:
        import torch
        from PIL import Image
        from torch import nn
        from torchvision import models, transforms
    except ImportError as exc:
        raise CnnModelUnavailable("CNN dependencies are not installed.") from exc
    return torch, Image, nn, models, transforms


def _build_model(num_classes: int):
    torch, _, nn, models, _ = _deps()

    class LeafDiseaseConvNeXt(nn.Module):
        def __init__(self, classes_count: int):
            super().__init__()
            self.backbone = models.convnext_tiny(weights=None)
            self.backbone.classifier = nn.Sequential(self.backbone.classifier[0])
            self.local_attn = nn.Sequential(nn.Linear(768, 256), nn.GELU(), nn.Linear(256, 1))
            self.global_head = nn.Linear(768, classes_count)
            self.local_head = nn.Linear(768, classes_count)
            self.head = nn.Sequential(
                nn.Linear(2304, 1152),
                nn.LayerNorm(1152),
                nn.GELU(),
                nn.Dropout(0.3),
                nn.Linear(1152, classes_count),
            )

        def forward(self, image):
            features = self.backbone.features(image)
            pooled = self.backbone.avgpool(features)
            global_feat = self.backbone.classifier[0](pooled).flatten(1)

            patches = features.flatten(2).transpose(1, 2)
            attn = torch.softmax(self.local_attn(patches).squeeze(-1), dim=1)
            local_feat = (patches * attn.unsqueeze(-1)).sum(dim=1)

            fused = torch.cat([global_feat, local_feat, global_feat * local_feat], dim=1)
            return self.head(fused)

    return LeafDiseaseConvNeXt(num_classes)


def _model_path() -> Path:
    configured = getattr(settings, "CNN_MODEL_PATH", "")
    if configured:
        return Path(configured)
    return Path(settings.BASE_DIR).parent / "best_model.pth"


def _preprocess(img_size: int):
    _, _, _, _, transforms = _deps()
    return transforms.Compose(
        [
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ]
    )


@lru_cache(maxsize=1)
def _load_bundle() -> dict[str, Any]:
    path = _model_path()
    if not path.exists():
        raise CnnModelUnavailable(f"CNN model not found at {path}")

    torch, _, _, _, _ = _deps()
    checkpoint = torch.load(path, map_location="cpu", weights_only=True)
    classes = checkpoint.get("classes") or checkpoint.get("config", {}).get("classes")
    state_dict = checkpoint.get("model")
    if not classes or not state_dict:
        raise CnnModelUnavailable("CNN checkpoint must contain 'model' and 'classes'.")

    model = _build_model(num_classes=len(classes))
    model.load_state_dict(state_dict)
    model.eval()

    config = checkpoint.get("config", {})
    img_size = int(config.get("img_size", 224))
    return {
        "model": model,
        "classes": list(classes),
        "preprocess": _preprocess(img_size),
        "img_size": img_size,
        "best_acc": checkpoint.get("best_acc"),
        "epoch": checkpoint.get("epoch"),
    }


def _decode_data_url(data_url: str) -> bytes:
    if "," in data_url and data_url.split(",", 1)[0].lower().startswith("data:"):
        data_url = data_url.split(",", 1)[1]
    try:
        return base64.b64decode(data_url, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Invalid base64 image data.") from exc


def image_from_payload(*, image_data_url: str | None = None, image_file=None) -> Image.Image:
    _, Image, _, _, _ = _deps()
    if image_file is not None:
        return Image.open(image_file).convert("RGB")
    if image_data_url:
        return Image.open(BytesIO(_decode_data_url(image_data_url))).convert("RGB")
    raise ValueError("Missing image file or image_data_url.")


def split_class_name(class_name: str) -> tuple[str, str]:
    if "___" not in class_name:
        return "", class_name.replace("_", " ")
    plant, disease = class_name.split("___", 1)
    return plant.replace("_", " "), disease.replace("_", " ")


def classify_image(image: Image.Image, top_k: int = 5) -> dict[str, Any]:
    torch, _, _, _, _ = _deps()
    bundle = _load_bundle()
    model = bundle["model"]
    classes: list[str] = bundle["classes"]
    preprocess = bundle["preprocess"]

    tensor = preprocess(image).unsqueeze(0)
    with torch.inference_mode():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
        count = min(top_k, len(classes))
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
