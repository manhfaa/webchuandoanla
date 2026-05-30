from django.db import migrations


INPUTS = [
    {
        "category": "pesticide",
        "name": "Thuốc nấm gốc đồng",
        "group": "Thuốc trừ nấm",
        "active_ingredient": "Đồng hydroxide / đồng oxychloride",
        "usage": "Tham khảo cho bệnh đốm lá, thán thư, sương mai khi có khuyến cáo địa phương.",
        "suitable_crops": ["cà chua", "khoai tây", "bắp", "cam", "cà phê", "tiêu"],
        "related_diseases": ["đốm lá", "cháy lá", "thán thư", "sương mai"],
        "safety_notes": ["Đọc kỹ nhãn sản phẩm.", "Mang đồ bảo hộ khi pha và phun.", "Không phun gần nguồn nước."],
        "withholding_period_days": 7,
        "warning": "Không tự ý tăng liều. Cần tuân thủ nhãn và khuyến cáo cán bộ kỹ thuật.",
    },
    {
        "category": "fertilizer",
        "name": "NPK cân đối",
        "group": "Phân bón",
        "active_ingredient": "N-P-K",
        "usage": "Bổ sung dinh dưỡng đa lượng theo giai đoạn sinh trưởng.",
        "suitable_crops": ["lúa", "cà chua", "khoai tây", "bắp", "cà phê", "tiêu", "sầu riêng", "cam"],
        "related_diseases": [],
        "safety_notes": ["Bón theo nhu cầu cây và điều kiện đất.", "Không bón sát gốc khi đất quá khô."],
        "withholding_period_days": None,
        "warning": "Thông tin chỉ mang tính tham khảo, cần kiểm tra đất và hướng dẫn địa phương.",
    },
    {
        "category": "nutrition",
        "name": "Bổ sung canxi - magie",
        "group": "Dinh dưỡng cây trồng",
        "active_ingredient": "Ca, Mg",
        "usage": "Hỗ trợ cây khi có dấu hiệu thiếu canxi/magie, vàng lá hoặc rối loạn sinh trưởng.",
        "suitable_crops": ["cà chua", "tiêu", "sầu riêng", "cam", "cà phê"],
        "related_diseases": ["thiếu dinh dưỡng", "vàng lá", "xoăn lá"],
        "safety_notes": ["Không trộn tùy tiện với thuốc khác.", "Thử trên diện tích nhỏ trước khi dùng rộng."],
        "withholding_period_days": None,
        "warning": "Không thay thế kết quả phân tích đất/lá.",
    },
]

SYMPTOMS = [
    {
        "nutrient": "Thiếu đạm",
        "symptom": "Lá già vàng dần, cây sinh trưởng chậm, thân nhỏ.",
        "affected_crops": ["lúa", "bắp", "cà chua", "cà phê"],
        "recommendation": "Kiểm tra lịch bón phân, độ ẩm đất và cân nhắc bổ sung đạm theo khuyến cáo địa phương.",
        "safety_notes": ["Không bón quá liều vì có thể làm cây yếu và tăng sâu bệnh."],
    },
    {
        "nutrient": "Thiếu kali",
        "symptom": "Rìa lá cháy vàng/nâu, cây kém chống chịu hạn và bệnh.",
        "affected_crops": ["cà chua", "khoai tây", "tiêu", "sầu riêng"],
        "recommendation": "Theo dõi rìa lá và giai đoạn nuôi trái, cân nhắc bổ sung kali hợp lý.",
        "safety_notes": ["Cần cân đối với canxi và magie."],
    },
    {
        "nutrient": "Thiếu magie",
        "symptom": "Vàng giữa gân lá, gân còn xanh, thường xuất hiện ở lá già.",
        "affected_crops": ["cà phê", "cam", "tiêu", "sầu riêng"],
        "recommendation": "Kiểm tra pH đất và cân nhắc nguồn magie phù hợp.",
        "safety_notes": ["Không kết luận chỉ từ ảnh, nên đối chiếu thực địa."],
    },
]


def seed(apps, schema_editor):
    AgriculturalInput = apps.get_model("farmops", "AgriculturalInput")
    NutritionSymptom = apps.get_model("farmops", "NutritionSymptom")
    for item in INPUTS:
        AgriculturalInput.objects.update_or_create(name=item["name"], defaults=item)
    for item in SYMPTOMS:
        NutritionSymptom.objects.update_or_create(nutrient=item["nutrient"], defaults=item)


def unseed(apps, schema_editor):
    AgriculturalInput = apps.get_model("farmops", "AgriculturalInput")
    NutritionSymptom = apps.get_model("farmops", "NutritionSymptom")
    AgriculturalInput.objects.filter(name__in=[item["name"] for item in INPUTS]).delete()
    NutritionSymptom.objects.filter(nutrient__in=[item["nutrient"] for item in SYMPTOMS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("farmops", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
