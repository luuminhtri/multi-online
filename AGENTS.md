# Quy ước làm việc trong multi-online

## Trước khi làm

Đọc README.md, docs/STATUS.md, docs/DECISIONS.md và tài liệu liên quan đến nhiệm vụ. Workspace này là app mới, không tự đưa kiến trúc hoặc logic app cũ vào đây. Không sửa hoặc xóa app cha nếu không có yêu cầu.

## Phạm vi và quyết định

- Dùng tiếng Việt cho tài liệu sản phẩm và thông báo cho người dùng.
- Yêu cầu đã chốt nằm trong PRODUCT.md. Đề xuất kỹ thuật không tự trở thành quyết định.
- Hướng đã chọn: Vercel + Supabase; lõi TypeScript độc lập. Luật có version (hiện classic-core-v10) trong DEFAULT_RULES.md. Ngoại lệ người dùng yêu cầu: quản trò chọn Phù thủy có thấy nạn nhân trước ván; chat đêm cho cùng phe (hiện bầy Sói); không mở rộng form biến thể khác. Không dựng đồng thời nhiều stack.
- Không mở rộng offline, native app hoặc game chơi từ xa thay cho nhu cầu chơi trực tiếp hiện tại.
- Không ghi secret, token, dữ liệu ván thật hoặc thông tin bí mật của người chơi vào tài liệu/log công khai.

## Dữ liệu và luật

- Giữ cards.json làm dữ liệu nguồn; không sửa hàng loạt hoặc ghi đè bằng dữ liệu chuẩn hóa nếu chưa có yêu cầu.
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
