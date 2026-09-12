# Thiết kế âm thanh

## Bốn lớp

| Lớp | Mức tương đối | Nội dung |
|---|---|---|
| 1 — Lời | 0 dB tham chiếu | Giọng dẫn |
| 2 — Nhạc nền | −18 đến −22 dB | Nền, không giai điệu nổi |
| 3 — Hiệu ứng | −8 đến −14 dB | Nhấn sự kiện trên màn hình |
| 4 — Không khí | khoảng −40 dB | Nền phòng rất nhẹ, chống cảm giác chân không |

Lớp 4 hầu như không ai nghe thấy, nhưng thiếu nó thì âm thanh nghe như máy đọc.

## Tám loại hiệu ứng

`appear` · `count` · `compare` · `threshold-cross` · `reveal` · `dismiss` · `transition` ·
`emphasis`

Mỗi loại có một âm cố định trong cả kênh. Người xem học được nghĩa của chúng.

## Đồng bộ

Lệch giữa hiệu ứng và sự kiện hình ≤60ms. Trên mức đó, người xem cảm nhận được là sai dù
không chỉ ra được.

## Mật độ

Tỷ lệ thời gian có hiệu ứng: 30–40%. Dưới 30% thì nhạt; trên 40% thì mệt.

## Im lặng có chủ đích

Trước mỗi con số quyết định, cắt nhạc nền trong 300–500ms. Đây là công cụ nhấn mạnh mạnh
nhất và rẻ nhất, và nó chỉ hiệu quả khi dùng ít — tối đa ba lần mỗi tập.

## Giọng là nhân dạng

Với kênh không lộ mặt, giọng đọc **chính là** nhân dạng. Hệ quả:
- Chọn một giọng và không đổi.
- Kiểm điều khoản thương mại **trước** khi cam kết.
- Chọn giọng có bản tương đương ở nhà cung cấp thứ hai, hoặc chấp nhận rủi ro mất nhân dạng.
