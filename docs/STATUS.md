# Trạng thái làm việc

Cập nhật: 2026-10-25 (Asia/Ho_Chi_Minh). **Core 27/64 vai, luật classic-core-v9, Game schemaVersion=4 cho ván mới; ván v8/schema3 đã lưu giữ luật cũ đến hết ván.** Còn 37 vai có thể bổ sung sau. Ưu tiên hiện hành là luồng online; bản local đang được kiểm chứng, chưa deploy hoặc có project Supabase.

## Mốc vừa hoàn tất — v9: tùy chọn Phù thủy và luồng phòng

- Luật classic-core-v9, Game schemaVersion=4, `settings.witchSeesBite` do quản trò chọn khi chia vai, không đổi giữa ván. Bật (mặc định): Phù thủy còn thuốc cứu thì thấy nạn nhân cắn, trừ người Bảo vệ đã chặn và không thể cứu người đó. Tắt: không gửi tên/số nạn nhân; Phù thủy chỉ chọn dùng/giữ thuốc; máy chủ cứu tối đa một nạn nhân chưa được bảo vệ theo thứ tự ghế; dùng thuốc vẫn tốn kể cả không có nạn nhân. Lệnh gửi `healTarget` ở chế độ ẩn bị từ chối để không dò nạn nhân.
- Ván v8/schema3 tiếp tục chạy luật cũ qua handler riêng (`src/engine/witch.ts`); không nâng nhãn, không đổi luật giữa ván. Dispatch và lưu phòng chỉ chấp nhận đúng cặp v8/3 hoặc v9/4 có settings hợp lệ.
- Player view có `sleepReady`: sau khi máy chủ nhận hành động, người chơi thấy lời mời ngủ kèm tóm tắt hành động của mình (chế độ ẩn ghi "Cứu nạn nhân", không tên). Bầy Sói chỉ được mời ngủ khi cả bầy thống nhất; thành viên khác đổi phiếu thì màn hình thức dậy trở lại. Quản trò thấy ai vừa gửi và hành động gì trong bảng tiến độ và nhật ký "Hành động vừa nhận".
- UI trang phòng làm mới: giấy ngà, xanh đậm, đỏ đất, minh họa SVG nội bộ; quản trò bật/tắt tùy chọn Phù thủy trong lobby trước khi chia vai; màn Phù thủy hai chế độ; sổ tay quản trò có dòng tóm tắt luật đang dùng. Kiểm mobile 375px không tràn ngang.
- Postman collection "Witch settings" (8 requests, 8 assertions, 0 failed; log `docs/verification/v9-postman.txt`); OpenAPI 0.2.0 bổ sung GameSettings. `scripts/open-test-players.mjs` đã chạy thật: mở 8 Chrome A–H vào phòng lobby, tên trùng bị máy chủ từ chối 409, chạy lại giữ đúng phiên, đã đóng cửa sổ test.
- Giao diện trang phòng viết lại theo yêu cầu người dùng (D36–D38, F06–F11): nền tối, chữ lớn, ít chữ, mobile-first; bàn tròn hiển thị sống (sáng) / chết (mờ) làm màn hình mặc định; vai luôn ẩn — lần đầu nhận vai có overlay đọc vai với nút "Tôi đã đọc và sẵn sàng" (theo từng ván trên từng tab), sau đó chỉ mở bằng nút xem; mọi thông tin phụ (nhật ký, lời nhắn riêng, sổ tay, diễn biến) đặt trong mục gập; mục "Các vai trong trò chơi" có ảnh thẻ ở lobby và trong ván; quản trò kéo thả xếp ghế trên bàn tròn trước khi chia vai (mutation `reorder` giữ nguyên, còn nút ↑↓ dự phòng).
- Ảnh thẻ sinh tự động vào `src/catalog/images.ts` từ cards.json qua `npm run gen:images` (script chỉ đọc nguồn); catalog API trả thêm `image`, có thể null khi thiếu; UI có dự phòng chữ cái khi ảnh không tải được. Ảnh nằm trên máy chủ nguồn, quyền sử dụng chưa xác minh — xem CARD_DATA.md.

### Kiểm chứng trình duyệt v9

Hai phòng thật trên `npm run dev:online`: phòng T8CRGW chế độ ẩn (6 người), phòng APSEY5 chế độ hiện (5 người). Đã chạy qua: chia vai với settings; Bảo vệ tự bảo vệ/che nạn nhân; Tiên tri soi; Sói cắn và đổi lựa chọn sau khi gửi (form mở lại, giữ lựa chọn cũ, cập nhật thành công); Phù thủy chế độ ẩn dùng thuốc không thấy tên, chế độ hiện khi nạn nhân bị Bảo vệ che thì không hiện nạn nhân và nút dùng thuốc vô hiệu; quản trò chốt lượt → tổng kết → công bố (đêm 1 không ai chết vì thuốc cứu ẩn đúng nạn nhân; đêm 2 người bị cắn chết đúng); phán quyết và sang đêm tiếp. Reload giữ phiên và dữ liệu đã gửi; snapshot người chơi không chứa `healTarget`, `poisonTarget`, `protectedTarget`, `alphaTarget`, `initialRole` hoặc vai người khác.

## Mốc trước đó — v8: liên kết và điều kiện thức

- Thêm Sói tuyết, Virginia Woolf, Sói ăn chay, Nanh sói và Sói chiêm bao; giữ 22 vai của v7.
- Dire chọn bạn đồng hành và chết theo một chiều; Virginia chọn người sẽ chết theo mình, có thông báo riêng. Virginia mặc định phe Dân vì nguồn không nêu phe, không tự suy từ nhóm Wolf Pack. Đây là mặc định cần góp ý của nhóm chơi.
- Hàng đợi chết xử lý tình nhân, liên kết một chiều, bom, sau đó mới kế thừa/Thợ săn/xét thắng. Liên kết vòng kết thúc, mỗi người chết một lần. Nhân bản nhận vai liên kết chọn lại quan hệ ở đầu đêm tiếp theo; đổi khỏi vai làm mất kỹ năng cũ.
- Dream chưa có Sói thật chết được công bố thì không thức/biết bầy. Không lộ qua danh sách mục tiêu: bầy chọn trúng Dream chưa biết vẫn nhận lệnh, đòn cắn không giết đồng loại, lý do chỉ quản trò xem.
- Fang thức đêm 1 và khi là Sói cuối; lúc ngủ chỉ giữ danh tính bầy đã được cho biết, không nhận phiếu hiện tại hoặc danh tính mới. Không quên thông tin đã được tiết lộ tại công bố đêm đầu.
- Fruit cuối cùng vẫn thức nhưng chỉ xác nhận fast, không cắn kể cả thưởng cắn đôi. Bệnh bầy chặn lượt theo luật chung. Không cho Cub hy sinh khi chưa thể lấy đủ đồng thuận do còn Sói ngủ.
- Projection dùng đời sống đã công bố và bộ nhớ từng người; không thay pack/kích hoạt sớm khi resolve. Schema 3 bổ sung wolfDeathOccurred/deathBond/knownWolves, từ chối snapshot cũ thay vì tự nâng nhãn.
- Sandbox có mẫu liên kết/ngủ 15 người và mẫu đủ 27 vai; UI hỗ trợ chọn liên kết và xác nhận không cắn riêng của Fruit.

27 test của mốc v8 gồm hai chiều liên kết, vòng liên kết/hàng đợi, kế thừa chọn lại, Alpha làm mất kỹ năng Virginia, liên kết đi theo danh tính qua Cursed chuyển vai, thông báo đúng người, bộ nhớ/phiếu khi ngủ, Dream bị cắn hoặc chết chưa biết, Fruit không cắn và bệnh/thưởng, Cub thiếu đồng thuận, snapshot cũ và bất biến projection. Có test hai ván chỉ khác một người là Dân hay Dream: dữ liệu Sói thường và phản hồi nhận lệnh giống nhau trước công bố. Trình duyệt v8: mẫu 15 người chạy qua hai đêm ở mốc trước.

## Kiểm chứng

Node v26.5.0, Python 3. Chưa chạy lại trên Node tối thiểu 22.18.

| Kiểm tra | Kết quả |
|---|---|
| npm test | **144/144 đạt**, thêm 9 test visibility, 6 test HTTP phòng và test ảnh catalog |
| npm run test:data | **8/8 đạt**, JSON khớp HTML nguồn |
| npm run typecheck/build | Đạt; bundle gồm trang phòng và sandbox |
| Postman | Collection "Witch settings": 8 requests, 8 assertions, 0 failed; log tại docs/verification/v9-postman.txt. CLI báo chưa đăng nhập, chạy local vẫn đạt |
| Trình duyệt v9 | Hai phòng ẩn/hiện chạy trọn đêm như mục trên; mobile 375px không tràn ngang |
| Trình duyệt giao diện tối | Phòng NXR4RE qua UI mới: tạo phòng, kéo thả ghế (Dũng lên chỗ 1), mở catalog 27 ảnh (không lỗi ảnh), overlay đọc vai Phù thủy có ảnh thẻ, xác nhận rồi vai ẩn cả sau reload, Phù thủy dùng thuốc qua form mới, resolve/publish, phán quyết treo cổ Sói → Dân thắng, bàn tròn làm mờ người chết; đo tràn ngang mobile 390px sạch |
| HTTP phòng và adapter | 6 test: cạnh tranh join, restart, phân quyền, retry start, key mới/cũ, 503/timeout/JSON lỗi, settings và retry chữa trị ẩn |
| Trình duyệt v8 | Mẫu 15 người chạy qua hai đêm (mốc trước) |
| npm run demo | Đạt |
| Script mở người chơi test | 8 phiên Chrome A–H vào phòng; chặn tên trùng; chạy lại giữ phiên; đã dọn tiến trình |

Các ván mô phỏng kiểm input bất biến, retry, revision, tài nguyên, danh sách chết, bí mật trước publish và kết thúc. Chưa bao phủ mọi tổ hợp hoặc chứng minh bảo mật nhiều thiết bị; chưa kiểm ván nhiều vai mở rộng qua UI online.

## Nguồn, version và giới hạn

cards.json vẫn 64 vai/9 nhóm; response.html không đổi; source-map-v2 truy vết 1–1. Audit/backup ở CARD_DATA.md; bản sửa mới nhất chỉ đổi khóa `Imagage Url` thành `Image Url` ở Mason, có backup trong data/backups. Không thêm vai ngoài nguồn.

Đã có mã phòng/API, phiên khách, chia bài trên máy chủ, projection theo quyền, lưu local và adapter HTTP Supabase; UI tạo/vào phòng, lobby có tùy chọn luật. Chưa kiểm trọn ván nhiều người thật ngoài hai phòng thử, SQL/RLS hoặc cạnh tranh ghi trên database. Chưa có project cloud, Realtime, vote/timer, undo hoặc deploy. Sandbox giữ toàn bộ bí mật trên một máy và tải lại mất ván, không dùng cho ván thật nhiều điện thoại.

Key mới SUPABASE_SECRET_KEY dùng apikey, key JWT cũ dùng thêm Bearer. Khi cloud thiếu cấu hình, API trả 503 thay vì lưu vào filesystem tạm. Các lỗi upstream được kiểm qua HTTP local và không lộ key/chẩn đoán upstream. Xem ONLINE_SETUP.md.

Snapshot v8/schema3 và v9/schema4 được chấp nhận song song; bản cũ hơn bị từ chối, không tự nâng nhãn. Room schema 1 không đổi vì Game có version riêng. Muốn áp dụng luật mới cho ván đang chạy thì tạo ván mới.

## Tiếp theo

Cho nhóm chơi thử ván thật nhiều điện thoại qua mạng LAN/Internet bằng dev server, gom góp ý về mặc định Phù thủy và hiển thị lời mời ngủ. Bước trống (ví dụ không ai làm Tiên tri) vẫn mở để giữ bí mật và quản trò chốt thủ công; cân nhắc gộp thông báo nếu gây khó chịu khi dùng thật. Khi người dùng có project Supabase, đặt key vào môi trường máy chủ rồi kiểm tra cloud theo ONLINE_SETUP.md; trước đó chưa kiểm RLS/CAS trên database thật.

Các vai còn lại giữ backlog tại ROLE_COVERAGE.md và ROADMAP.md. Chưa tự deploy. Server local cổng 5174 phục vụ trang phòng; sandbox ở /sandbox.html. Git hiện có commit 8d2559c; thay đổi lượt v9 và luồng phòng chưa commit. Không reset/discard hoặc sửa app cha.
