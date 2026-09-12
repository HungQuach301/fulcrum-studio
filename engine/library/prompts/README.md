# Prompt pack

Mỗi prompt là một file có phiên bản. Thay đổi prompt phải thêm phiên bản, không ghi đè.

Mỗi prompt phải kết thúc bằng một mục **Tự kiểm** — mô hình tự khai các chỉ số đo được của
đầu ra. Stage sau tính lại và đối chiếu. Xem cơ chế 5 trong `11-quality-gates.md`.

Prompt **không được** chứa hằng số nội dung. Chúng đọc từ Genre Pack và Channel Pack.
