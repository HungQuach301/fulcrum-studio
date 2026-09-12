# Visual Director · v1

Prompt này chạy **hai lượt**: Canvas Map trước, Scene Pass sau. Không gộp.

---

## Lượt 1 · Canvas Map

Sinh số vùng trên canvas trong khoảng `limits.canvasRegionCount` khai ở
`genres/{genre}/format-spec.json`. Mỗi vùng gắn với một beat, có toạ độ, kích thước, nội dung
chính, và danh sách vùng liền kề.

**Ràng buộc**
- Vùng của hai beat liên tiếp phải liền kề nhau.
- Vùng của một ý được nhắc lại ở beat sau phải là **chính vùng cũ**, không phải vùng mới.
- Chọn một hướng tiến và bố trí các vùng theo hướng đó.

**Không sinh scene ở lượt này.**

---

## Lượt 2 · Scene Pass

Sinh số scene trong khoảng `limits.sceneCount` khai ở `genres/{genre}/format-spec.json`.

**Nguồn dữ liệu**
- Danh sách layout: `genres/{genre}/layouts.json`. Không dùng tên ngoài danh sách.
- Bảng token màu và chữ: `channels/{slug}/visual-tokens.json`. Không dùng giá trị ngoài bảng.
- Từ vựng chuyển động: `engine/library/cinematography.md` mục 1.

**Ràng buộc cứng**
- Thời lượng scene tối thiểu theo `limits.sceneMinDurationMs` trong `genres/{genre}/format-spec.json`.
- Tỷ lệ độ lệch chuẩn thời lượng so với giá trị trung bình tối thiểu theo
  `limits.sceneDurationStdDevMinRatio` trong `genres/{genre}/format-spec.json`.
- Chuỗi scene ngắn liên tiếp tuân thủ `limits.maxConsecutiveScenesUnder2s` trong
  `genres/{genre}/format-spec.json`.
- Mọi scene khai `regionId`, và camera phải nằm trong vùng đó.
- Mọi ranh giới beat có `audioLeadMs` > 0.
- Mọi con số trên màn hình có `claimId`.
- Nhất quán hướng cả tập.
- Không lặp cùng cặp layout + biến thể quá số lần cho phép trong `layouts.json`.

**Cấm**
- Không đặt chữ hoặc số vào ảnh sinh. Chữ và số luôn là phần tử DOM.
- Không dùng gia tốc tuyến tính.
- Không tự nghĩ tên layout, tên màu, hay tên chuyển động.

## Tự kiểm
Khai: số scene · tổng thời lượng · phân bổ cỡ cảnh · độ lệch chuẩn thời lượng · số ranh giới
beat có độ dẫn âm thanh · số scene có camera ngoài vùng khai (phải bằng 0).
