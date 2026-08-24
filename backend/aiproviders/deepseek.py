"""DeepSeek chat-completions client.

Ported from `src/app/api/research-symptoms/route.ts` and
`src/app/api/chat/route.ts`. The prompts and the JSON-repair behaviour are kept
identical on purpose: the website and the app must produce the same answer for
the same leaf, so this is a move, not a rewrite.

One deliberate behaviour change from the TypeScript original: there is no
built-in fallback text. `src/app/api/chat/route.ts` fell back to
`buildChatApiResponse()` — a canned answer rendered exactly like a real one —
whenever DeepSeek failed. Serving pre-written prose as if a model wrote it is
the one thing the product may not do, so a failure here raises.
"""

from __future__ import annotations

import json
import re
from typing import Any

from django.conf import settings

from .base import ProviderFailed, ProviderNotConfigured

_FENCE_OPEN = re.compile(r"^```(?:json|text)?", re.IGNORECASE)
_FENCE_CLOSE = re.compile(r"```$")


def is_configured() -> bool:
    return bool(getattr(settings, "DEEPSEEK_API_KEY", "").strip())


def _clean(value: Any) -> str:
    return str(value if value is not None else "").strip()


def _strip_fence(text: str) -> str:
    return _FENCE_CLOSE.sub("", _FENCE_OPEN.sub("", text.strip())).strip()


def extract_json_object(text: str) -> dict[str, Any] | None:
    """Best-effort parse of a JSON object out of a model answer.

    DeepSeek honours `response_format: json_object` most of the time but not
    always, and the TypeScript version had to cope with fenced blocks, a JSON
    string containing JSON, and prose wrapped around an object. Losing a
    completed research run to a stray backtick would cost the grower a quota
    unit, so the same tolerance is kept.
    """
    normalized = _strip_fence(text)

    try:
        parsed = json.loads(normalized)
    except (ValueError, TypeError):
        parsed = None

    if isinstance(parsed, str):
        return extract_json_object(parsed)
    if isinstance(parsed, list):
        return {"items": parsed}
    if isinstance(parsed, dict):
        return parsed

    start = normalized.find("{")
    end = normalized.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        recovered = json.loads(normalized[start : end + 1])
    except (ValueError, TypeError):
        return None
    if isinstance(recovered, str):
        return extract_json_object(recovered)
    return recovered if isinstance(recovered, dict) else None


def _extract_content(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and isinstance(part.get("text"), str):
                parts.append(part["text"])
        return "\n".join(p for p in parts if p).strip()
    return ""


def complete(
    *,
    step: str,
    messages: list[dict[str, str]],
    max_tokens: int = 700,
    temperature: float = 0.2,
    json_mode: bool = True,
) -> str:
    """One DeepSeek call. Raises rather than returning an empty answer."""
    api_key = getattr(settings, "DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise ProviderNotConfigured(step, "Dịch vụ AI chưa được bật trên máy chủ.")

    try:
        import requests
    except ImportError as exc:  # pragma: no cover - requirements pin it
        raise ProviderNotConfigured(step, "Thiếu thư viện gọi dịch vụ AI.") from exc

    payload: dict[str, Any] = {
        "model": getattr(settings, "DEEPSEEK_MODEL", "deepseek-v4-flash"),
        # The reasoning stream is billed and never shown, and the prompts here
        # already state the schema they want.
        "thinking": {"type": "disabled"},
        "messages": messages,
        "temperature": temperature,
        "top_p": 0.9,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    try:
        response = requests.post(
            getattr(settings, "DEEPSEEK_API_URL", "https://api.deepseek.com/chat/completions"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json=payload,
            timeout=getattr(settings, "DEEPSEEK_TIMEOUT_SECONDS", 25),
        )
    except requests.Timeout as exc:
        raise ProviderFailed(step, f"Dịch vụ AI trả lời quá chậm ở bước: {step}.") from exc
    except requests.RequestException as exc:
        raise ProviderFailed(step, f"Chưa gọi được dịch vụ AI ở bước: {step}.") from exc

    if not response.ok:
        # The provider's own error body can echo the prompt; only the status is
        # safe to surface and to log.
        raise ProviderFailed(step, f"Dịch vụ AI lỗi {response.status_code} ở bước: {step}.")

    try:
        data = response.json()
    except ValueError as exc:
        raise ProviderFailed(step, f"Dịch vụ AI trả về dữ liệu không đọc được ở bước: {step}.") from exc

    choices = data.get("choices") or []
    choice = choices[0] if choices else {}
    message = choice.get("message") or {}
    text = _extract_content(message.get("content")) or _extract_content(message.get("reasoning_content"))
    if not text:
        raise ProviderFailed(step, f"Dịch vụ AI trả về nội dung rỗng ở bước: {step}.")
    return text


def complete_json(*, step: str, prompt: str, max_tokens: int = 700, temperature: float = 0.2) -> dict[str, Any]:
    """A call whose answer must be a JSON object."""
    text = complete(
        step=step,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
        json_mode=True,
    )
    parsed = extract_json_object(text)
    if parsed is None:
        raise ProviderFailed(step, f"Dịch vụ AI trả về JSON không hợp lệ ở bước: {step}.")
    # The raw text rides along so a summariser can fall back to the prose the
    # model wrote when a specific key is missing — same as the TS version.
    parsed.setdefault("_raw_text", text)
    return parsed


def complete_line(*, step: str, prompt: str, max_tokens: int = 120) -> str:
    """A call whose answer is one plain line (a question or a search query)."""
    text = complete(
        step=step,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0.2,
        json_mode=False,
    )
    cleaned = _strip_fence(text)
    try:
        decoded = json.loads(cleaned)
        if isinstance(decoded, str):
            cleaned = decoded.strip()
    except (ValueError, TypeError):
        pass
    cleaned = cleaned.strip("\"'` \n\t")
    if not cleaned:
        raise ProviderFailed(step, f"Dịch vụ AI không hoàn tất bước: {step}.")
    return cleaned


def text_of(parsed: dict[str, Any], *keys: str, default: str = "") -> str:
    """First non-empty string among `keys`, else `default`."""
    for key in keys:
        value = _clean(parsed.get(key))
        if value:
            return value
    return default
