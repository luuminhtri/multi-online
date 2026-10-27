# Vòng A — phản biện độc lập hợp đồng v13

Ngày: 2026-10-26. Reviewer: sub-agent `round_a_contract_review`, độc lập với người viết hợp đồng. Đối tượng: `role-contracts-v13.md` (147 dòng tại thời điểm review). Đã đối chiếu cards.json, luật v12, DECISIONS và các phần engine/projection liên quan. Root biên tập báo cáo từ kết quả reviewer; không thay quyết định luật trong lượt này.

**Verdict: CHƯA ĐỦ ĐIỀU KIỆN CODE theo hợp đồng hiện tại.** Đây là phát hiện trên hợp đồng dự kiến, không phải xác nhận ứng dụng đang chạy có các lỗi này. Chỉ review tĩnh; không chạy test, không sửa runtime, không thao tác cloud.

## Findings cần đóng trước core nền

| ID | Mức độ | Dòng hợp đồng | Phản ví dụ / vấn đề | Expected và hướng xử lý |
|---|---|---|---|---|
| A01 | Cao | 25–26, 43 | Sorceress/Vampire bị loại khỏi target hoặc trả lỗi khi Sói đoán ID, khiến Sói biết vai bí mật. | Hai ván chỉ khác vai bí mật của X phải có target list/phản hồi tương đương khi Sói chưa biết X. Giải quyết miễn nhiễm kín tại resolve như D30. |
| A02 | Cao | 25 | Event Minion gửi mọi Sói thật bao gồm Dream đang ngủ, phá D30/D39. | Quy định recipients và ký ức theo thời điểm thức; xác định riêng Minion có biết Dream không. Không broadcast đơn thuần theo isWolf. |
| A03 | Cao | 9–12, 59, 66–74 | Sói thường + Lone + 2 Dân đạt parity: winner=wolves không thể biểu diễn Lone thua. Hoodlum/Nostradamus ghi đè có thể xóa quyền thắng của Dân. | Tách điều kiện kết thúc/kết quả nền và tập người thắng, ngoại lệ cá nhân. Nếu muốn thắng độc quyền phải ghi rõ biến thể; không suy từ scalar. |
| A04 | Cao | 11, 43–44, 65, 69–72 | Sói cuối chết, còn Vampire + 2 Dân: fallback Dân thắng có thể kết thúc dù Vampire còn đối địch. Chỉ vài solo được ghi chặn Dân thắng. | Có bảng kết thúc cho từng phe/solo còn sống, nhiều solo đồng thời, thế bế tắc; không để fallback tùy implementation. |
| A05 | Cao | 69; cards.json:269 | Nguồn Ông Kẹ thay Sói không chọn kịp; hợp đồng đổi thành bầy bị bệnh/Fruit fast. Bầy khỏe không thống nhất mãi thì không có lượt thay. Action còn dấu ?? và nhiều tên. | Chốt timeout/thay lượt với mốc server hoặc xác nhận quản trò có log; phân biệt thay đòn và thêm đòn. Biến thể đổi lớn cần quyết định rõ. |
| A06 | Cao | 14, 43, 55, 125 | Drained vừa là chết đêm bị blessed chặn, vừa xử lý như chết ngày nhưng không mở Alpha; penalty mở Alpha vì mọi chết Sói ngày. Hai verdict chưa rõ drain sau lượt nào. | Chốt pipeline verdict/cascade/Hunter/drain/xét thắng, context thời gian và nguồn chết; không suy mọi quy tắc từ step=day. |
| A07 | Cao | 80, 86, 88, 102, 136 | Drunk đêm 3 nhận Hoodlum/Nostradamus/Cupid/Mason/Ghost không có bước khởi tạo đêm 1; nhận special trùng phá giả định một actor. | Ma trận vai được rút, khởi tạo muộn, duplicate, tài nguyên, pack memory, hiệu lực; giải quyết cả Drunk/Nhân bản/Alpha. |
| A08 | Cao | 73 | Mary chết bởi độc của Witch thuộc tình nhân: grudge=village nhưng phải chọn killer không thuộc village, nên tập đích rỗng. Bite+poison đồng thời chưa có attribution. | Lưu nguồn/actor/phe tại mốc xác định; ưu tiên attribution, mục tiêu bắt buộc và fallback khi phe/killer hết người. |
| A09 | Cao | 11, 66, 69; D59 | publicDead hiện chứa cả người rút. Hoodlum có thể thắng khi cả marks chỉ rút; Tanner/Mary và dấu mới chưa tách death/withdraw. | Rút không tự tạo thành tích chết hoặc mở dead-actor. Tách dữ liệu/điều kiện, ma trận dọn target/dấu cho vai mới, giữ D59. |
| A10 | Cao | 37, 94–95 | Old Hag đặt dayAbsentId tại advance và publicView trả trực tiếp: lộ hiệu ứng ngày mai ngay đêm/review trước publish. | Tách pending night effects và published day effects; kiểm thời điểm event cho silence/mummy/recruit/bride/brain-eaten. |
| A11 | Cao | 14, 36, 39 | Ghost bắt buộc chết nhưng blessed chặn missing; blessed Cub có thể được thưởng hy sinh dù không chết. | Chốt ngoại lệ chết bắt buộc, bonus chỉ khi chết thật hay khi chốt, và heartbreak bị miễn dịch; không dùng allowlist nguyên nhân để thay mọi semantics. |
| A12 | Cao | 15, 30, 69, 88 | everWoke chưa phân biệt đủ điều kiện/đã wake/act/pass. Insomniac đứng trước Drunk đêm 3 và Ghost đêm 1 còn sống, kết quả có thể sai. | Định nghĩa sự kiện thức độc lập online/offline; lịch và mốc kết quả cuối đêm rõ, gồm bệnh bầy/Sói ngủ/đa năng lực. |

## Findings cần đóng trước đợt tương ứng

| ID | Mức độ | Dòng hợp đồng | Phản ví dụ / vấn đề | Expected và hướng xử lý |
|---|---|---|---|---|
| A13 | Cao | 82 | Frankenstein nhận Seer nhưng Apprentice/Nhân bản cũng thành Seer thì bị khóa ability. Chưa có lastProtected, nhiều Witch, mất quyền khi chuyển vai. | Chốt thứ tự kế thừa sau batch, nhiều actor, trạng thái/tài nguyên và mất quyền; gắn nhãn giả định cho giới hạn chỉ dùng khi không còn người giữ vai. |
| A14 | Cao | 17, 24; cards.json:42 | Mason nguồn bị xử thua cá nhân khi vi phạm, hợp đồng chỉ penalty chết nên vẫn có thể thắng cùng Dân; trì hoãn sang ngày sau đổi checkpoint thắng/Alpha. | Lưu mất quyền thắng cá nhân và lý do/thời điểm phạt; phân biệt Mason/Teen thay vì penalty target chung. |
| A15 | Trung bình | 55, 81 | Hai verdict chưa rõ reset timer, Hunter quay về đâu. Verdict 1 skip, verdict 2 giết: Bigfoot có angry không? | State machine cả ngày với chỉ số verdict, timer, phản ứng và trigger theo kết quả trọn ngày đã chốt. |
| A16 | Trung bình | 11, 72, 134; cards.json:290 | Dracula vừa kết thúc khi đủ 3 vợ vừa không kết thúc sớm. Vợ thứ ba chết ngày kế tiếp cho kết quả khác theo checkpoint. | Chốt một checkpoint, thời gian giữ đủ vợ hoặc qualifiedSince; không dùng câu sau một đợt xét. |
| A17 | Trung bình | 42, 57, 118 | Hai bite: luật không có bước Leprechaun nhưng test bắt pass. Redirect sau Wolverine khiến tiếng kêu ứng mục tiêu cũ/mới chưa rõ. | Chốt no-step/pass; redirect qua ghế công khai, không oracle khi gặp Sói ngủ/Vampire; chốt thời điểm clink. |
| A18 | Trung bình | 29–30, 65, 69–73, 90, 99–103 | Actor có nhưng hết target: Mary hết phe thù, Cult/Blob/Zombie/Dracula hết người chưa chọn, Mentalist thiếu 2 đích. | Mỗi bước có no-target policy, skip có log kín hoặc pass hợp lệ; dead actors qua online/proxy/offline/reload; không kẹt vì chỉ kiểm có actor. |

## Chỉnh lý tài liệu

- Pacifist dòng 54: ghi rõ biểu quyết cho người bị xét được sống/không treo cổ, tránh hiểu là chọn một người còn sống để giết.
- Ghost dòng 36: filter không thể thực thi đầy đủ không viết tắt; tên A/B/C có thể chặn nhiều từ vô hại. Tách kiểm tự động và quản trò duyệt, chốt có được bỏ viết không.
- Nostradamus dòng 68: giới hạn ba phe trong khi có nhiều phe mới là lựa chọn luật cần giải thích.
- Bổ sung expected trực tiếp cho Count, Beholder, Idiot, Mayor, Pacifist.
- Xóa phương án đã bỏ/dấu hỏi tại dòng 13, 69, 125 để implementation không chọn nhầm.

## Expected cần khóa trước implementation

1. Privacy differential: X thay Dân/Sorceress/Vampire/Dream, người chưa biết nhận target list và phản hồi tương đương trước resolve.
2. Dream đêm 1 không nhận Minion/pack/chat trái chính sách ngủ; quyền biết của Minion được định nghĩa riêng.
3. Parity Sói thường + Lone + 2 Dân biểu diễn được Sói thường thắng, Lone thua.
4. Dân kết thúc, Hoodlum đủ marks, Nostradamus đoán Dân: tập thắng được chốt rõ, không mất kết quả nền do ghi đè.
5. Marks rút không tính bị giết; Tanner rút không thắng, Mary rút không mở báo thù.
6. Hai verdict + Vampire + Hunter có checkpoint, drain, timer và số verdict xác định.
7. Blessed Ghost/Cub có expected sống/chết/bonus rõ.
8. Drunk nhận từng nhóm vai đêm đầu/one-shot/after-death/wolf/duplicate không bỏ bước hoặc cấp lại tài nguyên ngầm.
9. Mary: bite+poison, killer đổi phe/chết/rút, phe grudge rỗng đều có kết quả xác định.
10. Frankenstein/Apprentice/Nhân bản nhận quyền và tài nguyên xác định sau cùng death batch; Guard giữ hoặc không giữ lịch theo quyết định rõ.
11. Insomniac kề Drunk đêm 3, actor pass, bệnh bầy, Dream ngủ, chuyển vai: không khác giữa online và offline auto-wake.
12. Old Hag advance/resolve chưa publish không làm public view lộ vắng mặt ngày sau.
13. Verdict 1 skip, verdict 2 giết có trigger Bigfoot theo một quy tắc toàn ngày rõ.
14. Mọi step mới với 0 target hợp lệ vẫn tiến được, kể cả target rút giữa bước.
15. Snapshot v12/7 đi qua dispatch/view/save mới giữ luật/chat/clock/skip/kết quả cũ, không tự nhận field v13.

## Cổng tái review A

- Đóng A01–A12 trước core nền; A13–A18 phải đóng trước đợt liên quan, không coi findings trung bình là được bỏ qua.
- Viết lại hợp đồng với quyết định rõ và expected độc lập, phân biệt bằng chứng nguồn với mặc định dự án.
- Các lựa chọn lớn còn cần chốt: Ông Kẹ timeout/thay lượt, thắng đồng thời/độc quyền, phạm vi rút vai Drunk và các thay đổi đáng kể so với nguồn. Chi tiết kỹ thuật có thể tự chốt nhất quán rồi review lại.
- Reviewer đọc lại bản sửa và kiểm các phản ví dụ trước khi tuyên bố qua A. Hiện chưa có bản sửa hoặc vòng tái review; chưa bắt đầu B/C.
