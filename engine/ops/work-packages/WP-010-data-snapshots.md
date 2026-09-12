## WP-010 · Kho ảnh chụp dữ liệu

### 1. Mục tiêu
Dựng kho dữ liệu có phiên bản cho 3–4 chuỗi cụ thể sẽ dùng ở những tập đầu, cùng adapter cho
ba nhà cung cấp. **Không xây adapter tổng quát.**

### 2. Input
`engine/docs/14-quantitative-core.md` mục 1 · `engine/contracts/snapshot.schema.json` ·
`channels/us-personal-finance/data-sources.md` · `config/secrets.example.md`

### 2b. Checkpoint trước khi bắt đầu
- WP-002 ở trạng thái `done`
- Ba secret nguồn dữ liệu đã có trong Actions Secrets
- Thiếu bất kỳ secret nào: **DỪNG và báo cáo tên secret thiếu**

### 3. Output
- `engine/data/adapters/{fred,bls,census}.ts` — chuẩn hoá về `snapshot.schema.json`
- `scripts/fetch-snapshot.ts`
- `.github/workflows/fetch-data.yml` — theo lịch và theo kích hoạt tay
- ≥4 ảnh chụp thật đã commit, từ ≥3 nhà cung cấp

### 4. Phạm vi cho phép
`engine/data/**` · `scripts/fetch-snapshot.ts` · `.github/workflows/fetch-data.yml` ·
`data/snapshots/**` · `channels/us-personal-finance/data-series.json` ·
`engine/contracts/data-series.schema.json` · một dòng của chính WP này trong
`engine/ops/backlog.md`

`data-series.json` chưa tồn tại. WP này tạo nó cùng schema của nó, nội dung lấy từ bảng
đề tài × tham số × nguồn mà WP-009 đã lập. Thay đổi trong `engine/contracts/` cần nhãn
`[contract-change]` và một mục mới trong `02-decisions.md` như mọi lần khác.

### 5. Ràng buộc
- Không adapter tổng quát. Mỗi adapter chỉ xử lý chuỗi liệt kê trong cấu hình của kênh.
- **Không ghi đè ảnh chụp cũ.** Mỗi lần lấy tạo một `asOfDate` mới.
- Tôn trọng rate limit; ghi rõ giới hạn trong comment adapter.
- Không thêm HTTP client; dùng `fetch` sẵn có.

### 5b. Điều kiện dừng
- Một nhà cung cấp đổi cấu trúc trả về → dừng, báo cáo chênh lệch
- Rate limit chặn ngay ở lần gọi đầu
- Cần chạm file ngoài phạm vi

### 6. Acceptance test
1. Chạy workflow → tạo đủ 4 ảnh chụp, mọi file validate được.
2. Chạy lại trong cùng ngày → **không** tạo file trùng, không ghi đè.
3. **Kiểm âm:** đưa một mã chuỗi không tồn tại → job fail rõ ràng, không ghi file rác.

### 7. Definition of Done
Theo `definition-of-done.md`, cộng: mỗi ảnh chụp có `volatility` và
`changeAlertThresholdPct` điền đúng theo bản chất chuỗi, không để mặc định.
