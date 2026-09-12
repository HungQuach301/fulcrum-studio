## WP-002 · Interface state store và interface provider

### 1. Mục tiêu
Triển khai hai interface đã khai ở WP-000, với một triển khai duy nhất dựa trên repo. Đây là
thứ cho phép đổi nơi lưu trạng thái sau này mà không viết lại stage.

### 2. Input
`engine/docs/01-architecture.md` mục Mô hình đồng thời · `engine/docs/02-decisions.md` D-07 ·
`engine/contracts/episode-state.schema.json` · `engine/contracts/run-log.schema.json`

### 2b. Checkpoint trước khi bắt đầu
- WP-001 ở trạng thái `done`, bốn job CI xanh trên `main`

### 3. Output
- `engine/io/repo-store.ts` — triển khai interface trên repo
- `engine/io/episode-state.ts` — đọc/ghi trạng thái tập, validate trước khi ghi
- `engine/io/run-log.ts` — append với retry-with-rebase tối đa 5 lần
- `engine/providers/registry.ts` — đăng ký provider theo tên, đọc tên từ Genre/Channel Pack
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
`engine/io/**` · `engine/providers/**` · `.github/workflows/reindex.yml` ·
`.github/workflows/acceptance-wp002.yml` · `.github/workflows/commit-artifacts.yml` ·
`pipeline/state.json` · một dòng của chính WP này trong `engine/ops/backlog.md`

### 5. Ràng buộc
- **Không stage nào được ghi trực tiếp vào `pipeline/state.json`.** Chỉ `reindex.yml` ghi.
- `reindex.yml` dùng `concurrency: group=reindex, cancel-in-progress: true`.
- Registry không được chứa tên provider cụ thể — đọc từ cấu hình.
- Không thêm dependency.

### 5b. Điều kiện dừng
- Cần ghi `pipeline/state.json` từ một nơi khác `reindex.yml` — dừng, nêu lý do
- Cần chạm file ngoài phạm vi

### 6. Acceptance test
1. Hai job **cùng xuất phát từ một `main` SHA** ghi hai tập khác nhau → cả hai vào được, không
   job nào mất thay đổi. Đây là ca mà tách thư mục **không** giải quyết được.
2. Hai job ghi **cùng một tập** → tuần tự hoá, job sau thấy trạng thái của job trước.
3. Cùng một `writeId` gọi hai lần → chỉ một commit, lần hai trả thành công mà không ghi gì.
4. Job bị huỷ **sau khi** commit-artifacts đã push → chạy lại với cùng `writeId` không tạo
   commit trùng.
5. Ghi artifact thành công nhưng ghi trạng thái thất bại → trạng thái còn dở được phát hiện
   ở lần đọc sau, không bị coi là hoàn tất.
6. Ghi trạng thái cho hai tập giả **song song** trong hai job → cả hai thành công, không mất
   dữ liệu.
2. Append 50 dòng nhật ký từ hai job song song → đủ 50 dòng, không mất dòng nào.
3. `reindex.yml` xây lại chỉ mục đúng từ hai file trạng thái.
4. **Kiểm âm:** ghi một trạng thái tập không hợp lệ theo schema → bị từ chối trước khi ghi.

### 7. Definition of Done
Theo `definition-of-done.md` mục 1–12.
