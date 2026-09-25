# Quyết định kiến trúc

Mỗi quyết định gồm: bối cảnh, quyết định, phương án bị loại, hệ quả. Quyết định mới được
thêm vào cuối file. Không sửa quyết định cũ — thêm quyết định mới thay thế nó và ghi rõ.

---

## D-01 · Repo làm nơi lưu trạng thái

**Bối cảnh.** Cần nơi lưu trạng thái mà không có database và không có server.

**Quyết định.** Repo GitHub là nguồn sự thật duy nhất. Artifact là file, lịch sử là git,
truy vết là commit.

**Bị loại.** Database ngoài — vi phạm ràng buộc hạ tầng. Google Sheets — không có schema,
không có diff có nghĩa.

**Hệ quả.** Audit trail có sẵn, miễn phí. Đổi lại phải tự xử lý đồng thời — xem D-07. Với
khách hàng tổ chức, mô hình một repo mỗi khách là đường thoát tự nhiên.

---

## D-02 · Actions làm nơi tính toán

**Bối cảnh.** Ràng buộc không máy local, không server chạy liên tục.

**Quyết định.** Mọi xử lý chạy trong GitHub Actions. Workflow có tham số, gọi được từ ngoài.

**Bị loại.** Serverless bên thứ ba — thêm một nhà cung cấp và một hệ secret nữa mà không
thêm năng lực gì.

**Hệ quả.** Chi phí tính theo phút runner, dự đoán được. Bị ràng buộc bởi trần job đồng thời.

---

## D-03 · Ba gate người, cộng một khối vận hành

**Bối cảnh.** Tự động hoàn toàn thì không kiểm soát được chất lượng; kiểm mọi bước thì không
scale.

**Quyết định.** Ba gate chặn pipeline (chốt đề tài, duyệt kịch bản, duyệt bản dựng) cộng một
khối vận hành sau khi đăng. Bốn điểm chạm, không phải ba — đếm đúng để ngân sách thời gian
không sai.

**Bị loại.** Gate ở mỗi stage — quá tốn. Không gate nào — không kiểm soát được.

---

## D-04 · Canvas liên tục với máy quay di chuyển

**Bối cảnh.** Chuyển cảnh cắt rời tạo cảm giác slideshow, là nguyên nhân chính khiến các bản
thử trước thất bại về hình ảnh.

**Quyết định.** Một canvas lớn cố định; "chuyển cảnh" là máy quay di chuyển trong canvas đó.
Điều này giữ được quan hệ không gian giữa các ý.

**Bị loại.** Cắt cảnh truyền thống — dễ hơn nhưng chính là vấn đề cần tránh.

**Hệ quả.** Rủi ro kỹ thuật cao, phải kiểm bằng spike trước khi cam kết — WP-003. Nếu spike
thất bại, ngữ pháp chuyển động phải viết lại.

---

## D-05 · Bỏ pillar tâm lý chi tiêu

**Bối cảnh.** Sáu trụ nội dung ban đầu; một trụ vừa có RPM thấp nhất vừa phụ thuộc văn hoá
nhiều nhất — đúng hai điểm yếu của một kênh do người không sống ở thị trường đó vận hành.

**Quyết định.** Còn 5 pillar: housing, debt, investing, career-income, retirement.

**Hệ quả.** Danh sách pillar là hằng số nội dung, nằm ở `channels/{slug}/channel.json`,
**không** nằm trong contract.

---

## D-06 · Phân vùng artifact và lược đồ định danh

**Bối cảnh.** Kiến trúc bốn lớp tách cấu hình theo kênh. Nếu artifact không tách, ba kênh sẽ
ghi chồng lên nhau và mã thesis sẽ trùng giữa các kênh.

**Quyết định.**
1. Artifact tập ở `/episodes/{channel-slug}/{YYYY-MM-slug}/`
2. `episodeId` = `{channel-slug}/{YYYY-MM}-{slug}`
3. `thesisId` = `{channel-slug}/TB-{NNN}`
4. `modelId` = `{genre}/M-{NNN}` — mô hình thuộc thể loại, vì nó là tài sản tái dùng
5. Mọi khoá trong nhật ký và kho dữ liệu dùng cùng lược đồ

**Bị loại.** Giữ phẳng và thêm trường `channel` bên trong — trùng tên thư mục vẫn xảy ra, và
không tách được quyền truy cập theo kênh.

**Hệ quả.** Đây là một trong hai ngoại lệ được phép của non-goal "không tối ưu hoá sớm".
Sửa bây giờ là vài dòng JSON; sửa sau 100 tập là di trú dữ liệu.

---

## D-07 · Mô hình đồng thời và phân mảnh trạng thái

**Bối cảnh.** Một file trạng thái duy nhất mà mọi stage của mọi tập ghi vào sẽ vỡ ngay khi
hai tập chạy song song — hai job cùng push sẽ bị từ chối.

**Quyết định.** Xem mục "Mô hình đồng thời" trong `01-architecture.md`.

**Bị loại.** Khoá bằng `concurrency` cho mọi job ghi — tuần tự hoá toàn bộ và giết thông
lượng. Retry-with-rebase ở mọi nơi — dễ mất dữ liệu; chỉ dùng cho file append-only.

---

## D-08 · Gate là cổng quyết định, không phải cổng sản xuất

**Bối cảnh.** Chủ dự án không viết nội dung trong quy trình, chỉ phê duyệt và cho định hướng
khi cần. Đồng thời, mọi cơ chế chống nội dung khuôn mẫu trước đây đều dựa vào việc người
viết — bỏ chúng mà không thay thế là bỏ hết lá chắn.

**Quyết định.** **Người không tạo ra nội dung; người chọn giữa các phương án có bằng chứng.**
Mọi thứ trình lên gate phải là lựa chọn, kèm dữ liệu để chọn, và có mặc định.

*Gate 1 — chốt đề tài, ≤2 phút.* Trình 5 thesis do máy sinh, mỗi thẻ có: luận điểm · phản
bác điều gì · ba ngưỡng dự kiến · điểm đảo chiều đã tính thử · bằng chứng mới lạ do máy điền
· bậc RPM · tiêu đề nháp. Hành động: **Chọn 1 / Bác tất cả / Thêm một câu định hướng**.

*Gate 2 — duyệt kịch bản, ≤5 phút.* Không trình toàn văn. Trình bốn thứ: bảng kiểm máy
xanh/đỏ · 60 giây đầu dạng nghe bằng giọng nháp · ma trận ngưỡng và kết luận khoảng 200 từ ·
cờ vàng từ fact-checker. Hành động: **Duyệt / Bác kèm một dòng lý do**. Lý do được đưa
nguyên văn vào lần chạy lại.

*Gate 3 — spot check, ~5 phút.*

**Chống duyệt mù.** Chỉ số "tỷ lệ script bị sửa" vô nghĩa khi người không sửa. Thay bằng:
tỷ lệ bác ở Gate 2 (kỳ vọng 10–25%; bằng 0 qua 10 tập liên tiếp là dấu hiệu), và kiểm mẫu —
mỗi 10 tập đọc toàn văn một tập ngẫu nhiên; lỗi lộ ra mà bảng kiểm máy không bắt được thì
bổ sung kiểm đó vào bảng.

**Bốn cơ chế thay thế hệ phòng thủ cũ.**
1. Phân tích độ nhạy làm chữ ký của kênh — xem `14-quantitative-core.md`.
2. Chỉ số biến thiên giữa các tập, đo trên cửa sổ 10 tập, chặn khi vượt ngưỡng.
3. Analyst's Note — máy gom và phân cụm bình luận sau 24 giờ, soạn sẵn một trả lời bằng số
   có nguồn kèm link mô hình; người duyệt và ghim. Khoảng 3 phút/tập, làm theo lô.
4. Sổ nguồn 100% và bảng tính mô hình công bố công khai.

**Hệ quả bắt buộc.** Thesis Bank không thể nạp thủ công nữa. Cung phải đến từ dữ liệu. Đây
là điều kiện tiên quyết của quyết định này, không phải hệ quả tuỳ chọn.

---

## D-09 · Lớp điều phối: agent trước, orchestrator sau

**Bối cảnh.** Công cụ xây dựng có connector đọc/ghi repo và đọc được kết quả CI, nhưng
**không có sandbox chạy test**.

**Quyết định.**
1. CI là nơi kiểm duy nhất, chạy trên `push`, xuất `ci-report.txt` gọn dán ngược được.
2. Guardrail thực thi bằng máy, không bằng kỷ luật của agent.
3. Agent làm orchestrator giai đoạn đầu; cockpit lùi xuống Mốc 6.
4. "Agent điều phối, agent không triển khai" thành luật.
5. Mọi thứ agent gọi phải là workflow trong repo có tham số.

**Rủi ro chính.** Logic nhà máy trôi vào lịch sử hội thoại thay vì nằm trong repo. Bài kiểm:
xoá hết hội thoại, chỉ giữ repo — nhà máy có chạy lại được không?

**Ghi chú về trình duyệt của agent.** Giải được bốn việc không có API: đặt điểm chèn quảng
cáo trong Studio, thử nghiệm thumbnail, đọc trang đối thủ không tiêu quota, cập nhật trang
cockpit. Coi là giải pháp tạm cho thứ không có API — thao tác qua giao diện web dễ vỡ khi
nền tảng đổi UI. Dùng tài khoản riêng của kênh, không dùng tài khoản cá nhân.

---

## D-10 · Ngoại lệ zero-local cho vòng lặp layout

**Bối cảnh.** Ràng buộc zero-local gần như miễn phí với viết stage và vận hành pipeline,
nhưng rất đắt với lặp thiết kế layout — khâu quyết định chất lượng hình ảnh.

**Quyết định.** Cho phép chạy công cụ dựng hình tại chỗ **chỉ trong WP-021 và WP-022**.
Pipeline sản xuất giữ nguyên zero-local tuyệt đối.

**Thu hồi.** Hết hiệu lực khi Layout Gallery đạt 5/5 layout ở 8/8 tiêu chí.

**Ràng buộc.** Không artifact nào sinh tại chỗ được commit. Chỉ định nghĩa layout được
commit; ảnh chuẩn cho kiểm hồi quy phải sinh trong Actions.

---

## D-11 · Bậc thang tự động hoá theo bằng chứng

**Bối cảnh.** Mục tiêu là tự động hoá tối đa cả quy trình xây lẫn quy trình vận hành. Nhưng
bật tự động hoá một lần cho toàn bộ điểm quyết định là cách nhanh nhất để biến "duyệt mù"
thành "chạy mù" — cùng một lỗi, không còn ai nhìn thấy.

**Quyết định.** Mọi điểm quyết định (gate, merge, chọn đề tài, đính chính, mở tập mới) đi
qua ba bậc. Bậc được khai trong `pipeline/automation-tiers.json`, không nằm trong code.

| Bậc | Máy làm gì | Người làm gì | Điều kiện lên bậc tiếp |
|---|---|---|---|
| 1 · Bóng | Đề xuất quyết định, ghi vào nhật ký, **không thực thi** | Quyết định như bình thường | Máy trùng quyết định của người ≥90% qua ≥10 lần |
| 2 · Mặc định có phủ quyết | Thực thi sau cửa sổ chờ 12 giờ nếu không bị phủ quyết | Xem thông báo, phủ quyết khi cần | Tỷ lệ phủ quyết <10% qua ≥10 lần, không lỗi lọt |
| 3 · Tự trị có kiểm mẫu | Thực thi ngay | Kiểm mẫu 1/10 | Duy trì khi lỗi lọt dưới ngưỡng |

**Hai chỉ số thay cho "tỷ lệ bác ở Gate 2".** Khi máy tự duyệt, tỷ lệ bác mất ý nghĩa. Thay
bằng: **tỷ lệ phủ quyết** (người can thiệp bao nhiêu phần) và **lỗi lọt** — số lỗi phát hiện
ở kiểm mẫu mà không cơ chế máy nào bắt được. Lỗi lọt vượt ngưỡng thì **hạ bậc**, tự động.

**Không bao giờ lên quá bậc 1.**
1. Thay đổi trong `engine/contracts/`.
2. Mọi mục quyết định mới trong file này.
3. Duyệt đặc tả WP/CP trước khi máy viết code.
4. Hiệu chuẩn cổng Mốc 3 và chấm layout ở Mốc 4.

**Hệ quả bắt buộc.** Mọi gate chạy ở bậc 1 **ngay từ tập đầu tiên** ở Mốc 5. Không có giai
đoạn bóng thì không có dữ liệu để lên bậc, và tự động hoá sẽ phải bật bằng niềm tin.

**Bị loại.** Bật tự động hoá theo mốc thời gian — thời gian không phải bằng chứng.

---

## D-12 · Nối các khối bằng workflow_dispatch, không bằng commit

**Bối cảnh.** Thiết kế ban đầu ngầm giả định: stage ghi artifact → push → workflow sau tự
chạy. Giả định này sai về mặt kỹ thuật: commit tạo bởi một workflow bằng token mặc định
**không** kích hoạt workflow khác. Nếu không khai rõ, agent sẽ tự phát minh một cơ chế trong
hội thoại — đúng điều dự án cấm.

**Quyết định.**
1. Bốn khối (Hoạch định, Sáng tạo, Sản xuất, Phát hành) là bốn workflow nhận tham số
   `episodeId`, gọi được bằng `workflow_dispatch`.
2. Khối trước gọi khối sau bằng lời gọi tường minh, không dựa vào sự kiện push.
3. `reindex.yml` chạy theo lịch và theo `workflow_dispatch`, không theo push.
4. Không dùng PAT cá nhân để lách giới hạn này. Nếu một trường hợp bắt buộc phải dùng, nó
   đi qua thủ tục D-14.

**Hệ quả.** Cơ chế nối khối được cài ngay trong bốn workflow khối ở Mốc 5 — mỗi khối gọi
khối sau bằng `workflow_dispatch`. WP-005 ở Mốc 7 không tạo ra cơ chế nối mà thêm lớp chính sách
điều tiết sản lượng lên trên nó.

---

## D-13 · Quản trị chi phí không dùng trần cứng trong code

**Bối cảnh.** Thiết kế ban đầu yêu cầu mỗi stage tự áp trần chi phí và dừng khi vượt. Chủ dự
án quyết định không đưa trần cứng vào code ở giai đoạn này: nó làm stage phức tạp hơn, tạo
trạng thái dở dang khó dọn, và ở giai đoạn xây thì con số trần còn chưa biết.

**Quyết định.** Thay bằng ba lớp mềm.

**Lớp 1 — Đo.** Mọi stage ghi `costUsd` vào `pipeline/runs.jsonl`. Không stage nào tự dừng
vì chi phí. Đây là ràng buộc bắt buộc: không đo thì hai lớp sau không tồn tại.

**Lớp 2 — Cảnh báo.** Một workflow theo lịch cộng dồn chi phí theo ngày, theo tập, theo
tháng. Vượt mốc `warnUsd` khai trong `04-nfr.md` thì **mở issue**, không chặn gì.

**Lớp 3 — Điều tiết đầu vào.** Vượt mốc `pauseIntakeUsd` thì orchestrator **ngừng mở tập
mới**. Tập đang chạy chạy hết. Vượt mốc `stopAndReviewUsd` thì mọi workflow theo lịch tạm
dừng và một issue mức cao được mở.

**Rủi ro còn lại, khai rõ.** Một lỗi lặp trong khoảng giữa hai lần chạy workflow cảnh báo sẽ
không bị chặn bởi bất cứ thứ gì trong repo. Hai biện pháp bù nằm **ngoài code**: hạn mức chi
tiêu đặt trên trang quản lý của từng nhà cung cấp API, và `concurrency` giới hạn số job cùng
loại chạy song song. Chủ dự án chấp nhận rủi ro này một cách có ý thức.

**Thu hồi.** Quyết định này được xem lại ở Mốc 7, khi có chi phí thật của 10 tập. Nếu chi
phí thật lệch quá 50% so với dự kiến ở bất kỳ stage nào, đưa trần cứng trở lại cho riêng
stage đó qua một quyết định mới.

**Bị loại.** Trần cứng mỗi stage — bị chủ dự án loại. Không đo gì cả — loại, vì khi đó hai
mốc dừng trong `12-success-criteria.md` không kiểm được.

---

## D-14 · Thẩm quyền điều chỉnh ràng buộc kiến trúc

**Bối cảnh.** Bộ tài liệu có nhiều ràng buộc tuyệt đối: zero-local, không database ngoài,
không server chạy liên tục, contract bất khả xâm phạm, phạm vi file đóng. Chúng bảo vệ dự án
khỏi phình to. Nhưng một ràng buộc làm nhà máy không xây xong được thì nó không còn bảo vệ
gì — nó chỉ chặn.

**Quyết định.** Mọi ràng buộc kiến trúc trong repo đều **có thể thay đổi**, nhưng chỉ qua
thủ tục sau. Không ngoại lệ, kể cả khi thay đổi có vẻ nhỏ.

**Thủ tục bốn bước.**

1. **Agent dừng.** Không đi đường vòng, không tự nới, không "tạm thời làm cách khác".
2. **Agent viết đúng ba dòng:**
   - Ràng buộc nào — trích nguyên văn, nêu file và mục.
   - Nó chặn điều gì cụ thể — mục tiêu nào của WP nào không đạt được, và vì sao mọi cách
     trong ràng buộc đều không đạt.
   - Thay đổi **tối thiểu** nào gỡ được — và cái gì mất đi khi đổi.
3. **Chủ dự án duyệt hoặc bác.** Bác thì WP bị cắt phạm vi hoặc hoãn, không phải agent tự
   xoay.
4. **Agent viết một mục quyết định mới** vào file này, đánh số tiếp, nêu rõ nó thay thế mục
   nào và ở phạm vi nào. Ràng buộc cũ **không bị xoá** — nó được thay thế và ghi lại lý do.
   Chỉ sau khi mục này được commit, WP mới chạy tiếp.

**Ba nguyên tắc không thay đổi được bằng thủ tục này**, vì đổi chúng là đổi dự án chứ không
phải đổi ràng buộc:

1. Logic nằm trong repo, không nằm trong lịch sử hội thoại.
2. Người quyết định, máy sản xuất.
3. Mọi con số có nguồn hoặc có mô hình.

**Hệ quả.** Ràng buộc "tuyệt đối" ở các mục khác trong repo từ nay đọc là "tuyệt đối cho tới
khi có một mục D-xx thay thế". Điều này không làm chúng yếu đi: chi phí để đổi vẫn là viết
một quyết định có lập luận, và đó đúng là mức chi phí nên có.


---

## D-15 · Ghi trạng thái qua một hàng đợi tuần tự

**Bối cảnh.** Phân mảnh trạng thái theo tập (D-07) giải quyết việc hai tập không giẫm lên
nhau về **nội dung**, nhưng không giải quyết việc hai job cùng xuất phát từ một `main` SHA.
Job A đẩy `main` lên H1; job B vẫn mang parent H và bị từ chối. Tách đường dẫn không đủ.
Ba phương án đã cân nhắc: nhánh trạng thái riêng, một PR cho mỗi lần ghi, hoặc tuần tự hoá
đoạn ghi.

**Quyết định.** Tuần tự hoá đoạn ghi. Tính toán chạy song song; **ghi vào repo đi qua một
workflow duy nhất** `commit-artifacts.yml`.

1. Stage sinh artifact và upload chúng làm Actions artifact, **không** tự commit.
2. Stage gọi `commit-artifacts.yml` bằng `workflow_dispatch` với `episodeId`, danh sách file
   và một `writeId` duy nhất.
3. `commit-artifacts.yml` dùng `concurrency: group=repo-write, cancel-in-progress: false`.
   Mỗi lần chạy: fetch `main`, áp thay đổi lên SHA mới nhất, commit, push. Xung đột → fetch
   và thử lại, tối đa 5 lần, backoff tăng dần.
4. Áp thay đổi theo loại file: file thuộc một tập thì **ghi đè trọn file** (tập là chủ sở hữu
   duy nhất, nên không có merge nội dung); `runs.jsonl` và các log khác thì **nối thêm dòng**;
   `pipeline/state.json` thì không ai ghi, `reindex.yml` xây lại.
5. `writeId` lưu trong commit message. Trước khi commit, workflow kiểm `writeId` đã có trong
   lịch sử chưa — nếu có thì đây là lần gọi lặp, bỏ qua và trả thành công. Đây là cơ chế khử
   trùng cho trường hợp job bị huỷ sau khi đã ghi.

**Phương án bị loại.** Nhánh trạng thái riêng: thêm một mô hình merge nữa cho người vận hành
phải hiểu. Một PR mỗi lần ghi: đúng về kiểm soát nhưng tạo hàng trăm PR rác và làm ngộp mục
duyệt của người — chính chỗ cần sạch.

**Hệ quả.** Ghi là điểm tuần tự duy nhất của hệ thống, và nó phải nhanh. Không đặt việc tính
toán nào trong `commit-artifacts.yml`. Nếu hàng đợi ghi trở thành nút cổ chai ở nhịp thật, đó
là một quyết định mới, không phải một tối ưu âm thầm.

---

## D-16 · Công bố mô hình bằng một repo công khai riêng và một token riêng

**Bối cảnh.** Bảng tính mô hình công khai là cơ chế chặn số 2 của bằng chứng công sức.
`GITHUB_TOKEN` của Actions chỉ có quyền trong repo chứa workflow, nên không ghi được sang
repo khác. Một file JSON đặt trong repo công khai cũng chưa đáp ứng lời hứa "người xem mở ra
tự kiểm".

**Quyết định.**
1. Một repo công khai riêng, `fulcrum-models`, chỉ chứa nội dung công bố.
2. Ghi bằng một fine-grained token riêng, secret `PUBLISH_REPO_TOKEN`, phạm vi **chỉ** repo
   đó, **chỉ** quyền Contents ghi. Không dùng `GITHUB_TOKEN`, không dùng token cá nhân toàn
   quyền.
3. Chỉ xuất theo **danh sách trắng đường dẫn** khai trong `config/publish-allowlist.json`.
   Bất cứ file nào ngoài danh sách bị chặn ở bước xuất, không phải bị lọc ở bước sau.
4. Deliverable cho mỗi mô hình là ba thứ, không phải một: file mô hình JSON, một trang
   HTML tĩnh cho phép nhập tham số và tính lại ngay trong trình duyệt, và bộ ca kiểm tay.
5. Nghiệm thu bắt buộc: trang HTML tính ra **cùng kết quả** với con số đã phát hành trong
   video, kiểm bằng một ca so khớp tự động.

**Phương án bị loại.** Ghi vào bảng tính đám mây: thêm một hệ xác thực, một nhà cung cấp và
một điểm hỏng, đổi lấy trình bày quen thuộc hơn. Không đáng ở giai đoạn này.

---

## D-17 · Soát bản địa là một vai có trả tiền, không phải một bước tuỳ chọn

**Bối cảnh.** R8 — kịch bản không đọc như người bản xứ viết — là rủi ro mức Cao. Biện pháp
giảm thiểu duy nhất của nó là lượt soát bản địa. Trước quyết định này, lượt soát được yêu cầu
ở ba nơi nhưng không ai được giao, không có tiền, và không có luật chặn.

**Quyết định.**
1. Một người nói tiếng Anh Mỹ bản ngữ, thuê theo tập. Đây là ngoại lệ có chủ đích của D-08:
   người này **không** tạo nội dung và **không** thấy dữ liệu hay kết luận — họ nhận bản
   kịch bản và chỉ sửa cách diễn đạt.
2. Mô hình ngôn ngữ đọc lại bài của chính nó **không** tính là soát bản địa, kể cả khi đổi
   nhà cung cấp.
3. Một dòng riêng trong chi phí biến đổi mỗi tập, khai trong `04-nfr.md`.
4. `localeReviewDone = false` thì tập **không được phát hành**. Đây là luật chặn, không phải
   cảnh báo.
5. Nếu chưa thu xếp được người: Mốc 5 vẫn chạy được để kiểm kỹ thuật, nhưng Mốc 7b không mở.

**Phương án bị loại.** Bỏ lượt soát và dựa vào từ điển kênh: từ điển bắt được từ ngữ sai, không
bắt được câu đúng ngữ pháp mà người bản xứ không viết thế.

---

## D-18 · Công thức và ca kiểm tay của mô hình do người viết

**Bối cảnh.** Cổng Mốc 3 đòi tám mô hình đã qua kiểm bốn cấp, trong đó cấp 1 là ca kiểm tay.
Một mô hình ngôn ngữ tự sinh ca kiểm rồi tự khớp với chính nó không chứng minh gì — nó chỉ
lặp lại cùng một hiểu sai hai lần.

**Quyết định.**
1. **Giả định, công thức và ca kiểm tay** của mỗi mô hình do người viết. Đây là công việc
   miền, không phải công việc code.
2. Agent soạn khung file theo `model.schema.json`, triển khai công thức thành code, chạy
   runner, và báo lệch. Agent **không** được đặt `verification.status = "verified"`.
3. Hai mô hình đầu tiên chọn theo tiêu chí **dễ kiểm nhất**, không theo tiềm năng lượt xem:
   tỷ lệ chi phí quỹ và mortgage points. Cả hai có công cụ tính công khai để đối chiếu ở cấp 2.
4. Nếu chủ dự án không tự viết được một mô hình, thuê người viết. Không hạ chuẩn xuống "để
   máy làm tạm".

**Hệ quả.** WP-008 là WP duy nhất trong bộ mà phần lớn công việc nằm ngoài agent. Thời gian
cho nó phải được tính vào Mốc 3 như thời gian người, không phải thời gian máy.

---

## D-19 · Đồng bộ contract với quy trình nguồn, kiểm mô hình, đo lường, phát hành, phiên bản và dung sai beat

**Bối cảnh.** Sáu chỗ trong contract đang chặn chính quy trình mà tài liệu quy định:
origin thiếu trường và chưa ràng buộc theo kind; trạng thái kiểm mô hình thiếu partial;
chỉ số chưa có dữ liệu không nhận null; hồ sơ tải lên riêng tư đòi thời điểm công khai;
artifact cấp tập đóng không cho khai bộ phiên bản; và Genre Pack chưa khai được dung sai
cho tỷ lệ thời lượng beat. Prompt bị cấm chứa hằng số nội dung, nên giới hạn độ dài beat
phải đọc được từ Genre Pack. Đây là một thay đổi contract thống nhất.

**Quyết định.**
1. **Nguồn claim.** `sources.schema.json` thêm `origin.modelVersion`, `inputSetId`,
   `outputKey`, đều là string và không bắt buộc vô điều kiện. Giữ tên `url`, sửa mô tả
   `origin.kind` cho khớp. Các khối `if/then` draft-07 bắt buộc: `snapshot` có
   `snapshotKey`; `model` có `modelId`, `modelVersion`, `inputSetId`, `outputKey`;
   `url` có `url`.
2. **Kiểm mô hình.** `model.schema.json` thêm `partial` vào `verification.status`:
   đã đạt cấp 1 nhưng chưa đạt một cấp bắt buộc theo điều kiện. Mô hình ở trạng thái
   `partial` **KHÔNG được dùng để sinh claim**.
3. **Chỉ số chưa có dữ liệu.** `metrics.schema.json` cho phép `null` ở `aggregate.views`,
   `impressions`, `ctr`, `avgViewDurationSec`, đồng thời giữ nguyên kiểu số hiện hành
   và danh sách `required`. Thêm `aggregate.nullReason`: object có khoá là tên của
   các chỉ số này, giá trị là string ghi lý do theo S18b.
4. **Vòng đời phát hành.** `publication.schema.json` bắt buộc `uploadedAt` dạng
   `date-time`. `publishedAt` vẫn là `date-time` nhưng chỉ bắt buộc khi `visibility`
   là `public`, qua `if/then`. S17 tải lên riêng tư chưa cần có thời điểm công khai.
5. **Phiên bản artifact.** Thêm `versions` tuỳ chọn vào các schema `outline`, `script`,
   `canvas-map`, `storyboard`, `sources`, `factcheck`, `sensitivity`, `preflight`,
   `timing`, `proof`, `render-manifest`, `qa-report`, `package`, `publication`, `metrics`.
   Khi khai, object gồm đủ `engine`, `genre`, `channel` dạng string. Không thêm
   `versions` vào danh sách bắt buộc của các artifact này. Brief và episode-state
   giữ `versions` bắt buộc; artifact khác kế thừa qua `episodeId` nếu không khai.
   `13-upgrade-safety.md` mục 1 được cập nhật theo cơ chế này.
6. **Dung sai độ dài beat.** `format-spec.schema.json` thêm `limits.beatShareTolerance`
   tuỳ chọn, kiểu `number`, `minimum: 0`, `maximum: 1`. Dung sai tính theo tỷ lệ
   tuyệt đối của `shareOfDuration` mỗi beat. `genres/data-explainer/format-spec.json`
   khai giá trị `0.05`: beat khai `0.22` được chấp nhận trong khoảng `0.17` đến
   `0.27`. Prompt đọc giới hạn từ Genre Pack, không chứa hằng số nội dung.

**Phương án bị loại.** Sửa tài liệu quy trình cho khớp contract hiện tại. Bị loại vì
contract đang sai, không phải quy trình.

**Hệ quả.** Validator tầng 1 phải áp dụng các khối `if/then` draft-07 mới. Validator
tầng 2 phải kiểm các quan hệ `if/then` mới: trường đi kèm `origin.kind` và điều kiện
`visibility = public` bắt buộc có `publishedAt`. Tầng 2 còn phải đối chiếu mô hình
được tham chiếu để chặn claim dùng mô hình `partial`, kiểm lý do tương ứng cho
mỗi chỉ số `null`, và kế thừa bộ phiên bản qua `episodeId` khi artifact không khai.
Prompt và validator tầng 2 đọc `limits.beatShareTolerance` cùng `shareOfDuration`
của từng beat từ Genre Pack để giới hạn hoặc kiểm độ dài beat.
Thay đổi được ghi với nhãn `[contract-change]` trong cùng một pull request.

---

## D-20 · Bổ sung phiên bản artifact và bỏ ngưỡng thời lượng cứng trong contract

**Bối cảnh.** Lần rà mâu thuẫn thứ hai phát hiện hai phần contract còn lệch với quy tắc
hiện hành. `13-upgrade-safety.md` mục 1 cho phép mọi artifact khai `versions`, nhưng
`analyst-note.schema.json` và `license-ledger.schema.json` đang đóng và chưa nhận trường
này. Đồng thời, `outline.beats[].estimatedMs` có sàn 1000 mili giây,
`brief.targetDurationMin` có sàn 1 phút và `proof.clip.durationSec` có sàn 1 giây,
trong khi khoảng thời lượng nội dung thuộc Genre Pack, không thuộc contract.

**Quyết định.**
1. Bổ sung phạm vi mục 5 của D-19 cho `analyst-note.schema.json` và
   `license-ledger.schema.json`: thêm `versions` tuỳ chọn, không đưa vào danh sách
   `required` cấp artifact. Khi khai, object phải có đủ `engine`, `genre`, `channel`
   dạng string và không nhận khoá khác. Khi không khai, kế thừa qua `episodeId` từ
   brief và episode-state. Brief và episode-state giữ `versions` bắt buộc.
2. Trong `outline.schema.json`, đổi `beats[].estimatedMs` từ `minimum: 1000` thành
   `exclusiveMinimum: 0`, giữ kiểu `integer`. Trong `brief.schema.json`, đổi
   `targetDurationMin` từ `minimum: 1` thành `exclusiveMinimum: 0`, giữ kiểu `number`.
   Trong `proof.schema.json`, đổi `clip.durationSec` từ `minimum: 1` thành
   `exclusiveMinimum: 0`, giữ kiểu `number`. Đây là miền giá trị thời lượng dương,
   không phải ngưỡng thời lượng nội dung của một thể loại.
3. Không thêm trường hoặc đổi giá trị Genre Pack. Khoảng thời lượng mục tiêu vẫn đọc
   từ `limits.targetDurationMin`; tỷ lệ thời lượng beat vẫn đọc từ
   `beats[].shareOfDuration` cùng `limits.beatShareTolerance` trong
   `genres/{genre}/format-spec.json`. Không đặt thêm ngưỡng nội dung cho clip proof.

**Phương án bị loại.** Thu hẹp quy tắc phiên bản trong tài liệu để giữ hai schema đang
thiếu trường: trái cơ chế kế thừa đã chốt. Giữ các sàn thời lượng cứng trong contract:
trái ranh giới Engine và Genre Pack. Bỏ cả kiểm giá trị dương: cho phép thời lượng
bằng không hoặc âm, không phải mục tiêu của thay đổi này.

**Hệ quả.** Validator tầng 1 kiểm bộ phiên bản khi được khai, kiểu thời lượng hiện hành
và giá trị lớn hơn không. Validator tầng 2 phải áp dụng kế thừa phiên bản cho cả hai
artifact bổ sung và tiếp tục đối chiếu khoảng thời lượng, tỷ lệ beat với các trường
Genre Pack hiện có. Hợp lệ theo schema không đồng nghĩa đạt giới hạn nội dung của
thể loại. D-20 bổ sung phạm vi phiên bản của D-19; giữ nguyên D-01 đến D-19.
Thay đổi được ghi với nhãn `[contract-change]` trong cùng một pull request.

---

## D-21 · Gỡ các điểm chặn bootstrap của WP-000

**Bối cảnh.** Mốc 0 đã đóng ở phạm vi tài liệu/cấu hình tại main
`a7d5533eb53c53c55bf5208ad76a02bbad006ae8`, tree
`db004bdf2b1ddb3fad6526f70182a28a3cee7f8f`. Ba checkpoint bắt đầu WP-000 đều đạt,
nhưng DoD còn bị chặn: `pipeline/state.json` chưa hợp schema và nằm ngoài phạm vi;
`config/publish-allowlist.json` chưa có schema/ánh xạ; workflow nghiệm thu chỉ khai
`workflow_dispatch` nhưng chưa tồn tại trên nhánh mặc định. Output cũng chưa liệt kê
đủ file hỗ trợ nghiệm thu, và cách kiểm JSON công cụ chưa được phân biệt với artifact.

**Quyết định.**

1. **Tách chuẩn bị đặc tả khỏi thực thi.** Toàn PR đặc tả #9 có đúng sáu file:
   `engine/docs/02-decisions.md`, `engine/ops/work-packages/WP-000-scaffold.md`,
   `engine/ops/definition-of-done.md`, `engine/contracts/README.md`,
   `engine/contracts/publish-allowlist.schema.json` và
   `.github/workflows/review-wp000-spec.yml`. D-21 được nối sau D-20; các lần sửa
   đặc tả tiếp theo chỉ sửa D-21, giữ nguyên văn D-01–D-20 và lịch sử commit.
   PR mang `[wp-change]` và `[contract-change]`, do chủ dự án quyết định merge.
   Chuẩn bị hoặc merge đặc tả không nghiệm thu WP-000, không đổi backlog và không
   cấp quyền triển khai, chuẩn hóa state, gọi provider hoặc đổi settings/quota.
   Quyền cài/chạy và ngân sách CI đặc tả chỉ có trong lượt được duyệt riêng ở mục 7;
   không được suy thành quyền thực thi WP, dispatch/rerun hoặc quyền thường trực.
   D-21 phải có trên `main` và phải có phê duyệt triển khai riêng trước khi thực thi
   WP-000. CI đặc tả mục 7 được chạy trước merge sau phê duyệt riêng của chủ dự án.
   Không kế thừa ngoại lệ CI của PR Mốc 0.

2. **Chuẩn hóa state đúng một lần, có điều kiện.** Sau phê duyệt triển khai riêng cho
   checkpoint, phạm vi và lần chạy cụ thể, cho phép chuẩn bị bản sửa
   `pipeline/state.json` trên nhánh `wp/000` để nghiệm thu WP-000. Ngoại lệ này chỉ
   thay thế hạn chế phạm vi của WP-000 và riêng quy tắc `pipeline/state.json` chỉ
   do `reindex.yml` xây lại tại **D-15 mục 4**, `01-architecture.md` mục Mô hình
   đồng thời và guardrails mục 1.7, trong đúng lần bootstrap đã duyệt.
   Các quy tắc hàng đợi, ghi artifact và khử trùng còn lại của D-15 giữ nguyên.
   Ngoại lệ không tạo writer thường trực, không triển khai WP-002 và không cấp
   quyền chuẩn hóa từ PR đặc tả; nó chỉ có hiệu lực sau phê duyệt triển khai riêng.
   - Đối chiếu lại blob state `6f6eb4493fb6173b19bf2af126bf0b0cd68c5593` và việc
     chưa có state tập. Khác thì dừng, không chuyển thành một cuộc di trú khác.
   - Bản sửa được sinh trong Actions từ cây nguồn đã pin: giữ nguyên `note` và
     `episodes: []`; bỏ đúng `engineVersion` và `aggregates`; thêm
     `sourceCommit` là SHA thực sự đã đọc để xây chỉ mục; `rebuiltAt` là thời điểm
     UTC thực sự tạo bản sửa. Không dùng SHA tự tham chiếu của commit chứa chính chỉ mục.
   - Actions xuất bản sửa và biên nhận gồm run/attempt, SHA/tree nguồn, thời điểm và
     nội dung trước/sau. Agent đọc lại rồi mới đưa đúng bản sửa vào PR đã được phép;
     workflow không tự ghi `main`. Quyền ghi bền vững vào repo vẫn qua phê duyệt PR.
   - Đây là thao tác chuẩn hóa riêng trước nghiệm thu, không nằm trong validator.
     Validator phải tiếp tục từ chối state gốc; không bỏ file, sửa dữ liệu trong bộ nhớ,
     nới schema hoặc biến lỗi đã biết thành `pass`.
   - Chưa có phê duyệt đó thì giữ nguyên phân loại D, giữ nguyên dữ liệu và chặn
     việc tuyên bố WP-000 done. Ngoại lệ kết thúc khi bản sửa một lần được nghiệm thu;
     các lần xây chỉ mục sau vẫn thuộc `reindex.yml` của WP-002.

3. **Kiểm đủ file, đúng loại.** Thêm `publish-allowlist.schema.json` draft-07 và
   ánh xạ `config/publish-allowlist.json`. Schema đóng, kiểm cấu trúc các trường
   `version`, `targetRepo`, `allow`, `deny`, `requireCalculatorParity`;
   `note` tuỳ chọn. Không đưa tên repo, thể loại, kênh hoặc mẫu đường dẫn cụ thể
   vào schema. Cấu hình xuất bản và yêu cầu D-16 giữ nguyên; đạt schema không chứng
   minh quyền ghi repo công khai hoặc máy xuất đã thực thi chính sách.
   Với WP-000, thay cách diễn đạt mọi JSON đều ánh xạ schema artifact bằng ba nhóm:
   - File schema: kiểm meta-schema draft-07 và biên dịch bằng Ajv.
   - Artifact/cấu hình miền: ánh xạ contract, kiểm tầng 1 và tầng 2 khi áp dụng.
   - Đúng ba JSON công cụ ở gốc (`package.json`, `package-lock.json`,
     `tsconfig.json`): kiểm cú pháp JSON, trường cấu hình đã chốt, tính khớp
     manifest–lockfile bằng npm và cấu hình/kiểu bằng TypeScript. Không áp
     `package.schema.json` của gói phát hành cho manifest npm.
   Danh mục gồm file được theo dõi tại commit kiểm và fixture được truyền rõ cho
   harness; không quét dependency tải về như dữ liệu dự án. JSON chưa phân loại,
   file không đọc được hoặc ánh xạ mơ hồ phải fail. Không có nhóm bỏ qua dữ liệu.
   JSONL kiểm từng dòng; front-matter của `05-script.md` kiểm theo contract riêng.

4. **Nghiệm thu Actions trước merge.** Workflow `acceptance-wp000.yml` được phép
   nhận `pull_request` vào `main`, giới hạn nhánh nguồn cùng repo là `wp/000`,
   sau khi chủ dự án duyệt triển khai và các lần chạy tự động liên quan. Giữ
   `workflow_dispatch` khi workflow đã có trên `main`; quyền dispatch/rerun
   luôn phải được duyệt riêng. Thay thế yêu cầu chỉ chạy thủ công trong WP-000
   mục 6 và DoD mục 1, không đổi cơ chế nối các khối sản xuất của D-12.
   GitHub yêu cầu workflow có trên nhánh mặc định để nhận `workflow_dispatch`:
   [tài liệu GitHub](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
   Checkout đúng SHA head được nghiệm thu; báo riêng SHA sự kiện nếu là merge thử
   của PR. Báo cáo ghi SHA/tree thực sự checkout, run/attempt và phiên bản công cụ.
   `ci-report.txt` phải phản ánh cả failure/skipped/cancelled, không chỉ success.
   Các kiểm phạm vi, contract, secret và hằng số của DoD 3–6 nằm trong nghiệm thu
   bootstrap; phạm vi đọc từ WP trên `main` tại SHA baseline đã pin. Không đổi
   baseline để hợp thức hóa diff, không dùng code PR để sửa luật được đọc.
   Đây không phải miễn CI cho PR chuẩn bị đặc tả và không thay nghiệm thu bằng Codex.

5. **Hoàn chỉnh đặc tả kiểm, giữ D-19/D-20.** WP-000 khai thêm workflow, lockfile và
   `scripts/acceptance-wp000.ts` trong Output; helper chứa fixture và các kiểm bootstrap,
   không thêm thư viện kiểm thử. Fixture có tên artifact và `episodeId` theo D-06,
   chỉ ở vùng tạm của Actions và bị dọn sau kiểm; không commit dữ liệu thử vào repo.
   Tầng 1 chạy đầy đủ `if/then` draft-07. Tầng 2 giữ quan hệ origin/publication,
   chặn claim tham chiếu model `partial`, yêu cầu lý do cho từng chỉ số `null`,
   và kế thừa phiên bản của đủ 17 nhóm artifact theo D-19/D-20.
   Bộ ba của brief và episode-state phải đủ và khớp nhau. Artifact không khai thì
   kế thừa; nếu khai thì phải khớp bộ ba đã đóng băng. Thiếu nguồn hoặc lệch thì fail,
   không chọn một bên, không lấy phiên bản visual tokens làm phiên bản Channel Pack.

   **Nguồn bất biến của bộ phiên bản.** `C` là commit nguồn đầy đủ được chủ dự án
   duyệt trước khi bắt đầu tập; không phải SHA tự tham chiếu của commit chứa artifact.
   `C` pin cả Engine và công cụ ở gốc repo. Từ `episodeId` xác định kênh; brief,
   episode-state và đường dẫn phải cùng kênh/tập. Đọc `channels/{channel}/channel.json`
   tại `C`, lấy genre từ chính file đó rồi đọc `genres/{genre}/format-spec.json` tại `C`.
   Định danh là chuỗi nhãn kèm Git SHA, không phải semver range:

   | Trường | Giá trị bắt buộc |
   |---|---|
   | `versions.engine` | `<channel.engineVersion>@git-commit:<C>` |
   | `versions.genre` | `<format-spec.version>@git-tree:<tree của toàn Genre Pack tại C>` |
   | `versions.channel` | `git-tree:<tree của toàn Channel Pack tại C>` |

   Git SHA là đủ 40 ký tự hex thường của repo hiện tại. Đọc nhãn không rỗng và cả hai
   pack tree tại cùng `C`, dựng bộ mong đợi rồi so khớp nguyên chuỗi. Nhãn đứng riêng
   không xác định được nguồn; phiên bản layout/asset-policy/visual tokens là phiên bản
   thành phần, không thay pin pack. Giữ nguyên cấu hình và schema, không thêm trường.
   Brief và episode-state phải đủ bộ ba, khớp nhau và khớp nguồn; đủ 17 nhóm artifact
   vẫn được kế thừa qua `episodeId` khi không khai. Không ghi ngược bộ kế thừa vào file.
   Không có commit trong nguồn đã cung cấp, thiếu nhãn/pack, thiếu hoặc trùng ánh xạ tập,
   hoặc có sai khác thì fail. Không tự dùng HEAD mới nhất, tự fetch lịch sử hoặc đoán pin.
   Pipeline phải giữ `C` đã đóng băng khi chạy tiếp; nguồn triển khai tương lai được
   duyệt riêng. Các pin Mốc 0 chỉ là bằng chứng nguồn, không nghiệm thu Engine sản xuất.

   Với outline, tỷ lệ beat là `estimatedMs / tổng estimatedMs`, ghép beat bằng
   `index`, đối chiếu `shareOfDuration ± limits.beatShareTolerance`; tổng thời lượng
   đổi sang phút kiểm riêng với `limits.targetDurationMin`. Thiếu hoặc trùng index
   khiến phép ghép mơ hồ thì fail. Không đặt dung sai hoặc khoảng thể loại trong code.
   Outline vẫn nhận số nguyên dương; brief/proof nhận số dương theo D-20.
   Không thêm ngưỡng nội dung cho clip proof. Fixture schema hợp lệ nhưng ngoài miền
   phải bị tầng 2 từ chối. Kiểm quan hệ tầng 2 trực tiếp để có bằng chứng riêng ngay
   cả khi luồng đầy đủ đã bắt dữ liệu sai ở tầng 1; không cho phép bỏ tầng 1 ở luồng thật.

6. **Đóng WP bằng bằng chứng của commit cuối.** Trong PR triển khai, dòng WP-000 có
   thể đề nghị `done` ở commit ứng viên cuối, nhưng đó chưa là nghiệm thu trên main.
   Commit chứa cả dòng này, code và lockfile phải qua Actions; chủ dự án đọc báo cáo
   năm mục và xác nhận checkpoint rồi mới quyết định merge. Đổi commit sau khi kiểm
   thì cần bằng chứng cho commit mới. Gói chuẩn bị đặc tả giữ nguyên mọi dòng backlog.
   Lockfile được tạo trong một lượt chuẩn bị Actions đã duyệt riêng, rồi đưa về nhánh;
   lần chuẩn bị thiếu lockfile không được tính là acceptance. Acceptance dùng
   `npm ci`, ghi Node/npm thực tế và không sửa lockfile. Sáu dependency trực tiếp
   cùng phiên bản trong WP giữ nguyên; dependency gián tiếp phải được khóa và trình
   trong lockfile trước nghiệm thu. Không tự chuyển việc cài/chạy sang Codex.

7. **Cổng CI riêng cho PR đặc tả #9, có phê duyệt giới hạn.** Review tại head
   `50e7d39387015858ef9e5985d36ac95a6974ea1b`, tree
   `121d12091b7dcecc8a9b13788741a17a1ad45f7f`, chưa có kết quả CI. Chủ dự án đã duyệt
   sửa đúng bốn tài liệu ở mục 1 và thêm `review-wp000-spec.yml`; schema allowlist giữ
   blob `a0de2c89a18bbe20e751dec69e5b508ee1a9efb9`. Delta là bốn sửa/một thêm;
   toàn PR so với main có sáu file. Thêm đúng một commit có parent là head trên,
   không amend/rebase/force-push, giữ PR Draft và cập nhật báo cáo năm mục.

   **Thay thế có giới hạn.** Mục này mở rộng riêng phạm vi năm file của gói đặc tả
   thành sáu file, cho phép JavaScript trong workflow/helper tạm thay quy ước TypeScript
   của AGENTS.md chỉ ở CI này, và cho phép cài công cụ tạm trước khi D-21 lên main.
   Nó không đổi phạm vi code WP-000, không đổi D-12 về nối khối sản xuất, không miễn
   kiểm CI/contracts và không dùng ngoại lệ CI Mốc 0. Quyền này đến từ phê duyệt
   cụ thể của chủ dự án, không phát sinh tự động từ việc đọc hoặc merge D-21.

   **Một lượt tự động.** Workflow chỉ nhận `pull_request` loại `synchronize` vào main;
   job chỉ chạy PR #9 còn Draft, head `wp/000` cùng repo, `run_number = 1` và
   `run_attempt = 1`. Không có push, dispatch, rerun, pull_request_target, Ready hoặc
   chuỗi gọi workflow khác. Checkout `pull_request.head.sha`, ghi riêng SHA sự kiện.
   Kiểm main/tree đúng checkpoint Mốc 0 và parent ứng viên đúng head đã pin trước
   cài/kiểm; đọc lại ref cuối lượt. Phạm vi lấy từ hai baseline bất biến và delta được
   duyệt, không đọc phạm vi do WP trên ứng viên tự sửa. Ref khác thì dừng.

   **Công cụ được khóa.** Node `20.20.2`, npm đi kèm `10.8.2`; chủ dự án chấp nhận
   Node 20 đã EOL cho đúng lượt CI này, không suy sang triển khai WP-000.
   Archive `node-v20.20.2-linux-x64.tar.xz` có SHA-256
   `df770b2a6f130ed8627c9782c988fda9669fa23898329a61a871e32f965e007d`.
   Action checkout v4.3.1 pin `34e114876b0b11c390a56381ad16ebd13914f8d5`;
   upload-artifact v4.6.2 pin `ea165f8d65b6e75b540449e92b4886f43607fa02`.
   Nguồn là nodejs.org, registry.npmjs.org và các action chính thức trên GitHub.

   Bộ bảy gói tạm: `ajv@8.12.0`, `ajv-formats@2.1.1`, `fast-deep-equal@3.1.3`,
   `json-schema-traverse@1.0.0`, `require-from-string@2.0.2`, `uri-js@4.4.1`,
   `punycode@2.3.1`. Workflow ghi nguyên URL và SHA-512 integrity đã được duyệt;
   tải, kiểm hash trước giải nén vào vùng tạm. Không chạy lifecycle script hoặc dùng
   resolver npm chọn thêm phiên bản. Không tạo manifest/lockfile gốc. Sáu dependency
   trực tiếp và yêu cầu lockfile của WP-000 giữ nguyên, chưa được cài bởi quyền này.

   Ajv bật `allErrors`, `validateFormats`, `strictSchema`, `strictTypes`,
   `strictTuples`, `strictNumbers`, `allowUnionTypes`; `strictRequired: false`.
   Tắt `coerceTypes`, `useDefaults`, `removeAdditional`. Giữ kiểm required/if/then và
   mọi kiểu/format của draft-07; không đổi option, schema hoặc dữ liệu sau lỗi để đạt.

   **Nội dung kiểm.** Kiểm phạm vi, D-01–D-20, blob/mode dữ liệu/backlog/schema,
   hai nhãn ở commit và tiêu đề PR; quét diff mới cho token/khóa riêng/gán secret,
   kiểm hằng số nội dung trong code/schema Engine, có ca âm và đối chứng hợp lệ.
   Kiểm đủ 38 schema bằng meta-schema draft-07 và Ajv; phân loại đủ 46 JSON.
   Kiểm tầng 1 tám file cấu hình/dữ liệu: bảy file ngoài state phải đạt.
   Allowlist có ca đạt có/không note, thiếu từng trường required, sai kiểu từng trường
   và phần tử allow/deny, khóa thừa; kiểm đúng keyword/path, không chỉ nhận một lỗi bất kỳ.
   JSON lạ, lỗi schema/ref/format, lỗi bất ngờ hoặc bị bỏ qua đều chặn cổng đặc tả.

   State gốc vẫn phải bị từ chối đúng bốn lỗi: thiếu sourceCommit, rebuiltAt sai kiểu
   vì null, hai khóa thừa engineVersion và aggregates. Ghi `state-current: invalid`,
   `realDataAllValid: false` và `wp000Acceptance: blocked`; không đổi kết quả state thành
   pass. Ca âm bắt đúng lỗi chứng minh schema từ chối dữ liệu sai. Cổng đặc tả chỉ
   nghiệm thu phạm vi kiểm này, không chứng nhận toàn bộ dữ liệu thật hợp lệ.
   Không chạy hoặc nghiệm thu tầng 2, scripts/validate.ts, fixture WP-000, hồi quy năm
   brief hoặc sản xuất; không gắn kết quả CI này với bộ 59 fixture PR #5 trong Codex.

   **Quyền, ngân sách và bằng chứng.** Một job GitHub-hosted `ubuntu-24.04` x64 tiêu
   chuẩn, không matrix, timeout 10 phút; trần riêng 0,10 USD. Token chỉ
   `contents: read`, `pull-requests: read`; checkout không lưu credentials; không
   secret provider, OIDC hoặc quyền ghi repo. Artifact tối đa 1 MiB, retention một ngày,
   không cache; agent đọc ngay và đưa kết quả vào báo cáo PR.
   `ci-report.txt` và log ghi run/attempt, SHA/tree thực tế, phiên bản runner/công cụ,
   các kết quả thật kể cả failure/skipped/cancelled. Thiếu báo cáo, sai SHA, lượt bị
   skipped/cancelled hoặc một kiểm bắt buộc lỗi thì chưa có nghiệm thu đặc tả.
   Báo cáo và dữ liệu thử chỉ ở vùng tạm; source tree phải sạch sau kiểm.
   Thiếu quyền/policy/quota, lệch checkpoint/pin, vượt giới hạn hoặc lỗi thì dừng,
   không đổi settings/credential, tự sửa, thêm lượt hoặc chuyển việc kiểm sang Codex.
   Thành công chỉ đủ để trình chủ dự án review; không chuyển Ready, merge, đóng WP,
   chuẩn hóa state, gọi provider hoặc cấp quyền/ngân sách tiếp theo.

**Phương án bị loại.** Bỏ state khỏi danh mục hoặc sửa schema cho state đạt; coi JSON parse
được là đã qua validator; merge code chưa kiểm để đăng ký workflow rồi gọi đó là done;
dùng kết quả fixture cũ trong Codex thay cho Actions; sửa dữ liệu hoặc suy quyền thực thi
WP từ phê duyệt đặc tả. Các cách này che lỗi, thiếu bằng chứng hoặc vượt phê duyệt.

**Hệ quả và giới hạn.** Bỏ yêu cầu thủ công duy nhất cho bootstrap WP-000, thay bằng bằng
chứng Actions gắn đúng commit trước merge; bỏ cách gọi mọi JSON là artifact, giữ kiểm
đủ file theo loại. Chấp nhận mất quy tắc chỉ reindex tạo chỉ mục đúng một lần nếu có
phê duyệt triển khai riêng và biên nhận, không cấp quyền thường trực. Ngoại lệ contracts
chỉ cho schema allowlist mới và README trong cùng PR có quyết định này; 37 schema cũ
không đổi. Ngoài các thay thế nêu trên, D-01–D-20 và guardrails giữ hiệu lực.

WP-000 vẫn chưa done khi chưa có kết quả Actions thực tế. Hồ sơ 59 fixture PR #5 là kiểm
schema trong Codex, không phải validator runtime hoặc Actions; hồi quy năm brief và các
giới hạn nghiệm thu Mốc 0 giữ nguyên. D-21 không nghiệm thu chất lượng prompt, hình/giọng,
C4 hoặc quyền tài khoản/provider, không thay giới hạn D-17, không sửa cấu hình đang chờ,
không mở WP sau hoặc cấp ngân sách triển khai/provider. Phê duyệt giới hạn ở mục 7
chỉ dành cho một lượt CI đặc tả; kết thúc lượt đó thì quyền/ngân sách ấy đóng lại.


---

## D-22 · Gói phát triển nhanh FS22-20260914

**Bối cảnh.** Cấp quyền từng lỗi, gate cố định run7/run8 và thời lượng tự đặt gây
gián đoạn phát triển. Quyết định này thay các ràng buộc điều phối được liệt kê dưới
đây; tính đúng theo D-19/D-20 và toàn bộ acceptance WP-000 không giảm.

**Không đặt deadline** task/job/phase, ngưỡng im lặng hoặc mốc phải đóng hồ sơ.
Tiếp tục việc được duyệt và lưu tiến triển hữu ích. Giới hạn bắt buộc của nền tảng
vẫn áp dụng, không phải quyền chi tiêu hoặc quyền chạy vô hạn. Không kế thừa mốc
thời lượng của CI đặc tả PR #9 hoặc các chế độ lịch sử sang gói mới.

**Phạm vi và quyền gộp.** Gói trên nhánh wp/000, PR #10 Draft gồm chuẩn bị đặc tả,
sửa lỗi trong phạm vi, CI và thu/lưu bằng chứng. Chỉ khi chủ dự án duyệt gói ghi/CI
thì agent được ghi tối đa ba commit nối tiếp từ
900833d041486643540ea794bbe0bbad80f557bb, mỗi commit một lượt CI chủ động và một
workflow đồng hành skipped. Không rerun; run_number chỉ để nhận diện lịch sử.
Mỗi commit có đúng ba trailer Fulcrum-Grant, Fulcrum-Slot, Fulcrum-Phase.
Slot 1–3 là số lượt trong gói, không phải deadline; failure vẫn tiêu tốn lượt.
Các sửa nhỏ đúng phạm vi không cần xin lại. Thiếu quyền,403 hoặc vượt phạm vi
chặn thao tác liên quan; agent tiếp tục phần độc lập hữu ích, không dùng đường vòng.

Cho phép đúng tám file: AGENTS.md; engine/ops/guardrails.md;
engine/docs/02-decisions.md; engine/ops/work-packages/WP-000-scaffold.md;
engine/ops/definition-of-done.md; .github/workflows/acceptance-wp000.yml;
scripts/acceptance-wp000.ts; .github/workflows/review-wp000-spec.yml.
Mọi file khác giữ blob/mode C, kể cả state, backlog, contracts và dependency.
Năm tài liệu chỉ nối cuối, giữ D-01–D-21. Thay riêng AGENTS phần STOP chung,
guardrails 14–15 và 26–27, WP-000 lệnh cấm sửa WP/DoD/quyết định trong triển khai
bằng phạm vi đặc tả/triển khai gộp này; không cho phép agent tự mở allowlist.

**Checkpoint gói.** Main giữ a7fecd4f8a614d10687b471f70f71a5d5e08685f/tree
ddb16f67fbf246e669dc28fc50718de75a365f11; C là điểm bắt đầu, không phải head
bất biến sau commit hợp lệ của agent. Sau mỗi ghi, xác minh tree/parent thật rồi
cập nhật expected head trong ledger. Không coi commit của chính gói là lệch
checkpoint để xin lại quyền. Thay điều kiện “chưa có package.json” tại WP-000
mục 2b cho gói tiếp tục này bằng bảo toàn package/lockfile/state đã có tại C.
Không cố định tổng số commit/file/dòng PR sau khi thêm delta được duyệt.
Ref đổi bởi nguồn ngoài gói phải đối chiếu trước ghi, không tự reset/rebase.

**Hai chặng trong cùng grant.** Commit đặc tả có title PR bắt đầu
[FS22-20260914:spec]. Cổng đặc tả mới thay giới hạn PR #9/run1 của D-21/DoD cho
riêng gói này, không dùng success #9 thay bằng chứng mới. Kiểm scope/bảo toàn,
secret, lịch sử quyết định, 38 schema, 8 cấu hình miền, 3 JSON công cụ chỉ parse,
fixture allowlist, state C hợp lệ tầng 1 và state main cũ âm đúng bốn lỗi.
Spec không nghiệm thu typecheck, tầng 2 hoặc WP-000. Có thể dùng JavaScript tạm
và công cụ shell hiện có của runner cho checker/đóng khung byte, không thêm dependency.

Sau spec success và agent nhận đủ bằng chứng nguyên nội dung, commit tiếp theo
chỉ sửa workflow acceptance để gắn FS_SPEC_COMMIT/FS_SPEC_RUN vào commit/run đã
đối soát; title PR bắt đầu [FS22-20260914:acceptance]. Có thể sửa lỗi helper/workflow
acceptance cùng chặng trong số lượt còn lại. Năm tài liệu và workflow đặc tả phải
giống spec commit đã đạt. CI kiểm ancestor, spec run success và đúng repo/PR/commit
trước cài/chạy. D-14 được giữ: quyết định đã commit và qua spec trước acceptance;
không cần merge quyết định hoặc tự merge WP trong gói này. Nếu spec chưa đạt thì
chỉ sửa chặng spec; hết ba lượt mà chưa đủ thì trình delta gỡ tối thiểu.

**Bằng chứng.** Với kiểm thuần văn bản, thay tiền đề luôn phải tải/lưu nguyên ZIP
bằng log job chứa toàn bộ report và byte các file chứng cứ mã hóa base64, có số
thứ tự chunk, byte/SHA-256 và marker kết thúc; đối soát run/job/checks đúng commit.
Connector trả decoded log không là raw HTTP/ZIP; giải mã các frame chỉ khôi phục
đúng byte đầu ra mới và phải khớp hash do runner in. Thiếu frame/hash sai thì chưa
nghiệm thu phần đó, không suy từ status xanh. Không upload/download ZIP trong gói.
ZIP run7 và ZIP review gốc thiếu không còn là tiền đề của kiểm độc lập mới; giữ
failure/evidence-incomplete, pin gốc và không giả làm đã nhận. Kiểm cần binary
chưa có kênh phù hợp vẫn chưa được nghiệm thu. Tái dùng nghiệm thu manifest,
11 file đối chứng và chuỗi input trên cùng bytes, không lặp CRC lịch sử.

**B1/B2, runtime và chi phí.** Gói ghi/CI đề nghị tối đa ba job Ubuntu 24.04 x64
tiêu chuẩn, dự phòng tổng 20 USD; đây là mức owner cần duyệt, không phải giá đo.
Không có hard-stop USD đã được chứng minh; billing có thể trễ và hóa đơn có thể
vượt dự phòng nếu job kéo dài. Agent không tự cấp/nâng ngân sách hoặc settings.
B1/B2 chưa biết vẫn ghi chưa biết; owner có thể chấp nhận riêng việc khởi chạy
gói nhỏ mà chưa đủ dữ liệu tài khoản. Từ chối quyền/quota/403 thì không retry.
Đề nghị ngoại lệ Node20.20.2/npm10.8.2 và action SHA hiện tại chỉ cho gói này;
Node20 EOL và patch Node24 của action chưa chứng minh vẫn là bảo lưu. Không tự
đổi pin/runtime. Actions token chỉ contents:read, pull-requests:read và
actions:read cho đọc spec run, không provider hoặc quyền ghi từ runner.

**Điều kiện nghiệm thu.** Giữ toàn bộ mục 6 WP-000, DoD kiểm thật đúng commit cuối,
ca âm và guardrails. Lỗi làm job fail; sửa đúng phạm vi dùng lượt tiếp theo đã duyệt.
Spec thành công không làm acceptance pass. Kết quả kỹ thuật đầy đủ chỉ đủ trình
owner nghiệm thu; không tự Ready/merge/đóng WP, provider, deploy hoặc mở WP khác.

**Phương án bị loại và bảo đảm giảm.** Không đổi timeout thành mốc dài hơn; không
vòng xin phép từng sửa nhỏ; không giả nhận ZIP thiếu; không đổi failure thành pass.
Giảm pháp chứng ZIP nguyên gói cho kiểm văn bản, không bảo đảm deadline, quota hay
hóa đơn trong dự phòng, không owner review mỗi sửa nhỏ. Bù bằng grant có scope,
commit/run identity, bằng chứng đầy đủ và kiểm kết quả thật. Cơ chế trong repo không
thay quyền nền tảng; thao tác agent trước/giữa các commit phải đối soát ledger thật.
Giữ STOP lịch sử, timeout120s/exit124, HTTP403, thiếu ZIP run7, lệch đóng gói
32,021 giây, B1/B2, Node và mọi lịch sử. Pin ZIP gốc 6634470 byte/SHA-256
14ab6b95c34521d7093eb4b8b5204977bee9a8b7a7662dd1eb771db6e94e9ae1 không đổi.


## D-23 — Gói FS23-WP001: bootstrap CI với quyền sửa–kiểm–thu gộp

**Phạm vi.** Chỉ HungQuach301/fulcrum-studio, sau nghiệm thu kỹ thuật WP-000 tại H=33f64ff4835d2a84b4ea9b6960ab39c9ac130d09. Khi owner cấp toàn bộ FS23, cho Ready/merge-only PR10 bằng merge commit M có hai parent A=a7fecd4f8a614d10687b471f70f71a5d5e08685f và H, tree df4f39ccf146627643a19c925e8c56b65e88c3b5. Không sửa H, không merge WP001.

**Thứ tự.** Sau M, commit policy S trên wp/001 chỉ nối PROJECT.md, AGENTS.md, engine/ops/guardrails.md, engine/docs/02-decisions.md, engine/ops/definition-of-done.md, engine/ops/work-packages/WP-001-ci-guardrails.md. Đọc lại parent/tree và chốt pin trước code. Sáu file không đổi sau S. Cho một PR Draft gồm S và implementation, không cần PR spec riêng; CI cuối phải kiểm toàn bộ diff. Không gọi S đã CI-pass khi chưa chạy.

**Tiền đề bootstrap.** Thay riêng WP001 mục2b: tree M bằng H và bằng chứng H đã owner nghiệm thu đáp ứng tiền đề công cụ/validator, không giả có run M. Cho phát triển đến Draft khi main protected=false; không claim PR enforcement, không đổi settings. Runner không quyền ghi; owner giữ quyết định merge. Ngoại lệ này không tự áp cho WP002 hoặc quyền merge WP001.

**Phạm vi implementation.** Chỉ .github/workflows/ci.yml, scripts/guardrails/index.ts, scripts/guardrails/scope.ts, scripts/guardrails/content.ts, scripts/guardrails/secrets.ts, scripts/guardrails/guardrails.test.ts, scripts/ci-report.ts, và một ô trạng thái WP001 trong engine/ops/backlog.md. Literal done trên PR là đề nghị. Cấm file .scope, dependency mới, sửa package/lock/tsconfig/validator/contracts/state hoặc workflow FS22.

**Nguồn luật.** Giữ đọc allowlist code từ WP/CP trên main resolve SHA. Ngoại lệ docs chỉ sáu file S được owner định danh trước code, bảo toàn tiền tố M và freeze S; thay riêng điều kiện PR WP-change chỉ-docs cho trường hợp này. Docs thay sau S hoặc code ngoài main allowlist phải fail. Không tuyên bố cơ chế này thay được GitHub branch protection hoặc chống được tài khoản toàn quyền repo.

**Kiểm và chứng cứ.** Bốn job validate/typecheck/guardrails/report. Cả push/PR chạy thật, checkout candidate SHA rõ ràng; giữ correctness D19/D20. Sáu ca acceptance WP001 chạy trong Actions bằng temporary Git fixtures qua scanner production, không commit lỗi thử vào repo. Report dưới 100 dòng, tối đa 20 dòng lỗi/job, đủ verdict thật; file chứng cứ đầy đủ riêng qua frame log. Thay upload-artifact bằng frame byte/hash/run/head/attempt/chunk/complete và nhận/lưu ngoài runner. Own report final/cleanup kiểm từ metadata/log sau cùng; thiếu output không suy success.

**Quyền gộp.** Một commit S và tối đa sáu commit implementation/fix, tối đa 12 CI chính/48 runner jobs và 12 workflow FS22 skipped, tổng 24 run record mới. Agent được tạo branch/PR, blob/tree/commit, fast-forward force:false, cập nhật body/title giữ lịch sử, đọc refs/checks/runs/jobs/decoded logs và lưu bằng chứng. Không rerun/dispatch, không tạo nhánh test thật, không tự hạ gate để pass. Tự sửa lỗi đúng tám file implementation trong grant, không xin lại từng bước. Hết quyền chỉ chặn ghi/CI mới, vẫn thu/lưu kết quả đã có và trình delta tối thiểu.

**Thời gian và checkpoint.** Không deadline task/job/phase hoặc ngưỡng im lặng gây STOP; giới hạn bắt buộc nền tảng vẫn tồn tại. M và chuỗi S/implementation của chính gói là checkpoint mới hợp lệ sau kiểm tree/parent. Ref bị nguồn khác đổi thì đối chiếu trước ghi, không tự reset/rebase. Blocker chỉ chặn phần phụ thuộc, không dừng công việc độc lập hữu ích.

**Runtime/chi phí.** Chỉ sau owner duyệt dự phòng mới 30 USD và rủi ro B1/B2/billing chưa đủ, không hard-stop USD, hóa đơn có thể trễ/vượt dự phòng. Ngoại lệ Node20.20.2/npm10.8.2, archive SHA df770b2a6f130ed8627c9782c988fda9669fa23898329a61a871e32f965e007d; checkout/setup-node pin lần lượt 34e114876b0b11c390a56381ad16ebd13914f8d5 và 49933ea5288caeca8642d1e84afbd3f7d6820020. Giữ EOL/action Node24 patch chưa chứng minh; không kế thừa FS22 hoặc tự nâng pin. Cài theo lock, ignore-scripts/no-audit/no-fund, chỉ Actions. Token contents:read/pull-requests:read, không provider, settings hoặc credential mới.

**Giới hạn.** Giữ nghiệm thu manifest/11 file/chuỗi input và WP000 đúng H. Giữ pin ZIP gốc 6634470 byte/SHA-256 14ab6b95c34521d7093eb4b8b5204977bee9a8b7a7662dd1eb771db6e94e9ae1, STOP lịch sử, timeout120s/exit124, HTTP403, ZIP run7 thiếu, lệch đóng gói 32,021 giây, billing/Node và mọi lịch sử. Không tải ZIP/artifact, retry403, dùng đường vòng, gửi hỗ trợ, merge WP001, gọi provider hoặc mở WP002. Gói mới không phải nghiệm thu lại ZIP thiếu.



## D-24 — FS24-B: state identity, artifact transport and bounded integration

Owner has approved FS24-B section 4 from libfile_27065ac143888191b0192f68aa6f00de (188162 bytes, SHA256 2b9fba1343ac366f5e8ca5fa0140e26a989a6a2cfd3e23409b662e627935cd8b). This is the policy commit preceding implementation. Within the incorporated specification below, proposal/pending-permission wording records its origin; the current owner grant authorizes the entire section. No other permission is implied. Preserve previous decisions and acceptance/history. Backlog WP002 remains todo. Code writes use wp/002; only the admitted six data paths may later be written to main by writer/reindex under this grant.

The source N and checkpoint C2, all counters, gates, runtime and reduced guarantees below are normative. Policy bytes freeze at this commit before implementation.


Đây là **đề nghị**, chưa cấp quyền. Mục tiêu là sửa F1 và kiểm luồng repo-backed thực cho WP-002, chỉ với hai tập giả, không bật nhà máy/provider. Một lần duyệt bao gồm policy → sửa/test → prequalification artifact → conditional Ready/merge PR12 → integration main → thu/lưu/review; không xin lại từng lỗi trong phần trước merge khi còn scope/counters.

### 4.1 Phạm vi đóng: 21 đường dẫn

| # | Đường dẫn | Mục đích |
|---|---|---|
| 1 | `engine/docs/02-decisions.md` | Nối D-24 cho B, bảo toàn D01–D23 |
| 2 | `engine/ops/work-packages/WP-002-interfaces.md` | Nối scope/grant/nguồn giả và ngoại lệ bootstrap B; không bỏ A1–A9 |
| 3 | `.github/workflows/ci.yml` | Bootstrap pin, CI final qua dispatch, source mapping fixture, đủ bốn job |
| 4 | `scripts/guardrails/index.ts` | Ngoại lệ B hẹp theo policy commit pin, giữ scan production |
| 5 | `scripts/guardrails/scope.ts` | Context explicit của final validation dispatch, không giả nhãn push |
| 6 | `scripts/guardrails/guardrails.test.ts` | Hồi quy bootstrap/dispatch và ca âm scope/policy |
| 7 | `.github/workflows/acceptance-wp002.yml` | Prequalification PR/push và controller main sau CI |
| 8 | `engine/io/repo-store.ts` | Sửa F1; primitive batch validate/apply chung nếu cần, không phá API cũ |
| 9 | `engine/io/repo-store.test.ts` | Sửa ID fixture, regression F1/batch/pending projection |
| 10 | `engine/io/github-transport.ts` | Transport GitHub có request/receipt binding |
| 11 | `engine/io/github-writer.ts` | Main backend, atomic file-list, append batch, replay/CAS/read-back |
| 12 | `engine/io/wp002-integration.ts` | Điều phối test/artifact/dispatch/evidence, không chứa hằng số nội dung pack |
| 13 | `engine/io/wp002-integration.test.ts` | Kiểm lỗi transport/batch/admission bằng fixtures |
| 14 | `.github/workflows/commit-artifacts.yml` | workflow_dispatch, writer hẹp |
| 15 | `.github/workflows/reindex.yml` | workflow_dispatch, only-index writer |
| 16 | `episodes/us-personal-finance/2026-09-fs24-left/00-brief.json` | Runtime fixture left |
| 17 | `episodes/us-personal-finance/2026-09-fs24-left/state.json` | Runtime fixture left |
| 18 | `episodes/us-personal-finance/2026-09-fs24-right/00-brief.json` | Runtime fixture right |
| 19 | `episodes/us-personal-finance/2026-09-fs24-right/state.json` | Runtime fixture right |
| 20 | `pipeline/runs.jsonl` | Append 50 record test, không sửa dòng cũ |
| 21 | `pipeline/state.json` | Reindex duy nhất, từ state thật ở SHA đã chốt |

Hai path policy tạo **một commit P**, sole parent C2, trước implementation. Chốt P/tree/blob vào hồ sơ và các preflight trước code; CI bootstrap phải kiểm đúng P, full delta N→candidate, ancestry, danh sách path và policy bất biến. CI cũ có thể reject P vì ngoài scope A; lưu failure thật, không miễn cả CI hoặc gọi P pass. Tối đa năm commit implementation/fix sau P để sửa và kiểm toàn gói. Không dùng squash/rebase để xóa lịch sử A hoặc bootstrap failure.

Các file 16–21 chỉ ghi khi integration đã được admit; không đưa fixtures vào code commit trước merge. Không sửa `scripts/validate.ts`, contracts, package/lock, providers, settings, credential, AGENTS/PROJECT hoặc backlog. Backlog giữ `todo` cho tới quyết định nghiệm thu toàn WP riêng; **B hoàn tất kỹ thuật không tự đóng toàn WP**.

### 4.2 Nguồn giả và quyền ghi dữ liệu

Owner cần duyệt mapping **chỉ cho kiểm kỹ thuật**:

```text
us-personal-finance/2026-09-fs24-left  = bd7f0eb5b225ed43d610af12b5febbe82a7dbec4
us-personal-finance/2026-09-fs24-right = bd7f0eb5b225ed43d610af12b5febbe82a7dbec4
```

Đọc Channel/Genre/layouts và tuple versions từ N; không chọn lại nguồn theo latest và không tự tạo tỷ lệ/giới hạn pack. Brief bắt buộc có trường schema như approvedBy nhưng phải ghi rõ là fixture trong topic/thesis/title và báo cáo; phê duyệt này không là Gate1 nội dung hoặc quyền xuất bản. Payload của ca side effect dùng chính `00-brief.json` schema-valid, không tạo `payload.json` không được validator phân loại. Cả cặp brief/state ban đầu được commit nguyên tử trong cùng một tập, tránh main có state thiếu brief.

Writer chỉ nhận hai ID/path trên và runs.jsonl trong batch B. Mỗi request chứa writeId, danh sách file/mode/schema, expected source base, artifact/run identity và digest; identity/digest ổn định khi retry/replay. Một transaction chỉ chạm một episode và/hoặc append log, không chạm hai episode. Hai request log chứa 25 dòng mỗi request, validate từng dòng trước commit, đọc log latest, append nguyên batch và ghi một commit có writeId. Đây là mở rộng batch cần regression mới; kết quả A chưa chứng minh nó.

Tối đa **9 commit dữ liệu** trong một batch integration: 2 tạo cặp tập, 2 cập nhật cùng tập, 1 đánh pending, 1 side-effect brief, 2 append batch, 1 reindex. Duplicate/replay/invalid tạo **0** commit. Nếu cần thêm commit dữ liệu để repair sau khi ghi, giữ kết quả và trình delta cụ thể; không tự sửa lịch sử, dọn/xóa fixtures hoặc rollback.

### 4.3 Artifact, dispatch và quyền tối thiểu

**Artifact mới của B:** hai producer tạo hai artifact có tên gắn grant/run/head/left hoặc right; chứa manifest và payload schema-backed cho các ca. Mỗi artifact tối đa 1 MiB tổng payload giải nén, ZIP nhận tối đa 2 MiB; đây là giới hạn dữ liệu của grant, không là thời hạn task. Không nhận artifact run7 hoặc ZIP review lịch sử. Pin Actions upload dùng lại pin đã khai lịch sử `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02`; chỉ cho artifact test mới. Không thêm package/dependency.

Trước nhận: bind repository, producer run/attempt/job, SHA/tree, artifact ID/name và digest thực trả về; ID chưa có hôm nay nên chưa bịa pin. Receiver dùng REST artifact chính thức trong Actions, GITHUB_TOKEN actions:read; chỉ theo redirect nhận ZIP của chính artifact đó, không chuyển Authorization sang host lưu trữ. Nhận nguyên byte vào nơi riêng; kiểm ZIP digest nếu API cung cấp, manifest và từng file byte/hash, CRC, duplicate/traversal/link/unexpected entry; không execute payload. Nhận thiếu digest upstream thì ghi mức xác thực thực có, không gán hash tự tính là upstream pin. Phải có expected payload hashes từ producer độc lập để apply.

Prequalification trên PR/push chỉ upload/download artifact mới và kiểm temp filesystem/Git; **không ghi main**. Chọn một artifact mỗi lượt prequalification, không quá 12 trước merge; integration thêm hai: tối đa **14 artifact mới**, 14 lần nhận đầu, không tải lại để xóa failure. Emit raw ZIP/manifest/receipts qua frames khi nằm trong cap, nhận nguyên byte và lưu cùng hồ sơ kết quả; không tạo lại ZIP từ payload. Chỉ frame truyền thành công chưa đủ: chốt receiver pin và write read-back.

**Quyền Actions theo job:** kiểm chung `contents:read`, `pull-requests:read`; producer upload dùng token artifact runtime của job; receiver `actions:read`; controller `actions:write` để dispatch/cancel đúng run test; writer `contents:write` và `actions:read`, riêng ca hủy thêm `actions:write`; reindex `contents:write`. Không secret mới, không PAT, không quyền administration/settings/provider. Token GitHub là repo-scoped, không thật sự path-scoped: path cap được thực thi trong code/admission đã review; owner cần chấp nhận hạn chế bảo đảm này.

Connector hiện có không expose POST dispatch/cancel. Đề nghị dùng controller chạy **trong chính workflow đã được duyệt của repo**, qua API chuẩn và GITHUB_TOKEN; đây là capability mới cần duyệt ở B, chưa gọi trong lượt này. Không dùng proxy, repo khác hoặc credential khác khi bị từ chối. REST dispatch yêu cầu actions:write và ref là branch/tag; ghi response/run ID theo API version hỗ trợ, không đoán request thành công từ việc mất response. [GitHub REST dispatch](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event).

**Hàng đợi:** writer dùng `repo-write`, cancel-in-progress false. Đề nghị `queue: max` để không thay pending request thứ ba; test kiểm effective config và mọi run ID. Không suy FIFO theo thứ tự dispatch: thứ tự chờ thực tế mới là căn cứ. Reindex workflow giữ group `reindex`, cancel-in-progress true, và job ghi index dùng chung khóa `repo-write` cancel false để không tranh main với writer; không đặt queue:max ở group cancel true. [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

### 4.4 Trình tự, activation và nghiệm thu

1. Đọc lại N/C2/tree/PR/ledger trước ghi; nếu lệch, xác định delta bằng GET và trình pin mới, không tự áp gói lên base khác. Ghi P rồi implementation trên wp/002; mỗi commit kiểm sole parent/tree/ref, counters toàn repo, giữ PR Draft trong prequalification. Tự sửa lỗi trong năm commit implementation đã đề nghị.
2. Candidate cuối phải F1 regression pass; 29 ca cũ được cập nhật hợp đồng ID, 88 ca guardrails cũ và ca mới pass; CI push/PR đủ bốn job, foundation và artifact prequalification pass; không file ngoài 15 path code/policy. Trình source manifests/receipts trong kết quả tự review. Không ghi dữ liệu runtime trước gate này.
3. **Chỉ khi owner duyệt cả ngoại lệ này:** Ready và merge-only PR12 một lần tại candidate đạt; kiểm base N ngay trước merge. S là merge commit có đúng hai parent N, candidate-final và tree đúng candidate-final. Nếu base đổi hoặc merge trả không rõ, đọc lại trạng thái trước mọi quyết định; không tự gọi merge lần hai. Cửa sổ cạnh tranh do main unprotected vẫn còn.
4. CI push main S tự phát sinh; chờ đủ bốn job final success và preservation. `acceptance-wp002.yml` chỉ admit batch B qua workflow_run completed của đúng CI push main S, đúng repo/branch/attempt, marker grant và merge đã duyệt. Không admit fork/PR event, code tùy ý, run không thuộc grant hoặc CI final-dispatch. Chỉ checkout code S bất biến, không checkout head thay đổi rồi thực thi bằng token write.
5. Hai producer jobs cùng chụp main S. Mỗi job upload artifact riêng và dispatch request đầu cho tập mình; giữ bằng chứng riêng của hai job. Controller theo dõi run IDs và điều phối các ca tiếp theo; token không được chạy mã từ artifact. Đồng bộ barrier bằng trạng thái/receipts, không dùng “im lặng X phút” làm failure.
6. Thực hiện A1–A9 trong bảng sau; kiểm writeId/history, parent/tree và read-back mỗi write. Dữ liệu nguồn N không đổi. Final reindex đọc state tại SHA cụ thể rồi CAS index trên main latest cùng serialization; không trỏ sourceCommit vào commit index tự tham chiếu.
7. Controller dispatch CI final-validation một lần sau reindex, pin SHA cuối; ci.yml truyền hai `--source` mapping trên cho validator, giữ event dispatch thật và full source checks. Token push không tự sinh CI push, nên bước này bắt buộc. Sau final CI thu logs/frames/status/cleanup/ledger và tự review toàn bộ. [GitHub trigger bằng GITHUB_TOKEN](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
8. Kết thúc bằng hồ sơ kỹ thuật; PR12 có thể đã merged theo ngoại lệ, nhưng WP002 vẫn todo chờ owner đọc báo cáo/checkpoint và xử lý backlog trong grant kế tiếp. Nếu integration/hậu kiểm fail sau merge, lưu delta và đề nghị đúng patch/quyền còn thiếu; không rollback hoặc gọi lại Ready/merge. Không đổi acceptance để gọi fail thành pass.

Workflow_dispatch và workflow_run cần workflow trên default branch; đó là lý do bước 3 phải được duyệt tường minh. Nếu không duyệt bước 3, agent vẫn hoàn thiện toàn bộ diff, regression và artifact prequalification trong quyền B, rồi bàn giao bản cụ thể để duyệt activation; không thể gọi phần đó là D15 main đã đạt. [GitHub events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch).

| Ca WP002 chuẩn hóa | Bằng chứng phải thu ở B |
|---|---|
| A1/A6: hai job, hai tập cùng base | Hai producer job IDs, cùng S, hai artifact IDs/dispatch receipts, hai commit/read-back tồn tại cả hai tập |
| A2: cùng tập | Hai request cùng tập, run order thực, job sau ghi/đọc revision trước, không mất update |
| A3: duplicate writeId | Gọi lại request đầu; receipt cũ, delta commit=0; đổi payload cùng ID bị reject trong regression |
| A4: cancel sau push | Một run side-effect đã push/read-back rồi **hủy chính run đó**; run metadata cancelled; dispatch mới cùng writeId trả receipt cũ, delta=0. Đây là ngoại lệ cancel một run, không rerun API |
| A5: artifact xong/state lỗi | Đánh pending trước; brief write thành công; state invalid bị reject trước commit; đọc lại incomplete/pending, không công bố done |
| A7: 50 dòng | Hai writer jobs từ hai producers, 25 dòng mỗi batch, tập runId đúng đủ 50, prefix cũ giữ nguyên; chỉ hai log commits |
| A8: reindex | Hai states/read SHA, chỉ reindex ghi index, output schema/domain/sourceCommit đúng; pending projection có regression |
| A9: invalid state | Dispatch có invalid state, bị reject trước commit; raw failure là expected negative có assertion/receipt, không giấu status |

### 4.5 Counters, runtime và ngân sách đề nghị

Không kế thừa tiền/lượt chưa dùng của A. Đề nghị mới **20 USD dự phòng**, chưa cấp hoặc chi trong review. Đây là khoản dự phòng do đề nghị chọn, không là báo giá, actual cost hoặc hard cap.

| Hạng mục B | Cap đề nghị / cách đếm |
|---|---|
| Code/policy commits | 1 P + tối đa 5 implementation/fix = 6; không commit code sau merge trong gói này |
| Merge | Tối đa 1 merge-only PR12, có điều kiện như trên |
| Runtime data commits | Tối đa 9; chỉ sáu data path; replay/negative không được tiêu một commit |
| Dispatch | 11 writer + 1 reindex + 1 final CI = tối đa 13; producer đã tính trong 11, không cộng lại |
| Cancel | Tối đa 1, chỉ run test sau push ở A4; không rerun/force-cancel tùy ý |
| Active workflows/jobs | Tối đa **44 run / 100 job**, gồm mọi push/PR/main/controller/dispatch, cả failure/cancelled |
| Skipped records | Tối đa **16** riêng; gồm FS22 đồng hành và listener không admit |
| Artifact mới | Tối đa 14 như §4.3; không tải ZIP lịch sử |
| Provider | 0 lời gọi, 0 ngân sách provider |

Kịch bản tính: sáu code commits × (2 CI chung bốn job + 2 foundation một job) = 24 run/60 job; merge-main CI 1/4; controller 1/5; 11 writer + 1 reindex =12/12; final CI1/4. Tổng dự tính tối đa theo cấu hình này **39 active run/85 job**, chưa dùng buffer 5/15. FS22 tối đa12 skipped từ sáu sự kiện PR; listener final không admit tính riêng, tổng phải trong16. Mọi record bất ngờ được ghi trước hành động chủ động tiếp theo; không coi một commit là một CI, không coi buffer là quyền dispatch/rerun thêm.

Runtime B đề nghị: Ubuntu24.04; Node20.20.2/npm10.8.2 với archive SHA256 **df770b2a6f130ed8627c9782c988fda9669fa23898329a61a871e32f965e007d**, checkout/setup action pins hiện hành, upload action pin riêng ở §4.3; npm ci từ lockfile hiện có, ignore-scripts, trong Actions, không cài/chạy project tại Codex. Giữ ngoại lệ Node20 EOL/action Node24 patch unproven và nhãn CI legacy khi có receipt gắn đúng B. Không tự đổi dependency/runtime để chạy qua lỗi.

Không deadline task/job/phase, timeout tự đặt hoặc ngưỡng im lặng gây STOP; giữ giới hạn nền tảng. CAS tối đa năm attempts chỉ cho xung đột là hợp đồng xử lý conflict, không áp cho HTTP403. Request dispatch/merge mất ack phải GET đối chiếu trước, không blind retry. Khi chạm cap thì không tạo tác vụ mới ngoài grant; vẫn thu/lưu kết quả đang có và trình delta, không để một tác vụ chờ vô chủ.

Owner cần chấp nhận protected=false/cửa sổ base cạnh tranh, token write không path-scoped ở nền tảng, bootstrap merge trước full E2E, hai tập test/log được giữ trên main, B1/B2/billing chưa đủ, không hard-stop USD và hóa đơn có thể vượt20USD. Không được diễn giải là miễn validation hoặc cấp quyền provider. Billing thực chưa biết; lấy được thì báo, không lấy được thì giữ unknown.



## D-25 · FS24-B-R1 receipt diagnosis and repair bootstrap

This appended decision becomes executable only after owner approval of the pinned offline R1 package. It preserves D-24, the failed batch and PR12 merge as immutable history. It does not retroactively approve the failed integration. WP002 remains todo.

R1 is a diagnostic repair, not activation of the old FS24-B batch. Source N remains bd7f0eb5b225ed43d610af12b5febbe82a7dbec4. Historical merge S is 83786225fdaff2fcbc82cd2b99212a905dd19ceb with parents N, 19bb30568885ef6cb2c7c4b3c8cb9053f9b1fe21 and tree dc59bf4b8e470fa23a042acd4bf19f909dca5e0c. Never equate S with the frozen source N or rewrite PR12.

Exact R1 code/policy scope is the nine paths appended to WP002. One policy commit P1, sole parent S, modifies only this file and WP002, preserving their full byte prefixes. The next one to three implementation/fix commits are linear descendants, freeze both policy blobs, carry unique Fulcrum-Grant: FS24-B-R1, Fulcrum-Phase: implementation, Fulcrum-Iteration: sequential integer trailers and stay inside the seven remaining paths. P1 uses Fulcrum-Phase: policy. Policy-only CI failures before the new bootstrap exists remain historical failures, not passes. The agent verifies P1/tree/parent/blob and ledger before proceeding.

Reuse wp/002 only after verifying its current H is an ancestor of S; create P1 with parent S and fast-forward the branch directly from H to P1, without an intermediate ref update to S; never force-reset or delete. A new repair PR is opened against main S; PR12 is never reopened or merged again. CI push and PR must pass full four-job checks, foundation tests and historical receipt diagnosis at the final candidate. Owner approval of this R1 package may include one conditional Ready/merge of that new PR only. Merge R has exactly two parents S and candidate, and exactly the candidate tree. Its message carries Fulcrum-Grant: FS24-B-R1, Fulcrum-Phase: diagnostic-bootstrap and Fulcrum-Repair-PR: the actual new PR number. No guessed future SHA or PR number.

After R, automatic push-main CI must pass all four jobs. The acceptance listener performs read-only diagnosis of both historical PR12 and the repair PR, binding API response, repository, branch, attempt, triggering CI and parent/tree/policy. It emits raw response bytes and a selective request metadata receipt before JSON interpretation, preserving malformed or mismatched responses. A failing field remains fail-closed. No fallback to a later GET, no retry403, no API-version guessing and no synthetic reconstruction of the lost response. HTTP errors preserve their status and evidence, and are not retried.

R1 does not dispatch, cancel, upload/download Actions artifacts, call providers or write episode/log/index data. Existing B producer/controller routes in acceptance are replaced by this read-only listener in the candidate; history remains in S. Writer/reindex workflow files are unchanged and still reject repair R because they bind PR12/S. Changing those two entrypoints and authorizing a new integration batch requires a separate explicit delta; do not route data writes through another job to avoid them. Source mappings for the two historical synthetic episodes remain N.

Proposed fresh R1 allowance, effective only with owner approval: one policy plus up to three implementation commits, one new PR/conditional merge, at most 20 active workflow runs/64 job records and 12 skipped workflow records, zero dispatch/cancel/data commits/artifacts/provider calls. Count all push/PR/main/listener records, failures included. Reserve 5 USD is not a price or hard cap; actual billing remains unknown. No inheritance of unused B budget. Runtime exception is Ubuntu24.04, Node20.20.2/npm10.8.2 with archive SHA256 df770b2a6f130ed8627c9782c988fda9669fa23898329a61a871e32f965e007d and existing pinned actions/lockfile, npm ci ignore-scripts only in Actions. Retain Node20 EOL/action Node24 patch unknown, B1/B2/billing unknown, main protected=false and base race, no hard-stop USD and possible reserve overrun.

The agent may fix errors inside the seven implementation paths before merge without asking per error. After merge it collects diagnosis/main CI and reports any delta; no second merge, code fix, rollback or old batch replay in this grant. No task/job/phase deadline or silence threshold. Preserve secret/schema/scanner checks, all historical pins, prior partial acceptances and WP002 todo. This infrastructure diagnosis is recorded in CI evidence, not fabricated as a production stage or charged provider run.


## D-26 · FS24-C — bounded successor integration

This offline policy proposal is executable only after an explicit owner grant of the pinned offline package. Preparing these bytes does not grant execution. Preserve D-01–D-25, all R1 pins and the missing original B response. The source plan is libfile_9804771d85948191bc9005a2a8543102, 6494579 bytes, SHA256 0d522b0555e1f0c7d3195cc372ed7079d3a3f3f7471c4039d99c0eb3d3f81bde. The incorporated scope, counters, gates and reduced guarantees below are normative when approved. Q has sole parent R; its two appended policy blobs freeze before implementation. No grant is inherited.

## 4. Phạm vi và policy của gói FS24-C — đề nghị duyệt mới

Tên FS24-C do báo cáo này đề nghị để phân biệt batch mới với B/R1. Một approval cho toàn §4–§8 sẽ cấp sửa–kiểm–thu trong phạm vi, không hỏi lại từng sửa nhỏ còn trong slot trước merge. **Lượt hiện tại chưa có approval đó.**

Ba dòng D-14 cho activation:

- Ràng buộc: D-25/WP002§9 quy định “The nine-file repair cannot activate A1–A9” và cần “a separate explicit delta”; chỉ dẫn hiện tại chưa cho repo/CI/dispatch/data/provider/ngân sách mới.
- Bị chặn: không có entrypoint/backend/final CI/grant mới được admit; A3/A4 và D-15 cần dispatch/artifact thật, A4 cần cancel thật. Mock hoặc GET đọc-only không thể thay các bằng chứng ấy.
- Thay đổi tối thiểu: append D-26 và WP002§10 cho đúng12path policy/code +6data path dưới đây, một batch sau PR mới, cap/ngoại lệ cụ thể ở §7–§8; chấp nhận bootstrap merge trước full E2E, quyền token repo-wide và chín data commits kiểm thử được giữ trên main. Không mở provider/sản xuất.

### 4.1 Mười hai path policy/code

| # | Path | Delta tối thiểu |
|---|---|---|
|1|`engine/docs/02-decisions.md`|Append D-26, giữ toàn bộ prefix D01–D25; ghi grant/lineage/scope/counters/ngoại lệ/gate|
|2|`engine/ops/work-packages/WP-002-interfaces.md`|Append§10, giữ§1–§9/A1–A9, WPtodo và nghiệm thu riêng|
|3|`.github/workflows/ci.yml`|Bootstrap mới, mọi preflight và final-dispatch gate, source mappings; không giảm4 jobs|
|4|`scripts/guardrails/index.ts`|Policy checker mới pinR/Q, linear chain/scope/freeze; giữ B/R1 validators/pins|
|5|`scripts/guardrails/guardrails.test.ts`|Ca âm policy/base/event/scope/lineage mới qua scanner production, giữ89case cũ|
|6|`.github/workflows/acceptance-wp002.yml`|Foundation/prequalification + admission/producers/controller/report theo graph§5; raw/cleanup/completeness|
|7|`engine/io/github-transport.ts`|Grant manifest mới, observer receipt activation, raw dispatch/cancel, request binding/pagination/ZIP receipts|
|8|`engine/io/github-writer.ts`|AdmissionT, strict batch/reindex input, exact data chain/remote readback/duplicate evidence|
|9|`engine/io/wp002-integration.ts`|Grant mới, hai producers độc lập, coordinator11 writers+reindex+finalCI, A1–A9 assertions/counters|
|10|`engine/io/wp002-integration.test.ts`|Giữ50regressions R1, bind lịch sửC3 đúng nghĩa, thêm ca âm mới và thiếu chứng cứ|
|11|`.github/workflows/commit-artifacts.yml`|Writer admission mới; giữ repo-write/cancel:false/queue:max, hai job write/cancel-test, quyền hẹp|
|12|`.github/workflows/reindex.yml`|Reindex admission/input mới; giữ groupreindex cancel:true và jobrepo-write cancel:false/queue:max|

Chỉ1–2 ở Q; **đóng băng byte/blob hai policy từ Q xuyên I1–I3/D/T/F**. “Giữ policy pins” nghĩa là giữ nguyên pins và bytes lịch sử ở N/S/P1/C3/R, không thay constantB/R1 thành pin mới. D-26 có pinsQ riêng, được lấy từ commit thực, không tự tham chiếu Q trong chính bytes tạo Q. Candidate check xác minh cả prefixR và blobQ, historical checker kiểm đúngC3/H chứ không đòi policy mới phải bằng policy cũ.

Mười path3–12 là implementation/fix scope mới, mở rộng từ chín path R1 có lý doC01–C11. Không sửa `scope.ts`, `repo-store.ts`, `repo-store.test.ts`, `reindex.ts`, providers, contracts, package/lock, PROJECT/AGENTS/guardrails.md/DoD/backlog. Chúng vẫn được đọc/kiểm. Lỗi buộc sửa ngoài12path hoặc sau I3/sau merge → lưu delta tối thiểu, không tự mở scope.

### 4.2 Sáu path runtime, chỉ sau gate activation

| Path | Quyền |
|---|---|
|`episodes/us-personal-finance/2026-09-fs24-left/00-brief.json`|Writer replace nguyên file, fixture|
|`episodes/us-personal-finance/2026-09-fs24-left/state.json`|Writer replace, schema/revision/pending gates|
|`episodes/us-personal-finance/2026-09-fs24-right/00-brief.json`|Writer replace nguyên file, fixture|
|`episodes/us-personal-finance/2026-09-fs24-right/state.json`|Writer replace, schema/revision gates|
|`pipeline/runs.jsonl`|Writer append đúng50 dòng mới, prefix bất biến|
|`pipeline/state.json`|Chỉ reindex, từ states ở SHA trước index commit|

Hai episode mapping đều **N**. Đọc limits/pillar/layout/version từ N, không tự tạo giá trị nội dung pack. Các trường human/approvedBy trong fixture schema không là Gate1 nội dung. Dữ liệu phải đánh dấu synthetic; không provider, publish hoặc kích hoạt stage sản xuất. RunId/writeId/manifest namespaceFS24-C:batch, không trùng B; pending marker dùng cùng namespace. 50 dòng có costUsd0 cho mock/provider0; không dùng chúng tuyên bố Actions miễn phí, billing infra báo riêng unknown.

## 5. Trình tự sửa–kiểm–thu có điều kiện

### 5.1 Trước merge

1. Đọc checkpoint R/treeR/C3/PR12/13 và đủ ledger89 trước mọi ghi. Nếu delta nguồn ngoài gói, báo chính xác và chỉ chặn phần phụ thuộc; không tự chuyển base. Tự chuẩn bị diff local/candidate-manifest trước ghi, kiểm bytes, scope, prefix/pins, YAML/shell/Python; không chạy project ở Codex. Đây là công việc chỉ được làm sau approval execution của gói, chưa làm trong review này.
2. Q sole parentR trên wp/002; vì C3 là parentR, fast-forward branch trực tiếp C3→Q, không ref trung gianR, không force/delete. Q chỉ hai policy. Đọc lại parent/tree/policy bytes/ledger. CI cũ có thể rejectQ vì baseR không nằm trong B/R1; giữ failure thật, không rerun hoặc gọi Qpass. D-26 được commit trước code, và được kiểm trong gates candidate mới trước acceptance.
3. I1 triển khai đầy đủ route mới nhưng chỉ candidate prequalification trên push/PR; mở **một PR Draft mới ngay sau I1**, baseR. I2/I3 chỉ sửa trước merge nếu còn slots. Mỗi lần ghi xác minh expected prior branch/main, exact parent/tree/scope/frozenQ và cập nhật ledger. Không gộp/quên push+PR là hai sự kiện.
4. Candidate cuốiD: CI push vàPR có đủ validate/typecheck/guardrails/report success; foundation/test/prequalification và report đều đạt ở **đúngD**. Không dùng bằng chứng I1 để nghiệm thu I2/I3. Thu raw output đầy đủ trước kết luận: commands/exit/stdout/stderr, structured tests đủ rows/noincomplete, CI report, runtime/preservation/cleanup, artifact transport và receipt lịch sửPR12/13. Main vẫnR và chưa có runtime writes.
5. Quyền Ready/merge chỉ cho PR mới, tối đa một lần mỗi hành động, nếu được owner duyệt trong gói. Trước Ready và trước merge: GET lại mainR/headD/basePR/state/ledger/jobs; tự review diff cuối và mọi gate; PRbody báo cáo5mục. Merge_method=merge/expected_head=D; T phải parents[R,D], treeD, một trailer GrantFS24-C/Phaseintegration-bootstrap/Integration-PR số thực. Ack thiếu thì GET đối chiếu, không gọi merge lần2. Không gọi PR12/13.

### 5.2 Graph workflow đề nghị để chốt counters

`ci.yml` vẫn4job. `acceptance-wp002.yml` mới có **đúng6 job records**: `foundation`, `admit`, `producer-left`, `producer-right`, `controller`, `report`.

- Pushwp002/PRopened,synchronize: foundation chạy tests + một upload/receive prequalification; report kiểm kết quả; bốn job còn lại skipped. Không dispatch/data. Preflight policy/source/secret thành công trước cài/chạy tests. Giữ explicit completeness/cleanup, không suy exit0 là pass.
- Sau mergeT: push-mainCI4job phải success; listener `workflow_run` kiểm đúng cause pathCI/eventpush/main/head T/attempt 1/all4 jobs, exact new merge/grant và current main T. Admit job đọc-only thu **ba receipt** PR12/S/H, PR13/R/C3, PR mới/T/D độc lập với labels không đè file; local lineage/policy/scope phải đạt trước GET. Aggregate fail giữ toàn bộ outcome. Foundation skipped. Admit fail thì không producer/dispatch; report ghi fail với raw/meta.
- Hai producers chỉ chạy sau admit; mỗi job dùng code T/source N, tạo/upload/receive artifact của chính mình rồi kết thúc. Ghi base T, job ID/attempt, payload/hash, started/completed thật. Controller cần cả hai success và bằng chứng khoảng thực thi giao nhau để nhận là hai producers song song; nếu nền tảng chỉ xếp tuần tự, không tự tuyên bố A1/A6pass hoặc dispatch dữ liệu. Không dùng barrier chờ job thứ hai vô hạn để che thiếu concurrency; không timeout/im-lặngSTOP.
- Controller chỉ sau hai producer: kiểm lạiT và tất cả prequalification, reserve đủ slots cho **toàn bộ đuôi batch** trước first dispatch. Dispatch hai initial writers đồng thời từ hai manifest cùng source/base T; D-15 tuần tự hóa push nên latest-parent của writer thứ hai có thể làD1. Không đòi hai push đồng thời hoặc suy FIFO từ thời điểm dispatch.
- Controller điều phối các bước§6; report dùng `always()` có điều kiện event đã admit/candidate thực, phân biệt expected failed/cancelled writer với infrastructure failure. FinalCI dispatch không được mở controller lần nữa: toàn bộ6 jobs listener tương ứng skipped, ghi record nếu GitHub tạo. Không activate trên arbitrary push-main, event/attempt khác, oldgrant hoặc replaycontroller.

Graph này là **thiết kế đề nghị**, chưa có YAML mới được kiểm hoặc chạy. Job count/cap ở§7 ràng buộc implementation; thay graph phải tính lại trước ghi, không đẩy chênh lệch vào “không đáng kể”. Không cần workflow/file thứ13.

### 5.3 Hợp đồng API, token, provenance

GET receipt giữ pin **2022-11-28**, mở riêng label `merge-activation` bên cạnh history/repair; giữ observer2022 chỉ cho GET `/pulls/<positive number>`, default khác2026-03-10. Raw response → metadata → UTF8/JSON parse → field checks; độc lập expected.number/merged/mergeSHA/headSHA/headbranch/repos/basebranch và kiểm base SHA trong admission mới. Không fallbackSHA, không null hóa raw absent, không raw từ GET trễ thay response lỗi. Cap1MiB/no retry403 được giữ; vượtcap ghi truncation/error đúng thực tế, không nói đã có full raw.

POST dispatch giữ2026-03-10: tài liệu hiện tại xác định HTTP200 có workflow_run_id và URLs. Mỗi POST chỉ một lần, emit metadata/request digest/raw trước parse, kiểm positive safeID và URL đúngrepo, sau đó GET run/job bind event/path/attempt/head_branch và eventSHA. Body rỗng/malformed/HTTP error/mấtack → unknown/fail-closed, đọc ledger để đối soát request identity, không tự POST lại. Không thêm fallback2022 hoặc dò version. [GitHub dispatch2026](https://docs.github.com/en/rest/actions/workflows?apiVersion=2026-03-10#create-a-workflow-dispatch-event).

Writer/reindex được dispatch refmain nhưng checkout **code T**; eventSHA của run có thể làDk vì main đã có data. Verify eventSHA nằm trong chain được admit, giữ cả eventSHA/codeSHA, không gán giả tất cả bằngT. Request mang grant/code/batch/producer/operation/artifactID/manifestHash/request digest; sốrun thực từAPI, không đoán. Sau unknown POST chỉ nhận candidate run nếu có đủ identity/evidence duy nhất; nếu thiếu giữunknown, không tạo batch mới.

| Vai trò | Quyền đề nghị |
|---|---|
|CI/foundation/admit/report|contents:read; CI/foundation giữpull-requests:read khi cần PR; actions:read cho run/jobs/receipt/artifact. Không contentswrite/actionswrite|
|Hai producers|contents:read, actions:read; upload qua runtime artifact token của job; không dispatch hoặc ghi repo|
|Controller|contents:read, actions:write để dispatch13; không contentswrite. Cancel A4 do chính writer-cancel thực hiện|
|Writer thường|contents:write, actions:read; chỉ sáu path qua code gate, không ghi index|
|Writer-cancel|như writer +actions:write, chỉ một self-cancel A4 sau push/readback|
|Reindex|contents:write, actions:read; chỉ index và chungrepo-write lock|

Contentsread đã là một permission set hợp lệ cho GET PR; không tăng quyền vô cớ. Tokenwrite không được nền tảng hạn chế theo path; admission/schema/fullcandidate-validator/remote readback là bảo đảm bù, không thay thế branch protection. Không PAT/secret mới/OIDC/admin/settings.

Writer `repo-write/cancel:false/queue:max`; reindex workflow `reindex/cancel:true`, job ghi index cùngrepo-write/cancel:false/queue:max. GitHub hỗ trợ queue:max tới100 pending, không kết hợp nó với cancel:true; thứ tự chờ khác thứ tựdispatch, do đó A2 dùng receipt barrier. [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## 6. A1–A9 và nghiệm thu thật

Giữ nguyên chín ca WP002 dù số thứ tự cuối trong§6 gốc lặp2/3/4. Chuẩn hóa A7=50 logs, A8=reindex, A9invalid; không xóa/sửa ý nghĩa acceptance.

| Ca | Thao tác mới sau activation | Bằng chứng bắt buộc / pass |
|---|---|---|
|A1|Hai producers cùngbase T; dispatch initial-left/right thành hai writer runs|Hai producerjob ID/attempt/overlap thật, code T/source N, manifest/artifactpins; haiwriter run ID và serialization thật; hai atomic commits brief+state khác tập; remote latest giữ cả hai|
|A2|update-one, nhận xong rồi update-two cùngleft|Hai job riêng; job2 đọc revision2/commit trước và ghi revision3; parent chain/readback, không mất cập nhật|
|A3|dispatch lại initial-left cùngwriteId/artifact/hash|success, duplicate=true, receiptcommit cũ, delta commit0; ca payload cùngID nhưngkhác hash bị reject trong regression|
|A4|side-effect push/readback xong, self-cancel đúngrun; dispatch mới cùngwriteId sau terminalcancelled|Một POSTcancel cóstatus202/request ID, APIrun kết luậncancelled, rawreceipt đãemittrước cancel; replayrun attempt 1 khácID nhận receiptcũ/delta0. Không dùng rerun API hoặc mô phỏng thay cancel thật|
|A5|pending revision4 → briefsideeffect thànhcông → invalidstate bịreject|Đọc state sau failure thấy pendingWriteId đúng batch, inspectEpisode incomplete; briefđãđổi nhưng không báo done; index cũng không công bốfalse done|
|A6|Cùng cặp producers/initialwriters của A1, hai tập giả|Dùng lại cùng bằng chứng thực cho yêu cầu trùng, không cộng thêmdispatch hoặc giả thêmjob; cả hai states tồn tại vàschema-valid|
|A7|Hai requests logleft/right,25 dòng mỗi batch|25+25runId đúngset50, unique, oldprefixnguyên byte,2 log commits; inputs từhai producers song song, pushquaD15serialized; không gọi serializedpush là đồng thờithực thi|
|A8|Dispatch reindex sau mọiwriterterminal|Đọc đầyđủhai states tạiF^1, buildIndexđúngschema/domain/sort/pending/sourceCommit=F^1; chỉindex pathđổi ởF; so remote blobvàprojection độc lập; sourceCommit không tựtrỏF|
|A9|invalid-state request trongA5|Run failure đúngSchemaRejected trướccommit, structurednegative report/schemaerrors vàmainbefore=after; khôngacceptbấtkỳfailurekhác như403 đểgọiâm pass|

Một request sequence cố định: initial-left, initial-right (2); update-one, update-two (2); duplicateinitial-left (1); pending (1); side-effectcancel (1); replayside-effect (1); invalid-state (1); logs-left,logs-right (2) = **11 writer dispatch**. Reindex1,finalCI1 → **13 dispatch**. A4 tựcancel1 riêng, khôngcộngcancel thànhdispatch. Chín data commits: initial2 +update2 +pending1 +sideeffect1 +logs2 +index1. Duplicate/replay/invalid tạo0.

CAS retry-with-rebase tối đa5 chỉ cho xungđột ref thật, không HTTP403/auth/networkerror. Commit chain phải single-parent exactprevious, không merge lén, đúng unique operation/writeId/grant/batch, mode/scope và không hơn9. Reindexinput kiểm đủcode/batch/run vàoperation, artifact sentinel riêng; writerindex path bịreject. Mỗiwrite validate toàn candidate trước push; GET remotecommit/ref/blob chứng minh đúngparent/tree/bytes/hash. Readbackkhác thì giữdelta, không rollback/dọnfixture.

Gate regression trongActions: giữ50integration R1,26store,5registry,89guardrails hiện có; các ca lịch sửR1 dùngpin C3 thíchhợp. Thêm ca âm ít nhất cho newpolicyparent/count/freeze/prefix/outsidescope; N≠R≠T; PR12/13/newPR bindings; wronggrant/run/job/event/attempt/code/eventSHA; rawbeforeparse/HTTP403 once/malformed/capped; dispatch200receipt/missingack; ledger>100/paginationduplicate/missingpage; foreign/multi-parentdatacommit; replaycollision; invalidreindex input; remoteblobmismatch; missingrequiredstep/incompleteJSON; A1overlap và A5/A8projection. Checklist ca phải manifesttheoID, không chỉ “count≥50”; mọi case cũ và case mới được khai ở candidate phải córow thực, exit0/allpass/noincomplete. Số case mới chỉ chốt từ implementation thực, không bịa testcount đã chạy.

Artifact prequalification phải **qua chính receive path sẽ dùng khi ghi**, mock tests không thay transport thật. Tối đa8 artifactmới:6candidate (mỗi I tối đahai push/PR) +2 producerT. Uploadpin `ea165f8d65b6e75b540449e92b4886f43607fa02`, retention1ngày, payloadgiảitối đa1MiB, ZIP2MiB. ID/digestupstream chỉ chốt khi trảvề. Tổng **17 receivesZIP**:6 prequalification +2 producerreadback +9writer nonduplicate (gồminvalidstate). Reindex/duplicate/replay không tảiZIP. Mỗi lần là một operationjobđã khai; cache received bytes trong CASattempt cùngjob. Không GET ZIP lịch sử, không downloadlại saulỗi, không uploadđểxóa failure. Artifactexpired/receiptthiếu → phầnphụ thuộcbịchặn, không táitạo batch từhồsơ.

Receiver kiểmmetarepo/run/attempt/job/head/tree/name/id; manifest độc lập vàtừngmemberbytes/hash, upstreamdigestnếucó, CRC/duplicate/pathtraversal/link/encryption/unexpectedmember/UTF8, không execute payload. Emit nguyênZIPđãnhận +manifest +receipt, khôngzip lại payload. Token không đi theo signed redirect; không logsignedURL. Tài liệu API mô tả metadata/digest và GETarchive302; không chứng minh download thực của batchmới, điều đó phải qua prequalification. [GitHub artifactsAPI](https://docs.github.com/en/rest/actions/artifacts?apiVersion=2026-03-10).

CancelA4: cần ngoại lệ mới đúngmột run của grantFS24-C sau push; response202 chỉ làack, vẫn cần APIterminalcancelled. Không force-cancel/cancelrunkhác. Giữbằng chứng trước cancel, thu cleanup outcomes thực saucancel; không bịa cleanupsuccess khi nền tảng ngắt step. Cleanupthiếu được báo đúng mức bảođảm, không tựcancel/rerun bổsung. [GitHub cancelAPI](https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2026-03-10#cancel-a-workflow-run).

FinalCI phải dispatchđúngF sauindex vì tokenpush không tựsinh CIpush. Giữ4 jobs, eventdispatch thật, fullsource validation vớihai mapping N, scans/secret/contracts/policy/scope. ExpectedCI head F/current main F, code T/batch đúng. Thu ci-report nguyênvăn, rawlogs/frames/receiverpins/APIstatus/steps/cleanup. [GitHub token-trigger behavior](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

Nghiệm thu kỹ thuậtbatch chỉ khi A1–A9, final4 CI jobs, code/policypreservation và từngwrite đúng. Expectednegative1/cancelled1 vẫn giữconclusion thật. **WP002không tựdone:** DoD§8owner đọc báo cáo/checkpoint và§9backlog chưa được cấp trong gói; ghi technical pass/ownerAcceptance pending/WP002 todo. Providerregistry test mock không làproviderproductionacceptance. Gói khép lại bằngbáo cáo5mục và toàn bộ lịch sử failure; nếu fail sauT khôngcodefix/sửa data/merge thêm trong gói.

## 7. CI, ngân sách và điều kiện giảm quyền — đề nghị, chưa cấp

### 7.1 Mô hình đếm, một policy + tối đa ba implementation

| Nguồn sự kiện | Active workflows | Job records trong active | Artifact mới |
|---|---:|---:|---:|
|Q push, PR chưa mở: CI cũ4 +acceptanceR1 cũ3|2|7|0|
|I1 push và PRopened: mỗi sựkiện CI4 +acceptance mới6|4|20|2|
|I2 push và PRsynchronize, nếu cần|4|20|2|
|I3 push và PRsynchronize, nếu cần|4|20|2|
|MergeT push-mainCI|1|4|0|
|Listener/controllerT,6 jobs gồmfoundation skipped|1|6|2|
|11 writer workflows, mỗi workflow2 job gồm1skipped|11|22|0|
|Reindex|1|1|0|
|FinalCI dispatch|1|4|0|
|**Tổng mô hình khi dùng đủI1–I3**|**29**|**104**|**8**|

Không giả Q xanh; record failure vẫnactive. Tính skippedjobnội bộ trong6/2 ngay cảkhikhôngthực thi. Skippedworkflows riêng:Hai workflow FS22 chỉ nhận `synchronize`, không nhận `opened`: I2/I3 tạo tối đa 4 skipped records; final CI listener không admit thêm 1 → **5 workflow records**. Jobs riêng dự kiến 4 FS22 + 6 listener = 10. Khi đó ledger 89→123 (29+5 mới); tổng job mọi workflow mới theo mô hình là 114=104+10. Nếu GitHub không tạo một skippedrecord thì báo số thực, không dựngrecord cho khớpmôhình.

**Cap đề nghị:34active /120job records trongactive /12skipped workflow records.** Buffer 5 active /16 job /7 skipped chỉ hấp thụ record thực khônglườngtrước, không cấp quyền rerun hoặc dispatchthêm. Không coi1commit=1CI; khôngtrừfailure/cancelled/negative khỏicap. Đếm toànrepo từbaseline89, dedupe ID/attempt và phântrang đầyđủ; record nguồn ngoàigói phải báo delta, không tựcoi nó thuộcquota gói. Sau mỗi ref/PR/merge/dispatch đọc ledger trước hànhđộng chủđộng tiếp; main vàeventcurrentraces phảiđượcđối soát.

Trước mergeT phải còn đủđuôi **15active/37job** (mainCI1/4 +listener1/6 +writer11/22 +reindex1/1 +finalCI1/4), cùngrecord skipped dựkiến; trướclầndispatchđầu phải giữ12writer/reindexruns vàfinalCI tươngứng trongcap. Nếu không đủ, không tạo tác vụ mới; tiếp tụcthu/lưuresult đã chạy. Hếtcapkhôngđồngnghĩacancelrun đang chạy.

| Loại quyền | Cap mới đề nghị |
|---|---|
|Policy /implementation|1Q +tối đa3I; freeze Q; khôngfixsau merge|
|PR /Ready /merge|1PR mới, Ready1 vàmerge1 cóđiều kiện; khôngPR12/13|
|Activation batch|1 trênT sauadmission/CI, khôngreplayB/R1|
|Dispatch /cancel|13 dispatch đúngsequence;1self-cancelA4;rerun0/forcecancel0|
|Data commits|tối đa9, đúng6paths; không dọn/xóa fixtures|
|Artifacts /ZIPreceives|8newobjects /17 receivescórole; khônghistoricalZIP/retrydownload|
|Provider /settings /credentials /dependency|0 /0 /0 /0|
|Reserve đề nghị|**20USD mới cho FS24-C**, chưa cấp; không lấy từB/R1|

20USD là khoản **dự phòng được đề nghị chọn**, không là báo giá, modelUSD từ runtime, actual cost hoặc hardcap. Có môhình sốrun/job cụthể ởtrên nhưng B1/B2, billingphút/quota/credit/actual USD chưa đủ, nên không suy29run=bao nhiêuUSD hoặc actual≤20. R1 reserve 5 USD đã duyệt không làsốdư. TổngR1 observed1279giây/41executedjob chỉ là elapsed seconds, khôngbilled minutes. Không truycập billing tài khoản/dựánkhác đểđoán.

### 7.2 Runtime và bảo đảm giảm phải được duyệt riêng choFS24-C

Giữ Ubuntu24.04; Node20.20.2/npm10.8.2; archiveSHA256 `df770b2a6f130ed8627c9782c988fda9669fa23898329a61a871e32f965e007d`; checkout `34e114876b0b11c390a56381ad16ebd13914f8d5`; setup-node `49933ea5288caeca8642d1e84afbd3f7d6820020`; upload pin§6; package/lock bấtbiến, `npm ci --ignore-scripts` chỉActions. Không tựnâng/hạdependency hoặccredential đểquagate.

Owner cần duyệt lại phạm vi ngoại lệ choFS24-C: Node20 EOL/action Node24 patch unproven; B1/B2/billing unknown; mainprotected=false/base-race; tokenwrite repo-scoped khôngpath-scoped; bootstrapmerge trướcA1–A9thật; hai tậpgiả/50 log/index ởmain được giữ; có thểvượtreserve vì khônghardUSDstop; cancellation cóthểngắtcleanup. Bù bằngchecksum/exactlock/preflightread-only beforecode, strictsource/policy/transaction scope, serialization+CAS, đủ raw/remote readback và cấmrộngquyền khi fail. R1 đãchấpnhận cácngoại lệ đó choR1 không tựđộngcấp chúng cho gói mới.

Khôngdeadline task/job/phase, không timeouttựđặt hoặcngưỡng im lặnggây STOP. Giới hạnpayload,caprun/commit,5CASconflictattempt vàđiều kiện correctness không phải deadline. Polling10giây đểđọc trạngthái không làthờihạn; sựchậmkhông tựtạofailure/cancel. Nếu nền tảng/jobchờ lâu, tiếp tụcthu/truyvết/trạngthái vàbàn giaođúngrun ID, không dùngimlặng làlýdo dừng.

## 8. Blocker, phạm vi bảo lưu và quyết định cần duyệt

| Blocker / chưa biết | Cách xử lý tối thiểu |
|---|---|
|Chưa có grantFS24-C|Ownerduyệt toàn§4–§8 hoặc giữreadonly; chưa động tới repo/CI/ngân sách|
|BindingsC01–C11 chưa sửa/kiểm|Triểnkhai đúng12path trongQ+I1–I3; staticreview/pins vàActions gates trướcReady;không sửa2YAML rồiactivate|
|Chưa có PR mới/Q/D/T/pins artifact|Lấy từreceipt thực đúng giai đoạn, pinreadback; không đoán hoặc yêu cầuownerđiền SHA|
|Artifact/cancel chưa được duyệt mới|Không thể nghiệm thuD15/A4bằngmock; đềnghị đúng8objects/17 receive/1 cancel; nếuownerkhôngduyệt giữA1–A9phầnphụ thuộc chưađạt|
|Ledger>100 / capđuôibatch|Phântrang đầyđủ; chốt counter trướcghi/merge/dispatch, reserveđuôi15/37 trước merge|
|Concurrentjobcapacity chưa biết|Đọc jobtimestamps/overlap thật trongproducerprequalification; khôngclaimparallel nếuserial, không ghi data khi gate nàythiếu|
|OriginalresponseB missing|Giữmissing. Không dựng, tảiZIPcũ, replayB hoặc gọi lạiPR12/13 để“chứngminh”nguyênnhân|
|HTTP403/ackmất/digestmismatch/nguồnngoàigói|Ghi raw/meta/knownstate; đọc GETđối soát antoàn, không retry403/blindPOST/đổi token; dừngphầnphụ thuộc và trìnhdelta cụthể|
|Fail sauT / cầnpaththứ13 hoặcI4|Lưu exactfile/bytes/response/patchđềnghịtối thiểu; cần grant mới. Khôngrollback, codefixdatafixhoặcmerge thêmtrong gói|
|DoDclosure/billing/runtime chưa đủ|Technicalreport riêng, WP002 todo; ownerđọc/xácnhận cuối; backlogdone vàmọi ngân sáchkhác cầnquyềnriêng|

Giữnguyên nghiệm thuriêng WP000/WP001/manifest11nguồn/chuỗihồsơ; ZIPgốc6634470/SHA256`14ab6b95c34521d7093eb4b8b5204977bee9a8b7a7662dd1eb771db6e94e9ae1`, ZIP lệch4098646/SHA256`caa92c00ada3f8fd22c154c49d54dcbc349f2cfcc3cc0615fd2547ecef529e74`; STOP lịch sử, timeout120s/exit124,HTTP403,missingZIPrun7,packingdelta32.021giây. Khôngtái kiểm/dựngphầnthiếu. P1failure/C1incomplete/C1–C2HTTP200thiếu merge_commit_sha giữđúnglịch sử; khônggọi response2026 cófieldabsent làrawJSONnull. C3/Rreceipt2022thànhcông khôngxácđịnhnguyênnhân batchB thiếuresponse.

Giữci-reportR nguyênvăn kểcả `error=fatal: Not a valid commit name 0000000000000000000000000000000000000000`, ownerAcceptance pending/billingunknown. Không dùngdònglịch sửđó phủnhận4jobRđãpass, cũngkhông xóanó. Khôngrequestsupport, rollback, sửa settings/credential/dependency, provider hoặc sảnxuất.

**Quyết định đề nghị một lần:** duyệt §4–§8 (12code/policy paths +6runtime paths;Q+≤3I;PR mới/Readymergecóđiều kiện;34/120/12;13 dispatch/1 self-cancel/9 data/8 artifact/17 receives;reserve 20 USD vàngoại lệđã khai). Mọi khả năng này vẫnpending; không thể diễn giải yêu cầu lập kế hoạch hiện tại thành approval. Nếu muốn reviewdiff trước cấpCI, câu giao việc giới hạn có sẵn ở§9.




## D-27 · FS24-D — owner-approved repair, recovery and acceptance

Owner approved sections 3–11 of libfile_f69ee0a6a02c8191bb54856854eaf642 (2738442 bytes, SHA256 f8ec7151277baf71cc501c2def82b7cbb9f684eb56278892fccf140e48df4f7f). Proposal wording inside the incorporated specification records its origin; this owner grant authorizes the specified package. Preserve all historical decisions/pins/evidence and response B missing. P has sole parent T=78a4b28b4134fb09b4a003b90099c13460a8112d, treeT=ac9be3c9f327ba15cf6c0a9871d05d444a58c290. Four policy blobs freeze after P. WP002 stays todo until owner acceptance under section 10. No provider or Ready/merge again PR12/13/14.

## 3. Blocker, bằng chứng và sửa theo nhóm nguyên nhân

| ID / phân loại | Bằng chứng nguồn T hoặc kết quả C | Sửa và tiêu chí đóng |
|---|---|---|
| F-C01 — lỗi đã xảy ra | `engine/io/wp002-integration.ts:73` fetchMain không truyền auth env; ledger gọi dòng83, admit dòng106. Checkout persist-credentials:false. Admit job104410523298 stderr: `fatal: could not read Username for 'https://github.com': No such device or address`. | Truyền token sẵn có qua cấu hình Git chỉ sống trong process, giới hạn đúng URL repo; kiểm Git fetch đọc-only thật trong Actions trước merge. Không đổi credential hoặc persist-credentials. |
| F-C02 — cùng mẫu lỗi tiềm ẩn | `commit-artifacts.yml:118/123/397/402`, `reindex.yml:117/122`: fetch trong Python preflight không có auth tạm thời. Common block acceptance còn branch writer/reindex không dùng tại entrypoint đó. | Rà mọi remote Git invocation trong phạm vi; đưa preflight dùng chung vào một nguồn, phân biệt active/dead routes; xóa branch trùng không dùng nếu được chứng minh không đổi hành vi. Hồi quy mọi entrypoint, không chỉ admit. |
| F-C03 — lỗ hổng coverage | `wp002-integration.ts:98` diagnose-candidate trả về trước ledger/fetch. 83 integration và 95 guardrails đã pass không chứng minh private Git fetch. | Candidate phải đi qua cùng reader/preflight/ledger thật, dùng token read-only; test auth env, I/O, provenance, completeness. Có row riêng chứng minh đường Git đã thực sự chạy. |
| F-C04 — policy/lifecycle | D-26 chỉ R→Q→≤3I→T, một batch và cấm fix sau merge; unused I2/I3 không dùng được sau T. `successorChain` chỉ chấp nhận chuỗi data đơn sau một code SHA. | D-27 + WP002§11 đề nghị cho D; mô hình các phiên bản code đã merge, controller resume và typed lineage tại §§5–7. Không sửa historical constants thành pins mới. |
| F-D05 — khoảng trống thu bằng chứng, đã thấy hậu quả | Ledger GET trong admit có trước exception nhưng file ledger chỉ emit sau vòng duyệt (`wp002-integration.ts:76–94`); raw ledger đúng lúc lỗi không có. | Capture từng response/page với metadata trước parse/provenance/fetch. Emit tiến độ từng bước; finally chỉ tổng hợp phần có thật. Không dựng lại response cũ. |
| F-D06 — kiểm completeness chưa đồng đều, nguy cơ tĩnh | Foundation `acceptance-wp002.yml:190–204` có kiểm cấu trúc riêng cho integration và ngưỡng≥50; repo-store/registry chủ yếu dựa exit. | Manifest test IDs bắt buộc cho cả ba suite và guardrails; row unique, đủ bộ cũ+mới, không incomplete/skipped âm thầm. Đối chiếu stdout/stderr/exit và API final state. Không khẳng định bộ test cũ thực tế bị thiếu. |
| F-D07 — nguy cơ tiếp tục batch sai | Controller bắt đầu lại sequence cố định; identity/code/artifact gắn một run, nguồn ledger89, mọi main descendant kỳ vọng data commit. | Batch logic tách khỏi controller run và code epoch; operation journal suy ra từ raw/receipts/history hợp lệ, không từ chat. CAS và idempotency không cho commit thứ hai của cùng operation. |
| F-D08 — closure chưa có | DoD§8 cần owner đọc báo cáo/checkpoint, §9 cần backlog done; mọi grant trước giữ todo. | Giữ todo tới báo cáo kỹ thuật đầy đủ. Chuẩn bị PR chỉ một dòng sau owner xác nhận, kiểm lại exact head/main và CI. Đây là gate nghiệm thu có ý nghĩa, không phải xin quyền sửa nhỏ. |

Raw `integration-error.json` C:194 byte/SHA `59a1932dbcfb08ebf4d7c6f78980979406173ba4a8d56ff7fe6e1ccf327520ea`. Ba receipt TS PR12/13/14 đều pass trước Git error. Do đó không có căn cứ quy lỗi này cho REST403 hoặc thiếu quyền token. Emit evidence step exit1 là truyền kết luận failure sau frame hoàn chỉnh; không gọi đó là mất toàn bộ log.

### 3.1 Ba dòng thay ràng buộc theo D-14 — gom trong một quyết định

- **Ràng buộc:** D-26/WP002§10 đóng 12 path, Q+≤3I, một PR/batch và “không fix sau merge”; AGENTS/guardrails còn thủ tục dừng/chờ áp dụng cả khi sửa nhỏ trong gói; DoD§8–9 tách kỹ thuật và owner acceptance.
- **Bị chặn:** sửa một fetch không sửa các entrypoint tương tự; failure sau merge hoặc artifact hết hạn kết thúc gói dù tác vụ có thể tiếp tục an toàn; workflow/provenance hiện tại từ chối code sửa và batch dở dang. Không thể đạt A1–A9 chỉ bằng review hoặc mock.
- **Thay tối thiểu có căn cứ:** append D-27/WP002§11 cùng nguyên tắc vào AGENTS/guardrails, cho phạm vi và quyền §§4–11, giữ gate dữ liệu/identity/CI/owner; thay commit-count bằng đợt kiểm, một PR bằng chuỗi PR sửa được cấp trước, và một controller bằng batch logic có resume. Chấp nhận bootstrap trước E2E, tài nguyên bổ sung và độ phức tạp lineage/recovery được khai; không mở provider hoặc sửa lịch sử.

## 4. Phạm vi và pins mới phải tạo trước ghi

### 4.1 Allowlist policy/code: 24 path

Đây là ranh giới theo trách nhiệm, không yêu cầu chạm đủ file. Trong phạm vi đã duyệt, phát hiện lỗi có cùng nguyên nhân và cần sửa đường gọi/hồi quy bên dưới thì tự sửa; không xin nới từng file đã nằm trong bảng. Không đổi public contract hoặc kiến trúc dự án.

| # | Path | Phần được sửa |
|---:|---|---|
|1|`engine/docs/02-decisions.md`|Append D-27 và toàn grant, giữ prefix T.|
|2|`engine/ops/work-packages/WP-002-interfaces.md`|Append§11 scope/acceptance/recovery/closure, giữ mọi A1–A9 và lịch sử.|
|3|`AGENTS.md`|Append nguyên tắc đã duyệt và ranh giới tự chủ; không đổi bảng thẩm quyền.|
|4|`engine/ops/guardrails.md`|Append cách áp dụng D-27: blocker chỉ chặn phần phụ thuộc, giữ correctness/security.|
|5|`.github/workflows/ci.yml`|Admission D/candidate/main/final/closure, đúng bốn job, evidence đầy đủ.|
|6|`.github/workflows/acceptance-wp002.yml`|Candidate I/O thật; hậu merge đọc-only; activation/resume explicit; sáu job records.|
|7|`.github/workflows/commit-artifacts.yml`|Preflight chung, writer/one self-cancel, resume identity, evidence trước tác dụng phụ.|
|8|`.github/workflows/reindex.yml`|Preflight chung, only-index writer, input/readback/recovery.|
|9|`scripts/guardrails/index.ts`|D policy/typed lineage/freeze/scope/closure; giữ B/R1/C validators.|
|10|`scripts/guardrails/guardrails.test.ts`|Ca cũ + ca âm D qua scanner thật, không whitelist test để qua scan.|
|11|`engine/io/github-transport.ts`|Raw trước parse, page journal, dispatch/receipt/identity, artifact generations.|
|12|`engine/io/github-writer.ts`|Auth dùng chung, typed history, stable operation identity, recover no-duplicate.|
|13|`engine/io/wp002-integration.ts`|Admission/producer/controller/checkpoint-resume/final validation theo grant.|
|14|`engine/io/wp002-integration.test.ts`|Regression toàn luồng, recovery và evidence manifest.|
|15|`scripts/wp002-preflight.py` (mới)|Một preflight stdlib trước npm; nhận role, xác minh policy/event/source/raw/Git, không tự cấp quyền.|
|16|`engine/io/github-git.ts` (mới)|Auth command-scoped và wrapper Git đọc/ghi theo role, không lưu token.|
|17|`engine/io/github-git.test.ts` (mới)|Auth isolation/redaction/no-persist và cùng đường fetch trong Actions.|
|18|`engine/io/repo-store.ts`|Chỉ sửa lỗi interface validate/idempotency/serialization/revision cùng phạm vi WP002 nếu có bằng chứng.|
|19|`engine/io/repo-store.test.ts`|Regressions cho store/episode/run-log/reindex; giữ toàn bộ ca cũ.|
|20|`engine/io/episode-state.ts`|Chỉ sửa identity/revision/pending/read inspection cần cho A2/A5; không đổi schema.|
|21|`engine/io/run-log.ts`|Chỉ sửa validation/append semantics nếu test chứng minh cần; giữ prefix/costUsd.|
|22|`engine/io/reindex.ts`|Chỉ sửa projection/sourceCommit/pending/full-state coverage nếu cần; không đổi writer authority.|
|23|`scripts/guardrails/scope.ts`|Context event/closure/recovery, không giả nhãn dispatch thành push hoặc tự lấy scope ở head.|
|24|`scripts/ci-report.ts`|Chỉ nếu cần để kiểm đầy đủ evidence D; giữ giải mã lịch sử và literal raw; không đổi success để che failure.|

Path thứ25 có điều kiện: `engine/ops/backlog.md`, chỉ dòng WP-002 từ todo sang done sau §10. Không sửa backlog trong policy/code/recovery kỹ thuật. Không dùng ngoại lệ một dòng backlog để vượt chỉ dẫn giữ todo hiện tại.

Giữ nguyên byte/mode mọi file ngoài allowlist trong từng code commit/merge so với base thực đã xác minh; không đòi file được phép cũng phải đổi. Đóng băng contracts, `scripts/validate.ts`, package/lock, PROJECT, DoD, cấu hình Channel/Genre và providers. Registry/interface provider được đọc/kiểm bằng fake hiện có, **real provider calls=0**. Không thêm dependency; không sửa setting/credential/PAT/OIDC/branch protection. Các helper mới chỉ dùng runtime/library sẵn có.

### 4.2 Policy commit và tránh pin tự tham chiếu

P sole parent T, chỉ append bốn path1–4. D-27 mang nguồn T/treeT, prefix/blob T và grant/scope/counters; không ghi SHA P chưa tồn tại vào bytes P. Sau khi tạo P, đọc lại parent/tree/four policy blobs và lưu pin thực vào manifest implementation/preflight. Freeze toàn bộ bốn policy blobs sau P, kể cả qua PR sửa sau merge và PR closure. Sai logic checker thì sửa implementation trong scope; không tự sửa policy đã freeze để nới quyền.

AGENTS cũ và guardrails cũ giữ nguyên prefix. D-27 nêu rõ phạm vi thay thế thủ tục cũ; không có bảng thẩm quyền thứ hai. Gói này không cấp quyền cập nhật cấu hình Project Instructions ngoài repo. Nếu bản sao ngoài repo chưa được đồng bộ, báo đúng trạng thái, chỉ dẫn owner trong phiên vẫn là thẩm quyền cao nhất.

### 4.3 Sáu path runtime, giữ nguồn N

1. `episodes/us-personal-finance/2026-09-fs24-left/00-brief.json`
2. `episodes/us-personal-finance/2026-09-fs24-left/state.json`
3. `episodes/us-personal-finance/2026-09-fs24-right/00-brief.json`
4. `episodes/us-personal-finance/2026-09-fs24-right/state.json`
5. `pipeline/runs.jsonl` — append đúng 50 dòng mới, prefix T nguyên byte.
6. `pipeline/state.json` — chỉ reindex, projection từ full state set tại parent của index commit.

Hai episode mapping đều N. Đọc tuple versions/limits/layout/pillar từ N, không latest hoặc tự tạo hằng số pack. Payload và writeId dùng namespace **FS24-D** mới; không đổi B/R1/C. Synthetic/human-approvedBy trong fixture không là Gate1 nội dung, không provider/publish. Chín commit: initial2 + updates2 + pending1 + side-effect1 + logs2 + index1. Duplicate/replay/invalid=0 commit. Fixtures và pending cuối được giữ, không cleanup main.

## 5. Trình tự thực hiện và gates

### G0 — Chuẩn bị trong gói sau khi được duyệt

Đọc checkpoint/ledger mới; kiểm source P/T pins và luật đang có. Tạo diff mới từ T, manifest path/mode/byte/SHA/Git blob, bảng test IDs và mô hình sự kiện trước push. Review auth/read-only/secret/prefix/freeze/YAML/shell/Python bằng phân tích dữ liệu; không chạy project ở Codex. Tái dùng dữ liệu chuẩn bị C có pin đúng, không chạy lại script chuẩn bị cũ. Commit P trước code; nếu CI cũ reject P, giữ failure như bootstrap history và tính counters, không gọi P pass.

### G1 — Triển khai và mở PR

Triển khai toàn nhóm lỗi trong một candidate hợp lý, mở PR Draft mới ngay sau đợt implementation đầu. Nhánh `wp/002`, fast-forward từ I1 qua T tới P/code, không force/rebase/squash lịch sử. Mỗi đợt công bố candidate có expected parent/head, diff và ledger; commit nội bộ nhiều hay ít không là gate riêng nhưng mỗi push/synchronize phải được tính. Không tạo commit rỗng để kích CI.

Một vòng sửa bắt đầu bằng failure/evidence mới và kết thúc ở candidate mới có đầy đủ kiểm; tối đa bốn vòng ngoài triển khai đầu. Không chạy lại cùng mutation chỉ vì chưa hiểu failure. Có thể dùng các vòng trước hoặc sau merge; tối đa hai vòng có merge sửa sau merge ban đầu. Không nhất thiết tiêu hết vòng/cap.

### G2 — Kiểm trước merge trên đúng candidate cuối

- CI push và PR đủ validate/typecheck/guardrails/report success. Foundation/report đủ store/registry/integration/auth tests, test IDs unique/đầy đủ và logs/exit/frame. Bảo toàn các ca nguồn T: 26 store, 5 registry, 83 integration, 95 guardrails; manifest ID thực là tiêu chuẩn, con số không thay nội dung. Các ca mới có tên, mục tiêu và kết quả riêng, không bịa số đã chạy.
- **Prequalification Git thật:** process Python và TypeScript thực sự fetch đúng private repo/main bằng token read-only trong Actions, persist-credentials:false. So SHA FETCH_HEAD với GET và expected main; trước/sau config không lưu auth, diff/mirror/source không đổi. Dùng wrapper giống các entrypoint production; kiểm nhánh role writer/reindex theo chế độ dry-read tuyệt đối không commit/push/dispatch. Thiếu quyền write không phải lý do thử write trước merge.
- REST receipt lịch sử/ledger bằng đường thật, toàn page capture trước parse; ledger>100/duplicate/missingpage/foreign provenance bằng regressions có fixtures. Không đọc B raw thiếu bằng cách gọi lại batch.
- Artifact candidate mới đi qua chính receive path sẽ dùng sau merge, metadata/ZIP/member validation thật. Với closure-only candidate ở §10, code/artifact transport không đổi thì không tạo artifact mới; vẫn chạy validation và suites đọc-only.
- Regression mô phỏng failure trước/sau từng ranh giới: fetch, page capture, POST receipt, push, readback, cancel, ZIP, report, cleanup; chứng minh không có POST lặp mù và không âm thầm bỏ row. Dùng repo Git tạm trong Actions cho CAS/revision/partial history; không phải bằng chứng ghi main thật.
- Ca âm policy prefix/freeze/unknown path, stale main/head, PR sai repo/base/head/number, data ngoài six paths, main merge lạ, duplicate operation khác payload, code epoch lạ, pending mất, index self-reference, missing raw/frame/cleanup. Không dùng arbitrary failure làm SchemaRejected.

### G3 — Ready/merge có điều kiện

Tự review PR và báo cáo năm mục, không cần xin lại quyền nếu gói đã duyệt. Trước từng Ready và merge: đọc main/base/head/tree/policy blobs/ledger/jobs, kiểm gate G2 exact head và budget đuôi. Historical bootstrap failures được bảo lưu có danh tính; mọi failure/incomplete chưa giải quyết của candidate cuối chặn merge.

Chỉ PR mới thuộc D, Ready tối đa một POST và merge tối đa một POST mỗi PR; merge_method=merge, expected_head SHA thực. Thiếu ack: GET đối chiếu state, không lặp mutation. PR12/13/14 không gọi lại Ready/merge. Base race từ nguồn ngoài gói phải báo; không coi main unprotected là an toàn tuyệt đối.

Đặt `B_e` là main base của PR kỹ thuật e, `C_e` candidate đã kiểm, `M_e` merge thực: ordered parents **[B_e,C_e]**, tree M_e=tree C_e và đúng trailer grant/phase/PR thực. e=0: B_0=T. e>0: B_e là main hiện tại đã chứng minh chỉ gồm lịch sử của D. C_e phải descendant B_e, không transplant code lên base thiếu dữ liệu. Không bịa SHA/PR tương lai.

### G4 — Hậu merge đọc-only trước activation

Main CI bốn job tại M_e phải pass. Listener của CI main chỉ chẩn đoán đọc-only: receipt lịch sử PR12–14 và các PR D, policy/lineage, Git fetch/ledger/permissions/evidence, source preservation. **Merge không tự mở producers/writer.** Listener từ final-dispatch/closure không được kích activation vòng lặp.

Sau khi main CI + hậu kiểm đầy đủ, agent được tự gọi một `workflow_dispatch` activation/resume đúng grant đã duyệt; không hỏi owner lại. Run đầu tạo batch logic mới; run tiếp dùng batch ID cũ và recovery manifest. Cách này tách validation merge khỏi tác dụng phụ mà không tạo thêm bước duyệt.

### G5 — Admission, producers và thực thi A1–A9

Trước activation đầu: six data paths đúng baseline T, không episode state mới ngoài nguồn; toàn97 ledger gốc giữ nguyên; không controller khác đang thực thi; cap đủ toàn đuôi và closure. Code/source/event/attempt1/request digest đúng; candidate/main/hậu kiểm pass. Resume dùng quy tắc §7, không áp điều kiện “chưa có state” lên batch đã ghi một phần.

Hai producers độc lập thật, ghi job intervals và cùng frozen payload origin; chỉ nhận song song khi intervals overlap. Writer push vẫn qua `repo-write`, cancel-in-progress:false, queue:max theo pin source hiện hành. Reindex giữ workflow concurrency reindex/cancel:true, job write cùng queue repo-write/cancel:false. Chỉ một controller D đang hoạt động; không cancel run khác để giải hàng đợi. Không lấy sự chậm làm failure.

Các writer initial xuất phát từ cùng source/payload base; latest Git parent lấy sau serialization. A2 dùng receipt barrier revision2→3, không suy thứ tự FIFO từ dispatch. Trước mỗi action có tác dụng phụ, admission kiểm lại main/type history/remaining operation/counters. CAS tối đa năm lần chỉ khi ref conflict thật; không retry authentication/403/network/unknown outcome.

### G6 — Validation cuối và hồ sơ kỹ thuật

Sau index commit F_data, explicit finalCI trên main chính xác F_current với code epoch hiện hành và payload origin riêng. Khi không có sửa sau data thì F_current=F_data. Giữ full source validation với mappings N, bốn jobs, raw ci-report, full frames, API state/steps/cleanup. Nếu sửa code sau index, không giả F_current^1 là nguồn index; index vẫn có sourceCommit=F_data^1 và cần kiểm states không đổi qua các code merges.

Chỉ technical pass khi mọi A1–A9, full data history, exact code/source/policy/runtime, zero real provider, evidence/preservation/cleanup theo ngoại lệ được duyệt đều đủ. Khác biệt code epoch được xử lý tại §7.3; CI xanh không tự hợp thức hóa acceptance cũ bị vô hiệu. Xuất report năm mục và closure manifest; ownerAcceptance=pending, WP002todo cho tới §10.

## 6. Hợp đồng I/O, bằng chứng và nghiệm thu A1–A9

### 6.1 Auth, raw receipt và phân quyền

Git read sử dụng GH_TOKEN sẵn có ở job với contents:read; Git write chỉ ở writer/reindex, contents:write. Controller có actions:write để dispatch nhưng contents:read; A4 job có actions:write riêng cho tự cancel. Producers chỉ có quyền cần cho upload artifact, không contents:write. Không persist credentials, không token trong argv/URL/log, không in toàn env. Pin origin đúng HTTPS repo và chặn chuyển auth sang host/repo khác. Command env là dữ liệu nhạy cảm, evidence chỉ ghi tên biến/cấu hình đã che và kiểm no-persist. Cả stderr/exception cũng phải được redaction; test dùng sentinel giả, không đưa secret thật vào fixture.

Git hỗ trợ cấu hình runtime bằng `GIT_CONFIG_COUNT/KEY_n/VALUE_n` và khóa `http.<url>.*`; đây là cơ sở cho auth chỉ sống trong process, vẫn phải kiểm trên runtime thật. [Git config](https://git-scm.com/docs/git-config#Documentation/git-config.txt-GITCONFIGCOUNT).

GET receipt riêng `/pulls/<positive number>` giữ **2022-11-28**; các REST khác giữ **2026-03-10**. Raw body + metadata request/version/status/requestId/byte/hash phải được capture trước JSON parse và semantic checks. PR receipt labels lịch sử/repair/C/D độc lập, không đè cùng filename. Mọi page ledger/jobs cũng journal ngay khi nhận, không đợi duyệt xong provenance mới emit. Response body chứa secret/signed URL nếu có không được log; metadata chỉ allowlist an toàn, tách riêng raw control body không nhạy cảm và audit redaction.

POST dispatch ghi request digest trước gửi, ghi raw receipt trước parse, bind run ID/URLs/event/head/attempt/request title đúng; API docs là tham chiếu hợp đồng, response thật mới là chứng cứ. Cancel202 chỉ là ack; cần GET terminal cancelled. [GitHub workflows API](https://docs.github.com/en/rest/actions/workflows?apiVersion=2026-03-10#create-a-workflow-dispatch-event), [cancel API](https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2026-03-10#cancel-a-workflow-run).

Không retry403 hoặc gọi lại POST có outcome chưa biết. GET đối soát là request mới có nhãn riêng, không được ghi thành raw đúng lúc lỗi. Các token quyền thực tế rộng hơn role logical phải được khai, không tuyên bố platform path-scope khi chỉ có code guard.

### 6.2 Evidence manifest

Mỗi run/job có repository, grant, batch, controller run, attempt, code SHA/tree, payload origin SHA, source N, base/event SHA, role, request ID/digest, timestamps. Mỗi command có argv đã lọc secret, cwd, stdout/stderr byte/SHA, exit. Mỗi test có ID/kết quả; manifest bắt buộc quyết định completeness, không ngưỡng count tối thiểu.

Thu raw receipts, run/job/API step outcomes, original ZIP received bytes, CRC/members/hash, transaction inputs, commit/tree/blob/ref remote readback, source.before/after, preservation/mirror, cleanup markers. Frame COMPLETE phải có số file/sequence/hash đầy đủ; thiếu frame không pass. Emit theo tiến độ và trước cancel; cuối job reconcile với API. Report own final state cần đọc log/metadata sau finalizer, không tự chứng nhận trước khi cleanup chạy.

Các schema/invalid fixtures ở scratch Actions không phải dữ liệu main. 50 log synthetic costUsd0 phản ánh không gọi provider trong fixture; không đại diện chi phí Actions. Hạ tầng/cancellation/failure ghi raw evidence riêng, không chèn costUsd0 giả vào log chỉ để đóng DoD. WP002 không thêm stage sản xuất; nếu implementation phát sinh stage thật cần cost logging ngoài thiết kế này thì đó là thay scope, không tự coi waived.

### 6.3 Ma trận nghiệm thu

| Ca | Thao tác và điều kiện pass | Bằng chứng không được thay thế |
|---|---|---|
|A1|Hai producers overlap, initial-left/right cùng payload base, hai atomic commits brief+state khác tập, latest giữ cả hai.|Hai producer jobs/intervals/manifests; hai writer runs; serialization/parents và remote blobs thật.|
|A2|Update-one hoàn tất revision2 rồi update-two thấy revision2 và ghi3.|Read version/base và receipt barrier; không chỉ final revision3.|
|A3|Lần gọi lại initial-left cùng stable writeId/payload trả success duplicate=true, commit cũ, delta0.|Hai run IDs khác, receipt/hash/commit history; collision khác payload phải reject.|
|A4|Side-effect push/readback/receipt emit → một self-cancel → terminal cancelled → dispatch replay cùng writeId trả commit cũ, delta0.|Raw cancel/202 và API cancelled; không dùng timeout hoặc mock thay cancellation thật.|
|A5|Pending revision4; brief side-effect đã ghi, invalid-state bị từ chối; đọc lại thấy pendingWriteId và incomplete.|State/brief bytes và inspectEpisode từ data thật; không báo done khi pending.|
|A6|Hai state giả từ cùng hai producers/jobs A1 tồn tại và schema-valid, không mất dữ liệu.|Dùng lại bằng chứng A1 có chỉ mục rõ; không tạo thêm run giả để đủ số.|
|A7|Hai log requests25+25, đúng set50 runId unique, prefix bất biến, hai log commits.|Raw log trước/sau, input digests, remote history; không suy từ count50 đơn thuần.|
|A8|Chỉ reindex ghi index từ full states ở index parent; schema/domain/sort/pending/sourceCommit đúng.|Full state inventory tại parent, projection độc lập, only-index delta/remote blob.|
|A9|Invalid-state failure đúng SchemaRejected trước push, mainbefore=after, zero commit.|Structured schema error + raw run/log; Git403/auth/infra failure không phải pass ca âm.|

Final CI xanh trên đúng F_current, mọi source/code/policy/data gate và report/cleanup đầy đủ là yêu cầu thêm, không được dùng thay A1–A9. Regression registry chỉ chứng minh interface bằng fake; không nghiệm thu provider production.

## 7. Sửa trước/sau merge và tiếp tục an toàn

### 7.1 Tách identity để không chạy lại cả batch

Gói đề nghị giữ **một batch logic** với batchId từ activation đầu; các run tiếp theo là controller mới, attempt1, có `resumeOf` và `recoveryOrdinal`, không dùng API rerun. Cần phân biệt:

- payload origin: SHA/tree/time nguồn tạo payload đã freeze; mapping N không đổi;
- executing code epoch: merge M_e hiện hành đã qua candidate/main/hậu kiểm;
- operation/writeId: ổn định toàn batch; requestId lần thử mới có ordinal, payload digest bất biến;
- artifact generation: ID/run/code producer vật lý, liên kết nội dung operation đã freeze.

Typed history từ T cho phép đúng ba loại: code merge của PR D đã được gate, data single-parent của nine-operation ledger, và closure merge chỉ backlog. Mọi edge có expected parent/tree/scope/trailers/receipt. Không dùng `rev-list` count tổng để coi code merge là data commit; kiểm riêng first-parent spine và ancestry candidate mỗi merge. Code merges phải bảo toàn mọi data blob/mode so với base; data commits chỉ six paths và unique writeId; policy P bất biến ở mọi descendant.

Logic resume phải nằm trong repo và được kiểm trước activation đầu, không để chat quyết định từng lệnh. Journal gồm raw action intent/result và commit evidence; controller có thể suy trạng thái từ các chứng cứ đã xác minh. Không tạo database ngoài hoặc thêm file state runtime ngoài sáu path. Recovery manifest có hash được truyền qua workflow input, chứa tham chiếu đã kiểm, không được tự cấp scope/budget.

### 7.2 Bảng xử lý failure

| Tình huống | Hành động đã đề nghị gộp | Điều kiện không được vượt |
|---|---|---|
|Candidate fail|Thu hết kết quả, sửa root cause trong scope, công bố candidate mới, kiểm đủ G2.|Không rerun cùng run, không giảm manifest test/gate.|
|Main CI/hậu kiểm fail, chưa dữ liệu|Sửa qua PR D tiếp theo, CI/Ready/merge/hậu kiểm mới trong budget; activation vẫn chưa mở.|Không cố kích batch trên code lỗi.|
|Admission/producer fail trước data|Giữ evidence, sửa nếu cần; controller mới liên kết batch cũ; producers có thể tạo generation mới trong quota.|Không gọi batch34977975525 hoặc batch B; không coi producer không overlap là pass.|
|Writer fail và đã chứng minh chưa commit|Sửa code nếu cần; dispatch mới cho chính operation còn thiếu, cùng payload/writeId, request ordinal mới.|Lần cũ phải terminal và side effect đã đối soát chắc chắn; tối đa sáu dispatch phục hồi chung.|
|Push đã thành công, sau đó lỗi readback/report|GET commit/ref/blob và raw gốc để xác định state; đánh dấu operation đã ghi, không ghi lại.|GET muộn không thay raw bị mất. Nếu acceptance cần raw đã mất, giữ ca đó chưa đạt.|
|POST ack không rõ / run chưa terminal|Thu request/raw/ID đã có; đọc trạng thái để đối soát, bảo lưu pending.|Không POST thứ hai hoặc timeout/silence STOP. Không suy “không tìm thấy ngay” thành “chưa thực hiện”.|
|HTTP403/auth rejection|Giữ raw/meta và phần độc lập; phân biệt lỗi code chưa truyền auth với actual403.|Không retry403/đổi token/settings. Nếu cần quyền mới, báo đúng endpoint/role/quyền thiếu.|
|Artifact mới hết retention|Có thể tạo generation mới trong D từ nội dung operation đã lưu đủ/hash đúng, nhận lại theo role mới, lưu metadata mới.|Không phục dựng ZIP cũ, không giả upstream ZIP hash không đổi; không thay payload để lách collision. Nếu thiếu bytes gốc thì giữ blocked.|
|FinalCI/report/cleanup validation fail|Thu đủ bằng chứng; nếu code cần sửa, PR sửa; finalCI mới attempt1 trong ba suất finalCI, khi có thay đổi/bằng chứng liên quan.|Không rerun API hoặc khai cleanup pass khi không có evidence. Cancel A4 giữ ngoại lệ riêng.|
|Chạm cap hoặc xuất hiện main từ nguồn ngoài|Không phát thêm side effect; thu/đối soát run đang có; báo delta tối thiểu và phần độc lập đã làm.|Không cancel để vừa cap, không đổi baseline/counter cũ, không tự lấy reserve mới.|

Không dùng force-cancel, rollback, reset fixtures, amend/xóa failures hoặc sửa dữ liệu đã commit để “làm lại sạch”. Dữ liệu đã sai hoặc semantics cần thay ngoài nine-operation payload là blocker có ý nghĩa: lưu exact offending blob/operation và đề nghị forward correction có scope riêng; không cấp mặc định trong gói này.

### 7.3 Hiệu lực acceptance khi code thay đổi sau data

Mỗi ca A có code epoch đã thực thi và tập file/hàm/hợp đồng mà bằng chứng phụ thuộc. PR sửa phải lập bảng ảnh hưởng và chạy regression/read-only validation trên candidate cuối. Bằng chứng thật chỉ tái dùng nếu hành vi đã kiểm không đổi, bytes dữ liệu/payload nguồn giữ nguyên, provenance đầy đủ và kiểm hiện hành xác nhận. Nếu thay đổi làm ca A cũ không còn chứng minh code cuối, ca đó bị vô hiệu; **không lấy replay trong repo tạm hoặc CI xanh thay side effect thật**.

Có thể tiếp tục ca chưa chạy bằng code mới với cùng payload origin và journal hợp lệ; phải ghi rõ batch qua nhiều code epochs, không gọi là single-SHA E2E. Nếu gate bắt buộc phải lặp lại tác dụng phụ nhưng quota nine data/one cancel hoặc tính đồng thời không cho phép, hoàn tất phần độc lập và trình đúng delta cần thiết. Đây là giới hạn bảo toàn dữ liệu/bằng chứng, không phải hạn chế “hết ba commit”. Gói không hứa khắc phục tự động trường hợp mất bằng chứng không thể tái tạo.

### 7.4 Artifact generations và duplicate

Giữ receiver nguyên ZIP→metadata→CRC/member/hash/schema; không execute payload, không token theo signed redirect. Mỗi ZIP receive là một vai trò cụ thể của run mới; trong cùng job CAS cache bytes đã nhận, không network-download lại. Duplicate/replay đã có commit phải trả từ receipt/history mà không receive ZIP mới.

Nếu tạo generation mới, manifest transport mới có code/run/artifact identity mới nhưng **operation payload digest cũ phải khớp**. Duplicate collision kiểm digest nội dung ổn định và chain chứng nhận generation, không chỉ chấp nhận bất kỳ artifact ID khác. Cả bộ generation và nguồn bytes cũ còn trong bằng chứng. Tăng retention chỉ áp objects D mới, không sửa hoặc tải lại artifact B/R1/C.

## 8. Quyền thực thi và counters đề nghị

### 8.1 Sự kiện và cách đếm

Giữ CI bốn job; acceptance sáu job records theo mode (foundation, admit, producer-left, producer-right, controller, report). Candidate chạy foundation/report, các job khác skipped; hậu merge chỉ read-only; activation/resume mới cho producer/controller cần thiết. Writer hai job records (một thường, một cancel có điều kiện), reindex một. Tất cả skipped job nội bộ vẫn tính trong job records của active workflow.

| Hạng mục tối đa trong mô hình | Active workflows | Job records |
|---|---:|---:|
|P push: legacy CI + acceptance|2|10|
|5 đợt candidate kỹ thuật, mỗi đợt push + PR opened/synchronize, mỗi event CI+acceptance|20|100|
|3 merge kỹ thuật, mỗi merge main CI4 + hậu kiểm listener6|6|30|
|3 controller runs explicit: activation đầu +2 resume|3|18|
|11 writer chuẩn +1 reindex|12|23|
|1 finalCI chuẩn +2 finalCI bổ sung có căn cứ|3|12|
|6 writer/reindex dispatch phục hồi, tính worst-case2 job/run|6|12|
|Closure PR: candidate push/PR4 runs20 jobs + main CI/listener2 runs10 jobs|6|30|
|**Tổng mô hình**|**58**|**235**|
|**Cap đề nghị**|**72**|**288**|
|Dư địa sai khác graph/sự kiện nền tảng|14|53|

Cap skipped workflow records **36**, bucket riêng. Với năm candidate bundles qua tối đa ba PR kỹ thuật, legacy FS22 có thể tạo 4–8 skipped records ở synchronize; ba finalCI có thể tạo ba listener-skipped records. Đây là dự kiến 7–11, không phải danh sách record đã có. Closure opened và ready/edit/filter events có thể khác; dùng actual, không dựng records cho vừa mô hình. Nếu GitHub tạo active record ngoài mô hình nhưng có provenance D hợp lệ thì tính vào buffer; buffer không cấp quyền side effect ngoài danh mục.

Mỗi active workflow = một run record mới không có conclusion skipped, gồm queued/in_progress/success/failure/cancelled; mỗi run attempt phải1. Job bucket bao gồm executed và internally skipped. Toàn skipped workflow record không cộng active/jobs-active; lưu jobs riêng của nó. Trước terminal: đặt chỗ số job max(declared graph, observed records), sau terminal dùng API records thực, không giảm vì job failure. Paginate runs/jobs đầy đủ, kiểm duplicate/missingpage/total/provenance, lưu từng page trước xử lý.

Baseline D là **97** run IDs và properties đã pin tại §2; R1/C giữ sổ riêng. Ledger tổng sau D bằng97 + mọi records mới thực tế, không lấy58 thay actual. Mỗi POST/push trước hành động phải xét counters hiện tại + in-flight reservations + phần đuôi bắt buộc. Unknown queued jobs không coi bằng0. Trước merge kỹ thuật đầu, đuôi cơ bản ít nhất **16 active/43 jobs** (mainCI+hậu kiểm+controller+13 downstream); giữ thêm **6/30** cho closure, thành **22/73**, cùng reserve skipped theo graph. Trước activation cơ bản giữ **14/33** cho controller+13 downstream và closure **6/30**. Resume tính phần còn thiếu cụ thể từ journal, không đặt lại đủ13 rồi lặp tất cả.

Không đếm Ready/merge là run nhưng mọi workflow chúng gây ra đều vào ledger. Không gọi lại Ready/merge nếu ack thiếu. Không cấp quyền thay graph tùy tiện: thay cần thiết trong scope phải cập nhật mô hình trước push và vẫn nằm caps; vượt cap thì trình delta, không thực thi trước.

### 8.2 Danh mục side effects đóng

| Quyền | Tổng tối đa mới của D / giải thích |
|---|---|
|Controller dispatch|3 =1 activation +2 resume; cùng batch logic, từng run mới attempt1.|
|Canonical downstream dispatch|13 =11 writer +1 reindex +1 finalCI.|
|Recovery writer/reindex|6 chung, chỉ operation thiếu hoặc duplicate-readback hợp lệ; không phát sinh operation dữ liệu mới.|
|Extra finalCI|2 sau sửa/validation mới có căn cứ.|
|**Tổng dispatch**|**24** =3+13+6+2. Đếm cả request đã gửi nhưng outcome chưa rõ, không chỉ run thành công.|
|Self-cancel|1 đúng A4; không force/general cancel.|
|Data commits|9 tổng, không reset qua code epoch hoặc resume. CAS tentative objects chưa push không là data commit main nhưng lưu attempts.|
|Artifacts mới|16 =10 candidate kỹ thuật (5×2) +6 producer objects (3 controllers×2, chỉ tạo khi cần). Closure0.|
|ZIP receives|31 =10 candidate +6 producer self-readback +9 canonical writer nonduplicate (gồm invalid) +6 recovery tối đa. Reindex/duplicate/replay0.|
|PR/Ready/merge|≤3 technical PR +1 closure PR; Ready1/merge1 cho mỗi PR có gate. Số PR lấy từ API thực.|
|Rerun API / retry403 / force-cancel / rollback|0 /0 /0 /0.|
|Provider / publish / settings / credentials / dependency changes|0 cho mọi loại.|
|Historic artifact/ZIP recovery|0. Không B/R1/C replay; không Ready/merge PR12/13/14.|

Không giới hạn số GET hợp lệ hay số trang làm một blocker thủ tục. Tuân thủ API access/rate/error thực tế; không lặp403. Payload/ZIP size caps bảo vệ tài nguyên và parser, không được nới để đọc artifact ngoài vai trò. Retention7 ngày là thời gian giữ artifact, **không** là deadline task hay STOP khi im lặng; bytes bằng chứng phải được lưu bền vững ngay khi thu.

## 9. Ngân sách, runtime và giới hạn được thay

### 9.1 Dự phòng và điều tiết

Đề nghị **60 USD mới cho toàn D gồm sửa trước/sau merge, activation, thu và closure**. Đây là mức reserve do kế hoạch chọn cho nhiều vòng xử lý và số job mô hình235; không quy đổi58run/235job thành USD vì chưa có bảng billing/tài khoản thực được xác minh. Không khẳng định actual≤60 USD. B1/B2/quota/credit/billed minutes và actualUSD hiện unknown; không cần mở dự án khác hoặc yêu cầu gửi hỗ trợ để đoán.

Không có hard USD STOP trong stage theo D-13; không hạ quality hoặc bỏ kiểm. Orchestrator không mở thêm vòng tùy chọn khi không đủ cap/nguồn lực cho đuôi bắt buộc. Khi có billing evidence thật, ghi riêng actual/estimated/version; nếu cho thấy cần vượt reserve để mở thêm công việc ngoài phần đang chạy, trình một delta tổng phần còn lại, không xin từng job. Không cancel tác vụ đang chạy vì tiền/đếm cap. Chấp nhận khả năng vượt reserve do billing chưa có hard bound; không thay settings để tạo bảo đảm giả.

### 9.2 Runtime pins và bảo đảm giảm cần phê duyệt trong gói D

Giữ Ubuntu24.04, Node20.20.2, npm10.8.2; Node archive SHA `df770b2a6f130ed8627c9782c988fda9669fa23898329a61a871e32f965e007d`; checkout `34e114876b0b11c390a56381ad16ebd13914f8d5`; setup-node `49933ea5288caeca8642d1e84afbd3f7d6820020`; upload `ea165f8d65b6e75b540449e92b4886f43607fa02`. Package/lock giữ treeT, `npm ci --ignore-scripts` chỉ Actions. Ghi Git/Python/runner thực và kiểm khả năng trước dùng, không nâng dependency để giải lỗi.

Đề nghị owner duyệt ngoại lệ D: Node20 EOL/actionNode24 patch unproven; B1/B2/billing unknown; main chưa được bảo vệ và có base race; token repo-wide không path-scoped; bootstrap merge trước full E2E; giữ fixture/log/index synthetic trên main; một cancel có thể cắt cleanup; reserve không là hard spend ceiling. Bù bằng exact pins/checksum/source/policy/scope, read-only prequalification, serialized CAS, raw/remote readback và đầy đủ báo cáo. Không gọi đây là bảo đảm tương đương branch protection hoặc token path-scope.

### 9.3 Rà bỏ giới hạn chỉ tạo thủ tục

| Giới hạn cũ | Thay trong D | Phần vẫn giữ và lý do |
|---|---|---|
|Đúng12 file dù lỗi có nhiều đường gọi|Allowlist trách nhiệm24 path +closure one-line có điều kiện; chỉ chạm cần thiết.|Không chạm contracts/providers/config ngoài scope; ngăn mở rộng sản phẩm.|
|≤3 implementation commits|≤5 đợt candidate kỹ thuật với ngân sách CI rõ; commit không là đơn vị chất lượng.|Exact head/policy/history, mỗi push có ledger, không unbounded CI.|
|Một PR, cấm mọi fix sau merge|1 PR đầu +2 recovery PR cấp trước; thêm closure PR có gate owner.|Mỗi PR được review/CI và merge1 lần, không lặp mutation cũ.|
|Một controller run, failure là hết quyền|Một batch logic +2 resume có journal; tối đa6 recovery dispatch.|Không lặp unknown side effects, không thêm data operation.|
|Artifact hết một ngày là bế tắc|Retention7 ngày cho D +generation mới từ bytes đã có/chứng nhận.|Không dựng ZIP/raw thiếu, hash/identity vẫn bắt buộc.|
|Dừng toàn task khi một phần blocked|Hoàn tất phần độc lập đã duyệt, chỉ ngừng phần phụ thuộc.|Báo delta nguồn ngoài gói/quyền/chi phí thật sự thiếu.|
|Xin quyền theo từng bước|Owner duyệt gói; agent tự điều phối tới kết quả hoặc blocker thực.|Owner đọc/đồng ý nghiệm thu cuối vẫn là DoD§8.|
|Deadline/ngưỡng im lặng|Không đặt.|Rate/access/correctness/cap admission thực không phải deadline.|

## 10. Khép WP002 và gate owner không thể giả định

Phân biệt sáu trạng thái: code có diff → code merge → CI xanh → A1–A9 đạt → nghiệm thu kỹ thuật đầy đủ → owner nghiệm thu/backlog done. Gói triển khai không thay cho bước owner đọc kết quả thật.

Để giữ chỉ dẫn **WP002todo**, policy và mọi triển khai kỹ thuật không đổi backlog. Khi technical pass, agent chuẩn bị báo cáo năm mục và **diff một dòng backlog** từ checkpoint F_current; chưa ghi dòng done. Báo cáo đối chiếu DoD1–12: CI cuối, acceptance/negative, scope/secret/content/contracts, log/cost semantics, idempotency, owner pending và backlog pending; WP002 không phải WP hình ảnh nên mục13 không áp dụng, không gọi miễn kiểm thị giác của WP khác.

Sau khi owner đọc và xác nhận nghiệm thu đúng checkpoint, quyền có điều kiện đã nằm trong gói này cho phép agent tự tạo closure commit/PR mới chỉ một dòng backlog. Không xin thêm quyền cho push/CI/Ready/merge closure đã được duyệt. Nếu main đổi bởi nguồn ngoài gói, báo delta; không đổi checkpoint owner đã xác nhận một cách âm thầm.

Closure candidate có CI và suites read-only trên đúng head; không thêm artifact hoặc activation. Tự Ready/merge một lần khi gate đủ, readback parents/tree và bảo toàn toàn code/data/policy, main CI4 + listener read-only. Nghiệm thu A không phải chạy lại chỉ vì đổi backlog nếu mọi bytes/hợp đồng liên quan giữ nguyên và provenance còn đủ. Nếu closure fail vì code lỗi, không gắn done hoặc bỏ gate; xử lý trong remaining quyền kỹ thuật nếu còn, nếu không lưu exact delta.

Chỉ sau các bước này mới báo WP002 done. Không khởi động WP004/003/009 hay sản xuất trong gói D. Nếu owner chưa nghiệm thu, kết thúc ở trạng thái technical-ready/owner-pending/todo; đó là bước quyết định có ý nghĩa, không phải blocker triển khai kéo dài vô cớ.

## 11. Điều kiện trình lại và phương án tối thiểu

| Blocker còn có thể gặp | Phần được tự hoàn tất | Delta tối thiểu phải trình |
|---|---|---|
|Pin mismatch khi lấy hồ sơ|Giữ file riêng, ghi byte/hash thực; tự lấy đúng version theo ID, không dùng nội dung lệch.|Chỉ khi không truy xuất được version đúng: nêu ID/version/capability thiếu và phương án truy xuất; không yêu cầu upload lại.|
|Checkpoint ngoài D hoặc ledger foreign|Thu raw metadata, so commit/tree/path/runIDs, bảo toàn evidence.|Review tích hợp delta cụ thể trước đổi base; không force hoặc giả own change.|
|403/access|Đối chiếu role/endpoint và code auth không dùng secret mới; các kiểm độc lập.|Quyền endpoint thực thiếu nếu cần; không retry403/request support/credential change.|
|Mất raw/ZIP hoặc ambiguous write|GET state hiện tại có nhãn thời điểm mới, giữ evidence còn có.|Nêu chính xác ca A bị thiếu; không dựng chứng cứ. Nếu cần operation mới/chi phí ngoài gói, đề nghị một lần cho toàn phần còn lại.|
|Bug làm thay payload/schema/contracts hoặc data đã sai|Sửa/read-only tests trong scope nếu có, giữ offending bytes.|Forward-correction/new acceptance cụ thể, không rollback; schema/provider ngoài gói chưa được phép.|
|Đã dùng đủ5 candidate/3 technical PR/24dispatch/cap tài nguyên|Thu đủ actual và checkpoint, chuẩn bị diff/review phần còn lại trong quyền đọc.|Một delta tổng về nguyên nhân, việc còn lại và nguồn lực; không xin lẻ từng commit/job.|
|Concurrency thực không chứng minh overlap|Thu intervals/capacity evidence; kiểm độc lập còn lại.|Lần producer mới trong3controller nếu còn; nếu cần tăng quota/settings thì không tự làm, giữ A1/A6 chưa đạt.|
|Runtime pin không chạy được hoặc actual cost không đủ|Thu checksum/runtime/error/billing thật, giữ scope không chạy được riêng.|Pin/runtime hoặc reserve delta có căn cứ; không tự đổi dependency/settings.|

Không phải mọi blocker đều giải bằng thêm tiền/quyền. Đặc biệt chứng cứ mất không thể được thay bằng một câu phê duyệt. Không có auto-review rejection trong lượt lập kế hoạch này.

---

## D-28 · Gỡ bộ máy bằng chứng tự chế

### Bối cảnh
D-22 đến D-27 hợp thức hoá một chuỗi cơ chế bằng chứng — receipt, authority, ledger,
candidate, Range cap — tổng cộng khoảng 804 KB, gồm ba file Python trong một dự án khai
TypeScript. Cơ chế này được xây vì cho rằng agent không đọc được kết quả CI. Thăm dò bằng
hành động sau đó chứng minh giả định đó sai (xem D-29). Đồng thời ci.yml bị gắn cứng vào
FS_GRANT FS24-D và gọi scripts/wp002-preflight.py ở bước đầu của cả bốn job, làm CI đỏ trên
main sau khi merge PR #19.

### Quyết định
Gỡ toàn bộ cơ chế đó theo WP-007. Viết lại ci.yml theo đúng WP-001 mục 3 và 3b. Chuyển nội
dung D-22 đến D-27 sang engine/docs/decisions/archive-fs2x.md, giữ lại một dòng mỗi quyết
định trong file này. Bằng chứng hợp lệ từ nay chỉ gồm ba loại theo guardrail 28.

### Phương án bị loại
Giữ cơ chế và sửa từng chỗ hỏng — bị loại vì đó là chữa triệu chứng của một giả định chưa
kiểm, và mỗi lần sửa trước đây đều mở ra bề mặt lỗi mới.

### Hệ quả
pipeline/runs.jsonl được làm rỗng vì 50 dòng hiện có đều là fixture, costUsd bằng 0. Ba mốc
chi phí trong 04-nfr.md vì vậy chưa có cơ chế nào đọc cho tới khi WP-004 ghi chi phí thật.

---

## D-29 · Vòng kiểm cục bộ và bằng chứng tối giản

### Bối cảnh

Chuỗi FS24 xây 804 KB cơ chế bằng chứng vì cho rằng không đọc được kết quả CI. Thăm dò bằng
hành động chứng minh điều đó sai: container chạy `npm ci` và `tsc` trong 21 giây, GitHub
plugin đọc 284 dòng log của một job trong 4,6 giây.

### Quyết định

Vòng kiểm cục bộ bắt buộc; đọc và ghi bằng plugin; guardrail 28; ba loại bằng chứng hợp lệ.

### Phương án bị loại

Giữ CI là nơi kiểm duy nhất — bị loại vì mỗi lỗi biên dịch tốn một vòng CI, và đó là động
cơ sinh ra FS24.

### Hệ quả

WP-004 builder không còn là điều kiện để agent chạy được code; mục đích còn lại là chạy
theo lịch mà không cần người gõ. WP-004 chuyển xuống sau WP-002.

---

## D-30 · Điều chỉnh phạm vi và tách hai PR của WP-007

### Bối cảnh

PR #21 vừa sửa WP-007 vừa triển khai cleanup, trong khi WP-001 mục 3b đọc phạm vi từ WP
trên main và chỉ cho phép sửa chính WP trong PR chỉ có tài liệu với nhãn `[wp-change]`.
`github-writer.ts` còn phụ thuộc `wp002-integration.ts`; hai workflow ghi và reindex còn
gọi các file Python nằm trong danh sách xoá. Xoá riêng các file đó để lại phụ thuộc hỏng.

### Quyết định

Riêng WP-007, thay yêu cầu một PR bằng hai PR nối tiếp: PR tài liệu `[wp-change]` chỉ sửa
`engine/ops/work-packages/WP-007-cleanup.md` và `engine/docs/02-decisions.md`; sau khi PR
này được merge mới thực hiện PR cleanup theo phạm vi đã có trên main. Trong PR tài liệu,
giữ đầy đủ D-22 đến D-27, thêm nguyên văn D-28 trước D-29 và giữ nguyên D-29. Việc chuyển
D-22 đến D-27 sang file lưu trữ thuộc PR cleanup.

Giữ bốn file `engine/io/github-git.ts`, `engine/io/github-git.test.ts`,
`engine/io/github-transport.ts`, `engine/io/github-writer.ts`; gỡ phụ thuộc FS24 để xoá
`engine/io/wp002-integration.ts` và test mà không làm hỏng biên dịch. Đây là quyết định
chung cho cả bốn file theo đồ thị import. Giữ nguyên `.github/workflows/acceptance-wp000.yml`
và `scripts/acceptance-wp000.ts` trong WP-007.

Bổ sung `.github/workflows/commit-artifacts.yml` và `.github/workflows/reindex.yml` vào
phạm vi WP-007 để bỏ các lời gọi tới file bị xoá, theo D-15 và WP-002b; thay yêu cầu giữ
nguyên hai workflow ở mục 5 của WP-007 bằng giữ file và sửa đúng nội dung này. Bổ sung
`engine/ops/operating-rules.md` chỉ cho đoạn VIỆC 0c về cách chạy validate đã được giao.
Hai mục chờ quyết định giữ/xoá ở mục 5b của WP-007 được thay bằng các quyết định trên.
Giữ các kiểm tra của WP-001 và guardrail 28; không thêm cơ chế kiểm mới.

### Phương án bị loại

Tiếp tục gộp sửa WP và cleanup trong một PR — trái điều kiện `[wp-change]` của WP-001.
Xoá các file phụ thuộc mà giữ nguyên nơi gọi — làm hỏng biên dịch hoặc workflow.
Xoá cặp acceptance-wp000 ngay trong WP-007 — để lại tham chiếu trong package và tài liệu.

### Hệ quả

PR tài liệu chưa thực hiện cleanup và chưa nghiệm thu WP-007. CI cũ và bốn fixture FS24
được giữ theo main; kết quả lỗi phải được báo đúng, không sửa validator để che lỗi nền.
Giữ commit cleanup cũ trong lịch sử để tái sử dụng. Việc chuẩn bị PR tài liệu không cấp
quyền merge, refactor runtime hoặc đổi branch protection/settings. PR cleanup vẫn phải
đạt các bài kiểm WP-007, gồm bốn job CI xanh trên một push vào main.
