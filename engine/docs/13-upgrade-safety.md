# An toàn khi nâng cấp

Mục tiêu: thay đổi hệ thống mà không làm hỏng thứ đang chạy được.

## 1 · Đánh phiên bản ba lớp

Brief và episode-state khai `versions` bắt buộc; mọi artifact khác được phép khai `versions`
và kế thừa qua `episodeId` nếu không khai. Bộ phiên bản gồm `engine`, `genre`, `channel`.
Một tập được sản xuất bởi một bộ ba phiên bản cụ thể, và tái lập được bằng bộ ba đó. Xem D-19.

## 2 · Quy tắc ba tập

Không kết luận một thay đổi là cải thiện trước khi có **ít nhất ba tập** dùng phiên bản mới.
Áp cho cả thay đổi prompt lẫn thay đổi layout.

## 3 · Bộ chuẩn hồi quy nội dung

Năm brief cố định. Mọi PR chạm prompt phải chạy lại năm brief và so kết quả.

**So bằng chỉ số máy, không so văn bản.** So văn bản tự do bằng mắt sẽ không được làm ở nhịp
thực. Bộ chỉ số: số thiết bị nội dung · số mục từ điển · tỷ lệ claim có nguồn · độ dài · tỷ
lệ từ hiển thị trên màn hình · phân bổ cỡ cảnh · có điểm đảo chiều hay không.

Chỉ số nào tụt quá dung sai thì PR bị chặn.

## 4 · Kiểm hồi quy thị giác

Mỗi PR chạm layout phải chạy lại bộ ảnh chuẩn của Layout Gallery và so pixel-diff. Khác biệt
phải được duyệt rõ ràng, không được bỏ qua mặc định.

Lý do: layout dùng chung token và lưới. Sửa một layout có thể vỡ layout khác mà không gì
phát hiện được cho tới khi mắt người nhìn thấy.

## 5 · Thay đổi cộng thêm, không thay thế — trừ insight

Layout mới thêm vào, không sửa layout cũ. Prompt mới thêm phiên bản, không ghi đè.

**Ngoại lệ: insight.** Một phát hiện về hành vi nền tảng năm nay có thể sai năm sau. Mỗi mục
insight phải có `asOfDate` và danh sách tập làm bằng chứng. Rà định kỳ, loại bỏ mục quá N
tập mà không được xác nhận lại. Thư viện chỉ cộng thêm sẽ tích tụ quy tắc mâu thuẫn.

## 6 · Đóng băng phiên bản khi đang chạy

Một tập đã bắt đầu pipeline thì chạy hết bằng bộ phiên bản lúc bắt đầu. Nâng cấp giữa chừng
là nguồn lỗi không tái lập được.

## 7 · Contract chỉ đổi qua quyết định

Thay đổi trong `engine/contracts/` bắt buộc: một mục mới trong `02-decisions.md`, một nhãn
`[contract-change]` trong commit, và CI kiểm cả hai.
