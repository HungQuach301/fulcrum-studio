# Sổ khuyết tật đang mở

Danh sách này tồn tại để agent **dừng đúng chỗ** thay vì tự phát minh giải pháp, và để chủ
dự án biết mình đang chấp nhận cái gì. Mã F là số hiệu trong bản đánh giá độc lập ngày
11/09/2026; mục không có mã F là phát hiện bổ sung.

Ba trạng thái: **đã sửa** — không cần làm gì; **hoãn có chủ đích** — biết, chấp nhận, sẽ xử
lý ở WP nào; **chấp nhận vĩnh viễn** — không định sửa, và lý do.

## Đã sửa

| Mã | Nội dung | Sửa ở đâu |
|---|---|---|
| F01 | Thứ tự thẩm quyền | `AGENTS.md`, T-08: `02-decisions.md` > `PROJECT.md` > `guardrails.md` > cấu hình > tài liệu mô tả |
| F02 | Vòng phụ thuộc bootstrap | Repo tạo rỗng; bảo vệ nhánh bật sau Mốc 0; WP-000 có workflow nghiệm thu riêng và ngoại lệ trong DoD |
| F03 | DoD tự chặn, scope thiếu file | DoD mục 9 và 11; scope WP-000/002/003/010/013 |
| F04 | CI chưa đủ ngữ cảnh | WP-001: đọc WP từ `main`, xử lý nhánh `cp/` và push lên `main`, `report` chạy `always()` và gắn SHA, ghim action bằng SHA |
| F05 | Ghi đồng thời cùng Git ref | **D-15**: hàng đợi ghi tuần tự `commit-artifacts.yml` với `writeId` khử trùng; WP-002 mục 3d và 5 ca nghiệm thu |
| F06 | Thiếu định danh và binding | `run-log`: `runId`, `attemptId`, `subjectType`, digest, `costKind`. `episode-state`: `gateHistory` có actor, hash, policyVersion, `invalidatedBy`; thêm `revision`, `pendingSideEffects` |
| F07 | Guardrail nằm trong quyền tự sửa | WP-001 đọc baseline từ `main`; WP-004 chuẩn hoá `wpPath`, xác minh người kích hoạt, secret theo job, cấm sửa file luật |
| F08 | Thiếu contract | Thêm 10 schema: data-series, corpus, novelty-check, license-ledger, analyst-note, variation-index, orchestrator-log, pipeline-state, automation-tiers, asset-policy |
| F09 | Storyboard không dựng được | `storyboard.schema.json` có `content`: texts, series, axes có đơn vị và `startsAtZero`, assets, reveal; `claimId` bắt buộc cho mọi con số |
| F10 | Provenance đứt đoạn | `snapshot.schema.json` có SA/NSA, vintage, revisionOf, ngưỡng tuyệt đối, enteredBy/verifiedBy/sourceDocument*; `sources` khai trường bắt buộc theo `origin.kind` |
| F11 | Hồ sơ kiểm mô hình | WP-012 mục 3b và 3c: bốn cấp có bằng chứng riêng, trạng thái tổng hợp tính từ điều kiện, đổi tham số làm hết hiệu lực; prompt fact-checker chỉ làm cấp 4 |
| F12 | Sensitivity thay hiểu biết miền | WP-013 sửa lỗi "giảm bước quét"; `format-spec` cho phép kết luận ổn định; `devicesMin` hạ để không ép flip-point |
| F13 | Cổng Mốc 3 đo sai thứ | `12-success-criteria.md`: chuẩn hoá thẻ, ghép cặp cùng trụ, cho phép hoà, rubric ba trục, **ba kết quả** gồm "chưa đủ bằng chứng", tách tồn kho khỏi tốc độ cung |
| F14 | Kiểm đầu chuỗi không bảo đảm bản cuối | Thêm **S15b** Content Final Check và **S16b** Packaging Compliance Check |
| F16 | Trần layout không đủ | `layouts.json` có `countingRule`; trần wave 4 nâng; sức chứa nội dung mới đủ cho khoảng scene yêu cầu |
| F17 | Ngữ pháp thành checklist | Quy tắc 4 thành mặc định có **ngoại lệ bắt buộc khi đọc số**; ngoại lệ `arc` đặt tên; thêm **bài kiểm hiểu** đứng trên checklist |
| F18 | Chưa chốt timeline sau TTS | Thêm **S11b** Timeline Lock; đo lệch phụ đề với audio; Gate 2 hết hiệu lực khi nhịp đổi |
| F19 | Sao lưu không đủ | `license-ledger` có `reproducible`; asset không tái sinh được lưu bền vững ngay ở S12 |
| F20 | Bằng chứng nâng bậc yếu | `automation-tiers.json`: đòi có lần người bác, ca khó cài chủ đích, đo false approval/rejection, cửa sổ phủ quyết cần xác nhận đã đọc, ai hạ bậc |
| F21 | FPY và retry đánh giá sai | `04-nfr.md` tách `maxAttempts` / retry hạ tầng / chạy lại; thêm chỉ số qua trọn chuỗi và số lần người chạm |
| F22 | Công thức doanh thu sai đơn vị | `monetization.md`: chia 1.000, bỏ nhân số điểm chèn, thêm lợi nhuận đóng góp và đầy đủ |
| F23 | Chi phí quan sát muộn | `run-log` có `subjectType` cho chi phí ngoài tập, `costKind`, `priceTableVersion`; verdict có `cancelled`/`timeout` |
| F24 | Mốc chưa đăng không cho dữ liệu khán giả | Tách **Mốc 7** (nội bộ) và **Mốc 7b** (pilot); RPM và tiêu chí khán giả gắn đúng mốc |
| F25 | Quyền công bố và lifecycle | **D-16** repo công khai riêng + `PUBLISH_REPO_TOKEN` + `publish-allowlist.json`; thêm **S17b** lifecycle và **S18b** lịch đo |
| F26 | Giả định nền tảng lỗi thời | Quota sửa theo bucket riêng; khai giới hạn `captions`; giữ chân 30 giây ghi là giá trị nội suy |
| F28 | Tuân thủ chỉ chặn từ cấm | Tách ba loại khai báo; bỏ khẳng định pháp lý; bảng quyết định GenAI; khai thương mại **trong video**; cảnh báo cá nhân hoá ở khuôn 1 |
| F30 | Tài liệu nhiều điểm lệch | Prompt pack đọc từ `format-spec`; `PROJECT.md` có phiên bản bộ tài liệu; T-08 sửa theo invariant |
| — | Soát bản địa không có chủ | **D-17**: vai có trả tiền, ngoại lệ D-08, dòng chi phí, chặn phát hành |
| — | Không ai tạo tám mô hình | **D-18** và **WP-008** |
| — | `annual-reset` và lô chưa đăng | Luật lô trong `data-sources.md` |
| — | Danh tính pháp lý không có checkpoint | Một dòng ở Mốc 0 trong `backlog.md` |
| — | WP-011, WP-012, WP-014 chưa viết | Đã viết đầy đủ. Mốc 3 nay đặc tả trọn vẹn |

## Hoãn có chủ đích

| Mã | Nội dung | Xử lý ở đâu |
|---|---|---|
| F15 | Ba đại lượng nhu cầu vẫn là proxy, không phải phép đo | Không có nguồn tốt hơn miễn phí. `corpus.schema.json` buộc khai thiên lệch; nếu Mốc 7b cho thấy trục nhu cầu chấm sai, mua dữ liệu là một quyết định D-xx mới |
| F27 | Ngưỡng phân phối theo subscriber chưa có bằng chứng | Mốc 7b đo nguồn lưu lượng thật thay vì tin các mốc đó |
| F29 | B2B là giả thuyết thương mại khác | Mốc 8. Không xây thêm lớp gì cho nó trước đó |
| — | Contract cho WP Mốc 4–7 chưa có | Mỗi WP tạo artifact nào thì viết contract của artifact đó, nhãn `[contract-change]` và một mục D-xx |
| — | WP Mốc 4–7 chưa viết | Viết bằng khối T-14 khi tới mốc, sau khi WP trước cho biết hình dạng thật của interface |

## Chấp nhận vĩnh viễn — không định sửa

| Nội dung | Lý do |
|---|---|
| Cổng Mốc 3 không có ý nghĩa thống kê | Cần khoảng 50 cặp trở lên. Nó là công tắc dừng rẻ tiền, và đã được gọi đúng tên trong `12-success-criteria.md` |
| Không có trần chi phí cứng trong code | **D-13**, quyết định của chủ dự án. Lưới an toàn nằm ngoài repo: hạn mức chi tiêu đặt ở nhà cung cấp API |
| Hằng số thể loại còn trong `cinematography.md` và `sound-design.md` | Chúng đúng với mọi thể loại video giải thích. Tách khi có thể loại thứ hai, không sớm hơn |
| Không có checksum từng khối tài liệu | Ở quy mô một người vận hành, nó thêm nghi thức nhiều hơn thêm an toàn |

## Luật dùng sổ này

Agent gặp một mục "hoãn có chủ đích" thì làm phần trong phạm vi WP của mình và ghi phần bị bỏ
vào mục "Rủi ro còn lại" của báo cáo. Gặp một ràng buộc chặn không có trong sổ thì **dừng
theo D-14**. Mục "đã sửa" và "chấp nhận vĩnh viễn" không cần nhắc lại.

Sổ này cập nhật khi một mục đổi trạng thái, không phải mỗi lần có WP mới.
