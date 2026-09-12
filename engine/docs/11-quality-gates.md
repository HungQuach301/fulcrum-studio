# Cơ chế chất lượng

Nguyên tắc trung tâm: **kiểm ở chỗ rẻ nhất.** Mỗi lớp kiểm rẻ hơn lớp sau khoảng một bậc.

| Lớp | Chi phí | Bắt được gì |
|---|---|---|
| Validate contract | ~0 | Sai cấu trúc |
| Preflight | ~0 | Vi phạm ràng buộc tĩnh — khoảng 80% lỗi |
| Proof render | ~0,1 USD | Lỗi thị giác |
| Render đầy đủ + QA | ~5 USD | Còn lại |
| Mắt người ở gate | thời gian | Thứ máy không đo được |

---

## Cơ chế 1 · Preflight — 12 kiểm tra tĩnh

Chạy trên storyboard trước khi render. Dưới 5 giây.

| # | Kiểm | Fail khi |
|---|---|---|
| 1 | Số scene | Ngoài khoảng 180–220 |
| 2 | Thời lượng scene tối thiểu | Bất kỳ scene nào dưới 1200ms |
| 3 | Độ lệch chuẩn thời lượng | Dưới 40% giá trị trung bình — nhịp đều đặn là nhịp chết |
| 4 | Chuỗi scene ngắn liên tiếp | Quá 3 scene liên tiếp dưới 2 giây |
| 5 | Phân bổ cỡ cảnh | Lệch quá dung sai khai trong format-spec |
| 6 | Phủ J-cut | Có ranh giới beat nào không có độ dẫn âm thanh |
| 7 | Vùng camera | Camera trỏ ra ngoài vùng đã khai trong Canvas Map |
| 8 | Nhất quán hướng | Hướng di chuyển đổi giữa chừng mà không có lý do khai báo |
| 9 | Lặp layout | Cùng layout và cùng biến thể xuất hiện quá số lần cho phép |
| 10 | Phủ claim | Có con số nào trên màn hình không có `claimId` |
| 11 | Mật độ chữ | Số từ hiển thị trên scene vượt trần |
| 12 | Tổng thời lượng | Lệch quá 5% so với thời lượng mục tiêu trong brief |

Ngoài 12 kiểm tra, preflight còn so **giá trị storyboard tự khai** với **giá trị tính được**.
Lệch ở đây nghiêm trọng hơn một kiểm tra fail thường — nó nghĩa là stage trước đã báo cáo sai
về chính đầu ra của nó.

---

## Cơ chế 2 · Proof render

~460 khung, lấy mẫu phân tầng, trước khi cam kết ~36.000 khung. Xem S13.

---

## Cơ chế 3 · Định tuyến nguyên nhân gốc

Mọi báo cáo lỗi phải khai `rootCauseStage` — **stage thật sự gây lỗi, có thể khác stage phát
hiện lỗi**. Ví dụ: preflight bắt được scene quá ngắn, nhưng nguyên nhân gốc là outline chia
beat quá vụn.

Chạy lại phải bắt đầu từ `rootCauseStage`, không phải từ stage phát hiện. Chạy lại từ stage
phát hiện là cách tiêu tiền mà không sửa được gì.

---

## Cơ chế 4 · Lỗi lặp thì sửa đặc tả, không sửa sản phẩm

Nếu **cùng một `errorClass` fail hai lần trên hai tập khác nhau**, bắt buộc mở một PR sửa
đặc tả hoặc sửa prompt trước khi chạy tập tiếp theo.

Cơ chế này biến vòng lặp sửa sản phẩm thành vòng lặp sửa quy trình. Thiếu nó, lỗi lặp mãi.

Nó **cần dữ liệu xuyên tập** — đó là lý do `pipeline/runs.jsonl` tồn tại và là lý do mọi
stage bắt buộc ghi nhật ký.

---

## Cơ chế 5 · Tự khai và đối chiếu

Mọi stage sinh nội dung phải tự khai các chỉ số đo được của đầu ra (số scene, phân bổ cỡ
cảnh, số thiết bị nội dung, số mục từ điển đã dùng). Stage sau tính lại và đối chiếu.

Lệch giữa tự khai và tính được là tín hiệu mạnh hơn một chỉ số xấu: nó cho biết mô hình
không hiểu đầu ra của chính nó.

---

## Cơ chế 6 · Chỉ số biến thiên giữa các tập

Đo trên cửa sổ 10 tập gần nhất: entropy phân bố layout · entropy phân bố archetype · độ
tương tự khuôn tiêu đề · độ tương tự cấu trúc thumbnail · độ tương tự kiểu mở đầu.

Vượt ngưỡng thì **chặn tập mới** cho tới khi đa dạng hoá. Đây là cơ chế chống R1 duy nhất
chạy tự động, và nó thay cho các cơ chế cũ vốn dựa vào việc người viết.

---

## QA ba lớp ở S15

**Lớp 1 — kỹ thuật.** Tự động, xác định: độ phân giải, tần số khung, độ ồn, lệch phụ đề, độ
dài, không khung đen, không khung đứng yên quá ngưỡng.

**Lớp 2 — thị giác.** 10 khung **lấy mẫu phân tầng** (một mỗi beat, một ở ma trận ngưỡng,
một ở mỗi ngã rẽ), không ngẫu nhiên đều. Ngưỡng 8/10 đạt. Lấy mẫu ngẫu nhiên đều trên
36.000 khung là mẫu quá nhỏ để có nghĩa.

**Lớp 3 — chuyển động.** Đoạn không có phần tử nào chuyển động; lệch đồng bộ hiệu ứng âm
thanh; nhịp scene.

**Gate 3 — người.** Spot check khoảng 5 phút.

**Luật cứng:** fail lần thứ hai vì cùng nguyên nhân thì **dừng hẳn**, không render lần ba.
Kích hoạt cơ chế 4.

---

## First-Pass Yield

FPY mỗi stage = số lần pass ở lần chạy đầu ÷ tổng số lần chạy đầu. Tính từ
`pipeline/runs.jsonl`.

FPY là chỉ số sức khoẻ chính của nhà máy. FPY thấp ở một stage nghĩa là đặc tả của stage đó
thiếu, không phải mô hình kém.
