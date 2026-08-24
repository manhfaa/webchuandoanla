# Chỉ dẫn cho Claude khi xây dựng Android

Đọc theo thứ tự:

1. `../CLAUDE.md` để hiểu sản phẩm web và hạ tầng thật.
2. `01-CLAUDE-DESIGN-PROMPT.md` để hiểu hệ giao diện.
3. `02-CLAUDE-CODE-PROMPT.md` để hiểu kiến trúc và kế hoạch triển khai.
4. `03-API-CONTRACT.md` để dùng đúng endpoint.
5. `04-CLOUD-SECURITY-DEPLOYMENT.md` và `05-ACCEPTANCE-CHECKLIST.md` trước khi build release.

## Mệnh lệnh không được vi phạm

- Đây là ứng dụng Android native Kotlin + Jetpack Compose, không bọc website bằng WebView.
- Code Android chỉ nằm trong thư mục `AgromindAI-appandroid/`.
- Không sao chép backend Django thành backend mobile riêng.
- Không gọi trực tiếp Supabase, Hugging Face, DeepSeek, Tavily hoặc SePay webhook.
- Không nhúng bất kỳ secret nào vào APK, `BuildConfig`, resources, source, test fixture hoặc log.
- Không thay dữ liệu thật bằng mock trong release.
- Không tự suy đoán contract khi source backend đã có. Nếu contract thiếu, bổ sung endpoint Django có test và giữ tương thích website.
- Không tự kích hoạt gói dịch vụ ở client. Backend là nguồn sự thật duy nhất về thanh toán và quyền lợi.
- Không chạy CNN nếu YOLO từ chối ảnh lá.
- Nếu người dùng bỏ qua triệu chứng, không gọi luồng DeepSeek + Tavily.
- Nếu có triệu chứng, phải chạy đủ chuỗi kiểm chứng và trả nguồn mở được; không dùng câu trả lời dựng sẵn.
- Chat theo chẩn đoán và chat nông nghiệp độc lập là hai chế độ khác nhau.
- Kết quả AI luôn là tham khảo, không được tuyên bố chính xác tuyệt đối.
- Không commit keystore, `google-services.json` production, service-account JSON, `.env`, token hoặc thông tin ngân hàng riêng tư.

## Cách làm việc

- Trước mỗi thay đổi, kiểm tra `git status` và không ghi đè thay đổi của người dùng.
- Triển khai theo từng vertical slice có thể chạy được; không tạo hàng trăm file rỗng.
- Mỗi màn hình phải có loading, empty, success, offline, expired-session và error state thực tế.
- Dùng dependency phiên bản stable tương thích mới nhất; không lấy ví dụ alpha trong tài liệu làm phiên bản production.
- Mỗi milestone phải chạy unit test, Android lint và build debug.
- Trước release phải chạy toàn bộ checklist nghiệm thu.
