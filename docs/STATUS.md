# Trạng thái làm việc

Cập nhật: 2026-10-25 (Asia/Ho_Chi_Minh). **Core 27/64 vai, luật classic-core-v8, schemaVersion=3.** Còn 37 vai chưa triển khai. Chưa phải multiplayer.

## Mốc vừa hoàn tất

- Thêm Sói tuyết, Virginia Woolf, Sói ăn chay, Nanh sói và Sói chiêm bao; giữ 22 vai của v7.
- Dire chọn bạn đồng hành và chết theo một chiều; Virginia chọn người sẽ chết theo mình, có thông báo riêng. Virginia mặc định phe Dân vì nguồn không nêu phe, không tự suy từ nhóm Wolf Pack. Đây là mặc định cần góp ý của nhóm chơi.
- Hàng đợi chết xử lý tình nhân, liên kết một chiều, bom, sau đó mới kế thừa/Thợ săn/xét thắng. Liên kết vòng kết thúc, mỗi người chết một lần. Nhân bản nhận vai liên kết chọn lại quan hệ ở đầu đêm tiếp theo; đổi khỏi vai làm mất kỹ năng cũ.
- Dream chưa có Sói thật chết được công bố thì không thức/biết bầy. Không lộ qua danh sách mục tiêu: bầy chọn trúng Dream chưa biết vẫn nhận lệnh, đòn cắn không giết đồng loại, lý do chỉ quản trò xem.
- Fang thức đêm 1 và khi là Sói cuối; lúc ngủ chỉ giữ danh tính bầy đã được cho biết, không nhận phiếu hiện tại hoặc danh tính mới. Không quên thông tin đã được tiết lộ tại công bố đêm đầu.
- Fruit cuối cùng vẫn thức nhưng chỉ xác nhận fast, không cắn kể cả thưởng cắn đôi. Bệnh bầy chặn lượt theo luật chung. Không cho Cub hy sinh khi chưa thể lấy đủ đồng thuận do còn Sói ngủ.
- Projection dùng đời sống đã công bố và bộ nhớ từng người; không thay pack/kích hoạt sớm khi resolve. Schema 3 bổ sung wolfDeathOccurred/deathBond/knownWolves, từ chối snapshot cũ thay vì tự nâng nhãn.
- Sandbox có mẫu liên kết/ngủ 15 người và mẫu đủ 27 vai; UI hỗ trợ chọn liên kết và xác nhận không cắn riêng của Fruit.

## Kiểm chứng

Node v26.5.0, Python 3. Chưa chạy lại trên Node tối thiểu 22.18.

| Kiểm tra | Kết quả |
|---|---|
| npm test | **127/127 đạt**, gồm 100 ván 9 vai và 100 ván đầy đủ 27 vai với seed cố định |
| npm run test:data | **8/8 đạt**, JSON khớp HTML nguồn |
| npm run typecheck/build | Đạt |
| npm run demo | Đạt |
| Trình duyệt v8 | Mẫu 15 người chạy qua hai đêm, đạt các tình huống dưới đây |

27 test mới cho hai chiều liên kết, vòng liên kết/hàng đợi, kế thừa chọn lại, Alpha làm mất kỹ năng Virginia, liên kết đi theo danh tính qua Cursed chuyển vai, thông báo đúng người, bộ nhớ/phiếu khi ngủ, Dream bị cắn hoặc chết chưa biết, Fruit không cắn và bệnh/thưởng, Cub thiếu đồng thuận, snapshot cũ và bất biến projection. Có test hai ván chỉ khác một người là Dân hay Dream: dữ liệu Sói thường và phản hồi nhận lệnh giống nhau trước công bố.

Trình duyệt: chọn cả hai loại liên kết; Dream không biết bầy nhưng có trong mục tiêu chưa biết; phán quyết Sói thật kích hoạt Dream; Fang ngủ đêm hai không nhận phiếu và Cursed mới chuyển; bạn đồng hành chết kéo Dire theo nhưng không công khai lý do. Dùng tab riêng/dev server sẵn có, không dừng server người dùng.

Các ván mô phỏng kiểm input bất biến, retry, revision, tài nguyên, danh sách chết, bí mật trước publish và kết thúc. Chưa bao phủ mọi tổ hợp hoặc chứng minh bảo mật nhiều thiết bị.

## Nguồn, version và giới hạn

cards.json vẫn 64 vai/9 nhóm; response.html không đổi; source-map-v2 truy vết 1–1. Audit/backup ở CARD_DATA.md. Không thêm vai ngoài nguồn.

Chưa có phòng/API/auth/Supabase/realtime, chia bài ngẫu nhiên, lưu ván thật, vote/timer, undo hoặc deploy. Sandbox giữ toàn bộ bí mật trên một máy và tải lại mất ván, không dùng cho ván thật nhiều điện thoại. Chưa kiểm reconnect, RLS hoặc cạnh tranh ghi.

Snapshot trước v8/schema3 bị từ chối, tạo ván mới. Nếu cần bảo toàn ván cũ phải có handler/migration có kiểm thử riêng. Các lựa chọn luật nội bộ nằm trong DEFAULT_RULES.md, không khẳng định luật thương mại duy nhất.

## Tiếp theo

Các vai bầy còn lại: Minion/Sorceress (biết bầy và soi riêng), Wolverine (thông tin theo khoảng cách ghế), Teen Wolf (xác nhận hành vi ban ngày). Lone Wolf cần kết quả thắng cá nhân, triển khai cùng mô hình thắng riêng. Sau đó core vote/hiệu ứng ngày, thông tin theo ghế/kỹ năng một lần, phe riêng/thắng đồng thời, vai ẩn/đa năng lực. Xem ROLE_COVERAGE.md và ROADMAP.md; UI phụ trợ, online vẫn hoãn sau mục tiêu core.

Git multi-online chưa có commit, các tệp vẫn untracked. Không reset/discard, commit/deploy hoặc sửa app cha. UI nhập người/vòng tròn ghế vẫn hoãn; core dùng thứ tự roster làm ghế.
