## WP-012 · Thư viện mô hình và kiểm bốn cấp

### 0. Phân loại
- `riskClass`: `architectural`
- `branch`: `wp/012`

### 1. Mục tiêu
Runner xác định chạy mô hình từ `model.schema.json`, cộng cơ chế kiểm bốn cấp theo
`14-quantitative-core.md` mục 2. WP này xây **công cụ**; nội dung tám mô hình do WP-008 tạo.

### 2. Input
`engine/docs/14-quantitative-core.md` mục 2 · `engine/contracts/model.schema.json` ·
`engine/docs/02-decisions.md` D-18

### 2b. Checkpoint trước khi bắt đầu
- WP-010 `done`
- `model.schema.json` có `verification` với enum bốn cấp

### 3. Output
- `engine/models/runner.ts` — nạp mô hình, chạy với một bộ tham số, trả kết quả xác định
- `engine/models/verify.ts` — chạy bốn cấp kiểm và tính trạng thái tổng hợp
- `scripts/run-model.ts` · `scripts/verify-models.ts`
- `.github/workflows/verify-models.yml`

### 3b. Bốn cấp và điều kiện bắt buộc
| Cấp | Cách kiểm | Bắt buộc khi | Bằng chứng phải lưu |
|---|---|---|---|
| 1 | Ca kiểm tay | **Mọi mô hình, không ngoại lệ** | File `M-NNN.cases.json`: đầu vào, kết quả người tính, cách tính |
| 2 | Đối chiếu công cụ công khai | Khi tồn tại công cụ tương đương | URL công cụ, đầu vào đã nhập, kết quả nhận được, ngày kiểm |
| 3 | Triển khai thứ hai bằng ngôn ngữ khác | `geoVarying: true`, hoặc mô hình dùng ở hơn 3 tập | Hash của mã triển khai thứ hai, kết quả của cả hai trên cùng bộ ca |
| 4 | Mô hình ngôn ngữ kiểm **giả định và đơn vị** | Mọi mô hình | Danh sách giả định chưa khai và lỗi đơn vị đã phát hiện |

**Cấp 4 không bao giờ kiểm số học.** Nếu dùng, phải là nhà cung cấp khác mô hình chính.

### 3c. Quy tắc trạng thái tổng hợp
`verification.status = "verified"` chỉ khi: cấp 1 pass, **và** mọi cấp bắt buộc theo điều
kiện của mô hình đó pass. Thiếu bất kỳ cấp bắt buộc nào → `partial`. Bất kỳ cấp nào fail →
`failed`. Runner **không** được tự đặt `verified` — nó tính trạng thái, và trạng thái được
commit như dữ liệu.

Đổi tham số, đổi ánh xạ nguồn, hay đổi công thức → mọi cấp đã pass **hết hiệu lực**, trạng
thái về `pending`. Tăng số phiên bản mà không chạy lại kiểm là vi phạm.

### 4. Phạm vi cho phép
`engine/models/**` · `scripts/run-model.ts` · `scripts/verify-models.ts` ·
`.github/workflows/verify-models.yml` · một dòng của chính WP này trong `engine/ops/backlog.md`

### 5. Ràng buộc
- Runner phải **xác định**: cùng đầu vào cho cùng đầu ra, không phụ thuộc thời gian hệ thống,
  không random, không gọi mạng.
- Số học tiền tệ dùng số nguyên đơn vị nhỏ nhất hoặc thư viện thập phân chính xác. Không dùng
  số thực nhị phân cho tiền.
- `validRange` được kiểm trước khi chạy; tham số ngoài khoảng → lỗi, không kẹp về biên.
- Chia cho 0, giá trị thiếu, NaN đều là lỗi tường minh, không phải kết quả.
- Runner không tạo mô hình. WP này **không** được viết nội dung mô hình nào.

### 5b. Điều kiện dừng
- Một mô hình cần cấp 3 nhưng chưa có triển khai thứ hai → báo `partial`, không tự viết
- Cần đặt `verified` để test chạy → dừng, dùng mô hình giả trong thư mục test thay vì sửa dữ liệu thật

### 6. Acceptance test
1. Mô hình giả có ba ca kiểm tay → runner chạy, khớp, trạng thái `verified`.
2. Mô hình giả `geoVarying: true` chỉ có cấp 1 → trạng thái `partial`, nêu thiếu cấp 3.
3. Chạy cùng mô hình hai lần → kết quả **giống hệt** từng chữ số.
4. **Kiểm âm 1:** tham số ngoài `validRange` → lỗi, không kẹp về biên.
5. **Kiểm âm 2:** sửa công thức mà không đổi kiểm → trạng thái về `pending` tự động.
6. **Kiểm âm 3:** mô hình chỉ có cấp 4 pass → **không** được `verified`.
7. **Kiểm âm 4:** 0,1 + 0,2 trong ngữ cảnh tiền tệ → bằng đúng 0,3, không phải 0,30000000000000004.

### 7. Definition of Done
Theo `definition-of-done.md`, cộng: bảy bài kiểm chạy thật trong Actions, kết quả dán vào báo cáo.
