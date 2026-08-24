#!/usr/bin/env bash
#
# Chỉ cho Cloudflare chạm vào cổng 80/443 của máy chủ gốc.
#
# VÌ SAO CẦN
# ----------
# Đo được ngày 2026-08-23:
#     curl -k -H "Host: api.agromind.farm" https://103.124.94.97/admin/login/  ->  200
#     header cf-ray: KHÔNG CÓ
# Nghĩa là bất kỳ ai biết IP máy chủ đều gọi thẳng vào Django, bỏ qua hoàn toàn
# Cloudflare. Mọi thứ đã bật trên Cloudflare — chống DDoS, WAF, giới hạn tần
# suất, Bot Fight Mode — đều vô hiệu với đường đi đó. IP máy chủ không phải bí
# mật: nó nằm trong lịch sử DNS và log Certificate Transparency.
#
# VÌ SAO BẢN TRƯỚC KHÔNG ĂN
# -------------------------
# Bản cũ nạp dải IP bằng `while read ... done < <(curl ...)`. Bên trong vòng lặp,
# `ufw` đọc luôn stdin và nuốt sạch phần còn lại của danh sách, nên chỉ dải đầu
# tiên được thêm. Bản này duyệt qua mảng nên không còn stdin để nuốt.
#
# CÁCH DÙNG
#     sudo bash lock-origin-to-cloudflare.sh --dry-run   # xem trước, không đổi gì
#     sudo bash lock-origin-to-cloudflare.sh             # áp dụng thật
set -euo pipefail

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "    [xem trước] $*"
  else
    "$@" </dev/null >/dev/null
  fi
}

[[ $EUID -eq 0 ]] || { echo "Cần chạy bằng sudo."; exit 1; }
command -v ufw >/dev/null || { echo "Không có ufw. Cài: apt install ufw"; exit 1; }

echo "==> Tải dải IP Cloudflare"
V4=$(curl -fsS --max-time 30 https://www.cloudflare.com/ips-v4)
V6=$(curl -fsS --max-time 30 https://www.cloudflare.com/ips-v6)
mapfile -t RANGES < <(printf '%s\n%s\n' "$V4" "$V6" | grep -E '[0-9a-fA-F:.]+/[0-9]+')

# Cloudflare công bố khoảng 15 dải v4 và 7 dải v6. Ít hơn nhiều nghĩa là tải
# hỏng, và áp dụng danh sách thiếu sẽ chặn nhầm lưu lượng thật.
if [[ ${#RANGES[@]} -lt 15 ]]; then
  echo "LỖI: chỉ lấy được ${#RANGES[@]} dải, nghi tải hỏng. Dừng lại."
  exit 1
fi
echo "    lấy được ${#RANGES[@]} dải"

echo "==> Mở SSH trước, để không tự khoá mình ra ngoài"
run ufw allow OpenSSH || run ufw allow 22/tcp

echo "==> Gỡ luật mở 80/443 cho mọi nơi (nếu có)"
run ufw delete allow 80/tcp   || true
run ufw delete allow 443/tcp  || true
run ufw delete allow 'Nginx Full'      || true
run ufw delete allow 'Nginx HTTP'      || true
run ufw delete allow 'Nginx HTTPS'     || true

echo "==> Chỉ cho ${#RANGES[@]} dải Cloudflare vào 80/443"
for cidr in "${RANGES[@]}"; do
  run ufw allow from "$cidr" to any port 80  proto tcp
  run ufw allow from "$cidr" to any port 443 proto tcp
done

if [[ $DRY_RUN -eq 1 ]]; then
  echo
  echo "Đã chạy ở chế độ xem trước. Không có gì thay đổi."
  exit 0
fi

echo "==> Bật tường lửa"
ufw --force enable </dev/null >/dev/null

echo
echo "==> Luật hiện tại"
ufw status numbered | sed 's/^/    /'

cat <<'EOF'

==> KIỂM CHỨNG (chạy từ MÁY KHÁC, không phải máy chủ này)

    curl -k -m 10 -H "Host: api.agromind.farm" https://103.124.94.97/api/health/

    Mong đợi: treo rồi timeout, hoặc "Connection refused".
    Nếu vẫn trả 200 thì tường lửa CHƯA ăn — đừng coi là xong.

    Và kiểm tra đường bình thường vẫn sống:

    curl -s -o /dev/null -w "%{http_code}\n" https://api.agromind.farm/api/health/

    Mong đợi: 200.
EOF
