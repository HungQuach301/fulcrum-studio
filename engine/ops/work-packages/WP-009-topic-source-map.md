## WP-009 · Bản đồ đề tài × nguồn dữ liệu

### 0. Phân loại
- `riskClass`: `mechanical`
- `branch`: `wp/009`

### 1. Mục tiêu
Trước khi xây kho dữ liệu, xác định **bằng bảng** rằng mỗi đề tài khởi đầu có đủ nguồn hợp lệ
cho mọi tham số nó cần. Đề tài không đủ nguồn thì thay, không phải phát hiện sau khi đã xây.

### 2. Input
`channels/us-personal-finance/topic-map.md` · `channels/us-personal-finance/data-sources.md`
· `engine/docs/14-quantitative-core.md`

### 2b. Checkpoint trước khi bắt đầu
- WP-002 `done`
- `data-sources.md` có đủ bốn nhóm nguồn, gồm nhóm 3 (cần mở rộng) và nhóm 4 (nhu cầu tìm kiếm)

### 3. Output
`channels/us-personal-finance/topic-source-map.md` — một bảng, mỗi dòng một cặp
đề tài × tham số:

| Đề tài | Tham số cần | Nhà cung cấp | Mã chuỗi hoặc đường dẫn | Cấp địa lý | Có/Không | Ghi chú |

Cộng một mục kết luận: đề tài nào **không sản xuất được** với danh sách trắng hiện tại, và
với mỗi đề tài đó, hai lựa chọn — thêm nguồn nào, hoặc thay bằng đề tài nào.

### 3b. Bắt buộc kiểm riêng
Mục "tham số theo bang" cho Sensitivity Pass: thuế bất động sản hiệu dụng theo bang, thuế thu
nhập bang, chi phí đóng hồ sơ theo bang. Đây là nguyên liệu của tính năng chữ ký; nếu không
có nguồn thì Sensitivity Pass toàn bang không chạy được, và điều đó phải lộ ra **ở đây**.

### 4. Phạm vi cho phép
`channels/us-personal-finance/topic-source-map.md`

### 5. Ràng buộc
- Chỉ nghiên cứu và lập bảng. **Không viết code, không gọi API.**
- Không đề xuất nguồn không truy cập được công khai.
- Mỗi ô "Có" phải kèm mã chuỗi hoặc đường dẫn cụ thể, không phải tên cơ quan chung chung.

### 5b. Điều kiện dừng
- Quá 4 trong 12 đề tài không đủ nguồn → dừng, báo cáo, chờ chủ dự án quyết định trước khi
  làm WP-010

### 6. Acceptance test
Đọc được: mọi dòng có đủ bảy cột, không ô nào để trống, mọi ô "Có" có mã chuỗi cụ thể.

### 7. Definition of Done
Theo `definition-of-done.md` mục 1, 3, 8, 9.
