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
