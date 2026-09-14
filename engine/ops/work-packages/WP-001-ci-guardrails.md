## WP-001 · CI trên push và guardrail bằng máy

### 0. Phân loại
- `riskClass`: `architectural`
- `branch`: `wp/001`

### 1. Mục tiêu
Biến CI thành nơi kiểm duy nhất, và biến guardrail từ kỷ luật của agent thành kiểm tra máy
mà **agent không sửa được luật của chính nó**.

### 2. Input
`engine/ops/guardrails.md` · `engine/ops/definition-of-done.md` · `engine/ops/wp-template.md`
· `engine/docs/02-decisions.md` D-09, D-13, D-14

### 2b. Checkpoint trước khi bắt đầu
- WP-000 ở trạng thái `done`
- `npx tsc --noEmit` và `npx tsx scripts/validate.ts` chạy xanh trên `main`
- `main` đã có branch protection yêu cầu PR

### 3. Output
`.github/workflows/ci.yml` chạy trên `push` mọi nhánh và trên `pull_request`, bốn job:

| Job | Nội dung |
|---|---|
| `validate` | `npx tsx scripts/validate.ts` — cả hai tầng |
| `typecheck` | `npx tsc --noEmit` |
| `guardrails` | Bốn kiểm tra ở mục 3b |
| `report` | Gom kết quả thành `ci-report.txt`, upload làm artifact |

### 3b. Bốn kiểm tra của job `guardrails`

**1 · Phạm vi — đọc từ WP trên `main`, không từ nhánh đang bị kiểm.**
Checkout `main` vào một thư mục riêng và đọc file WP **từ đó**. Đọc WP từ nhánh làm việc là
vô nghĩa: agent vừa sửa được chính file quy định phạm vi của mình.
Suy ra mã WP từ tên nhánh (`wp/NNN`) hoặc tiêu đề PR. Đọc mục "4. Phạm vi cho phép" trong
`engine/ops/work-packages/WP-NNN-*.md`. Mọi file trong diff phải khớp một mục → không khớp
thì **fail**, in file vi phạm và đường dẫn WP đã dùng.
Nhánh không theo mẫu `wp/` hoặc `cp/` → **fail** với thông báo rõ.
Với nhánh `cp/`, phạm vi đọc từ mục "Phạm vi cho phép" của CP tương ứng; `cp-template.md`
phải có mục đó với đúng tên này. Push lên `main` sau merge: bỏ qua kiểm 1 — không có WP để
đối chiếu, và nội dung đã được kiểm ở PR.
Chính file WP đó nằm trong diff → **fail**, trừ khi commit có nhãn `[wp-change]` và PR chỉ
chứa thay đổi tài liệu.
*Lý do không dùng một file `.scope` ở gốc repo: agent ghi được file đó, tức bên bị kiểm viết
được luật kiểm.*

**2 · Contract khoá.** Thay đổi trong `engine/contracts/` mà commit message không chứa
`[contract-change]` **hoặc** `02-decisions.md` không có mục mới trong cùng PR → **fail**.

**3 · Hằng số nội dung trong engine.** Grep tìm mã màu hex, tên layout khai trong
`genres/*/layouts.json`, tên pillar khai trong `channels/*/channel.json`, và các con số
khoảng của thể loại (`180`, `220`, `3200`, `3600`, `1200` trong ngữ cảnh gán giá trị).
**Phạm vi grep:** chỉ `engine/**/*.ts`, `engine/**/*.yml`, và `.github/workflows/*.yml`.
**Loại trừ:** `engine/docs/**`, `engine/library/**/*.md`, `engine/contracts/**`.
*Không loại trừ thì CI đỏ vĩnh viễn: các từ `housing`, `timeline`, `debt` xuất hiện tự nhiên
trong tài liệu.*

**4 · Quét secret.** Chuỗi giống khoá API, chuỗi base64 dài, `PRIVATE KEY` → **fail**.
Đây là lưới sau cùng, không phải biện pháp chính: quét diff không ngăn được secret bị **dùng**
trong lúc job chạy. Biện pháp chính là cấp secret theo job, khai ở mục 5 của từng WP.

**Ghim phiên bản action.** Mọi `uses:` trong workflow do WP này tạo phải ghim bằng **SHA đầy
đủ**, không phải nhãn phiên bản. Nhãn có thể bị đẩy sang commit khác.

### 3c. Định dạng `ci-report.txt`
Tối đa 100 dòng. Mỗi job một khối: tên · verdict · nếu fail thì tối đa 20 dòng lỗi có nghĩa.

Job `report` chạy với `if: always()` và phải phản ánh trung thực bốn trạng thái: `success`,
`failure`, `skipped`, `cancelled`. Dòng đầu của báo cáo ghi **SHA của commit** mà nó nói về.
Một báo cáo không nêu SHA, hoặc nêu SHA khác với HEAD của PR, **không** được coi là bằng
chứng CI cho commit đó.
Không dán log thô.

### 4. Phạm vi cho phép
`.github/workflows/ci.yml` · `.github/workflows/test-guardrails.yml` · `scripts/guardrails/**`
· `scripts/ci-report.ts`

### 5. Ràng buộc
- `permissions` tối thiểu: `contents: read`, `pull-requests: read`.
- Chỉ dùng `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`.
- Không thêm dependency npm mới.
- **Không tạo file `.scope`.** Phạm vi là thuộc tính của WP.
- Không viết logic dừng-vì-chi-phí.

### 5b. Điều kiện dừng
- `main` bị đổi bởi nguồn khác giữa chừng
- Cần chạm file ngoài phạm vi
- Cần quyền ghi cho job `guardrails` — nêu lý do và dừng
- Không suy ra được mã WP từ ngữ cảnh của PR → dừng, đề xuất theo D-14

### 6. Acceptance test
1. Push thay đổi vô hại trên một nhánh `wp/` hợp lệ → bốn job xanh, `ci-report.txt` dưới 100 dòng.
2. **Kiểm âm 1:** sửa một file ngoài phạm vi của WP đó → `guardrails` fail, in đúng tên file
   và đường dẫn WP đã đọc.
3. **Kiểm âm 2:** sửa một file trong `engine/contracts/` không có nhãn → fail.
4. **Kiểm âm 3:** thêm một mã màu hex vào `engine/io/index.ts` → fail, in đúng dòng.
5. **Kiểm âm 4:** thêm một dòng chứa từ `housing` vào `engine/docs/01-architecture.md` →
   **không** fail. Đây là bài kiểm chống báo sai, quan trọng ngang bốn bài trên.
6. **Kiểm âm 5:** thêm chuỗi giống secret → fail.
7. Xoá mọi thay đổi kiểm thử sau khi xong.

### 7. Definition of Done
Theo `definition-of-done.md`, cộng: cả sáu bài kiểm chạy thật trong Actions, kết quả dán vào
báo cáo.


## Gói FS23-WP001 — D-23

Phụ lục FS23-WP001 theo D-23 thay riêng tiền đề main/protection, cách bàn giao artifact, bootstrap sáu tài liệu S và cách tổ chức ca âm. Mục tiêu, allowlist implementation gốc trên main, bốn job, scan contracts/content/secret, SHA action, không dependency và CI cuối vẫn giữ. Chỉ tám đường dẫn implementation chính xác trong D-23; không dùng scripts/guardrails/** để tự thêm file thứ chín. test-guardrails.yml không cần tạo. Sáu tài liệu S giữ nguyên sau commit policy. PR kết thúc Draft, chưa mở WP002.
