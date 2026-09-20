## WP-015 · Thesis Engine

### 0. Phân loại
- `riskClass`: `architectural`

### 1. Mục tiêu
Sinh thesis đạt chuẩn từ dữ liệu, đủ duy trì bank ≥15 mục khả dụng ở nhịp mục tiêu. Đây là
điều kiện tiên quyết của quyết định D-08 và là cổng chặn Mốc 3.

### 2. Input
`engine/docs/14-quantitative-core.md` mục 4 · `engine/contracts/thesis.schema.json` ·
`channels/us-personal-finance/thesis-bank.md` · `/data/snapshots/` · `/models/`

### 2b. Checkpoint trước khi bắt đầu
- WP-011, WP-013, WP-014 đều `done`
- Kho ảnh chụp có ≥10 chuỗi từ ≥3 nhà cung cấp
- Corpus đối thủ có dữ liệu và kiểm mới lạ tự động chạy được

### 3. Output
- `engine/thesis/sources/` — năm module riêng biệt, một cho mỗi nguồn
- `engine/thesis/engine.ts` — gom, chấm, khử trùng lặp, ghi vào bank
- `scripts/run-thesis-engine.ts`
- `.github/workflows/thesis.yml` — theo lịch
- `channels/us-personal-finance/thesis-bank/` — các mục theo `thesis.schema.json`

### 4. Phạm vi cho phép
`engine/thesis/**` · `scripts/run-thesis-engine.ts` · `.github/workflows/thesis.yml` ·
`channels/us-personal-finance/thesis-bank/**`

### 5. Ràng buộc
- Năm nguồn triển khai **riêng biệt**, mỗi nguồn một module, để đo được nguồn nào cho chất
  lượng cao nhất.
- Mọi thesis phải có `contradicts` không rỗng.
- `noveltyVerdict` do máy điền từ corpus, không để trống, không mặc định `novel`.
- Thesis dựa trên dữ liệu biến động nhanh bắt buộc có `expiresAt`.
- Không thêm hằng số nội dung vào `/engine`: tiêu chí chấm thuộc Genre Pack.

### 5b. Điều kiện dừng
- Một nguồn không sinh được thesis nào sau 3 lần chạy → báo cáo, không tự đổi tiêu chí
- Bank vượt 200 mục → dừng, đề xuất cơ chế loại bỏ

### 6. Acceptance test
1. Sinh ≥20 thesis hợp lệ theo schema.
2. **Nguồn 2 (ngưỡng ẩn) và nguồn 3 (câu hỏi chưa ai trả lời) sinh tổng cộng ≥15 thesis.**
   Nguồn 1, 4, 5 được phép rỗng ở Mốc 3 và đo lại ở Mốc 7 — lý do ở `12-success-criteria.md`.
3. Chạy lại → không tạo bản trùng.
4. **Kiểm âm:** thesis thiếu `contradicts` → bị từ chối trước khi ghi.

### 7. Definition of Done
Theo `definition-of-done.md`, cộng **Cổng Mốc 3** trong `12-success-criteria.md`:
chấm mù 40 thesis theo đúng năm bước trong mục "Cách chấm" của file đó — chuẩn hoá thẻ, ghép
cặp cùng trụ, cho phép hoà; **máy thắng ≥60% số cặp không hoà và ≥15/20 thesis đạt rubric ba
trục**; lý do loại từng thesis bị bác ghi vào `rejectionReason`.

Kết quả sát ngưỡng đọc là **"chưa đủ bằng chứng"**, không phải "dừng dự án" — xem bảng ba kết
quả trong `12-success-criteria.md`.

**Không đạt rõ ràng thì dừng dự án tại đây.** Sát ngưỡng thì tăng mẫu, không dừng.
