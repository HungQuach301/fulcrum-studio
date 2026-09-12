# Chuẩn chất lượng hình ảnh

## Nguyên tắc gốc: thiết kế một lần, sinh nhiều lần

Chất lượng hình ảnh **không** được quyết ở khâu sinh từng tập. Nó được quyết ở khâu thiết kế
layout. Một layout đạt chuẩn sẽ cho ra 200 khung đạt chuẩn; một layout tạm được sẽ cho ra 200
khung tạm được, và không mô hình nào cứu được.

Đó là lý do Layout Gallery là cổng chặn, và là lý do được phép nới ràng buộc hạ tầng cho
riêng khâu này.

## Tám tiêu chí chấm một layout

Chấm từng layout, không chấm cả tập. Đạt là **8/8**. Không có trạng thái "tạm chấp nhận".

| # | Tiêu chí | Cách kiểm |
|---|---|---|
| 1 | Đọc được ở 25% kích thước | Thu nhỏ ảnh chụp, còn đọc được số chính không |
| 2 | Có một điểm nhìn rõ ràng | Nhìn 1 giây, mắt dừng ở đâu |
| 3 | Khoảng âm đủ | Không có vùng nào chật cứng |
| 4 | Thứ bậc ba mức | Chính, phụ, chú thích — phân biệt được bằng cỡ và độ đậm |
| 5 | Chịu được dữ liệu xấu nhất | Thử với số dài nhất, nhãn dài nhất, nhiều mục nhất |
| 6 | Không lệ thuộc màu để truyền nghĩa | Chuyển sang thang xám vẫn hiểu |
| 7 | Có chỗ cho chuyển động | Layout tĩnh cứng nhắc không dựng động được |
| 8 | Nhất quán với token của kênh | Không có giá trị nào ngoài bảng token |

## Ba bộ dữ liệu mẫu bắt buộc

Mỗi layout phải được chấm với ba bộ: bình thường · cực trị (số rất lớn, nhãn rất dài) ·
thiếu (một vài giá trị rỗng).

Layout chỉ đẹp với dữ liệu bình thường là layout chưa xong.

## Kiểm hồi quy

Layout dùng chung token và lưới. Sửa một layout có thể vỡ layout khác. Mỗi thay đổi phải
chạy lại bộ ảnh chuẩn và so pixel-diff.
