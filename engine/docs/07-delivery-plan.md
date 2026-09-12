# Kế hoạch triển khai

Theo mốc, không theo lịch. Mỗi mốc có một sản phẩm nhìn thấy được và một DoD kiểm được.

## Mốc 0 · Nạp và rà

Không viết dòng code nào.

1. Nạp toàn bộ bộ tài liệu vào repo theo bốn lô.
2. Chạy task rà mâu thuẫn — chỉ đọc, không sửa.
3. Sửa những gì rà ra.
4. Điền các ô `<ĐIỀN>` không phụ thuộc spike.

**DoD:** đọc lại toàn bộ, không thấy mâu thuẫn giữa các tài liệu. Không ô `<ĐIỀN>` nào còn
lại trừ những ô được đánh dấu chờ kết quả spike.

## Mốc 1 · Hạ tầng xây dựng
WP-000 · WP-001 · WP-002 · WP-004
**Sản phẩm:** giao một WP bằng issue → builder chạy trong Actions → PR tự xuất hiện, CI xanh.
**DoD:** một thay đổi cố tình vi phạm guardrail bị CI chặn, và builder tự sửa được một lỗi
biên dịch mà không cần người dán log.

## Mốc 2 · Xác nhận kiến trúc hình ảnh
WP-003
**Sản phẩm:** ba clip 3 phút xem được, cộng bảng sáu chỉ số.
**DoD:** C4 được chốt và ghi vào `02-decisions.md`.
**Chặn:** kết quả DỪNG thì không sang Mốc 4 mà thiết kế lại ngữ pháp chuyển động.

## Mốc 3 · Lõi định lượng
WP-009 → WP-015
**Sản phẩm:** 20 thesis do máy sinh, mỗi thesis có điểm đảo chiều và bằng chứng mới lạ.
**Bắt buộc làm trước:** WP-009 lập bảng đề tài × tham số × nguồn. Đề tài không có nguồn hợp lệ
thì thay, phát hiện trước khi xây kho.
**DoD:** xem "Cổng Mốc 3" trong `12-success-criteria.md`.
**Chặn:** không đạt thì **dừng dự án tại đây**. Đây là điểm dừng rẻ nhất.

## Mốc 4 · Xưởng hình
WP-020 → WP-022
**DoD:** 5 layout đạt 8/8 tiêu chí. Không có trạng thái "tạm chấp nhận".
**Chống phình:** nếu tới đây đã viết hơn 25 file code, dừng lại và cắt phạm vi.

## Mốc 5 · Vertical slice
WP-030 → WP-045
**Sản phẩm:** một tập hoàn chỉnh đạt 20/20 tiêu chí tầng 1, người chạm đúng ba nút.
**DoD:** FPY của lần chạy đầu được ghi vào nhật ký.

## Mốc 6 · Cockpit nội bộ
WP-050 · WP-051. Chỉ làm nếu vận hành qua agent thực sự chật.

## Mốc 7 · Chạy thử nội bộ — mười tập, chưa đăng
WP-005 · WP-060 → WP-064. Chạy thiết kế thí nghiệm khối 1.
**Đo được ở đây:** FPY theo stage, chi phí thật mỗi tập, thời gian người, chỉ số biến thiên,
chất lượng kỹ thuật.
**KHÔNG đo được ở đây:** RPM, retention, CTR, người đăng ký. Không có dữ liệu khán giả từ
một kho video chưa phát hành. Mọi tiêu chí phụ thuộc khán giả thuộc Mốc 7b.
**DoD:** 10 tập đạt 20/20 tiêu chí tầng 1; FPY và chi phí có số liệu thật.

## Mốc 7b · Pilot có khán giả
Phát hành lô đầu và đo phản ứng thật. Đây là lần đầu tiên dự án chạm thị trường.
**Đo được ở đây:** CTR, retention, nguồn lưu lượng, bình luận, người đăng ký.
**Vẫn chưa đo được:** RPM quảng cáo — chưa qua cổng nền tảng thì con số đó bằng 0 theo
thiết kế, không phải theo kết quả.
**DoD:** có dữ liệu khán giả thật cho ít nhất 5 tập qua đủ cửa sổ 28 ngày.

## Mốc 8 · Rẽ nhánh
Chốt hướng thương mại hoá. Mang 10 tập đi kiểm chứng **trước khi** xây bất cứ thứ gì cho
sản phẩm.
