## WP-011 · Phát hiện dữ liệu thay đổi và đính chính

### 0. Phân loại
- `riskClass`: `mechanical`
- `branch`: `wp/011`

### 1. Mục tiêu
Phát hiện khi một chuỗi đã dùng trong tập đã phát hành bị thay đổi hoặc bị điều chỉnh sau
công bố, và tự mở issue liệt kê chính xác tập nào bị ảnh hưởng, claim nào, con số nào.

### 2. Input
`channels/us-personal-finance/data-sources.md` · `engine/contracts/snapshot.schema.json` ·
`engine/contracts/sources.schema.json` · `engine/docs/06-risk-register.md` R6, R7

### 2b. Checkpoint trước khi bắt đầu
- WP-010 `done`, kho ảnh chụp có ít nhất hai `asOfDate` cho cùng một chuỗi
- `data-series.json` tồn tại và validate được

### 3. Output
- `engine/data/change-detect.ts`
- `.github/workflows/detect-changes.yml` — theo lịch và `workflow_dispatch`
- `scripts/impact-report.ts` — tra ngược từ `seriesId` ra danh sách tập bị ảnh hưởng

### 3b. Ba loại thay đổi phải phân biệt
| Loại | Dấu hiệu | Hành động |
|---|---|---|
| **Giá trị mới của kỳ mới** | `asOfDate` mới, các kỳ cũ không đổi | Không làm gì. Đây là dữ liệu chạy bình thường |
| **Điều chỉnh sau công bố** | Cùng `period`, giá trị khác, `vintage` mới | Mở issue. Đây là R6 |
| **Đổi định nghĩa hoặc đơn vị** | `unit`, `seasonalAdjustment` hoặc `frequency` đổi | Mở issue mức cao. Mọi claim dùng chuỗi này phải xem lại, kể cả khi giá trị không đổi |

Ngưỡng cảnh báo dùng `changeAlertThresholdAbs` khi có, `changeAlertThresholdPct` khi không.
Với chuỗi có giá trị gần 0, phần trăm là vô nghĩa — lãi suất 0,25% lên 0,5% là +100%.

### 3c. Nội dung issue
Mỗi issue phải có: chuỗi nào, vintage cũ và mới, chênh lệch, danh sách `episodeId` bị ảnh
hưởng, `claimId` cụ thể trong từng tập, con số đã phát hành và con số mới, và một nút quyết
định — đính chính bằng bình luận ghim, sửa mô tả, hay gỡ tập.

### 4. Phạm vi cho phép
`engine/data/change-detect.ts` · `scripts/impact-report.ts` ·
`.github/workflows/detect-changes.yml` · `.github/workflows/acceptance-wp011.yml` ·
một dòng của chính WP này trong `engine/ops/backlog.md`

### 5. Ràng buộc
- Chỉ đọc kho ảnh chụp. **Không** gọi API trực tiếp trong workflow này.
- Không tự sửa bất kỳ artifact tập nào. Nó mở issue, người quyết.
- Khử trùng issue: cùng `seriesId` cùng `vintage` chỉ mở một issue.
- Chuỗi `annual-reset` kiểm cả **hạn**, không chỉ giá trị: sang chu kỳ mới mà chưa có ảnh
  chụp mới cũng là một cảnh báo.

### 5b. Điều kiện dừng
- Không tra ngược được từ `seriesId` ra `claimId` vì `sources.json` thiếu trường → dừng, nêu
  trường thiếu, đây là lỗi contract không phải lỗi code

### 6. Acceptance test
1. Hai ảnh chụp cùng chuỗi, một kỳ đổi giá trị quá ngưỡng → mở đúng một issue, liệt kê đúng
   tập.
2. Hai ảnh chụp, chỉ thêm kỳ mới → **không** mở issue.
3. Đổi `unit` mà giá trị không đổi → mở issue mức cao.
4. **Kiểm âm 1:** chuỗi có giá trị 0,25 đổi thành 0,5 với ngưỡng phần trăm 50% nhưng ngưỡng
   tuyệt đối 1,0 → **không** mở issue.
5. **Kiểm âm 2:** chạy lại hai lần → vẫn một issue, không nhân đôi.

### 7. Definition of Done
Theo `definition-of-done.md`, cộng: một issue thật được mở trong repo bằng dữ liệu giả và
được đóng thủ công sau khi kiểm.
