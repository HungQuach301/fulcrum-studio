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
