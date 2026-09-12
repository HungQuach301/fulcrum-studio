# Bằng chứng công sức

Điều kiện thứ năm của bộ lọc ngách, và là cơ chế phòng vệ chính khi người không viết nội dung.

## Nguyên tắc

Nền tảng xét **cái gì trên màn hình**, không xét ai gõ phím. Nên công sức được thể hiện bằng
**độ sâu và độ biến thiên của đầu ra**, không bằng số giờ thao tác.

## Bốn bằng chứng, xếp theo sức mạnh

**1 · Phân tích độ nhạy.** Mỗi tập công bố bảng quét tham số và điểm đảo chiều. Không kênh
nào làm việc này, và nó rất đắt để sao chép.
*Kiểm:* `03-sensitivity.json` tồn tại, có điểm đảo chiều hoặc kết luận ổn định có bằng chứng.
**Chặn** nếu thiếu.

**2 · Bảng tính mô hình công bố công khai.** Mỗi tập kèm link tới mô hình đã dùng, người xem
mở ra kiểm được.
*Kiểm:* `modelSheetUrl` trong gói phát hành. **Chặn** nếu thiếu.

**3 · Con số phái sinh đã qua tính lại độc lập.**
*Kiểm:* `derivedNumberCheck.verdict = match`. **Chặn** nếu mismatch.

**4 · Chỉ số biến thiên giữa các tập.**
*Kiểm:* chỉ số biến thiên cấp kênh (artifact do WP-041 sinh, cửa sổ 10 tập) có `verdict ≠ block`. **Chặn** nếu block. Chỉ số này không nằm trong `13-qa.json` vì nó đo giữa các tập, không trong một tập.

## Điều quan trọng

Cả bốn đều **chặn**, không phải cảnh báo. Một cơ chế phòng vệ chỉ cảnh báo là một cơ chế
không tồn tại.
