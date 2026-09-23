## WP-007 · Dọn dẹp

### 0. Phân loại
- `riskClass`: `architectural`
- `branch`: `wp/007`

### 1. Mục tiêu
Gỡ bộ máy bằng chứng tự chế khỏi repo và đưa CI về đúng đặc tả WP-001, để các work package
sau có nền sạch.

### 2. Input
`PROJECT.md` · `AGENTS.md` · `engine/ops/guardrails.md` · `engine/ops/operating-rules.md` ·
`engine/ops/work-packages/WP-001-ci-guardrails.md` mục 3 và 3b ·
`engine/docs/02-decisions.md` mục D-29

### 2b. Checkpoint trước khi bắt đầu
PR-A đã merge; `engine/ops/operating-rules.md` tồn tại trên main; guardrail 28 có trong
`engine/ops/guardrails.md`; main SHA khớp giá trị khai lúc giao task.

### 3. Output

Theo D-30, WP-007 tách thành hai PR: PR tài liệu có nhãn `[wp-change]` chỉ sửa file WP
này và `engine/docs/02-decisions.md`; sau khi PR tài liệu được merge mới thực hiện PR
cleanup theo phạm vi đã có trên main. PR tài liệu giữ đầy đủ D-22 đến D-27 và chưa thực
hiện các thay đổi runtime bên dưới.

**XOÁ:** `engine/io/evidence-transfer.py`, `evidence-transfer.test.py`,
`scripts/wp002-preflight.py`, `engine/io/wp002-integration.ts` và test,
`WP-002-evidence-recovery.md`, `.github/workflows/recover-fs24-evidence.yml`,
`review-wp000-spec.yml`, hai thư mục `episodes/us-personal-finance/2026-09-fs24-*`.

**VIẾT LẠI:** `ci.yml` theo đúng mục 3 và 3b của WP-001 — bốn job, không `FS_GRANT`, không
`inputs.request_id`, không biến `FS24_*`, chỉ `actions/setup-node@v4` với node 20, kích
hoạt trên push mọi nhánh và pull_request, dưới 8 KB. `acceptance-wp002.yml` viết lại dưới
WP-002a/002b, dưới 8 KB.

**GIỮ VÀ SỬA:** `engine/io/github-git.ts`, `engine/io/github-git.test.ts`,
`engine/io/github-transport.ts`, `engine/io/github-writer.ts`. Gỡ phụ thuộc FS24 để xoá
`engine/io/wp002-integration.ts` và `engine/io/wp002-integration.test.ts` mà không làm
hỏng biên dịch. Sửa `.github/workflows/commit-artifacts.yml` và
`.github/workflows/reindex.yml` để bỏ các lời gọi tới file bị xoá, theo D-15 và WP-002b.

**GIỮ NGUYÊN:** `.github/workflows/acceptance-wp000.yml` và
`scripts/acceptance-wp000.ts` trong WP-007.

**DỌN:** chạy lại reindex, xác nhận `state.json` không còn `fs24`; xoá 50 dòng
`runs.jsonl`.

**TÁCH QUYẾT ĐỊNH TRONG PR CLEANUP:** giữ D-01 đến D-30; chuyển D-22 đến D-27 sang
`engine/docs/decisions/archive-fs2x.md`, để lại một dòng mỗi quyết định.

**THÊM QUYẾT ĐỊNH:** viết D-28 vào `engine/docs/02-decisions.md`, đặt ngay sau D-27 và
trước D-29. Thêm D-30 ghi nhận điều chỉnh phạm vi, hai nhóm giữ lại và việc tách hai PR.
Hai quyết định được thêm trong PR tài liệu; không sửa D-29.

**CẬP NHẬT TRONG PR CLEANUP:** thêm vào mục 1 của `engine/ops/operating-rules.md`, sau
đoạn nói về tsx, đúng đoạn VIỆC 0c đã giao:

> Cách chạy validate tại container đã kiểm chứng: biên dịch bằng tsc với --noEmit false rồi
> chạy bằng node với NODE_PATH trỏ tới thư mục output. Ba cách dùng tsx đều lỗi listen EPERM.

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
- `.github/workflows/commit-artifacts.yml`
- `.github/workflows/reindex.yml`
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
- `engine/io/github-git.test.ts` — xếp cùng nhóm QUYẾT ĐỊNH TRƯỚC KHI XOÁ với
  `engine/io/github-git.ts`, `engine/io/github-transport.ts`, `engine/io/github-writer.ts`.
  Một đồ thị import, một quyết định cho cả bốn file.
- `engine/ops/backlog.md` — WP-007 được sửa đúng một dòng của chính nó.
- `engine/ops/operating-rules.md` — chỉ đoạn VIỆC 0c nêu ở mục 3.

### 5. Ràng buộc

**GIỮ:** 106 file đặc tả, năm file io core, `registry.ts`, `scripts/validate.ts`,
`log-run.ts`, `ci-report.ts`, `scripts/guardrails/**`, `package.json`, lockfile,
`tsconfig.json`.

Theo D-30, giữ bốn file `github-*` và hai workflow `commit-artifacts.yml`, `reindex.yml`,
được sửa đúng nội dung ở mục 3. Cặp `acceptance-wp000.yml` và
`scripts/acceptance-wp000.ts` giữ nguyên. Một quyết định giữ và sửa áp dụng cho cả bốn
file `github-*` theo cùng đồ thị import.

Không thêm `CODEOWNERS`.

### 5b. Điều kiện dừng
Hai mục chờ quyết định về bốn file `github-*` và cặp acceptance-wp000 đã được chủ dự án
chốt theo D-30; thực hiện quyết định giữ/sửa ở mục 3 và 5.

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
4. Không còn file `engine/ops/work-packages/WP-002-evidence-recovery.md`, và mọi file
   khớp `WP-002*` chỉ gồm `WP-002a-interfaces.md` và `WP-002b-write-queue.md`.
5. Không còn file `.py`.
6. Không còn đường dẫn chứa `fs24`.
7. `state.json` có `episodes` rỗng.
8. `runs.jsonl` rỗng.

### 7. Definition of Done
Theo `engine/ops/definition-of-done.md`.

### 8. Định dạng báo cáo
1. Đã làm gì · 2. Đã kiểm thế nào (dán kết quả thật) · 3. File đã chạm · 4. Rủi ro còn lại và
chi phí đã tiêu · 5. Checkpoint cuối (nhánh, SHA, link PR)
