# Secrets

Chỉ liệt kê **tên**. Không bao giờ ghi giá trị vào repo.
Nơi lưu: GitHub → Settings → Secrets and variables → Actions.

## Nguồn dữ liệu — bắt buộc từ WP-010

| Tên | Dùng ở | Ghi chú |
|---|---|---|
| `FRED_API_KEY` | S01, S04, WP-010 | Đăng ký miễn phí. Dùng cho cả kho vintage |
| `BLS_API_KEY` | S01, S04, WP-010 | Miễn phí, có giới hạn truy vấn mỗi ngày |
| `CENSUS_API_KEY` | S04, WP-010 | Miễn phí |

## Mô hình ngôn ngữ

| Tên | Dùng ở | Ghi chú |
|---|---|---|
| `LLM_API_KEY` | S04, S06, S07, S09a, S09b, S16 | |
| `LLM_API_KEY_VERIFIER` | S05 fact-check, lượt trích xuất thứ hai của ảnh chụp biên tập | **Phải là nhà cung cấp KHÁC**, không chỉ khoá khác. Cùng nhà cung cấp thì hai bên sai giống nhau và bước kiểm mất hết giá trị |
| `EMBEDDINGS_API_KEY` | WP-014, WP-045 | Phân cụm bình luận và kiểm mới lạ |

## Công cụ agent — bắt buộc từ WP-004

| Tên | Dùng ở |
|---|---|
| `AGENT_API_KEY` | `builder.yml` |

## Giọng và âm thanh

| Tên | Dùng ở | Ghi chú |
|---|---|---|
| `TTS_API_KEY` | S11 | Kiểm điều khoản thương mại **trước** khi cam kết |
| `MUSIC_LICENSE_KEY` | S12 | Nhạc nền có giấy phép thương mại |

## Hình ảnh

| Tên | Dùng ở |
|---|---|
| `IMAGE_GEN_API_KEY` | S12 |
| `STOCK_API_KEY` | S12 |

## Nền tảng và công bố

| Tên | Dùng ở | Ghi chú |
|---|---|---|
| `YT_CLIENT_ID` | S17 | |
| `YT_CLIENT_SECRET` | S17 | |
| `YT_REFRESH_TOKEN` | S17, S18 | **App phải ở trạng thái production.** Ở trạng thái testing, token hết hạn sau 7 ngày |
| `BACKUP_TARGET_TOKEN` | WP-063 | Sao lưu artifact văn bản sang nơi thứ hai |

## Công bố bảng tính mô hình

Không dùng khoá API của Google để ghi: khoá API chỉ đọc được dữ liệu công khai, không ghi
được. Vì công bố bảng tính là cơ chế chặn số 2 của bằng chứng công sức, chỗ
này phải đúng.

**Đã chốt ở D-16: repo công khai riêng `fulcrum-models`.**

| Tên | Dùng ở | Ghi chú |
|---|---|---|
| `PUBLISH_REPO_TOKEN` | S16, WP-042 | Fine-grained token, phạm vi **chỉ** repo `fulcrum-models`, **chỉ** quyền Contents ghi. `GITHUB_TOKEN` của Actions không dùng được: quyền của nó chỉ trong repo chứa workflow. Không dùng token cá nhân toàn quyền |

Chỉ xuất theo `config/publish-allowlist.json`. File ngoài danh sách bị chặn ở bước xuất, không
phải bị lọc ở bước sau. Deliverable là ba thứ: mô hình JSON, trang HTML tính lại được trong
trình duyệt, và bộ ca kiểm tay — trang HTML phải cho **cùng kết quả** với con số đã phát hành.

## Ghi chú vận hành

- Tài khoản dùng cho kênh phải là **tài khoản riêng của kênh**, không phải tài khoản cá nhân.
- Không log giá trị secret. Job `guardrails` quét chuỗi giống secret trong mọi diff.
- **Đặt hạn mức chi tiêu trên trang quản lý của từng nhà cung cấp.** Theo D-13, repo không có
  trần cứng; đây là lưới an toàn duy nhất còn lại, và nó nằm ngoài code.
