# Review Rubrics

Khung đánh giá lượng hoá cho các cổng người. Tiêu chí nhị phân, ngưỡng đạt rõ, ngân sách
thời gian. Không tiêu chí nào phát biểu dưới dạng cảm nhận.

R1 và R2 có hiệu lực ngay. R3 đến R6 viết trước mốc tương ứng, không viết trước.

## R1 · Duyệt PR — ngân sách 3 phút

Sáu tiêu chí nhị phân. **Đạt = 6/6.** Một tiêu chí không đạt là từ chối.

| # | Tiêu chí | Nguồn |
|---|---|---|
| R1-1 | Mọi file trong diff nằm trong Phạm vi cho phép của task | người |
| R1-2 | Không file nào có đuôi ngoài `.ts .json .jsonl .md .yml .gitkeep` | `pr-budget` |
| R1-3 | Không file nào trong `.github/workflows/` vượt 12 KB | `pr-budget` |
| R1-4 | Không thư mục cấp một mới | `pr-budget` |
| R1-5 | Báo cáo đủ bảy dòng, dòng 2 dán output thật của `tsc` tại container | người |
| R1-6 | PR không đưa vào một danh từ quy trình mới | người |

R1-6 kiểm bằng cách tìm trong diff: `authority`, `ledger`, `receipt`, `phase`, `candidate`,
`evidence`, `sequence`, `grant`. Có xuất hiện thì đọc ngữ cảnh; nếu là khái niệm quy trình
mới thì từ chối.

Số file mới và tổng byte được in ra nhưng **không** là tiêu chí.

## R2 · Duyệt đề xuất D-14 — ngân sách 3 phút

Ba tiêu chí loại trừ. **Một tiêu chí không đạt là từ chối.**

| # | Tiêu chí | Vì sao |
|---|---|---|
| R2-1 | Đề xuất **xoá** được một ràng buộc, file, hoặc khái niệm đang tồn tại | Chỉ thêm mà không xoá là dấu hiệu phình |
| R2-2 | Ba loại bằng chứng hợp lệ thật sự không đủ, và agent nêu được lý do cụ thể | Đây là nơi bộ máy tự chế sinh ra |
| R2-3 | Bỏ hẳn đề xuất thì có cái gì **cụ thể** hỏng | "Để chắc chắn hơn" không phải câu trả lời |

Sáu quyết định D-22 đến D-27 trượt cả ba tiêu chí.

## R3 đến R6 — chưa viết

| Rubric | Cổng | Viết trước | Hướng đã chốt |
|---|---|---|---|
| R3 | WP-003 | Mốc 2 | So sánh cặp mù ba lượt giữa hai cấu hình fps, tên file ẩn. Thắng ≥2/3 thì chọn; 1-1-1 nghĩa là khác biệt không nhận ra được, chọn cấu hình rẻ hơn |
| R4 | Mốc 3 | Mốc 3 | Tầng 1 năm tiêu chí nhị phân cho từng luận điểm, đạt 4/5; tầng 2 so sánh cặp mù 20 cặp. Qua cổng: máy thắng ≥60% và ≥15/20 đạt tầng 1 |
| R5 | Mốc 4 | Mốc 4 | 8 tiêu chí trong `visual-quality-bar.md` nhị phân hoá, cộng bài kiểm hiểu 5 giây. Đạt 9/9 trên cả ba bộ dữ liệu mẫu |
| R6 | Gate 1, 2, 3 | Mốc 5 | Mỗi gate một bảng kiểm nhị phân; phần lớn Gate 2 và 3 do máy chấm |
