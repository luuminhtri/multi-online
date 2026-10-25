# Đọc và chạy lõi đầu tiên

## Chạy

Node.js >= 22.18 (hỗ trợ chạy TypeScript loại bỏ type trực tiếp).

```sh
cd multi-online
npm ci
npm run typecheck
npm test
npm run demo
```

TypeScript là JavaScript có mô tả kiểu dữ liệu để phát hiện nhầm cấu trúc trước khi chạy. Node chạy code này mà không tạo thư mục build; `tsc --noEmit` kiểm tra kiểu riêng. Runtime không có dependency; TypeScript chỉ dùng lúc phát triển.

## Đọc theo thứ tự

1. `src/engine/types.ts`: hình dạng người chơi, ván, lệnh và sự kiện.
2. `src/engine/rules.ts`: tên/mô tả và mặc định hardcode.
3. `examples/night.ts`: một đêm mẫu từ đầu đến công bố.
4. `src/engine/engine.ts`: xử lý lệnh và chuyển trạng thái.
5. `src/engine/views.ts`: tạo dữ liệu đúng quyền người xem.
6. `tests/engine.test.ts`: tình huống và kết quả để bảo vệ luật khi sửa.

## Ba khái niệm

**Command** là yêu cầu: “bảo vệ An”, “công bố sáng”. **State** là trạng thái hiện tại. **Event** là điều đã xảy ra: hành động được ghi nhận, đòn cắn bị chặn, một người chết.

`dispatch` không sửa đối tượng đầu vào, chỉ trả bản mới. Nếu lệnh không hợp lệ, nó ném RuleError; dữ liệu cũ vẫn còn nguyên. Ví dụ `WAITING_FOR_ACTIONS` nghĩa chưa đủ người gửi; `STALE_STEP` nghĩa lệnh của bước cũ; `WOLVES_DISAGREE` nghĩa bầy chưa thống nhất.

`createGame` nhận phân vai có sẵn để test luật. Nó CHƯA chia bài ngẫu nhiên hay tạo phòng online.

## Biên an toàn quan trọng khi nối API

`Principal` là danh tính đã được server xác thực, không được lấy nguyên từ JSON người chơi gửi. `playerView(game, id)` cũng chỉ được gọi với ID đã được xác thực, không cho client hỏi ID tùy ý. `moderatorView` chứa bí mật toàn ván.

Lõi nhận dữ liệu TypeScript đáng tin cậy từ adapter. TypeScript không kiểm tra JSON trên mạng lúc runtime; API sau này phải validate schema request, rate-limit, xác thực và kiểm tra quyền phòng trước khi gọi lõi. IDs sản xuất phải vô nghĩa, không chứa tên vai.

Khi ghi Supabase: đọc revision → chạy dispatch → giao dịch so sánh revision và lưu trạng thái/sự kiện/biên nhận. Nếu revision đã đổi, đọc lại và thử xử lý trên bản mới. Realtime chỉ phát sau commit; reconnect lấy snapshot theo quyền. Các việc này CHƯA được triển khai trong lõi thuần.

Mã request chống xử lý trùng được lưu cùng ván; gửi lại request cũ trả state hiện tại mà không áp dụng lần hai. Không lấy Game trả từ dispatch gửi thẳng cho client. Dùng view theo quyền. Hiện fingerprint dùng JSON serialization; adapter nên xây lệnh chuẩn với thứ tự trường ổn định trước dispatch.

## Vì sao chưa có hàng đợi hiệu ứng tổng quát?

Code hiện có xử lý Cupid, chết theo tình nhân, hàng đợi Thợ săn chuyên biệt và kế thừa Nhân bản. Chưa có hàng đợi hiệu ứng tổng quát. Mốc v5 đã gom xử lý chết theo đợt, bổ sung kế thừa qua chuỗi chết và kiểm tra 73 test Node, gồm 200 ván mô phỏng ở hai bộ 9/19 vai, cùng 8 test Python cho dữ liệu. Xem STATUS.md cho phạm vi và giới hạn kiểm chứng.

## Ranh giới bản này

Đây là mô phỏng trong một tiến trình, không phải server online. Các test phân quyền kiểm tra dữ liệu view, chưa chứng minh Supabase RLS/realtime đã an toàn. Có UI sandbox một máy, chưa có lưu bền vững, đăng nhập, chia vai ngẫu nhiên, UI multiplayer, vote/timer, undo hoặc deploy. Đã bỏ âm thanh từ app, dùng lời đọc cho quản trò.


## Mở rộng v6 và dữ liệu nguồn đã sửa

role-policy.ts tách Sói thật khỏi kết quả soi. livingNeighbors dùng thứ tự players làm vòng ghế. Game schemaVersion=1 có bệnh bầy và vết thương chết trễ; bản luật trước v6 bị từ chối. Ba bước thông tin mới thêm vào lịch khi có vai tương ứng.

cards.json hiện có 64 vai riêng, khớp response.html; xem CARD_DATA.md và ROLE_COVERAGE.md. Metadata catalog không tự bật vai runtime. npm run test:data kiểm bộ trích Python chuẩn và --check, không fetch web hoặc ghi dữ liệu.


## Bầy nhiều mục tiêu v7

wolf-pack.ts tách năng lực cắn, tập người hành động, đề nghị Sói con và kiểm tra ghế cạnh nhau. Engine vẫn xác thực mọi lựa chọn; dữ liệu view không thay kiểm tra server.

Lệnh bite cũ giữ cho một người; maul nhận mảng, đồng thuận theo tập mục tiêu. Phù thủy dùng biteTargets và healTarget khi có hai nạn nhân; biteTarget chỉ là tiện ích một người trên private view. Lệnh sacrifice yêu cầu Sói con tự đề nghị trước. Đồng thuận hy sinh mở bước mới, không chết sớm trên private/public view của người ngoài. Lệnh convert của Alpha nhận một mục tiêu hoặc null để giữ quyền.

Game schemaVersion=2, luật classic-core-v7; từ chối snapshot cũ thay vì tự gán các trường còn thiếu. Thử ở mẫu bầy Sói 12 người hoặc mẫu đầy đủ 22 vai. Kết quả hiện hành: 100 test Node, 200 ván mô phỏng 9/22 vai và 8 test dữ liệu; xem STATUS.md cho giới hạn.


## Liên kết, ngủ và bộ nhớ v8

roleCanWake phân biệt Sói thật với Sói được thức ở một đêm cụ thể. packMembers tạo danh sách được biết theo người xem và đời sống đã công bố; knownWolves giữ thông tin khi ngủ/chết, không nhận tin mới. canWolfTarget không lọc mất Dream chưa biết; xử lý đòn cắn đồng loại ở resolve để tránh lỗi trở thành công cụ dò vai.

deathBond lưu hướng follow hoặc revenge; bước đầu đêm thiết lập một lần cho người mới nhận Dire/Virginia. Hàng đợi chết kiểm quan hệ trước bom. Chỉ khi publishDeaths mới bật wolfDeathOccurred. Schema 3 và luật v8 từ chối trạng thái cũ, không tự đổi nhãn.

Mẫu liên kết và ngủ 15 người để thử UI; mẫu đầy đủ hiện 27 vai. Kết quả hiện hành và các mặc định còn cần nhóm chơi góp ý ở STATUS.md/DEFAULT_RULES.md.
