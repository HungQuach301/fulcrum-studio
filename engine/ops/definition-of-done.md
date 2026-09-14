# Definition of Done

Áp cho mọi WP. Không mục nào được bỏ qua vì "lần này nhỏ".

## Bắt buộc với mọi WP

1. **CI xanh trên commit cuối.** Bốn job `validate`, `typecheck`, `guardrails`, `report` đều
   pass. Không có bằng chứng CI thì WP chưa done, bất kể agent nói gì.
   **Ngoại lệ bootstrap WP-000 theo D-21:** khi CI chưa tồn tại (WP-001 mới tạo nó),
   bằng chứng thay thế phải là lần chạy thực tế của `acceptance-wp000.yml` trong Actions,
   trên đúng commit ứng viên cuối. Được dùng `pull_request` vào main từ nhánh cùng repo
   `wp/000` sau phê duyệt triển khai và các lượt tự động; giữ `workflow_dispatch` khi
   workflow có trên main. Không tự dispatch/rerun hoặc coi phê duyệt đặc tả là quyền chạy.
   Workflow bootstrap phải kiểm cả mục 3–6 bằng máy, đọc phạm vi từ WP trên main tại
   SHA baseline đã pin. Báo cáo `ci-report.txt` ghi SHA/tree checkout thực, SHA sự kiện
   nếu khác, run/attempt và kết quả kể cả failure/skipped/cancelled; log dán vào báo cáo.
   Lượt chuẩn bị lockfile hoặc state không thay acceptance. Không có log đúng commit
   thì WP chưa done. Gói chuẩn bị quyết định/đặc tả không được miễn CI bởi đoạn này;
   ngoại lệ CI của PR Mốc 0 không chuyển sang WP-000 hoặc PR mới.
2. **Acceptance test đã chạy trong Actions**, gồm cả bài kiểm âm, kết quả dán vào báo cáo.
3. **Không file nào ngoài "Phạm vi cho phép" bị chạm** — job `guardrails` kiểm tự động.
4. **Không secret trong diff** — job `guardrails` quét, không dựa vào agent tự khai.
5. **Không hằng số nội dung mới trong `/engine`** — job `guardrails` kiểm bằng grep.
6. **Không thay đổi trong `engine/contracts/`** trừ khi có nhãn `[contract-change]` và một
   mục mới trong `02-decisions.md`.
7. **Mọi stage mới ghi nhật ký** theo `run-log.schema.json`.
8. **Chủ dự án đã đọc báo cáo 5 mục** và xác nhận Checkpoint cuối.
9. **`backlog.md` được cập nhật** trạng thái sang `done` trong cùng commit.
   Mọi WP mặc nhiên được phép sửa **đúng một dòng** của chính nó trong `backlog.md`, kể cả
   khi mục "Phạm vi cho phép" không liệt kê file này. Job `guardrails` cho phép ngoại lệ một
   dòng đó và chặn mọi thay đổi khác trong backlog.
   Riêng bootstrap WP-000 theo D-21: dòng `done` trên PR triển khai chỉ là đề nghị.
   Commit ứng viên chứa dòng này cùng code/lockfile phải được Actions kiểm; sau đó
   chủ dự án đọc báo cáo năm mục, xác nhận checkpoint và quyết định merge. Đổi commit
   thì cần bằng chứng mới. PR chỉ chuẩn bị đặc tả giữ nguyên backlog, không đóng WP.

## Bắt buộc với WP có stage mới

10. Contract của artifact tồn tại và stage validate đầu ra **trước khi** ghi.
11. Stage **đo và ghi `costUsd`** vào `pipeline/runs.jsonl` ở mọi nhánh kết thúc, gồm cả
    nhánh lỗi. Stage **không** tự dừng vì chi phí — xem D-13. Điều tiết chi phí nằm ở
    orchestrator, không nằm trong stage.
12. Stage chạy lại được mà không làm hỏng trạng thái.

## Bắt buộc với WP chạm hình ảnh

13. Kiểm hồi quy thị giác chạy. Khác biệt phải được duyệt rõ ràng, không bỏ qua mặc định.

## Cổng riêng của PR đặc tả #9 — D-21 mục 7

PR đặc tả không đóng WP và không áp dụng một dòng backlog done. Nó có cổng Actions riêng
`review-wp000-spec.yml`, sau phê duyệt một lượt cụ thể của chủ dự án, trước khi D-21
lên main. Không gọi đây là bốn job WP đã đạt, không thay acceptance-wp000.yml, không
kế thừa ngoại lệ CI Mốc 0.

Cổng chỉ đạt khi đúng commit ứng viên có parent là
`50e7d39387015858ef9e5985d36ac95a6974ea1b`; main/tree vẫn đúng checkpoint D-21;
delta bốn tài liệu và một workflow, toàn PR sáu file; dữ liệu, cấu hình, schema hiện có,
D-01–D-20, mọi dòng backlog và lịch sử được bảo toàn. Không dùng phạm vi do WP ở head
ứng viên tự sửa. Kiểm nhãn/quyết định, secret và hằng số nội dung có ca âm/đối chứng.

Bắt buộc có kết quả meta-schema/biên dịch 38 schema, phân loại 46 JSON, tầng 1 của tám
file dữ liệu/cấu hình và fixture allowlist như D-21 mục 7. Bảy file ngoài state phải đạt.
State thật giữ blob gốc, vẫn bị từ chối đúng bốn lỗi; báo `state-current: invalid`,
`realDataAllValid: false`, `wp000Acceptance: blocked`. Bắt đúng lỗi trong ca âm không
nghiệm thu state. Lỗi khác, file chưa phân loại hoặc thiếu bước bắt buộc thì fail.

Báo cáo `ci-report.txt` và log phải ghi SHA/tree checkout thực, SHA sự kiện, run/attempt,
công cụ/runner thực tế, từng nhóm kiểm và failure/skipped/cancelled; artifact tối đa
1 MiB giữ một ngày, không cache. Một job tối đa 10 phút, trần 0,10 USD, chỉ run đầu
tiên/attempt 1 đã duyệt. Thiếu bằng chứng thì chưa đạt; không sửa hoặc chạy lại tự động.
Tầng 2, các fixture acceptance WP-000, typecheck, hồi quy năm brief và sản xuất ghi
chưa chạy/chưa nghiệm thu. Source tree không được đổi trong khi kiểm.
Chủ dự án đọc báo cáo năm mục và checkpoint mới rồi giao bước tiếp; CI đạt không cấp
quyền Ready, merge, triển khai, chuẩn hóa state, provider hoặc ngân sách mới.


## Gói phát triển nhanh — D-22

Áp dụng D-22 cho FS22-20260914 khi chủ dự án cấp quyền ghi/CI của gói.
Không đặt deadline task/job/phase hoặc ngưỡng im lặng gây STOP. Cấp quyền gộp
sửa–kiểm–thu kết quả trong đúng tám file và số lượt được duyệt, không xin lại
cho từng lỗi có thể sửa trong phạm vi. Gate lịch sử chỉ chặn phần phụ thuộc;
không dùng thiếu ZIP run7 để chặn kiểm độc lập mới đã có kênh chứng cứ được duyệt.
Tái dùng tính toàn vẹn đã nghiệm thu trên cùng bytes. B1/B2/Node chưa biết vẫn
ghi chưa biết; chỉ ngoại lệ đúng gói do owner duyệt mới cho phép chạy.
Spec CI phải đạt trên quyết định đã commit trước acceptance; giữ kiểm đúng
commit cuối, toàn bộ correctness/ca âm và owner nghiệm thu. Thu đủ byte chứng cứ
qua frame log và đối soát hash, không coi metadata/success là toàn bộ bằng chứng.
D-22 thay riêng các ràng buộc điều phối/scope/counter/ZIP đã nêu; giữ contracts,
secret, dữ liệu, lịch sử và các quyền merge/provider/ngân sách chưa được cấp.


## Gói FS23-WP001 — D-23

Riêng FS23-WP001, giữ bốn job và acceptance chạy thật trên head cuối. Policy S được kiểm cùng candidate trong một PR, không miễn CI cuối. Bằng chứng nguyên văn qua frame log thay artifact ZIP; report ngắn dưới 100 dòng, log/fixture đầy đủ là chứng cứ riêng. Own report/cleanup kết luận bằng metadata/log cuối và receipt nhận. Fixture âm Git tạm trong Actions đáp ứng kiểm reject, không có claim webhook âm. Backlog done vẫn là đề nghị; owner đọc báo cáo năm mục, xác nhận checkpoint trước nghiệm thu. Branch protection chưa có phải ghi rõ, không được coi D-23 là cấu hình bảo vệ đã bật.
