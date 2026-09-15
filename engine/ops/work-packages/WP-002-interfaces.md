## WP-002 · Interface state store và interface provider

### 1. Mục tiêu
Triển khai hai interface đã khai ở WP-000, với một triển khai duy nhất dựa trên repo. Đây là
thứ cho phép đổi nơi lưu trạng thái sau này mà không viết lại stage.

### 2. Input
`engine/docs/01-architecture.md` mục Mô hình đồng thời · `engine/docs/02-decisions.md` D-07 ·
`engine/contracts/episode-state.schema.json` · `engine/contracts/run-log.schema.json`

### 2b. Checkpoint trước khi bắt đầu
- WP-001 ở trạng thái `done`, bốn job CI xanh trên `main`

### 3. Output
- `engine/io/repo-store.ts` — triển khai interface trên repo
- `engine/io/episode-state.ts` — đọc/ghi trạng thái tập, validate trước khi ghi
- `engine/io/run-log.ts` — append với retry-with-rebase tối đa 5 lần
- `engine/providers/registry.ts` — đăng ký provider theo tên, đọc tên từ Genre/Channel Pack
- `.github/workflows/reindex.yml` — xây lại `pipeline/state.json` từ các file trạng thái tập

### 3d. Hàng đợi ghi — triển khai D-15

Mọi ghi vào repo đi qua `commit-artifacts.yml` với `concurrency: group=repo-write,
cancel-in-progress: false`. Stage sinh artifact, upload làm Actions artifact, rồi **gọi**
workflow này bằng `workflow_dispatch` với `episodeId`, danh sách file và một `writeId` duy
nhất.

Workflow: fetch `main` → áp thay đổi lên SHA mới nhất → commit → push. Xung đột thì fetch và
thử lại, tối đa 5 lần, backoff tăng dần.

Áp thay đổi theo loại: file thuộc một tập **ghi đè trọn file**; log **nối thêm dòng**;
`pipeline/state.json` không ai ghi.

Trước khi commit, kiểm `writeId` đã có trong lịch sử chưa. Có rồi thì đây là lần gọi lặp —
bỏ qua và trả thành công. Đây là cơ chế khử trùng cho job bị huỷ sau khi đã ghi.

### 4. Phạm vi cho phép
`engine/io/**` · `engine/providers/**` · `.github/workflows/reindex.yml` ·
`.github/workflows/acceptance-wp002.yml` · `.github/workflows/commit-artifacts.yml` ·
`pipeline/state.json` · một dòng của chính WP này trong `engine/ops/backlog.md`

### 5. Ràng buộc
- **Không stage nào được ghi trực tiếp vào `pipeline/state.json`.** Chỉ `reindex.yml` ghi.
- `reindex.yml` dùng `concurrency: group=reindex, cancel-in-progress: true`.
- Registry không được chứa tên provider cụ thể — đọc từ cấu hình.
- Không thêm dependency.

### 5b. Điều kiện dừng
- Cần ghi `pipeline/state.json` từ một nơi khác `reindex.yml` — dừng, nêu lý do
- Cần chạm file ngoài phạm vi

### 6. Acceptance test
1. Hai job **cùng xuất phát từ một `main` SHA** ghi hai tập khác nhau → cả hai vào được, không
   job nào mất thay đổi. Đây là ca mà tách thư mục **không** giải quyết được.
2. Hai job ghi **cùng một tập** → tuần tự hoá, job sau thấy trạng thái của job trước.
3. Cùng một `writeId` gọi hai lần → chỉ một commit, lần hai trả thành công mà không ghi gì.
4. Job bị huỷ **sau khi** commit-artifacts đã push → chạy lại với cùng `writeId` không tạo
   commit trùng.
5. Ghi artifact thành công nhưng ghi trạng thái thất bại → trạng thái còn dở được phát hiện
   ở lần đọc sau, không bị coi là hoàn tất.
6. Ghi trạng thái cho hai tập giả **song song** trong hai job → cả hai thành công, không mất
   dữ liệu.
2. Append 50 dòng nhật ký từ hai job song song → đủ 50 dòng, không mất dòng nào.
3. `reindex.yml` xây lại chỉ mục đúng từ hai file trạng thái.
4. **Kiểm âm:** ghi một trạng thái tập không hợp lệ theo schema → bị từ chối trước khi ghi.

### 7. Definition of Done
Theo `definition-of-done.md` mục 1–12.



### 8. FS24-B — owner-approved integration grant (D-24)

The owner approved the whole section 4 of the pinned review (libfile_27065ac143888191b0192f68aa6f00de; SHA256 2b9fba1343ac366f5e8ca5fa0140e26a989a6a2cfd3e23409b662e627935cd8b). For this grant only, the exact scope below augments section 4. D-24 supplies all counters, immutable source mappings, bootstrap exception and operational gates. Preserve every existing acceptance case. Policy must precede implementation and freeze. WP002 remains todo; the conditional bootstrap merge is not full WP acceptance.



| # | Đường dẫn | Mục đích |
|---|---|---|
| 1 | `engine/docs/02-decisions.md` | Nối D-24 cho B, bảo toàn D01–D23 |
| 2 | `engine/ops/work-packages/WP-002-interfaces.md` | Nối scope/grant/nguồn giả và ngoại lệ bootstrap B; không bỏ A1–A9 |
| 3 | `.github/workflows/ci.yml` | Bootstrap pin, CI final qua dispatch, source mapping fixture, đủ bốn job |
| 4 | `scripts/guardrails/index.ts` | Ngoại lệ B hẹp theo policy commit pin, giữ scan production |
| 5 | `scripts/guardrails/scope.ts` | Context explicit của final validation dispatch, không giả nhãn push |
| 6 | `scripts/guardrails/guardrails.test.ts` | Hồi quy bootstrap/dispatch và ca âm scope/policy |
| 7 | `.github/workflows/acceptance-wp002.yml` | Prequalification PR/push và controller main sau CI |
| 8 | `engine/io/repo-store.ts` | Sửa F1; primitive batch validate/apply chung nếu cần, không phá API cũ |
| 9 | `engine/io/repo-store.test.ts` | Sửa ID fixture, regression F1/batch/pending projection |
| 10 | `engine/io/github-transport.ts` | Transport GitHub có request/receipt binding |
| 11 | `engine/io/github-writer.ts` | Main backend, atomic file-list, append batch, replay/CAS/read-back |
| 12 | `engine/io/wp002-integration.ts` | Điều phối test/artifact/dispatch/evidence, không chứa hằng số nội dung pack |
| 13 | `engine/io/wp002-integration.test.ts` | Kiểm lỗi transport/batch/admission bằng fixtures |
| 14 | `.github/workflows/commit-artifacts.yml` | workflow_dispatch, writer hẹp |
| 15 | `.github/workflows/reindex.yml` | workflow_dispatch, only-index writer |
| 16 | `episodes/us-personal-finance/2026-09-fs24-left/00-brief.json` | Runtime fixture left |
| 17 | `episodes/us-personal-finance/2026-09-fs24-left/state.json` | Runtime fixture left |
| 18 | `episodes/us-personal-finance/2026-09-fs24-right/00-brief.json` | Runtime fixture right |
| 19 | `episodes/us-personal-finance/2026-09-fs24-right/state.json` | Runtime fixture right |
| 20 | `pipeline/runs.jsonl` | Append 50 record test, không sửa dòng cũ |
| 21 | `pipeline/state.json` | Reindex duy nhất, từ state thật ở SHA đã chốt |



### 9. FS24-B-R1 — diagnostic repair scope (D-25)

Effective only when the owner approves the pinned R1 package. Keep sections 1–8 and A1–A9 unchanged; neither a repair merge nor successful diagnosis completes WP002. D-25 defines P1, repair lineage, counters, runtime, read-only diagnosis and the no-data activation boundary.

- `engine/docs/02-decisions.md`
- `engine/ops/work-packages/WP-002-interfaces.md`
- `.github/workflows/ci.yml`
- `scripts/guardrails/index.ts`
- `.github/workflows/acceptance-wp002.yml`
- `engine/io/github-transport.ts`
- `engine/io/github-writer.ts`
- `engine/io/wp002-integration.test.ts`
- `engine/io/wp002-integration.ts`

Policy paths are the first two entries, append-only and frozen after P1. The remaining seven are implementation/fix scope. No runtime data paths, writer/reindex workflow edits, dependency/contracts/settings/provider changes or backlog edits are authorized by R1. The nine-file repair cannot activate A1–A9: commit-artifacts.yml and reindex.yml still bind PR12/S. A subsequent explicit two-entrypoint delta and new integration grant must address that dependency; no alternate writer is permitted.


### 10. FS24-C — proposed successor scope (D-26)

Only after owner approval of the pinned offline package, D-26 authorizes one policy Q with sole parent 6d0c5abeb493699ef649f49860b370ab76c55869, followed by at most three linear implementation commits. Freeze both policy blobs after Q. Preserve sections 1–9 and every A1–A9 case. WP002 stays todo. A new PR is required; never call Ready/merge PR12 or PR13 again.

Exact policy/code paths:

- `engine/docs/02-decisions.md`
- `engine/ops/work-packages/WP-002-interfaces.md`
- `.github/workflows/ci.yml`
- `scripts/guardrails/index.ts`
- `scripts/guardrails/guardrails.test.ts`
- `.github/workflows/acceptance-wp002.yml`
- `engine/io/github-transport.ts`
- `engine/io/github-writer.ts`
- `engine/io/wp002-integration.ts`
- `engine/io/wp002-integration.test.ts`
- `.github/workflows/commit-artifacts.yml`
- `.github/workflows/reindex.yml`

Runtime paths, only after the new merge and admission:

- `episodes/us-personal-finance/2026-09-fs24-left/00-brief.json`
- `episodes/us-personal-finance/2026-09-fs24-left/state.json`
- `episodes/us-personal-finance/2026-09-fs24-right/00-brief.json`
- `episodes/us-personal-finance/2026-09-fs24-right/state.json`
- `pipeline/runs.jsonl` — append 50 synthetic records
- `pipeline/state.json` — only reindex

Both fixture mappings remain bd7f0eb5b225ed43d610af12b5febbe82a7dbec4. Caps: 34 active workflows / 120 job records in active workflows / 12 skipped workflow records; one batch, 13 dispatches, one self-cancel after push, nine data commits, eight new artifacts and seventeen role-bound ZIP receives. Proposed reserve20USD and runtime/reduced guarantees require new approval. No project execution at Codex, provider/settings/credential/dependency changes, rollback, rerun, retry403, historic artifact recovery, deadlines or silence STOP. See D-26 for all gates and exceptions.


### 11. FS24-D — owner-approved complete repair and acceptance scope (D-27)

Owner approved the pinned FS24-D report sections 3–11; D-27 incorporates the normative specification. Preserve sections 1–10 and A1–A9. One P appends four policy paths and freezes; up to five candidate publication rounds, at most three technical PRs and one owner-conditioned one-line backlog closure PR. No code commit count limit separate from event/resource accounting.

Allowed policy/code paths (change only those needed):

- `engine/docs/02-decisions.md`
- `engine/ops/work-packages/WP-002-interfaces.md`
- `AGENTS.md`
- `engine/ops/guardrails.md`
- `.github/workflows/ci.yml`
- `.github/workflows/acceptance-wp002.yml`
- `.github/workflows/commit-artifacts.yml`
- `.github/workflows/reindex.yml`
- `scripts/guardrails/index.ts`
- `scripts/guardrails/guardrails.test.ts`
- `engine/io/github-transport.ts`
- `engine/io/github-writer.ts`
- `engine/io/wp002-integration.ts`
- `engine/io/wp002-integration.test.ts`
- `scripts/wp002-preflight.py`
- `engine/io/github-git.ts`
- `engine/io/github-git.test.ts`
- `engine/io/repo-store.ts`
- `engine/io/repo-store.test.ts`
- `engine/io/episode-state.ts`
- `engine/io/run-log.ts`
- `engine/io/reindex.ts`
- `scripts/guardrails/scope.ts`
- `scripts/ci-report.ts`

Runtime only after admitted activation: the same four synthetic episode brief/state paths for 2026-09-fs24-left/right plus pipeline/runs.jsonl (append exactly50) and pipeline/state.json (only reindex); both source mappings remain bd7f0eb5b225ed43d610af12b5febbe82a7dbec4. Nine data commits across all code epochs. One logical batch, at most three controller runs, 24 dispatches, one self-cancel,16 artifact objects/31 role-bound ZIP receives with seven-day retention. Cap72 active/288 job records in active/36 skipped workflow records, reserve60USD with D-27 reduced guarantees. Historical counters/pins do not reset.

The only additional path is one WP-002 backlog line after owner reads and accepts the final checkpoint per D-27 section10; no closure write is authorized before that condition. Unchanged contracts/dependencies/settings/credentials/providers, no rollback/rerun/retry403/old batch replay/deadline/silence STOP. Same-grant fixes and recovery within D-27 do not need repeated owner permission; external checkpoint drift or actual scope/risk/budget extension must be reported.
