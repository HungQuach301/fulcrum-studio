## WP-000 · Scaffold repo

### 0. Phân loại
- `riskClass`: `architectural`
- `branch`: `wp/000`

### 1. Mục tiêu
Dựng khung TypeScript tối thiểu và một validator **hai tầng** chạy được cho mọi file JSON
trong repo theo danh mục và cách phân loại ở D-21. Không viết logic nghiệp vụ.

Gói quyết định/đặc tả D-21 không phải triển khai WP này. Nó giữ nguyên trạng thái WP và
mọi dữ liệu; chỉ sau khi D-21 có trên `main` và có phê duyệt triển khai riêng mới được
viết scaffold, cài/chạy công cụ hoặc chuẩn hóa state.

### 2. Input
`PROJECT.md` · `AGENTS.md` · `engine/ops/guardrails.md` · `engine/docs/01-architecture.md` ·
`engine/contracts/` toàn bộ, đặc biệt `README.md` mục "Hai tầng kiểm" ·
`genres/data-explainer/format-spec.json` · `genres/data-explainer/layouts.json` ·
`channels/us-personal-finance/channel.json` · `channels/us-personal-finance/visual-tokens.json` ·
`genres/data-explainer/asset-policy.json` · `pipeline/automation-tiers.json` ·
`config/publish-allowlist.json` · `pipeline/state.json` · `engine/ops/backlog.md` ·
`engine/ops/definition-of-done.md` · `engine/docs/07-delivery-plan.md` ·
`engine/docs/02-decisions.md` D-14, D-19, D-20, D-21 · `engine/docs/13-upgrade-safety.md`

### 2b. Checkpoint trước khi bắt đầu
- Mốc 0 ở trạng thái `done` trong `backlog.md`
- Chưa có `package.json` ở gốc repo
- `engine/contracts/format-spec.schema.json` tồn tại (nếu không, Phần F chưa nạp đủ)
- D-21 đã có trên `main`; schema allowlist và ánh xạ tồn tại.
- Có phê duyệt triển khai riêng ghi checkpoint main/tree, phạm vi, quyền cài/chạy,
  các sự kiện Actions tự động và ngân sách/thời gian. Gói chuẩn bị D-21 không cấp các quyền này.
- State còn phân loại D thì chưa thể nghiệm thu mục 6.2. Muốn chuẩn hóa phải được duyệt
  riêng theo mục 3c; không suy quyền từ việc phạm vi đã liệt kê đường dẫn.
- Không đúng bất kỳ mục nào: **DỪNG và báo cáo**

### 3. Output
- `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`
- `scripts/validate.ts` — validator **hai tầng**, xem mục 3b
- `scripts/acceptance-wp000.ts` — harness fixture và kiểm bootstrap của DoD 3–6;
  mã kiểm và mẫu nằm trong file này, không thêm thư viện kiểm thử
- `.github/workflows/acceptance-wp000.yml` — chuẩn bị lockfile và nghiệm thu là các lượt
  riêng được duyệt; báo cáo kèm SHA/tree, run/attempt và phiên bản công cụ
- `engine/io/index.ts` — interface đọc/ghi artifact, chưa triển khai thật
- `engine/providers/index.ts` — interface provider, chưa triển khai thật
- `scripts/log-run.ts` — ghi một dòng theo `run-log.schema.json`, **gồm `costUsd`**
- `pipeline/runs.jsonl` rỗng
- Thư mục rỗng có `.gitkeep`: `data/snapshots/`, `models/`, `episodes/`, `pipeline/us-personal-finance/`
- `pipeline/state.json` — chỉ có bản sửa một lần nếu được duyệt riêng theo mục 3c
- Đúng một dòng WP-000 trong `engine/ops/backlog.md`, theo trình tự đóng WP ở mục 7

Biên nhận, `ci-report.txt`, log và dữ liệu thử là Actions artifact/vùng tạm, không phải file
mới để commit. Ngoài những Output trên, không tự tách thêm file code từ wildcard phạm vi.

### 3b. Validator hai tầng — yêu cầu cốt lõi của WP này

**Danh mục trước khi kiểm.** Liệt kê JSON được theo dõi tại commit kiểm, JSONL và
front-matter thuộc ánh xạ; fixture được truyền rõ vào harness. Dependency tải về và báo
cáo sinh trong vùng tạm không phải dữ liệu nguồn của repo. Mỗi file nguồn phải thuộc
đúng một nhóm trong `engine/contracts/README.md` mục "Danh mục kiểm WP-000 (D-21)".
File không đọc được, JSON chưa phân loại hoặc ánh xạ mơ hồ phải fail; không bỏ qua im lặng.

**Tầng 1 — cấu trúc.** Schema kiểm bằng meta-schema draft-07 và biên dịch Ajv. Artifact
và cấu hình miền ánh xạ contract, gồm `format-spec.json`, `layouts.json`, `channel.json`,
`visual-tokens.json`, asset-policy, automation-tiers, pipeline-state và publish-allowlist.
Áp dụng đầy đủ `if/then` và định dạng ngày/giờ/URI. Không bật `coerceTypes`, `useDefaults`
hoặc `removeAdditional`; validator không được thay dữ liệu hoặc schema.
Ba JSON công cụ ở gốc kiểm cú pháp và công cụ sở hữu như bảng phân loại; không coi
`package.json` npm là `14-package.json` của tập. JSONL kiểm từng dòng, front-matter
`05-script.md` kiểm bằng `gray-matter` và `script.schema.json`.

**Báo cáo coverage.** Tách số schema, cấu hình miền, artifact JSON, front-matter,
dòng JSONL, JSON công cụ và fixture. In số artifact thật đủ điều kiện kiểm tầng 2,
số đã kiểm và số bị chặn ở tầng 1. Không có artifact thì báo 0, không suy ra tầng 2 đạt.
Kết quả công cụ npm/TypeScript có mục riêng, không tính một lần parse JSON là đã qua
công cụ. Bộ kiểm đầy đủ chỉ đạt khi cả danh mục, schema, công cụ và fixture đạt.

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

Lỗi tầng 2 phải in: tên file, tên trường, giá trị thực, khoảng/danh sách/quan hệ mong
đợi, và **file format-spec nào** đã dùng để so; kèm đường dẫn channel/layout/model hoặc
artifact nguồn phiên bản nếu lỗi thuộc quan hệ đó. Không suy genre từ tên kênh cố định.
Layout phải thuộc danh sách của đúng `orientation`, không gộp danh sách ngang và dọc.
Những ràng buộc layout chưa có đặc tả như `propsSchema` không được tự phát minh hoặc
tuyên bố đã nghiệm thu; nếu cần chúng để quyết định một ca đang kiểm thì dừng và nêu thiếu.

**Nghĩa vụ bổ sung D-19/D-20 — không được coi là tuỳ chọn.**
- Tầng 1 áp dụng `if/then` cho `origin.kind` và `visibility = public`. Tầng 2 cũng
  kiểm quan hệ: snapshot có `snapshotKey`; model có `modelId`, `modelVersion`,
  `inputSetId`, `outputKey`; url có `url`; public có `publishedAt`.
- Khi claim dùng model, đọc mô hình theo `modelId`, đối chiếu `modelVersion`;
  thiếu mô hình, sai phiên bản hoặc model `partial` thì fail. Không tự tính lại
  verification hoặc biến trạng thái khác thành `verified`.
- Mỗi giá trị `null` trong bốn chỉ số được D-19 liệt kê phải có string lý do ở đúng
  khoá `aggregate.nullReason`; lý do cho một chỉ số không thay lý do của chỉ số khác.
- Brief và episode-state phải có đủ bộ ba `engine`, `genre`, `channel` dạng string
  và khớp nhau. Thiếu/lệch nguồn thì fail, không tự chọn ưu tiên.
  Đủ 17 nhóm artifact theo D-19/D-20: sources, factcheck, sensitivity, outline, script,
  canvas-map, storyboard, preflight, timing, proof, render-manifest, qa-report, package,
  publication, metrics, analyst-note, license-ledger. Không khai `versions` thì kế thừa
  qua `episodeId`; có khai thì phải khớp bộ ba đã đóng băng. Không ghi bộ kế thừa trở
  lại artifact, không đổi cấu hình để ép khớp. Không tự dựng cơ chế lấy bản lịch sử
  hoặc dùng phiên bản visual tokens thay phiên bản Channel Pack; thiếu cách xác định
  cấu hình đúng bộ phiên bản thì dừng, trình điểm thiếu.
- Outline ghép beat theo `index`; thiếu/trùng index làm ghép mơ hồ thì fail.
  Với `T = tổng beats[].estimatedMs`, tính tỷ lệ từng beat `estimatedMs / T`.
  So với `beats[].shareOfDuration ± limits.beatShareTolerance` của Genre Pack.
  Kiểm riêng `T / 60000` với `limits.targetDurationMin`; 60000 là đổi đơn vị,
  không phải thời lượng nội dung. Không thêm dung sai khác.
- D-20 giữ outline là số nguyên dương, brief/proof là số dương. Giá trị dương được
  schema nhận vẫn có thể fail tầng 2. Không đặt sàn một phút/một giây và không thêm
  ngưỡng nội dung cho clip proof.

### 3c. State bootstrap — chưa được chuẩn hóa khi chỉ duyệt đặc tả

Giữ bốn sai khác đã biết: thiếu `sourceCommit`, `rebuiltAt: null`, thừa
`engineVersion` và `aggregates`. Không sửa `pipeline-state.schema.json`.
Mục 6.2 phải báo lỗi state nguyên bản, không loại file hoặc coi lỗi đã biết là đạt.

Chỉ sau phê duyệt triển khai riêng theo D-21 mục 2: đối chiếu đúng blob
`6f6eb4493fb6173b19bf2af126bf0b0cd68c5593`, chưa có state tập, và checkpoint main/tree
đã duyệt. Sinh bản sửa trong Actions từ cây nguồn đã pin, giữ `note` và `episodes: []`,
bỏ hai trường thừa, thêm SHA nguồn thật và thời điểm UTC tạo thật. Thu biên nhận
run/attempt, SHA/tree và trước/sau; agent đọc lại rồi đưa đúng bản sửa vào PR được phép.
Đây là bước chuẩn hóa riêng trước acceptance, không là chức năng tự sửa của validator.
Không tạo workflow ghi state thường trực, không ghi thẳng main, không triển khai reindex.
Chưa duyệt, nguồn khác hoặc thiếu biên nhận thì giữ state và dừng nghiệm thu.

### 4. Phạm vi cho phép
`package.json` · `tsconfig.json` · `.gitignore` · `scripts/**` · `engine/io/**` ·
`engine/providers/**` · `pipeline/runs.jsonl` · `package-lock.json` ·
`.github/workflows/acceptance-wp000.yml` · các `.gitkeep` · một dòng của chính WP này trong
`engine/ops/backlog.md`

`pipeline/state.json` chỉ thuộc phạm vi có điều kiện ở mục 3c và D-21 mục 2; việc liệt kê
đường dẫn không cấp quyền sửa. Gói chuẩn bị D-21 có phạm vi năm file riêng theo phê duyệt
của chủ dự án, không mở rộng phạm vi triển khai scaffold ở đây. Khi triển khai, không sửa
chính file WP/DoD/quyết định/contracts; thiếu luật thì dừng và mở gói đặc tả riêng.

### 5. Ràng buộc
- **Môi trường chốt cứng:** Node 20 LTS, npm. `package.json` khai `"engines": {"node": ">=20 <21"}`.
  Commit `package-lock.json`. Workflow dùng `actions/setup-node@v4` với `node-version: 20`.
- Dependency được phép, đúng phiên bản: `typescript@5.4.5`, `@types/node@20.12.7`, `ajv@8.12.0`,
  `ajv-formats@2.1.1`, `tsx@4.7.1`, `gray-matter@4.0.3` (đọc front-matter của script).
  Không thêm gì khác.
- Không viết logic nghiệp vụ. Interface chỉ khai chữ ký hàm và ném `NotImplemented`.
- **Không hardcode bất kỳ khoảng số nào** của thể loại trong `scripts/`. Mọi khoảng số đọc
  từ format-spec. Đây là mục dễ vi phạm nhất của WP này.
- Không chạm `engine/contracts/` khi triển khai scaffold; thay đổi schema allowlist/README
  chỉ thuộc gói quyết định D-21 đã duyệt riêng.
- Sáu dependency trực tiếp ở trên giữ đúng phiên bản. Không tự thêm package trực tiếp.
  Cây gián tiếp phải có lockfile và được trình trước acceptance; thiếu lockfile thì dừng
  đường nghiệm thu, không tự cài để sửa tại chỗ.
- Lockfile tạo trong lượt chuẩn bị Actions được duyệt riêng, xuất artifact để agent đưa
  vào nhánh. Không coi lượt chuẩn bị là nghiệm thu. Acceptance dùng `npm ci`, không đổi
  lockfile. Không cài hoặc chạy kiểm trong Codex nếu chưa có phê duyệt riêng phù hợp D-14.
- Các action dự kiến: `actions/checkout@v4`, `actions/setup-node@v4`,
  `actions/upload-artifact@v4`. Chốt phiên bản thực/SHA của các action và Node/npm trong
  preflight triển khai trước khi chạy; không tự nâng major hoặc thêm action khác.
- Workflow chỉ đọc repo bằng quyền cần thiết `contents: read`, `pull-requests: read`;
  không nhận secret provider, không tự commit/push. Quyền chạy và ngân sách phải được
  phê duyệt riêng. Không thay settings/quota để làm workflow chạy được.
- Dry-run log không ghi `pipeline/runs.jsonl` và không là biên nhận chi phí thật.
  Không triển khai store/provider thật hoặc thêm stage sản xuất trong WP này.

### 5b. Điều kiện dừng
- `main` bị đổi bởi nguồn khác giữa chừng
- Cần chạm file ngoài phạm vi hoặc thêm dependency ngoài danh sách
- Một schema không parse/biên dịch được — nêu tên file và dừng
- JSON chưa có nhóm kiểm/ánh xạ, thiếu nguồn phiên bản hoặc quan hệ không xác định được
- Cần chuẩn hóa state nhưng chưa có phê duyệt riêng, hoặc nguồn/biên nhận không khớp
- Actions chưa có quyền/điều kiện chạy hoặc phát sinh chi phí/lượt chạy ngoài phê duyệt
- Một artifact cần kiểm tầng 2 nhưng `format-spec.json` không có trường tương ứng → dừng,
  nêu tên trường. **Không tự đặt giá trị mặc định.**

### 6. Acceptance test

Chạy qua `.github/workflows/acceptance-wp000.yml` trong Actions. Theo D-21, trước khi
workflow có trên main được dùng `pull_request` vào main, giới hạn nhánh nguồn cùng repo
`wp/000`, sau phê duyệt triển khai và các lượt tự động. Giữ `workflow_dispatch` khi
workflow có trên main; không tự dispatch/rerun. Không thêm workflow CI của WP-001.

Checkout đúng SHA head được nghiệm thu, ghi cả SHA sự kiện nếu khác (merge thử).
Report SHA/tree thực sự checkout, run/attempt, Node/npm/action và các kết quả bên dưới
trong `ci-report.txt`; luôn thu báo cáo, giữ đúng failure/skipped/cancelled. Thiếu log
hoặc lệch SHA thì không có bằng chứng nghiệm thu. Không cần bí mật của provider.

Chuẩn bị lockfile, chuẩn hóa state và acceptance là các bước có mục đích/quyền riêng;
hai bước chuẩn bị không được ghi nhận là acceptance đạt. Trước acceptance, cây ứng viên
đã phải chứa dữ liệu hợp lệ và lockfile; validator không được sửa chúng trong khi kiểm.

1. `npx tsc --noEmit` → không lỗi.
2. `npx tsx scripts/validate.ts` → mọi JSON nguồn hợp lệ theo đúng nhóm kiểm; báo coverage
   mục 3b và số file đã kiểm ở cả hai tầng. `npm ci` và TypeScript phải thành công riêng;
   không coi phần JSON công cụ hoàn tất chỉ từ log validator.
3. **Kiểm âm 1 (tầng 1):** fixture brief thiếu `topic` tại
   `episodes/us-personal-finance/2099-01-wp000-fixture/00-brief.json` trong cây thử tạm →
   fail đúng schema brief và đúng trường thiếu; lỗi không được chỉ là không nhận ra tên file.
   Harness cung cấp rõ root/đường dẫn fixture; không trông chờ fixture là file tracked.
4. **Kiểm âm 2 (tầng 2):** thêm tạm một brief hợp lệ về cấu trúc nhưng
   `targetDurationMin: 5` → validate fail, nêu đúng khoảng mong đợi và file format-spec đã
   dùng để so.
5. **Kiểm âm 3 (tầng 2):** một brief có `pillar` không nằm trong `channel.pillars` → fail.
6. `npx tsx scripts/log-run.ts --dry-run` → in một dòng hợp lệ **có `costUsd`**.
7. Kiểm fixture cho mọi hàng tầng 2 ở mục 3b, cả ca đạt, biên và ngoài biên. Các biên
   miền lấy từ cấu hình; không chép khoảng thể loại vào helper. Kiểm brief archetype lạ,
   layout sai hướng, thiếu trường limits và thiếu/khác nguồn phiên bản.
8. Kiểm D-19/D-20: đủ ba nhánh origin và từng trường đi kèm; model partial; từng chỉ số
   null có/thiếu/sai lý do; private/public có/thiếu thời điểm; đủ 17 nhóm phiên bản
   khai/kế thừa/thiếu/lệch; tỷ lệ beat và tổng thời lượng. Kiểm trực tiếp hàm quan hệ
   tầng 2 để chứng minh riêng phần bị tầng 1 bắt trước; luồng thật luôn chạy tầng 1 trước.
   Ca thời lượng dương dưới sàn cũ được schema nhận đúng kiểu, nhưng vẫn phải kiểm miền;
   clip proof không bị áp một ngưỡng nội dung mới. Không gắn kết quả mới với 59 fixture
   PR #5 như thể đó là cùng bộ vật chứng; giữ riêng hồi quy prompt năm brief chưa chạy.
9. Kiểm cấu trúc allowlist: ca hợp lệ, thiếu từng trường bắt buộc, sai kiểu, khoá thừa;
   không đổi `config/publish-allowlist.json`. Kiểm danh mục từ chối JSON chưa phân loại;
   state gốc giữ một ca âm riêng, không thay state thật bằng fixture để nghiệm thu.
10. Kiểm bootstrap DoD 3–6 bằng máy: diff đúng phạm vi WP trên main tại SHA baseline
    đã pin; chỉ một dòng backlog khi có; contracts không đổi; không secret hoặc hằng số
    nội dung mới. Không đọc phạm vi do nhánh ứng viên tự sửa. Kiểm âm chứng minh vi phạm
    bị bắt và đối chứng hợp lệ không bị báo sai. Chỉ dùng mẫu giả, không dùng secret thật.
11. Dọn mọi dữ liệu thử kể cả khi kiểm lỗi; chỉ ghi trong vùng tạm riêng của Actions,
    không commit fixture, log hoặc report. Kiểm thử không làm thay đổi cây nguồn đang
    nghiệm thu. Report tách kiểm dữ liệu thật, fixture và các bước chuẩn bị.

### 7. Definition of Done
Theo `definition-of-done.md` mục 1–9 và ngoại lệ bootstrap D-21; giữ nguyên yêu cầu
không một khoảng số nào của thể loại xuất hiện trong `scripts/` — kiểm bằng đọc diff.
Dòng WP-000 đề nghị `done` có thể nằm trên commit ứng viên cuối của PR triển khai; đó
chưa là nghiệm thu main. Actions phải kiểm đúng commit chứa dòng này cùng code/lockfile,
chủ dự án đọc báo cáo năm mục và xác nhận checkpoint rồi mới quyết định merge.
Đổi commit sau kiểm thì cần bằng chứng commit mới. PR chỉ chuẩn bị đặc tả không cập nhật
backlog và không được dùng ngoại lệ CI Mốc 0 để tuyên bố WP-000 đạt.
