# Hộ chiếu phục hồi: kế hoạch và điều kiện phát hành

## Phạm vi MVP

- Một tài khoản tạo đợt theo dõi từ một kết quả ảnh lá đã hoàn tất; lô vườn là tùy chọn.
- Mỗi lần tái kiểm tra dùng một kết quả chẩn đoán mới đã lưu, cùng loại cây. Người dùng tự đánh giá cải thiện, không đổi, xấu đi hoặc chưa rõ; có thể ghi số lá có dấu hiệu, chăm sóc đã thực hiện và ghi chú.
- Trang web hiện hai ảnh cạnh nhau, dòng thời gian và ngày kiểm tra tiếp. Đây là công cụ quan sát, không tự kết luận khỏi bệnh, không tự kê thuốc và không suy độ nặng từ xác suất CNN.
- Không sửa landing page, gói thanh toán hay cơ chế quota. Một ảnh mới vẫn được tính theo quota chẩn đoán hiện hành; thao tác liên kết ảnh vào đợt theo dõi không tính quota thêm.
- Bản xem thử `/dev/recovery` chỉ tồn tại khi `NODE_ENV=development`, dùng dữ liệu minh họa và không gọi API.

## Hợp đồng backend

| Endpoint | Mục đích | Quyền |
| --- | --- | --- |
| `GET /api/diagnoses/recovery/?limit=20&offset=0` | Danh sách phân trang, không gửi chuỗi ảnh gốc hoặc toàn bộ lần tái kiểm tra | Tài khoản sở hữu |
| `POST /api/diagnoses/recovery/` | Tạo từ `baseline_diagnosis_id`, `plot_id?`, `title?`, `next_check_date?` | Tài khoản sở hữu |
| `GET /api/diagnoses/recovery/{id}/` | Chi tiết có tối đa 30 lần tái kiểm tra | Tài khoản sở hữu |
| `PATCH /api/diagnoses/recovery/{id}/` | Đổi tên, ngày kiểm tra tiếp, đóng/mở | Tài khoản sở hữu |
| `POST /api/diagnoses/recovery/{id}/check-ins/` | Gắn một ảnh mới và quan sát | Tài khoản sở hữu |

Phản hồi ảnh chỉ chứa ID, loại cây, tên gợi ý bệnh, thumbnail đã lưu và thời gian. Không trả `image_data_url`, payload mô hình, token hoặc thông tin của người dùng khác. Mọi lookup kết quả ảnh, lô vườn và ca theo dõi được ràng buộc theo `request.user`. Ảnh chỉ được dùng một lần trong một đợt, ảnh tái kiểm tra phải mới hơn ảnh gốc và cùng loại cây; người dùng phải xác nhận đó là cùng cây hoặc khu vực. Trần dữ liệu: 20 đợt mở/tài khoản, 30 lần tái kiểm tra/đợt, tối đa 50 đợt/trang, ngày hẹn trong 90 ngày.

## Đồng bộ và bảo mật

1. Web gọi API qua reverse proxy `/api/django/` hiện có; cookie phiên HttpOnly/JWT và cơ chế làm mới token không đổi. Android có thể dùng cùng API về sau nhưng UI Android không nằm trong đợt này.
2. Chạy migration `diagnoses.0007` trước khi bật giao diện production. Deploy backend trước frontend; không dùng cơ sở dữ liệu Supabase production để thử. Giao diện production mặc định ẩn; truy cập trực tiếp `/dashboard/recovery` hiển thị trang không tìm thấy cho đến khi build frontend với `NEXT_PUBLIC_RECOVERY_ENABLED=1` (Next.js streaming có thể vẫn trả HTTP 200 ban đầu).
3. Khóa hàng khi tạo ca và khi gắn ảnh; ràng buộc OneToOne ở DB chặn trùng trong đua đồng thời. Chi tiết ca ngoài tài khoản trả 404.
4. Không tạo bản sao base64. Hiện hệ thống chẩn đoán cũ vẫn lưu ảnh gốc dạng base64 trong PostgreSQL; trước khi mở rộng lưu trữ ảnh mới quy mô lớn, chuyển sang object storage riêng, đường dẫn có quyền/TTL và chính sách xóa.
5. Không đưa endpoint này vào trang truy xuất QR công khai. Nội dung ghi chú được React escape; giới hạn độ dài tại serializer. Log vận hành không in ảnh hoặc ghi chú người dùng.

## Kiểm thử và cổng phát hành

- Unit/API: tạo/đọc/cập nhật, tài khoản khác/ẩn danh, trùng ảnh, sai lô, sai loại cây, ngày không hợp lệ, ca đóng, giới hạn, không nhân bản ảnh hay quota.
- Web: `tsc`, ESLint, `next build`; kiểm tra bản dev ở 320, 375, 390, 768 và 1280px, không tràn ngang; nút và form dùng vùng chạm ít nhất 44px.
- Duyệt UX trên localhost: tạo ca từ kết quả thật trong DB local, chụp lại, gắn ảnh, so sánh, đóng/mở; thử tiếng Việt và tiếng Anh, lỗi mạng và ca không còn quyền.
- Sau khi người dùng chấp thuận đưa mã vào `main`: có thể commit/push khi cờ production vẫn tắt. Chỉ bật cờ sau khi đã backup, deploy backend, chạy migration và kiểm tra API trên VPS; sau đó build/deploy frontend và smoke test bằng tài khoản thử riêng.

## Chưa nằm trong MVP

- Phân vùng vết bệnh, đo diện tích tổn thương hoặc chấm điểm hồi phục tự động: cần dữ liệu gán nhãn và đánh giá độc lập.
- Push notification/web reminder chủ động: hiện chỉ có ngày hẹn và nhãn quá hạn trên trang; có thể nối vào hệ nhắc việc sau khi pilot xác nhận người dùng quay lại.
- Tự động khẳng định biện pháp chăm sóc là nguyên nhân cải thiện: ảnh quan sát không đủ chứng minh quan hệ nhân quả.
