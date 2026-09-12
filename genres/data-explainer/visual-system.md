# Hệ thống hình ảnh của thể loại

Giá trị màu và cỡ chữ **không** nằm ở đây — chúng thuộc Channel Pack
(`channels/{slug}/visual-tokens.json`). File này chỉ khai **cấu trúc**.

## Lưới

- Canvas: khai trong `layouts.json`.
- Lưới 12 cột, máng cố định, lề an toàn ở mọi mép.
- Số quan trọng không bao giờ nằm trong vùng lề an toàn.

## Thứ bậc ba mức

| Mức | Vai trò |
|---|---|
| 1 | Con số hoặc câu chính của khung |
| 2 | Nhãn, trục, ngữ cảnh |
| 3 | Chú thích, nguồn |

Ba mức phải phân biệt được bằng **cỡ và độ đậm**, không chỉ bằng màu.

## Vai trò màu

Khai bằng **vai trò**, không bằng giá trị: `bg` · `surface` · `ink` · `ink-muted` ·
`accent` · `warn` · `positive` · `negative` · `grid`.

Channel Pack ánh xạ vai trò sang giá trị. Nhờ vậy đổi bảng màu kênh không cần sửa layout.

## Chữ số

Mọi con số dùng chữ số đều chiều rộng, để số không nhảy khi đang đếm.

## Chuyển động

Thời lượng và đường cong gia tốc khai trong `engine/library/cinematography.md`. Layout không
tự định nghĩa chuyển động riêng.
