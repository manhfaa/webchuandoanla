from __future__ import annotations

import re
from typing import Any


PLANT_TRANSLATIONS = {
    "Apple": "Táo",
    "Blueberry": "Việt quất",
    "Cherry (including sour)": "Anh đào",
    "Corn (maize)": "Ngô (bắp)",
    "Grape": "Nho",
    "Orange": "Cam",
    "Peach": "Đào",
    "Pepper, bell": "Ớt chuông",
    "Potato": "Khoai tây",
    "Raspberry": "Mâm xôi",
    "Soybean": "Đậu tương",
    "Squash": "Bí",
    "Strawberry": "Dâu tây",
    "Tomato": "Cà chua",
}

DISEASE_TRANSLATIONS = {
    "Apple scab": "Bệnh ghẻ táo",
    "Black rot": "Thối đen",
    "Cedar apple rust": "Gỉ sắt tuyết tùng trên táo",
    "Powdery mildew": "Bệnh phấn trắng",
    "Cercospora leaf spot Gray leaf spot": "Đốm lá Cercospora / đốm lá xám",
    "Common rust": "Gỉ sắt thường",
    "Northern Leaf Blight": "Cháy lá phương Bắc",
    "Esca (Black Measles)": "Bệnh Esca (đốm đen nho)",
    "Leaf blight (Isariopsis Leaf Spot)": "Cháy lá nho (đốm lá Isariopsis)",
    "Haunglongbing (Citrus greening)": "Vàng lá gân xanh trên cây có múi",
    "Huanglongbing (Citrus greening)": "Vàng lá gân xanh trên cây có múi",
    "Bacterial spot": "Đốm vi khuẩn",
    "Early blight": "Cháy lá sớm",
    "Late blight": "Cháy lá muộn",
    "Leaf Mold": "Mốc lá",
    "Septoria leaf spot": "Đốm lá Septoria",
    "Spider mites Two-spotted spider mite": "Nhện đỏ hai chấm",
    "Target Spot": "Đốm mục tiêu",
    "Tomato Yellow Leaf Curl Virus": "Virus xoăn vàng lá cà chua",
    "Tomato mosaic virus": "Virus khảm cà chua",
    "Leaf scorch": "Cháy mép lá",
    "healthy": "Khỏe mạnh",
}

CLASS_TRANSLATIONS = {
    "Apple___Apple_scab": ("Táo", "Bệnh ghẻ táo"),
    "Apple___Black_rot": ("Táo", "Thối đen trên táo"),
    "Apple___Cedar_apple_rust": ("Táo", "Gỉ sắt tuyết tùng trên táo"),
    "Apple___healthy": ("Táo", "Khỏe mạnh"),
    "Blueberry___healthy": ("Việt quất", "Khỏe mạnh"),
    "Cherry_(including_sour)___Powdery_mildew": ("Anh đào", "Bệnh phấn trắng"),
    "Cherry_(including_sour)___healthy": ("Anh đào", "Khỏe mạnh"),
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": ("Ngô (bắp)", "Đốm lá Cercospora / đốm lá xám"),
    "Corn_(maize)___Common_rust_": ("Ngô (bắp)", "Gỉ sắt thường"),
    "Corn_(maize)___Northern_Leaf_Blight": ("Ngô (bắp)", "Cháy lá phương Bắc"),
    "Corn_(maize)___healthy": ("Ngô (bắp)", "Khỏe mạnh"),
    "Grape___Black_rot": ("Nho", "Thối đen trên nho"),
    "Grape___Esca_(Black_Measles)": ("Nho", "Bệnh Esca (đốm đen nho)"),
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": ("Nho", "Cháy lá nho (đốm lá Isariopsis)"),
    "Grape___healthy": ("Nho", "Khỏe mạnh"),
    "Orange___Haunglongbing_(Citrus_greening)": ("Cam", "Vàng lá gân xanh trên cây có múi"),
    "Orange___Huanglongbing_(Citrus_greening)": ("Cam", "Vàng lá gân xanh trên cây có múi"),
    "Peach___Bacterial_spot": ("Đào", "Đốm vi khuẩn"),
    "Peach___healthy": ("Đào", "Khỏe mạnh"),
    "Pepper,_bell___Bacterial_spot": ("Ớt chuông", "Đốm vi khuẩn"),
    "Pepper,_bell___healthy": ("Ớt chuông", "Khỏe mạnh"),
    "Potato___Early_blight": ("Khoai tây", "Cháy lá sớm"),
    "Potato___Late_blight": ("Khoai tây", "Cháy lá muộn"),
    "Potato___healthy": ("Khoai tây", "Khỏe mạnh"),
    "Raspberry___healthy": ("Mâm xôi", "Khỏe mạnh"),
    "Soybean___healthy": ("Đậu tương", "Khỏe mạnh"),
    "Squash___Powdery_mildew": ("Bí", "Bệnh phấn trắng"),
    "Strawberry___Leaf_scorch": ("Dâu tây", "Cháy mép lá"),
    "Strawberry___healthy": ("Dâu tây", "Khỏe mạnh"),
    "Tomato___Bacterial_spot": ("Cà chua", "Đốm vi khuẩn"),
    "Tomato___Early_blight": ("Cà chua", "Cháy lá sớm"),
    "Tomato___Late_blight": ("Cà chua", "Cháy lá muộn"),
    "Tomato___Leaf_Mold": ("Cà chua", "Mốc lá"),
    "Tomato___Septoria_leaf_spot": ("Cà chua", "Đốm lá Septoria"),
    "Tomato___Spider_mites Two-spotted_spider_mite": ("Cà chua", "Nhện đỏ hai chấm"),
    "Tomato___Target_Spot": ("Cà chua", "Đốm mục tiêu"),
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": ("Cà chua", "Virus xoăn vàng lá cà chua"),
    "Tomato___Tomato_mosaic_virus": ("Cà chua", "Virus khảm cà chua"),
    "Tomato___healthy": ("Cà chua", "Khỏe mạnh"),
}


def clean_model_label(value: str) -> str:
    text = value.replace("_", " ").strip()
    text = re.sub(r"\s+", " ", text)
    return text.rstrip(" _")


def split_class_name(class_name: str) -> tuple[str, str]:
    if "___" not in class_name:
        return "", clean_model_label(class_name)
    plant, disease = class_name.split("___", 1)
    return clean_model_label(plant), clean_model_label(disease)


def _normalized_lookup(mapping: dict[str, Any], key: str) -> Any | None:
    normalized = clean_model_label(key).casefold()
    for source, translated in mapping.items():
        if clean_model_label(source).casefold() == normalized:
            return translated
    return None


def translate_prediction(prediction: dict[str, Any]) -> dict[str, Any]:
    class_name = str(prediction.get("class_name") or "")
    plant_en, disease_en = split_class_name(class_name)

    plant_source = str(prediction.get("plant_name") or plant_en)
    disease_source = str(prediction.get("disease_name") or disease_en)
    plant_source = clean_model_label(plant_source)
    disease_source = clean_model_label(disease_source)

    class_translation = CLASS_TRANSLATIONS.get(class_name) or _normalized_lookup(CLASS_TRANSLATIONS, class_name)
    if class_translation:
        plant_vi, disease_vi = class_translation
    else:
        plant_vi = _normalized_lookup(PLANT_TRANSLATIONS, plant_source) or plant_source
        disease_vi = _normalized_lookup(DISEASE_TRANSLATIONS, disease_source) or disease_source

    return {
        **prediction,
        "plant_name": plant_vi,
        "disease_name": disease_vi,
        "plant_name_en": plant_source,
        "disease_name_en": disease_source,
    }


def translate_result(result: dict[str, Any]) -> dict[str, Any]:
    translated = dict(result)
    top_predictions = [
        translate_prediction(item)
        for item in result.get("top_predictions", [])
        if isinstance(item, dict)
    ]

    if top_predictions:
        translated["top_predictions"] = top_predictions
        translated["plant_name"] = top_predictions[0]["plant_name"]
        translated["disease_name"] = top_predictions[0]["disease_name"]
        translated["plant_name_en"] = top_predictions[0].get("plant_name_en", "")
        translated["disease_name_en"] = top_predictions[0].get("disease_name_en", "")
    else:
        best = translate_prediction(translated)
        translated.update(best)

    return translated
