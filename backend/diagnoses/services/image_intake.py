"""Validation for the multipart leaf photo the Android app uploads.

The JSON route takes a base64 data URL, which costs ~33% more bytes and forces
the phone to hold the whole image in memory as a string. The multipart route
takes the file, so it also has to do the checks a data URL made implicit: is
this really an image, is it a format the model accepts, and is it small enough
to be worth sending to inference.

Content type is checked against the actual first bytes, never against the
`Content-Type` the client claims — that header is free to write and a mislabelled
file would otherwise reach the model.
"""

from __future__ import annotations

import base64
import binascii

from django.conf import settings
from PIL import Image, UnidentifiedImageError

JPEG = "image/jpeg"
PNG = "image/png"
WEBP = "image/webp"

# Matches what the Hugging Face Space accepts. WebP is included because the
# phone encodes to it by default on newer Android versions.
ALLOWED = {JPEG, PNG, WEBP}

_MAGIC = (
    (b"\xff\xd8\xff", JPEG),
    (b"\x89PNG\r\n\x1a\n", PNG),
)


class UnsupportedImage(ValueError):
    """Wrong format. Maps to 415."""


class ImageTooLarge(ValueError):
    """Right format, too many bytes. Maps to 413."""


def max_bytes() -> int:
    return int(getattr(settings, "DIAGNOSIS_IMAGE_MAX_BYTES", 8 * 1024 * 1024))


def max_pixels() -> int:
    return int(getattr(settings, "DIAGNOSIS_IMAGE_MAX_PIXELS", 25_000_000))


def sniff(head: bytes) -> str:
    """The real content type of an image, or "" when it is not one we accept."""
    for magic, content_type in _MAGIC:
        if head.startswith(magic):
            return content_type
    # RIFF....WEBP
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return WEBP
    return ""


def _inspect_image(source) -> None:
    """Reject malformed and decompression-bomb images without fully decoding them."""
    try:
        image = Image.open(source)
        width, height = image.size
        if width < 1 or height < 1 or width * height > max_pixels():
            raise ImageTooLarge(
                f"Ảnh có quá nhiều điểm ảnh. Giới hạn hiện tại là {max_pixels():,} pixel."
            )
        image.verify()
    except ImageTooLarge:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise UnsupportedImage("Tệp ảnh bị lỗi hoặc không đúng định dạng JPEG, PNG, WebP.") from exc


def decode_data_url(data_url: str) -> bytes:
    """Decode a bounded base64 image before it can allocate unbounded memory."""
    if not isinstance(data_url, str) or not data_url.strip():
        raise UnsupportedImage("Bạn chưa gửi ảnh lá.")
    encoded = data_url.split(",", 1)[1] if "," in data_url and data_url.lower().startswith("data:") else data_url
    encoded = encoded.strip()
    limit = max_bytes()
    max_encoded = 4 * ((limit + 2) // 3)
    if len(encoded) > max_encoded + 4:
        raise ImageTooLarge(f"Ảnh vượt mức {limit // 1024 // 1024} MB.")
    try:
        decoded = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise UnsupportedImage("Dữ liệu ảnh base64 không hợp lệ.") from exc
    if len(decoded) > limit:
        raise ImageTooLarge(f"Ảnh vượt mức {limit // 1024 // 1024} MB.")
    return decoded


def validate_data_url(data_url: str) -> None:
    from io import BytesIO

    decoded = decode_data_url(data_url)
    if sniff(decoded[:16]) not in ALLOWED:
        raise UnsupportedImage("Mình chỉ đọc được ảnh JPEG, PNG hoặc WebP. Bạn chọn lại ảnh giúp mình nhé.")
    _inspect_image(BytesIO(decoded))


def validate(image_file) -> str:
    """Check size and real format. Returns the sniffed content type.

    Raises `ImageTooLarge` or `UnsupportedImage`. The file is left rewound so the
    caller can stream it straight to the inference service.
    """
    if image_file is None:
        raise UnsupportedImage("Bạn chưa gửi ảnh lá.")

    limit = max_bytes()
    size = getattr(image_file, "size", None)
    if size is not None and size > limit:
        raise ImageTooLarge(
            f"Ảnh nặng {size // 1024} KB, vượt mức {limit // 1024 // 1024} MB. "
            "Bạn chụp lại hoặc chọn ảnh nhỏ hơn giúp mình nhé."
        )

    image_file.seek(0)
    head = image_file.read(16)
    image_file.seek(0)

    content_type = sniff(head)
    if content_type not in ALLOWED:
        raise UnsupportedImage("Mình chỉ đọc được ảnh JPEG, PNG hoặc WebP. Bạn chọn lại ảnh giúp mình nhé.")
    try:
        _inspect_image(image_file)
    finally:
        image_file.seek(0)
    return content_type
