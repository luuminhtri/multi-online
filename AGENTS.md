# Quy ước làm việc trong multi-online

## Trước khi làm

Đọc README.md, docs/STATUS.md, docs/DECISIONS.md và tài liệu liên quan đến nhiệm vụ. Workspace này là app mới, không tự đưa kiến trúc hoặc logic app cũ vào đây. Không sửa hoặc xóa app cha nếu không có yêu cầu.

## Phạm vi và quyết định

- Dùng tiếng Việt cho tài liệu sản phẩm và thông báo cho người dùng.
- Yêu cầu đã chốt nằm trong PRODUCT.md. Đề xuất kỹ thuật không tự trở thành quyết định.
- Hướng đã chọn: Vercel + Supabase; lõi TypeScript độc lập. Luật có version (hiện classic-core-v12) trong DEFAULT_RULES.md. Ngoại lệ người dùng yêu cầu: quản trò chọn Phù thủy có thấy nạn nhân trước ván; chat đêm cho cùng phe (hiện bầy Sói); đồng hồ 4 pha ban ngày do quản trò bấm; phiếu ngoài app; không mở rộng form biến thể khác. Không dựng đồng thời nhiều stack.
- Người không có điện thoại dùng chung máy quản trò qua player projection và lệnh proxy được máy chủ kiểm quyền (D57).
- Ngoại lệ mới D61 theo yêu cầu người dùng: hỗ trợ bàn một máy quản trò không có Internet, có chế độ thao tác tối giản và lưu trên thiết bị. Không mở rộng native app hoặc game chơi từ xa.
- Không ghi secret, token, dữ liệu ván thật hoặc thông tin bí mật của người chơi vào tài liệu/log công khai.

## Product, testing và debug

- Giao diện ưu tiên lọt trọn khung hình, đặc biệt trên điện thoại: ảnh thẻ phải lớn nhất có thể trong phần không gian còn lại của viewport, giữ đủ ảnh, ưu tiên ảnh hơn mô tả; nút đóng/quay lại luôn nhìn thấy. Nội dung dài mới cuộn trong vùng riêng.
- Giữ phân cấp thị giác: bàn chơi là vùng chính, công cụ phụ gọn trên thanh phòng, một hành động chính rõ ràng mỗi bước. Icon khó nhận diện phải có nhãn ngắn; không thay tất cả nút bằng icon.
- Không tự thêm slogan hoặc câu trang trí vào giao diện khi chưa được người dùng yêu cầu.
- Product chỉ có chức năng chơi thật; hướng dẫn thao tác và lời gọi vai vẫn thuộc sản phẩm.
- Công cụ thử nằm trong `src/debug/`, sandbox HTML trong `debug/`; chỉ `npm run debug` được bật. Không thêm entry debug vào build/deploy hoặc đưa công cụ thử vào giao diện product.
- Test tự động ở `tests/`, công cụ chạy thử riêng ở `scripts/`. Kiểm tra ranh giới dev/debug/build bằng `tests/product-boundaries.test.ts` khi đổi cấu hình.

## Dữ liệu và luật

- Giữ cards.json làm dữ liệu nguồn; không sửa hàng loạt hoặc ghi đè bằng dữ liệu chuẩn hóa nếu chưa có yêu cầu.
- Mô tả hiển thị vai phải nguyên văn Description của cards.json, không tự viết lại; chạy npm run gen:descriptions khi nguồn đổi. Luật thực thi ở engine vẫn độc lập.
- Không coi văn bản mô tả thẻ là luật thực thi đã xác minh. Không tự gộp biến thể mâu thuẫn.
- Dùng ID ổn định cho vai chuẩn hóa; tên hiển thị có thể thay đổi.
- Không bật tự động hóa cho vai chưa có luật và tương tác được kiểm thử.
- Khi thay schema dữ liệu lưu phải có version và kế hoạch migration.

## Đồng bộ và phân quyền

- Máy chủ xác thực và quyết định trạng thái ván. Không tin role, quyền, kết quả hoặc thời gian do client gửi.
- Không gửi toàn bộ bí mật xuống client rồi chỉ ẩn bằng giao diện.
- Hành động phải được kiểm tra người gửi, bước hiện tại và mục tiêu; retry không tạo hiệu ứng hai lần.
- Phân biệt bỏ lượt chủ động, chưa trả lời và mất kết nối.
- Sửa/hoàn tác phải có nhật ký. Thông tin đã tiết lộ không thể thu hồi về mặt nhận thức.

## Kiểm chứng và bàn giao

Kiểm tra luật bằng tình huống có kết quả mong đợi; kiểm tra nhiều client, phân quyền, reconnect và gửi trùng khi có phần triển khai tương ứng. Chạy kiểm tra phù hợp phạm vi thay đổi; báo rõ phần chưa kiểm được. Cuối mốc cập nhật STATUS.md: thay đổi, kiểm tra đã chạy, hạn chế và bước tiếp theo. Không tự deploy hoặc công bố sản phẩm khi chỉ được yêu cầu triển khai local.

<API_TASKS>
Before responding to any non-trivial API engineering task — designing, implementing, mocking, testing, monitoring, documenting, or deploying an API or Postman Flow — read `postman/skills/api-builder/SKILL.md` and follow it. It is the default entry point for API work in this repository. Pure questions and trivial one-line edits do not need it.
</API_TASKS>
