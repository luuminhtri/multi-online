# Mục tiêu và yêu cầu sản phẩm

> Tiếp nhận 2026-10-25: code có 9 vai theo classic-core-v4, chưa nghiệm thu đầy đủ tương tác. Bộ 5 vai và luật nền không còn là câu hỏi chưa chọn; âm thanh thu sẵn/TTS đã được bỏ theo D18. Các câu hỏi về giới hạn phòng, danh tính và vote/timer vẫn cần thiết kế. Xem STATUS.md.

> Cập nhật 2026-10-25: dùng một bộ luật có version. Ngoại lệ mới theo yêu cầu người dùng ở v9: quản trò bật/tắt Phù thủy thấy nạn nhân trước khi chia vai. Khi tắt, Phù thủy chỉ dùng/giữ thuốc, máy chủ cứu không lộ tên. Người được Bảo vệ chặn cắn không được báo cho Phù thủy. Xem [DEFAULT_RULES.md](DEFAULT_RULES.md), [ENGINE_GUIDE.md](ENGINE_GUIDE.md) và [STATUS.md](STATUS.md). Hướng hạ tầng hiện là Vercel + Supabase; lõi TypeScript.
## Mục tiêu

Giảm tối đa gánh nặng quản trò khi chơi trực tiếp: app nhớ trạng thái, thu hành động bí mật, xử lý tương tác và giữ nhịp; quản trò dẫn chuyện, nhắc người chơi và xử lý ngoại lệ.

## Yêu cầu đã thống nhất

| ID | Yêu cầu | Kết quả mong muốn |
|---|---|---|
| F01 | Phòng nhiều điện thoại | Quản trò chia bài một lần; mỗi người nhận đúng vai và mô tả trên máy mình |
| F02 | Thông tin chung trên mọi máy | Xem ngày/vòng, người sống/chết, công bố và đồng hồ; không cần máy chiếu |
| F03 | Lời thoại gọi vai cho quản trò đọc và xác nhận thức dậy | App hiển thị câu thoại gợi ý cho quản trò đọc to; người được gọi xác nhận trên điện thoại, làm chức năng; quản trò thấy ai chưa dậy/chưa xong để nhắc (đã bỏ âm thanh máy để nhẹ và tránh tải nhiều) |
| F04 | Xử lý diễn biến đêm | Tính tương tác kỹ năng theo bộ luật, cập nhật trạng thái và giúp quản trò hiểu kết quả |
| F05 | Điều phối ban ngày | Có thời gian riêng cho thảo luận, vote, minh oan; quản trò điều phối |

Phòng bằng mã/QR là hướng vào phòng đã thảo luận. Vote trên điện thoại và cách hiển thị kết quả cần chi tiết hóa trước triển khai.

## Nhu cầu hỗ trợ được chấp nhận về định hướng

Khôi phục kết nối, quản trò can thiệp/hoàn tác, chốt bộ luật trước ván, thống nhất mục tiêu bầy Sói, chế độ đêm hạn chế lộ vai, xác nhận gửi hành động và xem lại sau ván. Người dùng đồng ý phạm vi bổ sung này ở mức ý tưởng; chính sách và giao diện chi tiết chưa chốt.

## Không thuộc phạm vi hiện tại

- Offline, hotspot, máy chủ nội bộ và native app.
- Thay đối thoại trực tiếp bằng voice/chat online toàn phần.
- Máy chiếu bắt buộc; màn hình phụ chỉ là mở rộng tương lai.
- Bật mọi vai cùng lúc khi chưa định nghĩa và kiểm thử luật; mục tiêu dài hạn hiện là phủ toàn bộ vai trong cards.json theo từng mốc.
- Tiếp tục mở rộng app cũ hoặc sao chép mã của Soi Má.

## Nguyên tắc trải nghiệm

Thông tin có ba phạm vi: công khai, riêng người chơi/nhóm được phép, toàn bộ cho quản trò. Ban đêm chỉ mở tương tác hợp lệ. Quản trò được tạm dừng và giải quyết ngoại lệ. Tự động hóa phải giải thích được; không tự đoán luật chưa xác định.

## Chưa chốt

Bộ vai đầu tiên; số người tối thiểu/tối đa; đăng nhập hay khách; cơ chế nhận lại danh tính; phiếu kín/công khai; thứ tự vote/minh oan; điều kiện thắng; vai có được công khai sau chết; thời gian mặc định; âm thanh thu sẵn hay TTS; mức tự chuyển bước.

## Yêu cầu tiếp theo đã ghi nhận — chưa triển khai

Ngày 2026-10-25: người dùng muốn nhập số người, hiển thị vòng tròn chỗ ngồi và nhập tên vào từng ghế. Người dùng yêu cầu để sau; ưu tiên hiện tại là giao diện tạm để test lõi. Không thay thế yêu cầu này bằng danh sách ghế cố định của sandbox.


## Mục tiêu ưu tiên mới — phủ toàn bộ vai nguồn

Người dùng yêu cầu tiếp tục hoàn thiện core cho toàn bộ role trong data. Ưu tiên lõi luật, UI chỉ phục vụ thử và kiểm chứng. Phạm vi dài hạn bao gồm các bản mở rộng, vai gộp trong mô tả và vai không có kỹ năng tự động hoàn toàn nhưng cần quản trò xác nhận hành vi.

Giữ nguyên cards.json, lập catalog có truy vết và bảng phủ ở ROLE_COVERAGE.md. Không biến mục nguồn lỗi/gộp thành vai đã chạy; các mặc định khác nguồn phải ghi rõ trong DEFAULT_RULES. Online/UI không được ưu tiên trước mục tiêu core này trừ khi cần kiểm chứng. Trạng thái mới thay các ghi nhận hiện trạng cũ ở đầu tài liệu: hiện 19 vai, classic-core-v6; xem STATUS.md.


## Tiến độ core v7

Hiện 22/64 vai nguồn có core và test. Bầy nhiều mục tiêu, Sói con (cả hy sinh), Sói đại ca và Alpha đã triển khai theo DEFAULT_RULES.md. Schema ván 2; snapshot cũ phải tạo lại. Không thay yêu cầu ưu tiên phủ toàn bộ vai; mốc này không triển khai online/UI sản phẩm.


## Tiến độ core v8

27/64 vai đã có core/test: thêm liên kết một chiều và Sói ngủ theo điều kiện. Giữ kín vai gồm cả danh sách mục tiêu/phiếu và bộ nhớ bầy; không chỉ ẩn thông tin trên UI. Virginia dùng phe Dân theo mặc định riêng đã ghi trong DEFAULT_RULES; chưa có kết luận từ mô tả nguồn về phe. Còn 37 vai nguồn, không mở rộng thêm danh mục.

## Yêu cầu giao diện — 2026-10-25 (người dùng chốt)

| ID | Yêu cầu | Ghi chú |
|---|---|---|
| F06 | Giao diện tối, hiện đại, đơn giản; chữ to, ít chữ, rõ ràng; điện thoại là chính | Đã áp dụng cho trang phòng |
| F07 | Nhận vai xong phải ẩn ngay để tránh người khác nhìn; lần đầu nhận vai có thời gian đọc và nút "Tôi đã đọc và sẵn sàng" | Overlay lần đầu mỗi ván mỗi tab; sau đó vai luôn ẩn sau nút xem |
| F08 | Tận dụng ảnh thẻ trong cards.json | Sinh tự động từ dữ liệu nguồn qua script; ảnh nằm trên máy chủ nguồn, UI có phương án dự phòng khi không tải được |
| F09 | Trước và trong khi chơi luôn có mục xem tất cả vai | Mục gập riêng ở lobby và trong ván |
| F10 | Thông tin mở theo mục, không dồn một màn hình; mặc định chỉ sống/chết từng người dạng bàn tròn: sống sáng, chết mờ | Các phần còn lại đặt trong mục gập |
| F11 | Quản trò kéo thả xếp chỗ trước khi chia vai, giống ngoài đời thật | Vòng ghế liên quan bom, Sói đại ca và các vai ghế; có nút ↑↓ dự phòng |
