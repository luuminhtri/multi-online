# Kiểm chứng và phản biện v14

Ngày 2026-10-27. Làm trong `.agent-roles64-worktree`, nhánh `agent/roles-64`, từ production `6f8ccd8`. Không push/merge/deploy, không sửa môi trường Supabase hoặc dùng key production. Ba vòng dưới đây là **tự rà soát nối tiếp của agent tiếp quản**, không giả danh ba reviewer độc lập. Bản phản biện hợp đồng của AI trước được giữ riêng ở role-contracts-v13-round-a.md.

## Vòng 1: độ tin cậy và chống mất xác nhận

Phát hiện bản nháp cắt receipt ở 300 yêu cầu làm mất tính idempotent: sau khi bầy đổi mục tiêu A → B và có hơn 300 yêu cầu khác, gửi lại yêu cầu cũ đổi mục tiêu về A. Sửa bằng giữ receipt đã chấp nhận, dedup trước kiểm lượt/quota; thêm giới hạn yêu cầu mới theo người/lượt và đường thao tác thay/chuyển lượt của quản trò. Ba kiểm tra hồi quy bao gồm replay cũ, cùng ID khác nội dung và quá 300 receipt từ nhiều người. Không coi giới hạn này là giải pháp chặn tuyệt đối kích thước document trong ván dài vô hạn.

Harness HTTP cũ được sửa để thất bại ngay khi điều kiện nền sai, có ngân sách thời gian/số request, chỉ chạy localhost và không coi WRONG_PHASE là kết quả thành công của happy path.

## Vòng 2: bí mật, lượt và kế thừa

- Chặn việc projection làm thay đổi state (từng xảy ra do khởi tạo extraPlayer trong hàm đọc).
- Giữ bước hiện tại trong lịch sau khi dùng kỹ năng một lần, tránh mất bước Priest/P.I. và lỗi WRONG_PHASE.
- Đồng bộ tính hợp lệ mục tiêu của Minion với Sói chiêm bao đang ngủ; không để bầy kẹt khi phải chốt cùng mục tiêu.
- Vampire đợi sau phán quyết cuối; giữ hiệu ứng ghim Hunter và Priest của đêm trước trong đợt chết chậm.
- Mummy không gửi danh tính người điều khiển trong self projection; quản trò vẫn có quan hệ để tính phiếu ngoài app.
- Hai Mason trong offline có hai kết quả riêng, mỗi kết quả đợi xác nhận và tồn tại qua reload.
- Frankenstein nhận kỹ năng sau công bố; dùng được nhiều lượt, giữ phe Dân, tài nguyên còn lại và trạng thái đã dùng. Không nạp lại Priest đã tiêu.

## Vòng 3: kết thúc và thao tác quản trò

- Lone Wolf có kết quả riêng và danh sách thắng chính xác, không cho cả bầy chết trước đó thắng cùng.
- Cult chỉ công nhận trưởng giáo thắng theo thẻ, không tự thêm người bị tuyển vào danh sách thắng.
- Rút người không thỏa Tanner/Hoodlum/Mary và không cấp kỹ năng cho Frankenstein.
- Không cho xóa phiếu Sói đã thống nhất bằng nút quá giờ; nút/lệnh chỉ có khi Bogeyman sống.
- Hình phạt hội thoại có xác nhận quản trò, ghi nhật ký và thi hành ở đêm. Không tự nghe hoặc xác minh lời nói.
- Hai vòng hoàn chỉnh không tiến bộ có thể hòa khi phe thứ ba/Lone bị kẹt. Đã thử Chupacabra với Prince được Priest ban bất tử.

## Bằng chứng

| Kiểm tra | Kết quả | Log |
|---|---|---|
| Toàn bộ Node tests | **263/263**, 0 fail, Node 26.5.0 | v14-node-tests.txt |
| Mô phỏng | 100 ván 27 vai nền + 100 bàn v14 trộn vai; kiểm retry, state bất biến và không lộ kết quả resolve | nằm trong Node tests |
| Dữ liệu nguồn | **8/8**, không đổi cards.json/HTML nguồn | v14-data-tests.txt |
| Typecheck/build | Đạt; build không chứa công cụ debug | v14-build.txt, v14-boundaries-followup.txt |
| HTTP audit nhiều danh tính | **40 kiểm tra đạt**, chạy kho local riêng | v14-http-audit.txt |
| OpenAPI syntax lint | No issues found. Governance lint cần đăng nhập nên không được xác nhận | v14-spec-lint.txt |
| Postman v14 | **4 requests / 8 assertions / 0 failed** | v14-postman.txt |
| Postman Hunter modes trên v14 | **46 requests / 50 assertions / 0 failed** | v14-hunter-postman.txt |
| Ảnh offline | Đủ 64 ảnh, build service worker cache đủ 64 ảnh + shell | v14-browser.json |

## Trình duyệt

Chrome, viewport mô phỏng 390×844; không thay thế thử điện thoại vật lý.

- Bàn offline hai Mason: xác nhận kết quả người thứ nhất, vẫn ở cùng bước cho người thứ hai; sau xác nhận người thứ hai sang Nostradamus với form dự đoán.
- Bàn 6 người: chọn cắn qua avatar, sang Vampire chọn qua avatar, sang Ghost nhập một từ. Tắt mạng rồi gửi và duyệt gợi ý thành công. Không tràn ngang ở các bước đã kiểm.
- Bản build preview: cache đủ 64 ảnh; tải lại khi network fetch bị chặn vẫn mở shell, tạo được bàn offline và lưu trên thiết bị. Không chỉ thử dev server.

## Giới hạn còn phải nói rõ

Không chứng minh mọi tổ hợp của 64 vai đều đúng, không có ba reviewer độc lập ở lượt tiếp quản này, chưa thử nhóm điện thoại vật lý hoặc v14 trên Vercel/Supabase thật. Luật xung đột/thiếu chi tiết được chốt tại role-contracts-v14.md, gồm pool Drunk, thừa kế Frankenstein, quy trách nhiệm Bloody Mary và ưu tiên thắng riêng. Phiếu và vi phạm hội thoại vẫn do quản trò xử lý như phạm vi sản phẩm đã chọn. Document/event/receipt vẫn tăng theo độ dài ván; giữ nguyên receipt để không đánh đổi tính đúng của gửi lại.
