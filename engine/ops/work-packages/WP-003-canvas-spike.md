## WP-003 · Spike canvas liên tục

### 0. Phân loại
- `riskClass`: `architectural`

### 1. Mục tiêu
Trả lời bằng số đo thật: kiến trúc canvas liên tục với máy quay di chuyển có khả thi trên
runner của Actions không, và ở cấu hình nào thì chuyển động chấp nhận được.

Đây là cổng chặn kiến trúc. Kết quả DỪNG nghĩa là `motion-grammar.md`,
`visual-quality-bar.md`, `layouts.json` và prompt dựng cảnh phải viết lại.

### 2. Input
`engine/library/motion-grammar.md` · `engine/library/cinematography.md` ·
`engine/library/visual-quality-bar.md` · `engine/docs/02-decisions.md` D-04

### 2b. Checkpoint trước khi bắt đầu
- WP-000 ở trạng thái `done`, CI của `main` xanh
- Chưa có thư mục `spike/` trong repo

### 3. Output
`spike/canvas/` và `spike/canvas/RESULT.md` với sáu chỉ số:

| # | Chỉ số | Ngưỡng |
|---|---|---|
| 1 | Bộ nhớ đỉnh khi render canvas 6000×3400 | Không hết bộ nhớ trên runner tiêu chuẩn |
| 2 | Thời gian render 5.400 khung ở 1 worker | ≤25 phút |
| 3 | Chậm hơn render tĩnh cùng số khung | ≤3× |
| 4 | Chất lượng chuyển động **30fps không motion blur** | Clip xem được |
| 5 | Chất lượng chuyển động **30fps có motion blur** | Clip xem được |
| 6 | Chất lượng chuyển động **60fps không motion blur** | Clip xem được |

Chỉ số 4–6 tồn tại vì quy tắc "không khung nào đứng yên, máy quay trôi chậm liên tục" nằm
đúng dải tốc độ dễ gây giật hình ở tần số khung thấp không có mờ chuyển động, đặc biệt với
đồ hoạ cạnh sắc và chữ. Mỗi chỉ số kèm chi phí và thời gian render.

### 3b. Nội dung clip thử
3 phút gồm: trôi ngang chậm qua biểu đồ cột · zoom vào một con số · morph giữa hai trạng
thái của cùng dữ liệu · quay lại một vùng đã xem trước đó.

### 4. Phạm vi cho phép
`spike/canvas/**` · `.github/workflows/spike-canvas.yml`

### 5. Ràng buộc
- Hộp thời gian: dừng sau 3 lần render thất bại liên tiếp và báo cáo.
- Dependency: thư viện dựng hình React và các gói phụ trợ cùng phiên bản, `react@18.2.0`,
  `react-dom@18.2.0`. Không thêm gì khác.
- Không chạm gì ngoài `spike/` và hai đường dẫn khai ở mục 4.
- **Không kết luận thay chủ dự án về chỉ số 4–6.** Chỉ xuất clip và số đo.

### 5b. Điều kiện dừng
- Hết bộ nhớ ở lần chạy đầu trên runner tiêu chuẩn → **dừng cấu hình đó**, không thử tối ưu
  code hay ngữ pháp chuyển động. Được phép chạy **đúng một lần** trên runner lớn hơn có phí
  để lấy số liệu (mục 7b), rồi dừng và báo cáo
- Cần thêm dependency ngoài danh sách
- Cần chạm file ngoài các đường dẫn khai ở mục 4

### 6. Acceptance test
1. Workflow xuất đủ ba clip.
2. `RESULT.md` đủ sáu chỉ số với số đo thật, không ô nào trống.
3. Chi phí thực tế mỗi lần render được ghi.

### 7. Bốn kịch bản và hành động

| Kịch bản | Hành động |
|---|---|
| Đạt cả 3 chỉ số hiệu năng, 30fps không mờ chấp nhận được | Tiếp Mốc 4 nguyên trạng. Chốt 30fps |
| Đạt hiệu năng, 30fps giật, 30fps có mờ thì ổn | Chốt 30fps + mờ chuyển động. Nâng mờ chuyển động lên ưu tiên 1 trong `cinematography.md`, hạ ngưỡng bật để phủ cả chuyển động trôi chậm |
| Chỉ 60fps chấp nhận được | Chốt 60fps. **Cập nhật lại ngân sách render** — số khung gấp đôi. Xem lại nhịp bền vững |
| Không đạt hiệu năng | **DỪNG.** Viết lại ngữ pháp chuyển động theo hướng cú di chuyển dứt khoát xen kẽ giữ tĩnh có phần tử khác chuyển động. Thêm một mục vào `02-decisions.md` |

### 8. Định dạng báo cáo
Năm mục, cộng bảng sáu chỉ số và kịch bản đã xảy ra.

---

### 7b. Kịch bản thứ năm

| Kịch bản | Hành động |
|---|---|
| Hết bộ nhớ trên runner tiêu chuẩn | **Trước khi kết luận DỪNG**, chạy lại một lần trên runner lớn hơn (có phí) và ghi chi phí mỗi lần render vào `RESULT.md`. Nếu runner lớn hơn đạt, đây là một đề xuất theo D-14: nới ràng buộc chi phí cố định, không phải viết lại ngữ pháp chuyển động |

### 7c. Ghi thêm vào RESULT.md

- Giấy phép của thư viện dựng hình: điều khoản cho cá nhân, và điều khoản khi bán năng lực
  cho tổ chức. Đây là rủi ro nhà cung cấp cùng nhóm với R11.
- Số phút runner tiêu thụ cho mỗi cấu hình, để đưa vào cơ cấu chi phí ở `04-nfr.md`.
