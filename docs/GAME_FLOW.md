# Luồng ván và quyền xem

> Cập nhật 2026-10-25: dùng một bộ luật hardcode, không có cấu hình biến thể trên giao diện. Xem [DEFAULT_RULES.md](DEFAULT_RULES.md), [ENGINE_GUIDE.md](ENGINE_GUIDE.md) và [STATUS.md](STATUS.md) cho hành vi/trạng thái đã triển khai. Các đoạn chọn bộ luật bên dưới là thiết kế ban đầu, chỉ còn áp dụng như phiên bản luật nội bộ. Hướng hạ tầng hiện là Vercel + Supabase; lõi TypeScript.
Đây là thiết kế đề xuất để hiện thực yêu cầu; các biến thể luật phải được cấu hình và chốt trước ván.

## 1. Vào phòng và chuẩn bị

Quản trò tạo phòng, chia sẻ mã/link/QR. Người chơi chọn tên, được gắn danh tính phiên riêng; quản trò kiểm tra danh sách. Chọn vai được hỗ trợ, dùng luật hardcode có version và kiểm tra đủ số lá. Có bước sẵn sàng. Không để trùng tên gây nhầm mục tiêu. Đây là luồng online dự kiến, chưa triển khai.

## 2. Chia vai

Máy chủ chia và lưu kết quả một lần. Mỗi người chỉ nhận vai, mô tả và thông tin được phép. Retry/tải lại không chia lại. Xác nhận đã nhận vai tách biệt với xác nhận thức dậy ban đêm. Chia lại là thao tác đặc biệt có xác nhận của quản trò.

## 3. Một lượt gọi ban đêm

1. Mở bước gọi theo lịch của bộ luật; app hiển thị câu thoại kịch bản để quản trò đọc to (không phát file âm thanh).
2. Người thuộc lượt xác nhận đã thức dậy trên điện thoại.
3. Hiển thị kỹ năng và mục tiêu hợp lệ của vai.
4. Chọn rồi xác nhận; máy chủ trả biên nhận đã ghi nhận.
5. Trả kết quả riêng đúng thời điểm luật cho phép; không trả kết quả phụ thuộc hành động chưa hoàn tất.
6. Xác nhận hoàn tất, quản trò đọc lời cho vai đi ngủ, chuyển bước theo chế độ điều phối.

Quản trò nhìn thấy: chưa xác nhận, đang chọn, đã gửi, hoàn tất, mất kết nối. Chờ lâu thì nhắc quản trò; không tự coi là bỏ lượt. Với bầy Sói cần một quy tắc thống nhất mục tiêu, chưa chốt là đồng thuận tuyệt đối hay cơ chế khác.

## 4. Tổng kết đêm

Xử lý hành động theo luật, tài nguyên và hiệu ứng dây chuyền. Bản riêng cho quản trò ghi nguyên nhân và phần còn cần quyết định. Hướng đề xuất: quản trò duyệt trước khi công bố. Nội dung công khai không tự bao gồm thủ phạm, nguyên nhân chết hoặc vai người chết.

## 5. Ban ngày

Công bố sáng → thảo luận → đề cử/vote → minh oan → phán quyết, với thứ tự chính xác tùy bộ luật được chọn. Có thể có nhiều người minh oan hoặc nhiều lượt biểu quyết. Mỗi bước có đồng hồ riêng đồng bộ bằng mốc thời gian máy chủ. Hết giờ báo hiệu; tự chuyển hay chờ quản trò là cấu hình cần chốt.

Kiểm tra quyền vote, câm, vắng mặt, trọng số phiếu, hòa và kỹ năng sau treo cổ. Kết thúc ngày chỉ khi các hiệu ứng phát sinh đã được giải quyết.

## 6. Kết thúc

Xét điều kiện thắng tại các mốc luật cho phép, gồm phe/điều kiện đặc biệt. Không kết thúc giữa chuỗi hiệu ứng chưa xử lý xong. Xác nhận/can thiệp của quản trò theo chính sách sẽ chọn. Mở lịch sử bí mật sau ván theo cấu hình.

## Phạm vi thông tin

| Dữ liệu | Người chơi | Quản trò |
|---|---|---|
| Giai đoạn, deadline công khai, trạng thái được công bố | Tất cả | Có |
| Vai và mô tả riêng | Chính người đó | Có |
| Kết quả soi | Đúng người nhận theo luật | Có |
| Thông tin bầy và mục tiêu chung | Chỉ thành viên được phép | Có |
| Mục tiêu đêm, bí mật chưa công bố | Không, trừ quyền riêng | Có |
| Kết quả đang chờ công bố | Chưa nhận | Có |

## Ngoại lệ cần hỗ trợ

Rớt mạng, gửi trùng, tải lại, đến muộn, đổi thiết bị, quản trò mất kết nối, mất âm thanh, người rời ván và sửa hành động. Việc khôi phục không được tiết lộ vai cho người chỉ biết mã phòng. Thao tác sửa sau khi thông tin đã lộ phải cảnh báo giới hạn hoàn tác.

## Trình bày cập nhật — 2026-10-26 (D48–D50)

- Trang đầu chọn tab Tạo phòng hoặc Vào phòng; hỗ trợ Enter gửi form.
- Lobby quản trò: mã phòng và công cụ sao chép, Làm mới, Vai, Cài đặt ở thanh trên; bàn chơi ở vùng chính. Bộ vai hiện tóm tắt và số thẻ/người; bấm bút để chỉnh, Gợi ý nằm trong pop-up. Bắt đầu chỉ bật khi đủ ít nhất 3 người và đúng số thẻ.
- Trong ván: vùng hành động riêng cạnh bàn trên desktop, phía trên bàn trên mobile. Khi chọn hành động/chat, bàn thu gọn để nhường chỗ; vai cá nhân, tin riêng, diễn biến/sổ tay mở khi bấm. Pop-up giữ focus và trở lại nút mở khi đóng.
- Sau công bố sáng, X đỏ ở những người trong morning công khai mới nhất; người chết từ trước mờ. Giữ dấu này đến lần công bố sáng kế tiếp (kể cả trong đêm đang diễn ra); không dựa vào kết quả còn bí mật. Sáng không ai chết thì không còn X.

## Trước đêm đầu — D52–D54 (2026-10-26)

1. Quản trò chỉnh bộ vai và bấm Lưu bộ vai; mọi máy xem đúng các vai/số lượng đó qua nút Vai. Chỉnh sửa chưa lưu là bản nháp, không chia bài được.
2. Quản trò bấm Chia vai: tạo ván, chia bí mật nhưng chưa cho chạy hành động đêm.
3. Mỗi người đọc ảnh/mô tả nguyên văn cards.json và bấm Tôi đã đọc và sẵn sàng. Tab quản trò làm sáng ghế người đó và cập nhật Sẵn sàng x/y.
4. Khi đủ y/y, quản trò bấm Bắt đầu. Máy chủ kiểm mọi người đã xác nhận và đúng revision rồi mới mở bước đầu tiên. Phiên cũ có ván đang chơi tiếp tục luật/schema Game cũ, không bị bắt về bước đọc vai.

## Đổi máy và dùng chung máy — D55–D58

- Đổi máy ở chế độ thường: Vào phòng → mã phòng + tên cũ → tiếp tục cùng người/vai; máy cũ không còn quyền. Quản trò cũng có thể tiếp tục theo tên quản trò.
- Lobby quản trò: Thêm người → nhập tên người không có điện thoại. Người đó tham gia ghế và bộ vai như mọi người.
- Sau Chia vai: mục Dùng máy quản trò liệt kê các người chưa xem vai. Mở một người → chỉ hiện vai/người đó → xác nhận → đóng và trở về quản trò. Lặp cho người tiếp theo; người online tự xác nhận trên máy riêng.
- Trong đêm: người dùng chung máy được gọi tự mở player form trên máy quản trò. Quản trò bấm thức/chọn/gửi theo cử chỉ của người chơi; gửi xong về bảng quản trò. Nếu quay về thủ công thì không tự mở lại cùng bước, có thể chọn người đó trong danh sách để tiếp tục/sửa. Người online không bị điều khiển qua proxy.
- Debug: rời tab quản trò xóa phòng trong RAM sau grace 2 giây. Reload nhanh hủy đóng; mất tín hiệu thoát có lease 90 giây. Chế độ thường giữ phòng theo thời hạn cũ.
- Chi tiết thẻ: X trở lại danh sách, X ở danh sách đóng pop-up.

## Quản lý bằng avatar — D59

Bấm (không kéo) avatar ở máy quản trò để mở menu cạnh ghế. Chọn Chuyển sang offline khi máy người đó hết pin; máy cũ bị ngắt, người đó giữ vai/ready/lựa chọn hiện tại và vào luồng thao tác thay. Người đã offline có tùy chọn này vô hiệu.

Chọn Rời khỏi trò chơi → xác nhận ngay trong pop-up. Trước chia xóa ghế; sau chia giữ ghế mờ có chữ Đã rời, không đưa vào lượt/target/quorum và không cho tiếp tục phiên cũ. Chỉ rút người đó, không chạy hiệu ứng chết; nếu người cuối của một phe rút thì xét kết thúc theo người còn lại, chờ công bố nếu còn đêm đã xử lý chưa công khai. Kéo avatar vẫn xếp ghế trong lobby và không bật menu.

## Bổ sung ngày 2026-10-26 — D60

- Diễn biến: Đêm N: [tên] đã chết; Sáng N: [tên] bị vote chết; không có người chết ghi Không có ai chết.
- Tiên tri xem kết quả trong popup lớn: Sói nền đỏ, không phải Sói nền xanh; bấm Đã rõ, kể cả khi dùng máy quản trò.
- Cài đặt trước chia vai: tổng số ngày được không loại ai, 0–30 (mặc định 0). Mỗi phán quyết trống trừ một lượt; hết lượt phải chọn người. Giữ ngoại lệ vai Hoàng tử. Ván cũ giữ luật cũ; ván mới v12/schema7. Phiếu vẫn ngoài app.

## Bàn một máy, không có Internet (D61)

Tạo phòng → chọn Offline → Tạo bàn → Thêm người offline → chọn/Lưu bộ vai → Cài đặt (tối giản mặc định bật) → Chia vai. Quản trò có thể đưa máy lần lượt xem vai hoặc bắt đầu ngay, không chờ ready từng máy.

Ban đêm tối giản: mỗi vai có form chọn và một nút Xác nhận, tự sang vai tiếp. Tiên tri dừng ở kết quả tới Đã rõ · Vai tiếp. Bầy Sói chỉ có một form chung cho các Sói thực sự đang được hành động; vẫn tuân theo Sói ngủ, bệnh bầy, kỹ năng cắn đặc biệt. Vai vắng tự bỏ qua; tới review tự tổng kết, quản trò bấm công bố. Ngày và phản ứng Thợ săn giữ quy trình luật cũ. Tắt tối giản thì giữ luồng thao tác từng người bằng máy quản trò.

Tải lại `?local=...` giữ nguyên bước, hành động và kết quả chờ; trang đầu có Tiếp tục bàn đã lưu trên máy. Mở bản build một lần có mạng để trình duyệt tải và lưu sẵn app. Không xóa dữ liệu trình duyệt nếu còn cần bản lưu.

## Thợ săn v13 và chọn avatar (2026-10-27)

Ván mới classic-core-v13/schema8. Cài đặt Thợ săn bắn chủ động mặc định tắt. Bị động: gọi sau Bảo vệ mỗi đêm để ghim người; chết đêm kéo người ghim đêm đó chết theo, chết sáng không bắn. Chủ động: giữ hoặc dùng một phát cả ván; trúng phe Sói thì sống, sai thì cả hai chết. Tổng kết chuỗi chết trước công bố và xét thắng. Ván cũ giữ luật cũ, không cần SQL migration.

Lượt đêm chọn mục tiêu bằng avatar. Với nhiều mục tiêu hoặc thuốc, chọn ô mục tiêu rồi bấm avatar; Xác nhận mới gửi. Viền vàng là mục tiêu, viền đỏ là đồng đội trong pack projection khi Sói thức. Chuyển offline chỉ đổi thiết bị điều khiển, không đổi trạng thái sống; chưa sẵn sàng dùng dấu check, không giảm sáng.
