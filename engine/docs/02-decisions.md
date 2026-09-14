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
