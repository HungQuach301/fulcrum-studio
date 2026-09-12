# Kiến trúc

## Ba mặt phẳng cộng một

| Mặt phẳng | Ở đâu | Vai trò |
|---|---|---|
| Điều khiển | Agent, sau này là cockpit | Ra lệnh, trình gate, nhận phê duyệt |
| Trạng thái | Repo GitHub | Nguồn sự thật duy nhất |
| Tính toán | GitHub Actions | Mọi xử lý nặng |
| **Quan sát** | `pipeline/runs.jsonl` | Nhật ký mọi lần chạy stage |

Mặt phẳng quan sát là nguồn dữ liệu duy nhất cho First-Pass Yield, cho định tuyến nguyên
nhân gốc xuyên tập, và cho quy tắc "cùng loại lỗi fail hai lần thì sửa đặc tả". Không có
nó, ba cơ chế đó chỉ là chữ trên giấy.

## Việc nào chạy ở đâu

| Việc | Nơi chạy | Lý do |
|---|---|---|
| Gọi LLM, TTS, ảnh, stock | Actions | Cần secret, cần thời gian |
| Kiểm tra tĩnh (preflight, validate) | Actions | Nhanh, rẻ, không cần secret |
| Render | Actions, matrix nhiều worker | Nặng |
| Lấy dữ liệu | Actions theo lịch | Cần secret |
| Trình gate, nhận phê duyệt | Mặt phẳng điều khiển | Cần người |
| Lặp thiết kế layout | **Tại chỗ** — ngoại lệ duy nhất, xem quyết định D-10 | Vòng phản hồi phải tính bằng giây |

## Lớp điều phối

Giai đoạn đầu, agent là orchestrator. Cơ chế dừng-chờ-phê-duyệt vốn là bản chất của agent,
khớp chính xác với mô hình gate. Nhờ vậy cockpit chuyển từ Mốc 1 xuống Mốc 6 và chỉ làm nếu
vận hành qua agent thực sự chật.

| Giai đoạn | Ai điều phối |
|---|---|
| Tới hết Mốc 5 | Agent |
| Nhịp thấp, vài tập/tuần | Agent + workflow Actions từng khối |
| Nhịp cao, nhiều tập song song | Orchestrator trong Actions; agent quay về xây dựng và phân tích |

Để chuyển được, mọi thứ agent gọi phải là **workflow trong repo có tham số**, không phải
chuỗi thao tác agent tự nghĩ ra.

## Mô hình đồng thời

- Trạng thái tập nằm ở `/episodes/{channel}/{id}/state.json`. Chỉ pipeline của chính tập đó ghi.
- `pipeline/state.json` là **chỉ mục dẫn xuất**, không ai ghi trực tiếp. Một workflow duy
  nhất xây lại nó, dùng `concurrency: group=reindex`.
- `pipeline/runs.jsonl` là append-only, ghi bằng retry-with-rebase tối đa 5 lần.
- Không job nào ghi vào hai thư mục tập khác nhau trong cùng một lần chạy.

## Cấu trúc artifact một tập

```
/episodes/{channel-slug}/{YYYY-MM-slug}/
  state.json
  00-brief.json
  01-sources.json
  02-factcheck.json
  03-sensitivity.json
  04-outline.json
  05-script.md
  06-canvas-map.json
  07-storyboard.json
  08-preflight.json
  09-timing.json
  10-captions.srt
  11-proof.json
  12-render-manifest.json
  13-qa.json
  14-package.json
  15-publication.json
  16-metrics.json
```

## Cockpit nội bộ và UI sản phẩm là hai thứ khác nhau

| | Cockpit nội bộ | UI sản phẩm |
|---|---|---|
| Mục đích | Vận hành nhà máy của mình | Bán |
| Chuẩn UX | Xấu cũng được, miễn dùng được | Đạt chuẩn |
| Công nghệ | Một file, không build step | Framework thật |
| Thời điểm | Mốc 6, chỉ nếu cần | Sau Mốc 8 |
| Quan hệ | Không tái dùng | Viết lại từ đầu, và đó là bình thường |

Đừng cố làm một cái phục vụ cả hai.

## Giới hạn phải nhớ

| Giới hạn | Con số | Hệ quả |
|---|---|---|
| Quota YouTube Data API | Theo từng bucket/phương thức; mặc định công bố xem `04-nfr.md` mục "Quota YouTube — nguồn công bố và bằng chứng project" | Lập ngân sách **theo stage, phương thức và bucket thực tế của project** trước WP-014. Quota project hiện chưa có bằng chứng; không coi mọi lời gọi cùng dùng một hạn mức |
| Job đồng thời của Actions | Phụ thuộc gói — **phải kiểm trước khi thiết kế xong S12** | Matrix 16–20 worker có thể chiếm hết, không còn chỗ cho job khác |
| Kích thước file trong repo | Tránh commit nhị phân lớn | Video và ảnh đi qua Releases hoặc artifact, không commit |
| Refresh token Google | Hết hạn 7 ngày nếu app ở trạng thái testing | Phải đưa app sang production |
| Rate limit nguồn dữ liệu | Mỗi nhà cung cấp khác nhau | Ghi rõ trong comment adapter |

## Sao lưu

Toàn bộ tài sản nằm trong một repo private. Một workflow định kỳ đẩy bản sao **artifact văn
bản** (brief, script, storyboard, model, snapshot) sang một nơi thứ hai. Video không cần sao
lưu — render lại được từ artifact.
