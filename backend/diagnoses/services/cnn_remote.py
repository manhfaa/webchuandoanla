from __future__ import annotations

from typing import Any

from django.conf import settings


class RemoteCnnUnavailable(RuntimeError):
    pass


def remote_cnn_enabled() -> bool:
    return bool(getattr(settings, "CNN_API_URL", "").strip())


def classify_remote(*, image_data_url: str | None = None, image_file=None, top_k: int = 5) -> dict[str, Any]:
    try:
        import requests
    except ImportError as exc:
        raise RemoteCnnUnavailable("Remote CNN dependency 'requests' is not installed.") from exc

    base_url = getattr(settings, "CNN_API_URL", "").strip().rstrip("/")
    if not base_url:
        raise RemoteCnnUnavailable("CNN_API_URL is not configured.")

    headers = {}
    token = getattr(settings, "CNN_API_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        if image_file is not None:
            image_file.seek(0)
            response = requests.post(
                f"{base_url}/predict",
                headers=headers,
                files={"image": (image_file.name, image_file, image_file.content_type)},
                data={"top_k": str(top_k)},
                timeout=45,
            )
        else:
            response = requests.post(
                f"{base_url}/predict",
                headers=headers,
                json={"image_data_url": image_data_url, "top_k": top_k},
                timeout=45,
            )
    except requests.RequestException as exc:
        raise RemoteCnnUnavailable("Remote CNN request failed.") from exc

    if response.status_code >= 500:
        raise RemoteCnnUnavailable("Remote CNN service is unavailable.")

    if not response.ok:
        detail = "Remote CNN rejected the request."
        try:
            detail = response.json().get("detail", detail)
        except ValueError:
            pass
        raise ValueError(detail)

    return response.json()
