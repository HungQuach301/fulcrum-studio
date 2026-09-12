# Lõi định lượng

Đây là phần khác biệt nhất của dự án, phần có giá trị thương mại cao nhất, và là điều kiện
tiên quyết của quyết định D-08 (người chỉ phê duyệt).

Bốn thành phần dưới đây là **một hệ thống nhìn từ bốn góc**, không phải bốn dự án.

---

## 1 · Kho ảnh chụp dữ liệu

**Ba vấn đề nó giải:**

| Vấn đề | Biểu hiện nếu không có |
|---|---|
| Mâu thuẫn liên tập | Hai tập trích cùng chuỗi ở hai thời điểm cho hai số khác nhau. Với kênh mà định vị là "mọi số đều có nguồn", khán giả sẽ phát hiện |
| Dữ liệu bị điều chỉnh sau công bố | Số liệu việc làm được điều chỉnh; giới hạn hưu trí và bậc thuế đổi mỗi năm. Thư viện "thường xanh" trở thành nợ uy tín |
| Chi phí lặp | Gọi lại cùng chuỗi cho mỗi tập |

**Cấu trúc:** `/data/snapshots/{publisher}/{seriesId}/{asOfDate}.json` theo
`snapshot.schema.json`. Nghiên cứu đọc từ kho trước, chỉ gọi API khi thiếu.

**Cơ chế phát hiện thay đổi:** một workflow định kỳ so ảnh chụp mới với ảnh chụp gần nhất.
Khi một chuỗi thay đổi vượt ngưỡng khai trong schema, **tự mở issue liệt kê mọi tập có
`claimId` phụ thuộc chuỗi đó**. Đây là cơ chế thu hồi và đính chính — không có nó, sẽ không
ai biết tập nào cần gỡ.

---

## 2 · Thư viện mô hình

**Vấn đề nó giải:** fact-checker đối chiếu claim với URL. Một **con số phái sinh** — thứ tạo
ra toàn bộ khác biệt của kênh — chưa từng được công bố nên **không có URL để đối chiếu**.
Không ai kiểm phép tính. Và bảng tính được công bố công khai kèm lời mời khán giả kiểm.

Rủi ro kép: ngách này có hậu quả thật cho người xem, và một lỗi công thức bị phát hiện công
khai gây thiệt hại lớn hơn một số trích dẫn sai — vì nó là lỗi của mình.

**Cấu trúc:** `/models/{genre}/M-{NNN}.json` theo `model.schema.json`: giả định, công thức,
khoảng giá trị hợp lệ từng tham số, `claimId` đầu vào, phiên bản.

**Kiểm bốn cấp — bắt buộc.** "Gọi lại cùng một hàm" không phải kiểm độc lập: hàm xác định thì
lượt hai chắc chắn khớp lượt một. Và để một mô hình ngôn ngữ tự tính lại bằng lời cũng không
phải kiểm: bên yếu hơn về số học đang kiểm bên mạnh hơn, nên "lệch" thường là mô hình ngôn ngữ
sai, còn "khớp" không chứng minh điều gì. Bốn cấp dưới đây xếp theo độ tin cậy giảm dần.

| Cấp | Cách kiểm | Bắt buộc khi |
|---|---|---|
| 1 | **Ca kiểm tay** — bộ đầu vào/đầu ra do người tính tay, commit kèm mô hình | Mọi mô hình, không ngoại lệ |
| 2 | **Đối chiếu công cụ công khai** — so với một máy tính công khai tương đương | Khi tồn tại công cụ như vậy |
| 3 | **Triển khai thứ hai** — viết lại mô hình bằng ngôn ngữ hoặc công cụ khác, so kết quả | Mô hình có `geoVarying: true` hoặc được dùng ở hơn 3 tập |
| 4 | **Mô hình ngôn ngữ kiểm giả định và đơn vị** — KHÔNG kiểm số học | Mọi mô hình |

Lệch quá dung sai khai trong mô hình ở bất kỳ cấp nào → chặn pipeline.

Nếu dùng cấp 4, **phải là nhà cung cấp khác** với mô hình chính (`LLM_API_KEY_VERIFIER`).
Khoá API riêng tạo độc lập về hạn mức và nhật ký; nó **không** tạo độc lập về suy luận nếu
cùng một mô hình đứng sau.

**Tái dùng:** mô hình đã kiểm được dùng qua nhiều tập mà không kiểm lại, trừ khi phiên bản
đổi. Đây là tài sản cộng dồn — và là thứ có giá trị nhất nếu bán hệ thống.

---

## 3 · Sensitivity Pass

**Vấn đề nó giải:** phần lớn ngưỡng trong tài chính cá nhân Mỹ **không có đáp án toàn quốc**.
Thuế bất động sản dao động nhiều lần giữa các bang; một số bang không có thuế thu nhập bang.
Đủ để đảo chiều một ma trận ngưỡng. Người không sống ở đó không biết tham số nào đủ lớn để
đảo kết luận.

**Giải pháp: đừng đoán tham số, quét toàn bộ khoảng giá trị của nó.**

Thay vì *"mua nhà tốt hơn thuê nếu trả trước trên X%"*:

> *"Ngưỡng đảo chiều là X% — nhưng chỉ ở phần lớn các bang. Ở bang có thuế bất động sản trên
> ngưỡng Y, ngưỡng dịch lên Z%, và dưới mức đó thuê thắng bất kể lãi suất. Đây là bảng đầy
> đủ 50 bang. Đây là mô hình."*

**Đạt bốn thứ cùng lúc:**

| Đạt được | Vì sao |
|---|---|
| Bù hiểu biết bản địa | Không cần biết bang nào đặc biệt — quét hết thì bang đặc biệt tự lộ ra |
| Con số phái sinh chưa ai công bố | Đúng điều kiện bằng chứng công sức |
| Bằng chứng công sức rất khó sao chép | Không kênh nào chạy phân tích độ nhạy toàn bang |
| Tài sản cộng dồn | Vào thư viện mô hình, dùng chung nhiều kênh |

Và quan trọng nhất: **đây là việc của máy**, tăng chất lượng mà không tăng giờ người.

**Đặc tả:** xem S05b trong `10-production-spec.md`.

---

## 4 · Thesis Engine

**Vấn đề — bằng số:**

| | Số |
|---|---|
| Nghi thức nạp thủ công, nếu có | 3–5 thesis/tuần = 12–20/tháng |
| Nhịp 30 tập/tháng, một kênh | 30 thesis/tháng |
| Nhịp 30 tập/tháng, ba kênh | 90 thesis/tháng |
| Ràng buộc cứng | Bank <15 mục khả dụng → ngừng nhận tập mới |

Cung đã thấp hơn cầu ngay cả khi có nghi thức thủ công. Với quyết định D-08 (người không
viết), cung về 0.

**Nút thắt thật của mở rộng là thesis — không phải render, không phải chi phí, không phải
gate người.** Nhịp bền vững của nhà máy bằng tốc độ Thesis Engine sinh thesis đạt chuẩn.

**Năm nguồn, xếp theo chất lượng, tất cả đều là bài toán dữ liệu:**

| # | Nguồn | Hạ tầng cần |
|---|---|---|
| 1 | Mâu thuẫn giữa hai nguồn dữ liệu về cùng một hiện tượng | Kho ảnh chụp |
| 2 | Ngưỡng ẩn: chạy số qua nhiều mức, tìm điểm đảo chiều | Sensitivity Pass |
| 3 | Câu hỏi nhiều người tìm mà chưa ai trả lời bằng số | Corpus đối thủ |
| 4 | Cụm bình luận lặp lại | Gom và phân cụm bình luận |
| 5 | Lịch công bố số liệu vĩ mô sắp tới | Lịch phát hành của các nhà cung cấp |

Năm nguồn triển khai riêng biệt, mỗi nguồn một module, để **đo được nguồn nào cho chất lượng
cao nhất** — đó là thông tin quý nhất của Mốc 3.

**Output:** một mục theo `thesis.schema.json`.

**Ràng buộc vận hành:** bank luôn ≥15 mục `available`. Dưới ngưỡng thì ngừng nhận tập mới và
mở issue. Mọi thesis phải có `contradicts` không rỗng — không có niềm tin bị thách thức thì
không phải thesis.

---

## Vì sao bốn thành phần này đi cùng nhau

```
Kho ảnh chụp ──┬──> Sensitivity Pass ──> điểm đảo chiều ──┐
               │                                          ├──> Thesis Engine
               ├──> Phát hiện mâu thuẫn liên nguồn ────────┤
               │                                          │
Corpus đối thủ ┴──> Câu hỏi chưa ai trả lời ───────────────┘
                              │
Thư viện mô hình <────────────┴──> Bảng tính công bố ──> bằng chứng công sức
```

Không thể làm Thesis Engine mà không có kho dữ liệu. Không thể kiểm con số phái sinh mà
không có thư viện mô hình. Không thể bù hiểu biết bản địa mà không có Sensitivity Pass.
Đó là lý do cả bốn nằm chung một mốc.
