# Mẫu Content Package

CP mô tả một thay đổi **tài liệu nội dung**: prompt pack, format-spec, bible, persona, từ
điển, layout spec, compliance. Không chứa code.

---

## CP-XXX · <tên ngắn>

### 1. Mục tiêu
Một câu.

### 2. Input
File phải đọc. Nếu có tài liệu tham chiếu bên ngoài, liệt kê rõ.

### 2b. Checkpoint trước khi bắt đầu
- File đích tồn tại
- Các ràng buộc ở mục 4 không mâu thuẫn với `channel.json` hoặc `format-spec.json`

### 3. Output
Đúng một file, viết lại toàn bộ, không viết từng phần.

### 4. Phạm vi cho phép

Danh sách đường dẫn được tạo hoặc sửa. Job `guardrails` đọc mục này cho nhánh `cp/`, giống
hệt cách nó đọc mục 4 của WP. Ràng buộc đã chốt ghi ở mục 5.
Những điều không cần hỏi lại. Càng cụ thể càng ít vòng lặp.

### 5. Phần được giữ nguyên
Mục nào trong file gốc không được đổi.

### 5b. Điều kiện dừng
- Ràng buộc ở mục 4 mâu thuẫn với một file khác trong repo
- Cần thay đổi một file thứ hai để mục tiêu này có nghĩa

### 6. Tiêu chí nghiệm thu
Kiểm được bằng đọc, không cần chạy. Ví dụ: "mọi ví dụ đều bằng tiếng Anh Mỹ", "không mục nào
còn `<ĐIỀN>`", "mọi ngưỡng đều có đơn vị".

### 7. Định dạng
Xuất markdown hoặc JSON đầy đủ trong MỘT khối code. Không giải thích trước hay sau.
