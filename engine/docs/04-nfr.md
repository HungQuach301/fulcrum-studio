# Ràng buộc phi chức năng

## Ba giai đoạn ngân sách

Ngân sách mở khoá theo chất lượng đã chứng minh, không theo thời gian.

| | Giai đoạn 1 · Xây | Giai đoạn 2 · Chạy thử | Giai đoạn 3 · Vận hành |
|---|---|---|---|
| Điều kiện vào | Mốc 0 xong | Mốc 5 xong | 10 tập đạt chuẩn, Thesis Engine đủ cung |
| Nhịp | 0 tập | 2–3 tập/tuần | Bằng tốc độ Thesis Engine, không cao hơn |
| Chi phí biến đổi/tập, mục tiêu | — | ≤35 USD | ≤35 USD |
| Chi phí cố định/tháng, mục tiêu | ≤150 USD | ≤150 USD | ≤150 USD |
| Tổng/tháng, mục tiêu | ≤200 USD | ≤600 USD | Xem ba mốc dưới |

**Đây là mục tiêu, không phải trần cứng trong code.** Xem quyết định D-13.

## Ba mốc chi phí — cơ chế mềm

| Mốc | Giá trị | Điều gì xảy ra |
|---|---|---|
| `warnUsd` (tháng) | `<ĐIỀN>` | Workflow mở một issue. Không chặn gì |
| `pauseIntakeUsd` (tháng) | `<ĐIỀN>` | Orchestrator **ngừng mở tập mới**. Tập đang chạy chạy hết |
| `stopAndReviewUsd` (tích luỹ toàn dự án) | `<ĐIỀN>` | Mọi workflow theo lịch tạm dừng, issue mức cao |

Ba con số này do chủ dự án đặt ở Mốc 0. Chúng là điều kiện dừng, không phải gợi ý.

Hai biện pháp bù nằm **ngoài repo**, chủ dự án tự làm: hạn mức chi tiêu trên trang quản lý
của từng nhà cung cấp API, và `concurrency` giới hạn job song song trong workflow.

**Không bao giờ hạ chuẩn kiểm chất lượng để tiết kiệm.** Vượt mốc thì giảm sản lượng.

## Chi phí hạ tầng phải tính vào

| Hạng mục | Ghi chú |
|---|---|
| Phút runner Actions | Repo private có hạn mức miễn phí giới hạn; render matrix tiêu nhiều. Đo bằng `workerMinutes` trong render manifest và cộng vào chi phí tháng |
| Dung lượng lưu artifact | Video vượt hạn mức artifact của gói miễn phí → đi qua Releases, không commit vào repo |
| Runner lớn hơn | Nếu WP-003 cho thấy runner tiêu chuẩn không đủ bộ nhớ, runner lớn hơn là phương án có phí — đưa vào chi phí cố định |

## Thời gian người — ngân sách và cảnh báo

| Hạng mục | Mục tiêu ở Mốc 5 | Mục tiêu ở giai đoạn vận hành |
|---|---|---|
| Gate 1 | ≤2 phút/tập | Theo lô tuần |
| Gate 2 | ≤5 phút/tập | Chỉ tập có cờ vàng |
| Gate 3 | ≤5 phút/tập | Kiểm mẫu 1/10 |
| Vận hành sau đăng | ≤8 phút/tập | Duyệt theo lô |
| **Tổng** | **≤20 phút/tập** | **≤60 phút/tuần cho toàn kênh** |

Gán một giá trị quy ước cho giờ người và đưa vào công thức: `<ĐIỀN>` USD/giờ.

**Cảnh báo bền vững.** Tỷ lệ buổi duyệt gate đúng hạn dưới 70% qua bốn tuần liên tiếp là dấu
hiệu quỹ thời gian không bền — giảm nhịp, hoặc nâng bậc tự động hoá nếu dữ liệu cho phép.

## Hiệu năng

| Chỉ số | Ngưỡng |
|---|---|
| Pipeline một tập, không tính thời gian chờ gate | ≤3 giờ |
| Preflight | ≤5 giây |
| Render nháp | ≤3 phút |
| Render đầy đủ, tập 20 phút | ≤60 phút wall clock với matrix |
| Sensitivity Pass | ≤2 phút, không gọi mô hình ngôn ngữ |

## Giới hạn nền tảng

| Giới hạn | Ràng buộc |
|---|---|
| Upload/ngày | ≤3. Vượt là tín hiệu nhịp sai |
| Job đồng thời Actions | Kiểm trước khi chốt thiết kế matrix render |
| Quota YouTube API | `search.list` và `videos.insert` có **bucket riêng**, mỗi method mặc định 100 lần/ngày, 1 đơn vị mỗi lần; 10.000 đơn vị dùng chung cho các endpoint còn lại. Corpus đối thủ **không** cạnh tranh với quota đăng. Nút thắt thật là 100 lần tìm kiếm/ngày và `captions` (50 đơn vị mỗi lần list). Kiểm lại số trong Cloud Console trước khi thiết kế corpus |
| Kích thước file trong repo | Không commit nhị phân lớn |

## Độ tin cậy và luật retry

- Mọi stage **idempotent về trạng thái**: chạy lại không làm hỏng dữ liệu, không tạo bản ghi
  trùng, ghi đè sạch artifact của chính nó.
- Stage tính toán thuần (preflight, sensitivity, đo lường, QA lớp 1) phải **xác định**.
- Stage gọi mô hình ngôn ngữ hoặc TTS không bắt buộc xác định, nhưng lưu model, phiên bản
  prompt, temperature, seed.

**Luật retry tách làm hai:**

| Loại | Luật |
|---|---|
| Stage **sản xuất** (S01–S19) | `maxAttempts = 2`: **tổng cộng hai lần chạy**, không phải hai lần thử lại sau lần đầu. Fail lần thứ hai vì cùng `errorClass` thì dừng hẳn, kích hoạt cơ chế 4 |
| **Retry hạ tầng** | Lỗi mạng, 5xx, rate limit: thử lại tối đa 3 lần với backoff, **không** tính vào `maxAttempts`. Ghi riêng bằng `verdict: "fail"` kèm `errorClass` bắt đầu bằng `infra.` |
| **Chạy lại sau khi sửa nội dung** | Là một `runId` mới, `attempts` đếm lại từ 1. Không phải retry |
| WP **phát triển** (builder sửa code) | Không giới hạn số vòng CI, với hai điều kiện: mỗi vòng chỉ sửa đúng lỗi mà CI nêu, và nếu nguyên nhân là **đặc tả thiếu** thì dừng ngay ở vòng đầu tiên phát hiện được |

Lý do tách: một lỗi biên dịch không phải một lỗi đặc tả, và bắt dự án dừng vì nó là lãng phí.
