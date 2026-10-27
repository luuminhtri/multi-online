# Luật mở rộng v14 — hợp đồng thực thi

Cập nhật 2026-10-27 trong nhánh `agent/roles-64`. Tài liệu này thay bản nháp v14 trước tiếp quản. Đây là quy ước của app suy luận từ 64 thẻ trong cards.json, không phải tuyên bố luật Ma Sói phổ quát. Mô tả thẻ hiển thị vẫn nguyên văn. Các quy ước giải quyết khoảng trống được ghi rõ dưới đây.

Người dùng đã chốt: Vampire công bố nạn nhân **sau treo cổ**; thắng riêng **thay thế** phe thắng chính; phần chưa rõ tự suy luận theo thẻ. Thợ săn giữ nguyên luật người dùng đã chốt ở v13 (ghim bị động mỗi đêm hoặc chủ động một phát cả ván).

## Version và ranh giới

- Ván mới: classic-core-v14/schema9, đủ 64 ID nguồn trong catalog, bộ vai và ảnh offline. Không cần migration SQL vì database giữ document có version.
- Ván v8/schema3 … v13/schema8 giữ cặp version/schema cũ. Danh sách 27 vai legacy đóng băng; không nhận vai mới bằng cách đổi nhãn snapshot.
- Máy chủ quyết định quyền, lượt, mục tiêu, tài nguyên, kết quả và thắng. Online, proxy và bàn một máy dùng chung engine. Không gửi extra state bí mật cho người chơi.
- Phiếu vẫn bỏ ngoài app. App hiển thị trọng số/ràng buộc cho quản trò và người bị ảnh hưởng; không tự suy ra tổng phiếu chưa được nhập.

## 37 vai mở rộng

| Vai | Luật thực thi và quy ước |
|---|---|
| Ghost | Chết bắt buộc đêm 1. Mỗi đêm gửi một từ, kể cả đêm 1 và sau chết. Chặn nhiều từ/tên trùng chính xác. Quản trò duyệt trước công khai, tự xét viết tắt/ám chỉ tên. Người rút không có lượt. |
| Idiot | Phiếu phải chọn loại người. |
| Mason | Lượt mở đầu biết các Mason còn sống. Cho phép nhiều Mason. Quản trò ghi hình phạt nếu bất kỳ người nào nói/ám chỉ Mason: chết vào đêm, mất quyền thắng cá nhân. App không nghe và phán xét hội thoại. |
| Mayor | Phiếu tính hai lần. |
| Old Hag | Mỗi đêm chọn một người vắng mặt vào ngày kế tiếp, không nói/không bỏ phiếu. Không mặc định cho miễn treo cổ. |
| Pacifist | Phiếu phải chọn giữ người. Nếu Frankenstein có cả Idiot và Pacifist, ưu tiên giữ người. |
| P.I. | Được giữ lại, một lần cả ván: kiểm mục tiêu và hai hàng xóm sống gần nhất có Sói thật không. |
| Priest | Được giữ lại, một lần cả ván: ban bất tử ban đêm vĩnh viễn. Chặn cả độc, bắn, nổ và chết dây chuyền; không chặn treo cổ, hình phạt, Ghost chết bắt buộc hoặc tự nguyện hy sinh. |
| Spellcaster | Chọn người không được phát biểu ngày kế tiếp, vẫn được bỏ phiếu. |
| Troublemaker | Được giữ lại, một lần cả ván: ngày sau có hai phán quyết riêng. Mỗi phán quyết không loại ai tiêu một đơn vị skip. |
| Minion | Biết Sói thật, thức/cắn/chat và đồng thuận cùng bầy. Phe Sói nhưng không phải Sói thật trong đếm/soi/Revealer/Chupacabra. Tiên tri soi ra Người. Sói ngủ chưa được phát hiện vẫn có thể bị chọn chung và đòn cắn được giải quyết kín như v13. |
| Sorceress | Phe Sói, mỗi đêm tìm một Tiên tri; không biết danh tính bầy hoặc tham gia cắn/chat. Soi ra Người. |
| Lone Wolf | Thức/cắn cùng bầy. Chỉ thắng khi sống một mình; không thắng kèm bầy. Khi chỉ còn Lone là Sói, không kết thúc bằng parity. Kết quả riêng `lone_wolf`. |
| Drunk | Người trong hai đêm đầu. Đêm 3 xác nhận bốc vai một lần do engine quyết định. Pool: một Wolf, một Villager, các vai đặc biệt chưa xuất hiện; loại Drunk/Ghost/Frankenstein để tránh lịch bắt buộc mâu thuẫn. Vai mới được dùng các lượt chưa trôi qua trong đêm; lượt mở đầu được thiết lập ngay nếu cần. Retry/tải lại không bốc lại. |
| Cult Leader | Tuyển một người khác chưa được tuyển mỗi đêm. Sống và mọi người sống còn lại đã tuyển thì **chỉ trưởng giáo thắng**. Không tự đổi phe gốc của người bị tuyển. |
| Hoodlum | Mở đầu chọn hai người khác nhau, khác mình. Sống ở cuối ván và cả hai chết thật thì thay thắng nền. Rút người không tính. |
| Tanner | Chết thật, đã công bố, vì bất kỳ nguyên nhân nào thì thắng. Rút người không tính. Không xét thắng từ kết quả resolve chưa công bố. |
| Vampire | Phe thứ ba, miễn cắn. Nạn nhân vẫn chơi buổi sáng đến sau phán quyết cuối cùng rồi mới chết/công bố. Đợt này thuộc đêm trước: Priest và ghim Hunter đêm đó vẫn tác dụng. Chờ xử lý Vampire trước kết thúc phe; Tanner đã chết công bố vẫn có ưu tiên riêng. |
| Wolverine | Thức/cắn cùng bầy. Nếu gần một nạn nhân cắn nhất trên vòng ghế sống, phát tiếng kim loại công khai, không lộ danh tính. Đồng hạng vẫn phát. |
| Revealer | Chọn mỗi đêm: giết Sói thật; nếu chọn sai tự chết. Tổng kết cùng các đòn đêm; Bảo vệ/cứu không chặn, Priest chặn. |
| Huntress | Được giữ lại, một phát cả ván, giết mục tiêu cuối đêm; Bảo vệ/cứu không chặn, Priest chặn. |
| Bigfoot | Phe Dân, soi ra Sói. Một ngày không có chết do treo cổ, kể cả Prince thoát, đặt lịch chuyển thành Sói khi bắt đầu đêm sau. |
| Nostradamus | Dự đoán kết quả phe nền một lần ở mở đầu. Chỉ cấp lựa chọn phe có thể xuất hiện trong bộ vai. Sống cuối ván, đoán đúng thì thay thắng nền; không dự đoán vòng ghi đè cá nhân. |
| Bloody Mary | Khi chết, lưu phe giết và người giết nếu xác định được. Bắt đầu đêm sau trả thù người giết còn sống trước, rồi người thuộc phe đó. Treo cổ quy trách nhiệm phe Dân; cắn quy phe Sói; nguồn không xác định quy phe Dân. Không kích hoạt từ rút người. Cuối ván nếu phe giết thua, Mary thay người thắng nền. |
| Leprechaun | Sau bầy, biết mục tiêu cắn, được giữ nguyên hoặc chọn nạn nhân gốc + người thay là hàng xóm sống gần nhất bên trái/phải. Chỉ đổi một vết cắn, không trùng một vết cắn khác. |
| Chupacabra | Khi còn Sói thật, chỉ giết được Sói thật; chọn sai không giết ai. Hết Sói thì giết bất kỳ ai. Thắng khi sống một mình. |
| Beholder | Mở đầu biết các Tiên tri hiện tại còn sống. |
| Count | Mở đầu biết số Sói thật trong hai nửa vòng ghế cố định từ ghế kế bên; không tính chính mình, nửa đầu nhận ghế dư. |
| Insomniac | Cuối đêm chỉ biết có/không một trong hai hàng xóm sống gần nhất đã thức; không nhận danh tính hay hành động. |
| The Thing | Chạm một trong hai ghế vật lý liền kề còn sống, không nhảy ghế chết. Người được chạm nhận tin riêng không kèm tác giả. |
| Bogeyman | Chỉ khi quản trò xác nhận bầy quá giờ ở lượt Sói đang chưa thống nhất. Xóa phiếu chưa chốt, không giữ mục tiêu cũ. Chỉ có lệnh này khi có Bogeyman sống. Thắng khi sống và mọi người khác có chức năng thức đêm đã bị loại, kể cả chưa từng kịp thức. |
| Frankenstein | Nhận kỹ năng sau công bố chết, cộng dồn, không nhận từ người rút, không nhân đôi cùng kỹ năng. Giữ vai/phe Dân. Nhận tài nguyên hữu hạn còn lại, không nạp lại kỹ năng đã dùng. Nhận các lượt chức năng và phản ứng thụ động; các lượt đã trôi qua chờ đêm sau. Không nhận điều kiện thắng cá nhân, danh tính phe hoặc cái chết bắt buộc Ghost. Khi chết mất lượt sống; không tiếp tục như Ghost/Mary sau chết. Cupid vẫn tối đa một cặp toàn ván. Kế thừa Drunk bổ sung kỹ năng thay vì xóa kho cũ. |
| Blob | Mỗi đêm xác nhận để tự lan sang ghế sống kế tiếp bên phải chưa lan. Sống và mọi người sống khác đã lan thì thắng. |
| Zombie | Mỗi đêm chọn người khác chưa ăn não; từ sáng sau người đó không bỏ phiếu. Chủ sống và mọi người sống khác đã ăn não thì thắng. |
| Dracula | Tuyển vợ mới mỗi đêm. Ba vợ phải vẫn sống tại sáng của một đêm **sau** đêm đạt ba vợ, không thắng ngay lúc chọn người thứ ba. |
| Mummy | Phiếu mục tiêu theo Mummy vào ngày sau. Người bị ảnh hưởng thấy ràng buộc, không thấy danh tính Mummy; quản trò thấy quan hệ để tính phiếu ngoài app. |
| Teen Wolf | Thức/cắn cùng bầy. Quản trò kiểm việc nói “Ma sói” mỗi ngày; vi phạm được ghi hình phạt đêm có nhật ký. |

## Kết thúc và trường hợp mâu thuẫn

- Không kiểm thắng trên đợt chết đêm chưa công bố. Xử lý chuỗi tình nhân/liên kết/Hunter/bom trước khi công bố và xét thắng.
- Kết thúc riêng: Lone sống một mình; Tanner chết thật; Bogeyman đủ điều kiện; Cult/Blob/Zombie/Dracula/Chupacabra đủ điều kiện. Nếu cùng đạt, thứ tự đó là quy ước dự án.
- Sau đó: hòa nếu không còn ai; tình nhân khác phe còn đúng hai; Vampire đạt parity; Sói thật đạt parity (không áp dụng khi chỉ còn Lone); Dân khi không còn Sói và không còn phe thứ ba đang chặn.
- Ghi đè kết quả nền, trừ hòa/Tanner: **Hoodlum > Bloody Mary > Nostradamus**. `winnerIds` ghi chính xác người thắng; không thêm đồng thắng phe bị thay.
- Hai vòng đêm+ngày liên tiếp không đổi người sống/vai/tài nguyên/tiến độ kỹ năng, khi còn phe thứ ba hoặc Lone: hòa để thoát bế tắc bất tử. Có kiểm tra Chupacabra đối đầu Prince được Priest bảo hộ.
- Những quy ước này không chứng minh mọi tổ hợp 64 vai đã được bao phủ; bằng chứng và giới hạn tại `roles-v14-review.md`.

## Đồng bộ

Không xóa receipt đã chấp nhận. Dedup xét trước kiểm lượt/quota, replay cũ không đổi mục tiêu mới. Chặn 64 yêu cầu mới thành công/người/lượt; hành động đầu tiên và chuyển lượt/phục hồi của quản trò vẫn dùng được, proxy quản trò được phép hỗ trợ. Giới hạn này giảm gửi dồn, không tuyên bố kích thước document được chặn tuyệt đối cho ván dài vô hạn.
