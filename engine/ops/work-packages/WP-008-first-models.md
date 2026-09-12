## WP-008 · Tám mô hình định lượng đầu tiên

### 0. Phân loại
- `riskClass`: `architectural`
- `branch`: `wp/008`

### 1. Mục tiêu
Tạo tám mô hình định lượng thật trong `/models/data-explainer/`, mỗi mô hình có **ca kiểm
tay** commit kèm. Không có WP nào khác tạo ra chúng, và cổng Mốc 3 đòi tám mô hình đã qua
kiểm — đây là chỗ chúng ra đời.

### 2. Input
`engine/docs/14-quantitative-core.md` mục 2 · `engine/contracts/model.schema.json` ·
`channels/us-personal-finance/topic-source-map.md` (đầu ra của WP-009) ·
`channels/us-personal-finance/topic-map.md`

### 2b. Checkpoint trước khi bắt đầu
- WP-009 `done`, bảng đề tài × tham số × nguồn đã có
- WP-010 `done`, kho ảnh chụp có dữ liệu cho các tham số của tám đề tài được chọn
- WP-012 `done`, runner mô hình chạy được

### 3. Output
- `models/data-explainer/M-001.json` … `M-008.json` theo `model.schema.json`
- Với mỗi mô hình: một file ca kiểm tay `models/data-explainer/M-NNN.cases.json`, tối thiểu
  ba ca, mỗi ca có đầu vào, kết quả mong đợi **do người tính tay**, và cách tính
- `models/data-explainer/README.md`: bảng tám mô hình, tham số, nguồn dữ liệu, cấp kiểm đã
  đạt

### 3b. Phần việc của người — khai rõ vì đây là ngoại lệ
Theo quyết định **D-18**: công thức, giả định và **ca kiểm tay** là công việc miền, không
phải công việc code. Ca kiểm
tay theo định nghĩa phải do người tính; một mô hình ngôn ngữ tự sinh ca kiểm rồi tự khớp với
chính nó không chứng minh gì. Agent soạn khung file, kiểm cấu trúc và chạy runner; chủ dự án
điền công thức và ca kiểm, hoặc thuê người làm.

**Chọn hai mô hình dễ kiểm nhất làm trước** — đề tài phí quỹ và mortgage points — vì câu hỏi
giới hạn được rõ và có công cụ tính công khai để đối chiếu ở cấp 2.

### 4. Phạm vi cho phép
`models/data-explainer/**` · một dòng của chính WP này trong `engine/ops/backlog.md`

### 5. Ràng buộc
- Không mô hình nào dùng tham số không có trong `data-series.json`.
- Mọi mô hình khai `validRange` cho từng tham số và `tolerance` cho kết quả.
- Mô hình có `geoVarying: true` bắt buộc đạt cấp 3 (triển khai thứ hai).
- `verification.status = "verified"` chỉ được đặt khi cấp 1 đã đạt và các cấp bắt buộc theo
  điều kiện đã đạt. Agent **không** được tự đặt trạng thái này.

### 5b. Điều kiện dừng
- Một tham số cần thiết không có nguồn trong `data-series.json` → dừng, nêu tham số, quay lại
  WP-009
- Ca kiểm tay chưa có cho một mô hình → **không** tạo ca thay thế bằng máy, dừng và báo

### 6. Acceptance test
1. Tám file mô hình validate theo `model.schema.json`.
2. Runner chạy toàn bộ ca kiểm tay của cả tám mô hình → khớp trong dung sai.
3. **Kiểm âm 1:** một ca kiểm tay bị sửa lệch ngoài dung sai → runner báo fail, nêu đúng ca.
4. **Kiểm âm 2:** một mô hình đặt `verification.status = "verified"` nhưng thiếu file ca kiểm
   tay → validate fail.
5. **Kiểm âm 3:** tham số có giá trị mặc định nằm ngoài `validRange` → fail.

### 7. Definition of Done
Theo `definition-of-done.md`, cộng: bảng trong README nêu rõ mô hình nào đạt cấp nào và mô
hình nào còn thiếu cấp bắt buộc theo điều kiện.
