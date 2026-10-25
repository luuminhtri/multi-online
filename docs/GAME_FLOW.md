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
