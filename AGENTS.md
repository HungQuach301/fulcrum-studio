# AGENTS.md

Nội dung file này được đồng bộ vào Project Instructions của agent.

## Thứ tự thẩm quyền — một bảng duy nhất

Khi hai nguồn lệch nhau, nguồn ở trên thắng. Không có ngoại lệ và không có bảng nào khác
trong repo được phép nói khác.

| # | Nguồn |
|---|---|
| 1 | Chỉ dẫn của chủ dự án trong phiên làm việc hiện tại |
| 2 | `engine/docs/02-decisions.md` — quyết định đã phê duyệt, mục sau thay mục trước |
| 3 | `PROJECT.md` |
| 4 | `engine/ops/guardrails.md` |
| 5 | Cấu hình theo miền: `format-spec.json`, `layouts.json`, `channel.json`, `automation-tiers.json` |
| 6 | Contract trong `engine/contracts/` |
| 7 | Tài liệu mô tả và prompt pack |

Project Instructions là **bản sao** của file này, không phải nguồn riêng. Hai bản lệch nhau
là một lỗi cần sửa ngay, không phải một tình huống cần phân xử.

Bộ tài liệu build pack là **nguồn khởi tạo**. Sau khi Mốc 0 đóng, repo là nguồn sự thật; build
pack không còn ghi đè repo đã tiến hoá.

## Thứ tự đọc bắt buộc

1. `PROJECT.md`
2. `AGENTS.md`
3. `engine/ops/guardrails.md`
4. WP hoặc CP được giao
5. Các file liệt kê ở mục Input của WP/CP đó

## Vai trò

Agent là **lớp điều phối và xây dựng**, không phải nơi chứa logic của nhà máy.

Task giao cho agent chỉ được chứa: mục tiêu, checkpoint, phạm vi cho phép, tiêu chí nghiệm
thu, điều kiện dừng, định dạng output. Nếu một task cần chỉ dẫn về *cách quyết định* một
việc, chỉ dẫn đó đang thiếu trong repo — nêu ra và dừng.

## Luồng nhánh và merge

| Việc | Quy tắc |
|---|---|
| Nhánh | Mỗi WP một nhánh `wp/<mã WP>`. Mỗi CP một nhánh `cp/<mã CP>` |
| Commit thẳng `main` | Cấm |
| Kết thúc WP | Mở Pull Request vào `main`, mô tả PR là báo cáo 5 mục |
| Merge | Theo `riskClass` khai trong WP — xem bảng dưới. Mặc định là người merge; tự động chỉ khi `riskClass: mechanical` **và** bậc của `merge-mechanical-wp` trong `automation-tiers.json` ≥2 |
| Gate sản xuất | Gate 1–3 **không bao giờ bị bỏ**. Ai bấm thì phụ thuộc bậc trong `automation-tiers.json`. "Không bỏ gate" và "gate luôn do người bấm" là hai điều khác nhau |
| "`main` SHA thay đổi giữa chừng" | Nghĩa là `main` bị đổi bởi nguồn khác. Commit của chính agent trên nhánh `wp/` không tính |

| `riskClass` | Ví dụ | Ai merge |
|---|---|---|
| `mechanical` | Scaffold, adapter một nguồn, script kiểm, sửa lỗi CI | Tự động khi CI xanh, nếu bậc tự động hoá của merge ≥2 |
| `architectural` | Interface, workflow điều phối, bất cứ thứ gì chạm `02-decisions.md`, `engine/contracts/`, hoặc thêm dependency | **Luôn là người** |

Mặc định khi WP không khai: `architectural`.

## Quy ước làm việc

- **Kiểm checkpoint trước.** Không khớp thì DỪNG và báo cáo, không tự khắc phục.
- **Điều kiện dừng là tuyệt đối.** Gặp thì dừng, không tìm cách đi vòng.
- **Nghiệm thu chạy trong GitHub Actions.** Không tuyên bố test pass mà không có kết quả
  thật. Nếu chạy qua builder trong Actions (WP-004), dán log của lần chạy đó.
- **Đọc `ci-report.txt`** của commit để biết kết quả, không suy đoán từ nội dung code.
- **Mâu thuẫn thì dừng**, nêu chính xác hai chỗ mâu thuẫn, không tự chọn một bên.
- **Ràng buộc chặn thì theo D-14**: dừng, viết ba dòng, chờ duyệt.

## Quy ước code

- TypeScript. Không `any` trừ khi có comment giải thích.
- Mọi stage đọc/ghi artifact qua interface trong `engine/io/`, không gọi thẳng GitHub API.
- Mọi lời gọi provider qua interface trong `engine/providers/`. Lựa chọn provider cụ thể nằm
  ở Genre Pack hoặc Channel Pack.
- Mọi stage ghi một dòng vào `pipeline/runs.jsonl` khi kết thúc, theo `run-log.schema.json`,
  **gồm `costUsd`**.
- Mọi stage validate đầu ra theo contract **trước khi** ghi.
- **Không viết logic dừng-vì-chi-phí** vào stage. Xem D-13.
- Khoảng số của thể loại (số beat, số scene, số từ, thời lượng) **đọc từ**
  `genres/{genre}/format-spec.json` mục `limits`, không hardcode và không nằm trong contract.

## Định dạng báo cáo cuối task

1. **Đã làm gì** — liệt kê hành động, không diễn giải.
2. **Đã kiểm thế nào** — dán kết quả thật.
3. **File đã chạm** — đường dẫn đầy đủ, đối chiếu phạm vi cho phép.
4. **Rủi ro còn lại** — thứ chưa kiểm được, giả định đã dùng, chi phí đã tiêu.
5. **Checkpoint cuối** — tên nhánh, SHA cuối, link PR.
