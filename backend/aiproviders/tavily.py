"""Tavily search client.

Two shapes of the same result set are produced on purpose:

* `for_model` keeps `raw_content` so DeepSeek can actually read the pages it is
  asked to summarise. It never leaves the server.
* `for_client` drops `raw_content`, caps the snippet and exposes only the host,
  so an Android response stays a few kilobytes instead of tens, and the app
  never becomes a mirror for whatever text a third-party page contained.

`src/app/api/research-symptoms/route.ts` returned `rawContent` straight to the
browser; that is the one behaviour not carried over.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

from django.conf import settings

from .base import ProviderFailed, ProviderNotConfigured

MAX_RESULTS = 5
CLIENT_SNIPPET_CHARS = 480
MODEL_CONTENT_CHARS = 1800
MAX_QUERY_CHARS = 500


def is_configured() -> bool:
    return bool(getattr(settings, "TAVILY_API_KEY", "").strip())


def _clean(value: Any) -> str:
    return str(value if value is not None else "").strip()


def _safe_url(raw: str) -> str:
    """Only absolute http(s) URLs survive.

    The app opens these in an external browser, so a `javascript:` or `data:`
    URL arriving from a search result must never be handed to it.
    """
    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return ""
    return raw


def search(*, query: str, step: str) -> list[dict[str, Any]]:
    """Advanced search, at most `MAX_RESULTS` sources. Raises when it finds none."""
    query = _clean(query)[:MAX_QUERY_CHARS]
    if not query:
        raise ProviderFailed(step, f"Câu tìm kiếm rỗng ở bước: {step}.")
    api_key = getattr(settings, "TAVILY_API_KEY", "").strip()
    if not api_key:
        raise ProviderNotConfigured(step, "Dịch vụ tìm nguồn tham khảo chưa được bật trên máy chủ.")

    try:
        import requests
    except ImportError as exc:  # pragma: no cover - requirements pin it
        raise ProviderNotConfigured(step, "Thiếu thư viện gọi dịch vụ tìm nguồn.") from exc

    try:
        response = requests.post(
            getattr(settings, "TAVILY_API_URL", "https://api.tavily.com/search"),
            headers={"Content-Type": "application/json"},
            json={
                "api_key": api_key,
                "query": query,
                "search_depth": "advanced",
                "max_results": MAX_RESULTS,
                "include_answer": False,
                "include_raw_content": True,
            },
            timeout=getattr(settings, "TAVILY_TIMEOUT_SECONDS", 25),
        )
    except requests.Timeout as exc:
        raise ProviderFailed(step, f"Tìm nguồn tham khảo quá chậm ở bước: {step}.") from exc
    except requests.RequestException as exc:
        raise ProviderFailed(step, f"Chưa gọi được dịch vụ tìm nguồn ở bước: {step}.") from exc

    if not response.ok:
        raise ProviderFailed(step, f"Dịch vụ tìm nguồn lỗi {response.status_code} ở bước: {step}.")

    try:
        data = response.json()
    except ValueError as exc:
        raise ProviderFailed(step, f"Dịch vụ tìm nguồn trả về dữ liệu không đọc được ở bước: {step}.") from exc

    results = [r for r in (data.get("results") or []) if _safe_url(_clean(r.get("url")))]
    if not results:
        raise ProviderFailed(step, f"Không tìm được nguồn tham khảo nào ở bước: {step}.")
    return results[:MAX_RESULTS]


def for_model(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sources as the summariser sees them — page text included."""
    return [
        {
            "id": index + 1,
            "title": _clean(item.get("title")) or f"Nguồn {index + 1}",
            "url": _safe_url(_clean(item.get("url"))),
            "snippet": _clean(item.get("content"))[:CLIENT_SNIPPET_CHARS],
            "raw_content": _clean(item.get("raw_content") or item.get("content"))[:MODEL_CONTENT_CHARS],
        }
        for index, item in enumerate(results)
    ]


def for_client(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sources as the app sees them — no page text, host exposed for display."""
    return [
        {
            "id": source["id"],
            "title": source["title"],
            "url": source["url"],
            "snippet": source["snippet"],
            "domain": urlparse(source["url"]).netloc.removeprefix("www."),
        }
        for source in sources
    ]


def as_prompt_block(sources: list[dict[str, Any]]) -> list[str]:
    def prompt_text(value: Any) -> str:
        # Keep a page from closing the delimiter used to mark it as untrusted.
        return _clean(value).replace("<", "[").replace(">", "]").replace("\x00", "")

    return [
        (
            f"<untrusted_source id=\"{s['id']}\">\n"
            f"Tiêu đề: {prompt_text(s['title'])}\n"
            f"URL: {prompt_text(s['url'])}\n"
            f"Đoạn trích: {prompt_text(s['snippet'])}\n"
            f"Nội dung trang: {prompt_text(s['raw_content'])}\n"
            "</untrusted_source>"
        )
        for s in sources
    ]
