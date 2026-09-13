# Fulcrum Studio

**Phiên bản bộ tài liệu:** `2026-09-11`. Đổi khi có bản hợp nhất mới, không đổi khi sửa lẻ.
Danh sách quyết định hiện hành nằm ở cuối `engine/docs/02-decisions.md`; sổ khuyết tật đang
mở ở `engine/docs/15-open-defects.md`.

## Naming
- Repo: `fulcrum-studio`
- Chủ dự án: `HungQuach301`
- Kênh đầu tiên: `us-personal-finance`
- Thể loại đầu tiên: `data-explainer`

## Mục tiêu

Xây một **hệ thống phân tích định lượng có khả năng xuất bản**: nhận dữ liệu công khai từ
nguồn chính thống, tìm ra ngưỡng đảo chiều mà chưa ai công bố, và biến chúng thành video
giải thích có sổ nguồn đầy đủ.

Kênh `us-personal-finance` là **bản triển khai tham chiếu** của hệ thống, đồng thời là kênh
doanh thu. Giá trị dài hạn nằm ở cả hai: bản thân kênh, và bản thân hệ thống.

Hướng thương mại hoá chốt ở Mốc 8, sau khi có 10 tập đạt chuẩn. Hai phương án đang mở:
- Bộ phương pháp, contract và prompt pack, bán như tài sản tri thức.
- Năng lực sản xuất nội dung giải thích định lượng cho tổ chức tài chính, nơi yêu cầu về
  sổ nguồn, kiểm duyệt và truy vết là bắt buộc.

Không chọn hướng SaaS cho nhà sáng tạo cá nhân.

## Điều làm nên khác biệt

Không phải chất lượng hình ảnh, không phải tốc độ sản xuất. Là **điểm đảo chiều**: nơi câu
trả lời đúng thay đổi khi một tham số vượt ngưỡng. Hầu hết nội dung tài chính cá nhân đưa
một đáp án; hệ thống này đưa ra bản đồ đáp án theo tham số, kèm mô hình để người xem tự kiểm.

Điều đó cũng là cách bù cho việc chủ dự án không sống ở thị trường Mỹ: **không đoán tham số
vùng miền, quét toàn bộ khoảng giá trị của nó.**

## Non-goals

1. Không xây thể loại thứ hai trước khi kênh 1 qua Mốc 8.
2. Không viết một dòng code nào phục vụ đa kênh trước Mốc 8. Cấu trúc thư mục và lược đồ
   định danh đã sẵn sàng cho đa kênh; phần thực thi thì không.
3. Không xây UI sản phẩm trước khi có 10 tập đạt chuẩn. Cockpit nội bộ là công cụ dùng một
   lần, xấu cũng được.
4. Không tự động hoá vòng học trước khi có đủ dữ liệu để học.
5. Không tối ưu hoá sớm, trừ hai ngoại lệ đã khai trong quyết định D-06 và D-07 — chúng rất
   đắt để sửa sau.

## Kiến trúc bốn lớp

```
/engine                                    trung tính về thể loại VÀ kênh
/genres/{genre}                            theo THỂ LOẠI
/channels/{slug}                           theo KÊNH
/portfolio                                 dùng chung — ĐÓNG BĂNG tới Mốc 8
/episodes/{channel-slug}/{YYYY-MM-slug}/   artifact từng tập
/models/{genre}/M-NNN.json                 thư viện mô hình định lượng
/data/snapshots/{publisher}/{seriesId}/    kho dữ liệu có phiên bản
/pipeline/                                 trạng thái và nhật ký
```

Quy tắc phân định: một file thuộc Engine **chỉ khi** nó đúng với mọi thể loại và mọi kênh.
Nghi ngờ thì đẩy xuống Genre Pack. Nghi ngờ tiếp thì đẩy xuống Channel Pack.

## Nguyên tắc bất di bất dịch

1. **Contract-first.** Không stage nào được viết trước khi contract của nó tồn tại và
   validate được.
2. **Kiểm ở chỗ rẻ nhất.** Bắt lỗi bằng kiểm tra tĩnh trước khi bắt bằng render nháp, bằng
   render nháp trước khi bắt bằng render đầy đủ, bằng máy trước khi bắt bằng mắt người.
3. **Một task = một mục tiêu = một phạm vi khai trước.**
4. **Agent điều phối, agent không triển khai.** Logic nằm trong repo, không nằm trong lịch
   sử hội thoại. Bài kiểm định kỳ: xoá hết hội thoại, chỉ giữ repo — nhà máy có chạy lại
   được không?
5. **Người quyết định, máy sản xuất.** Người không viết nội dung; người chọn giữa các
   phương án có bằng chứng.
6. **Mọi con số có nguồn hoặc có mô hình.** Không ước lượng, không nội suy, không "khoảng".

## Trạng thái

Mốc 0 đã đóng ở phạm vi tài liệu và cấu hình. Hồ sơ DoD, bằng chứng và các phần
chưa nghiệm thu được ghi trong `engine/ops/backlog.md`.

Mốc 1 chưa bắt đầu. WP-000 là việc tiếp theo; phạm vi và điều kiện thực thi phải
được chủ dự án phê duyệt riêng.
