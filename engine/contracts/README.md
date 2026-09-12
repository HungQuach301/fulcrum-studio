# Contracts

Mọi artifact có một schema. Không stage nào được viết trước khi contract của nó tồn tại.

**Agent bị cấm sửa bất cứ file nào trong thư mục này.** Thay đổi chỉ qua: một mục mới trong
`engine/docs/02-decisions.md`, nhãn `[contract-change]` trong commit, và CI kiểm cả hai.

## Hai tầng kiểm

| Tầng | Kiểm gì | Ở đâu |
|---|---|---|
| 1 · Cấu trúc | Trường nào bắt buộc, kiểu gì, quan hệ ra sao | Schema trong thư mục này |
| 2 · Khoảng số | Số beat, số scene, số từ, thời lượng, ngưỡng | `scripts/validate.ts` đối chiếu với `genres/{genre}/format-spec.json` mục `limits` |

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

## Quy ước chung

- Mọi schema dùng `additionalProperties: false`.
- **Không enum và không khoảng số cho hằng số nội dung.** Pillar, archetype, tên layout,
  khuôn tiêu đề, số beat, số scene, số từ là hằng số nội dung — schema khai kiểu, validator
  đối chiếu với Genre Pack hoặc Channel Pack.
- Mọi ID theo lược đồ ở quyết định D-06.
