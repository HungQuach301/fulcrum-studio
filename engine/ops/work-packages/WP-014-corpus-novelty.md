## WP-014 · Corpus đối thủ, kiểm mới lạ và đại lượng nhu cầu

### 0. Phân loại
- `riskClass`: `architectural`
- `branch`: `wp/014`

### 1. Mục tiêu
Xây corpus đối thủ trong hạn mức quota, kiểm mới lạ cho thesis, và cung cấp ba đại lượng
thay thế cho trục nhu cầu của Topic Scoring — với giới hạn của từng thứ được khai rõ trong
chính dữ liệu, không nằm trong ghi chú.

### 2. Input
`channels/us-personal-finance/data-sources.md` nhóm 4 · `engine/contracts/corpus.schema.json` ·
`engine/contracts/novelty-check.schema.json` · `engine/docs/04-nfr.md` mục giới hạn nền tảng

### 2b. Checkpoint trước khi bắt đầu
- WP-002 `done`
- Khoá API nền tảng và `EMBEDDINGS_API_KEY` có trong Secrets
- **Bảng ngân sách quota đã lập** và commit — xem mục 3b

### 3. Output
- `engine/data/corpus.ts` · `engine/data/novelty.ts`
- `scripts/build-corpus.ts` · `scripts/check-novelty.ts`
- `.github/workflows/build-corpus.yml`
- `channels/us-personal-finance/quota-budget.md` — bảng ngân sách theo method
- Ảnh chụp corpus theo `corpus.schema.json` trong `data/corpus/`

### 3b. Ngân sách quota — lập trước khi viết code
Mặc định công bố và nguồn chính thức nằm ở `engine/docs/04-nfr.md`, mục "Quota YouTube —
nguồn công bố và bằng chứng project". Chúng không phải bằng chứng quota của project.

`search.list` và `videos.insert` tính vào hai bucket riêng theo tài liệu công bố; các lời
gọi phụ trợ của corpus và khâu công bố vẫn có thể dùng chung bucket. Không kết luận nút
thắt hoặc hạn mức thực tế của project chỉ từ số mặc định.

Bảng ngân sách phải ghi:

1. Project ID, thời điểm kiểm và bằng chứng đọc hạn mức từ Cloud Console.
2. Mỗi stage/phương thức: bucket hoặc quota metric tương ứng, đơn vị tính và hạn mức
   thực tế của project; tách số tham chiếu công bố khỏi số đã xác minh.
3. Mỗi lần xây corpus: số truy vấn, độ sâu phân trang và tổng số lần gọi, kể cả từng
   trang tiếp theo. Tính phần quota dùng theo ngày và tuần cho từng bucket, giữ phần
   dự phòng tìm kiếm ở mục 5; chỉ kết luận nút thắt từ bảng đã xác minh.

**Hiện chưa có bằng chứng quota project.** Bảng này là đầu ra phải hoàn tất trước khi
viết code của WP-014, không phải ngân sách đã được xác minh ở Mốc 0.

### 3c. Giới hạn phải mã hoá vào dữ liệu, không viết thành ghi chú
1. Corpus là **metadata**: tiêu đề, mô tả, thời lượng, lượt xem, ngày đăng, kênh. API không
   cho tải phụ đề video của người khác. `coverage.contentLevel` bắt buộc ghi `metadata-only`.
2. `contradictingCount = 0` **không** chứng minh mới lạ. Trường `verdict` có giá trị
   `novel-in-corpus`, không phải `novel`, và trường `limitation` bắt buộc có nội dung thật.
3. Ba đại lượng nhu cầu là **proxy**: lượt xem mỗi ngày tuổi, số video cùng đề tài trong 12
   tháng, và gợi ý tự động. Mỗi lần dùng lưu ngày, vùng, ngôn ngữ và thiên lệch đã biết.

### 4. Phạm vi cho phép
`engine/data/corpus.ts` · `engine/data/novelty.ts` · `scripts/build-corpus.ts` ·
`scripts/check-novelty.ts` · `.github/workflows/build-corpus.yml` · `data/corpus/**` ·
`channels/us-personal-finance/quota-budget.md` · một dòng của chính WP này trong
`engine/ops/backlog.md`

### 5. Ràng buộc
- Không lưu bình luận thô hay tên người dùng vào repo. Chỉ tóm tắt cụm và số đếm.
- Không tuyên bố "chưa ai công bố" ở bất kỳ đâu trong output. Chỉ "không thấy trong corpus đã
  kiểm, phạm vi X, ngày Y".
- Dừng khi còn 20% bucket tìm kiếm trong ngày, để dành cho việc khác.
- Không dùng nhiều project để lách hạn mức.

### 5b. Điều kiện dừng
- Bucket tìm kiếm hết trước khi đủ số video mục tiêu → dừng, ghi corpus một phần với
  `coverage` trung thực, **không** giảm chất lượng truy vấn để lấp số

### 6. Acceptance test
1. Xây corpus 50 video từ 5 truy vấn → validate theo `corpus.schema.json`, `coverage` đầy đủ.
2. Kiểm mới lạ cho một thesis giả → trả `novelty-check.schema.json` hợp lệ có `limitation`.
3. **Kiểm âm 1:** thesis không có video nào nói ngược → `contradictingCount = 0` nhưng
   `verdict` **không** tự động là `novel-in-corpus` nếu `similarCount` cao.
4. **Kiểm âm 2:** corpus dưới ngưỡng tối thiểu → `verdict = insufficient-corpus`.
5. **Kiểm âm 3:** thử ghi một bình luận thô vào `data/corpus/` → bị chặn.
6. **Kiểm âm 4:** giả lập hết bucket tìm kiếm → dừng sạch, ghi corpus một phần, không lỗi.

### 7. Definition of Done
Theo `definition-of-done.md`, cộng: `quota-budget.md` có số thật đọc từ Cloud Console, không
phải số chép từ tài liệu.
