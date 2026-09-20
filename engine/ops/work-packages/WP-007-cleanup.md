## WP-007 · Dọn dẹp

### 0. Phân loại
- `riskClass`: <CẦN QUYẾT ĐỊNH: `mechanical` hoặc `architectural`>
- `branch`: `wp/007`

### 1. Mục tiêu
<CẦN QUYẾT ĐỊNH: mục tiêu một câu của WP-007>

### 2. Input
<CẦN QUYẾT ĐỊNH: danh sách file agent phải đọc trước khi bắt đầu>

### 2b. Checkpoint trước khi bắt đầu
<CẦN QUYẾT ĐỊNH: trạng thái repo phải đúng trước khi chạy WP-007>

### 3. Output

**XOÁ:** `engine/io/evidence-transfer.py`, `evidence-transfer.test.py`,
`scripts/wp002-preflight.py`, `engine/io/wp002-integration.ts` và test,
`WP-002-evidence-recovery.md`, `.github/workflows/recover-fs24-evidence.yml`,
`review-wp000-spec.yml`, hai thư mục `episodes/us-personal-finance/2026-09-fs24-*`.

**VIẾT LẠI:** `ci.yml` theo đúng mục 3 và 3b của WP-001 — bốn job, không `FS_GRANT`, không
`inputs.request_id`, không biến `FS24_*`, chỉ `actions/setup-node@v4` với node 20, kích
hoạt trên push mọi nhánh và pull_request, dưới 8 KB. `acceptance-wp002.yml` viết lại dưới
WP-002a/002b, dưới 8 KB.

**DỌN:** chạy lại reindex, xác nhận `state.json` không còn `fs24`; xoá 50 dòng
`runs.jsonl`.

**TÁCH QUYẾT ĐỊNH:** giữ D-01 đến D-29; chuyển D-22 đến D-27 sang
`engine/docs/decisions/archive-fs2x.md`, để lại một dòng mỗi quyết định.

**THÊM:** `.github/pull_request_template.md` theo bảy dòng báo cáo. Không thêm
`CODEOWNERS`.

### 4. Phạm vi cho phép
- `engine/io/evidence-transfer.py`
- `engine/io/evidence-transfer.test.py`
- `scripts/wp002-preflight.py`
- `engine/io/wp002-integration.ts`
- `engine/io/wp002-integration.test.ts`
- `engine/ops/work-packages/WP-002-evidence-recovery.md`
- `.github/workflows/recover-fs24-evidence.yml`
- `.github/workflows/review-wp000-spec.yml`
- `episodes/us-personal-finance/2026-09-fs24-left/**`
- `episodes/us-personal-finance/2026-09-fs24-right/**`
- `.github/workflows/ci.yml`
- `.github/workflows/acceptance-wp002.yml`
- `engine/io/github-git.ts`
- `engine/io/github-transport.ts`
- `engine/io/github-writer.ts`
- `.github/workflows/acceptance-wp000.yml`
- `scripts/acceptance-wp000.ts`
- `pipeline/state.json`
- `pipeline/runs.jsonl`
- `engine/docs/02-decisions.md`
- `engine/docs/decisions/archive-fs2x.md`
- `.github/pull_request_template.md`
- <CẦN QUYẾT ĐỊNH: `engine/io/github-git.test.ts` có thuộc cùng quyết định xoá/giữ với ba file `github-*` hay không>
- <CẦN QUYẾT ĐỊNH: có cho phép sửa một dòng WP-007 trong `engine/ops/backlog.md` hay không>

### 5. Ràng buộc

**GIỮ:** 106 file đặc tả, năm file io core, `registry.ts`, `scripts/validate.ts`,
`log-run.ts`, `ci-report.ts`, `scripts/guardrails/**`, `reindex.yml`,
`commit-artifacts.yml`, `package.json`, lockfile, `tsconfig.json`.

Không thêm `CODEOWNERS`.

### 5b. Điều kiện dừng
- **QUYẾT ĐỊNH TRƯỚC KHI XOÁ, báo cáo rồi chờ:** ba file `github-*` theo đồ thị import;
  `acceptance-wp000.yml` và `scripts/acceptance-wp000.ts`.
- `main` bị đổi bởi nguồn khác giữa chừng
- Cần chạm file ngoài "Phạm vi cho phép"
- Cần thêm dependency ngoài danh sách ở mục 5
- Phát hiện mâu thuẫn giữa WP này và `PROJECT.md`, `guardrails.md`, hoặc
  `01-architecture.md`
- Một ràng buộc kiến trúc làm mục tiêu không đạt được → viết ba dòng theo D-14

### 6. Acceptance test
1. `tsc` xanh tại container.
2. Validate xanh.
3. CI bốn job xanh trên một push vào main — bài kiểm chính.
4. Chỉ còn một file khớp `WP-002*`.
5. Không còn file `.py`.
6. Không còn đường dẫn chứa `fs24`.
7. `state.json` có `episodes` rỗng.
8. `runs.jsonl` rỗng.

### 7. Definition of Done
Theo `engine/ops/definition-of-done.md`.

### 8. Định dạng báo cáo
1. Đã làm gì · 2. Đã kiểm thế nào (dán kết quả thật) · 3. File đã chạm · 4. Rủi ro còn lại và
chi phí đã tiêu · 5. Checkpoint cuối (nhánh, SHA, link PR)
