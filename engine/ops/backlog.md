# Backlog

Trạng thái: `todo` · `doing` · `blocked` · `cancelled` · `done`.
Thứ tự trong bảng là thứ tự thực hiện. Không nhảy cóc.

Đây là bản đánh số duy nhất có hiệu lực.

## Mốc 0 — Nạp và rà

**Trạng thái: `done` — nghiệm thu tài liệu và cấu hình.**

| Việc | TT |
|---|---|
| Nạp bốn lô tài liệu vào repo | done |
| Task rà mâu thuẫn, chỉ đọc | done |
| Sửa danh sách rà ra | done |
| Điền các ô `<ĐIỀN>`, gồm ba mốc chi phí và giá quy ước giờ người | done |
| **Mở đường nhận tiền và danh tính pháp lý — chạy song song, không chặn mốc nào** | todo |
| **Thu xếp người soát bản địa nói tiếng Anh Mỹ — cần trước Mốc 5** | todo |

**Hồ sơ DoD và giới hạn nghiệm thu**

- Checkpoint đối chiếu: main `6f48e77c7eeb9dd3c04a297cab3a7647f5d07a72`,
  tree `b6bb1b3c3078662eeb28676dfd7a5eac1a7dcff1`; 106 file, 45/45 JSON parse được.
- 19 mục A của lần rà thứ nhất đã xử lý qua [PR #1](https://github.com/HungQuach301/fulcrum-studio/pull/1),
  [PR #2](https://github.com/HungQuach301/fulcrum-studio/pull/2), [PR #3](https://github.com/HungQuach301/fulcrum-studio/pull/3).
  Tám mục mới của lần rà thứ hai đã xử lý qua [PR #4](https://github.com/HungQuach301/fulcrum-studio/pull/4),
  [PR #5](https://github.com/HungQuach301/fulcrum-studio/pull/5), [PR #6](https://github.com/HungQuach301/fulcrum-studio/pull/6).
  Giữ nguyên phân loại B–E đã được chủ dự án xác nhận.
- Đủ 14/14 giá trị cấu hình Mốc 0: 13 giá trị ở PR #6 và `googleAccount` ở
  [PR #7](https://github.com/HungQuach301/fulcrum-studio/pull/7). Google Drive `get_profile`
  trả email `hungqv301@gmail.com` lúc `2026-09-12T16:14:58.975Z`; chủ dự án xác nhận
  tài khoản được dành riêng cho Fulcrum. Không suy ra quyền kênh YouTube hoặc quota.
- Các ô được phép chờ: `visual-tokens.json:imagePromptSuffix` chờ chốt phong cách
  ở Mốc 4; hai RPM, hai nguồn và hai ô tính hoà vốn trong `12-success-criteria.md`
  chờ sau Mốc 7b và đủ điều kiện đo doanh thu quảng cáo thật. Không còn ô cấu hình
  bắt buộc điền ở Mốc 0 bị bỏ trống.
- Hai việc song song trong bảng giữ `todo`: đường nhận tiền/danh tính pháp lý không
  chặn mốc nào; người soát bản địa giữ yêu cầu D-17, gồm ngoại lệ chạy kỹ thuật Mốc 5
  và chặn Mốc 7b/phát hành khi chưa đáp ứng. Không đổi trạng thái bất kỳ WP nào.
- CI chưa có kết quả: tại checkpoint đối chiếu có 0 check runs, 0 commit statuses,
  0 Actions runs; combined status `pending` với danh sách rỗng. Kiểm schema và hồ sơ
  59 fixture của PR #5 chạy trong Codex; validator tầng 2 chưa được nghiệm thu.
  Các ngoại lệ CI đã duyệt chỉ có hiệu lực cho từng PR, không miễn DoD của WP sau.
- Hồi quy năm brief chưa chạy; ngoại lệ chỉ áp dụng PR #4 ở Mốc 0. Chưa nghiệm thu
  chất lượng prompt, giọng/ảnh hoặc đầu ra sản xuất. Sai khác đã biết của
  `pipeline/state.json` giữ phân loại D; không coi dữ liệu đó đã đạt validator runtime.
- C4/canvas/fps/motion blur chờ WP-003. Quota project cần bằng chứng trước WP-014;
  quyền YouTube/OAuth, quyền truy cập provider/model, giấy phép từng asset và quyền
  thương hiệu của tên làm việc vẫn chưa được xác minh. Các ngưỡng chi phí giữ theo D-13;
  đóng Mốc 0 không cấp quyền thực thi WP, chi tiêu, gọi provider hoặc đổi settings/quota.

## Mốc 1 — Hạ tầng xây dựng

| WP | Tên | `riskClass` | Phụ thuộc | TT |
|---|---|---|---|---|
| WP-000 | Scaffold repo, TypeScript, validator hai tầng | architectural | — | done |
| WP-001 | CI trên push: validate, typecheck, guardrails, ci-report | architectural | WP-000 | done |
| WP-007 | Dọn dẹp và khôi phục CI | <CẦN QUYẾT ĐỊNH: riskClass của WP-007> | WP-001 | todo |
| WP-002a | Interfaces state store và provider | mechanical | WP-001 | todo |
| WP-002b | Hàng đợi ghi D-15 và reindex | architectural | WP-002a | todo |
| **WP-004** | **Builder — agent chạy trong Actions** | architectural | WP-001 | todo |

WP-001b — `cancelled`: GitHub plugin ghi được repo, nên không cần Bootstrap expander.

## Mốc 2 — Xác nhận kiến trúc hình ảnh

| WP | Tên | `riskClass` | Phụ thuộc | TT |
|---|---|---|---|---|
| WP-003 | Spike canvas 6000×3400, so 30fps/60fps, motion blur, năm kịch bản | architectural | WP-000 | todo |

## Mốc 3 — Lõi định lượng

| WP | Tên | `riskClass` | Phụ thuộc | TT |
|---|---|---|---|---|
| **WP-009** | **Bản đồ đề tài × nguồn dữ liệu — làm TRƯỚC WP-010** | mechanical | WP-002 | todo |
| WP-010 | Kho ảnh chụp + adapter, gồm kho vintage và ảnh chụp biên tập | mechanical | WP-009 | todo |
| WP-011 | Phát hiện thay đổi chuỗi và đính chính, tự mở issue | mechanical | WP-010 | todo |
| WP-012 | Thư viện mô hình: runner + kiểm bốn cấp (công cụ, không phải nội dung) | architectural | WP-010 | todo |
| **WP-008** | **Tám mô hình đầu tiên + ca kiểm tay — phần lớn là việc của người** | architectural | WP-010, WP-012 | todo |
| WP-013 | Sensitivity Pass | mechanical | WP-008, WP-012 | todo |
| WP-014 | Corpus đối thủ + kiểm mới lạ + ba đại lượng nhu cầu | architectural | WP-002 | todo |
| WP-015 | Thesis Engine, nguồn 2–3 bắt buộc | architectural | WP-008, WP-011, WP-013, WP-014 | todo |

## Mốc 4 — Xưởng hình

| WP | Tên | `riskClass` | Phụ thuộc | TT |
|---|---|---|---|---|
| WP-020 | Dựng hình: canvas base, camera rig | architectural | WP-003 | todo |
| WP-021 | Năm layout ngang wave 4 gồm flip-point, ba layout dọc | mechanical | WP-020 | todo |
| WP-022 | Layout Gallery, chấm 8 tiêu chí, pixel-diff hồi quy | mechanical | WP-021 | todo |

## Mốc 5 — Vertical slice

| WP | Tên | `riskClass` | Phụ thuộc | TT |
|---|---|---|---|---|
| WP-030 | S01 Signal Scan + S02 Topic Scoring | mechanical | WP-010, WP-014 | todo |
| WP-031 | S03 Gate 1: trình 5 thesis, nhận lựa chọn, **ghi decisionShadow** | mechanical | WP-015, WP-030 | todo |
| WP-032 | S04 Research + S05 Fact-check + S05b Sensitivity | architectural | WP-013 | todo |
| WP-033 | S06 Outline + S07 Script | mechanical | WP-032 | todo |
| WP-034 | S08 Gate 2: bảng kiểm máy + giọng nháp 60 giây, **ghi decisionShadow** | mechanical | WP-033 | todo |
| WP-035 | S09a Canvas Map + S09b Scene Pass | mechanical | WP-021, WP-033 | todo |
| WP-036 | S10 Preflight, 12 kiểm tra, đọc ngưỡng từ format-spec | mechanical | WP-035 | todo |
| WP-037 | S11 Voice & Timing | mechanical | WP-002 | todo |
| WP-038 | S12 Visual Assembly + S13 Proof Render + ledger license | mechanical | WP-036 | todo |
| WP-039 | S14 Render matrix + ghép chunk + Shorts | architectural | WP-038 | todo |
| WP-040 | S15 QA ba lớp + Gate 3, **ghi decisionShadow** | mechanical | WP-039 | todo |
| WP-041 | Chỉ số biến thiên giữa các tập, artifact cấp kênh | mechanical | WP-040 | todo |
| WP-042 | S16 Packaging + công bố bảng tính mô hình, chọn phương án A hoặc B | mechanical | WP-040 | todo |
| WP-043 | S17 Publish + phụ đề + thao tác Studio qua trình duyệt | architectural | WP-042 | todo |
| WP-044 | S18 Measure, gồm đường cong giữ chân | mechanical | WP-043 | todo |
| WP-045 | Analyst's Note: gom, phân cụm, soạn nháp | mechanical | WP-044 | todo |

## Mốc 6 — Cockpit nội bộ

| WP | Tên | TT |
|---|---|---|
| WP-050 | Spike phương án host cockpit — **chỉ làm nếu quyết định qua issue/PR thực sự chật** | todo |
| WP-051 | Cockpit: bảng pipeline, hộp gate, FPY | todo |

Với mô hình quyết định qua issue và PR, mốc này nhiều khả năng không cần.

## Mốc 7 — Chạy thử nội bộ, vận hành và tự động hoá

| WP | Tên | `riskClass` | Phụ thuộc | TT |
|---|---|---|---|---|
| **WP-005** | **Orchestrator — điều tiết sản lượng, áp bậc tự động hoá** | architectural | WP-044 | todo |
| WP-060 | Bộ chuẩn hồi quy nội dung, chấm bằng chỉ số máy | mechanical | WP-034 | todo |
| WP-061 | Thiết kế thí nghiệm khối: một biến một lúc, **biến đầu tiên là độ dài** | mechanical | WP-044 | todo |
| WP-062 | Vòng học — agent tự soạn PR sửa đặc tả từ errorClass lặp | architectural | WP-061 | todo |
| WP-063 | Workflow sao lưu artifact và asset không tái sinh được | mechanical | WP-038 | todo |
| WP-064 | Rollup chi phí và cảnh báo ba mốc theo D-13 | mechanical | WP-005 | todo |

## Đóng băng tới Mốc 8

`/portfolio` toàn bộ · lớp hiệu ứng âm thanh nâng cao · danh sách email · tiếp thị liên kết ·
mọi thứ liên quan kênh 2–3 · UI sản phẩm.
