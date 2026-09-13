# Contracts

Mọi artifact có một schema. Không stage nào được viết trước khi contract của nó tồn tại.

**Agent bị cấm sửa bất cứ file nào trong thư mục này.** Thay đổi chỉ qua: một mục mới trong
`engine/docs/02-decisions.md`, nhãn `[contract-change]` trong commit, và CI kiểm cả hai.

## Hai tầng kiểm

| Tầng | Kiểm gì | Ở đâu |
|---|---|---|
| 1 · Cấu trúc | Trường nào bắt buộc, kiểu gì, quan hệ ra sao | Schema trong thư mục này |
| 2 · Khoảng số và quan hệ | Số beat, số scene, số từ, thời lượng, ngưỡng; quan hệ D-19/D-20 | `scripts/validate.ts` đối chiếu Genre/Channel Pack và artifact tham chiếu; xem WP-000 và D-21 |

Khoảng số **không** nằm trong schema. Nếu nằm trong schema, thể loại thứ hai không tồn tại
được và thí nghiệm độ dài ở WP-061 không chạy được.

## Ánh xạ artifact ↔ schema

| Artifact | Schema |
|---|---|
| `signals.json` | `signals.schema.json` |
| `topics.ranked.json` | `topics.schema.json` |
| `00-brief.json` | `brief.schema.json` |
| `01-sources.json` | `sources.schema.json` |
| `02-factcheck.json` | `factcheck.schema.json` |
| `03-sensitivity.json` | `sensitivity.schema.json` |
| `04-outline.json` | `outline.schema.json` |
| `05-script.md` (front-matter) | `script.schema.json` |
| `06-canvas-map.json` | `canvas-map.schema.json` |
| `07-storyboard.json` | `storyboard.schema.json` |
| `08-preflight.json` | `preflight.schema.json` |
| `09-timing.json` | `timing.schema.json` |
| `11-proof.json` | `proof.schema.json` |
| `12-render-manifest.json` | `render-manifest.schema.json` |
| `13-qa.json` | `qa-report.schema.json` |
| `14-package.json` | `package.schema.json` |
| `15-publication.json` | `publication.schema.json` |
| `16-metrics.json` | `metrics.schema.json` |
| `state.json` mỗi tập | `episode-state.schema.json` |
| `pipeline/runs.jsonl` mỗi dòng | `run-log.schema.json` |
| `data/snapshots/.../*.json` | `snapshot.schema.json` |
| `models/.../M-NNN.json` | `model.schema.json` |
| Mục trong thesis bank | `thesis.schema.json` |
| `genres/*/format-spec.json` | `format-spec.schema.json` |
| `genres/*/layouts.json` | `layouts.schema.json` |
| `channels/*/channel.json` | `channel.schema.json` |
| `channels/*/visual-tokens.json` | `visual-tokens.schema.json` |
| `channels/*/data-series.json` | `data-series.schema.json` |
| `genres/*/asset-policy.json` | `asset-policy.schema.json` |
| `config/publish-allowlist.json` | `publish-allowlist.schema.json` |
| `pipeline/state.json` | `pipeline-state.schema.json` |
| `pipeline/automation-tiers.json` | `automation-tiers.schema.json` |
| `pipeline/orchestrator-log.jsonl` mỗi dòng | `orchestrator-log.schema.json` |
| Ảnh chụp corpus đối thủ | `corpus.schema.json` |
| Kết quả kiểm mới lạ | `novelty-check.schema.json` |
| Ledger giấy phép asset mỗi tập | `license-ledger.schema.json` |
| Analyst's Note | `analyst-note.schema.json` |
| Chỉ số biến thiên cấp kênh | `variation-index.schema.json` |

Vị trí của `signals.json` và `topics.ranked.json`: `/pipeline/{channel-slug}/`, vì chúng ở
cấp kênh chứ không thuộc một tập nào.

## Danh mục kiểm WP-000 (D-21)

Mọi JSON được theo dõi tại commit kiểm phải thuộc đúng một nhóm dưới đây. Fixture được
truyền rõ vào harness ở vùng tạm riêng; dependency tải về và báo cáo sinh ra không là
dữ liệu nguồn. Không đọc được file, không phân loại được hoặc ánh xạ mơ hồ thì fail.

| Nhóm | File | Kiểm bắt buộc |
|---|---|---|
| Schema | `engine/contracts/*.schema.json` | Cú pháp JSON, meta-schema draft-07 và biên dịch Ajv |
| Artifact/cấu hình miền | Các JSON theo bảng ánh xạ trên, gồm pipeline-state và publish-allowlist | Contract tầng 1; tầng 2 khi áp dụng |
| JSON công cụ | Đúng `package.json`, `package-lock.json`, `tsconfig.json` ở gốc | Cú pháp JSON, cấu hình đã chốt; npm kiểm khớp manifest–lockfile, TypeScript kiểm cấu hình/kiểu |

`package.schema.json` thuộc `14-package.json` của tập, không thuộc manifest npm.
JSONL kiểm từng dòng; front-matter `05-script.md` kiểm bằng `script.schema.json`.
Báo cáo tách các nhóm, số dòng/front-matter và fixture; nhóm rỗng ghi 0, không suy ra
kiểm miền đã đạt. Parse JSON công cụ không thay kết quả npm/TypeScript trong Actions.

Không bỏ `pipeline/state.json` khi nó sai schema; giữ phân loại D cho tới khi có bản
chuẩn hóa được duyệt riêng theo D-21. Validator chỉ đọc, không tự sửa data/schema,
không ép kiểu, điền mặc định hoặc xóa trường thừa để đạt.
Schema allowlist chỉ kiểm cấu trúc; cấu hình chính sách, quyền truy cập và kiểm thực thi
xuất bản theo D-16 vẫn phải được chứng minh ở công việc tương ứng.

## Nguồn bộ phiên bản — D-21 mục 5, giữ D-19/D-20

`C` là commit nguồn đầy đủ được duyệt trước khi bắt đầu tập. Đọc channel tại `C` từ
kênh trong episodeId, lấy genre từ channel đó, rồi đọc format-spec tại cùng `C`.

| Trường | Định danh nguồn |
|---|---|
| `versions.engine` | `<channel.engineVersion>@git-commit:<C>` |
| `versions.genre` | `<format-spec.version>@git-tree:<tree của toàn Genre Pack tại C>` |
| `versions.channel` | `git-tree:<tree của toàn Channel Pack tại C>` |

SHA đủ 40 ký tự hex thường, nhãn không rỗng. Tầng 2 dựng bộ mong đợi từ nguồn rồi so
nguyên chuỗi; brief và episode-state phải đủ bộ ba, cùng tập/kênh và khớp nhau.
17 nhóm artifact của D-19/D-20 giữ versions tuỳ chọn và kế thừa qua episodeId;
có khai thì phải khớp nguồn đã đóng băng, không ghi bộ kế thừa ngược vào artifact.
Nhãn đứng riêng, visual-tokens.version và phiên bản thành phần không thay pin pack.
Thiếu commit/nhãn/pack, ánh xạ tập thiếu/trùng hoặc lệch thì fail; không lấy HEAD hiện
tại, tự fetch lịch sử hoặc sửa cấu hình/schema để ép khớp. Nguồn sản xuất phải được duyệt
riêng; pin tài liệu Mốc 0 không nghiệm thu Engine. Schema chỉ nhận kiểu string hiện có;
định danh nguồn và quan hệ thuộc tầng 2, không thêm trường hoặc regex vào schema.

## CI của PR đặc tả #9 — D-21 mục 7

Workflow `review-wp000-spec.yml` có phạm vi/nguồn pin và quyền chạy riêng. Nó kiểm
38 schema bằng meta-schema draft-07 và Ajv, phân loại 46 JSON và kiểm tầng 1 tám file
cấu hình/dữ liệu. Bảy file ngoài state phải đạt; allowlist có fixture đạt, thiếu từng
required, sai kiểu từng trường/phần tử mảng và khóa thừa, kèm keyword/path mong đợi.

State nguyên bản phải giữ blob và bị từ chối đúng bốn lỗi đã biết: thiếu sourceCommit,
rebuiltAt null sai kiểu, thừa engineVersion và aggregates. Ghi `state-current: invalid`,
`realDataAllValid: false`, `wp000Acceptance: blocked`. Ca âm bắt đúng lỗi có thể đạt;
kết quả state vẫn invalid. Cổng này không chứng nhận toàn bộ dữ liệu hợp lệ và không
thay nghĩa vụ chuẩn hóa có phê duyệt riêng trước acceptance WP-000.
Không bỏ file, sửa dữ liệu trong bộ nhớ hoặc nới schema/options. Bất kỳ lỗi ngoài dự
kiến hoặc JSON chưa phân loại đều chặn cổng đặc tả.

Bộ công cụ, toàn bộ SHA/SRI, tùy chọn Ajv và giới hạn một run/attempt được ghi ở D-21
mục 7 và workflow. Tải/cài/helper/report chỉ trong vùng tạm Actions, không tạo tooling
JSON gốc; dữ liệu thử/dependency không được tính là dữ liệu nguồn. Báo cáo tách dữ liệu
thật, fixture, guardrails và nhóm chưa chạy. Tầng 2, fixture WP-000, typecheck và hồi quy
năm brief chưa được thực thi bởi CI đặc tả; kết quả mới không thay bộ 59 fixture PR #5.
Schema allowlist giữ blob `a0de2c89a18bbe20e751dec69e5b508ee1a9efb9` ở lần sửa này.
Cổng vẫn cần nhãn contract-change và quyết định được kiểm bằng máy; không dùng ngoại
lệ CI Mốc 0, không cấp quyền chuẩn hóa state hoặc triển khai/xuất bản.

## Quy ước chung

- Mọi schema dùng `additionalProperties: false`.
- **Không enum và không khoảng số cho hằng số nội dung.** Pillar, archetype, tên layout,
  khuôn tiêu đề, số beat, số scene, số từ là hằng số nội dung — schema khai kiểu, validator
  đối chiếu với Genre Pack hoặc Channel Pack.
- Mọi ID theo lược đồ ở quyết định D-06.
