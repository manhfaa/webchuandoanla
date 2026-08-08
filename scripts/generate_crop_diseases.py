"""Sinh src/data/crop-diseases.ts từ danh sách lớp thật của model.

Vì sao có script này
--------------------
Bản đầu tiên của crop-diseases.ts được viết tay từ ``CLASS_TRANSLATIONS`` trong
``backend/diagnoses/services/cnn_labels.py``. Bảng đó chỉ có 39 dòng và chỉ phủ
các lớp kiểu PlantVillage, trong khi checkpoint đang chạy có 89 lớp trên 21 cây.
Hậu quả: 44 bệnh mà model thật sự nhận diện được — toàn bộ cà phê, mía, xoài,
sắn, chè, hồ tiêu, điều, dưa chuột — không hề có mặt trên website.

Tệ hơn, tên lớp trong bảng dịch không phải lúc nào cũng là tên lớp model phát ra.
Bảng ghi ``Corn_(maize)___Common_rust_`` còn model phát ra ``Maize___Rust``, nên
trang công khai nói "Gỉ sắt thường" trong khi ứng dụng nói "Gỉ sắt" cho cùng một
kết quả. Script này loại bỏ khoảng cách đó: nó lấy tên lớp từ chính checkpoint
rồi đẩy qua ``translate_prediction`` — đúng hàm mà API dùng khi trả kết quả cho
người trồng. Chữ trên trang bằng chữ trong ứng dụng vì cùng một nguồn sinh ra.

Cách chạy
---------
    python scripts/generate_crop_diseases.py

Đọc ``agromindaimodel.pth`` nếu có; nếu không thì dùng ``scripts/model_classes.json``
đã chốt sẵn, để người clone mới không cần tải file 335 MB mới sinh lại được dữ liệu.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

# Console Windows mặc định là cp1252 và sẽ ném UnicodeEncodeError khi in tên
# bệnh tiếng Việt. Báo cáo của script là thứ người ta đọc để kiểm tra kết quả,
# nên nó phải in được.
for stream in (sys.stdout, sys.stderr):
    reconfigure = getattr(stream, "reconfigure", None)
    if reconfigure is not None:
        reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from diagnoses.services.cnn_labels import translate_prediction  # noqa: E402

CLASSES_JSON = ROOT / "scripts" / "model_classes.json"
CHECKPOINT = ROOT / "agromindaimodel.pth"
OUTPUT = ROOT / "src" / "data" / "crop-diseases.ts"

# plantId trong src/data/mock/plants.ts, khoá theo nhãn tiếng Anh model phát ra.
# Giữ khớp với MODEL_ALIASES trong src/lib/crop-filter.ts: cùng một phép ánh xạ,
# lệch nhau thì ảnh cây sẽ biến mất mà không ai để ý.
PLANT_IDS = {
    "apple": "apple",
    "black pepper": "black-pepper",
    "blueberry": "blueberry",
    "cashew": "cashew",
    "cassava": "cassava",
    "cherry": "cherry",
    "cherry (including sour)": "cherry",
    "coffee": "coffee",
    "corn": "corn",
    "corn (maize)": "corn",
    "maize": "corn",
    "cucumber": "cucumber",
    "grape": "grape",
    "mango": "mango",
    "orange": "orange",
    "peach": "peach",
    "pepper": "pepper",
    "pepper, bell": "pepper",
    "potato": "potato",
    "raspberry": "raspberry",
    "soybean": "soybean",
    "squash": "squash",
    "strawberry": "strawberry",
    "sugarcane": "sugarcane",
    "tea": "tea",
    "tomato": "tomato",
}

# Các slug đã nằm trong chỉ mục Google. Đổi là mất trang, nên chốt cứng ở đây
# thay vì tin vào việc hàm slugify sẽ luôn cho ra cùng kết quả.
PINNED_SLUGS = {
    "Cà chua": "ca-chua",
    "Ngô (bắp)": "ngo-bap",
    "Nho": "nho",
    "Táo": "tao",
    "Khoai tây": "khoai-tay",
    "Anh đào": "anh-dao",
    "Bí": "bi",
    "Cam": "cam",
    "Dâu tây": "dau-tay",
    "Đào": "dao",
    "Ớt chuông": "ot-chuong",
}


def slugify(value: str) -> str:
    text = value.lower().replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def load_classes() -> list[str]:
    if CHECKPOINT.exists():
        try:
            import torch

            checkpoint = torch.load(CHECKPOINT, map_location="cpu", weights_only=True)
            mapping = checkpoint.get("class_to_index")
            if mapping:
                names = [name for name, _ in sorted(mapping.items(), key=lambda kv: kv[1])]
                CLASSES_JSON.write_text(json.dumps(names, indent=2) + "\n", encoding="utf8")
                print(f"Đọc {len(names)} lớp từ checkpoint, đã ghi lại {CLASSES_JSON.name}")
                return names
        except Exception as exc:  # pragma: no cover - phụ thuộc môi trường
            print(f"Không đọc được checkpoint ({exc}); dùng {CLASSES_JSON.name}")

    names = json.loads(CLASSES_JSON.read_text(encoding="utf8"))
    print(f"Đọc {len(names)} lớp từ {CLASSES_JSON.name}")
    return names


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def main() -> int:
    classes = load_classes()

    crops: dict[str, dict] = {}
    skipped_healthy = 0

    for class_name in classes:
        translated = translate_prediction({"class_name": class_name})
        plant_vi = translated["plant_name"]
        disease_vi = translated["disease_name"]
        plant_en = translated["plant_name_en"]

        # Lá khỏe không phải là bệnh và không đáng có mục riêng trên trang.
        if disease_vi.strip().lower() in {"khỏe mạnh", "healthy"}:
            skipped_healthy += 1
            continue

        plant_id = PLANT_IDS.get(plant_en.lower())
        if not plant_id:
            print(f"  ! bỏ qua {class_name}: chưa ánh xạ được cây {plant_en!r}")
            continue

        crop = crops.setdefault(
            plant_vi,
            {
                "slug": PINNED_SLUGS.get(plant_vi) or slugify(plant_vi),
                "name": plant_vi,
                "plantId": plant_id,
                "diseases": [],
            },
        )
        # Cùng một bệnh có thể đến từ hai tên lớp (Orange có cả Haunglongbing
        # lẫn Huanglongbing). Hiện hai lần thì trông như lỗi chính tả.
        if any(d["name"] == disease_vi for d in crop["diseases"]):
            continue
        crop["diseases"].append({"name": disease_vi, "className": class_name})

    for crop in crops.values():
        crop["diseases"].sort(key=lambda d: d["name"].lower())

    ordered = sorted(crops.values(), key=lambda c: (-len(c["diseases"]), c["name"]))

    slugs = [c["slug"] for c in ordered]
    if len(slugs) != len(set(slugs)):
        print("LỖI: có slug trùng nhau", file=sys.stderr)
        return 1
    for name, slug in PINNED_SLUGS.items():
        match = next((c for c in ordered if c["name"] == name), None)
        if match and match["slug"] != slug:
            print(f"LỖI: slug của {name} đổi thành {match['slug']}", file=sys.stderr)
            return 1

    total = sum(len(c["diseases"]) for c in ordered)
    with_pages = [c for c in ordered if len(c["diseases"]) >= 2]

    lines: list[str] = []
    add = lines.append
    add('import { supportedPlants } from "@/data/mock/plants";')
    add("")
    add("/**")
    add(" * Cây trồng và các bệnh model nhận diện được, kèm tên tiếng Việt.")
    add(" *")
    add(" * SINH TỰ ĐỘNG bởi scripts/generate_crop_diseases.py — đừng sửa tay.")
    add(" *")
    add(f" * Nguồn: {len(classes)} tên lớp của chính checkpoint đang chạy trên Hugging Face")
    add(" * (convnext_tiny_epoch_21), đẩy qua translate_prediction() trong")
    add(" * backend/diagnoses/services/cnn_labels.py — đúng hàm mà API dùng khi trả kết")
    add(" * quả. Nhờ vậy tên bệnh trên trang công khai không thể khác tên bệnh trong ứng")
    add(" * dụng: cùng một nguồn sinh ra cả hai.")
    add(" *")
    add(f" * {len(ordered)} cây có bệnh, {total} bệnh. Các lớp 'Khỏe mạnh' bị loại")
    add(f" * ({skipped_healthy} lớp) vì lá khỏe không phải là bệnh.")
    add(" */")
    add("")
    add("export type CropDisease = {")
    add("  name: string;")
    add("  /** Tên lớp của model, giữ lại để tra guidance khớp với ứng dụng. */")
    add("  className: string;")
    add("};")
    add("")
    add("export type CropWithDiseases = {")
    add("  slug: string;")
    add("  name: string;")
    add("  plantId: string;")
    add("  diseases: CropDisease[];")
    add("};")
    add("")
    add("export const CROP_DISEASES: CropWithDiseases[] = [")
    for crop in ordered:
        add("  {")
        add(f'    slug: {ts_string(crop["slug"])},')
        add(f'    name: {ts_string(crop["name"])},')
        add(f'    plantId: {ts_string(crop["plantId"])},')
        add("    diseases: [")
        for disease in crop["diseases"]:
            add("      {")
            add(f'        name: {ts_string(disease["name"])},')
            add(f'        className: {ts_string(disease["className"])},')
            add("      },")
        add("    ],")
        add("  },")
    add("];")
    add("")
    add("/**")
    add(" * Cây có trang riêng. Một bệnh thì không đủ dựng thành trang, và một trang")
    add(" * rỗng thì tệ cho cả người đọc lẫn thứ hạng hơn là không tồn tại — số còn lại")
    add(" * vẫn được liệt kê ở trang danh sách.")
    add(" */")
    add("export const CROPS_WITH_PAGES = CROP_DISEASES.filter((crop) => crop.diseases.length >= 2);")
    add("")
    add("export function findCropDiseases(slug: string): CropWithDiseases | null {")
    add("  return CROP_DISEASES.find((crop) => crop.slug === slug) ?? null;")
    add("}")
    add("")
    add("export function plantImageFor(plantId: string): string | null {")
    add('  return supportedPlants.find((plant) => plant.id === plantId)?.image ?? null;')
    add("}")
    add("")
    add("export function plantInsightFor(plantId: string): string | null {")
    add('  return supportedPlants.find((plant) => plant.id === plantId)?.insight ?? null;')
    add("}")

    OUTPUT.write_text("\n".join(lines) + "\n", encoding="utf8")

    print(f"\nĐã ghi {OUTPUT.relative_to(ROOT)}")
    print(f"  {len(ordered)} cây có bệnh, {total} bệnh, {len(with_pages)} trang riêng")
    for crop in ordered:
        mark = "trang" if len(crop["diseases"]) >= 2 else "   — "
        print(f"  {mark}  {crop['name']:<14} {len(crop['diseases']):>2} bệnh  /benh-cay/{crop['slug']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
