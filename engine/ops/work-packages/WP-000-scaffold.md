## WP-000 · Scaffold repo

### 0. Phân loại
- `riskClass`: `architectural`
- `branch`: `wp/000`

### 1. Mục tiêu
Dựng khung TypeScript tối thiểu và một validator **hai tầng** chạy được cho mọi file JSON
trong repo. Không viết logic nghiệp vụ.

### 2. Input
`PROJECT.md` · `AGENTS.md` · `engine/ops/guardrails.md` · `engine/docs/01-architecture.md` ·
`engine/contracts/` toàn bộ, đặc biệt `README.md` mục "Hai tầng kiểm" ·
`genres/data-explainer/format-spec.json`

### 2b. Checkpoint trước khi bắt đầu
- Mốc 0 ở trạng thái `done` trong `backlog.md`
- Chưa có `package.json` ở gốc repo
- `engine/contracts/format-spec.schema.json` tồn tại (nếu không, Phần F chưa nạp đủ)
- Không đúng bất kỳ mục nào: **DỪNG và báo cáo**

### 3. Output
- `package.json`, `tsconfig.json`, `.gitignore`
- `scripts/validate.ts` — validator **hai tầng**, xem mục 3b
- `engine/io/index.ts` — interface đọc/ghi artifact, chưa triển khai thật
- `engine/providers/index.ts` — interface provider, chưa triển khai thật
- `scripts/log-run.ts` — ghi một dòng theo `run-log.schema.json`, **gồm `costUsd`**
- `pipeline/runs.jsonl` rỗng
- Thư mục rỗng có `.gitkeep`: `data/snapshots/`, `models/`, `episodes/`, `pipeline/us-personal-finance/`

### 3b. Validator hai tầng — yêu cầu cốt lõi của WP này

**Tầng 1 — cấu trúc.** Mỗi file JSON được ánh xạ tới một schema theo bảng trong
`engine/contracts/README.md`, validate bằng ajv. Gồm cả bốn file cấu hình mới:
`format-spec.json`, `layouts.json`, `channel.json`, `visual-tokens.json`.

**Tầng 2 — khoảng số.** Sau khi tầng 1 pass, đối chiếu artifact với
`genres/{genre}/format-spec.json` mục `limits`. Genre lấy từ `channel.json` của kênh trong
`episodeId`. Tối thiểu phải kiểm:

| Artifact | Trường | Đối chiếu với |
|---|---|---|
| `00-brief.json` | `targetDurationMin` | `limits.targetDurationMin` |
| `00-brief.json` | `thesisArchetype` | `format-spec.thesisArchetypes` |
| `00-brief.json` | `pillar` | `channel.pillars` |
| `04-outline.json` | số phần tử `beats` | `limits.beatCount` |
| `05-script.md` | `wordCount`, số `devicesUsed`, số `lexiconUsed` | `limits.scriptWordCount`, `devicesMin`, `lexiconMin` |
| `06-canvas-map.json` | số `regions` | `limits.canvasRegionCount` |
| `07-storyboard.json` | số `scenes`, `durationMs` nhỏ nhất, `fps`, `layout` | `limits.sceneCount`, `sceneMinDurationMs`, `fpsAllowed`, `layouts.json` |
| `11-proof.json` | số `stills`, `sampledFrom` | `limits.proofStillsMin`, `format-spec.sampledFromKinds` |
| `01-sources.json` | số `counterClaims` | `limits.counterClaimsMin` |

Lỗi tầng 2 phải in: tên file, tên trường, giá trị thực, khoảng mong đợi, và **file
format-spec nào** đã dùng để so.

### 4. Phạm vi cho phép
`package.json` · `tsconfig.json` · `.gitignore` · `scripts/**` · `engine/io/**` ·
`engine/providers/**` · `pipeline/runs.jsonl` · `package-lock.json` ·
`.github/workflows/acceptance-wp000.yml` · các `.gitkeep` · một dòng của chính WP này trong
`engine/ops/backlog.md`

### 5. Ràng buộc
- **Môi trường chốt cứng:** Node 20 LTS, npm. `package.json` khai `"engines": {"node": ">=20 <21"}`.
  Commit `package-lock.json`. Workflow dùng `actions/setup-node@v4` với `node-version: 20`.
- Dependency được phép, đúng phiên bản: `typescript@5.4.5`, `@types/node@20.12.7`, `ajv@8.12.0`,
  `ajv-formats@2.1.1`, `tsx@4.7.1`, `gray-matter@4.0.3` (đọc front-matter của script).
  Không thêm gì khác.
- Không viết logic nghiệp vụ. Interface chỉ khai chữ ký hàm và ném `NotImplemented`.
- **Không hardcode bất kỳ khoảng số nào** của thể loại trong `scripts/`. Mọi khoảng số đọc
  từ format-spec. Đây là mục dễ vi phạm nhất của WP này.
- Không chạm `engine/contracts/`.

### 5b. Điều kiện dừng
- `main` bị đổi bởi nguồn khác giữa chừng
- Cần chạm file ngoài phạm vi hoặc thêm dependency ngoài danh sách
- Một schema không parse được — nêu tên file và dừng
- Một artifact cần kiểm tầng 2 nhưng `format-spec.json` không có trường tương ứng → dừng,
  nêu tên trường. **Không tự đặt giá trị mặc định.**

### 6. Acceptance test

Chạy qua `.github/workflows/acceptance-wp000.yml`, kích hoạt bằng `workflow_dispatch`. Đây là
đường nghiệm thu ban đầu khi CI chưa tồn tại — xem ngoại lệ bootstrap trong
`definition-of-done.md`.

1. `npx tsc --noEmit` → không lỗi.
2. `npx tsx scripts/validate.ts` → mọi file JSON hợp lệ, in số file đã kiểm ở cả hai tầng.
3. **Kiểm âm 1 (tầng 1):** thêm tạm `episodes/_test/bad.json` thiếu trường bắt buộc →
   validate fail, nêu đúng trường thiếu.
4. **Kiểm âm 2 (tầng 2):** thêm tạm một brief hợp lệ về cấu trúc nhưng
   `targetDurationMin: 5` → validate fail, nêu đúng khoảng mong đợi và file format-spec đã
   dùng để so.
5. **Kiểm âm 3 (tầng 2):** một brief có `pillar` không nằm trong `channel.pillars` → fail.
6. `npx tsx scripts/log-run.ts --dry-run` → in một dòng hợp lệ **có `costUsd`**.
7. Xoá mọi file thử sau khi kiểm.

### 7. Definition of Done
Theo `definition-of-done.md` mục 1–9, cộng: không một khoảng số nào của thể loại xuất hiện
trong `scripts/` — kiểm bằng đọc diff.
