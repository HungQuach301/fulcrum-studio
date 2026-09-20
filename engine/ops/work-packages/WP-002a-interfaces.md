## WP-002a · Interfaces state store và provider

### 0. Phân loại
- `riskClass`: `mechanical`
- `branch`: `wp/002a`

### 1. Mục tiêu
Nghiệm thu các interface state store và provider đã khai ở WP-000, với một triển khai duy
nhất dựa trên repo.

### 2. Input
`engine/docs/01-architecture.md` mục Mô hình đồng thời · `engine/docs/02-decisions.md` D-07 ·
`engine/contracts/episode-state.schema.json` · `engine/contracts/run-log.schema.json`

### 2b. Checkpoint trước khi bắt đầu
- WP-001 ở trạng thái `done`, bốn job CI xanh trên `main`
- Code đã tồn tại trên main qua PR #19 nhưng CHƯA nghiệm thu. Nhiệm vụ là chạy nghiệm thu; fail thì sửa, không giả định code đúng.

### 3. Output
- `engine/io/repo-store.ts`
- `engine/io/episode-state.ts`
- `engine/io/run-log.ts`
- `engine/providers/registry.ts`

### 4. Phạm vi cho phép
`engine/io/repo-store.ts` · `engine/io/repo-store.test.ts` · `engine/io/episode-state.ts` ·
`engine/io/run-log.ts` · `engine/providers/registry.ts` · `engine/providers/registry.test.ts` ·
một dòng của chính WP này trong `engine/ops/backlog.md`

### 5. Ràng buộc
- Registry không được chứa tên provider cụ thể — đọc từ cấu hình.
- Mọi trạng thái được validate trước khi ghi.
- Không thêm dependency.

### 5b. Điều kiện dừng
- `main` bị đổi bởi nguồn khác giữa chừng
- Cần chạm file ngoài phạm vi
- Cần thêm dependency

### 6. Acceptance test
Mục này có tổng cộng **3 bài kiểm**, đánh số liên tục từ 1 đến 3.

1. Ghi artifact thành công nhưng ghi trạng thái thất bại → trạng thái còn dở được phát hiện
   ở lần đọc sau, không bị coi là hoàn tất.
2. Append 50 dòng nhật ký từ hai job song song → đủ 50 dòng, không mất dòng nào.
3. **Kiểm âm:** ghi một trạng thái tập không hợp lệ theo schema → bị từ chối trước khi ghi.

### 7. Definition of Done
Theo `definition-of-done.md` mục 1–12.

### 8. Định dạng báo cáo
1. Đã làm gì · 2. Đã kiểm thế nào (dán kết quả thật) · 3. File đã chạm · 4. Rủi ro còn lại và
chi phí đã tiêu · 5. Checkpoint cuối (nhánh, SHA, link PR)
