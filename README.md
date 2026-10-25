# Ma Sói nhiều thiết bị — multi-online

Ứng dụng web mới hỗ trợ nhóm ngồi chơi Ma Sói cùng nhau: mỗi người dùng điện thoại riêng, quản trò điều phối, hệ thống chia vai bí mật, nhận hành động và xử lý diễn biến theo luật.

**Workspace độc lập:** mọi mã nguồn và tài liệu mới nằm trong `multi-online/`. App cũ ở thư mục cha không phải nền để tiếp tục phát triển. Chưa xóa app cũ.

## Đọc từ đâu?

| Tài liệu | Nội dung |
|---|---|
| [AGENTS.md](AGENTS.md) | Quy ước làm việc cho người và agent |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Mục tiêu, tính năng đã thống nhất, giới hạn phạm vi |
| [docs/GAME_FLOW.md](docs/GAME_FLOW.md) | Luồng phòng, đêm, ngày, thông tin và quyền thao tác |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Nguyên tắc kỹ thuật và các lựa chọn chưa chốt |
| [docs/CARD_DATA.md](docs/CARD_DATA.md) | Cấu trúc dữ liệu thẻ, lỗi đã thấy, cách chuẩn hóa |
| [docs/RULE_ENGINE.md](docs/RULE_ENGINE.md) | Thiết kế xử lý kỹ năng và kiểm thử luật |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Các mốc triển khai và điều kiện hoàn thành |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Quyết định, đề xuất, vấn đề cần chốt |
| [docs/STATUS.md](docs/STATUS.md) | Trạng thái bàn giao cho phiên làm việc tiếp theo |

## Hiện trạng và chạy thử

Lõi TypeScript hiện có **27 vai**, luật `classic-core-v10` (tùy chọn Phù thủy, chat bầy đêm). Dữ liệu nguồn gồm **64 vai riêng trong 9 nhóm**, catalog `source-map-v2` ánh xạ 1–1. Theo hướng mới của người dùng, 37 vai còn lại có thể bổ sung sau; ưu tiên hiện tại là luồng phòng và độ tin cậy online. Đã có bản local để phát triển, chưa xác minh cloud. Xem [STATUS.md](docs/STATUS.md), [kết nối online](docs/ONLINE_SETUP.md) và [ROADMAP.md](docs/ROADMAP.md).

```sh
cd multi-online
npm ci
npm run typecheck
npm test
npm run test:data  # Python 3, không cần dependency bên ngoài
npm run demo
npm run dev  # mở địa chỉ localhost in trong terminal
```

Cần Node.js >= 22.18. Đọc [hướng dẫn lõi](docs/ENGINE_GUIDE.md) để vừa chạy vừa học, và [luật hardcode](docs/DEFAULT_RULES.md) để biết chính xác cách xử lý.

Hướng hạ tầng: Vercel + Supabase. Adapter và migration đã được chuẩn bị; chưa có project để kiểm chứng kết nối thực tế. `npm run dev:online` chạy bản phát triển ở cổng 5174 với lưu trữ local. Đã bỏ âm thanh phát từ app; quản trò đọc lời thoại.

Dữ liệu thẻ: [cards.json](cards.json), trích từ bản HTML lưu tại [response.html](response.html). Đã sửa lỗi bỏ/gộp vai và nhầm ảnh theo yêu cầu người dùng, có [báo cáo đối chiếu](docs/data-audit.json) và bản JSON trước sửa trong `data/backups/`. Không tải lại HTML khi kiểm tra. `python3 beauti.py --check` chỉ đọc; `--write` mới ghi và tạo backup. Các công cụ thu thập không thuộc runtime game.

## Nguyên tắc sản phẩm

- Chơi trực tiếp cùng địa điểm, dùng Internet để đồng bộ điện thoại.
- Không yêu cầu app native. Offline và mạng nội bộ được gác lại.
- Quản trò giữ quyền điều phối; hệ thống giảm việc ghi nhớ, ghi chép và tính luật.
- Thông tin công khai đến mọi người; bí mật chỉ đến đúng người được phép.
- Tham khảo trải nghiệm Soi Má Online, xây sản phẩm mới bằng mã của dự án.

## Cách duy trì tài liệu

Yêu cầu mới cập nhật PRODUCT; thay đổi luồng cập nhật GAME_FLOW; quyết định lớn ghi DECISIONS; cuối mỗi mốc cập nhật STATUS và ROADMAP. Ghi rõ điều gì đã chốt, điều gì chỉ là đề xuất. Không ghi chức năng chưa làm là đã có.

## Giao diện thử luật

Chạy `npm run dev`, mở `/sandbox.html` tại URL terminal hiển thị (thường http://127.0.0.1:5173/sandbox.html). Trang gốc hiện là giao diện phòng.

Ba bảng: quản trò, đóng vai người chơi, thông tin công khai; nhật ký giải thích ở bên dưới. Có ván mẫu 6 người, 7 người/2 Sói, 10 người/9 vai nền (mặc định) và 27 người/27 vai, mẫu 12 người cho bầy Sói và mẫu 15 người cho liên kết/ngủ. Các tên và vai mẫu cố định để thử ngay. Chọn người → thức dậy → hành động → quản trò chốt lượt → xử lý đêm → công bố sáng. Ban ngày có phán quyết thủ công để sang đêm tiếp.

Chỉ mô phỏng trên một trình duyệt, chưa lưu ván; tải lại trang bắt đầu lại. Không dùng sandbox để giữ bí mật cho ván thật. Nhập số người và vòng tròn ghế có tên đã ghi backlog, chưa làm.

`npm run build` kiểm tra kiểu và xuất cả giao diện phòng lẫn sandbox vào dist; `npm run preview` xem bundle tĩnh, không chạy API phòng.
