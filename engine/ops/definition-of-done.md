# Definition of Done

Áp cho mọi WP. Không mục nào được bỏ qua vì "lần này nhỏ".

## Bắt buộc với mọi WP

1. **CI xanh trên commit cuối.** Bốn job `validate`, `typecheck`, `guardrails`, `report` đều
   pass. Không có bằng chứng CI thì WP chưa done, bất kể agent nói gì.
   **Ngoại lệ bootstrap:** WP-000 chạy khi CI chưa tồn tại (WP-001 mới tạo nó). Với WP-000,
   bằng chứng thay thế là một lần chạy Actions thủ công của workflow nghiệm thu khai trong
   chính WP đó, log dán vào báo cáo. Không có ngoại lệ nào khác.
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

## Bắt buộc với WP có stage mới

10. Contract của artifact tồn tại và stage validate đầu ra **trước khi** ghi.
11. Stage **đo và ghi `costUsd`** vào `pipeline/runs.jsonl` ở mọi nhánh kết thúc, gồm cả
    nhánh lỗi. Stage **không** tự dừng vì chi phí — xem D-13. Điều tiết chi phí nằm ở
    orchestrator, không nằm trong stage.
12. Stage chạy lại được mà không làm hỏng trạng thái.

## Bắt buộc với WP chạm hình ảnh

13. Kiểm hồi quy thị giác chạy. Khác biệt phải được duyệt rõ ràng, không bỏ qua mặc định.
