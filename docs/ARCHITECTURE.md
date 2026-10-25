# Kiến trúc định hướng

> Tiếp nhận 2026-10-25: hướng stack đã chọn là Vercel + Supabase, lõi TypeScript và sandbox Vite + TypeScript DOM. Các câu “chưa chọn công nghệ/backend” bên dưới là ghi chép thiết kế cũ. Backend online chưa triển khai. D18 đã bỏ âm thanh từ app và Storage âm thanh, thay bằng lời đọc trên màn hình cho quản trò. Xem STATUS.md và DECISIONS.md cho hiện trạng ưu tiên.

> Cập nhật 2026-10-25: dùng một bộ luật hardcode, không có cấu hình biến thể trên giao diện. Xem [DEFAULT_RULES.md](DEFAULT_RULES.md), [ENGINE_GUIDE.md](ENGINE_GUIDE.md) và [STATUS.md](STATUS.md) cho hành vi/trạng thái đã triển khai. Các đoạn chọn bộ luật bên dưới là thiết kế ban đầu, chỉ còn áp dụng như phiên bản luật nội bộ. Hướng hạ tầng hiện là Vercel + Supabase; lõi TypeScript.
Chưa chọn công nghệ. Nội dung này là các ràng buộc và thiết kế đề xuất, không phải mô tả hệ thống đã chạy.

## Thành phần

- Web người chơi: thông tin chung, vai riêng, kỹ năng, vote, trạng thái kết nối.
- Web quản trò: thiết lập, toàn cảnh ván, tiến độ từng người, âm thanh và can thiệp.
- Dịch vụ máy chủ có thẩm quyền: danh tính, phân quyền, trạng thái phòng, xử lý lệnh, luật và công bố.
- Lưu trữ bền vững: phòng, ván, hành động, sự kiện, phiên bản luật và checkpoint.
- Kênh realtime: gửi cập nhật đúng phạm vi, khôi phục sau reconnect.

Frontend có thể deploy trên Vercel theo mục tiêu ban đầu. Chưa quyết định backend/realtime và chưa giả định một serverless function giữ kết nối hoặc trạng thái ván lâu dài.

## Các nguyên tắc bắt buộc

1. Máy chủ xác nhận mọi lệnh và tính kết quả. Client không được tự quyết vai/phe, thắng/thua hoặc quyền thao tác.
2. Phân quyền ngay ở dữ liệu trả về và kênh subscription. Không broadcast bí mật rồi ẩn bằng CSS.
3. Mỗi lệnh mang ID chống trùng, người gửi, ván và bước/version tương ứng. Từ chối lệnh cũ hoặc sai bước; retry trả lại kết quả cũ.
4. Chuyển trạng thái quan trọng phải nguyên tử; xử lý đồng thời không tạo hai kết quả đêm/vote.
5. Deadline dựa trên thời gian máy chủ. Client chỉ hiển thị; đồng hồ UI không quyết định kết quả.
6. Reconnect lấy snapshot được phân quyền và các sự kiện còn thiếu. Không dựa vào trạng thái bộ nhớ của một điện thoại.
7. Lưu snapshot bộ luật và catalog version khi bắt đầu ván; cập nhật dữ liệu thẻ không đổi luật giữa ván.

## Mô hình dữ liệu đề xuất

Room, Participant/Session, Game, Seat, RoleDefinition, Ruleset, PhaseStep, Action, Effect, Resource, Event, PublicAnnouncement, Timer.

Tách vai gốc, vai hiện tại, phe hiện tại, kết quả khi soi, kỹ năng và hiệu ứng. Các giá trị này không mặc định giống nhau. Người đã chết vẫn có thể có quyền hành động do kỹ năng.

## Tổ chức mã dự kiến

Tách UI, giao thức, xử lý phòng, luật thuần và dữ liệu catalog. Luật thuần không phụ thuộc UI hoặc database để có thể chạy test tình huống. Chỉ tạo cấu trúc thư mục cụ thể sau khi chốt stack.

## Cần quyết định trước triển khai

Stack; hosting backend; cơ chế realtime; database; danh tính khách/tài khoản; khôi phục quyền quản trò; giới hạn phòng; chi phí mục tiêu; chính sách lưu/xóa dữ liệu; cách phân phối âm thanh và xử lý khi trình duyệt chưa cho phát.

## Kiểm chứng kỹ thuật đầu tiên

Một quản trò và ít nhất ba client độc lập: vào phòng, nhận dữ liệu khác nhau theo quyền, gửi hành động, ngắt/kết nối lại, gửi trùng và khôi phục trạng thái. Không chấp nhận demo nhiều tab dùng chung toàn bộ state làm bằng chứng phân quyền.
