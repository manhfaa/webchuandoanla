from django.test import SimpleTestCase

from .services.cnn_labels import clean_model_label, translate_prediction


CURRENT_MODEL_PLANTS = {
    "Apple": "Táo",
    "Black Pepper": "Hồ tiêu",
    "Cashew": "Điều",
    "Cassava": "Sắn",
    "Cherry": "Anh đào",
    "Coffee": "Cà phê",
    "Cucumber": "Dưa chuột",
    "Grape": "Nho",
    "Maize": "Ngô (bắp)",
    "Mango": "Xoài",
    "Orange": "Cam",
    "Peach": "Đào",
    "Pepper": "Ớt chuông",
    "Potato": "Khoai tây",
    "Raspberry": "Mâm xôi",
    "Soybean": "Đậu tương",
    "Squash": "Bí",
    "Strawberry": "Dâu tây",
    "Sugarcane": "Mía",
    "Tea": "Chè",
    "Tomato": "Cà chua",
}

CURRENT_MODEL_DISEASES = {
    "Anthracnose",
    "Bacterial Canker",
    "Bacterial Wilt",
    "Bacterial spot",
    "Banded Chlorosis",
    "Bell pepper leaf spot",
    "Black rot",
    "Brown Rust",
    "Brown Spot",
    "Cedar-Apple Rust",
    "Cercospora",
    "Cercospora leaf spot Gray leaf spot",
    "Cutting Weevil",
    "Die Back",
    "Downy Mildew",
    "Dried Leaves",
    "Early blight",
    "Esca (Black Measles)",
    "Gall Midge",
    "Grassy shoot",
    "Gummy Stem Blight",
    "Huanglongbing (Citrus greening)",
    "Late blight",
    "Leaf Mold",
    "Leaf blight",
    "Leaf blight (Isariopsis Leaf Spot)",
    "Leaf scorch",
    "Maize Lethal Necrosis",
    "Maize Streak Virus",
    "Miner",
    "Mites",
    "Mosaic virus",
    "Northern Leaf Blight",
    "Phoma",
    "Pokkah Boeng",
    "Powdery Mildew",
    "Red leaf spot",
    "Red scab",
    "Rust",
    "Scab",
    "Septoria leaf spot",
    "Sett Rot",
    "Smut",
    "Sooty Mould",
    "Target Spot",
    "Two-spotted spider mites",
    "Verticillium wilt",
    "Yellow Leaf",
    "Yellow Leaf Curl Virus",
    "bacterial blight",
    "brown spot",
    "green mite",
    "healthy",
    "leaf blight",
    "leaf miner",
    "mosaic virus",
    "red rust",
    "yellow mottle virus",
}


class CnnLabelTranslationTests(SimpleTestCase):
    def test_all_current_model_plants_have_vietnamese_names(self):
        for source_name, expected_name in CURRENT_MODEL_PLANTS.items():
            with self.subTest(plant=source_name):
                translated = translate_prediction(
                    {"class_name": f"{source_name}___healthy"}
                )
                self.assertEqual(translated["plant_name"], expected_name)

    def test_all_current_model_diseases_are_translated(self):
        for disease_name in CURRENT_MODEL_DISEASES:
            with self.subTest(disease=disease_name):
                translated = translate_prediction(
                    {"class_name": f"Tomato___{disease_name}"}
                )
                self.assertNotEqual(
                    translated["disease_name"].casefold(),
                    clean_model_label(disease_name).casefold(),
                )
