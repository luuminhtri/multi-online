# Luật classic-core-v9

Mặc định của dự án, không khẳng định là luật Ma Sói phổ quát. Chỉ có tùy chọn Phù thủy theo yêu cầu mới của người dùng. Ván mới v9 có **27 vai**, schema **4**; ván v8/schema3 đã lưu giữ luật cũ đến hết ván. Dữ liệu cards.json vẫn là nguồn thô, không tự quyết định hành vi runtime.

## Vai nền và thông tin

| Vai | Luật đang chạy |
|---|---|
| Sói | Chọn mục tiêu sống ngoài danh sách Sói đã biết; toàn bầy sống đồng thuận cùng tập mục tiêu. Được sửa phiếu trước quản trò chốt. Không có bỏ cắn. |
| Dân | Không có hành động đêm. |
| Tiên tri | Bắt buộc soi một người sống khác mình. Lycan hiện Sói, Wolf-man hiện không phải Sói; các Sói thật khác hiện Sói, kể cả phe tình nhân. |
| Bảo vệ | Bắt buộc bảo vệ một người sống, được tự bảo vệ, không cùng người hai đêm liền. Chỉ chặn cắn; không chặn độc, nổ, bắn, đau buồn hoặc vết thương cũ. |
| Phù thủy | Một cứu/một độc cho cả ván, tự cứu/tự độc và dùng cả hai cùng đêm được phép. Bật xem nạn nhân (mặc định): còn cứu thì chỉ thấy mục tiêu cắn không được Bảo vệ chặn, không được cứu người đã bị lọc. Tắt xem nạn nhân: chỉ gửi dùng/giữ thuốc; máy chủ cứu tối đa một nạn nhân chưa được bảo vệ theo thứ tự ghế. Đã dùng là tốn thuốc kể cả không có nạn nhân; phản hồi không lộ tên/số nạn nhân. Hết thuốc vẫn được gọi và xác nhận không dùng thuốc. |
| Thợ săn | Chết do mọi nguyên nhân đang hỗ trợ thì bắn một người sống khác mình, một lần. Chết đêm chỉ bắn sau công bố. Không còn mục tiêu thì kết thúc phản ứng để xét hòa; xử lý hết chuỗi bắn mới xét thắng. |
| Cupid | Đêm đầu chọn hai người khác nhau, được chọn mình. Hai người biết tên nhau, không tự biết vai. Một người chết kéo theo người còn lại. |
| Kẻ bị nguyền | Cắn không chặn sẽ sống và hóa Sói tại công bố sáng, tham gia từ lượt bầy đêm sau. Nếu cũng chết do nguyên nhân khác cùng đợt thì không chuyển. Cứu/bảo vệ chặn chuyển đổi. |
| Nhân bản | Đêm đầu chọn người khác. Khi mục tiêu chết và bản thân còn sống, nhận vai hiện tại, tài nguyên còn lại, lịch bảo vệ và trạng thái Alpha đã dùng; Thợ săn có viên đạn riêng. Không nhận vết thương chết trễ hay liên kết tình nhân của mục tiêu. Nhận Cupid sau đêm đầu không ghép lại. |
| Tiên tri tập sự | Thế chỗ khi một Tiên tri chết và không còn Tiên tri sống. Nhân bản kế thừa trước; nếu đã có Tiên tri mới thì tập sự tiếp tục đợi. Không thăng cấp nếu chết cùng đợt. Không dùng biến thể soi hai lần. |
| Tiên tri hào quang | Mỗi đêm chọn người sống khác mình, chỉ biết có năng lực đặc biệt không. Chỉ Sói thường/Dân thường không có năng lực; mọi vai chức năng/biến thể khác đều có. |
| Tiên tri huyền bí | Mỗi đêm chọn người sống khác mình để biết ID vai hiện tại; không bị Lycan/Wolf-man đánh lừa. |
| Nhà tinh thần học | Mỗi đêm chọn hai người sống khác nhau và khác mình, chỉ biết cùng phe hiện tại không, kể cả phe tình nhân. |
| Người hóa sói (Lycan) | Phe Dân, không cắn/biết bầy; Tiên tri thường soi ra Sói. |
| Người sói (Wolf-man) | Sói thật, cùng bầy/đồng thuận, không bị đồng bầy cắn. Tiên tri thường soi ra không phải Sói. |
| Người cứng cỏi | Cắn không chặn để lại vết thương và chết cuối đêm kế tiếp, dù được cứu/bảo vệ trong đêm kế tiếp. Cứu/bảo vệ đêm đầu ngăn vết thương. Các nguyên nhân khác vẫn giết ngay. |
| Người bệnh | Thực sự chết có nguyên nhân bite làm cả bầy mất quyền cắn đúng đêm kế tiếp. Chết riêng do độc/bắn/phán quyết/nổ không gây bệnh; cắn đã chặn không gây bệnh. |
| Hoàng tử | Mỗi lần bị phán quyết treo cổ đều công khai vai, sống và kết thúc phán quyết ngày đó. Không dùng biến thể miễn một lần. Các nguyên nhân chết khác vẫn áp dụng. |
| Kẻ đánh bom | Khi chết, giết người sống gần nhất mỗi phía theo vòng ghế cố định. Hai phía trùng một người thì chỉ chết một lần; có thể sinh thêm chết theo tình nhân và phản ứng. |

## Ba vai Sói mới

| Vai | Mặc định v7 |
|---|---|
| Sói con | Chết bình thường vì bất kỳ nguyên nhân nào cho bầy cắn hai người ở đúng đêm kế tiếp, không cần ngồi cạnh nhau. Được tự đề nghị hy sinh; phải có phiếu đồng ý của mọi Sói sống, gồm chính Sói con, rồi mở lượt chọn hai nạn nhân mới ngay đêm đó. Hy sinh không cộng thêm thưởng đêm sau. |
| Sói đại ca | Khi còn sống, bầy được chọn một hoặc hai nạn nhân; chọn hai thì phải là hai người sống ngồi cạnh nhau. Không gửi danh tính Sói đại ca trong dữ liệu bầy. |
| Sói Alpha | Đêm ngay sau một Sói thật khác chết ban ngày, nếu chưa dùng thành công thì được chọn một mục tiêu cắn để chuyển hóa thay cho cắn chết, hoặc không dùng. Một lần thành công cả ván. Cứu/bảo vệ hoặc mục tiêu chết bởi nguyên nhân khác cùng đợt làm chuyển hóa thất bại, không mất quyền. Phải có một cái chết Sói ban ngày mới để đủ điều kiện thử lại ở đêm khác. |

Sói thật hiện gồm Sói thường, Wolf-man, Sói con, Sói đại ca, Alpha, Sói tuyết, Sói ăn chay, Nanh sói và Sói chiêm bao. Virginia Woolf mặc định thuộc Dân, không suy phe từ nhóm mở rộng. Vai quyết định kỹ năng và nhận diện bầy; kết quả soi theo chính sách riêng; phe quyết định thắng. Bầy chỉ biết danh tính đồng bầy và phiếu, không nhận tên vai biến thể của họ. Sói con tự tiết lộ đề nghị trước khi người khác có thể gửi phiếu đồng ý; không cho đoán ID để dò ai là Sói con.

## Chọn nhiều mục tiêu

- Bình thường bắt buộc một mục tiêu. Có Sói đại ca được chọn một hoặc hai người sống cạnh nhau; ghế chết bị bỏ qua, vòng có nối cuối–đầu.
- Trả thù Sói con hoặc hy sinh đã thống nhất bắt buộc hai mục tiêu khác nhau, trừ khi còn ít mục tiêu hợp lệ hơn thì lấy tối đa số còn lại. Hai mục tiêu không cần cạnh nhau. Các nguồn thưởng không cộng dồn quá hai.
- Bệnh bầy hủy toàn bộ lượt cắn, kể cả thưởng Sói con/Sói đại ca. Thưởng hết đúng đêm đó, không dời sang đêm sau.
- Đồng thuận theo tập mục tiêu, không theo thứ tự bấm. Phiếu bite một người và maul một phần tử là tương đương; maul [A,B] và [B,A] là tương đương.
- Xác nhận hy sinh mở stepId mới; mọi phiếu cũ bị xóa và Sói con không tham gia lượt chọn tiếp theo. Nó vẫn giữ trạng thái công khai còn sống đến công bố; cái chết hy sinh được giải quyết cùng đợt chết đêm. Vì thế các vai không phải Sói không nhận danh sách người chết sớm.
- Từng mục tiêu được kiểm bảo vệ, thuốc cứu, chuyển hóa hoặc chết trễ độc lập. Phù thủy chỉ cứu một người; cứu/độc cùng một mục tiêu thì vẫn chết do độc.
- Alpha chọn sau khi bầy chốt mục tiêu, trước Phù thủy. Nếu thành công, chỉ thay một đòn cắn; nạn nhân thứ hai vẫn xử lý bình thường. Alpha chết cùng đêm vẫn thực hiện quyết định đã chốt. Chuyển hóa chỉ công bố riêng tại publish, không thay self/pack trước đó.
- Alpha thay thế hiệu ứng cắn vốn có của Cursed/Tough Guy khi thành công. Độc, vết thương đến hạn, nổ và chết theo tình nhân vẫn có thể giết mục tiêu trước chuyển hóa. Nhân bản nhận vai Alpha đã dùng thì không được cấp lại quyền.
- Sói thật chết ban ngày qua phán quyết, bắn hoặc chết dây chuyền đều mở điều kiện Alpha. Lycan chết không tính. Sói chết trong đợt giải quyết đêm không mở điều kiện, kể cả hy sinh.

## Phe và chiến thắng

Phe mặc định: Sói thật thuộc Sói, các vai khác thuộc Dân. Tình nhân khác phía thật (một Sói, một không) cùng thuộc phe tình nhân; cùng phía giữ phe thường. Tính lại sau chuyển vai, giữ liên kết của chính mình.

Xét sau công bố/phán quyết và sau khi hết hàng đợi phản ứng:

1. Không ai sống: hòa.
2. Chỉ còn hai tình nhân khác phía: tình nhân thắng.
3. Không còn Sói thật: Dân thắng.
4. Số Sói thuộc phe Sói >= tất cả người sống còn lại, kể cả Sói tình nhân: Sói thắng.
5. Trường hợp khác tiếp tục.

## Trình tự và thông tin

Đêm đầu thêm Cupid/Nhân bản nếu có → Bảo vệ → Tiên tri → Tiên tri hào quang → Tiên tri huyền bí → Nhà tinh thần học → bầy Sói (có thể hai lượt nếu hy sinh) → Alpha nếu có → Phù thủy → review/resolve → quản trò publish → Thợ săn → ngày. Vai không có người cần hành động được quản trò chuyển qua. Không có action skip; Phù thủy giữ thuốc và Alpha từ chối chuyển hóa là quyết định hợp lệ riêng của vai.

Mọi nạn nhân trực tiếp được đánh dấu trước; sau đó duyệt phản ứng theo thứ tự trong đợt: tình nhân, liên kết một chiều rồi bom của từng người chết, đến khi không còn người chết mới. Bom tìm ghế sống tại thời điểm phản ứng, bỏ qua người đã đánh dấu. Sau đó mới kế thừa/thăng cấp, xếp lượt bắn và xét thắng. Nhân bản chết cùng đợt không kế thừa.

Review chỉ dành quản trò. Private/public view không tiết lộ kết quả trước publish. Công khai danh sách chết, phán quyết, kết quả ván và ngoại lệ Hoàng tử tự công khai vai; không gửi nguyên nhân chết, nguồn thưởng, danh tính Sói đặc biệt hoặc mục tiêu Alpha cho người không được phép. Thông tin đã suy ra trong buổi chơi trực tiếp không thể thu hồi.

Khi tạo ván: tối thiểu ba người, ít nhất một Sói thật và số Sói ít hơn người còn lại. Mỗi vai chức năng tối đa một người; nhiều Sói thường, Wolf-man và Dân được phép. Sandbox là công cụ thử toàn bộ state trên một máy, không phải bản multiplayer bảo mật.

## Schema và tương thích

Ván mới dùng v9/schemaVersion=4, lưu settings.witchSeesBite cùng snapshot. Quản trò chọn khi start, không đổi giữa ván. createGame mặc định true để tương thích caller cũ; API kiểm boolean và từ chối trường lạ.

Handler riêng giữ nguyên v8/schema3 và cách Phù thủy thấy cả mục tiêu được bảo vệ. Không nâng nhãn hoặc thay thuốc/lựa chọn đã ghi nhận của ván cũ. Chỉ chấp nhận đúng cặp v8/3 hoặc v9/4 có settings hợp lệ; bản cũ hơn vẫn bị từ chối. Room schema1 không đổi vì Game có version riêng. Muốn áp dụng luật mới thì tạo ván mới.

Game.biteTargets là thông tin quản trò. Private view biteTargets luôn rỗng khi tắt hiển thị/hết cứu; khi bật, bỏ người được Bảo vệ. biteTarget chỉ có giá trị nếu đúng một người trong danh sách đã lọc. Hai người được thấy thì Phù thủy phải chọn healTarget; chế độ ẩn từ chối mọi healTarget, kể cả đoán đúng, để không dò nạn nhân. Một thuốc cứu tối đa một người.

Còn 37 vai nguồn chưa triển khai; đã có API/phiên khách/lưu local và adapter Supabase, chưa xác minh cloud. Chưa có vote/timer hoặc undo.


## Nhóm liên kết và Sói ngủ v8

Đây là các mặc định do dự án chọn để khép kín mô tả nguồn, không khẳng định là biến thể chính thức duy nhất:

| Vai | Mặc định |
|---|---|
| Sói tuyết (Dire Wolf) | Sói thật. Khi nhận vai, chọn một người sống khác mình làm bạn đồng hành. Nếu người đó chết thì Dire chết theo; Dire chết không giết người đó. Liên kết theo danh tính, giữ nguyên khi bạn đồng hành chuyển vai. Chỉ Dire và quản trò biết lựa chọn. Không thêm ngoại lệ miễn chết theo khi Dire là Sói cuối cùng. |
| Virginia Woolf | **Mặc định phe Dân**, không thức cùng bầy, không được coi là Sói chỉ vì nằm trong nhóm Wolf Pack. Nguồn hiện không ghi rõ phe. Chọn người sống khác mình; người đó nhận thông báo riêng ai đã chọn mình và sẽ chết nếu Virginia chết. Người được chọn chết không kéo Virginia theo. Đây là mặc định nội bộ cần nhóm chơi góp ý nếu dùng phe khác. |
| Sói chiêm bao | Sói thật nhưng không thức và không biết bầy đến khi một Sói thật chết được công bố. Sau đó được nhận thông tin bầy và tham gia từ lượt bầy tiếp theo. Lycan/Virginia chết không kích hoạt. Dream chưa ai biết mà chết thì không tự tiết lộ vai cho đồng bầy. |
| Nanh sói (Fang Face) | Thức đêm 1; từ đêm 2 chỉ thức khi là Sói thật cuối cùng, kể cả khi Sói khác đang ngủ. Khi ngủ chỉ giữ danh tính bầy đã biết, không nhận phiếu hiện tại hoặc người mới chuyển hóa. Không mất thông tin đã được cho biết tại công bố của đêm đầu. |
| Sói ăn chay | Thức cùng bầy. Khi là Sói thật cuối cùng, chỉ được gửi fast để xác nhận không cắn. Không chấp nhận maul rỗng, bite hoặc quyền thưởng cắn đôi. Nếu còn Dream đang ngủ thì Fruit chưa phải Sói cuối cùng và vẫn được cắn. Bệnh bầy vẫn chặn cả lượt thức/xác nhận. |

### Lập liên kết và chết dây chuyền

Thứ tự mở đầu: Cupid → Nhân bản → Sói tuyết → Virginia, chỉ thêm vai đang cần chọn. Sau đó đến Bảo vệ và lịch đêm thường. Khi Nhân bản nhận vai Dire/Virginia, không sao chép mối quan hệ cá nhân của mục tiêu; mở bước chọn mới ở đầu đêm tiếp theo, kể cả sau đêm 1.

Phản ứng mỗi người chết theo thứ tự: tình nhân → Dire sống có bạn đồng hành vừa chết → mục tiêu Virginia nếu người chết là Virginia → bom. Lặp hàng đợi đến khi không có người chết mới; mỗi người chết tối đa một lần. Toàn bộ đợt chết xong mới kế thừa và xếp Thợ săn. Các liên kết riêng không công khai nguyên nhân. Đổi vai làm mất kỹ năng của vai cũ: Virginia bị Alpha chuyển thành Sói không còn gây chết qua liên kết, dù thông báo đã biết trước đó không thể thu hồi.

### Bí mật của Sói ngủ

Chỉ giấu pack là chưa đủ: loại Dream khỏi danh sách nạn nhân hợp lệ sẽ cho bầy biết ai là Sói ngủ. Vì vậy Dream chưa được biết vẫn xuất hiện như mục tiêu chưa biết. Lệnh cắn được nhận giống cắn Dân; khi resolve, đòn cắn không giết đồng loại. Chỉ quản trò có nhật ký pack-bite-blocked, người chơi không nhận lỗi riêng hoặc danh tính vai. Bảo vệ/thuốc vẫn có thể áp dụng lên mục tiêu đã chọn; đây là danh sách đòn cắn dự định, không cam kết ai sẽ chết.

Các Sói đã được bầy biết vẫn bị từ chối nếu chọn cắn. Test so sánh một ván có Dân và một ván có Dream ở cùng chỗ kiểm tra dữ liệu của Sói thường và phản hồi nhận lệnh giống nhau trước công bố.

wolfDeathOccurred chỉ thay khi publishDeaths công khai người chết, không ngay khi resolve. knownWolves lưu thông tin từng người đã được biết. Projection dùng trạng thái sống đã công bố để đợt chết chưa công bố không làm thay đổi pack hoặc kích hoạt thức sớm.

Hy sinh Sói con yêu cầu mọi Sói sống đồng ý; khi còn Sói ngủ theo luật thì tạm từ chối đề nghị, không tự đánh thức hoặc coi im lặng là đồng ý. Sau khi hy sinh được chấp thuận, nếu chỉ còn Fruit trong lượt chọn tiếp thì Fruit phải fast; quyền không cắn ưu tiên hơn thưởng.

### Schema 3

Thêm Game.wolfDeathOccurred, Player.deathBond và Player.knownWolves. Trạng thái nguồn cards.json và catalog source-map-v2 không đổi. Snapshot v7/schema2 không được tự đổi nhãn; tạo ván sandbox mới. Chưa có dữ liệu ván thật cần migration; nếu giữ snapshot cũ trong tương lai phải có handler/migration có kiểm thử riêng.
