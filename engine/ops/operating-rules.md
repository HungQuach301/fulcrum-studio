# Operating Rules

Luật vận hành của dự án. Nằm trong thứ tự đọc bắt buộc.

## 1 · Vòng kiểm cục bộ bắt buộc

Agent có một container Linux với Node, npm, git. Trước khi ghi bất cứ thứ gì lên GitHub:

1. Clone repo về container, sửa file ở đó.
2. Chạy `npm ci` và `npx tsc --noEmit`. Cả hai phải xanh.
3. Kiểm mọi file `.json` đã tạo hoặc sửa đều parse được.
4. Chỉ ghi lên GitHub khi ba bước trên xanh.

`npx tsx` có thể fail với `listen EPERM` vì container cấm mở Unix socket ở `/tmp`. Thử theo
thứ tự: `TSX_TMPDIR=/tmp/tsxrun npx tsx ...`; rồi `node scripts/validate.ts`; rồi biên dịch
bằng `tsc --outDir` rồi chạy `node`. Cách nào chạy được thì ghi vào báo cáo và dùng cho
mọi task sau.

Cách chạy validate tại container đã kiểm chứng: biên dịch bằng tsc với --noEmit false rồi
chạy bằng node với NODE_PATH trỏ tới thư mục output. Ba cách dùng tsx đều lỗi listen EPERM.

**Cục bộ xanh không bảo đảm CI xanh.** Container chạy Node 24, CI chạy Node 20. Vòng kiểm
cục bộ là bộ lọc trước, rẻ và nhanh; **CI vẫn là nơi kiểm có thẩm quyền**. Không được
tuyên bố một WP đã done dựa trên kết quả cục bộ.

## 2 · Đường đọc và đường ghi

**Đọc:** clone về container, hoặc GitHub plugin. Log của một job cụ thể đọc bằng plugin —
đã đo được 284 dòng trong 4,6 giây. Không dùng `gh`, container không có nó.

**Ghi:** GitHub plugin. `git push` từ container **không hoạt động** vì thiếu credential.
Không thử nhúng token vào URL remote.

**Bằng chứng hợp lệ chỉ có ba loại:** log của một Actions run, nội dung file trong repo, và
kết quả lệnh chạy trong container hoặc runner. Không tự viết bộ trích xuất, không đóng gói
artifact để tự đọc lại, không tạo định dạng frame hay manifest riêng.

## 3 · Hai mức dừng

| Mức | Khi nào | Agent làm gì |
|---|---|---|
| Hỏi trong PR | Hai cách đọc đều hợp lý, chọn sai thì sửa rẻ | Chọn một, mở PR nháp, nêu câu hỏi trong mô tả, **không chờ trả lời mới làm tiếp** |
| DỪNG | Chạm contract, chạm quyết định, ràng buộc kiến trúc chặn, hoặc chọn sai thì tốn tiền hoặc không hoàn tác được | Dừng thật, viết ba dòng theo D-14 |

Điều kiện nào liệt kê tường minh trong mục 5b của một WP thì luôn là mức DỪNG.

Mức "Hỏi trong PR" không bao giờ dùng để: tạo file ngoài Phạm vi cho phép, thêm dependency,
thêm workflow, hay tạo khái niệm quy trình mới. Bốn việc đó luôn là DỪNG.

## 4 · Ràng buộc áp cho mọi task

Mặc nhiên áp, kể cả khi task không nhắc lại.

**Cổng vào — chặn PR, không chặn việc đang chạy**
- Chỉ đuôi `.ts .json .jsonl .md .yml .gitkeep`.
- File trong `.github/workflows/` tối đa 12 KB.
- Không tạo thư mục cấp một mới.

**Cảnh báo — in ra, không chặn**
- Số file mới và tổng byte thêm vào.
- Số workflow run đã dùng cho task.

PR lớn không sai; PR lớn chỉ làm revert đắt hơn.

**Không có trần ngắt giữa chừng.** Không trần thời gian chạy, không trần chi phí, không
trần run cứng. Một job bị giết nửa chừng để lại trạng thái bẩn và tốn một vòng dọn, đắt
hơn thứ nó tiết kiệm. `timeout-minutes` giữ vì nó chống job treo vô hạn.

**Không làm**
- Không tạo file ngoài Phạm vi cho phép, kể cả file tạm hay ghi chú.
- Không thêm dependency npm.
- Không tạo workflow mới ngoài cái task nêu đích danh.
- Guardrail 28: không tạo khái niệm quy trình mới.

**Báo cáo cuối — bảy dòng**
1. Đã làm gì
2. Output thật của `npm ci` và `tsc` tại container, và cách chạy validate nào thành công
3. File đã chạm, đối chiếu từng đường dẫn với Phạm vi cho phép
4. Số file mới, tổng byte thêm, số workflow run đã dùng
5. Rủi ro còn lại
6. Chỗ nào tôi phải diễn giải khác chỉ dẫn, và vì sao. Không có thì ghi "không có"
7. Checkpoint cuối: tên nhánh, SHA, link PR

Dòng 6 là dòng quan trọng nhất. Nó buộc agent tự khai chỗ nó đã tự quyết.

## 5 · Sửa một lần, rồi hoàn tác

Khi một thay đổi làm CI đỏ, agent được sửa **một lần**, và chỉ khi nêu được nguyên nhân gốc
trong một câu. Không nêu được thì **revert**, không sửa tiếp.

Revert là hành động rẻ, đúng, được khuyến khích. Không cần WP, không cần quyết định, không
cần lý do. Sau revert, WP quay về `todo` kèm nhãn `needs-human`.

## 6 · Bốn dấu hiệu đi chệch

| # | Dấu hiệu | Ngưỡng |
|---|---|---|
| 1 | Một WP cần hơn ba PR để đóng | PR thứ tư là dấu hiệu đặc tả sai, không phải code sai |
| 2 | Xuất hiện danh từ mới trong quy trình mà repo không có | Bất kỳ lần nào |
| 3 | Kích thước một file kiểm chứng vượt file nó kiểm chứng | Bất kỳ lần nào |
| 4 | Chủ dự án phải can thiệp quá hai lần cho một WP mechanical | Lần thứ ba là dấu hiệu WP thiếu thông tin |

Câu hỏi hằng tuần: **xoá hết lịch sử chat, repo này chạy lại được không?**

## 7 · Thêm guard mới

Một guard chỉ được thêm sau khi thất bại nó ngăn đã xảy ra **ít nhất một lần trong chính
dự án này**. Guard cho tương lai giả định thì ghi vào `15-open-defects.md` và chờ.

Luật này áp cho cả chủ dự án, không chỉ agent.

## 8 · Ba nguyên tắc không thay đổi được, kể cả qua D-14

1. Logic nằm trong repo, không nằm trong lịch sử hội thoại.
2. Người quyết định, máy sản xuất.
3. Mọi con số có nguồn hoặc có mô hình.
