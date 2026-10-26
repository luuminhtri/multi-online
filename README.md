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

Lõi TypeScript hiện có **27 vai**, luật `classic-core-v12` (Phù thủy tùy chọn, chat bầy đêm, đồng hồ ban ngày, giới hạn ngày không loại ai). Dữ liệu nguồn gồm **64 vai riêng trong 9 nhóm**, catalog `source-map-v2` ánh xạ 1–1. Theo hướng mới của người dùng, 37 vai còn lại có thể bổ sung sau; ưu tiên hiện tại là luồng phòng và độ tin cậy online. Đã có bản local để phát triển, chưa xác minh cloud. Xem [STATUS.md](docs/STATUS.md), [kết nối online](docs/ONLINE_SETUP.md) và [ROADMAP.md](docs/ROADMAP.md).

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
- Không yêu cầu app native. Có chế độ một máy quản trò không cần Internet (D61); phòng nhiều máy vẫn dùng máy chủ để đồng bộ.
- Quản trò giữ quyền điều phối; hệ thống giảm việc ghi nhớ, ghi chép và tính luật.
- Thông tin công khai đến mọi người; bí mật chỉ đến đúng người được phép.
- Tham khảo trải nghiệm Soi Má Online, xây sản phẩm mới bằng mã của dự án.

## Cách duy trì tài liệu

Yêu cầu mới cập nhật PRODUCT; thay đổi luồng cập nhật GAME_FLOW; quyết định lớn ghi DECISIONS; cuối mỗi mốc cập nhật STATUS và ROADMAP. Ghi rõ điều gì đã chốt, điều gì chỉ là đề xuất. Không ghi chức năng chưa làm là đã có.

## Product, testing và debug

- Product: `npm run dev` hoặc `npm run dev:online` chỉ có giao diện phòng; không phục vụ sandbox hoặc mã nguồn debug.
- Testing tự động: `npm test`, `npm run test:data`, `npm run typecheck`; script `scripts/open-test-players.mjs` là công cụ chạy riêng, không thuộc bundle.
- Debug: `npm run debug`, mở `/debug/sandbox.html` tại cổng 5174 để thử luật. Trang gốc có công cụ nhiều người chơi trong một tab.

Mã thử nghiệm đặt riêng trong `src/debug/`, HTML sandbox trong `debug/`. Chỉ `vite serve --mode debug` bật công cụ; mọi build đều loại bỏ chúng, kể cả `vite build --mode debug`.

Ba bảng: quản trò, đóng vai người chơi, thông tin công khai; nhật ký giải thích ở bên dưới. Có ván mẫu 6 người, 7 người/2 Sói, 10 người/9 vai nền (mặc định) và 27 người/27 vai, mẫu 12 người cho bầy Sói và mẫu 15 người cho liên kết/ngủ. Các tên và vai mẫu cố định để thử ngay. Chọn người → thức dậy → hành động → quản trò chốt lượt → xử lý đêm → công bố sáng. Ban ngày có phán quyết thủ công để sang đêm tiếp.

Chỉ mô phỏng trên một trình duyệt, chưa lưu ván; tải lại trang bắt đầu lại. Không dùng sandbox để giữ bí mật cho ván thật. Nhập số người và vòng tròn ghế có tên đã ghi backlog, chưa làm.

Chế độ thử 2 tab chỉ có khi chạy `npm run debug`: một tab quản trò, một tab vào phòng và tick "Chế độ thử 1 tab" — tab đó điều khiển được nhiều người chơi (A–H, bấm ＋ để thêm) và đổi vai ngay trên thanh đầu trang, reload giữ nguyên. Phiên thử nằm trong sessionStorage từng tab nên không đụng phiên quản trò; không dùng khi chơi thật.

`npm run build` kiểm tra kiểu và chỉ xuất giao diện phòng vào dist; `npm run preview` xem bundle tĩnh, không chạy API phòng.

Bộ vai lobby được quản trò lưu để mọi người cùng xem trước khi chia. Sau Chia vai, chờ đủ xác nhận sẵn sàng mới Bắt đầu. Mô tả vai giữ nguyên cards.json qua `npm run gen:descriptions`; luật engine độc lập. Room schema mới là 4 (Game mới schema 7); xem D52–D54 và ONLINE_SETUP trước khi cấu hình cloud.

Chế độ thường hỗ trợ tiếp tục phiên bằng mã phòng + tên cũ khi đổi máy. Người không có điện thoại được thêm bằng Thêm người ở máy quản trò; xem vai lần lượt và thao tác thay khi đến lượt. Debug dùng RAM và tự xóa phòng khi quản trò thoát (grace 2 giây, lease 90 giây cho mất tín hiệu). Xem D55–D58.

Quản trò bấm avatar mở menu chuyển sang dùng máy quản trò khi hết pin hoặc rút người nghỉ giữa ván; rút không gây hiệu ứng chết dây chuyền (D59).

## Chơi một máy khi không có Internet (D61)

Ở Tạo phòng, chuyển nút **Online / Offline** sang **Offline** → Tạo bàn → **Thêm người offline** để nhập từng tên. Chọn/lưu bộ vai như bình thường. Trong Cài đặt, **Tối giản thao tác ban đêm** được bật sẵn, có thể tắt trước chia vai.

Sau chia vai, quản trò có thể đưa máy lần lượt cho từng người xem vai hoặc bấm Bắt đầu ngay khi cả bàn đã biết vai. Trong chế độ tối giản: chọn mục tiêu Bảo vệ → xác nhận; chọn người Tiên tri soi → xem kết quả/Đã rõ; chọn một lựa chọn chung cho bầy Sói → xác nhận. Vai không có người tự bỏ qua; app tự tổng kết đêm, quản trò vẫn bấm công bố sáng. Các vai đặc biệt giữ luật và form lựa chọn tương ứng.

Ván tự lưu vào trình duyệt hiện tại; tải lại link `?local=...` hoặc nút **Tiếp tục bàn đã lưu trên máy** để chơi tiếp. Xóa dữ liệu trang sẽ xóa bản lưu. Bàn một máy không đồng bộ sang thiết bị khác.

**Chuẩn bị trước khi ra ngoài:** mở bản build một lần khi có mạng để trình duyệt tải và lưu sẵn app cùng ảnh thẻ. Giao diện, engine, mô tả và ảnh của cả 27 vai được lưu sẵn (ảnh khoảng 7,6 MB). Sau đó mở lại cùng địa chỉ/trình duyệt ngay cả khi mất mạng. Service worker cần HTTPS hoặc localhost; bản `npm run dev/debug` không cài cache offline.

Kiểm bản build local: `npm run build`, rồi `npm run preview -- --port 5180`; mở `http://127.0.0.1:5180`. Preview không chạy API phòng online nhưng bàn một máy hoạt động độc lập. Build không tự deploy. `node scripts/cache-offline-cards.mjs` chỉ tải bổ sung ảnh nguồn còn thiếu vào public/offline-cards, không sửa cards.json.

Quản trò bấm **Thoát phòng** trên thanh công cụ để về trang đầu, chọn **Ở lại** nếu bấm nhầm. Bàn offline giữ bản lưu để tiếp tục; phòng online giữ phiên trên thiết bị. Phòng debug tự xóa khi thoát như trước. Cài đặt **Phù thủy thấy nạn nhân** mặc định tắt khi tạo ván qua giao diện; có thể bật trước chia vai.

Mã phòng/bàn mới gồm **6 chữ số**, giữ cả số 0 ở đầu; phòng cũ có mã chữ vẫn dùng được. Khi cấu hình Supabase, áp dụng thêm migration `202610260004_numeric_room_codes.sql` trước khi chạy bản server mới.
