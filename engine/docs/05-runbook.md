# Sổ tay vận hành

## Đường chuẩn một tập

| Bước | Ai | Thời gian |
|---|---|---|
| 1. Kích hoạt khối Hoạch định | Agent | máy chạy |
| 2. **Gate 1** — chọn 1 trong 5 thesis, hoặc bác tất cả | **Người** | ≤2 phút |
| 3. Kích hoạt khối Sáng tạo | Agent | ~30 phút máy |
| 4. **Gate 2** — xem bảng kiểm, nghe 60 giây đầu, đọc ma trận ngưỡng | **Người** | ≤5 phút |
| 5. Kích hoạt khối Sản xuất | Agent | ~90 phút máy |
| 6. **Gate 3** — xem bản dựng, spot check | **Người** | ≤5 phút |
| 7. Kích hoạt khối Phát hành | Agent | máy chạy |
| 8. Thao tác sau đăng | **Người** | ≤8 phút |

## Bước 8 gồm những gì

1. Đặt điểm chèn quảng cáo theo giá trị đã tính ở khối Sáng tạo — thao tác qua giao diện
   Studio, không có API cho việc này với kênh thường.
2. Công bố bảng tính mô hình, dán link vào phần mô tả.
3. Nạp ba biến thể thumbnail vào thử nghiệm.
4. Sau 24 giờ: duyệt Analyst's Note do máy soạn, ghim lên đầu.

## Fast Lane

Khi có tập đã chuẩn bị sẵn và cần đẩy nhanh:

- Được rút gọn: Gate 2 chỉ nghe 60 giây đầu và đọc ma trận, bỏ phần cờ vàng nếu fact-check
  không có cờ nào.
- Được gộp: Gate 3 và bước 8 làm trong một lượt.
- **KHÔNG BAO GIỜ được bỏ Gate 1.** Đây là luật tuyệt đối. Gate 1 là điểm duy nhất mà một
  người xác nhận tập này có luận điểm thật. Bỏ nó là bỏ cơ chế chống nội dung khuôn mẫu
  quan trọng nhất.
- **KHÔNG được bỏ** bất kỳ kiểm tra máy nào.

## Khi job đỏ

| Triệu chứng | Nguyên nhân thường gặp | Xử lý |
|---|---|---|
| Fail ở khối Sáng tạo | Nguồn dữ liệu đổi cấu trúc, hoặc rate limit | Đọc `ci-report.txt`, kiểm ảnh chụp gần nhất còn đọc được không |
| Fail ở Preflight | Storyboard vi phạm ràng buộc tĩnh | Đọc `rootCauseStage` trong báo cáo preflight — lỗi thường nằm ở stage trước |
| Fail ở Render | Hết bộ nhớ, hoặc chunk ghép lỗi | Kiểm số worker và số khung mỗi chunk |
| Fail lần thứ hai cùng nguyên nhân | Đặc tả thiếu, không phải code sai | **Dừng.** Mở PR sửa đặc tả trước khi chạy lại |

## Nghi thức hằng tuần

| Việc | Thời gian |
|---|---|
| Xem FPY theo stage trong `pipeline/runs.jsonl` | 10 phút |
| Xem tình trạng Thesis Bank — còn bao nhiêu mục khả dụng | 2 phút |
| Xem chỉ số biến thiên trên cửa sổ 10 tập | 3 phút |
| Xem cảnh báo dữ liệu đã thay đổi, quyết định có cần đính chính tập cũ không | 10 phút |

## Nghi thức hằng tháng

- Kiểm mẫu: đọc toàn văn một tập chọn ngẫu nhiên. Lỗi lộ ra mà bảng kiểm máy không bắt được
  thì bổ sung kiểm đó vào bảng.
- Bài kiểm tài sản: **xoá ngữ cảnh hội thoại, chỉ giữ repo — nhà máy có chạy lại được không?**
- Đối chiếu chi phí thật với ngân sách.
