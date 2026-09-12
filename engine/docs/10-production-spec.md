# Đặc tả sản xuất

Pipeline gồm **bốn khối**, tổng **25 stage** (S01–S19, trong đó S05 tách S05b và S09 tách
S09a/S09b, S11 tách S11b, S15 tách S15b, S16 tách S16b, S17 tách S17b, S18 tách S18b). Bốn khối tương ứng bốn workflow, không phải 25 workflow — ranh giới artifact vẫn
giữ nguyên từng stage. Bốn khối gọi nhau bằng `workflow_dispatch` có tham số `episodeId`,
không bằng sự kiện push. Xem quyết định D-12.

```
KHỐI A — Hoạch định
  S01 Signal Scan        [máy]     → signals.json
  S02 Topic Scoring      [máy]     → topics.ranked.json
  S03 GATE 1             [NGƯỜI]   → 00-brief.json

KHỐI B — Sáng tạo
  S04  Research          [máy]     → 01-sources.json
  S05  Fact & Risk Pass  [máy]     → 02-factcheck.json — cờ đỏ thì DỪNG
  S05b Sensitivity Pass  [máy]     → 03-sensitivity.json — không gọi LLM
  S06  Outline           [máy]     → 04-outline.json
  S07  Script            [máy]     → 05-script.md
  S08  GATE 2            [NGƯỜI]   → duyệt hoặc bác kèm lý do

KHỐI C — Sản xuất
  S09a Canvas Map        [máy]     → 06-canvas-map.json
  S09b Scene Pass        [máy]     → 07-storyboard.json
  S10  PREFLIGHT         [máy]     → 08-preflight.json — 12 kiểm tra tĩnh, ~0 USD
  S11  Voice & Timing    [máy]     → 09-timing.json + 10-captions.srt
  S12  Visual Assembly   [máy]     → asset + ledger license
  S13  PROOF RENDER      [máy]     → 11-proof.json — ~460 khung, ~0,1 USD
  S14  Render            [máy]     → 12-render-manifest.json + final.mp4 + 3 Shorts
  S15  QA + GATE 3       [máy+NGƯỜI] → 13-qa.json

KHỐI D — Phát hành
  S16 Packaging          [máy]     → 14-package.json
  S17 Publish            [máy]     → 15-publication.json
  S18 Measure            [máy]     → 16-metrics.json
  S19 Vận hành sau đăng  [NGƯỜI]   → ≤8 phút
```

---

## KHỐI A — Hoạch định

### S01 · Signal Scan
Đọc từ **kho ảnh chụp dữ liệu**, không gọi API trực tiếp. Xuất 15–20 tín hiệu: chuỗi nào
vừa đổi, đổi bao nhiêu, thuộc pillar nào.
Ràng buộc: chỉ nguồn trong danh sách trắng của kênh; độ mới ≤90 ngày với chuỗi biến động
nhanh.

### S02 · Topic Scoring
Bốn trục có trọng số: nhu cầu 30 · độ bão hoà 20 · bậc RPM 30 · khả năng dựng ma trận
ngưỡng 20.
Bộ lọc cứng: đề tài không dựng được ma trận ngưỡng ba tầng thì **loại**, bất kể điểm.

### S03 · GATE 1
Xem quyết định D-08. Trình 5 thesis, người chọn 1 hoặc bác tất cả.
Đầu ra phải validate theo `brief.schema.json`. `approvedBy` bắt buộc là `human`.

---

## KHỐI B — Sáng tạo

### S04 · Research
Xuất hồ sơ nghiên cứu và `01-sources.json`.
Ràng buộc bắt buộc:
- Mọi claim có URL nguồn trong danh sách trắng, hoặc trỏ về một mô hình trong `/models/`.
- **Ít nhất 2 claim phản bác thesis.** Nghiên cứu một chiều là fail.
- Ưu tiên đọc từ kho ảnh chụp; chỉ gọi API khi chuỗi chưa có.
- Chi phí: **đo và ghi `costUsd`**, không tự dừng. Điều tiết ở cửa vào theo quyết định D-13.

### S05 · Fact & Risk Pass
Gọi **riêng biệt**, khoá API riêng, prompt đối kháng. Nhiệm vụ là tìm chỗ sai, không phải
xác nhận.
- Claim có `origin.kind = snapshot` hoặc `model`: đối chiếu **xác định** — đọc lại ảnh chụp
  hoặc chạy lại mô hình, so giá trị. Không gọi mô hình ngôn ngữ cho nhóm này.
- Claim có `origin.kind = url`: mở URL, đối chiếu từng con số. Đây là nhóm dễ vỡ nhất.
- Kiểm ngôn ngữ vi phạm ranh giới tư vấn theo `genres/data-explainer/compliance.md`.
- Có quyền **chặn pipeline**. Cờ đỏ thì dừng, không chạy tiếp rồi báo sau.
- Nghiệm thu: gieo 3 claim sai cố ý, phải bắt được cả 3.

### S05b · Sensitivity Pass
**Tính toán thuần. Không gọi LLM.** Xem `14-quantitative-core.md` mục 3.
- Input: `modelId`, tham số cần quét kèm khoảng và bước, biến kết luận.
- Bắt buộc quét mọi tham số có `geoVarying: true`.
- Output: bảng đầy đủ · danh sách điểm đảo chiều · phân loại mỗi tham số thành
  `stable` / `sensitive` / `flips`.
- Tập không có ít nhất một điểm đảo chiều hoặc một kết luận "ổn định trên toàn khoảng" thì
  **không đạt tiêu chí tầng 1**.

### S06 · Outline
Bảy mốc theo `genres/data-explainer/format-spec.json`. Mỗi ranh giới beat phải có **cầu tò
mò**. Điểm chèn quảng cáo sinh **từ** vị trí cầu tò mò, không đặt tuỳ ý.

### S07 · Script
- 3.200–3.600 từ. Ở tốc độ đọc mục tiêu, tương ứng 20–24 phút.
- Đủ 6 thiết bị nội dung theo format-spec.
- Ít nhất 3 mục từ điển kênh.
- Mọi con số có `claimId`.
- Một câu nêu rõ `geoScope` của kết luận.
- Lượt soát bản địa: đọc lại toàn bộ tìm cách diễn đạt không tự nhiên với người Mỹ.
  **Ai làm:** một người nói tiếng Anh Mỹ bản ngữ, thuê theo tập. Xem quyết định **D-17**. Đây là ngoại lệ có chủ đích
  của D-08 — người ở đây không tạo nội dung, chỉ sửa cách diễn đạt, và họ không thấy dữ liệu
  hay kết luận. Mô hình ngôn ngữ tự đọc lại bài của chính nó **không** tính là soát bản địa.
  **Chi phí:** một dòng riêng trong chi phí biến đổi mỗi tập, phải có trước Mốc 5.
  Chưa thu xếp được người thì `localeReviewDone = false` và tập **không** được phát hành —
  R8 là rủi ro mức Cao và đây là biện pháp giảm thiểu duy nhất của nó.

### S08 · GATE 2
Xem quyết định D-08. Trình bốn thứ, không trình toàn văn.

---

## KHỐI C — Sản xuất

### S09a · Canvas Map
Sinh **bản đồ vùng** trước, không sinh scene: 7–10 vùng, mỗi vùng gắn với một beat, có toạ
độ, kích thước, và quan hệ láng giềng. Output nhỏ.

Lý do tách: giữ nhất quán không gian qua 200 scene trong một lần sinh là loại việc mô hình
ngôn ngữ làm kém nhất. Tách thành bản đồ trước rồi scene sau biến một bài toán nhất quán
toàn cục thành hai bài toán cục bộ, và cho phép kiểm tĩnh "camera có nằm trong vùng hợp lệ
không".

### S09b · Scene Pass
180–220 scene. Mỗi scene: thời lượng, vị trí và chuyển động máy quay, layout, nội dung,
`claimIds`, lớp thị sai, độ dẫn âm thanh, khoảng thở sau.
**Camera chỉ được trỏ vào vùng đã khai trong Canvas Map.**

### S10 · Preflight
12 kiểm tra tĩnh, chi phí gần bằng không, dưới 5 giây. Xem `11-quality-gates.md`.

### S11 · Voice & Timing
Sinh giọng, căn thời gian ở mức từ, xuất phụ đề. Chuẩn hoá độ ồn theo chuẩn nền tảng.
Lệch phụ đề so với giọng ≤200ms.

### S11b · Timeline Lock

Preflight ở S10 kiểm storyboard **trước khi có giọng thật**. TTS luôn làm thời lượng lệch so
với ước tính. Bước này biên dịch một timeline từ audio đã đóng băng và chốt lại mọi thứ phụ
thuộc thời gian.

1. Audio đã sinh là **nguồn sự thật về thời gian**. Không sửa audio sau bước này.
2. Tính lại: thời lượng từng scene, vị trí J-cut, khoảng thở, mốc phụ đề, điểm chèn quảng
   cáo, tổng số khung.
3. Chạy lại **chỉ những kiểm tra phụ thuộc thời gian** trong preflight với số mới.
4. Nếu tổng thời lượng lệch quá `limits.totalDurationTolerancePct` so với brief, hoặc nhịp
   của một beat đổi đủ để thay ý đã duyệt ở Gate 2 → **approval của Gate 2 hết hiệu lực**,
   ghi `invalidatedBy: "S11b"` vào `gateHistory`, quay lại Gate 2.

**Đo lệch phụ đề:** so mốc phụ đề với **audio**, không so với file timing đã sinh ra chúng.
So hai file cùng nguồn không phải một phép kiểm độc lập. Kiểm thêm: khoảng mất giọng, clipping,
đỉnh thật, độ ồn tổng, và đuôi audio thừa.

### S12 · Visual Assembly
- Ảnh sinh: **không bao giờ chứa chữ hoặc số**. Chữ và số luôn là phần tử DOM.
- Mọi asset sinh lưu prompt và seed.
- Ảnh kho: truy vấn phải chứa danh từ cụ thể lấy từ chính câu lời thoại. Trần tỷ lệ ảnh kho
  khai trong `asset-policy.json`.
- Ledger license bắt buộc cho mọi asset không tự sinh.

*Sao lưu:* mọi asset có `reproducible: false` trong ledger giấy phép **phải** được lưu bền
vững ngay ở bước này, không đợi Mốc 7. Câu "video không cần sao lưu vì render lại được" chỉ
đúng khi mọi đầu vào nhị phân, phiên bản runtime, tham số mô hình và bằng chứng giấy phép còn
nguyên. Ảnh sinh, giọng tổng hợp, font và stock đều không bảo đảm tái tạo giống hệt từ prompt
và seed.

### S13 · Proof Render
~460 khung, ~0,1 USD, trước khi cam kết ~36.000 khung. Tỷ lệ chi phí 1:50.
**Lấy mẫu phân tầng**, không ngẫu nhiên đều: một khung mỗi beat + một ở ma trận ngưỡng +
một ở mỗi ngã rẽ + một ở mở đầu.

### S14 · Render
Matrix nhiều worker. Ghép chunk phải: cắt đúng ranh giới nhóm khung, cùng tham số mã hoá
tuyệt đối, âm thanh render riêng và ghép cuối. Đây là nguồn lỗi kinh điển — video ghép xong
giật ở mỗi ranh giới chunk.
Ba Shorts dọc render riêng từ canvas, dùng **layout thiết kế riêng cho tỷ lệ dọc** — không
tái dùng layout ngang. Xem `genres/data-explainer/layouts.json`.

### S15 · QA ba lớp + Gate 3
Xem `11-quality-gates.md`.

---

## KHỐI D — Phát hành

### S15b · Content Final Check

Kiểm **bản sẽ phát hành**, không phải bản nghiên cứu. Chạy sau S15, trước S16.

| Kiểm | Cách làm |
|---|---|
| Con số hiển thị | Mọi giá trị trong `scene.content.texts` và `scene.content.series` có `claimId`, và giá trị khớp claim trong dung sai. So xác định, không dùng mô hình ngôn ngữ |
| Con số đọc lên | Đối chiếu bản chép lời từ audio với `claimId` của câu tương ứng. Bắt lỗi TTS đọc sai đơn vị, sai dấu thập phân, sai bậc độ lớn |
| Điều kiện bị rơi | Câu kết luận trong script có giữ đủ điều kiện mà claim gốc nêu không. Đây là kiểm ngữ nghĩa, dùng mô hình ngôn ngữ đối kháng |
| Phạm vi địa lý | Câu nêu `geoScope` có thật sự nằm trong lời thoại không, không chỉ khai trong front-matter |
| Nhãn trục | Mọi biểu đồ có đơn vị; trục không bắt đầu từ 0 phải có `axisNote` |

Fail bất kỳ dòng nào → quay lại đúng stage gốc, không sửa tại chỗ.

### S16 · Packaging
5 tiêu đề theo 5 khuôn khác nhau · 3 thumbnail khác nhau ở từ nhấn và ở hình · mô tả có
nguồn, có link bảng tính mô hình, có tuyên bố miễn trừ · giá trị điểm chèn quảng cáo · liên
kết tiếp thị nếu có.

### S16b · Packaging Compliance Check

Tiêu đề, thumbnail và mô tả là nơi một kết luận có điều kiện dễ biến thành một lời hứa tuyệt
đối nhất, và chúng được sinh **sau** mọi lượt kiểm khác.

| Kiểm | Ngưỡng |
|---|---|
| Tiêu đề chứa con số | Con số đó phải có `claimId` và khớp nội dung |
| Tiêu đề hoặc thumbnail hứa tuyệt đối | Cấm. "Luôn", "không bao giờ", "ai cũng nên" — kể cả khi nội dung có điều kiện |
| Mô tả | Có lời giới hạn phạm vi giáo dục, sổ nguồn, link bảng tính mô hình |
| Khai nội dung tổng hợp | Theo bảng quyết định trong `compliance.md` |

### S17 · Publish
Đăng ở chế độ riêng tư trước. Khai rõ nội dung có hỗ trợ của công cụ tổng hợp. Tải phụ đề
lên. Ghi lại quota đã dùng.

### S17b · Publication Lifecycle

S17 chỉ tải lên ở chế độ riêng tư. Phần còn lại phải khai rõ, nếu không sẽ có tập nằm mãi ở
trạng thái riêng tư hoặc bị đăng hai lần.

| Việc | Ai | Ghi chú |
|---|---|---|
| Chuyển sang công khai hoặc đặt lịch | Người, hoặc máy ở bậc ≥2 cho `publish-to-public` | Đây là thao tác ra ngoài; không suy quyền từ bậc chung |
| Kiểm trước khi công khai | Máy | Xử lý xong, không có cảnh báo bản quyền, `localeReviewDone = true`, ledger giấy phép đầy đủ |
| Chống đăng trùng | Máy | `writeId` của lần tải lên ghi vào `pendingSideEffects`. Trước khi tải lại, **đối soát** với danh sách video của kênh, không gọi mù |
| Quay lui | Người | Metadata sai → chuyển về riêng tư, sửa, công khai lại. Ghi vào `publication` |
| `uploadedAt` và `publishedAt` | Máy | Hai mốc **khác nhau**. Tập tải lên hôm nay, công khai tuần sau |

**Trạng thái dự án API chưa qua kiểm tuân thủ có thể giới hạn video tải qua API ở chế độ riêng
tư.** Đưa app OAuth sang production **không** đồng nghĩa đã qua kiểm đó. Phải xác minh riêng
trước khi dựa vào đường phát hành tự động — đây là mục 15 trong danh sách cần xác minh.

### S18 · Measure
Ba mốc: 48 giờ, 7 ngày, 28 ngày. Lấy cả chỉ số tổng hợp **và đường cong giữ chân theo thời
gian** — đường cong là thứ cho phép đối chiếu retention với vị trí beat, chỉ số tổng hợp thì
không.

### S18b · Lịch đo

Các mốc 48 giờ, 7 ngày, 28 ngày cần một **scheduler có `dueAt`**, không phải một job chạy
hàng ngày rồi đoán. Mỗi tập có một hàng đợi checkpoint; workflow theo lịch lấy những
checkpoint đã tới hạn và ghi thêm vào `16-metrics.json` — **ghi thêm**, không ghi đè, để giữ
được cả ba mốc.

Chỉ số chưa có dữ liệu ghi `null` kèm lý do, không ghi 0. Đường cong giữ chân do API trả về
theo 100 điểm tỷ lệ thời gian; với video 18–24 phút, mỗi điểm tương ứng khoảng 11–14 giây,
nên **"giữ chân ở giây thứ 30" là một giá trị nội suy, không phải một phép đo**. Ghi đúng như
vậy trong metadata của chỉ số.

### S19 · Vận hành sau đăng
Xem `05-runbook.md` bước 8.
