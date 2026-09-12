## WP-013 · Sensitivity Pass

### 1. Mục tiêu
Cho một mô hình và một tập tham số, quét toàn bộ khoảng giá trị hợp lệ và tìm mọi **điểm đảo
chiều**. Đây là chữ ký khác biệt của kênh và là cơ chế bù hiểu biết bản địa.

### 2. Input
`engine/docs/14-quantitative-core.md` mục 3 · `engine/contracts/model.schema.json` ·
`/models/` các mô hình đã có

### 2b. Checkpoint trước khi bắt đầu
- WP-012 ở trạng thái `done`
- ≥2 mô hình trong `/models/` có `verification.status = "verified"` — do WP-008 tạo, không phải WP này

### 3. Output
- `engine/models/sensitivity.ts`
- `scripts/run-sensitivity.ts` — CLI nhận `modelId`
- Output: bảng đầy đủ theo tham số × giá trị · danh sách điểm đảo chiều · phân loại mỗi tham
  số thành `stable` / `sensitive` / `flips`

### 4. Phạm vi cho phép
`engine/models/**` · `scripts/run-sensitivity.ts` · `models/data-explainer/**` ·
`engine/ops/backlog.md` (một dòng của chính WP này)

### 5. Ràng buộc
- **Tính toán thuần. Không gọi mô hình ngôn ngữ.** Stage này phải xác định.
- Bắt buộc quét mọi tham số có `geoVarying: true`.
- Tham số không có `validRange` → dừng, không tự đoán khoảng.
- Kết quả tái lập: cùng mô hình, cùng phiên bản, cùng ảnh chụp → cùng đầu ra.

### 5b. Điều kiện dừng
- Một mô hình chưa `verified` → không quét, báo cáo
- Số tổ hợp vượt 1 triệu → dừng, đề xuất **tăng độ thưa của lưới quét** (bước lớn hơn, ít
  điểm hơn) hoặc chuyển sang quét thích nghi làm mịn quanh điểm đổi dấu. Không viết "giảm
  bước quét": bước nhỏ hơn làm số tổ hợp **tăng**

### 6. Acceptance test
1. Chạy trên một mô hình có điểm đảo chiều đã biết → tìm đúng điểm đó.
2. Chạy hai lần → đầu ra **giống hệt**.
3. **Kiểm âm:** mô hình thiếu `validRange` cho một tham số → dừng, nêu đúng tên tham số.

### 7. Definition of Done
Theo `definition-of-done.md`, cộng: kết quả một lần quét thật được commit vào `/models/` làm
ví dụ tham chiếu.
