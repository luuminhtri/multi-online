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
