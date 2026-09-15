# AGENTS.md

Nội dung file này được đồng bộ vào Project Instructions của agent.

## Thứ tự thẩm quyền — một bảng duy nhất

Khi hai nguồn lệch nhau, nguồn ở trên thắng. Không có ngoại lệ và không có bảng nào khác
trong repo được phép nói khác.

| # | Nguồn |
|---|---|
| 1 | Chỉ dẫn của chủ dự án trong phiên làm việc hiện tại |
| 2 | `engine/docs/02-decisions.md` — quyết định đã phê duyệt, mục sau thay mục trước |
| 3 | `PROJECT.md` |
| 4 | `engine/ops/guardrails.md` |
| 5 | Cấu hình theo miền: `format-spec.json`, `layouts.json`, `channel.json`, `automation-tiers.json` |
| 6 | Contract trong `engine/contracts/` |
| 7 | Tài liệu mô tả và prompt pack |

Project Instructions là **bản sao** của file này, không phải nguồn riêng. Hai bản lệch nhau
là một lỗi cần sửa ngay, không phải một tình huống cần phân xử.

Bộ tài liệu build pack là **nguồn khởi tạo**. Sau khi Mốc 0 đóng, repo là nguồn sự thật; build
pack không còn ghi đè repo đã tiến hoá.

## Thứ tự đọc bắt buộc

1. `PROJECT.md`
2. `AGENTS.md`
3. `engine/ops/guardrails.md`
4. WP hoặc CP được giao
5. Các file liệt kê ở mục Input của WP/CP đó

## Vai trò

Agent là **lớp điều phối và xây dựng**, không phải nơi chứa logic của nhà máy.

Task giao cho agent chỉ được chứa: mục tiêu, checkpoint, phạm vi cho phép, tiêu chí nghiệm
thu, điều kiện dừng, định dạng output. Nếu một task cần chỉ dẫn về *cách quyết định* một
việc, chỉ dẫn đó đang thiếu trong repo — nêu ra và dừng.

## Luồng nhánh và merge

| Việc | Quy tắc |
|---|---|
| Nhánh | Mỗi WP một nhánh `wp/<mã WP>`. Mỗi CP một nhánh `cp/<mã CP>` |
| Commit thẳng `main` | Cấm |
| Kết thúc WP | Mở Pull Request vào `main`, mô tả PR là báo cáo 5 mục |
| Merge | Theo `riskClass` khai trong WP — xem bảng dưới. Mặc định là người merge; tự động chỉ khi `riskClass: mechanical` **và** bậc của `merge-mechanical-wp` trong `automation-tiers.json` ≥2 |
| Gate sản xuất | Gate 1–3 **không bao giờ bị bỏ**. Ai bấm thì phụ thuộc bậc trong `automation-tiers.json`. "Không bỏ gate" và "gate luôn do người bấm" là hai điều khác nhau |
| "`main` SHA thay đổi giữa chừng" | Nghĩa là `main` bị đổi bởi nguồn khác. Commit của chính agent trên nhánh `wp/` không tính |

| `riskClass` | Ví dụ | Ai merge |
|---|---|---|
| `mechanical` | Scaffold, adapter một nguồn, script kiểm, sửa lỗi CI | Tự động khi CI xanh, nếu bậc tự động hoá của merge ≥2 |
| `architectural` | Interface, workflow điều phối, bất cứ thứ gì chạm `02-decisions.md`, `engine/contracts/`, hoặc thêm dependency | **Luôn là người** |

Mặc định khi WP không khai: `architectural`.

## Quy ước làm việc

- **Agent đề xuất, chủ dự án duyệt, agent thực hiện.** Trình phương án hoàn chỉnh kèm giá
  trị cấu hình, lý do, phạm vi và cách kiểm. Chủ dự án duyệt hoặc bác; agent tự cập nhật
  file và kiểm chứng trong phạm vi đã duyệt, không giao bảng trống hoặc yêu cầu điền tay.
- **Luôn hướng dẫn chi tiết bước tiếp theo trong mỗi phản hồi.** Nêu việc sẽ làm, checkpoint,
  phạm vi, điều kiện nghiệm thu và câu phê duyệt khi cần.
- Dữ liệu phụ thuộc tài khoản phải có bằng chứng; giữ chưa xác minh nếu chưa đọc được.
  Với thao tác tài khoản, chủ dự án chỉ thực hiện phần đăng nhập/xác thực mà dịch vụ bắt
  buộc chủ tài khoản thực hiện. Không suy đoán danh tính, quyền truy cập hay hạn mức.
- Phê duyệt phương án chỉ có hiệu lực trong phạm vi được giao; quyền merge, thực thi và
  chi tiêu vẫn theo chỉ dẫn hiện hành. Không xin lại quyền cho thao tác đã được duyệt.
- **Kiểm checkpoint trước.** Không khớp thì DỪNG và báo cáo, không tự khắc phục.
- **Điều kiện dừng là tuyệt đối.** Gặp thì dừng, không tìm cách đi vòng.
- **Nghiệm thu chạy trong GitHub Actions.** Không tuyên bố test pass mà không có kết quả
  thật. Nếu chạy qua builder trong Actions (WP-004), dán log của lần chạy đó.
- **Đọc `ci-report.txt`** của commit để biết kết quả, không suy đoán từ nội dung code.
- **Mâu thuẫn thì dừng**, nêu chính xác hai chỗ mâu thuẫn, không tự chọn một bên.
- **Ràng buộc chặn thì theo D-14**: dừng, viết ba dòng, chờ duyệt.

## Quy ước code

- TypeScript. Không `any` trừ khi có comment giải thích.
- Mọi stage đọc/ghi artifact qua interface trong `engine/io/`, không gọi thẳng GitHub API.
- Mọi lời gọi provider qua interface trong `engine/providers/`. Lựa chọn provider cụ thể nằm
  ở Genre Pack hoặc Channel Pack.
- Mọi stage ghi một dòng vào `pipeline/runs.jsonl` khi kết thúc, theo `run-log.schema.json`,
  **gồm `costUsd`**.
- Mọi stage validate đầu ra theo contract **trước khi** ghi.
- **Không viết logic dừng-vì-chi-phí** vào stage. Xem D-13.
- Khoảng số của thể loại (số beat, số scene, số từ, thời lượng) **đọc từ**
  `genres/{genre}/format-spec.json` mục `limits`, không hardcode và không nằm trong contract.

## Định dạng báo cáo cuối task

1. **Đã làm gì** — liệt kê hành động, không diễn giải.
2. **Đã kiểm thế nào** — dán kết quả thật.
3. **File đã chạm** — đường dẫn đầy đủ, đối chiếu phạm vi cho phép.
4. **Rủi ro còn lại** — thứ chưa kiểm được, giả định đã dùng, chi phí đã tiêu.
5. **Checkpoint cuối** — tên nhánh, SHA cuối, link PR.


## Gói phát triển nhanh — D-22

Áp dụng D-22 cho FS22-20260914 khi chủ dự án cấp quyền ghi/CI của gói.
Không đặt deadline task/job/phase hoặc ngưỡng im lặng gây STOP. Cấp quyền gộp
sửa–kiểm–thu kết quả trong đúng tám file và số lượt được duyệt, không xin lại
cho từng lỗi có thể sửa trong phạm vi. Gate lịch sử chỉ chặn phần phụ thuộc;
không dùng thiếu ZIP run7 để chặn kiểm độc lập mới đã có kênh chứng cứ được duyệt.
Tái dùng tính toàn vẹn đã nghiệm thu trên cùng bytes. B1/B2/Node chưa biết vẫn
ghi chưa biết; chỉ ngoại lệ đúng gói do owner duyệt mới cho phép chạy.
Spec CI phải đạt trên quyết định đã commit trước acceptance; giữ kiểm đúng
commit cuối, toàn bộ correctness/ca âm và owner nghiệm thu. Thu đủ byte chứng cứ
qua frame log và đối soát hash, không coi metadata/success là toàn bộ bằng chứng.
D-22 thay riêng các ràng buộc điều phối/scope/counter/ZIP đã nêu; giữ contracts,
secret, dữ liệu, lịch sử và các quyền merge/provider/ngân sách chưa được cấp.


## Gói FS23-WP001 — D-23

Riêng FS23-WP001, áp dụng D-23 sau khi owner cấp gói. Cấp gộp sửa–kiểm–thu đúng phạm vi; không deadline task/job/phase hoặc ngưỡng im lặng gây STOP. Không xin lại sửa nhỏ đã được duyệt. Commit của chính gói trở thành checkpoint sau kiểm parent/tree; nguồn ngoài gói cần đối chiếu trước ghi. Sáu tài liệu S đóng băng trước code, code theo WP main. Blocker chỉ chặn phần phụ thuộc; hoàn tất phần độc lập và trình delta tối thiểu. Không tự mở quyền settings, merge WP001, provider hoặc ngân sách ngoài grant.


## Nguyên tắc xuyên suốt — triển khai theo kết quả (D-27)

Owner đã duyệt nguyên tắc libfile_742d243927a081919112c4e05fd798a9, SHA256 5f7b978fe9c97faaafab62f9cc025f7d881f4dbafa34ed7ec2336628d7ee01b4. Các mục dưới áp dụng cho điều phối các gói tiếp theo; quyền thực thi/chi phí vẫn theo grant cụ thể. Bảng thẩm quyền ở đầu file không đổi.

## 1. Mục tiêu

Chủ dự án quyết định mục tiêu, mức rủi ro và ngân sách. Agent chịu trách nhiệm thiết kế gói hoàn chỉnh và tự điều phối để đạt kết quả trong quyền đã duyệt. Không chuyển việc quản lý từng commit, từng lỗi nhỏ hoặc từng bước kiểm tra sang chủ dự án.

Giảm vòng lặp vá một điểm, chạy lại, phát hiện lỗi kế tiếp rồi xin thêm quyền. Không cam kết không bao giờ có lỗi; phải giảm lỗi lặp, phát hiện sớm và xử lý được những tình huống đã dự kiến trong cùng gói.

## 2. Một lần duyệt cho một chu kỳ hoàn chỉnh

Mỗi gói phải trình đồng thời: mục tiêu và điều kiện hoàn tất; checkpoint và nguồn; phạm vi thay đổi; quyền đọc/ghi/thực thi; kiểm trước và sau merge; cách thu bằng chứng; xử lý failure; số vòng sửa có căn cứ; ngân sách và cách đếm thực tế; nghiệm thu và bàn giao.

Chu kỳ cần bao phủ triển khai → kiểm tra → sửa lỗi → kiểm lại → merge → hậu kiểm → nghiệm thu. Khi cần sửa sau merge, phương án và quyền tương ứng phải được trình trong gói từ đầu. Không mặc định rằng mọi lỗi chỉ được phép sửa trước merge.

Sau khi gói được duyệt, agent tự thực hiện các việc cần thiết trong phạm vi đó, không xin lại quyền đã có. Không tách thành nhiều lượt phê duyệt chỉ vì đổi bước công cụ, chuyển chat hoặc phát sinh lỗi nhỏ thuộc phạm vi đã duyệt.

## 3. Sửa theo nguyên nhân và kiểm toàn bộ luồng

Mỗi lỗi phải được đối chiếu với các đường gọi, thành phần và giả thiết có cùng nguyên nhân. Rà gộp lỗi đã quan sát, lỗi tương tự còn tiềm ẩn và lỗ hổng kiểm thử; phân biệt rõ ba loại, không gọi nguy cơ là failure đã xảy ra.

Phương án phải đi hết luồng từ đầu vào, runtime, xác thực/quyền, điều phối, thao tác có tác dụng phụ, thu bằng chứng, validation đến nghiệm thu. Chỉ rõ phụ thuộc giữa các phần và điểm có thể thất bại giữa chừng.

Mock, kiểm cú pháp và typecheck không thay cho kiểm tích hợp thực tế. Chứng minh các ranh giới I/O trong môi trường phù hợp trước merge khi có thể làm an toàn và đã được duyệt. Phần bắt buộc kiểm sau merge phải được khai rõ cùng cách xử lý failure.

Mỗi lỗi cần một bằng chứng xác định nguyên nhân và kiểm hồi quy phù hợp. Không chạy lại thao tác đã bị chặn khi chưa có thay đổi liên quan, bằng chứng mới hoặc quyền phục hồi phù hợp. Giữ nguyên kết quả cũ, không xóa failure để làm đẹp báo cáo.

## 4. Giới hạn phải bảo vệ một rủi ro cụ thể

Trong phương án, mỗi giới hạn phải có lý do, cách đo và cách xử lý khi chạm giới hạn. Không tự đặt trần commit, số file, số lượt đọc hoặc chia pha chỉ để dễ đếm nếu chúng không bảo vệ rủi ro cụ thể.

| Loại giới hạn | Cách xử lý trong gói tổng thể |
|---|---|
| Phạm vi file/commit/vòng sửa | Chọn phạm vi đủ cho nhóm nguyên nhân và hồi quy; giải thích phần cần đóng băng. Tránh một giới hạn quá hẹp buộc xin nới cho từng sửa cần thiết. |
| CI/run/job/artifact | Tính từ graph và sự kiện thật, gồm failure và skipped theo quy tắc rõ; dành phần dự phòng cho sửa/kiểm lại đã được duyệt. Dự phòng không tự cấp quyền rerun hoặc tác vụ ngoài gói. |
| Ngân sách/tài nguyên | Nêu số được duyệt, cơ sở và phần chưa biết. Phân biệt dự phòng, hard cap và actual; không suy tiền còn dư khi thiếu bằng chứng. |
| Trước/sau merge | Khai quyền và phương án phục hồi ở cả hai phía khi mục tiêu đòi hỏi; tránh cấm sửa sau merge một cách máy móc. |
| Thời gian | Không dùng deadline task/job/phase hoặc ngưỡng im lặng làm STOP. Ước lượng tiến độ không trở thành quyền bỏ gate. |

Agent chủ động đề nghị bỏ hoặc thay giới hạn chỉ tạo thủ tục ngay trong một gói duyệt. Không đợi chạm từng giới hạn rồi xin nới lẻ tẻ.

## 5. Khi nào cần chủ dự án quyết định lại

Chỉ trình lại phần vượt quyền thực tế: đổi mục tiêu hoặc mở rộng phạm vi đáng kể; tăng ngân sách hay tài nguyên ngoài gói; mở quyền nhạy cảm; hành động có hậu quả chưa được duyệt; checkpoint thay đổi bởi nguồn ngoài gói; hoặc điều kiện bắt buộc chưa thể đáp ứng bằng phương án được phép.

Mỗi blocker phải nêu: bằng chứng, phần bị ảnh hưởng, phần độc lập còn làm được, phương án tối thiểu và đúng quyền/chi phí còn thiếu. Hoàn tất phần độc lập đã được phép trước khi đề nghị quyết định bổ sung. Không bắt đầu lại công việc đã hoàn tất và có bằng chứng còn hiệu lực.

Không coi nguyên tắc tự chủ là quyền vượt access control, thay credential/settings, rollback, sử dụng provider hoặc tiêu thêm tiền. Những hành động đó vẫn theo grant cụ thể.

## 6. Tiêu chí báo hoàn tất

Phân biệt rõ: code đã viết, code đã merge, CI xanh, kiểm tích hợp đạt, nghiệm thu kỹ thuật đạt và owner đã nghiệm thu. Không dùng một trạng thái để thay cho trạng thái sau.

Báo cáo kết thúc gồm năm mục: đã làm gì; đã kiểm thế nào bằng kết quả thật; file đã chạm; rủi ro/chi phí/phần chưa kiểm; checkpoint cuối và bước tiếp theo. Thu được bằng chứng cả khi failure, cancellation hoặc cleanup không hoàn tất; báo đúng phần thiếu.

Lưu kết quả và định danh bền vững để chat sau tự lấy. Không yêu cầu chủ dự án tìm, tải hoặc upload lại hồ sơ đã được lưu và định danh. Chuyển chat không làm mất quyền đã duyệt, cũng không tự cấp quyền mới.


Riêng FS24-D, owner đã cấp trọn D-27: sửa/kiểm trước và sau merge trong scope/counters, không xin lại quyền từng thao tác. WP002todo tới owner nghiệm thu checkpoint cuối. Không dùng bảng quyền ở candidate để tự nới grant hoặc sửa pins lịch sử.
