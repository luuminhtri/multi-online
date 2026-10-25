# Xử lý luật và kỹ năng

> Cập nhật 2026-10-25: dùng một bộ luật hardcode, không có cấu hình biến thể trên giao diện. Xem [DEFAULT_RULES.md](DEFAULT_RULES.md), [ENGINE_GUIDE.md](ENGINE_GUIDE.md) và [STATUS.md](STATUS.md) cho hành vi/trạng thái đã triển khai. Các đoạn chọn bộ luật bên dưới là thiết kế ban đầu, chỉ còn áp dụng như phiên bản luật nội bộ. Hướng hạ tầng hiện là Vercel + Supabase; lõi TypeScript.
## Mục tiêu

Từ bộ luật đã chốt, trạng thái và hành động hợp lệ, tính ra diễn biến có thể giải thích và kiểm thử. Văn bản trong cards.json là nguồn tham khảo, không tự chuyển thành điều kiện code mà chưa rà soát.

## Hợp đồng đề xuất

Đầu vào: snapshot game, ruleset có version, bước hiện tại, hành động đã được xác nhận. Đầu ra: sự kiện, trạng thái mới, thông tin riêng/công khai, hành động phát sinh và vấn đề cần quản trò quyết định.

Cùng đầu vào phải cho cùng kết quả; nếu cần ngẫu nhiên phải dùng nguồn ngẫu nhiên được lưu để tái hiện. Không gọi AI để tự quyết một luật chưa chốt trong lúc chơi.

## Chu trình

Kiểm tra hành động → tiêu hao tài nguyên theo quy tắc → áp dụng thứ tự/ưu tiên hiệu ứng → xử lý dây chuyền đến khi ổn định → xét điều kiện thắng tại mốc phù hợp → chuẩn bị thông tin cho từng người → công bố theo quyền.

Thứ tự cụ thể phải đến từ ruleset, không áp đặt một thứ tự duy nhất cho mọi biến thể. Gọi vai và thời điểm giải quyết hiệu ứng có thể khác nhau.

## Những điều phải mô hình hóa

- Điều kiện dùng: đêm đầu, mỗi đêm, một lần, sau chết, đang bị vô hiệu hóa.
- Mục tiêu: bản thân, người sống/chết, vị trí ngồi, mục tiêu đêm trước, số mục tiêu.
- Tài nguyên: thuốc, lượt dùng, số mạng; khi nào tiêu hao nếu bị chặn.
- Hiệu ứng: bảo vệ, câm, đổi phe/vai, liên kết, chết trễ, thay đổi quyền vote.
- Kết quả soi không đồng nhất với phe thật.
- Chuỗi chết và phản ứng sau chết; tránh lặp vô hạn.
- Điều kiện thắng riêng, đồng thắng hoặc ưu tiên; không coi mọi vai thứ ba cùng chung chiến thắng.

## Giải thích và can thiệp

Mỗi kết quả ghi rõ nguyên nhân, hành động và điều khoản luật liên quan. Tách lý do riêng của quản trò khỏi thông báo công khai. Sửa/hoàn tác tạo dấu vết, không âm thầm xóa lịch sử. Thay đổi sau khi đã công bố thông tin cần cảnh báo và xử lý có chủ đích.

## Bộ test cần có khi triển khai

Mỗi vai: trường hợp thường, mục tiêu không hợp lệ, hết tài nguyên, bỏ lượt, mất kết nối. Mỗi tương tác: kết quả và nguyên nhân mong đợi, tài nguyên và thông tin được tiết lộ.

Tình huống ưu tiên: cắn + bảo vệ; cứu + độc; soi người có kết quả khác phe; chết + liên kết; Sói con và đêm tiếp theo; chết trễ; đổi phe; miễn treo; hòa phiếu; phản ứng sau chết ảnh hưởng điều kiện thắng. Kết quả từng tình huống chỉ được viết sau khi chốt biến thể tương ứng.

## Phạm vi đầu tiên

Chưa chọn bộ vai MVP. Đề xuất bắt đầu một tập vai nhỏ với tương tác đã xác định, rồi mở rộng. Không mặc định toàn bộ 57 mục nguồn là 57 vai sẵn sàng chơi.
