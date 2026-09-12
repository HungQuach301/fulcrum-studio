# Guardrails

Luật thường trực cho mọi agent, mọi task. Vi phạm bất kỳ mục nào là lý do đủ để từ chối kết
quả và làm lại.

Mọi mục dưới đây có thể được thay thế qua thủ tục ở quyết định **D-14**, không thể được nới
bằng cách khác.

## Nhóm 1 — Ranh giới kiến trúc

1. Không sửa file trong `engine/contracts/`. Thấy schema sai thì nêu rồi dừng.
2. Không thêm hằng số nội dung vào `/engine`: danh sách pillar, tên layout, mã màu, tên
   giọng, ngưỡng nội dung, khuôn tiêu đề, **số beat, số scene, số từ, thời lượng mục tiêu**.
   Chúng thuộc Genre Pack hoặc Channel Pack.
3. Một file thuộc Engine chỉ khi nó đúng với mọi thể loại và mọi kênh.
4. Mọi đọc/ghi artifact qua interface trong `engine/io/`, không gọi thẳng GitHub API.
5. Mọi lời gọi provider qua interface trong `engine/providers/`.
6. Artifact tập nằm ở `/episodes/{channel-slug}/{YYYY-MM-slug}/`.
7. Không stage nào ghi trực tiếp vào `pipeline/state.json`.
8. Các khối nối nhau bằng `workflow_dispatch` có tham số, không bằng sự kiện push. Xem D-12.

## Nhóm 2 — Ranh giới hạ tầng

9. Không giải pháp nào cần server chạy liên tục, database ngoài, hay máy local — trừ ngoại
   lệ ở D-10, và trừ khi có một mục D-xx mới theo thủ tục D-14.
10. Không thêm dependency ngoài danh sách trong mục "Ràng buộc" của WP.
11. Không ghi secret vào repo, không log giá trị secret, không đưa secret vào mô tả PR.
12. **Mỗi stage đo và ghi `costUsd`. Không stage nào tự dừng vì chi phí.** Xem D-13.

## Nhóm 3 — Ranh giới của agent

13. **Agent điều phối, agent không triển khai.** Mọi logic quyết định phải nằm trong repo
    dưới dạng code, contract, hoặc prompt pack có phiên bản.
14. Không chạm file ngoài "Phạm vi cho phép" **khai trong file WP**. Phạm vi là thuộc tính
    của WP, không phải của một file cấu hình mà agent ghi được.
15. Không mở rộng phạm vi. Hỏi A thì trả lời A.
16. Không tuyên bố test pass mà không có kết quả chạy thật.
17. Không tự sửa checkpoint không khớp. Dừng và báo cáo.
18. Không viết logic nghiệp vụ trong WP hạ tầng.
19. Không commit thẳng `main`. Mỗi WP một nhánh, kết thúc bằng PR.

## Nhóm 4 — Chất lượng và nội dung

20. Mọi con số trong nội dung phải có `claimId` trỏ về một nguồn, hoặc về một mô hình trong
    `/models/`. Không ước lượng, không nội suy.
21. Ảnh sinh không bao giờ chứa chữ hoặc số. Chữ và số luôn là phần tử DOM.
22. Mọi asset sinh lưu prompt và seed.
23. Mọi stage idempotent về trạng thái. Stage tính toán thuần còn phải xác định. Stage gọi mô
    hình ngôn ngữ hoặc TTS không bắt buộc xác định, nhưng phải lưu model, phiên bản prompt,
    temperature, seed.
24. Không hạ chuẩn kiểm chất lượng để tiết kiệm. Vượt mốc chi phí thì giảm sản lượng.
25. Mọi stage ghi một dòng vào `pipeline/runs.jsonl` khi kết thúc.

## Nhóm 5 — Khi gặp mâu thuẫn hoặc bị chặn

26. Mâu thuẫn giữa hai tài liệu, hoặc giữa yêu cầu và tài liệu: **dừng, nêu chính xác hai chỗ
    mâu thuẫn, không tự chọn một bên.**
27. Một ràng buộc làm mục tiêu WP không đạt được: **dừng, viết ba dòng theo D-14, chờ duyệt.**
    Không đi đường vòng, không tự nới, không "tạm thời làm khác".
