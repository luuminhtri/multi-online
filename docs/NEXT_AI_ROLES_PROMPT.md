# Prompt bàn giao: hoàn thiện luật cho 64 vai Ma Sói

Copy nội dung bên dưới làm yêu cầu cho AI tiếp theo. Thông tin đối chiếu ngày 2026-10-27; AI phải kiểm lại code tại thời điểm bắt đầu.

---

Ứng dụng Ma Sói của tôi đã deploy và đang được test thực tế. Nhiệm vụ của bạn là kiểm tra độ ổn định bản hiện tại, làm rõ số vai đang hỗ trợ, rồi phát triển đầy đủ các vai còn thiếu; kiểm thử kỹ và phản biện qua nhiều vòng. Hãy thực hiện công việc, không chỉ trả về kế hoạch hoặc danh sách đề xuất.

## 1. Làm việc độc lập với bản tôi đang test

- Repo: /Users/yennhi/LMT/ma-soi-app/multi-online. Đây là Git root của repo luuminhtri/multi-online, không phải thư mục cha ma-soi-app. Không sửa app cũ/thư mục nguyet-anh.
- Tôi có thể tiếp tục sửa code trong lúc bạn làm. Đọc git status/diff và tài liệu trước; không reset/clean/ghi đè hoặc tự commit các thay đổi của tôi.
- Dùng worktree và nhánh riêng. Đảm bảo điểm xuất phát có các thay đổi gameplay mới nhất cần thiết; đừng âm thầm lấy HEAD cũ và bỏ sót sửa đổi chưa commit. Nếu có thay đổi chưa commit, sao chép an toàn vào bản làm việc riêng hoặc hỏi đúng phần không thể xử lý an toàn, đồng thời tiếp tục phân tích độc lập.
- Chạy server thử ở cổng riêng, dùng kho dữ liệu thử riêng. Không dừng/restart server tôi đang dùng, không ghi .local-rooms của bản đang test, không dùng chung database cloud thật.
- Không sửa .env.local, đọc/in secret, kết nối tài khoản Supabase/Vercel thật, chạy migration cloud, push, merge hoặc deploy khi chưa được tôi yêu cầu riêng.
- Không tự thiết kế lại giao diện hiện tại. Chỉ bổ sung điều khiển/hiển thị thực sự cần cho vai mới, giữ bố cục mobile đã có.

## 2. Đọc và xác minh hiện trạng trước khi sửa

Đọc AGENTS.md, README.md và các tài liệu:
- docs/STATUS.md, PRODUCT.md, DECISIONS.md, DEFAULT_RULES.md, GAME_FLOW.md.
- docs/RULE_ENGINE.md, ROLE_COVERAGE.md, CARD_DATA.md, ENGINE_GUIDE.md, ONLINE_SETUP.md.
- Các skill và hướng dẫn repo áp dụng cho công việc. Khi thay API, tuân theo postman/skills/api-builder/SKILL.md: hợp đồng trước, lint/test local, không tự publish.

Đối chiếu code thực tế:
- src/engine/: types, rules, engine, role-policy, wolf-pack, witch, views.
- src/catalog/: roles, descriptions, images.
- src/server/: rooms, validation, types, repositories, http.
- src/offline/table.ts, src/offline/build.ts, src/shared/random-id.ts.
- src/online/main.ts, src/online/style.css, src/online/target-picker.ts, src/online/presentation.ts, tests/, scripts/, supabase/migrations/.
- cards.json, response.html và audit nguồn.

Một số tài liệu có các đoạn lịch sử đã cũ. Quyết định mới nhất của người dùng là yêu cầu sản phẩm; code là bằng chứng hiện trạng, không phải bằng chứng rằng mọi luật đang code đều đúng. Khi phát hiện mâu thuẫn, ghi rõ và xử lý có căn cứ.

Mốc đã xác minh gần nhất:
- Dữ liệu nguồn: 64 vai riêng trong 9 nhóm, catalog source-map-v2, ánh xạ 1–1.
- Engine: 27 vai đã có core/test; classic-core-v13, Game schemaVersion=8. Room online schema=4; document lưu bàn offline có version riêng=1.
- Dispatch/đọc phòng giữ các cặp legacy v8/3, v9/4, v10/5, v11/6, v12/7 và v13/8. Không đổi luật của ván đã lưu.
- Hướng stack: TypeScript core + Vite, Node API /api/room, Vercel + Supabase. Phòng online dùng server quyết định; một máy offline dùng cùng core và lưu trình duyệt.
- Production đang chạy tại https://multi-online.vercel.app với Supabase. Đã kiểm tạo/join/reload và hai chế độ Thợ săn qua API thật; chưa nghiệm thu trọn ván trên nhiều điện thoại vật lý. Đây là bản người dùng đang chơi/test, không phải môi trường thử của bạn.
- Các commit gần nhất cần có trong baseline: 3aae288 (Thợ săn và avatar), 5aea8c0 (mục tiêu đơn gọn), d905db6 (Singapore + trạng thái gửi), 6f8ccd8 (không để poll cũ đè ACK mới). Kiểm HEAD thực tế, không reset về các commit này nếu đã có thay đổi mới hơn.
- Lần kiểm gần nhất: 225 Node tests đạt trước sửa độ trễ; sau sửa độ trễ, 16 test rooms/boundaries và build đạt. Postman Thợ săn: 46 requests/50 assertions/0 failures; Postman mã phòng: 5 requests/9 assertions/0 failures. Đây là bằng chứng lịch sử có phạm vi, không phải baseline của phiên bạn.
- Vercel Function phải giữ sin1 (Singapore), cùng vùng Supabase. Trước sửa API chạy iad1 (Mỹ), trung vị 3 lượt create 1420ms/read 1126ms/write 1437ms; sau sửa 260ms/144ms/342ms. Một write sau sửa vẫn 835ms. Xem docs/verification/latency-before.json, latency-after.json nếu có trong working tree; không coi vài mẫu là SLA/p95.
- Có thể còn docs/STATUS.md, docs/ONLINE_SETUP.md, docs/NEXT_AI_ROLES_PROMPT.md và hai JSON đo tốc độ chưa commit. Giữ nguyên và mang theo tài liệu liên quan vào workspace riêng an toàn. Không copy .env.local/secrets sang worktree.

Tự đếm lại vai và chạy baseline. Không lấy số test thành công trong lịch sử làm kết quả của lần làm việc này.

## 2A. Ưu tiên ổn định và làm rõ sản phẩm trước khi mở rộng

1. Audit một ván online nhiều danh tính từ lobby → lưu bộ vai → chia → ready/begin → gọi vai/thức → hành động/xác nhận → resolve/publish → phán quyết/ngày mới → thắng. Tái hiện lỗi thật trước khi sửa. Không dùng một tab debug như bằng chứng thay cho nhiều client độc lập.
2. Kiểm mạng chậm, mất ACK sau khi server đã lưu, retry cùng requestId, reconnect, form cũ, CAS đồng thời, chuyển người sang dùng máy quản trò và reload. Không suy từ số test xanh rằng hệ thống đã ổn định.
3. Sửa nhãn dễ hiểu nhầm: hiện 27 vai được hỗ trợ, 64 vai trong nguồn. “Toàn bộ vai trong game” không được làm người chơi tưởng 64 vai đều đã chạy. Phân biệt danh sách vai của ván và thư viện vai thực sự hỗ trợ, đồng thời giữ thao tác gọn. Nếu hiện vai chưa hỗ trợ thì phải ghi rõ và không cho chọn chia bài.
4. Lập tiêu chí đo độ trễ và đồng bộ giữa máy. Hiện poll khoảng 1,5s; phân biệt thời gian ACK của người gửi với thời gian máy khác nhìn thấy thay đổi. Đánh giá cải tiến theo bằng chứng và giới hạn tài nguyên, không chỉ giảm chu kỳ poll xuống mức rất thấp. Chỉ bổ sung cơ chế thông báo tức thời nếu thiết kế vẫn giữ bí mật vai, kiểm quyền, reconnect, ván offline và chạy đúng trên Vercel. Không bật client đọc trực tiếp document phòng, tắt RLS, đưa secret lên trình duyệt hoặc tự thêm dịch vụ/phí mới.
5. Các việc trên là một đợt hoàn chỉnh đầu tiên với test và phản biện; sau đó tiếp tục phần còn lại tới mục tiêu 64 vai, không dừng ở một báo cáo audit.

## 3. Phạm vi vai còn thiếu

Đối chiếu lại danh sách sau với ROLE_CATALOG và ROLES trước khi bắt đầu:

ghost, idiot, mason, mayor, old_hag, pacifist,
paranormal_investigator, priest, spellcaster, troublemaker,
minion, sorceress, lone_wolf, drunk,
cult_leader, hoodlum, tanner, vampire, wolverine,
revealer, huntress, bigfoot, nostradamus, bloody_mary,
leprechaun, chupacabra, beholder, count, insomniac,
the_thing, bogeyman, frankenstein, blob, zombie,
dracula, mummy, teen_wolf.

Mục tiêu là hỗ trợ đầy đủ cả 64 vai nguồn, không chỉ thêm tên vào catalog, enum hoặc trả kết quả giả. Nếu vai đã được người khác triển khai sau mốc bàn giao, review và tiếp tục từ hiện trạng mới, không làm lại mù quáng.

## 4. Những quyết định sản phẩm phải giữ

- Chơi trực tiếp; người chơi dùng điện thoại hoặc dùng máy quản trò. Không xây game chơi từ xa/native app.
- Phiếu ban ngày diễn ra ngoài app, quản trò nhập phán quyết. Không tự thêm hệ thống bỏ phiếu trên điện thoại. Với vai tác động phiếu, mô hình hóa quyền/trọng số/ràng buộc và thao tác quản trò tối thiểu cần để luật thực thi đúng.
- Giữ đồng hồ 4 pha ban ngày do quản trò bấm, giới hạn tổng số ngày được không loại ai, mặc định UI skip=0.
- Phù thủy thấy nạn nhân mặc định tắt trên UI; bật lại được trước chia vai. Luật bảo vệ/thuốc và snapshot cũ giữ đúng phiên bản.
- Thợ săn v13 là yêu cầu người dùng đã chốt, không khôi phục luật cũ từ Description của thẻ: mặc định BẮN BỊ ĐỘNG, gọi mỗi đêm ghim một người khác còn sống; chết trong đêm vì bất kỳ nguyên nhân nào thì kéo người ghim đêm đó chết theo, chết ban ngày không kích hoạt. Ghim hết hạn qua đêm mới.
- Bật BẮN CHỦ ĐỘNG thay thế bị động: một phát cả ván, có thể giữ lại; mục tiêu chết, nếu thuộc phe Sói thật lúc chốt thì riêng phát bắn không giết Thợ săn, nếu bắn sai thì cả hai chết. Không miễn các nguyên nhân chết khác cùng đêm. Không gọi bắn tiếp khi hết đạn, không nạp lại đạn qua Nhân bản. Bảo vệ/thuốc cứu không chặn phát bắn. Chốt lựa chọn ở lượt đêm, tổng kết đợt chết trước công bố/xét thắng. Không còn cài đặt tên “bắn công khai”. Ván v12 trở về trước giữ bắn phản ứng sau chết theo version riêng.
- Người dùng đã yêu cầu chọn mục tiêu đêm bằng avatar, không quay lại dropdown. Giữ nút Xác nhận, slot riêng cho nhiều mục tiêu/thuốc, lựa chọn không dùng theo từng vai. Viền vàng là mục tiêu, đỏ là đồng đội Sói sống mà pack projection cho phép biết khi Sói thức. Không suy ra bầy từ dữ liệu bí mật quản trò rồi gửi xuống người chơi.
- Chuyển một người sang Offline chỉ đổi thiết bị điều khiển, không làm họ tối như người chết; avatar chưa ready vẫn sáng, có dấu xác nhận riêng. Rút khỏi bàn là hành động khác.
- Trạng thái “đang gửi” không phải thất bại; chỉ hiện thử gửi lại sau khi chưa nhận ACK. Retry giữ requestId/capability. Không bỏ ACK/idempotency để giao diện có vẻ nhanh, không tạo kết quả lạc quan giả cho hành động bí mật. Giữ guard readSequence để response poll cũ không đè snapshot ACK mới; thành công không cần GET dư ngay sau đó. Timeout client hiện 12s để bao phủ hai upstream call 5s.
- Giữ chat đêm đúng người được nhận, vai Sói ngủ không được nhận lén dữ liệu mới. Tách phe thật, kỹ năng, kết quả soi và quyền biết bầy.
- Thông tin công khai chỉ hiện sau đúng mốc công bố. Không gửi bí mật xuống client rồi ẩn bằng CSS.
- Mã phòng mới là 6 chữ số, vẫn đọc mã chữ cũ. UUID nội bộ không phải mã phòng.
- Dùng chung máy: player projection riêng, proxy có kiểm quyền; chuyển offline/rút người và ready/begin đang có. Rút người là thao tác quản trị riêng, không tự kích hoạt chết dây chuyền.
- Offline một máy có chế độ tối giản: quản trò nhập trực tiếp, không wake thủ công/đợi từng Sói đồng thuận, nhưng xử lý cùng luật core. Không loại vai ngủ khỏi luật chỉ vì đang offline.
- Giữ nhận vai kín, popup Tiên tri xác nhận, gọi lượt toàn màn hình, lịch sử Đêm/Sáng, sổ tay ba tab, danh sách vai của ván cho người chơi ngay trước chia (sau khi quản trò lưu bộ vai), Thoát phòng/lưu lại, cache offline và random-id fallback cho HTTP.
- Mô tả hiển thị giữ nguyên Description trong cards.json. Không sửa hàng loạt cards.json/HTML nguồn hoặc viết lại mô tả cho hợp code. Không thêm vai ngoài 64 mục nguồn.

## 5. Chốt hợp đồng luật, không đoán từ tên vai

Lập bảng cho từng vai trước khi viết implementation:
1. ID, nguồn mô tả cụ thể; đâu là luật có bằng chứng, đâu là giả định/biến thể dự án.
2. Phe ban đầu, phe sau chuyển hóa, kết quả các kiểu soi, danh tính được biết.
3. Bước hành động, thứ tự, ai được hành động, hành động sau chết nếu vai cho phép.
4. Mục tiêu hợp lệ, tự chọn, ghế/kề nhau, mục tiêu cũ, số người và cấu hình bộ vai hợp lệ.
5. Tài nguyên/tần suất, thời điểm tiêu hao, bị chặn/thất bại/bỏ lượt.
6. Thời điểm giải quyết, công bố, hết hạn, ngủ/câm/khóa kỹ năng.
7. Cái chết, dây chuyền, kế thừa, đổi vai/phe, tương tác với vai cũ và vai mới.
8. Điều kiện thắng, thời điểm xét, thắng đồng thời/ưu tiên/hòa; cả trường hợp người chết có mục tiêu thắng riêng.
9. Hành vi online và offline, dữ liệu public/private/moderator, lệnh quản trò nếu cần.
10. Các ví dụ với đầu vào và kết quả mong đợi có thể kiểm thử độc lập.

Không coi nhóm trong cards.json tự động quyết định phe hoặc mọi vai tên Sói đều là Sói thật. Không gom tất cả phe thứ ba thành một đội cùng thắng. Không dùng hasSpecialAbility/isWolf thay cho mọi chính sách soi và chiến thắng.

Nếu nguồn mơ hồ hoặc có nhiều biến thể, tra cứu bằng nguồn phù hợp khi cần và ghi rõ khác biệt. Được đề xuất mặc định nội bộ nhất quán, nhưng phải gắn nhãn giả định, giải thích, ghi trong DEFAULT_RULES/DECISIONS và có test; không tuyên bố là luật chính thức. Chỉ hỏi tôi khi quyết định còn thiếu làm thay đổi lớn cách chơi; gom câu hỏi và vẫn tiếp tục phần độc lập.

Các tương tác vật lý/xã hội không thể tự phát hiện bằng app phải có hướng dẫn và mốc quản trò xác nhận có nhật ký, với giới hạn ghi rõ. Không dùng một nút xác nhận để thay thế logic xác định mà engine có thể thực hiện.

## 6. Triển khai theo phụ thuộc, hoàn tất từng đợt

- Audit baseline và lập ma trận phủ trước, rồi thực hiện các đợt nhỏ có thể review. Chọn thứ tự dựa trên phụ thuộc thực tế: thông tin/quan hệ → hiệu ứng ngày/đêm → phe và chiến thắng riêng → đổi vai/nhiều năng lực. Có thể điều chỉnh nếu kết quả audit cho thấy cần thiết.
- Một đợt phải đi từ luật → core → validation/projection → online/proxy/offline → UI tối thiểu → tests → review → tài liệu. Không để một loạt vai chỉ có core nhưng chưa chơi được.
- Đặc biệt review cấu hình bộ vai, vai cho phép nhiều người như nhóm nhận biết nhau, lịch gọi vai, hành động sau chết, chuyển hóa và chiến thắng nhiều bên. Không giữ các giả định chỉ có hai phe hoặc chỉ có một người thắng nếu chúng không còn đúng.
- Ưu tiên refactor có phạm vi để mở rộng policy/effect pipeline; không viết lại toàn bộ engine đang chạy khi không có bằng chứng cần thiết.
- Khi thay luật/persisted schema, tăng version phù hợp và chuẩn bị xử lý tương thích/migration có test. Rà mọi nơi kiểm RULES.version/schema: dispatch, chat, clock, RoomService, validators, projections, offline saves và SQL. Đừng bump version rồi vô tình khóa chat/đồng hồ của ván v13 trở về trước.
- Giữ retry idempotent và nguyên tử. Không tiêu tài nguyên hai lần, không áp dụng nửa đợt khi một actor/đích không hợp lệ, không rút ngẫu nhiên lại khi retry. Ngẫu nhiên ảnh hưởng luật phải lưu đủ để tái hiện.
- Vai mới cần form/hiển thị tương ứng và cache ảnh offline. Kiểm MIME/nguồn ảnh thực tế; đừng giả định ảnh mới đều đúng định dạng mà bỏ qua lỗi cache.
- Chỉ đánh dấu supported/implemented khi đạt tiêu chí nghiệm thu bên dưới.

## 7. Kiểm thử theo kết quả mong đợi

Trước sửa, chạy typecheck, toàn bộ Node tests, test:data và build trong workspace riêng. Mọi lỗi sẵn có phải ghi riêng với bằng chứng; không đổ lỗi cho code cũ khi chưa tái hiện.

Mỗi vai mới cần test có ý nghĩa cho happy path và các biên thực sự liên quan:
- Hành động đúng/sai bước, sai người, mục tiêu chết/rút/không hợp lệ, tự chọn, gửi trùng, request ID đổi nội dung, form cũ.
- Tài nguyên/lần dùng/thời điểm tiêu hao và hiệu ứng bị chặn.
- Chết đồng thời, dây chuyền/vòng lặp, kế thừa, chuyển vai, ngủ, hết hạn qua nhiều ngày.
- Thắng riêng/thắng đồng thời/ưu tiên/hòa và mốc công bố.
- Public/player/moderator projections, người không được nhận, mục tiêu hợp lệ và lỗi trả về có làm lộ vai không.
- Local offline tối giản, dùng chung máy, reload/khôi phục, lưu thất bại/rollback và ván legacy.

Với tương tác rủi ro, tạo ma trận giữa vai mới với Bảo vệ, thuốc cứu/độc, Thợ săn, tình nhân, Bom, Nhân bản, Tiên tri tập sự, Alpha, Kẻ bị nguyền, Sói ngủ, bệnh bầy và phe thắng riêng. Mở rộng tương tác giữa các vai mới theo từng đợt.

Với không gian hữu hạn nhỏ, dùng kiểm thử tổ hợp/vét cạn. Với chuỗi lớn, dùng kịch bản nhiều đêm và sinh tình huống có seed để tái hiện. Invariants phải xét ngoại lệ hợp lệ của từng vai: không xử lý một người chết lặp vô hạn, không nhân đôi tiêu hao/kết quả do retry, không lộ kết quả trước công bố.

Không viết expected bằng cách gọi lại chính hàm implementation đang kiểm. Không sửa expected hàng loạt bằng regex chỉ để suite xanh. Test cũ chỉ đổi khi hợp đồng luật đã đổi rõ ràng; phải giữ test cho phiên bản cũ.

Kiểm qua HTTP và browser cho tính năng có triển khai tương ứng, không chỉ gọi thẳng hàm. Khi đổi API, cập nhật OpenAPI/Postman theo skill repo. Kiểm UI ở 320×568 và 390×844, nhiều danh tính, quyền, reconnect; báo rõ phần chỉ giả lập và phần đã bấm thật. Test bằng Node 24 LTS khi có thể vì Vercel dùng major này; không ghi đã test Node 24 nếu thực tế chỉ dùng Node 26.

## 8. Phản biện ít nhất ba vòng cho mỗi đợt

Tôi cho phép dùng sub-agent/reviewer độc lập nếu môi trường hỗ trợ. Chia quyền file rõ ràng, không để nhiều agent ghi đè cùng file. Ưu tiên reviewer độc lập với người viết implementation.

Vòng A — trước code: phản biện hợp đồng luật, nguồn, giả định, thứ tự và các phản ví dụ. Chốt kết quả mong đợi rồi mới implement.

Vòng B — sau core/integration: reviewer đọc code và tự tìm phản ví dụ, kiểm lỗi phân quyền/rò thông tin, xử lý đồng thời, phụ thuộc phe và thắng; không chỉ tin test của người viết. Với lỗi tìm được, thêm test tái hiện rồi sửa.

Vòng C — sau sửa: review lại diff và chạy regression/integration/UI, tập trung trường hợp bị bỏ quên và bug do bản sửa gây ra. Có review xuyên các đợt trước khi coi toàn bộ 64 vai hoàn tất.

Lặp lại khi còn phát hiện ảnh hưởng tính đúng đắn; không chỉ đủ ba lần là dừng. Không nghiệm thu khi còn lỗi luật, rò thông tin, mất dữ liệu hoặc sai tương thích đã biết. Findings cần mức độ, file/dòng, tình huống tái hiện, expected/actual và cách xử lý. Nếu không có agent độc lập, nói rõ giới hạn và thực hiện ba lượt tự phản biện bằng checklist tách biệt; không giả vờ đã có người review.

## 9. Cập nhật tiến độ và tiêu chí hoàn thành

Sau mỗi đợt cập nhật ROLE_COVERAGE, DEFAULT_RULES, DECISIONS, GAME_FLOW và STATUS. Ghi số vai thực sự playable, phần còn thiếu, giả định, lỗi đã tìm/sửa, lệnh test và kết quả thực tế, hạn chế chưa kiểm. Có thể lưu ma trận/review vào docs/verification. Đừng chỉ báo một con số test xanh.

Một vai hoàn tất khi luật được ghi rõ, core xử lý thật, validation/permissions/projections đúng, chơi được trong online và offline theo phạm vi của nó, có test biên/tương tác/thắng, đã qua các vòng review, và ảnh/mô tả/điều khiển cần thiết có trong app.

Tiếp tục qua các đợt cho tới khi đạt 64/64 vai theo tiêu chí trên, đồng thời không đánh mất luồng chơi thật, độ riêng tư và khả năng khôi phục của bản đang có. Nếu còn vai bị chặn bởi một quyết định chưa thể xác minh, phải nêu chính xác vai, câu hỏi và bằng chứng; không gọi stub hoặc vai chỉ hiện tên là hoàn tất. Không dừng ở đợt đầu rồi hỏi có muốn làm tiếp; mục tiêu toàn bộ đã được giao. Không tuyên bố hoàn hảo hay đã kiểm cloud khi chưa thực hiện.

Hãy bắt đầu ngay bằng đọc repo, xác minh baseline và ma trận thiếu, thiết lập workspace riêng, thực hiện đợt ổn định/nhãn số vai trước, rồi chọn đợt vai mới có phụ thuộc nhỏ và triển khai theo quy trình trên. Cuối mỗi mốc báo ngắn: đã playable bao nhiêu/64, đã kiểm gì thực tế, còn lỗi/hạn chế gì; đừng chỉ liệt kê file đã sửa hoặc tuyên bố “full role” khi còn thiếu phần tích hợp.
