# Sổ rủi ro

Cột **Dấu hiệu sớm** quan trọng hơn cột giảm thiểu: nó là thứ được theo dõi.

| Mã | Rủi ro | Xác suất | Tác động | Dấu hiệu sớm | Giảm thiểu |
|---|---|---|---|---|---|
| R1 | Kênh bị xếp vào nhóm nội dung sản xuất hàng loạt, mất khả năng kiếm tiền | Cao | **Rất cao** | Chỉ số biến thiên tụt; nhiều tập liên tiếp cùng khuôn tiêu đề hoặc cùng bố cục | Bốn cơ chế ở quyết định D-08. Chỉ số biến thiên chặn tập mới khi vượt ngưỡng |
| R2 | Con số phái sinh sai, bị phát hiện công khai | Trung bình | **Rất cao** | Lượt tính lại độc lập lệch quá dung sai | Kiểm bốn cấp ở `14-quantitative-core.md` mục 2; mô hình có khoảng giá trị hợp lệ; công bố bảng tính |
| R3 | Thesis Engine không sinh đủ thesis đạt chuẩn | **Cao** | **Rất cao** | Bank tụt dưới 20 mục; dưới 15 là ngưỡng chặn; tỷ lệ bác ở Gate 1 tăng | Năm nguồn độc lập; đo nguồn nào cho chất lượng cao nhất; giảm nhịp thay vì hạ chuẩn |
| R4 | Kiến trúc canvas không khả thi về hiệu năng | Trung bình | Cao | Spike WP-003 chạm ngưỡng | Spike trước khi cam kết; có sẵn phương án ngữ pháp chuyển động thay thế |
| R5 | Chuyển động bị giật ở tần số khung đã chọn | Trung bình | Cao | Người xem bản nháp thấy khó chịu mà không nói được vì sao | WP-003 so ba cấu hình cạnh nhau trước khi chốt |
| R6 | Dữ liệu bị điều chỉnh sau công bố, tập cũ thành sai | **Cao** | Trung bình | Cảnh báo thay đổi chuỗi dữ liệu | Kho ảnh chụp có phiên bản; workflow tự mở issue liệt kê tập bị ảnh hưởng |
| R7 | Mâu thuẫn số liệu giữa các tập | Cao | Trung bình | Hai tập trích cùng chuỗi với hai giá trị | Đọc từ kho ảnh chụp, không gọi API trực tiếp |
| R8 | Kịch bản đọc không như người bản xứ viết | **Cao** | Cao | Bình luận về cách diễn đạt; retention 30 giây thấp bất thường | Từ điển kênh; lượt soát bản địa; đọc thành tiếng 60 giây đầu ở Gate 2 |
| R9 | Ngưỡng sai vì bỏ qua tham số vùng miền | Cao | Cao | Bình luận nêu ngoại lệ theo bang | Sensitivity Pass bắt buộc quét mọi tham số biến thiên theo địa lý; khai `geoScope` |
| R10 | Phụ thuộc nền tảng agent cho **cả xây dựng lẫn vận hành** | Trung bình | **Cao** | Đổi giới hạn, đổi giá, đổi cách truy cập | Mọi thứ agent gọi là workflow trong repo; WP viết độc lập với agent cụ thể |
| R11 | Giọng đọc bị gỡ, đổi điều khoản, hoặc tăng giá | Trung bình | Cao | Thông báo của nhà cung cấp | Kiểm điều khoản thương mại **trước** khi cam kết; chọn giọng có bản tương đương ở nhà cung cấp thứ hai |
| R12 | **Bỏ dở trước khi có thành quả nhìn thấy được** | **Cao** | **Rất cao** | Nhiều tuần trôi qua không có sản phẩm nhìn thấy được; số file code tăng nhanh hơn số tính năng chạy được | Mỗi mốc có sản phẩm nhìn thấy; DoD Mốc 4 chặn ở 25 file code; điểm dừng viết trước |
| R13 | Chi phí vượt mốc | Trung bình | Trung bình | Chi phí/tập tăng ba tập liên tiếp | Ba lớp mềm ở D-13: đo `costUsd`, cảnh báo bằng issue, orchestrator ngừng mở tập mới. **Không có trần cứng trong code** — lưới an toàn còn lại là hạn mức chi tiêu đặt ở nhà cung cấp API, nằm ngoài repo |
| R14 | Vượt quota API nền tảng | Trung bình | Trung bình | Job đỏ vào ngày dồn việc | Bảng ngân sách quota theo stage |
| R15 | Mất tài sản do sự cố tài khoản | Thấp | **Rất cao** | — | Workflow sao lưu artifact văn bản sang nơi thứ hai |
| R16 | Logic nhà máy nằm trong hội thoại thay vì trong repo | **Cao** | Cao | Bài kiểm "xoá hội thoại" thất bại | Luật ở guardrail 12; bài kiểm hằng tháng |
