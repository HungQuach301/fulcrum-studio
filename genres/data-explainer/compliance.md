# Tuân thủ

Áp cho mọi kênh dùng thể loại này. Kênh có thể siết thêm, không được nới.

## Bảng cấm — ngôn ngữ và cách thay

| Cấm | Thay bằng |
|---|---|
| "Bạn nên..." | "Ở mức trên X, phép tính nghiêng về..." |
| "Đây là lựa chọn tốt nhất" | "Với giả định A và B, kết quả là..." |
| "Đảm bảo", "chắc chắn" | "Trong dữ liệu giai đoạn X đến Y" |
| "Hãy mua / hãy bán" | Bỏ hoàn toàn |
| "Không bao giờ làm X" | "X trở nên tốn kém khi vượt ngưỡng Y" |
| Dự đoán tương lai của một tài sản cụ thể | Bỏ hoàn toàn |

## Ba việc khác nhau, đừng gộp

| Việc | Là gì | Đặt ở đâu |
|---|---|---|
| **Giới hạn phạm vi giáo dục** | Nói rõ đây là phân tích, không phải lời khuyên cho hoàn cảnh cụ thể | Mô tả. Cấu hình được — xem dưới |
| **Khai nội dung tổng hợp** | Khai theo yêu cầu của nền tảng khi nội dung được tạo hoặc chỉnh bằng công cụ tổng hợp | Trường khai báo của nền tảng, cộng nhãn nếu nền tảng yêu cầu |
| **Khai quan hệ thương mại** | Tài trợ, liên kết tiếp thị, sản phẩm được tặng | **Trong video**, không chỉ trong mô tả — xem mục Liên kết tiếp thị |

Ba thứ này có nguồn yêu cầu khác nhau và không thay thế được cho nhau. Áp quy tắc của cái
này cho cái kia là lỗi phổ biến.

## Tuyên bố giới hạn phạm vi

Mặc định đặt trong phần mô tả, không đọc thành tiếng — lý do là giữ chân, và đây là **lựa
chọn biên tập**, không phải kết luận pháp lý. Tài liệu này không khẳng định việc đọc thành
tiếng có hay không làm tăng hiệu lực pháp lý; đó là câu hỏi cho luật sư ở thị trường mục
tiêu, không cho một đặc tả sản xuất.

`disclaimerPlacement` có hai giá trị: `description` (mặc định cho kênh) và `on-screen`. Khách
hàng tổ chức gần như chắc chắn yêu cầu `on-screen`.

## Nhân vật

Mọi nhân vật trong ví dụ là nhân vật tổng hợp, không dựa trên một người thật. Nêu rõ điều
này khi ví dụ có chi tiết cá nhân.

## Chính sách bình luận

Bình luận dưới nội dung tài chính gần như luôn có dạng nêu hoàn cảnh cá nhân rồi hỏi phải
làm gì. Trả lời trực tiếp câu đó là đúng thứ bảng cấm ở trên ngăn ở kịch bản.

**Ba khuôn trả lời được phép:**

1. *Hướng về ma trận.* Nêu người hỏi rơi vào tầng nào theo thông tin họ đưa, và tầng đó nói
   gì. Không nói họ nên làm gì.
2. *Hướng về mô hình.* Dẫn tới bảng tính công bố và nêu tham số nào trong hoàn cảnh của họ
   đáng đổi.
3. *Nêu giới hạn.* Khi thông tin không đủ hoặc câu hỏi vượt phạm vi phân tích, nói rõ điều đó.

**Cấm:** đưa phán quyết cho một hoàn cảnh cá nhân, dù được hỏi trực tiếp.

**Cảnh báo về khuôn 1.** Xếp chính người hỏi vào một tầng rồi nêu hành động của tầng đó **vẫn
có thể là cá nhân hoá**, dù mỗi câu đều đúng khuôn. Ranh giới nằm ở chỗ: mô tả tầng là được;
nói "anh thuộc tầng này nên hãy làm X" là không. Vì vậy trả lời bình luận phải qua **review
nội dung thật**, không chỉ qua bộ lọc từ cấm — một regex không phát hiện được cá nhân hoá
viết bằng ngôn ngữ hoàn toàn trung tính.

## Khai báo nội dung tổng hợp — bảng quyết định

Nền tảng yêu cầu khai theo **đặc điểm và tính chân thực của nội dung**, không theo việc có
dùng công cụ AI hay không. Soạn thảo có AI hỗ trợ và nội dung tổng hợp mô phỏng thực tế là
hai chuyện khác nhau.

| Trường hợp trong tập của chúng ta | Khai? |
|---|---|
| Kịch bản soạn có AI hỗ trợ, nội dung là phân tích dữ liệu thật | Theo hướng dẫn hiện hành của nền tảng — kiểm lại, không giả định |
| Giọng đọc tổng hợp | **Có.** Đây là giọng không phải người thật |
| Ảnh nền sinh bằng AI, không mô phỏng người hay sự kiện có thật | Theo hướng dẫn hiện hành |
| Biểu đồ dựng từ dữ liệu thật | Không. Đây là đồ hoạ dữ liệu, không phải nội dung tổng hợp mô phỏng thực tế |

Bảng này **phải được kiểm lại với hướng dẫn hiện hành của nền tảng trước tập đầu tiên phát
hành**, và bằng chứng kiểm lưu cùng metadata khai báo. Chính sách thay đổi, và một bảng chép
lại từ tài liệu cũ không bảo vệ được ai.

## Liên kết tiếp thị và quan hệ thương mại

Hướng dẫn của cơ quan quản lý thị trường Mỹ: khi có quan hệ thương mại được nhắc tới trong
video, khai báo phải **nằm trong chính video**, không chỉ trong phần mô tả, và phải ở chỗ
người xem khó bỏ lỡ.

Điều đó nghĩa là: **không được lấy quy tắc "miễn trừ đặt trong mô tả" ở trên áp cho tài trợ
và liên kết tiếp thị.** Hai thứ khác nhau, nguồn yêu cầu khác nhau.

Giai đoạn đầu không có liên kết tiếp thị nào, nên vấn đề chưa phát sinh. Nhưng khi Mốc 8 mở
liên kết, `disclaimerPlacement` **không** điều khiển việc này — cần một trường riêng và một
lượt kiểm riêng ở S16b.

## Bằng chứng công sức không bảo đảm kiếm tiền

Bốn cơ chế bằng chứng công sức làm nội dung tốt hơn và dễ bảo vệ hơn. Chúng **không** là bảo
đảm được kiếm tiền. Nền tảng đánh giá tính nguyên bản, giá trị và mức khác biệt thực chất
của nội dung, xét cả metadata và các phần khác của kênh. Có chuyển động và có file sensitivity
không phải tiêu chí của họ.
