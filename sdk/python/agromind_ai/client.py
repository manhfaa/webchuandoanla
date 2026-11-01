"""Server-side client. Do not embed API keys in a browser or mobile app."""

import re
from pathlib import Path
from urllib.parse import urlparse

import requests


class AgromindError(Exception):
    def __init__(self, status_code, message):
        self.status_code = status_code
        super().__init__(message)


class AgromindClient:
    def __init__(self, api_key, *, base_url="https://api.agromind.farm", timeout=60):
        parsed = urlparse(base_url)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("base_url must be a secure HTTPS origin")
        if not isinstance(api_key, str) or not api_key.startswith("sk_agm_") or "\n" in api_key or "\r" in api_key:
            raise ValueError("Invalid API key")
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    def diagnose(self, image_path, *, idempotency_key):
        if not isinstance(idempotency_key, str) or not re.fullmatch(r"[A-Za-z0-9._:-]{1,128}", idempotency_key):
            raise ValueError("Invalid idempotency key")
        image = Path(image_path)
        with image.open("rb") as data:
            response = requests.post(
                f"{self._base_url}/api/developer/v1/diagnoses/",
                headers={"Authorization": f"Bearer {self._api_key}", "Idempotency-Key": idempotency_key},
                files={"image": (image.name, data)}, timeout=self._timeout, allow_redirects=False,
            )
        try:
            payload = response.json()
        except ValueError:
            raise AgromindError(response.status_code, "Unexpected API response") from None
        if response.status_code != 200:
            detail = payload.get("detail", "API request failed") if isinstance(payload, dict) else "API request failed"
            raise AgromindError(response.status_code, detail)
        if not isinstance(payload, dict):
            raise AgromindError(response.status_code, "Unexpected API response")
        return payload
