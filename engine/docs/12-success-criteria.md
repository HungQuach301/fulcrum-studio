# Tiêu chí thành công và điều kiện dừng

Điều kiện dừng chỉ có giá trị khi được viết **trước**. Đây là bản viết trước.

---

## Cổng Mốc 3 — cổng quan trọng nhất

Không sang Mốc 4 nếu không đạt đủ năm điều.

### Điều kiện đầu vào — phải có trước khi chấm

Năm nguồn thesis chỉ hoạt động được khi kho dữ liệu đủ dày. Đầu vào tối thiểu:

1. Kho ảnh chụp có **≥30 chuỗi** từ **≥4 nhà cung cấp**, cơ chế phát hiện thay đổi hoạt động.
2. **≥8 mô hình** trong thư viện, mỗi mô hình qua được kiểm theo bốn cấp (xem
   `14-quantitative-core.md` mục 2).
3. Sensitivity Pass tìm được điểm đảo chiều thật trên **≥4 mô hình**.
4. Corpus đối thủ có **≥200 video**, kiểm mới lạ tự động chạy được.

### Điều kiện sản lượng

5. Thesis Engine sinh **20 thesis** hợp lệ theo schema, trong đó:
   - **Nguồn 2 (ngưỡng ẩn) và nguồn 3 (câu hỏi chưa ai trả lời) bắt buộc** sinh tổng cộng
     ≥15 thesis.
   - Nguồn 1, 4, 5 **được phép rỗng ở Mốc 3** và đo lại ở Mốc 7. Lý do: nguồn 1 cần nhiều
     cặp chuỗi đo cùng hiện tượng, nguồn 4 cần bình luận, nguồn 5 chỉ cho thời điểm chứ không
     cho luận điểm — bắt cả năm nguồn phải có ở Mốc 3 là đặt dự án vào thế fail vì thiếu
     nguyên liệu chứ không vì ý tưởng kém.

### Cách chấm — chấm mù

Vấn đề của việc chủ dự án chấm trực tiếp: toàn bộ dự án được thiết kế để bù cho việc chủ dự
án không sống ở thị trường Mỹ — nên bước đo này không được để một mình người đó chấm trực
tiếp. Cách chấm là so sánh mù:

1. Tạo **20 thesis đối chứng** từ một mô hình khác, giới hạn "10 phút suy nghĩ", **không cho
   xem dữ liệu của kho ảnh chụp**.
2. **Chuẩn hoá thẻ trước khi trộn.** Cả hai bên viết cùng một khuôn: một câu luận điểm, một
   câu niềm tin bị phản bác, cùng độ dài, **không bên nào hiển thị con số cụ thể**. Nếu một
   bên có số và bên kia chỉ có câu hỏi thì xoá nhãn không làm mù được gì — người chấm nhận ra
   ngay bên nào là máy.
3. **Ghép cặp theo trụ nội dung.** Mỗi cặp hai thesis cùng một trụ trong năm trụ. Không so
   một thesis về nhà ở với một thesis về hưu trí.
4. Trộn, xoá mọi nhãn nguồn gốc, đánh số ngẫu nhiên.
5. **Hoà được phép.** Người chấm có ba lựa chọn: A tốt hơn, B tốt hơn, hoặc không phân biệt
   được. Cặp hoà không tính vào mẫu số.
3. Chủ dự án chấm từng cặp, không biết cái nào của ai, theo một câu hỏi duy nhất: *cái này có
   sắc hơn thứ một người đọc tin tài chính nghĩ ra trong mười phút không?*
4. Nếu có thể, một người sống ở thị trường Mỹ chấm song song; chỗ bất đồng được ghi lại.

### Ngưỡng qua cổng

| Điều kiện | Ngưỡng |
|---|---|
| Tỷ lệ máy thắng trong so sánh mù, tính trên các cặp không hoà | ≥60% |
| Số thesis máy đạt chuẩn theo rubric | **≥15/20** |

**Đây là một phép sàng lọc, không phải một phép kiểm có ý nghĩa thống kê.** Với 20 cặp độc
lập, hai bên ngang nhau, xác suất máy thắng từ 12 cặp trở lên **chỉ do ngẫu nhiên** là khoảng
25%. Muốn có ý nghĩa thống kê cần khoảng 50 cặp trở lên, và chi phí chấm tăng theo. Ngưỡng
này là một công tắc dừng rẻ tiền; đọc nó đúng như vậy.

**Rubric "đạt chuẩn" — ba trục chấm riêng, không gộp:**

| Trục | Câu hỏi | Ai chấm được |
|---|---|---|
| Đúng | Mô hình và dữ liệu có đứng vững không: giả định đã khai, đơn vị nhất quán, nguồn có thật | Chủ dự án, kiểm được bằng tài liệu |
| Mới | Trong phạm vi corpus đã kiểm, có ai nói điều này chưa | `novelty-check` — và chỉ trong phạm vi corpus |
| Đáng quan tâm | Người Mỹ mục tiêu có hiểu và có muốn biết không | **Không chấm được bởi người không sống ở đó.** Cần ít nhất một người bản địa, hoặc đánh dấu chưa đo |

Một thesis "đạt chuẩn" phải đạt cả trục Đúng và trục Mới. Trục Đáng quan tâm nếu chưa có
người bản địa chấm thì ghi `chưa đo`, **không** suy ra từ hai trục kia.

### Ba kết quả, không phải hai

| Kết quả | Điều kiện | Làm gì |
|---|---|---|
| **Qua** | Đạt cả hai ngưỡng | Sang Mốc 4 |
| **Chưa đủ bằng chứng** | Sát ngưỡng, hoặc số cặp không hoà dưới 12, hoặc trục Đáng quan tâm chưa đo | **Không dừng dự án.** Tăng mẫu: thêm một đợt dữ liệu, thêm cặp, tìm người bản địa chấm. Một phép thử nhiễu không phải một câu trả lời |
| **Không đạt** | Rõ ràng dưới ngưỡng ở cả hai điều kiện | Dừng dự án |

### Tồn kho khác tốc độ cung

20 thesis trong một lần chạy chỉ chứng minh **tồn kho ban đầu**. Nhịp bền vững 8–12 tập/tháng
là một khẳng định khác, và cần đo riêng ở Mốc 7: số thesis mới đạt chuẩn mỗi đợt dữ liệu, sau
khi khử trùng và trừ thesis hết hạn, cộng chi phí mỗi thesis. Không được suy nhịp từ tồn kho.

Ngưỡng 15 được đặt để khớp với sàn Thesis Bank (≥15 mục khả dụng). Một ngưỡng thấp hơn sẽ tạo
ra tình huống vừa qua cổng vừa bị chặn.

**Không đạt thì dừng dự án.** Đây là điểm dừng rẻ nhất trong toàn bộ kế hoạch. Mọi thesis bị
bác ghi `rejectionReason`.

---

## Tầng 1 — Một tập đạt chuẩn (20 tiêu chí)

Áp cho mọi tập, kiểm bằng máy trừ khi ghi rõ. Khoảng số lấy từ
`genres/{genre}/format-spec.json` mục `limits`, không cố định ở đây.

**Nội dung**
1. Thesis có điều bị phản bác, không rỗng
2. Ma trận ngưỡng ba tầng, mọi ngưỡng có số thật
3. Có ít nhất một điểm đảo chiều, hoặc một kết luận "ổn định trên toàn khoảng" có bằng chứng
4. `geoScope` được khai và được nêu trong lời thoại
5. Có ít nhất một con số phái sinh, đã qua kiểm theo bốn cấp
6. Số claim phản bác thesis ≥ `limits.counterClaimsMin`
7. Mọi con số có `claimId`
8. Số thiết bị nội dung ≥ `limits.devicesMin`
9. Số mục từ điển ≥ `limits.lexiconMin`
10. Không ngôn ngữ vi phạm ranh giới tư vấn

**Kỹ thuật**
11. Toàn bộ 12 kiểm tra preflight pass
12. QA lớp 1 pass toàn bộ
13. QA lớp 2 ≥ `limits.qaVisualPassScore`
14. QA lớp 3 pass
15. Độ dài trong `limits.targetDurationMin`
16. Lệch phụ đề ≤ `limits.captionDriftMaxMs`

**Quy trình**
17. Chi phí trong mục tiêu ≤35 USD — **đo và báo cáo, không chặn**. Xem D-13
18. Thời gian người ≤20 phút
19. Không stage nào retry quá 2 lần
20. Chỉ số biến thiên không ở trạng thái chặn

---

## Tầng 2 — Nhà máy khoẻ

| Chỉ số | Ngưỡng tốt | Ngưỡng báo động |
|---|---|---|
| FPY trung bình mọi stage | ≥70% | <50% |
| **Tỷ lệ tập qua trọn chuỗi ngay lần đầu** | Đo và theo dõi | Đây là chỉ số end-to-end; FPY trung bình che nó. Với 10 stage độc lập ở FPY 70%, xác suất qua trọn chuỗi chỉ khoảng 2,8% — các stage không độc lập nên con số thật khác, nhưng phải **đo** chứ không suy ra |
| **Số lần người chạm mỗi tập và chi phí làm lại** | Đo và theo dõi | Hai chỉ số này cho biết nhà máy có thật sự rẻ đi không |
| FPY của stage kém nhất | ≥50% | <30% |
| Số retry trung bình mỗi tập | ≤2 | >4 |
| Tỷ lệ bác ở Gate 2 — **chỉ khi gate ở bậc 1** | 10–25% | =0 qua 10 tập liên tiếp |
| **Tỷ lệ phủ quyết — khi gate ở bậc 2** | 0–10% | >25% (hạ bậc) |
| **Lỗi lọt — khi gate ở bậc 3** | 0 qua 10 lần kiểm mẫu | ≥1 (hạ bậc, tự động) |
| Tỷ lệ buổi duyệt gate đúng hạn | ≥85% | <70% qua 4 tuần |
| Thesis Bank khả dụng | ≥25 | <20 |
| Chi phí thật mỗi tập | ≤35 USD | >45 USD ba tập liên tiếp |

Ba chỉ số tự động hoá ở giữa gắn với bậc trong `automation-tiers.json`. Khi máy tự duyệt,
"tỷ lệ bác" mất ý nghĩa —
**lỗi lọt** là chỉ số duy nhất cho biết máy đang tự trị đúng hay đang tự trị mù.

---

## Tầng 3 — Kênh có tín hiệu

| Chỉ số | Ngưỡng |
|---|---|
| Giữ chân 30 giây | ≥45%, tốt ≥55% |
| Tỷ lệ nhấp | ≥4%, tốt ≥6% |
| Tỷ lệ nhấp từ tìm kiếm | ≥3%. Dưới mức này qua 10 tập → mở lại quyết định thumbnail không dùng mặt người |
| Thời lượng xem trung bình | ≥6 phút |
| Tỷ lệ bình luận có nội dung thật | Tăng dần |

---

## Tầng 4 — Kênh sống được

Phụ thuộc hướng thương mại hoá chốt ở Mốc 8.

**Nếu kênh là sản phẩm:** cần vượt ngưỡng vào chương trình đối tác của nền tảng trước khi có
đồng doanh thu quảng cáo nào. Với người nộp đơn mới từ tháng 2/2027: **1.000 người đăng ký
cộng 8.000 giờ xem trong 365 ngày** — gấp đôi mức cũ. Ở thời lượng xem trung bình 6 phút,
tương ứng khoảng **80.000 lượt xem tích luỹ**.

Hệ quả: trong toàn bộ giai đoạn đó, tiếp thị liên kết và danh sách email là nguồn doanh thu
duy nhất **có thể** tồn tại. Nhưng cả hai đang đóng băng tới Mốc 8 theo `backlog.md`. Đây là
lựa chọn có ý thức: **giai đoạn trước YPP là giai đoạn học, doanh thu bằng 0 theo thiết kế**,
và toàn bộ chi phí của nó phải nằm trong `stopAndReviewUsd`.

**Nếu nhà máy là sản phẩm:** tiêu chí đổi hoàn toàn — 10 tập đạt chuẩn đủ để trình bày, chi
phí mỗi tập ổn định. Ngưỡng nền tảng không còn là rào cản.

---

## Tầng 5 — Đơn vị kinh tế

```
Hoà vốn một tập = chi phí biến đổi ÷ doanh thu mỗi 1.000 lượt xem × 1.000
```

Một con số RPM giả định không có nguồn là thứ chính tài liệu này cấm. Bảng dưới yêu cầu **hai
kịch bản có nguồn**, điền sau khi đo thật ở Mốc 7:

| Kịch bản | RPM | Hoà vốn mỗi tập | Nguồn |
|---|---|---|---|
| Thấp | `<ĐIỀN sau Mốc 7b>` | `<TÍNH>` | `<ĐIỀN>` |
| Cao | `<ĐIỀN sau Mốc 7b>` | `<TÍNH>` | `<ĐIỀN>` |

**Không điền hai ô trên trước Mốc 7b.** RPM chỉ đo được sau khi qua cổng nền tảng và có
doanh thu quảng cáo thật. Trước đó mọi con số RPM là giả định, và tài liệu này cấm điền giả
định không nguồn vào bảng quyết định.

Và hoà vốn tháng phải cộng chi phí cố định:

```
Hoà vốn tháng = (chi phí biến đổi × số tập + chi phí cố định) ÷ RPM × 1.000
```

Nếu lượt xem trung bình mỗi tập ổn định ở mức làm hoà vốn tháng không đạt được ở nhịp bền
vững, nhà máy chạy hoàn hảo vẫn lỗ vĩnh viễn. Đây là con số phải theo dõi.

---

## Điều kiện dừng

| Mốc | Dừng khi |
|---|---|
| Mốc 2 | Spike canvas cho kết quả DỪNG ở cả runner tiêu chuẩn lẫn runner lớn hơn |
| **Mốc 3** | **Máy thắng <60% trong so sánh mù, hoặc <15/20 thesis đạt chuẩn** |
| Mốc 3 | Quá 4 trong 12 đề tài không có nguồn dữ liệu hợp lệ sau WP-009 |
| Mốc 4 | Sau 3 vòng lặp chưa có layout nào đạt 8/8 |
| Mốc 5 | Vertical slice fail lần thứ hai vì cùng nguyên nhân gốc |
| Mốc 7 | FPY stage kém nhất <30%, hoặc chi phí thật mỗi tập >45 USD ổn định — đây là tiêu chí kỹ thuật, đo được khi chưa đăng |
| Mốc 7b | Sau 30 tập **đã phát hành** và đủ cửa sổ đo: giữ chân 30 giây <45% và người đăng ký <300 |
| Vận hành | Giờ xem tích luỹ chưa đạt quỹ đạo tới ngưỡng nền tảng trong 365 ngày |
| Vận hành | Tỷ lệ duyệt gate đúng hạn <70% qua 4 tuần, và không nâng được bậc tự động hoá |
| Vận hành | Chạm `stopAndReviewUsd` |
| Bất kỳ lúc nào | Bài kiểm "xoá hội thoại, chỉ giữ repo" thất bại |
