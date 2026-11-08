# Tìm kiếm tự nhiên cho Agromind AI

Tài liệu làm việc, không phải cam kết thứ hạng hay ước tính lượng tìm kiếm. Mỗi cụm dưới đây là giả thuyết về cách người dùng Việt Nam diễn đạt vấn đề; xác nhận bằng báo cáo **Hiệu suất > Truy vấn** trong Google Search Console và Bing Webmaster Tools trước khi mở rộng nội dung. **Một danh sách từ khóa nằm trong tài liệu nội bộ không làm trang web tăng hạng**: chỉ đưa cụm phù hợp vào tiêu đề, nội dung gốc và liên kết của trang đích thật sự hữu ích.

## So sánh công cụ lập chỉ mục

| Công cụ | Dùng để làm gì | Phù hợp với Agromind AI | Giới hạn quan trọng |
| --- | --- | --- | --- |
| [Google Search Console](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) | Gửi sitemap, kiểm tra URL, yêu cầu thu thập lại vài URL đã thay đổi, theo dõi truy vấn và trạng thái lập chỉ mục | **Ưu tiên 1** cho Google. Gửi `https://www.agromind.farm/sitemap.xml` một lần, xem báo cáo hằng tuần; yêu cầu thu thập lại khi trang quan trọng thay đổi đáng kể | Gửi URL không đảm bảo được lập chỉ mục hay tăng hạng. Không gửi lặp URL không đổi |
| [Bing Webmaster Tools](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed) | Gửi sitemap, xem truy vấn, kiểm tra URL trên Bing | **Ưu tiên 2** để có thêm kênh tìm kiếm; có thể nhập website đã xác minh từ Search Console nếu tài khoản cho phép | Cần xác minh quyền sở hữu. Chưa cấu hình trong repo này |
| [IndexNow](https://www.indexnow.org/documentation) | Báo cho Bing và các máy tìm kiếm tham gia khi URL công khai được thêm, sửa hoặc xóa | Chỉ triển khai khi có quy trình xuất bản nội dung thường xuyên; có thể tự động hóa sau khi có tệp khóa xác minh trên đúng host | **Không thay Google Search Console**; HTTP 200 chỉ là đã nhận thông báo, không phải đã lập chỉ mục |
| [Google Indexing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart) | Thông báo cho Google về URL đủ điều kiện | **Không dùng** cho trang bệnh cây và trang giới thiệu | Google chỉ cho `JobPosting` hoặc `BroadcastEvent` trong `VideoObject`; dùng sai có nguy cơ bị từ chối |

Hiện website đã có sitemap, canonical, robots và trang nội dung công khai. Không mua dịch vụ “index tức thì” hoặc tự động gửi hàng loạt. Google [không dùng thẻ `meta keywords`](https://developers.google.com/search/docs/fundamentals/seo-starter-guide); nội dung hữu ích, tiêu đề rõ ràng và liên kết nội bộ mới là việc nên đầu tư. Không tạo nhiều trang gần giống nhau chỉ để bắt biến thể truy vấn.

## Cụm từ khóa dài theo ý định tìm kiếm

Chỉ dùng cụm từ khi trang đích **thực sự trả lời** được câu hỏi. Các cụm về bệnh dưới đây dẫn tới trang cây và mục bệnh tương ứng; đây là phạm vi hỗ trợ trong dữ liệu model, **không phải khẳng định chẩn đoán chắc chắn**.

| Nhóm | Cụm truy vấn người dùng có thể gõ | Trang đích |
| --- | --- | --- |
| Chụp ảnh kiểm tra | chụp ảnh lá cây để kiểm tra bệnh bằng AI; ứng dụng nhận diện bệnh lá cây tiếng Việt; kiểm tra lá cây bị bệnh bằng điện thoại miễn phí; AI nhận biết dấu hiệu sâu bệnh từ ảnh lá | `/` và `/register` |
| Cà chua | cà chua bị cháy lá muộn nên làm gì; cách theo dõi cháy lá sớm trên cà chua; lá cà chua bị đốm vi khuẩn kiểm tra thế nào; cà chua bị virus xoăn vàng lá cần theo dõi gì | `/benh-cay/ca-chua` |
| Xoài | xoài bị thán thư nên theo dõi gì; lá xoài bị bệnh phấn trắng kiểm tra thế nào; xoài có dấu hiệu loét vi khuẩn trên lá | `/benh-cay/xoai` |
| Cà phê | lá cà phê bị gỉ sắt nên làm gì trước; cà phê bị đốm lá Cercospora cần quan sát gì; lá cà phê bị sâu đục lá theo dõi thế nào | `/benh-cay/ca-phe` |
| Ngô | ngô bị cháy lá phương Bắc nên theo dõi gì; lá ngô bị gỉ sắt theo dõi thế nào; ngô có đốm lá xám Cercospora nên làm gì | `/benh-cay/ngo-bap` |
| Dưa chuột | dưa chuột bị sương mai cần theo dõi gì; lá dưa chuột bị thán thư nên làm gì; dưa chuột bị héo vi khuẩn nên làm gì | `/benh-cay/dua-chuot` |
| Khoai tây | khoai tây bị cháy lá sớm nên làm gì; lá khoai tây bị cháy lá muộn cần kiểm tra gì | `/benh-cay/khoai-tay` |
| Sắn | lá sắn bị virus khảm nên kiểm tra gì; sắn bị bạc lá vi khuẩn cần theo dõi thế nào | `/benh-cay/san` |
| Thương hiệu | Agromind AI kiểm tra bệnh cây như thế nào; Agromind AI hỗ trợ những loại cây nào; Agromind AI có miễn phí không | `/`, `/benh-cay`, `/#goi-dich-vu` |

## Bộ mở rộng: truy vấn có trang đích hiện hữu

Các biến thể dưới đây nhằm giúp biên tập viên chọn **một ý định chính cho mỗi trang**, không phải dán nguyên danh sách vào HTML. Trang `/huong-dan` được thêm vào mã nguồn cùng tài liệu này; chỉ dùng nó làm trang đích trên web thật **sau khi triển khai**.

| Cụm chủ đề | Truy vấn dài gợi ý | Trang đích |
| --- | --- | --- |
| Chụp ảnh lá | cách chụp ảnh lá cây để kiểm tra bệnh; ảnh lá cây bị mờ có nhận diện được bệnh không; nên chụp một lá hay cả cây khi kiểm tra bằng AI; chụp mặt trên hay mặt dưới lá khi lá bị đốm; chụp lá cây ngược sáng có ảnh hưởng kết quả không; dùng camera điện thoại kiểm tra lá cây như thế nào; ảnh lá bị vật che cần chụp lại ra sao; cách chụp lại cùng một lá để so sánh | `/huong-dan` |
| Hiểu kết quả AI | độ tin cậy trong kết quả nhận diện bệnh cây nghĩa là gì; AI đưa nhiều khả năng bệnh lá thì chọn khả năng nào; vì sao ảnh rõ mà kết quả AI vẫn chưa chắc chắn; khi nào nên hỏi chuyên gia sau khi kiểm tra ảnh lá; có nên phun thuốc chỉ dựa trên ảnh lá không; làm gì khi kết quả kiểm tra ảnh lá có độ tin cậy thấp; cách kết hợp ảnh lá và triệu chứng quan sát tại vườn; theo dõi bệnh lá cây sau khi dùng AI thế nào | `/huong-dan` |
| Khám phá cây hỗ trợ | AI kiểm tra bệnh lá cây hỗ trợ cây nào; danh sách bệnh cây trồng có thể kiểm tra từ ảnh lá; cây cà phê và cà chua có nhận diện bệnh bằng ảnh được không; bệnh cây nào Agromind AI đang hỗ trợ; tra cứu dấu hiệu bệnh theo loại cây trồng; kiểm tra lá cây trước khi hỏi chuyên gia nông nghiệp | `/benh-cay` |
| Cà chua | cà chua bị cháy lá muộn nên theo dõi bao lâu; lá cà chua có vết cháy sớm nên làm gì; cà chua có đốm lá Septoria cần kiểm tra gì; lá cà chua có đốm vi khuẩn nên theo dõi thế nào; cây cà chua bị mốc lá cần làm gì trước; cà chua bị nhện đỏ hai chấm nên kiểm tra mặt lá nào; cà chua có dấu hiệu virus khảm nên làm gì; cây cà chua bị xoăn vàng lá cần quan sát gì | `/benh-cay/ca-chua` |
| Mía | mía bị bệnh chồi cỏ cần theo dõi gì; lá mía bị gỉ nâu nên làm gì; mía có dấu hiệu Pokkah Boeng nên kiểm tra gì; lá mía có sọc vàng cần theo dõi thế nào; mía bị bệnh than đen nên làm gì trước; lá mía bị đốm nâu nên quan sát gì | `/benh-cay/mia` |
| Xoài | xoài bị bệnh thán thư cần theo dõi gì; lá xoài có phấn trắng nên làm gì; xoài bị khô cành và lá nên kiểm tra gì; xoài có dấu hiệu loét vi khuẩn cần theo dõi ra sao; lá xoài bị nấm bồ hóng nên làm gì trước; xoài có dấu hiệu muỗi đục chồi cần quan sát gì | `/benh-cay/xoai` |
| Nho | lá nho có dấu hiệu phấn trắng nên theo dõi gì; nho bị thối đen cần làm gì trước; lá nho bị cháy lá Isariopsis cần kiểm tra gì; nho có đốm nâu trên lá nên quan sát thế nào; nho có dấu hiệu bệnh Esca cần theo dõi gì | `/benh-cay/nho` |
| Ngô | ngô bị cháy lá phương Bắc nên làm gì trước; lá ngô bị gỉ sắt cần theo dõi gì; ngô có đốm lá xám Cercospora nên quan sát gì; lá ngô có dấu hiệu virus sọc lá cần làm gì; ngô nghi hoại tử chết cây nên hỏi chuyên gia khi nào | `/benh-cay/ngo-bap` |
| Cà phê | lá cà phê bị gỉ sắt cần theo dõi mấy ngày; cà phê bị đốm lá Cercospora nên làm gì; lá cà phê có đốm lá Phoma cần kiểm tra gì; cây cà phê bị sâu đục lá nên quan sát thế nào; chụp ảnh lá cà phê để theo dõi gỉ sắt ra sao | `/benh-cay/ca-phe` |
| Dưa chuột | dưa chuột bị sương mai cần làm gì trước; lá dưa chuột có dấu hiệu thán thư nên theo dõi gì; dưa chuột bị nứt thân chảy nhựa cần kiểm tra thế nào; dưa chuột nghi héo vi khuẩn nên hỏi chuyên gia khi nào; chụp ảnh lá dưa chuột bị bệnh như thế nào | `/benh-cay/dua-chuot` |
| Sắn | sắn bị bạc lá vi khuẩn nên làm gì trước; lá sắn có nhện xanh cần theo dõi gì; sắn bị virus khảm cần kiểm tra thêm gì; lá sắn bị đốm nâu nên chụp lại khi nào | `/benh-cay/san` |
| Chè | lá chè bị cháy lá nên theo dõi gì; chè có đốm đỏ trên lá cần kiểm tra gì; lá chè bị ghẻ đỏ nên làm gì trước | `/benh-cay/che` |
| Táo | lá táo bị bệnh ghẻ nên theo dõi gì; táo có dấu hiệu gỉ sắt tuyết tùng cần kiểm tra gì; cây táo bị thối đen nên hỏi chuyên gia khi nào | `/benh-cay/tao` |
| Điều | lá điều bị thán thư nên làm gì trước; điều có gỉ đỏ trên lá cần theo dõi gì; cây điều có sâu đục lá cần kiểm tra thế nào | `/benh-cay/dieu` |
| Hồ tiêu | lá hồ tiêu bị cháy lá nên theo dõi gì; hồ tiêu có virus đốm vàng cần quan sát thế nào; hồ tiêu bị vàng đốm lá nên kiểm tra lại khi nào | `/benh-cay/ho-tieu` |
| Khoai tây | khoai tây bị cháy lá sớm cần làm gì trước; lá khoai tây bị cháy lá muộn nên theo dõi thế nào; chụp lại lá khoai tây bị cháy để so sánh khi nào | `/benh-cay/khoai-tay` |
| Ớt chuông | ớt chuông bị đốm lá cần làm gì trước; lá ớt chuông có đốm vi khuẩn cần theo dõi thế nào; kiểm tra ảnh lá ớt chuông có nhiều đốm ra sao | `/benh-cay/ot-chuong` |
| Sản phẩm | Agromind AI là gì và giúp kiểm tra lá cây ra sao; Agromind AI có những tính năng gì cho người trồng; Agromind AI có gói miễn phí không; cách tạo tài khoản Agromind AI; Agromind AI có lưu lịch sử ảnh lá không; Agromind AI có theo dõi thời tiết vườn không; Agromind AI có hỗ trợ lập kế hoạch chăm sóc cây không | `/`, `/register`, `/#goi-dich-vu` |
| Nguồn gốc dự án | ai là người sáng lập Agromind AI; ai là trưởng nhóm DIEPTEK phát triển Agromind AI; Phạm Đức Mạnh giữ vai trò gì trong Agromind AI; nhóm nào phát triển Agromind AI | `/about` |

Các trang một bệnh như cam, dâu tây, đào, bí và anh đào mới xuất hiện trên `/benh-cay`, **không** có URL cây riêng. Chỉ mở trang riêng khi có thêm nội dung gốc và đủ thông tin chuyên môn; không sao chép mẫu mỏng cho từng biến thể.

## Chủ đề rộng hơn cần nội dung mới trước khi nhắm SEO

Đây là **backlog nội dung, chưa có trang đích**. Không chèn các cụm vào trang hiện tại chỉ để kéo lượt tìm kiếm. Cần nguồn kỹ thuật, ảnh quan sát thực địa hoặc người biên tập có chuyên môn trước khi xuất bản.

| Chủ đề tương lai | Truy vấn gợi ý | Nội dung tối thiểu phải có |
| --- | --- | --- |
| Nhật ký vườn | cách ghi nhật ký chăm sóc cây trên điện thoại; theo dõi thay đổi bệnh lá theo từng ngày; lưu ảnh cây trồng theo từng lô vườn; so sánh ảnh lá cây trước và sau chăm sóc; mẫu nhật ký theo dõi vết bệnh trên lá | Hướng dẫn thao tác thật, ví dụ nhật ký đã ẩn dữ liệu cá nhân, giới hạn của so sánh ảnh |
| Thời tiết và quan sát | theo dõi thời tiết để kiểm tra nguy cơ bệnh cây; mưa nhiều có nên chụp lại lá cây không; cách ghi thời tiết khi phát hiện đốm lá; dùng cảnh báo thời tiết để ưu tiên kiểm tra vườn; thời tiết ảnh hưởng thế nào đến việc theo dõi sâu bệnh | Nguồn khí tượng, giải thích tương quan không đồng nghĩa nguyên nhân, ảnh chụp tính năng thật |
| Kế hoạch chăm sóc | lập kế hoạch theo dõi cây trồng bằng ứng dụng; nhắc lịch kiểm tra lá cây trong vườn; cách sắp xếp việc chăm sóc theo lô vườn; lịch chụp lại ảnh lá sau khi thấy dấu hiệu; lên kế hoạch kiểm tra cây sau mưa | Luồng sản phẩm hiện tại và ví dụ thực tế, không đưa lịch xử lý cứng cho mọi cây |
| Đối chiếu AI với thực địa | khi AI nhận diện bệnh cây sai thì kiểm tra lại thế nào; vì sao hai ảnh cùng cây cho kết quả khác nhau; cách kiểm tra ảnh lá không đủ rõ; nhiều bệnh lá có triệu chứng giống nhau phải làm sao; dấu hiệu nào cần chuyên gia xác nhận ngoài vườn | Diễn giải giới hạn model, ví dụ đã kiểm chứng, quy trình chuyển tuyến tới chuyên gia |
| Truy xuất nguồn gốc | mã QR truy xuất lô vườn dùng để làm gì; tạo nhật ký chăm sóc gắn mã QR; người mua xem thông tin lô trồng qua QR như thế nào; chia sẻ lịch sử chăm sóc mà không lộ dữ liệu riêng tư | Chỉ xuất bản sau khi kiểm tra luồng QR thật và rà soát quyền riêng tư |
| Tích hợp API | tích hợp API nhận diện bệnh cây vào website; API kiểm tra ảnh lá cây cho ứng dụng nông nghiệp; cách tính phí API Agromind AI; thử API chẩn đoán lá cây; bảo vệ API key khi dùng trên website | Tài liệu endpoint công khai, ví dụ an toàn, giá và trạng thái dịch vụ đã xác nhận |

Không nhắm các chủ đề không có khả năng hỗ trợ thực chất như dự báo năng suất chính xác, chẩn đoán bệnh lúa, kê đơn thuốc bảo vệ thực vật hoặc “AI chữa mọi bệnh cây”.

## Cách tăng cơ hội xuất hiện cao hơn

1. **Ưu tiên ý định người tìm.** Dùng báo cáo truy vấn và trang đích trong Search Console để chọn 5–10 cụm có lượt hiển thị thật, rồi cải thiện chính trang phù hợp. Chỉ dùng các cụm ở trên làm giả thuyết ban đầu.
2. **Nội dung gốc có chứng cứ.** Mỗi trang bệnh nên có ảnh lá đúng bệnh (được phép sử dụng), mô tả quan sát đã đối chiếu, nguồn kỹ thuật và ghi rõ giới hạn của model. Bài viết thực địa sẽ khác biệt hơn một danh sách biến thể từ khóa.
3. **Tiêu đề và đường dẫn rõ.** Giữ một trang chính cho mỗi nhu cầu, H1 khớp chủ đề, tiêu đề ngắn gọn mô tả đúng nội dung, liên kết nội bộ từ `/`, `/huong-dan` và `/benh-cay`. Google **không có giới hạn cố định 60 ký tự** cho title và có thể tự viết lại title trong kết quả.
4. **Chất lượng trên điện thoại.** Kiểm tra Core Web Vitals, ảnh tải chậm, vùng chạm và nội dung bị che. Điểm tốc độ tốt hỗ trợ trải nghiệm nhưng không thay thế mức độ liên quan của nội dung.
5. **Nguồn giới thiệu thật.** Nhờ đơn vị hợp tác, cuộc thi hoặc chuyên gia liên quan liên kết tới trang sản phẩm/phương pháp nếu họ tự nguyện và có căn cứ. Không mua backlink, tạo mạng lưới trang vệ tinh hoặc đăng hàng loạt bài gần giống nhau.
6. **Phân biệt quảng cáo với SEO.** Google Ads có thể đưa quảng cáo lên vị trí nổi bật khi đủ điều kiện đấu giá, nhưng **không mua được hạng tìm kiếm tự nhiên**. Chỉ thử quảng cáo cho cụm có trang đích hữu ích và đo được lượt đăng ký, với ngân sách riêng.

Google không cho phép trả tiền để được xếp hạng tự nhiên cao hơn và không bảo đảm vị trí đầu cho bất kỳ website nào. [Cách Google Search hoạt động](https://developers.google.com/search/docs/fundamentals/how-search-works), [nội dung hữu ích](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [trải nghiệm trang](https://developers.google.com/search/docs/appearance/page-experience), [quảng cáo và kết quả tự nhiên](https://support.google.com/google-ads/answer/6227161?hl=en).

Không nhắm mục tiêu “bệnh lúa” hoặc tên bệnh/cây chưa có trong model. Không hứa thuốc chữa, mức chính xác hoặc kết quả mà trang chưa chứng minh. Tránh dùng cùng một cụm ở mọi trang; trang cây nào chỉ nên tập trung vào bệnh thuộc cây đó.

## Vòng đo lường

1. Kiểm tra `sitemap.xml`, canonical, trạng thái HTTP 200 và khả năng đọc HTML công khai của từng trang đích.
2. Sau khi xuất bản, theo dõi 4–8 tuần: lượt hiển thị, nhấp, CTR, truy vấn và trang đích trong Search Console; đối chiếu Bing Webmaster Tools nếu được xác minh. Không gọi một biến động ngắn hạn là hiệu quả SEO.
3. Ưu tiên truy vấn có hiển thị nhưng CTR thấp để sửa tiêu đề/mô tả, hoặc truy vấn có nhấp nhưng trang chưa đáp ứng đúng ý định để bổ sung nội dung gốc có kiểm chứng. Đo lượt đăng ký từ tìm kiếm trước khi kết luận tăng trưởng kinh doanh.
4. Khi thêm bệnh/cây mới vào model và tài liệu chuyên môn, cập nhật trang đích, sitemap và liên kết nội bộ cùng lúc. Chỉ gửi lại URL thực sự đã thay đổi.

Nguồn tham khảo: [Google: nội dung hữu ích](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [Google: sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Google: tiêu đề kết quả](https://developers.google.com/search/docs/appearance/title-link), [Bing: URL submission](https://www.bing.com/webmasters/help/?topicid=62f2860b), [IndexNow: tài liệu kỹ thuật](https://www.indexnow.org/documentation).
