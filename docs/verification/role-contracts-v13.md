# Hợp đồng luật 37 vai còn thiếu — classic-core-v13 (bản nháp Vòng A)

Mục tiêu: 64/64 vai nguồn chơi được thật (core + validation + projection + online/offline + UI tối thiểu + test). Mô tả nguồn là cards.json (trích nguyên văn ở catalog); mọi mục "GIẢ ĐỊNH" là mặc định nội bộ của dự án, không phải luật chính thức, được ghi DEFAULT_RULES và có test. Các vai ngày/vote theo D40: phiếu ngoài app, app ghi phán quyết; vai tác động phiếu được mô hình hóa bằng dữ liệu + hiển thị quản trò, không dựng phiếu in-app.

Đối chiếu nguồn: response.html qua cards.json, nhóm nguồn ở ROLE_COVERAGE.md. Tương thích: ván v8/3 … v12/7 giữ luật cũ đến hết ván; ván mới v13/schemaVersion=8. Không bump room schema.

## 0. Nền tảng chung (áp dụng mọi đợt)

- `Team` mở rộng: `'wolves' | 'village' | 'lovers' | 'vampires' | 'cult' | 'independent'`. Phe riêng/solo dùng `independent` để so alignment (Mentalist) và hiển thị.
- `checkWinner` tách hai lớp:
  - **Điều kiện kết thúc** (gọi sau mọi đợt chết/phán quyết/rút): hòa → tình nhân → tanner chết trong đợt → giáo phái → Ông Kẹ → Chất nhày → Zombie → Dracula → Chupacabra một mình → Sói cô đơn một mình → Sói parity → Ma cà rồng parity → Dân.
  - **Điều chỉnh khi ván kết thúc** (ghi đè winner theo thứ tự): hoodlum → bloody_mary → nostradamus. Hòa (`draw`) không bị ghi đè. Thứ tự được chọn vì điều kiện cá nhân cụ thể hơn điều kiện phe; ghi rõ là GIẢ ĐỊNH ưu tiên.
- Lý do chết mới: `hex`? (không), `drained` (Ma cà rồng), `hunted` (Nữ thợ săn), `revealed` (Kẻ khám phá), `bogeyman`, `haunted` (Bloody Mary), `chupacabra`, `penalty` (quản trò phạt vi phạm xã hội), `missing` (Con ma chết đêm 1), `brains` (không gây chết).
- Miễn dịch đêm (Thầy tu phù phép): chặn mọi lý do chết ban đêm — bite, poison, delayed-bite, explosion, heartbreak, companion, fear, sacrifice, drained, hunted, revealed, bogeyman, haunted, chupacabra, missing. Không chặn verdict, shot, penalty (nguyên nhân ngày).
- "Thức dậy đêm" dùng cho Kẻ Mất Ngủ và Ông Kẹ: `Game.everWoke`/`Game.nightWoke` ghi mọi id từng là actor ban đêm (không gồm Ông Kẹ cho điều kiện thắng của chính ông).
- Vai nhiều người được phép: mason (nhóm biết nhau), wolf, wolf_man, villager. Các vai còn lại giữ tối đa 1 (DUPLICATE_SPECIAL_ROLE).
- Lệnh quản trò mới: `penalty { target }` (loại người chơi vì vi phạm luật xã hội — Sói Tuổi Teen không nói "Ma sói", nói về Sinh đôi; xử lý như chết ngày: công bố ngay, có dây chuyền), `drawRole { playerId, role }` (Say rượu đêm 3). Cả hai chỉ quản trò, có nhật ký, idempotent qua requestId.
- Lệnh người chơi mới: `act` với action `pass` (chỉ vai được phép bỏ lượt riêng), `note { text }` (Con ma), `hex { target }`, `probe { target }`, `redirect { target }`, `recruit { target }`, `drain { target }`, `hunt { target }`, `mark { targets: [a,b] }`, `predict { team }`, `tap { target }`, `invade { target }`, `eat { target }`, `wed { target }`, `disrupt` (không target).

## 1. Thông tin ban đêm (Đợt 1)

| Vai | Hợp đồng |
|---|---|
| mason (Sinh đôi) | Phe Dân, không hành động thường. Đêm 1 có bước `mason`: mọi Mason sống cùng thức, mỗi người nhận danh sách Mason khác (private event). Cho phép nhiều Mason trong bộ vai (như Sói). Nói về Sinh đôi bị giết: handled bằng `penalty` của quản trò (GIẢ ĐỊNH chuyển "giết đêm hôm đó" → phạt quản trò ngày hôm sau, vì đêm đã tổng kết). Chỉ một bước đêm 1, không lặp. |
| minion (Kẻ phản bội) | Phe Sói (thắng cùng Sói) nhưng KHÔNG phải Sói thật: không cắn, không chat, không tính parity, chết không mở Alpha, không kích hoạt Dream/Fang, Tiên tri thấy Dân. Đêm 1 bước `minion`: biết danh sách Sói thật sống (knownWolves); đồng thời mỗi Sói thật nhận event riêng "Kẻ phản bội là ai". Sói không được cắn minion (canWolfTarget loại wolf-team gồm minion/sorceress). Aura: có năng lực. Mystic: thấy 'minion'. Mentalist: cùng phe với Sói. |
| sorceress (Pháp sư sói) | Như minion về phe/bí mật (không biết bầy, bầy không biết cô ta, Tiên tri thấy Dân, không parity). Mỗi đêm bước `sorceress`: chọn 1 người sống khác mình → private `{ isSeer }` theo `role === 'seer'` hiện tại (Tiên tri tập sự đã thăng cấp tính là Tiên tri). Bắt buộc chọn (không pass). |
| beholder (BeHolder) | Phe Dân. Đêm 1 bước `beholder` (chỉ khi có Tiên tri): biết id Tiên tri hiện tại đêm 1. Sau đó không hành động. Không tự cập nhật khi tập sự thăng cấp (GIẢ ĐỊNH: nguồn nói đêm 1). |
| count (Bá Tước) | Phe Dân. Đêm 1 bước `count`: biết số Sói thật sống ở mỗi nửa làng. Nửa: tính từ ghế Bá Tước theo thứ tự ghế cố định — nửa "trước" gồm ⌈(N−1)/2⌉ người kế tiếp theo chiều danh sách, nửa "sau" là phần còn lại; N là tổng số người chơi (GIẢ ĐỊNH về cách chia nửa, có test). Kết quả private: `{ firstCount, secondCount, firstSeats: [tên] , secondSeats: [tên] }` (danh sách ghế là thông tin công khai, số Sói là bí mật). |
| paranormal_investigator (Thám tử) | Phe Dân. Một lần cả ván. Mỗi đêm trong khi chưa dùng: bước `paranormal_investigator`, chọn 1 người sống khác mình hoặc `pass`. Dùng: kết quả private `isWolf` = target HOẶC một trong hai láng giềng sống (theo vòng ghế tại thời điểm đó) là Sói thật. Đã dùng thì không được gọi nữa. |
| insomniac (Kẻ Mất Ngủ) | Phe Dân. Bước đêm đặt CUỐI (sau mọi bước sống, trước Con ma/Bloody Mary/dead-actor): chọn 1 trong hai láng giềng sống của mình → private `woke` = người đó có phải actor của bất kỳ bước đêm nay (`nightWoke`). Không chọn = không được (bắt buộc chọn một trong hai; nếu cả hai chết thì không có bước). |

## 2. Hiệu ứng đêm và chết (Đợt 2)

| Vai | Hợp đồng |
|---|---|
| ghost (Con ma) | Phe Dân. Chết bắt buộc cuối Đêm 1 (nguyên nhân `missing`, công bố như chết đêm thường, không phải cắn — không kích hoạt Người bệnh/Alpha). Mỗi đêm kể cả đêm 1 (khi còn sống) có bước `ghost`: gửi MỘT từ (`note { text }`): 1–30 ký tự, không khoảng trắng trong nội dung sau trim, không chứa tên hoặc tiền tố 6+ ký tự của bất kỳ tên người chơi nào (không phân biệt hoa/thường, bỏ dấu khi so) → nếu vi phạm: `NAME_IN_NOTE`. Note là event moderator-only kèm đêm; quản trò đọc/giao tiếp ngoài app. Người chết vẫn được gọi bước này (actor = Con ma kể từ đêm 2). |
| old_hag (Phù Thủy già) | Phe Dân. Mỗi đêm bắt buộc chọn 1 người sống bất kỳ (được chọn cả mình): người đó "vắng mặt" NGÀY HÔM SAU — `dayAbsentId` (đặt tại advance, reset ở nextNight). Công khai: mọi máy thấy nhãn "Vắng mặt hôm nay" ở bàn tròn (sự kiện public `day-absent`). Hậu quả thực thi: quản trò không tính phiếu/ngôn luận của người đó; engine chặn verdict trúng người vắng mặt (`ABSENT_EXCLUDED`). Người vắng vẫn sống, vẫn có thể chết đêm. |
| spellcaster (Người phù phép) | Phe Dân. Mỗi đêm bắt buộc chọn 1 người sống: người đó bị CÂM ngày hôm sau — `daySilencedId` (reset ở nextNight). Chỉ quản trò và chính người bị câm biết (private event `silenced` cho target; không công khai). Không enforce lời nói (ngoài app). |
| priest (Thầy tu) | Phe Dân. Một lần cả ván. Khi chưa dùng: mỗi đêm bước `priest`, chọn 1 người sống khác mình hoặc `pass`. Dùng: target nhận `blessed` vĩnh viễn. Blessed chặn mọi lý do chết đêm (mục 0) và làm đòn cắn vô hiệu như được Bảo vệ: không hóa Sói, không vết thương, không chuyển hóa Alpha (không mất quyền Alpha), không hiện trong healableBites. Không chặn verdict/shot/penalty. |
| huntress (Nữ Thợ săn) | Phe Dân. Một lần cả ván. Khi chưa dùng: mỗi đêm bước `huntress`, chọn 1 người sống khác mình hoặc `pass`. Dùng: tại resolve, target chết nguyên nhân `hunted` (chết đêm bình thường: blessed chặn, tình nhân/bom dây chuyền bình thường, Thợ săn mục tiêu được bắn vẫn phản ứng). Không phải cắn nên Bảo vệ/thuốc không chặn. |
| revealer (Kẻ khám phá) | Phe Dân. Mỗi đêm bắt buộc chọn 1 người sống khác mình. Tại resolve: nếu target là Sói thật (`isWolf`) → target chết `revealed`; ngược lại revealer tự chết `revealed`. Blessed chặn cái chết tương ứng. Đây là death đêm, không công bố trước publish. |
| leprechaun (Yêu Tinh) | Phe Dân. Bước `leprechaun` đặt NGAY SAU bầy Sói, trước Sói Alpha. Chỉ có bước khi bầy chốt ĐÚNG 1 mục tiêu. Quản trò (người dùng chung máy) và Yêu Tinh thấy mục tiêu cắn (`biteTargets` trong private view khi là lượt). Hành động: `pass` (giữ nguyên) hoặc `redirect { target }` — target là láng giềng sống TRÁI hoặc PHẢI của nạn nhân (theo vòng ghế, gần nhất mỗi phía). Redirect ghi đè biteTargets[0] trước Alpha/Phù thủy (Alpha thao tác trên danh sách mới). Không lộ ai redirect. |
| vampire (Ma cà rồng) | Phe `vampires`, third force. Sói không chọn được vampire làm mục tiêu cắn (GIẢ ĐỊNH chặn từ danh sách thay vì chết vô hiệu). Tiên tri thấy Dân; Aura có năng lực; không parity Sói. Mỗi đêm bắt buộc bước `vampire`: chọn 1 người sống khác mình → nạn nhân bị đánh dấu `vampireVictim` (đè nạn nhân đêm trước nếu chưa xử lý). Bảo vệ/thuốc KHÔNG chặn (không phải cắn; GIẢ ĐỊNH), blessed chặn. Cái chết xảy ra và công bố SAU phán quyết ngày (kết thúc ngày, trước nextNight): `drained`, xử lý dây chuyền/Thợ săn/inheritance như đợt chết ngày, KHÔNG mở điều kiện Alpha (không phải chết Sói ban ngày). Nếu cùng ngày phán quyết trúng chính nạn nhân thì hủy. Ván kết thúc trước khi chốt phán quyết thì nạn nhân không chết. Thắng: parity — vampire sống ≥ số người sống khác → `vampires` (chỉ còn vampire + 1). |
| chupacabra | Phe `independent`. Mỗi đêm bắt buộc bước `chupacabra`: chọn 1 người sống khác mình. Khi còn ≥1 Sói thật sống: chỉ khi target là Sói thật thì target chết `chupacabra` tại resolve (không cho kết quả khi chọn trượt — không có event cho chupacabra; moderator-only `chupacabra-missed`). Khi KHÔNG còn Sói thật sống: target bất kỳ chết. Blessed chặn. Thắng: chỉ khi còn sống một mình → `chupacabra`. Chặn kết thúc "Dân thắng" khi Chupacabra còn sống và chưa một mình (GIẢ ĐỊNH để vai có thể đạt điều kiện; khi Chupacabra chết thì Dân thắng bình thường). |
| the_thing | Phe Dân, kỹ năng xã hội. Mỗi đêm bước `the_thing`: chạm một láng giềng sống (trái/phải) — `tap { target }` bắt buộc. Target nhận private "đêm nay bạn cảm thấy ai chạm vào mình" (không lộ ai). Moderator thấy log. |
| wolf-pack bổ sung | — |

## 3. Ngày, phiếu và bầy Sói mở rộng (Đợt 3)

| Vai | Hợp đồng |
|---|---|
| idiot (Thằng ngốc) | Phe Dân, không hành động đêm. Luật ngoài app: luôn tán thành giết. Hiển thị: ghi chú trong sổ tay quản trò + private "Bạn là Thằng ngốc…" lúc nhận vai? (không cần riêng — mô tả vai đã nói). Không enforce (phiếu ngoài app, không ràng buộc kết quả — GIẢ ĐỊNH: không cấm skip). |
| mayor (Thị trưởng) | Phe Dân. Phiếu ×2 — hiển thị trong sổ tay quản trò. Không enforce. |
| pacifist (Người yêu hòa bình) | Phe Dân. Luôn vote cho người sống — hiển thị sổ tay. Không enforce. Đi chung Thằng ngốc là khuyến nghị nguồn, không ràng buộc bộ vai. |
| troublemaker (Kẻ phá rối) | Phe Dân. Một lần cả ván. Khi chưa dùng: mỗi đêm bước `troublemaker`: `pass` hoặc `disrupt`. `disrupt`: NGÀY HÔM SAU có 2 lượt phán quyết — `verdictsRemaining` tăng lên 2 (tích lũy tối đa 2). Luồng ngày: sau phán quyết 1, nếu còn verdictsRemaining > 1 thì trừ 1 và vẫn ở `day` (chỉnh verdictDone reset); hết mới được nextNight. Mỗi lượt phán quyết trống vẫn trừ ngân sách skip riêng. Hoàng tử chặn độc lập từng lượt. Không giới hạn người bị phán quyết trùng giữa hai lượt. |
| mummy (Xác Ướp) | Phe Dân. Mỗi đêm bắt buộc chọn 1 người sống khác mình: `mummyTarget` — ngày hôm sau phiếu của người đó TÍNH THEO phiếu Xác Ướp (hiển thị sổ tay quản trò + nhãn trên ghế: "Phiếu theo Xác Ướp"). Không enforce. Reset ở nextNight. |
| wolverine (Chó sói) | Sói thật (thức/cắn/chat/parity bình thường). Khi bầy chốt mục tiêu (advance wolves): với mỗi nạn nhân, nếu Chó sói là Sói sống gần nạn nhân nhất theo vòng ghế (khoảng cách ghế nhỏ nhất; tính cả hòa — GIẢ ĐỊNH) thì moderator-only event `wolverine-clink` ngay lúc đó: quản trò tạo tiếng kim loại (âm thanh ngoài app, không auto-announce công khai). Chết thì không còn hiệu ứng. |
| teen_wolf (Sói Tuổi Teen) | Sói thật. Ràng buộc xã hội: mỗi ngày phải nói "Ma sói"; quản trò dùng `penalty` nếu vi phạm. Hiển thị nhắc trong sổ tay. |
| lone_wolf (Sói cô đơn) | Sói thật đầy đủ. Thắng RIÊNG: chỉ khi là người sống cuối cùng. Khi mọi Sói thật sống đều là lone_wolf: bỏ điều kiện parity Sói (tránh kết thúc sớm) — ván tiếp tục đến khi lone_wolf một mình (thắng `wolves`) hoặc chết (Dân thắng bình thường). Khi còn Sói thường sống: parity bình thường tính cả lone_wolf, lone_wolf thua nếu phe Sói thắng theo cách thường. Tình nhân ưu tiên hơn (giữ thứ tự hiện có). |

## 4. Phe thứ ba và thắng riêng (Đợt 4)

| Vai | Hợp đồng |
|---|---|
| cult_leader (Trưởng giáo phái) | Phe `cult`. Mỗi đêm bắt buộc bước `cult_leader`: `recruit { target }` — người sống khác, chưa thuộc giáo phái. Người recruited giữ vai/phe cũ cho mọi kỹ năng & parity; chỉ cờ `cultMember`. Private event cho người mới "Bạn đã được rút vào giáo phái". Thắng (kết thúc ván): Trưởng giáo còn sống VÀ mọi người sống đều thuộc giáo phái (kể cả leader) → `cult`. GIẢ ĐỊNH ưu tiên trước parity/ Dân-thắng; nếu leader chết thì giáo phái không thắng nữa. |
| hoodlum (Du côn) | Phe `independent`. Đêm 1 bước `hoodlum`: `mark { targets: [a,b] }` — hai người sống khác nhau, khác mình (GIẢ ĐỊNH không được chọn mình). Điều chỉnh khi ván kết thúc (mọi loại winner trừ hòa): hoodlum còn sống VÀ cả hai mục tiêu đã chết (publicDead) → winner = `hoodlum`. Ván không kết thúc sớm vì hoodlum. |
| tanner (Chán đời) | Phe `independent`. Khi Tanner chết (bất kỳ nguyên nhân nào) trong một đợt chết → ván kết thúc, winner = `tanner` (ưu tiên ngay sau hòa/tình nhân). Trước khi chết: Dân thường về mọi mặt (không parity, thấy Dân). |
| nostradamus (Nhà Tiên Tri Nostradamus) | Phe `independent`. Đêm 1 bước `nostradamus`: `predict { team: 'wolves' | 'village' | 'lovers' }` bắt buộc (GIẢ ĐỊNH giới hạn 3 phe chính). Điều chỉnh khi ván kết thúc: nostradamus còn sống và phe đoán trùng winner gốc → winner = `nostradamus`. Bí mật đến hết ván (chỉ moderator). |
| bogeyman (Ông Kẹ) | Phe `independent`. Bước `bogeyman` chỉ mở khi bầy Sói KHÔNG cắn được đêm nay (bệnh bầy, hoặc cả bầy chỉ còn Sói ăn chay phải fast). Khi mở: bắt buộc `drain`?? → dùng `mark`? Đặt tên `bogeyman-pick`: hành động `hunt { target }`? → chọn 1 người sống khác (không self) → tại resolve chết `bogeyman` (blessed chặn). Thắng (kết thúc): Ông Kẹ sống VÀ mọi người sống khác chưa TỪNG thức đêm (`everWoke` rỗng giao sống) → `bogeyman`. Chặn kết thúc Dân-thắng khi Ông Kẹ còn sống và điều kiện của ông chưa quyết định (GIẢ ĐỊNH). Không tính chính ông trong everWoke. |
| blob (Chất nhày) | Phe `independent`. Mỗi đêm bắt buộc bước `blob`: `invade { target }` — ứng viên DUY NHẤT do engine tính: láng giềng sống gần nhất theo chiều kim đồng hồ (thứ tự danh sách) tính từ Blob, bỏ người đã xâm lấn và bỏ chính Blob. Người bị xâm lấn được private event (biết mình bị xâm lấn — GIẢ ĐỊNH), không hiệu ứng khác. Thắng (kết thúc): Blob sống VÀ mọi người sống khác đều đã bị xâm lấn → `blob`. |
| zombie (Zombie) | Phe `independent`. Mỗi đêm bắt buộc bước `zombie`: `eat { target }` — người sống khác chưa bị ăn não. Người bị ăn não: mất quyền vote (hiển thị sổ tay + private event; không enforce — phiếu ngoài app), vẫn sống bình thường. Thắng (kết thúc): Zombie sống VÀ mọi người sống khác đều bị ăn não → `zombie`. Chặn kết thúc Dân-thắng khi Zombie sống và chưa ăn não hết người sống khác (GIẢ ĐỊNH). |
| dracula (Bá Tước Dracula) | Phe `independent`. Mỗi đêm bắt buộc bước `dracula`: `wed { target }` — người sống khác, chưa là vợ. Vợ: private event, vẫn sống/ playing bình thường, không đổi phe. Thắng (kết thúc): Dracula sống VÀ ≥3 vợ còn sống → `dracula`. Không kết thúc sớm. |
| bloody_mary (Bloody Mary) | Phe Dân khi sống. Khi chết: xác định `grudge` theo nguyên nhân: `bite` → chống Sói; `drained` → chống Ma cà rồng; còn lại (verdict, poison, shot, explosion, heartbreak, companion, fear, sacrifice, penalty, bogeyman, haunted, chupacabra, revealed, hunted, missing) → chống Dân (GIẢ ĐỊNH gộp). `killerId` ghi khi nguyên nhân có chủ thể đơn: poison (Phù thủy), shot (Thợ săn), penalty (không chủ thể), còn lại null. Từ đêm sau khi chết: bước `bloody_mary` (actor là người đã chết) — bắt buộc chọn 1 người sống thuộc phe bị trừng phạt; nếu killerId còn sống thì ĐÊM ĐẦU bắt buộc chọn killerId (GIẢ ĐỊNH "bắt đầu từ người giết mình" chỉ khi biết đích danh). Tại resolve: target chết `haunted` (blessed chặn). Thắng (điều chỉnh khi kết thúc, không hòa): grudge là 'wolves' và winner không thuộc phe Sói → `bloody_mary`; grudge 'village' và winner không phải Dân → `bloody_mary`; grudge 'vampires' tương tự. Nếu phe bị trừng phạt thắng thì cô ta thua. |
| gọn nhóm ưu tiên | Thứ tự ưu tiên ghi đè khi kết thúc: hoodlum → bloody_mary → nostradamus. GIẢ ĐỊNH. |

## 5. Đổi vai và đa năng lực (Đợt 5)

| Vai | Hợp đồng |
|---|---|
| drunk (Say rượu) | Phe Dân, không kỹ năng đêm 1–2; Tiên tri thấy Dân (đúng mặc định vì role drunk không phải Sói). Đêm 3 bước `drunk`: quản trò bấm physically rút bài rồi gửi `drawRole { playerId, role }` (chỉ quản trò, chỉ ở bước drunk, chỉ cho người drunk sống). Engine đổi `role`, cấp tài nguyên theo vai mới (witch: heal=1/poison=1; hunter: shot=1; các vai khác 0), refreshTeams, private event "Vai thật của bạn là X", moderator log. Nếu vai mới là dire_wolf/virginia_woolf: deathBond null → sẽ có bước chọn liên kết ở đầu đêm kế. Nếu wolf: tham gia bầy từ lượt sau (knownWolves seed khi wake). Nếu alpha_wolf: alphaUsed=false như mới. Nếu priest/PI/huntress: các vai một lần chưa dùng (thêm vào spentPowers rỗng). Aura thấy drunk CÓ năng lực từ đầu (GIẢ ĐỊNH). Mystic thấy 'drunk' rồi thấy vai mới sau khi đổi. |
| bigfoot (Chân to) | Ban đầu phe Dân, không kỹ năng đêm. Tiên tri soi ra SÓI (seenAsWolf). Aura: có năng lực. Khi một ngày kết thúc bằng phán quyết KHÔNG loại ai (skip verdict hợp lệ, kể cả dùng ngân sách): nếu Chân to sống và chưa đổi phe → đặt cờ `angry`. Tại nextNight kế tiếp: role đổi thành `wolf` (tham gia đầy đủ bầy: thức, cắn, chat, parity; knownWolves seed khi wake; refreshTeams; event moderator-only + private cho người đó "Bạn quá tức giận và đã gia nhập Phe Sói"). GIẢ ĐỊNH: đổi ở nextNight ("ngày hôm sau"), chỉ một lần. |
| frankenstein (Frankenstein's Monster) | Phe Dân. Khi một vai trong tập NĂNG LỰC CHUYỂN ĐỔI ĐƯỢC chết: `['seer','guard','witch','aura_seer','mystic_seer','mentalist','paranormal_investigator','priest','huntress','old_hag','spellcaster']` — Frankenstein thêm quyền đó (GIẢ ĐỊNH giới hạn tập này: chỉ năng lực ban đêm chủ động của phe Dân; loại Sói/biến thể, passive, third-party, ghost/insomniac…). Witch: nhận số thuốc CÒN LẠI của Phù thủy chết; hunter shot KHÔNG chuyển (GIẢ ĐỊNH); priest/PI/huntress/old_hag/spellcaster: trạng thái chưa dùng kế thừa (nếu chủ cũ đã dùng thì không có gì để nhận — quyền chỉ chuyển khi còn "chưa dùng": priest chưa bless, PI/huntress chưa dùng, old_hag/spellcaster là quyền hàng đêm luôn chuyển). Khi đến bước của vai đã chết mà KHÔNG còn ai sống giữ vai đó: Frankenstein là actor của bước đó (một người duy nhất; nếu Frankenstein có nhiều quyền → nhiều bước). Lệnh/validate/projection dùng đúng form của vai gốc; witch của Frankenstein dùng healableBites/witchSeesBite như thường. Khi Frankenstein chết: mất hết quyền (không ai kế thừa tiếp — quyền không truyền qua Nhân bản; GIẢ ĐỊNH: Nhân bản nhận vai frankenstein chỉ nhận quyền đã tích lũy như dữ liệu vai? → quyết định: KHÔNG chuyển frankPowers qua Nhân bản, ghi rõ). Không tự đẩy bước; các bước vẫn theo NIGHT_STEPS với điều kiện actor. |

## 6. Thứ tự bước đêm v13

Mở đầu đêm 1: cupid → doppelganger → mason → minion → beholder → count → nostradamus → hoodlum → dire_wolf → virginia_woolf → (bước nền).

Đêm thường: guard → seer → aura_seer → mystic_seer → mentalist → paranormal_investigator → priest → sorceress → old_hag → spellcaster → wolves → leprechaun → alpha_wolf → witch → vampire → chupacabra → huntress → revealer → cult_leader → blob → zombie → dracula → mummy → troublemaker → the_thing → bogeyman → insomniac → ghost → bloody_mary → drunk (chỉ đêm 3) → review.

Bước không có actor được bỏ qua như hiện tại. `NIGHT_STEPS` gồm mọi bước, lọc khi advance như hiện nay.

## 7. Projections và bảo mật

- playerView thêm: `cultMember`, `blessed` (chỉ chính mình), `invadedByBlob` (chỉ chính mình), `brainEaten` (chỉ chính mình), `bride` (chỉ chính mình), `silencedToday` (chỉ chính mình), `absentToday` (công khai qua public view), `dayAbsentId` (public), danh sách `mummyTarget`/`daySilencedId` CHỈ moderator view (moderatorView clone full Game nên tự có). Leprechaun khi là lượt thấy `biteTargets` (private view mở rộng điều kiện hiện tại). Bàn phụ trách từng vai không rò kết quả trước publish (review vẫn che).
- publicView thêm `dayAbsentId` (nhãn vắng mặt). Không thêm gì khác.
- Chat chỉ Sói (giữ nguyên); minion/sorceress KHÔNG chat.
- Các event private mới: mason-brothers, minion-pack, sorceress-result, pi-result, insomniac-result, count-info, beholder-seer, recruit, bride, brain-eaten, invaded, silenced, feared-tap (the_thing), note (moderator), predictions (moderator), hoodlum-marks (moderator), wolverine-clink (moderator), chupacabra-missed (moderator), transformed messages, drunk-revealed.

## 8. Offline một máy (tối giản)

- Bước có kết quả cần xác nhận (popup "Đã rõ · Vai tiếp") mở rộng: seer, aura_seer, mystic_seer, mentalist + paranormal_investigator, sorceress, insomniac, count, beholder, mason, minion. Các bước chọn (old_hag, spellcaster, vampire…) nhập trực tiếp như guard. `pass`/`disrupt`/`redirect pass` có nút xác nhận riêng trong form.
- drawRole: form chọn vai cho quản trò ở bước drunk (online: lệnh quản trò; offline: mutation thường).
- penalty: nút ở màn ngày (cả online lẫn offline) — menu nhỏ chọn người + xác nhận.

## 9. Ví dụ kiểm thử độc lập (mỗi vai ít nhất 1, các cụm dưới đây bắt buộc)

1. Mason ×2 đêm 1: A, B thấy nhau; người thứ ba không nhận event.
2. Minion + 2 Sói: minion biết 2 Sói; Sói biết minion; Sói không cắn được minion; Tiên tri soi minion → Dân; 2 Sói chết → Dân thắng dù minion sống.
3. Sorceress: chỉ đúng 'seer' hiện tại (tập sự thăng cấp → isSeer=true).
4. PI: chọn target Dân nhưng kề Sói → isWolf=true; pass đêm 1, dùng đêm 2, đêm 3 không còn bước.
5. Insomniac: láng giềng Bảo vệ đã gửi → woke=true; láng giềng Dân → false; sau khi Bảo vệ chết, ghế trống nhảy cóc không tính là láng giềng (dùng living neighbors).
6. Ghost: đêm 1 note OK rồi chết 'missing' trong công bố đêm 1; đêm 2 vẫn gửi note; note chứa tên → từ chối; note không tốn lượt ai khác.
7. Old Hag: chọn X → sáng hôm sau X có nhãn vắng; verdict chọn X → ABSENT_EXCLUDED; đêm sau chọn Y → X hết vắng.
8. Spellcaster: X bị câm — private cho X, moderator thấy, công khai không thấy.
9. Priest: bless X → X bị cắn + độc cùng đêm vẫn sống; X bị vote → chết; cắn X sau bless không tạo vết thương/hóa Sói; Phù thủy không thấy X trong nạn nhân.
10. Huntress: pass đêm 1; đêm 2 bắn Y → Y chết 'hunted' tại resolve, dây chuyền tình nhân chạy; đã dùng thì hết bước.
11. Revealer: chỉ Sói → Sói chết; chỉ Dân → revealer chết; blessed cả hai phía đều sống.
12. Leprechaun: đổi nạn nhân A → láng giềng B chết thay; Alpha chọn từ danh sách mới; hai nạn nhân (thưởng Sói con) → không thể redirect (bắt buộc pass).
13. Vampire: chọn nạn nhân; ngày vote xong → nạn nhân chết 'drained' công bố; ván kết thúc ở công bố (Sói thắng) thì nạn nhân không chết; Sói không cắn được vampire; vampire +1 người sống → vampires thắng.
14. Chupacabra: chọn Dân khi còn Sói → không chết, không feedback; chọn Sói → chết; hết Sói → chọn ai cũng chết; một mình → thắng; khi còn sống chặn "Dân thắng".
15. The Thing: tap trái/phải → target nhận tin, không lộ danh tính.
16. Troublemaker: disrupt → ngày sau có 2 phán quyết; hai skip vẫn trừ ngân sách 2; skip=0 + disrupt → 2 lượt bắt buộc chọn người.
17. Mummy: chọn X → sổ tay hiện; reset đêm sau.
18. Wolverine: bầy 3 Sói + wolverine, nạn nhân gần wolverine nhất → clink; nạn nhân gần Sói khác → không; hòa khoảng cách → clink (GIẢ ĐỊNH).
19. Teen wolf: penalty loại; death 'penalty' công bố, dây chuyền tình nhân chạy; penalty KHÔNG mở Alpha (không phải chết do kỹ năng Sói? — GIẢ ĐỊNH: penalty không phải "chết Sói ban ngày" kích hoạt Alpha vì không do làng săn Sói; ghi rõ) — quyết định: penalty CÓ mở Alpha nếu người chết là Sói thật (đơn giản hóa: mọi cái chết Sói ban ngày mở Alpha). Chọn phương án cuối: penalty mở Alpha. Test ghi rõ.
20. Lone wolf: 1 lone + 1 Dân → parity bỏ qua, đêm sau lone cắn Dân → lone thắng ('wolves'); lone + Sói thường + 2 Dân → parity bình thường.
21. Cult: recruit tới khi mọi người sống trong giáo phái → 'cult' thắng ngay tại công bố; leader chết trước đó → không thắng.
22. Hoodlum: marks chết hết + hoodlum sống; khi Dân thắng đồng thời → winner 'hoodlum'.
23. Tanner: bị vote → ván kết thúc 'tanner'; bị bom khi bom nổ cùng đợt với Sói cuối → 'tanner' (ưu tiên trước Dân).
24. Nostradamus: đoán Dân, Dân thắng, nostradamus sống → 'nostradamus'; chết trước đó → winner thường.
25. Bogeyman: đêm bệnh bầy → chọn nạn nhân chết 'bogeyman'; mọi vai từng thức chết hết, còn Dân + Ông Kẹ → 'bogeyman'; còn Tiên tri sống → chưa thắng.
26. Blob: xâm lấn tuần tự đúng chiều; người chết bị bỏ qua; tất cả sống bị xâm lấn → 'blob'.
27. Zombie: ăn não mất quyền vote (hiển thị); hết người sống chưa ăn → 'zombie'; chặn Dân thắng.
28. Dracula: 3 vợ sống sau một đợt xét → 'dracula'; vợ chết → dưới 3 không thắng.
29. Bloody Mary: bị Sói cắn chết → đêm sau cắn từng Sói; bị vote → chống Dân; killerId (Phù thủy độc) đêm đầu bắt buộc chọn Phù thủy nếu còn sống; thắng khi phe đối lập thắng.
30. Drunk: đêm 1,2 không bước; đêm 3 drawRole 'witch' → có heal/poison, bước witch hoạt động; drawRole ngoài bước drunk → từ chối; drawRole role không hợp lệ → từ chối.
31. Bigfoot: skip ngày → angry; nextNight → role 'wolf', bầy thấy anh ta; Tiên tri soi trước/sau đổi; lovers team tính lại.
32. Frankenstein: Phù thủy chết còn 1 độc → Frankenstein có độc; bước witch → Frankenstein hành động; Tiên tri chết → bước seer → Frankenstein soi; Frankenstein chết → mất hết; Nhân bản nhận vai Frankenstein → không nhận frankPowers.

## 10. Câu hỏi còn mở cho người dùng (không chặn triển khai, đã chọn mặc định)

1. Chia nửa làng của Bá Tước khi số người chẵn — nửa "trước" nhận người dư (đã chọn).
2. Wolverine hòa khoảng cách có kêu không — đã chọn CÓ.
3. Sói Tuổi Teen vi phạm bị `penalty` có mở điều kiện Alpha — đã chọn CÓ.
4. Ưu tiên thắng ghi đè hoodlum → bloody_mary → nostradamus — đã chọn.
5. Frankenstein không nhận hunter shot, không nhận quyền phe Sói — đã chọn.
6. Drunk rút bài do quản trò nhập kết quả (bài ngoài app) — đã chọn.
