# Quyết định và câu hỏi mở

Ngày ghi nhận: 2026-10-25 (Asia/Saigon). “Đã chốt” là yêu cầu người dùng đã nêu; “Đề xuất” cần quyết định khi thiết kế/triển khai.

## Đã chốt

| ID | Quyết định | Cơ sở |
|---|---|---|
| D01 | Workspace mới là multi-online | Người dùng chỉ định thư mục |
| D02 | Làm app mới, dừng mở rộng app cũ | Người dùng muốn hướng đi mới; không phải yêu cầu xóa mã ngay |
| D03 | Mỗi người một điện thoại, nhận vai và hành động riêng | Yêu cầu số 1 |
| D04 | Bảng công khai trên mọi máy; không cần máy chiếu | Người dùng sửa yêu cầu số 2 |
| D05 | Có âm thanh gọi vai, xác nhận thức và tiến độ cho quản trò | Yêu cầu số 3 |
| D06 | App xử lý tương tác đêm và có đồng hồ từng hoạt động ban ngày | Yêu cầu tiếp theo |
| D07 | Tập trung web qua Internet; gác offline | Người dùng yêu cầu bàn về web trước |
| D08 | cards.json trong workspace là dữ liệu thẻ nguồn | Người dùng cung cấp đường dẫn |

## Đề xuất thiết kế chưa chốt chi tiết

Máy chủ giữ trạng thái có thẩm quyền; dữ liệu trả theo quyền; duyệt trước công bố sáng; một nguồn phát âm thanh chung; cấu hình luật trước ván; hoàn tác có nhật ký; vote trên máy; mã/QR vào phòng; tổng kết mở bí mật sau ván.

Các nhu cầu này phù hợp trao đổi trước nhưng không đồng nghĩa mọi chính sách chi tiết đã được phê duyệt.

## Câu hỏi mở cần giải quyết theo thứ tự

1. Bộ vai nào và biến thể luật nào cho bản đầu? Làm rõ dữ liệu gộp/sai trước khi dùng.
2. Vào phòng bằng danh tính khách hay tài khoản; mất thiết bị nhận lại quyền ra sao?
3. Chọn stack, backend/realtime, database và phương án deploy/chi phí.
4. Sói thống nhất mục tiêu thế nào? Vote kín/công khai; hòa; thứ tự minh oan?
5. Tự chuyển bước ở mức nào; ai có quyền chốt/can thiệp/kết thúc?
6. Phát lời gọi bằng nguồn nào; xử lý vai chết/vắng và gọi giả thế nào để tránh lộ thông tin?
7. Giới hạn phòng và chính sách lưu lịch sử/xóa dữ liệu?

## Cách thêm quyết định

Thêm ID, ngày, trạng thái, lựa chọn, lý do và hệ quả. Nếu đổi quyết định cũ, đánh dấu bị thay thế và liên kết quyết định mới; không xóa dấu vết.


## Cập nhật 2026-10-25 — ưu tiên hơn các câu hỏi mở trước đó

| ID | Quyết định | Trạng thái |
|---|---|---|
| D09 | Vercel + Supabase theo công nghệ người dùng quen; Realtime/Database/Storage cho các phần tương ứng | Hướng đã thống nhất; chưa tích hợp |
| D10 | Mượt trên mạng yếu, retry/reconnect, tải trước âm thanh | Yêu cầu người dùng |
| D11 | Luật hardcode, không bắt quản trò chọn biến thể; sửa cùng người dùng sau | Đã chốt rõ |
| D12 | TypeScript thuần, state machine và xử lý hiệu ứng; bắt đầu 5 vai nền và test | Lựa chọn triển khai mốc đầu |
| D13 | classic-core-v1 theo DEFAULT_RULES.md | Mặc định do assistant chọn trong quyền hardcode đã giao, chưa phải xác nhận từng luật của nhóm |

Các đề xuất chọn ruleset trong tài liệu trước được thay bằng một bản luật nội bộ có version. Chưa chọn frontend framework. Chưa có tài khoản dịch vụ/secret hoặc kết nối Supabase trong workspace.

| ID | Quyết định mới | Trạng thái |
|---|---|---|
| D14 | Tạo giao diện sandbox tạm trước khi mở rộng lõi; một người test được mọi vai | Yêu cầu người dùng, đã triển khai local |
| D15 | Số người tùy nhập, vòng tròn ghế và tên từng ghế để làm sau | Đã ghi backlog, chưa làm |
| D16 | Dùng Vite + TypeScript DOM đơn giản cho sandbox, không chọn framework sản phẩm tại mốc này | Quyết định triển khai; không phải frontend multiplayer |
| D17 | Loại bỏ cơ chế "bỏ qua" (skip). Sói, Tiên tri, Bảo vệ bắt buộc chọn mục tiêu; Phù thủy được để dành thuốc cho đêm sau và vẫn thức dậy khi hết thuốc | Quyết định người dùng; cập nhật version luật lên classic-core-v2 |
| D18 | Bỏ mục âm thanh phát từ app để tránh nặng và tải nhiều dữ liệu; thay bằng hiển thị lời đọc (text prompts) cho quản trò đọc trực tiếp | Quyết định người dùng; đơn giản hóa hạ tầng không cần Storage âm thanh |

Sandbox cố ý giữ toàn bộ state trên trình duyệt để thử luật, phải hiển thị nhãn rõ. Không tái sử dụng cách giữ bí mật này cho bản online.


## Tiếp nhận và đối chiếu code 2026-10-25

- D17/D18 thay thế phần bỏ lượt và âm thanh trong các quyết định cũ. D05 giữ yêu cầu xác nhận thức/tiến độ nhưng không còn âm thanh máy; D09/D10 không còn hạng mục Storage/tải trước âm thanh. D11 thay đề xuất chọn biến thể bằng một bộ luật hardcode.
- Code hiện dùng classic-core-v4 và 9 vai; thay thế mô tả hiện trạng v1/v2. Đây là ghi nhận triển khai của agent trước, không phải bằng chứng người dùng đã duyệt từng tương tác mới. package.json vẫn là 0.1.0.
- Giữ định hướng ưu tiên ổn định lõi và bổ sung vai cơ bản trước tích hợp online theo STATUS trước; thứ tự chi tiết và tiêu chí kiểm chứng đã cập nhật trong ROADMAP.
- Danh tính/reconnect, vote/timer, giới hạn phòng và lưu/xóa dữ liệu vẫn cần thiết kế. Không mở lại câu hỏi stack hoặc nguồn âm thanh đã được quyết định.


## Mốc ổn định classic-core-v5 — 2026-10-25

Người dùng yêu cầu test và ổn định lõi 9 vai. Đã sửa tương tác, không thêm vai hoặc tích hợp dịch vụ mới. Các mặc định dưới đây do assistant cụ thể hóa trong quyền hardcode đã giao; có thể sửa cùng nhóm chơi, không phải luật Ma Sói phổ quát:

- Vai Sói quyết định lượt/bầy/kết quả soi; phe quyết định chiến thắng. Cặp tình nhân được tính lại phe theo vai hiện tại sau chuyển đổi.
- Nhân bản lấy vai hiện tại, thuốc còn lại/lịch bảo vệ; Thợ săn kế thừa có một viên đạn riêng. Không kế thừa nếu chết cùng đợt; không nhận liên kết tình nhân của mục tiêu.
- Đổi vai do kết quả đêm chỉ tại công bố sáng, không tiết lộ trước qua view. Kẻ bị nguyền chết cùng đợt không chuyển thành Sói.
- Thợ săn phản ứng trước khi xét thắng; không có mục tiêu sống thì kết thúc phản ứng. Nguyên nhân chết chỉ quản trò xem.
- Tăng version luật v4 → v5. Chưa lưu bền vững nên không tự migration; snapshot version cũ bị từ chối và sandbox tạo ván mới. Khi có lưu dữ liệu thật phải thiết kế migration/handler cũ riêng.

Kết quả kiểm chứng và giới hạn hiện hành xem STATUS.md, thay thế ghi nhận 20/22 test của lượt tiếp nhận.


## Mục tiêu phủ toàn bộ vai và mốc classic-core-v6

- D19 — Người dùng xác định mục tiêu ưu tiên là hoàn thiện core cho toàn bộ vai trong cards.json; UI phụ trợ. Lộ trình online được lùi sau các mốc core, không bỏ yêu cầu phân quyền nhiều máy dài hạn.
- D20 — Lập catalog riêng có ID ổn định và truy vết chính xác tên/nhóm nguồn. 57 mục chứa 61 vai sau khi tách 4 vai nằm trong mô tả gộp; cộng Thợ săn có sẵn ngoài nguồn thành 62 mục theo dõi. Một tên nguồn trống và các mục gộp vẫn được đánh dấu cần rà soát, không tự sửa nguồn.
- D21 — Mốc v6 thêm 10 vai; tách Sói thật, kết quả soi và phe. Danh sách người chơi khi tạo ván là thứ tự ghế cố định, dùng cho Kẻ đánh bom. Các mặc định cụ thể ở DEFAULT_RULES.md do assistant chọn trong quyền hardcode đã giao, chưa phải xác nhận từng biến thể của nhóm.
- D22 — Game có schemaVersion=1 từ v6, thêm wolvesBlockedNight và delayedDeathNight. Snapshot trước v6 không được nâng nhãn tự động; handler từ chối rulesVersion cũ. Chưa có lưu ván thật; tạo lại sandbox. Nếu cần bảo toàn snapshot cũ sau này phải có migration riêng, không tự đoán vết thương/bệnh từ dữ liệu thiếu.


## Đối chiếu HTML và thu gọn phạm vi nguồn — thay thế D20

Người dùng xác nhận crawl sai, cập nhật Hunter rồi yêu cầu kiểm cards.json với response.html, có thể bổ sung nếu cần nhưng không mở rộng quá nhiều và quay lại tiến trình core.

D23: nguồn HTML cục bộ thực tế chứa **64 vai**. Đã khôi phục Drunk, Hoodlum, các mục bị gộp và tên Kẻ Mất Ngủ. Tất cả có mục riêng trong JSON; Hunter có nguồn rõ. Catalog tăng source-map-v1 → v2, từ 62 mục theo dõi suy ra trước đó thành 64 vai đối chiếu HTML; còn 45 vai nguồn chưa có core. Không thêm vai bên ngoài bài nguồn ở mốc này.

Đã được người dùng cho phép sửa dữ liệu crawl; giữ nguyên HTML và backup JSON trước sửa, không thay mô tả nguồn bằng luật thực thi. Sửa beauti.py có chế độ chỉ đọc/ghi tách biệt và test hồi quy. Các nhận định cũ về Hunter ngoài nguồn, tên Insomniac suy đoán và số mục 57/62 chỉ còn là lịch sử lỗi crawl.


## Mốc bầy nhiều mục tiêu classic-core-v7

Người dùng yêu cầu tiếp tục tiến trình core; triển khai Sói con, Sói đại ca, Sói Alpha trên nguồn đã sửa, không thêm vai ngoài cards.json. Các mặc định sau do assistant chọn trong quyền hardcode đã giao, không coi là xác nhận từng biến thể của nhóm:

- D24 — Bầy đồng thuận theo tập mục tiêu, tối đa hai nạn nhân. Có Sói đại ca được chọn một/hai người sống cạnh nhau; thưởng Sói con/hy sinh yêu cầu hai nếu đủ mục tiêu và bỏ giới hạn cạnh nhau. Không cộng thành ba/bốn đòn cắn. Bệnh hủy cả lượt, không giữ thưởng sang đêm sau.
- D25 — Sói con tự đề nghị hy sinh, mọi Sói sống xác nhận; mở stepId mới cho lượt chọn nạn nhân. Hy sinh giải quyết cùng đợt chết đêm để giữ kín kết quả, không thưởng đêm sau. Không cho người khác dò ID Sói con để khởi xướng.
- D26 — Alpha chọn một nạn nhân cắn sau bầy và trước Phù thủy ở đêm ngay sau Sói khác chết ban ngày. Chỉ tốn quyền khi mục tiêu thực sự sống và chuyển hóa tại publish. Nếu thất bại vẫn cần cái chết Sói ban ngày mới cho lần thử sau. Nhân bản nhận cả trạng thái quyền đã dùng.
- D27 — Luật tăng v6 → v7, schema1 → schema2 cho đa mục tiêu và lịch thưởng/quyền Alpha. Không tự migration snapshot cũ; từ chối và tạo lại sandbox vì chưa lưu ván thật. Phù thủy cứu một trong hai người bằng healTarget, giữ lệnh một mục tiêu cũ tương thích.

Chi tiết trường hợp độc/nổ/tình nhân, vòng ghế và giới hạn thông tin ở DEFAULT_RULES.md. Bảng phủ hiện 22/64 vai, còn 42 vai.


## Mốc liên kết và điều kiện thức classic-core-v8

- D28 — Thêm Dire Wolf, Virginia Woolf, Fruit Wolf, Fang Face và Dream Wolf; tổng 27/64 vai. Virginia mặc định phe Dân vì mô tả nguồn không nêu phe và không nói thức cùng bầy. Đây là quyết định hardcode nội bộ, không suy phe từ tên nhóm Wolf Pack hoặc khẳng định luật thương mại.
- D29 — Liên kết Dire là target → owner; Virginia là owner → target. Mỗi người chết tối đa một lần trong hàng đợi, kiểm tra liên kết trước bom của người đó. Kế thừa vai liên kết chọn quan hệ mới ở đêm tiếp, không nhận quan hệ cá nhân của người đã chết. Kỹ năng mất khi đổi khỏi vai.
- D30 — Dream chỉ kích hoạt khi công bố cái chết Sói thật. Không giấu danh tính bằng cách cấm chọn mục tiêu: đòn cắn trúng Sói chưa biết được nhận bình thường và không giết đồng loại, lý do chỉ quản trò xem. Fang đang ngủ giữ thông tin cũ, không nhận phiếu/thành viên mới.
- D31 — Fruit cuối cùng phải xác nhận không cắn, kể cả khi có thưởng. Không cho hy sinh Cub khi còn Sói ngủ vì không thể có đủ đồng thuận theo luật mà không phá bí mật. Không tự coi người ngủ đồng ý.
- D32 — Schema2 → schema3, luật v7 → v8 cho cờ Sói đã chết và bộ nhớ/link từng người. Không tự migration snapshot trước v8. Nguồn 64 vai và source-map-v2 không đổi.

Mặc định chi tiết và giới hạn kiểm chứng tại DEFAULT_RULES.md, STATUS.md; có thể chỉnh cùng người dùng kèm test/version sau.

## Chuyển sang luồng phòng — 2026-10-25

- D33 — Người dùng đồng ý hoãn các vai còn lại, phát triển các phần ngoài core với 27 vai hiện có. Đây là thứ tự hiện hành, thay ưu tiên D19; giữ mục tiêu bổ sung vai dài hạn.
- D34 — Người dùng chưa có project Supabase và yêu cầu chuẩn bị kết nối trước. Làm local và kiểm thử trước; không tự tạo project, deploy hoặc yêu cầu gửi key vào chat.
- Bản triển khai đang dùng phiên khách theo từng trình duyệt, polling và phòng 24 giờ làm mặc định phát triển. Chưa có khôi phục phiên mất localStorage, vote/timer hoặc Realtime. Cần kiểm chứng cloud trước khi sử dụng thật.


## Mốc tùy chọn Phù thủy classic-core-v9 — 2026-10-25

- D35 — Người dùng yêu cầu hai điều: khi Bảo vệ chặn đòn cắn, Phù thủy không được biết người đó bị cắn; và trước khi chia vai, quản trò bật/tắt việc Phù thủy thấy nạn nhân. Người dùng chọn rõ hành vi khi tắt: Phù thủy chỉ chọn dùng hoặc giữ thuốc cứu, máy chủ tự cứu tối đa một nạn nhân chưa được bảo vệ theo thứ tự ghế và không lộ tên/số nạn nhân; dùng thuốc vẫn tốn kể cả không có nạn nhân. Luật tăng v8 → v9, Game schema3 → schema4, settings lưu khi bắt đầu ván và không đổi giữa ván.
- Ván v8/schema3 đã lưu tiếp tục luật cũ (Phù thủy thấy cả mục tiêu được bảo vệ) đến hết ván; không nâng nhãn, không trộn luật. Dispatch và lưu phòng chỉ chấp nhận đúng cặp v8/3 hoặc v9/4 có settings hợp lệ; bản cũ hơn vẫn bị từ chối.
- `sleepReady` chỉ là dữ liệu view phục vụ lời mời ngủ sau khi máy chủ nhận hành động; máy chủ vẫn chuyển bước theo lệnh quản trò. Đây không khôi phục cơ chế bỏ lượt đã loại bỏ ở D17: Phù thủy dùng/giữ thuốc và Sói ăn chay xác nhận không cắn vẫn là hành động riêng của vai.


## Giao diện tối và bàn tròn — 2026-10-25

- D36 — Người dùng chốt hướng giao diện trang phòng: tối, hiện đại, đơn giản, chữ to ít chữ, điện thoại là chính (F06–F11 trong PRODUCT.md). Nhận vai xong ẩn ngay; lần đầu nhận vai có overlay đọc vai với nút xác nhận sẵn sàng, sau đó vai luôn ẩn sau nút xem trên từng thiết bị. Mặc định mỗi màn hình chỉ hiện bàn tròn sống/chết (sống sáng, chết mờ); mọi thông tin khác đặt trong mục gập; luôn có mục xem toàn bộ vai từ catalog.
- D37 — Ảnh thẻ lấy từ cards.json bằng script sinh `src/catalog/images.ts` theo ánh xạ source-map-v2; không sửa dữ liệu nguồn. Ảnh tải từ máy chủ nguồn của dữ liệu thẻ; quyền sử dụng/tải ổn định chưa xác minh, UI có dự phòng chữ cái khi ảnh lỗi. Nâng catalog API trả thêm trường `image` (có thể null), spec OpenAPI 0.2.0 cập nhật cùng lúc.
- D38 — Kéo thả xếp ghế ở lobby chỉ là cách nhập mới cho mutation `reorder` có sẵn; server vẫn xác thực hoán vị đầy đủ và chỉ cho xếp trước khi chia vai. Thứ tự ghế cố định sau start theo luật vòng ghế hiện hành.


## Chat trong đêm bầy Sói — classic-core-v10 — 2026-10-25

- D39 — Người dùng yêu cầu: trong đêm, người cùng phe từ 2 trở lên chat được với nhau (F12). Triển khai trước cho bầy Sói ở bước bầy — phe duy nhất hiện có bước đêm chung. Luật tăng v9 → v10, Game schema4 → schema5 (mảng chat trong snapshot); ván v9/schema4 và v8/schema3 tiếp tục chơi bình thường nhưng không có lệnh chat.
- Máy chủ quyết định người nhận từng tin (Sói đang thức của bước đó), client không chọn người nhận; Sói ngủ và Sói chiêm bao chưa biết không gửi/không nhận, sau thức dậy không đọc lại chat cũ. Chat không phải hành động: không ảnh hưởng đồng thuận, sleepReady hay chốt lượt. Giới hạn 200 ký tự/tin, 200 tin/ván, retry cùng requestId không trùng tin.
- Chỉ mở rộng cho bầy Sói ở mốc này; chat tình nhân, Mason hoặc phe khác cần thiết kế riêng khi các vai/phe tương ứng có bước đêm chung — không tự coi yêu cầu đã phủ mọi "phe".


## Vote ban ngày ở ngoài app — 2026-10-25

- D40 — Người dùng chốt: phiếu ban ngày diễn ra **ngoài app** (nói trên bàn như cách chơi truyền thống); app chỉ ghi phán quyết treo cổ mà quản trò chọn thủ công, đúng như đang triển khai. Đề xuất làm phiếu bấm trên điện thoại bị loại bỏ.
- Hệ quả: mốc "Ngày, vote và hiệu ứng quyền" thu lại thành hiệu ứng quyền/nhiều lần phán quyết và các vai nhóm ngày (Thị trưởng, Thằng ngốc…) khi triển khai sau sẽ đi theo mô hình phán quyết thủ công của quản trò, không dựa vào phiếu in-app. Đồng hồ từng hoạt động ban ngày (D06) vẫn giữ trong backlog, không bị D40 phủ.


## Đồng hồ ban ngày — classic-core-v11 — 2026-10-25

- D41 — Người dùng yêu cầu: buổi sáng có thời gian theo bốn pha — thảo luận 5 phút, vote chỉ người 15s, thanh minh 30s, biểu quyết sống/chết 15s; các giá trị chỉnh được trong cài đặt; mỗi sáng có nút bấm bắt đầu đồng hồ. Triển khai: luật v10 → v11, Game schema5 → schema6 (dayTimers trong settings, dayPhase/dayPhaseEndsAt trong snapshot); ván v10/5, v9/4, v8/3 giữ luật cũ và từ chối lệnh đồng hồ.
- Deadline theo giờ máy chủ (nguyên tắc kiến trúc #5), máy khách chỉ hiển thị. Hết giờ chỉ báo hiệu — chuyển pha, bấm lại đồng hồ và phán quyết vẫn hoàn toàn do quản trò; tự chuyển bước khi hết giờ chưa được chốt, giữ làm câu hỏi mở.
- D41 không phủ D40: đồng hồ chỉ định nhịp buổi sáng, nội dung vote/minh oan vẫn diễn ra ngoài app bằng lời.


## Chế độ thử 1 tab — 2026-10-25

- D42 — Người dùng muốn test giao diện với 2 tab: một tab quản trò, một tab người chơi có thể đổi qua các vai (A, B, C…) để "đến turn ai là có màn hình của người đó". Triển khai như công cụ thử: ô tick "Chế độ thử 1 tab" ở màn vào phòng; các vai thêm nhanh bằng tên A–H; thanh chuyển vai lưu trong sessionStorage (riêng từng tab) nên không đụng phiên quản trình duyệt trong localStorage.
- Giới hạn rõ: đây là công cụ test, không phải mô hình chơi thật — khi chơi thật mỗi máy vẫn một phiên như trước. Phiên test không ghi vào localStorage; thoát chế độ xóa sạch. Overlay đọc vai chỉ hiện một lần mỗi tab ở chế độ thử (đã đọc thì các vai sau không hiện lại) để giảm thao tác.
- Điều kiện bật (cập nhật cùng ngày, thay phương án khóa theo storage): chỉ chạy `npm run debug` (vite --mode debug) mới có ô tick và thanh chuyển vai; `npm run dev:online`, bản build và deploy đều không có, theo điều kiện chế độ debug (được siết thêm ở D44: chỉ dev server, mọi build đều loại bỏ).


## Giao diện pop-up và tổng quan vai — 2026-10-25

- D43 — Người dùng chốt: các mục cài đặt/mở rộng (điều chỉnh vai, đồng hồ ban ngày, xếp ghế, chỉ mình bạn biết, diễn biến, sổ tay bí mật, hành động vừa nhận, chat đã khép) ẩn mặc định, bấm mở thành **pop-up** (đóng bằng ✕, bấm nền hoặc ESC). Màn hình chính chỉ giữ nội dung đang tương tác.
- Mục vai thành **bảng tổng quan vai trong ván này** kèm số người mỗi vai (ví dụ "Ma Sói ×2"), không hiện ảnh cho đỡ dài; bấm vào vai nào thì pop-up mới hiện ảnh thẻ + mô tả. Ở lobby chưa chia vai thì bảng liệt kê toàn bộ catalog. Thành phần deck (vai + số lượng) là thông tin công khai do máy chủ tính từ trạng thái ván và gửi trong snapshot cho mọi người xem — không bao giờ lộ ai giữ vai nào; không đổi Game/schema vì deck chỉ là dữ liệu suy ra khi chiếu.


## Tách product và công cụ thử — 2026-10-26

- D44 — Người dùng yêu cầu bỏ slogan/câu trang trí tự thêm và tách product, testing, debug. Trang vào phòng dùng tiêu đề Ma Sói; bỏ slogan chân trang và nhãn hạ tầng khỏi product. Giữ hướng dẫn thao tác và lời gọi vai phục vụ ván chơi.
- Sandbox chuyển sang `/debug/sandbox.html`; mã sandbox và nhiều người chơi một tab nằm trong `src/debug/`. Chỉ `npm run debug` phục vụ công cụ này. Dev thường trả 404 cho HTML/mã debug; build chỉ có entry product và loại import debug bằng cờ compile-time `DEBUG_TOOLS` (chỉ true khi command=serve và mode=debug), kể cả build dùng mode debug. Vercel tiếp tục dùng `npm run build`.
- Testing tự động ở `tests/`, script mở người chơi chạy riêng ở `scripts/`; không đưa vào giao diện hoặc bundle sản phẩm. Có test phục vụ HTTP và nội dung bundle để giữ ranh giới này.

## Ưu tiên lọt khung hình — 2026-10-26

- D45 — Người dùng chốt tiêu chí mọi thứ ưu tiên lọt trọn khung hình sau khi ảnh chi tiết vai bị phóng theo kích thước gốc. Bọc ảnh catalog vào card-hero, giới hạn theo chiều rộng và chiều cao viewport, object-fit contain để không cắt thẻ. Pop-up giới hạn theo 100dvh, nút đóng cố định; chi tiết vai giữ nút quay lại trong khung, chỉ mô tả dài cuộn. Các pop-up khác cuộn nội dung bên trong khi cần; ảnh màn nhận vai cũng thu gọn theo chiều cao màn hình.

## Cài đặt chung trong lobby — 2026-10-26

- D46 — Người dùng yêu cầu gom các tùy chọn vào một mục Cài đặt để bổ sung về sau. Hiện có Phù thủy thấy nạn nhân và thời lượng bốn pha ban ngày; chỉ quản trò sửa trước khi chia vai. Giá trị giữ trong bản nháp giao diện khi đóng pop-up/chuyển mục/polling và được gửi khi bắt đầu ván.
- Bỏ mục Xếp ghế bằng nút ↑ ↓ và handler nút, thay phần dự phòng của F11/D43; vẫn kéo thả ghế trên bàn tròn qua mutation reorder hiện có. Không đổi luật hoặc schema.

## Ưu tiên ảnh thẻ lớn — 2026-10-26

- D47 — Người dùng muốn ảnh thẻ lớn nhất có thể vì giá trị hình ảnh; bổ sung D45, vẫn giữ lọt khung hình. Thay giới hạn ảnh nhỏ cố định bằng vùng flex/grid chiếm phần diện tích còn lại, object-fit contain giữ trọn thẻ. Điện thoại dọc: ảnh ở trên, tên và mô tả bên dưới, mô tả giới hạn chiều cao và cuộn riêng. Màn rộng/ngang: ảnh và nội dung hai cột. Pop-up dùng chiều cao viewport, giữ nút đóng/quay lại; màn nhận vai và xem vai cá nhân dùng cùng bố cục.

## Đại trùng tu giao diện — 2026-10-26

- D48 — Người dùng yêu cầu thiết kế lại tổng thể, ưu tiên trải nghiệm thị giác. Dùng nền tối xanh rêu, chữ trắng ấm và điểm nhấn vàng nhạt; giảm khung/nút ngang hàng. Bàn chơi là vùng chính, công cụ ở thanh phòng; lobby có tóm tắt bộ vai và một nút Bắt đầu. Chỉnh bộ vai qua biểu tượng bút; Gợi ý nằm trong pop-up Bộ vai; Cài đặt giữ trên thanh phòng. Trang vào có hai tab Tạo phòng/Vào phòng, chỉ một form mỗi lần. Màn trong ván chia bàn chơi và hành động, tin riêng/sổ tay nằm ở thanh công cụ phụ. Không thêm slogan.
- D49 — Người dùng yêu cầu người chết đêm gần nhất có X đỏ, người chết lâu chỉ mờ. UI lấy duy nhất sự kiện morning công khai gần nhất; giữ dấu của đêm đã công bố trong đêm tiếp theo, đổi sau lần công bố mới, xóa nếu sáng mới không ai chết. Người bị treo cổ không được thêm X. Không dùng pendingDeaths hoặc sự kiện riêng; không đổi API/schema.
- D50 — Theo góp ý sau khi xem bản mới, icon làm mới và danh sách vai cần nhãn rõ: dùng icon kèm chữ Làm mới / Vai; vẽ lại biểu tượng vòng làm mới và bộ bài có hình thoi. Sao chép/cài đặt giữ icon quen thuộc, có aria-label và title. Không áp dụng hướng icon cho mọi thao tác.
- Pop-up giữ focus bàn phím bên trong, Escape đóng và trả focus về nút mở. Form vào phòng hỗ trợ Enter. Ảnh vai giữ bố cục lớn nhất trong viewport theo D47.

## Ảnh dấu chết bằng vệt máu — 2026-10-26

- D51 — Người dùng làm rõ X bị kill phải là hình vết máu, không phải icon X. Thay SVG bằng ảnh PNG alpha hai vệt máu chéo có mép loang/giọt máu, tạo bằng image_gen tích hợp. Asset runtime `src/online/assets/death-blood-x.png`, 256×256; prompt ở `docs/verification/blood-x-prompt.md`. Giữ nguyên điều kiện hiển thị D49 và trạng thái người chết cũ.

## Bộ vai lobby, mô tả nguồn và sẵn sàng — 2026-10-26

- D52 — Người dùng làm rõ: nút Vai trên máy người chơi chỉ hiện bộ vai đã chọn cho ván, kể cả trước chia. Quản trò chỉnh và Lưu bộ vai trong pop-up; `setDeck` lưu công khai thành phần/số lượng, không chia danh tính. Trước khi có bộ vai đã lưu, hiện trạng thái chưa chọn, không liệt kê catalog. Bản nháp chưa lưu không cho chia vai. Mục chỉnh bộ vai vẫn có toàn bộ 27 vai được hỗ trợ.
- D53 — Mô tả hiển thị trong danh sách thẻ, nhận vai và xem vai cá nhân giữ nguyên Description từ cards.json, kể cả dấu/biến thể/xuống dòng; map qua source trong ROLE_CATALOG và sinh bằng npm run gen:descriptions. Không sửa cards.json, không đổi luật engine theo mô tả nguồn.
- D54 — Chia vai chưa bắt đầu chơi. `start` chia bí mật và vào ready; người chơi bấm Tôi đã đọc và sẵn sàng gửi `ready` theo danh tính phiên; người đó sáng/check trên bàn quản trò, số Sẵn sàng x/y cập nhật. `begin` chỉ quản trò gửi khi đủ tất cả, có kiểm revision; máy chủ chặn mọi engine command trước đó. Readiness lưu bền vững, retry không nhân đôi, reload không bắt đọc lại; sau bắt đầu không xác nhận nữa.
- Room schema 2 chứa lobbyRoles, readyPlayerIds và gameStarted; đọc schema 1 với lobby trống và ván đã tồn tại coi là đang chạy. Chỉ lần ghi thành công mới nâng room schema/khởi tạo các trường thiếu; không nâng Game schema hoặc rulesVersion. Migration SQL 202610260001_lobby_ready mở constraint/RPC nhận room 1/2, không sửa dữ liệu ván cũ hàng loạt; chưa chạy trên cloud.
- OpenAPI 0.6.0 và collection Lobby deck contract mô tả/kiểm setDeck, ready, begin. Chỉ chạy local; không publish workspace.

## Phòng debug, đổi máy và dùng chung máy — 2026-10-26

- D55 — Người dùng yêu cầu phòng debug bị xóa khi quản trò thoát. Debug dùng DebugRoomRepository trong RAM, không ghi .local-rooms hoặc Supabase. Tab quản trò gửi DELETE keepalive khi pagehide; máy chủ xóa sau 2 giây để reload nhanh kịp tiếp tục. Người chơi thoát không xóa phòng. Lease quản trò 90 giây xử lý trường hợp không gửi được tín hiệu thoát; tab nền có heartbeat. Khởi động lại server debug mất phòng. DELETE bị chặn trên server thường; cờ debug chỉ lấy từ Vite mode/command, không nhận từ client.
- D56 — Theo yêu cầu người dùng, ở chế độ thường mã phòng + tên cũ (chuẩn hóa tên, không phân biệt hoa/thường) dùng để tiếp tục người chơi/quản trò trên máy mới, cả lúc đang chơi. Máy chủ thay capability, giữ UUID/vai/hành động/sẵn sàng, thu hồi phiên cũ; máy cũ quay về form vào phòng. Tên trong phòng là căn cứ nhận lại phiên theo mô hình nhóm chơi tin cậy này, không bổ sung PIN/tài khoản. Tên mới chỉ được thêm ở lobby. Debug tiếp tục từ chối tên trùng. Nhập tên một người đang dùng máy quản trò sẽ chuyển người đó sang máy riêng, giữ danh tính và dừng quyền thao tác thay của quản trò.
- D57 — Quản trò thêm người không có điện thoại ở lobby qua Thêm người → Dùng máy quản trò. Người này tính vào ghế, bộ vai và quorum sẵn sàng như bình thường. Quản trò lần lượt chọn người để đưa xem vai; giao diện và dữ liệu trả về chỉ là player view của người đó, không chứa màn/nhật ký quản trò. Xác nhận xong tự đóng vai, về bảng quản trò rồi mới mở người tiếp theo. Ban đêm tự mở người dùng chung máy chưa gửi hành động của bước hiện tại; quản trò thao tác theo cử chỉ ngoài đời, gửi xong về quản trò. Có nút quay lại thủ công và có thể mở sửa lựa chọn của người dùng chung máy. Người online giữ luồng riêng.
- Các lệnh offlineReady/offlineCommand và GET offlinePlayerId chỉ quản trò dùng cho thành viên có offline=true. Engine nhận principal người chơi đó, không nhận quyền quản trò qua proxy; vẫn kiểm bước, mục tiêu, quyền, retry. Không cho proxy người online. Room schema 3 thêm offline trên Member; đọc v1/v2 và migrate on write; Game luật/schema không đổi. SQL 202610260002_shared_devices mở constraint/RPC nhận 1/2/3, chưa kiểm trên cloud.
- D58 — Theo góp ý giao diện: căn ảnh X máu bằng tâm tuyệt đối 50%/translate của avatar, bỏ nút ← Danh sách vai trong chi tiết. X góc trên của chi tiết quay về catalog, X tiếp theo đóng catalog; Escape tương tự. Màn xem vai cá nhân vẫn đóng về màn chơi.

## Menu từng người và nghỉ giữa ván — 2026-10-26

- D59 — Người dùng yêu cầu quản trò bấm avatar để mở pop-up nhỏ cạnh ghế, có Chuyển sang offline và Rời khỏi trò chơi. Menu chỉ ở máy quản trò, giữ kéo thả ghế ở lobby; drag không mở menu. Pop-up tự chọn cạnh/dưới avatar và giới hạn theo viewport, đóng bằng click ngoài/Escape; hỗ trợ bàn phím. Chuyển offline giữ UUID/vai/ready/hành động, thay token để máy cũ không thao tác được, chuyển sang luồng dùng máy quản trò D57.
- Người dùng trả lời rõ: nghỉ giữa ván chỉ rút riêng người đó, không kích hoạt hiệu ứng chết dây chuyền. Trước chia xóa khỏi lobby; sau chia giữ vị trí ghế và đánh dấu Đã rời, loại khỏi actor/target/quorum, thu hồi truy cập và không cho nhận lại tên trong cùng ván. Có xác nhận nhỏ ngay trong pop-up trước khi rút.
- Rút không kích hoạt tình nhân chết theo, bom, bắn Thợ săn, kế thừa/Tiên tri tập sự, thưởng Sói con hay cờ Sói chết. Quan hệ tình nhân được gỡ, phe trở về theo vai. Không hoàn tác kiến thức hoặc hiệu ứng đã chốt trước lúc rút. Gỡ lượt Thợ săn đang chờ, xóa phiếu Sói đang chọn và tăng stepId để tránh lệnh cũ; mục tiêu chờ của hành động chưa chốt được gỡ khi cần, kết quả soi đã biết giữ lại. Kiểm tra thắng sau rút nhưng nếu đang có kết quả đêm chưa công bố thì chờ công bố để không lộ kết quả đó.
- Room schema 4 bổ sung Member.left, đọc v1/v2/v3 và chuyển khi ghi; không đổi luật/schema Game, thêm thao tác quản trị ngoài lệnh kỹ năng. Migration 202610260003_member_controls chưa chạy trên Supabase thật. OpenAPI 0.8.0 và collection Member controls contract kiểm quyền/revision/retry/rút không hiệu ứng.

## D60 — Diễn biến, kết quả soi và giới hạn bỏ vote (2026-10-26)

Theo yêu cầu người dùng: kết quả đêm ghi Đêm N, phán quyết ghi Sáng N; không có người chết ghi rõ Không có ai chết. Kết quả Tiên tri mở popup lớn, đỏ cho Sói/xanh cho không phải Sói, bấm Đã rõ để đóng. Dùng chung máy phải chờ xác nhận mới trả về quản trò; trạng thái đã xem tách theo ván/người trong tab.

Quản trò chọn tổng số ngày được không loại ai trước chia vai (0–30, mặc định 0). Hết lượt thì phải chọn mục tiêu phán quyết; không đổi luật cắn đêm hoặc ngoại lệ Hoàng tử. Luật mới classic-core-v12/schema7; giữ nguyên snapshot v11/6 trở về trước đến hết ván, không migration ngầm. Phiếu vẫn ở ngoài app.

## D61 — Một máy không Internet, nhập trực tiếp cho quản trò (2026-10-26)

Người dùng yêu cầu chủ động thêm người offline và chọn chế độ tối giản mỗi đêm; xác nhận cần dùng khi máy quản trò cũng không có Internet. Bổ sung đường đi Tạo bàn một máy, dùng LocalTable trong browser và localStorage riêng (`ma-soi:local-table:v1:*`), độc lập phòng/API online. Document local version 1; không migrate hoặc đổi schema/luật ván online. Lưu Game v12/schema7 như engine hiện có, dùng chung dispatch/views để không nhân bản luật.

Tối giản mặc định bật, có thể tắt trong Cài đặt trước chia vai. Một xác nhận nhập hành động đồng thời wake/act cho actor; Sói dùng một lựa chọn chung, vẫn qua validation từng actor. Vai vắng được bỏ qua, review tự resolve; kết quả soi giữ tới xác nhận (lưu cả trạng thái chờ qua reload). Tất cả chuỗi lệnh commit vào localStorage một lần khi thành công; hành động sai không ghi một phần. Không yêu cầu ready từng người ở bàn local; xem vai lần lượt vẫn có sẵn. Quản trò còn quyền công bố sáng và phán quyết ngày.

Service worker chỉ sinh trong build, cache shell và 27 ảnh PNG nguồn đã lưu public/offline-cards. Không cache API hoặc dữ liệu ván online. Cache có version theo nội dung build, chỉ dọn cache do app tạo; local save tồn tại độc lập cache. Mở một lần có mạng/HTTPS hoặc localhost để chuẩn bị, sau đó mở lại không có mạng. Chưa kiểm điện thoại vật lý hay cloud; không deploy.

## D62 — Trang đầu ưu tiên vào phòng, tạo phòng không nhập tên (2026-10-26)

Theo yêu cầu người dùng: tab bên trái Vào phòng được chọn mặc định cả khi mở trang gốc; tab Tạo phòng ở bên phải. Bỏ ô Tên quản trò cho cả phòng online và bàn một máy. Người vào phòng vẫn nhập mã phòng và tên người chơi.

Giữ hợp đồng API cũ: client tự cấp tên nội bộ ngẫu nhiên cho quản trò online, không dùng một tên mặc định công khai dễ đoán cho cơ chế nhận lại phiên qua tên D56. Tên nội bộ không hiện thành trường nhập; máy quản trò vẫn được nhận lại bằng capability đã lưu. Bàn local dùng nhãn Quản trò. Ván/phòng cũ giữ nguyên; không đổi luật/schema/API.

## D63 — Nút chuyển Online / Offline (2026-10-26)

Theo ảnh/góp ý của người dùng, thay checkbox Một máy · không cần Internet trong tab Tạo phòng bằng một nút chuyển hai trạng thái Online / Offline. Online được chọn mặc định, vùng được chọn tô màu; bấm nút/Enter/Space đổi qua lại, giữ focus và aria-checked. Chỉ hiện hướng dẫn chuẩn bị không mạng khi chọn Offline. Nút tạo dùng đúng chế độ đang chọn; vào phòng vẫn gửi qua mạng. Không thay API/luật/lưu trữ.

## D64–D66 — Chuyển chế độ mượt, thoát phòng và mặc định Phù thủy (2026-10-26)

- D64: theo người dùng, bỏ dòng chữ phụ ở Offline để Online/Offline có cùng bố cục. Dùng một nền trượt bằng CSS transform/transition 240 ms; handler chỉ cập nhật aria-checked/nhãn tạo trên DOM hiện có, không render lại cả trang làm mất transition. Tôn trọng prefers-reduced-motion.
- D65: thêm Thoát phòng có icon/nhãn trên toolbar quản trò, cả lobby và giữa ván. Hỏi xác nhận trong app, có Ở lại. Thoát về trang đầu; bàn local giữ bản lưu, phòng online giữ capability trên thiết bị để vào lại. Debug giữ chính sách xóa phòng khi quản trò thoát D55 và nói rõ trong xác nhận. Không thêm endpoint xóa phòng production.
- D66: checkbox Phù thủy thấy nạn nhân mặc định tắt trong cài đặt tạo ván online/local. Có thể bật trước chia, ván cũ không thay đổi. Engine/API caller cũ giữ default tương thích, UI luôn gửi settings rõ ràng; không đổi luật/schema.

## D67 — Mã phòng sáu chữ số (2026-10-26)

Người dùng muốn ID chỉ gồm số để nhập dễ. Phòng online và bàn offline mới sinh mã 6 chữ số dạng string, gồm cả 0/1 và giữ số 0 ở đầu. Mở bàn phím số cho ô nhập mã. Không đổi UUID nội bộ của phiên/người chơi/game.

Giữ mã chữ cũ để không làm mất phòng hoặc bản lưu: parser/API/SQL chấp nhận 6 chữ số hoặc định dạng cũ A–Z/2–9; không đổi code của phòng đang tồn tại. Chuẩn bị migration 202610260004_numeric_room_codes mở ràng buộc code, không đổi room/Game schema; cần áp dụng trước khi chạy bản server mới trên Supabase. Migration chưa chạy cloud.

## D68 — Toàn bộ vai và khoảng đệm danh sách dùng chung máy (2026-10-26)

Theo yêu cầu người dùng, cửa sổ Vai trong ván này có thêm mục Toàn bộ vai trong game, mở danh sách toàn bộ 27 vai được hỗ trợ trong catalog. Vai ngoài bộ ván vẫn xem ảnh/mô tả nguyên văn; không thêm vai chưa thực thi hoặc lộ phân vai. X/Escape từ chi tiết quay về đúng danh sách vừa mở; từ danh sách toàn bộ quay về các vai trong ván.

Dòng người dùng máy quản trò thêm padding ngang 12px và bo góc vùng hover; tên được co/wrap, nhãn Xem vai/Đã gửi không co sát mép. Không đổi API/engine.

## D69 — Sổ tay bí mật chia tab cho điện thoại (2026-10-26)

Theo người dùng, sổ tay quản trò quá dài trên điện thoại. Chia thành Người chơi / Chat Sói / Nhật ký; tiêu đề, nút đóng và thanh tab nằm ngoài vùng cuộn. Mỗi tab nhớ vị trí cuộn trong cùng bàn, có hỗ trợ bàn phím/ARIA. Tab Người chơi giữ vai/trạng thái và ghi chú luật; Chat/nhật ký có lọc đêm hoặc Tất cả, nhật ký mới nhất ở trên và không còn cắt mất lịch sử chỉ vì giới hạn 15 dòng. Dữ liệu vẫn chỉ lấy moderator snapshot, nội dung chat được escape. Không đổi API, schema hay luật.

## D70 — Bộ lọc sổ tay gọn và thông báo đến lượt toàn màn hình (2026-10-26)

Theo ảnh/góp ý: bộ lọc Đêm căn phải thành cụm gọn, select chữ 13px nét thường, nền dịu/viền mảnh và mũi tên thống nhất; vẫn dùng select native để hỗ trợ bàn phím. Focus panel dùng viền nhẹ thay viền mặc định xanh.

Khi room đang playing và playerView.turn tồn tại nhưng chưa awake, hiển thị alertdialog phủ viewport với Đến lượt bạn, lời gọi chung và nút Tôi đã thức dậy. Không lộ tên vai, không tự wake; dùng cùng lệnh đã có, chỉ đóng khi snapshot xác nhận awake. Không áp dụng ở ready/ended, người không có lượt hoặc màn quản trò tối giản. Overlay không đóng qua Escape; giữ focus trong overlay và hiển thị lỗi gửi để người chơi thử lại. Không thay API/luật.

## D71 — Thợ săn bị động/chủ động theo yêu cầu 2026-10-27

Mặc định bị động, ghim mỗi đêm; chết đêm mọi nguyên nhân kéo mục tiêu ghim chết theo, chết ngày không bắn. Chủ động thay thế bị động: một phát cả ván, được giữ lại; trúng phe Sói thực tế thì sống, sai thì cả hai chết. Không dùng tên bắn công khai. Bảo vệ/cứu không chặn bắn. Chốt bắn ở lượt đêm và tổng kết đợt chết chung; phe xét là team tại lúc chốt, trước chuyển hóa Alpha/công bố. Không công khai nguồn chết. Version v13/schema8; ván cũ giữ luật cũ.

## D72 — Chọn mục tiêu avatar và nhận đồng đội

Theo yêu cầu: avatar chọn mục tiêu đêm, giữ Xác nhận riêng. Nhiều mục tiêu có từng ô chọn; viền vàng đánh dấu mục tiêu. Viền đỏ chỉ lấy pack projection được phép biết khi Sói thức, không suy từ dữ liệu vai quản trò. Người sống giữ sáng khi offline/chưa ready. Menu quản lý có nút riêng khi avatar đang chọn mục tiêu ở chế độ tối giản.

## D73 — Vùng API và xác nhận thao tác

Vercel Function đặt sin1 (Singapore), cùng vùng Supabase thay vì mặc định iad1. Cấu hình trong vercel.json để deploy không quay về vùng xa. Đang gửi là trạng thái bình thường, chỉ hiển thị nút gửi lại khi đã mất xác nhận; retry giữ nguyên requestId/capability. Client chờ tối đa 12 giây để bao phủ hai lượt storage timeout 5 giây và độ trễ mạng. Thành công dùng snapshot ACK ngay, không GET lập tức; polling thường vẫn tiếp tục, lỗi 4xx đã hủy pending thì refresh để phục hồi trạng thái.

## D74 — Hiệu năng ảnh, bàn ổn định và luồng người chơi (2026-10-27)

Theo người dùng: tự lưu/xử lý toàn bộ ảnh, không dùng URL nguồn khi chơi; WebP giữ độ phân giải, tải trước và cache để mở vai nhanh. Giữ nút đóng/ảnh trong viewport. Bàn không co theo thanh trình duyệt hay lượt/chat, cập nhật từng phần để tránh nháy. Người chơi ẩn header thương hiệu/trạng thái đồng bộ; bàn lớn hơn, icon toàn màn hình tại góc trên phải. Chat bầy có hai tin xem trước và cửa sổ toàn màn hình. Chi tiết vai mở từ lobby đóng thẳng về lobby. Mỗi lượt có hướng dẫn; quản trò thao tác thay không cần màn gọi dậy.

Kết quả soi dùng nhãn “Là phe Sói” và biểu tượng đầu sói riêng, đỏ đen; không dùng ảnh lá Ma Sói vì kết quả biểu thị phe. Chỉ thay trình bày, giữ nguyên luật soi hiện hành. Poll đêm 750ms, các pha khác 1500ms; giữ kiểm quyền và xác nhận máy chủ. Chưa triển khai Realtime hoặc thay hạ tầng.
