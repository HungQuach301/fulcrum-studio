# Mẫu Work Package

WP mô tả một thay đổi **code hoặc hạ tầng**. Thay đổi nội dung dùng `cp-template.md`.

Mỗi WP được thiết kế để **dán thẳng vào một task của agent** hoặc giao cho builder trong
Actions (WP-004), không cần viết lại prompt.

---

## WP-XXX · <tên ngắn>

### 0. Phân loại
- `riskClass`: `mechanical` hoặc `architectural`. Không khai thì mặc định `architectural`.
- `branch`: `wp/XXX`

### 1. Mục tiêu
Một câu. Kết quả cuối cần đạt, không phải cách làm.

### 2. Input
Các file agent phải đọc trước khi bắt đầu.

### 2b. Checkpoint trước khi bắt đầu
Trạng thái phải đúng như sau. Không khớp thì **DỪNG và báo cáo**, không tự khắc phục.

### 3. Output
File hoặc hành vi cụ thể sau khi xong.

### 4. Phạm vi cho phép
Danh sách đường dẫn được tạo hoặc sửa. Ngoài danh sách này là vi phạm guardrail 14. Job
`guardrails` đọc danh sách này từ chính file WP, đối chiếu với diff của PR.

### 5. Ràng buộc
Điều cấm, dependency được phép kèm phiên bản chính xác, giới hạn kỹ thuật.

### 5b. Điều kiện dừng
**DỪNG ngay và báo cáo**, không tự quyết, khi:
- `main` bị đổi bởi nguồn khác giữa chừng
- Cần chạm file ngoài "Phạm vi cho phép"
- Cần thêm dependency ngoài danh sách ở mục 5
- Phát hiện mâu thuẫn giữa WP này và `PROJECT.md`, `guardrails.md`, hoặc `01-architecture.md`
- **Một ràng buộc kiến trúc làm mục tiêu không đạt được** → viết ba dòng theo D-14
- Acceptance test fail lần thứ hai vì cùng một nguyên nhân **và** nguyên nhân đó là đặc tả
  thiếu, không phải lỗi cú pháp hay cấu hình

### 6. Acceptance test
Lệnh cụ thể chạy trong Actions và kết quả mong đợi. Phải gồm ít nhất một **bài kiểm âm**.
Nếu nghiệm thu cần một workflow thử nghiệm, đường dẫn workflow đó **phải nằm trong mục 4**.

### 7. Definition of Done
Theo `engine/ops/definition-of-done.md`, cộng các mục riêng của WP này.

### 8. Định dạng báo cáo
1. Đã làm gì · 2. Đã kiểm thế nào (dán kết quả thật) · 3. File đã chạm · 4. Rủi ro còn lại và
chi phí đã tiêu · 5. Checkpoint cuối (nhánh, SHA, link PR)
