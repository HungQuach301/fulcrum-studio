## WP-005 · Orchestrator — điều tiết sản lượng

### 0. Phân loại
- `riskClass`: `architectural`
- `branch`: `wp/005`

### 1. Mục tiêu
Một workflow theo lịch quyết định **có mở tập mới hay không** và **gọi khối nào tiếp theo**,
dựa hoàn toàn trên trạng thái trong repo. Biến "nhịp bằng tốc độ Thesis Engine" từ một câu
văn thành một cơ chế.

### 2. Input
`engine/docs/02-decisions.md` D-11, D-12, D-13 · `pipeline/automation-tiers.json` ·
`engine/docs/04-nfr.md` mục ba mốc chi phí · `engine/docs/12-success-criteria.md`

### 2b. Checkpoint trước khi bắt đầu
- WP-044 `done` (có dữ liệu đo) hoặc đang ở Mốc 7
- `pipeline/runs.jsonl` có dữ liệu của ít nhất 5 tập
- `automation-tiers.json` tồn tại và validate được

### 3. Output
- `.github/workflows/orchestrator.yml` — theo lịch và `workflow_dispatch`
- `engine/ops/orchestrator/policy.ts` — đọc các biến chính sách, trả quyết định
- `engine/ops/orchestrator/cost-rollup.ts` — cộng dồn `costUsd` và `runnerMinutes`
- `pipeline/orchestrator-log.jsonl` — mỗi lần chạy một dòng: quyết định gì, vì sao

### 3b. Sáu biến quyết định "có mở tập mới không"
Mở tập mới **chỉ khi tất cả** đều đúng:

| # | Biến | Nguồn |
|---|---|---|
| 1 | Thesis Bank `available` ≥ sàn | Đếm trong `thesis-bank/` |
| 2 | Chỉ số biến thiên không ở trạng thái `block` | Cửa sổ 10 tập gần nhất |
| 3 | Chi phí tháng chưa chạm `pauseIntakeUsd` | `cost-rollup` |
| 4 | Chi phí tích luỹ chưa chạm `stopAndReviewUsd` | `cost-rollup` |
| 5 | FPY của stage kém nhất ≥ sàn báo động | `runs.jsonl` |
| 6 | Số tập đang chạy < giới hạn WIP | Đếm `episode-state` có `stageStatus` đang chạy |

Không đủ điều kiện → **không mở tập mới**, mở issue nêu đúng biến nào chặn. Tập đang chạy
**không bao giờ** bị dừng vì chi phí.

### 3c. Ba việc khác
1. **Gọi khối tiếp theo** bằng `workflow_dispatch` theo D-12, dựa trên `stageStatus` của
   từng tập.
2. **Áp bậc tự động hoá**: đọc `automation-tiers.json`; bậc 1 chỉ ghi `decisionShadow`; bậc 2
   mở issue có cửa sổ phủ quyết 12 giờ rồi thực thi; bậc 3 thực thi ngay và đánh dấu 1/10
   tập cho kiểm mẫu.
3. **Cảnh báo**: mở issue khi chạm `warnUsd`, khi FPY tụt, khi bank dưới sàn, khi tỷ lệ duyệt
   gate đúng hạn tụt.

### 4. Phạm vi cho phép
`.github/workflows/orchestrator.yml` · `engine/ops/orchestrator/**` ·
`pipeline/orchestrator-log.jsonl`

### 5. Ràng buộc
- **Không giết job đang chạy vì chi phí.** Chỉ chặn ở cửa vào. Xem D-13.
- Mọi biến chính sách đọc từ `04-nfr.md` và `automation-tiers.json`, **không hardcode**.
- `concurrency: group=orchestrator, cancel-in-progress: true`.
- **Không tự NÂNG bậc.** Nâng bậc là một PR do người duyệt.
- **Được phép tự HẠ bậc** khi lỗi lọt vượt ngưỡng trong `promotionRule.demotionRule`. Đây là
  ngoại lệ duy nhất của luật "chỉ người ghi `automation-tiers.json`", và nó chỉ đi một chiều.
  Mỗi lần hạ ghi một dòng `orchestrator-log.jsonl` với `action: "demote-tier"` và mở issue.

### 5b. Điều kiện dừng
- Một biến ở mục 3b không tính được từ dữ liệu có sẵn → dừng, nêu biến nào
- Cần **nâng** bậc trong `automation-tiers.json` → dừng, đó là việc của người. Hạ bậc thì được, theo mục 5

### 6. Acceptance test
1. Dữ liệu giả với bank dưới sàn → **không** mở tập mới, issue nêu đúng biến 1.
2. Dữ liệu giả với chi phí vượt `pauseIntakeUsd` → không mở tập mới, nhưng tập đang chạy vẫn
   được gọi tiếp.
3. Bậc 1 cho `gate2` → chỉ ghi `decisionShadow`, không thực thi.
4. Bậc 2 → mở issue phủ quyết, không thực thi ngay.
5. **Kiểm âm 1:** thử **nâng** bậc trong `automation-tiers.json` → bị chặn.
6. Lỗi lọt vượt ngưỡng → tự hạ một bậc, ghi log và mở issue.
7. **Khởi động lạnh:** chưa có dữ liệu FPY hay chi phí → orchestrator **không** mở tập mới và
   nêu đúng biến thiếu dữ liệu, không suy "không có dữ liệu xấu nghĩa là tốt".

### 7. Definition of Done
Theo `definition-of-done.md`, cộng: một lần chạy thật ghi vào `orchestrator-log.jsonl` với
đủ sáu biến và lý do quyết định.
