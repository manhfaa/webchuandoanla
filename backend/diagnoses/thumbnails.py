import base64
from io import BytesIO

from PIL import Image, ImageOps


THUMBNAIL_SIZE = (360, 270)


def build_thumbnail_url(image_data_url: str) -> str:
    """Return a compact JPEG data URL without failing the diagnosis save."""
    if not image_data_url or not image_data_url.startswith("data:image/"):
        return ""

    try:
        _, encoded = image_data_url.split(",", 1)
        with Image.open(BytesIO(base64.b64decode(encoded))) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
            output = BytesIO()
            image.save(output, format="JPEG", quality=72, optimize=True)
    except (OSError, ValueError, TypeError, base64.binascii.Error):
        return ""

    thumbnail = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{thumbnail}"
