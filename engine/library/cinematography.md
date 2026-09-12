# Ngôn ngữ máy quay

Thư viện này áp cho mọi thể loại. Nó nói về **cách máy quay di chuyển**, không nói về nội
dung.

## 1 · Từ vựng chuyển động — nghĩa cố định

Mỗi tên có đúng một nghĩa. Không dùng tên ngoài danh sách này.

| Tên | Nghĩa | Dùng khi |
|---|---|---|
| `hold` | Máy quay đứng yên, phần tử khác chuyển động | Con số đang đếm, biểu đồ đang vẽ |
| `drift` | Trôi chậm đều, một hướng | Nền của lời dẫn dài |
| `pan` | Di chuyển ngang dứt khoát sang vùng khác | Chuyển ý trong cùng beat |
| `push` | Tiến vào, tăng tỷ lệ | Nhấn một con số |
| `pull` | Lùi ra, giảm tỷ lệ | Đặt chi tiết vào bối cảnh lớn hơn |
| `arc` | Di chuyển theo cung, đổi cả vị trí và tỷ lệ | Chuyển beat |
| `snap` | Nhảy tức thì | Đối lập gay gắt, dùng rất ít |

## 2 · Độ dẫn âm thanh — đòn bẩy cao nhất

Cho âm thanh của cảnh sau vào **trước** hình khoảng 300–600ms. Đây là kỹ thuật rẻ nhất và
hiệu quả nhất để làm chuỗi cảnh liền mạch.

**Bắt buộc ở mọi ranh giới beat.** Preflight kiểm điều này.

## 3 · Đón và theo

Trước một cú `push` hoặc `pan`, cho máy quay lùi nhẹ ngược hướng 3–5% quãng đường. Sau khi
dừng, cho vượt qua điểm đích 3–5% rồi mới ổn định.

Không có hai thứ này, chuyển động trông như trượt trên băng.

## 4 · Thị sai ba lớp

| Lớp | Tốc độ so với máy quay | Chứa gì |
|---|---|---|
| 1 — nền | ~30% | Lưới, hoa văn, khối màu lớn |
| 2 — chính | 100% | Biểu đồ, số, chữ |
| 3 — tiền cảnh | ~130% | Chú thích, mũi tên, hạt |

## 5 · Nhất quán hướng trong một tập

Chọn một hướng tiến (thường trái sang phải) và giữ nguyên cả tập. Quay lại nội dung cũ thì
đi ngược hướng đó. Người xem học được quy ước này trong khoảng một phút mà không ý thức.

## 6 · Mờ chuyển động

Bật khi tốc độ di chuyển vượt ngưỡng. **Ngưỡng cụ thể do WP-003 quyết định** — nếu spike cho
thấy chuyển động trôi chậm bị giật ở tần số khung đã chọn, ngưỡng phải hạ xuống đủ thấp để
phủ cả chuyển động trôi, và mờ chuyển động chuyển lên ưu tiên cao nhất.

## 7 · Đường cong gia tốc

- Chuyển ý: chậm ở đầu và cuối, nhanh ở giữa.
- Nhấn mạnh: nhanh ngay từ đầu, chậm dần về cuối.
- Không bao giờ dùng tuyến tính. Tuyến tính là dấu hiệu nhận biết đồ hoạ máy làm.

## 8 · Điều không chuyển giao được

Ba thứ dưới đây không viết thành quy tắc được, và không nên giả vờ là được:
- Biết khi nào **phá** quy tắc.
- Cảm giác về nhịp — khi nào cần một khoảng lặng dài hơn bình thường.
- Nhận ra một cảnh "đúng luật nhưng chán".

Cách duy nhất tiệm cận: xem lại bản dựng của chính mình, ghi lại chỗ thấy chán, tìm điểm
chung. Đó là nội dung của kiểm mẫu hằng tháng.

## 9 · Ưu tiên nếu chỉ làm được vài thứ

1. Độ dẫn âm thanh ở mọi ranh giới beat
2. Không bao giờ dùng gia tốc tuyến tính
3. Nhất quán hướng
4. Đón và theo
5. Thị sai ba lớp
6. Từ vựng chuyển động cố định
7. Mờ chuyển động — **có thể lên vị trí 1 tuỳ kết quả WP-003**
