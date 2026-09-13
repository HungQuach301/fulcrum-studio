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

## Quy ước chung

- Mọi schema dùng `additionalProperties: false`.
- **Không enum và không khoảng số cho hằng số nội dung.** Pillar, archetype, tên layout,
  khuôn tiêu đề, số beat, số scene, số từ là hằng số nội dung — schema khai kiểu, validator
  đối chiếu với Genre Pack hoặc Channel Pack.
- Mọi ID theo lược đồ ở quyết định D-06.
