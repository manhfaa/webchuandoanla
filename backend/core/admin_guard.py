"""Giới hạn số lần thử đăng nhập vào trang quản trị Django.

Vì sao cần
----------
``/admin/login/`` trả 200 cho bất kỳ ai trên Internet, và Django **không** có
sẵn cơ chế khoá sau nhiều lần sai. Toàn bộ REST API đã được DRF giới hạn tần
suất (``login``, ``register``, ``payment_orders``...), nhưng trang quản trị
không đi qua DRF nên không được che.

Hai lớp, cố ý
-------------
Giới hạn theo IP chặn kiểu dò thông thường. Nhưng máy chủ gốc hiện vẫn nhận
kết nối trực tiếp không qua Cloudflare, nên kẻ tấn công có thể **tự đặt** header
``CF-Connecting-IP`` để mỗi lần thử trông như một IP khác. Vì vậy có thêm một
hạn mức TỔNG, không phụ thuộc IP, mà việc giả header không lách được.

Hạn mức tổng là lưới an toàn, không phải hàng rào chính. Hàng rào chính là chặn
truy cập thẳng vào IP máy chủ.

Lưu ý vận hành: cache mặc định của Django là LocMemCache, tính riêng cho từng
tiến trình Gunicorn. Với N worker thì hạn mức thực tế là N lần con số dưới đây.
Khi nào gắn Redis thì nó tự siết lại đúng.
"""

from __future__ import annotations

import time

from django.core.cache import cache
from django.http import HttpResponse

IP_LIMIT = 10
TOTAL_LIMIT = 60
WINDOW_SECONDS = 15 * 60


def client_ip(request) -> str:
    """IP đáng tin nhất có thể lấy được.

    Ưu tiên header của Cloudflare, rồi X-Forwarded-For, cuối cùng là địa chỉ
    kết nối. Hai header đầu giả được khi máy chủ gốc còn hở — đó là lý do có
    thêm hạn mức tổng ở trên.
    """
    for header in ("HTTP_CF_CONNECTING_IP", "HTTP_X_FORWARDED_FOR"):
        value = request.META.get(header, "")
        if value:
            return value.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or "unknown"


def _hit(key: str, limit: int) -> bool:
    """Đếm một lượt. True nghĩa là đã vượt hạn mức."""
    bucket = int(time.time()) // WINDOW_SECONDS
    full_key = f"adminguard:{key}:{bucket}"
    try:
        added = cache.add(full_key, 1, WINDOW_SECONDS + 60)
        count = 1 if added else cache.incr(full_key)
    except ValueError:
        # Khoá vừa hết hạn giữa add và incr; coi như lượt đầu của cửa sổ mới.
        cache.set(full_key, 1, WINDOW_SECONDS + 60)
        count = 1
    return count > limit


class AdminLoginRateLimitMiddleware:
    """Chặn POST dò mật khẩu vào trang đăng nhập quản trị."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "POST" and request.path.rstrip("/").endswith("/login"):
            from django.conf import settings

            admin_prefix = f"/{getattr(settings, 'DJANGO_ADMIN_PATH', 'admin/').strip('/')}/"
            if request.path.startswith(admin_prefix):
                over_ip = _hit(f"ip:{client_ip(request)}", IP_LIMIT)
                over_total = _hit("total", TOTAL_LIMIT)
                if over_ip or over_total:
                    return HttpResponse(
                        "Quá nhiều lần đăng nhập. Vui lòng thử lại sau ít phút.",
                        status=429,
                        content_type="text/plain; charset=utf-8",
                    )

        return self.get_response(request)
