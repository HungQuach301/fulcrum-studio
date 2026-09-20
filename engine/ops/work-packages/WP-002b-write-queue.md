## WP-002b · Hàng đợi ghi và reindex

### 0. Phân loại
- `riskClass`: `architectural`
- `branch`: `wp/002b`

### 1. Mục tiêu
Triển khai hàng đợi ghi tuần tự theo D-15 và xây lại `pipeline/state.json` từ các file trạng
thái tập.

### 2. Input
`engine/docs/01-architecture.md` mục Mô hình đồng thời · `engine/docs/02-decisions.md` D-15 ·
`engine/contracts/episode-state.schema.json` · `engine/contracts/run-log.schema.json`

### 2b. Checkpoint trước khi bắt đầu
- WP-002a ở trạng thái `done`, bốn job CI xanh trên `main`
- Code đã tồn tại trên main qua PR #19 nhưng CHƯA nghiệm thu. Nhiệm vụ là chạy nghiệm thu; fail thì sửa, không giả định code đúng.

### 3. Output
- `.github/workflows/commit-artifacts.yml` — hàng đợi ghi theo D-15
- `.github/workflows/reindex.yml` — xây lại `pipeline/state.json` từ các file trạng thái tập

### 3d. Hàng đợi ghi — triển khai D-15

Mọi ghi vào repo đi qua `commit-artifacts.yml` với `concurrency: group=repo-write,
cancel-in-progress: false`. Stage sinh artifact, upload làm Actions artifact, rồi **gọi**
workflow này bằng `workflow_dispatch` với `episodeId`, danh sách file và một `writeId` duy
nhất.

Workflow: fetch `main` → áp thay đổi lên SHA mới nhất → commit → push. Xung đột thì fetch và
thử lại, tối đa 5 lần, backoff tăng dần.

Áp thay đổi theo loại: file thuộc một tập **ghi đè trọn file**; log **nối thêm dòng**;
`pipeline/state.json` không ai ghi.

Trước khi commit, kiểm `writeId` đã có trong lịch sử chưa. Có rồi thì đây là lần gọi lặp —
bỏ qua và trả thành công. Đây là cơ chế khử trùng cho job bị huỷ sau khi đã ghi.

### 4. Phạm vi cho phép
`.github/workflows/commit-artifacts.yml` · `.github/workflows/reindex.yml` ·
`engine/io/github-*.ts` · `engine/io/reindex.ts` · `pipeline/state.json` ·
một dòng của chính WP này trong `engine/ops/backlog.md`

### 5. Ràng buộc
- **Không stage nào được ghi trực tiếp vào `pipeline/state.json`.** Chỉ `reindex.yml` ghi.
- `reindex.yml` dùng `concurrency: group=reindex, cancel-in-progress: true`.
- Không thêm dependency.

### 5b. Điều kiện dừng
- `main` bị đổi bởi nguồn khác giữa chừng
- Cần ghi `pipeline/state.json` từ một nơi khác `reindex.yml` — dừng, nêu lý do
- Cần chạm file ngoài phạm vi
- Cần thêm dependency

### 6. Acceptance test
Mục này có tổng cộng **6 bài kiểm**, đánh số liên tục từ 1 đến 6.

1. Hai job **cùng xuất phát từ một `main` SHA** ghi hai tập khác nhau → cả hai vào được, không
   job nào mất thay đổi. Đây là ca mà tách thư mục **không** giải quyết được.
2. Hai job ghi **cùng một tập** → tuần tự hoá, job sau thấy trạng thái của job trước.
3. Cùng một `writeId` gọi hai lần → chỉ một commit, lần hai trả thành công mà không ghi gì.
4. Job bị huỷ **sau khi** commit-artifacts đã push → chạy lại với cùng `writeId` không tạo
   commit trùng.
5. Ghi trạng thái cho hai tập giả **song song** trong hai job → cả hai thành công, không mất
   dữ liệu.
6. `reindex.yml` xây lại chỉ mục đúng từ hai file trạng thái.

### 7. Definition of Done
Theo `definition-of-done.md` mục 1–12.

### 8. Định dạng báo cáo
1. Đã làm gì · 2. Đã kiểm thế nào (dán kết quả thật) · 3. File đã chạm · 4. Rủi ro còn lại và
chi phí đã tiêu · 5. Checkpoint cuối (nhánh, SHA, link PR)
