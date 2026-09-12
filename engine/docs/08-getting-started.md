# Bắt đầu

## Nếu bạn là chủ dự án

1. Đọc `PROJECT.md` — 5 phút.
2. Đọc `engine/docs/14-quantitative-core.md` — đây là phần khác biệt nhất và quan trọng
   nhất của dự án — 15 phút.
3. Đọc `engine/ops/backlog.md` để biết việc tiếp theo.
4. Chạy task kiểm năng lực công cụ trước khi làm bất cứ gì khác.

## Nếu bạn là agent

Đọc theo thứ tự bắt buộc trong `AGENTS.md`. Không đề xuất gì trước khi đọc xong.

## Bản đồ tài liệu

| Cần biết | Đọc file |
|---|---|
| Dự án làm gì, không làm gì | `PROJECT.md` |
| Vì sao kiến trúc như vậy | `engine/docs/02-decisions.md` |
| Pipeline chạy thế nào | `engine/docs/10-production-spec.md` |
| Chất lượng được kiểm ra sao | `engine/docs/11-quality-gates.md` |
| Thế nào là thành công, khi nào thì dừng | `engine/docs/12-success-criteria.md` |
| Phần khác biệt của dự án | `engine/docs/14-quantitative-core.md` |
| Luật cho agent | `engine/ops/guardrails.md` |
| Việc tiếp theo | `engine/ops/backlog.md` |
| Vận hành hằng ngày | `engine/docs/05-runbook.md` |
| Kênh nói giọng gì | `channels/us-personal-finance/persona.md` |
| Định dạng tập | `genres/data-explainer/format-spec.json` |

## Ba câu hỏi hay bị nhầm

**Vì sao không dùng database?** Vì repo cho audit trail và versioning miễn phí, và vì mô
hình một repo mỗi khách là đường thoát tự nhiên nếu bán cho tổ chức.

**Vì sao gate người lại ít việc thế?** Vì người quyết định, máy sản xuất. Nếu một gate cần
người viết gì đó, thiết kế đã sai — xem quyết định D-08.

**Vì sao lõi định lượng lại quan trọng hơn xưởng hình?** Vì video đẹp thì nhiều nơi làm
được. Bản đồ đáp án theo tham số kèm mô hình công khai thì không.
