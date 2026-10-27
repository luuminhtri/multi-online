# Mục tiêu và yêu cầu sản phẩm

> Tiếp nhận 2026-10-25: code có 9 vai theo classic-core-v4, chưa nghiệm thu đầy đủ tương tác. Bộ 5 vai và luật nền không còn là câu hỏi chưa chọn; âm thanh thu sẵn/TTS đã được bỏ theo D18. Các câu hỏi về giới hạn phòng, danh tính và vote/timer vẫn cần thiết kế. Xem STATUS.md.

> Cập nhật 2026-10-25: dùng một bộ luật có version. Ngoại lệ mới theo yêu cầu người dùng ở v9: quản trò bật/tắt Phù thủy thấy nạn nhân trước khi chia vai. Khi tắt, Phù thủy chỉ dùng/giữ thuốc, máy chủ cứu không lộ tên. Người được Bảo vệ chặn cắn không được báo cho Phù thủy. Xem [DEFAULT_RULES.md](DEFAULT_RULES.md), [ENGINE_GUIDE.md](ENGINE_GUIDE.md) và [STATUS.md](STATUS.md). Hướng hạ tầng hiện là Vercel + Supabase; lõi TypeScript.
## Mục tiêu

Giảm tối đa gánh nặng quản trò khi chơi trực tiếp: app nhớ trạng thái, thu hành động bí mật, xử lý tương tác và giữ nhịp; quản trò dẫn chuyện, nhắc người chơi và xử lý ngoại lệ.

## Yêu cầu đã thống nhất

| ID | Yêu cầu | Kết quả mong muốn |
|---|---|---|
| F01 | Phòng nhiều điện thoại | Quản trò chia bài một lần; mỗi người nhận đúng vai và mô tả trên máy mình |
| F02 | Thông tin chung trên mọi máy | Xem ngày/vòng, người sống/chết, công bố và đồng hồ; không cần máy chiếu |
| F03 | Lời thoại gọi vai cho quản trò đọc và xác nhận thức dậy | App hiển thị câu thoại gợi ý cho quản trò đọc to; người được gọi xác nhận trên điện thoại, làm chức năng; quản trò thấy ai chưa dậy/chưa xong để nhắc (đã bỏ âm thanh máy để nhẹ và tránh tải nhiều) |
| F04 | Xử lý diễn biến đêm | Tính tương tác kỹ năng theo bộ luật, cập nhật trạng thái và giúp quản trò hiểu kết quả |
| F05 | Điều phối ban ngày | Có thời gian riêng cho thảo luận, vote, minh oan; quản trò điều phối. Cập nhật 2026-10-25 (D40): vote diễn ra **ngoài app** — mọi người nói trên bàn; app chỉ ghi phán quyết treo cổ của quản trò, không làm phiếu trên điện thoại. Cập nhật cùng ngày (D41): buổi sáng có 4 pha có đồng hồ — thảo luận 5 phút, vote chỉ người 15s, thanh minh 30s, biểu quyết sống/chết 15s; giá trị chỉnh được trong cài đặt; mỗi sáng quản trò bấm bắt đầu đồng hồ; hết giờ chỉ báo hiệu |

Phòng bằng mã/QR là hướng vào phòng đã thảo luận. Vote trên điện thoại và cách hiển thị kết quả cần chi tiết hóa trước triển khai.

## Nhu cầu hỗ trợ được chấp nhận về định hướng

Khôi phục kết nối, quản trò can thiệp/hoàn tác, chốt bộ luật trước ván, thống nhất mục tiêu bầy Sói, chế độ đêm hạn chế lộ vai, xác nhận gửi hành động và xem lại sau ván. Người dùng đồng ý phạm vi bổ sung này ở mức ý tưởng; chính sách và giao diện chi tiết chưa chốt.

## Không thuộc phạm vi hiện tại

- Native app, hotspot và máy chủ mạng nội bộ. Ngoại lệ D61: chơi không Internet trên một máy quản trò đã lưu sẵn app.
- Thay đối thoại trực tiếp bằng voice/chat online toàn phần.
- Máy chiếu bắt buộc; màn hình phụ chỉ là mở rộng tương lai.
- Bật mọi vai cùng lúc khi chưa định nghĩa và kiểm thử luật; mục tiêu dài hạn hiện là phủ toàn bộ vai trong cards.json theo từng mốc.
- Tiếp tục mở rộng app cũ hoặc sao chép mã của Soi Má.

## Nguyên tắc trải nghiệm

Thông tin có ba phạm vi: công khai, riêng người chơi/nhóm được phép, toàn bộ cho quản trò. Ban đêm chỉ mở tương tác hợp lệ. Quản trò được tạm dừng và giải quyết ngoại lệ. Tự động hóa phải giải thích được; không tự đoán luật chưa xác định.

## Chưa chốt

Bộ vai đầu tiên; số người tối thiểu/tối đa; đăng nhập hay khách; cơ chế nhận lại danh tính; phiếu kín/công khai; thứ tự vote/minh oan; điều kiện thắng; vai có được công khai sau chết; thời gian mặc định; âm thanh thu sẵn hay TTS; mức tự chuyển bước.

## Yêu cầu tiếp theo đã ghi nhận — chưa triển khai

Ngày 2026-10-25: người dùng muốn nhập số người, hiển thị vòng tròn chỗ ngồi và nhập tên vào từng ghế. Người dùng yêu cầu để sau; ưu tiên hiện tại là giao diện tạm để test lõi. Không thay thế yêu cầu này bằng danh sách ghế cố định của sandbox.


## Mục tiêu ưu tiên mới — phủ toàn bộ vai nguồn

Người dùng yêu cầu tiếp tục hoàn thiện core cho toàn bộ role trong data. Ưu tiên lõi luật, UI chỉ phục vụ thử và kiểm chứng. Phạm vi dài hạn bao gồm các bản mở rộng, vai gộp trong mô tả và vai không có kỹ năng tự động hoàn toàn nhưng cần quản trò xác nhận hành vi.

Giữ nguyên cards.json, lập catalog có truy vết và bảng phủ ở ROLE_COVERAGE.md. Không biến mục nguồn lỗi/gộp thành vai đã chạy; các mặc định khác nguồn phải ghi rõ trong DEFAULT_RULES. Online/UI không được ưu tiên trước mục tiêu core này trừ khi cần kiểm chứng. Trạng thái mới thay các ghi nhận hiện trạng cũ ở đầu tài liệu: hiện 19 vai, classic-core-v6; xem STATUS.md.


## Tiến độ core v7

Hiện 22/64 vai nguồn có core và test. Bầy nhiều mục tiêu, Sói con (cả hy sinh), Sói đại ca và Alpha đã triển khai theo DEFAULT_RULES.md. Schema ván 2; snapshot cũ phải tạo lại. Không thay yêu cầu ưu tiên phủ toàn bộ vai; mốc này không triển khai online/UI sản phẩm.


## Tiến độ core v8

27/64 vai đã có core/test: thêm liên kết một chiều và Sói ngủ theo điều kiện. Giữ kín vai gồm cả danh sách mục tiêu/phiếu và bộ nhớ bầy; không chỉ ẩn thông tin trên UI. Virginia dùng phe Dân theo mặc định riêng đã ghi trong DEFAULT_RULES; chưa có kết luận từ mô tả nguồn về phe. Còn 37 vai nguồn, không mở rộng thêm danh mục.

## Yêu cầu giao diện — 2026-10-25 (người dùng chốt)

| ID | Yêu cầu | Ghi chú |
|---|---|---|
| F06 | Giao diện tối, hiện đại, đơn giản; chữ to, ít chữ, rõ ràng; điện thoại là chính | Đã áp dụng cho trang phòng |
| F07 | Nhận vai xong phải ẩn ngay để tránh người khác nhìn; lần đầu nhận vai có thời gian đọc và nút "Tôi đã đọc và sẵn sàng" | Overlay lần đầu mỗi ván mỗi tab; sau đó vai luôn ẩn sau nút xem |
| F08 | Tận dụng ảnh thẻ trong cards.json | Sinh tự động từ dữ liệu nguồn qua script; ảnh nằm trên máy chủ nguồn, UI có phương án dự phòng khi không tải được |
| F09 | Trước và trong khi chơi luôn có mục xem các vai | Cập nhật 2026-10-25 (D43): trong ván hiện **bảng tổng quan vai của ván này** kèm số người mỗi vai, không ảnh; bấm vai mới hiện ảnh + mô tả. Cập nhật D52: lobby người chơi chỉ hiện bộ vai đã lưu cho ván; catalog đầy đủ chỉ nằm ở mục chỉnh vai của quản trò |
| F10 | Thông tin mở theo mục, không dồn một màn hình; mặc định chỉ sống/chết từng người dạng bàn tròn: sống sáng, chết mờ | Cập nhật 2026-10-25 (D43): các mục cài đặt/mở rộng mở dưới dạng **pop-up**, đóng bằng ✕/nền/ESC |
| F11 | Quản trò kéo thả xếp chỗ trước khi chia vai, giống ngoài đời thật | Vòng ghế liên quan bom, Sói đại ca và các vai ghế; chỉ kéo thả; bỏ nút ↑↓ dự phòng theo D46 |
| F12 | Trong đêm, người cùng phe từ 2 trở lên chat được với nhau | Hiện triển khai cho bầy Sói ở bước bầy: chỉ Sói đang thức gửi/nhận, máy chủ quyết định người nhận, bạn ngủ và Dream chưa biết không nhận; ván cũ v9 không có chat |

## Tách sản phẩm và công cụ thử — 2026-10-26

- F13 — Không tự thêm slogan/câu trang trí chưa được yêu cầu vào giao diện. Giữ thông báo và hướng dẫn cần cho thao tác chơi.
- F14 — Product riêng, testing/debug riêng (D44): sandbox và điều khiển nhiều người chơi chỉ chạy với `npm run debug`; dev thường không phục vụ mã debug; build/deploy chỉ chứa product. Test tự động và script thử chạy riêng.

- F15 — Ưu tiên mọi thứ lọt trọn khung hình, đặc biệt trên điện thoại (2026-10-26, D45). Chi tiết vai hiển thị đầy đủ ảnh thu gọn, tên và mô tả; luôn thấy nút đóng/quay lại. Nếu nội dung dài vượt màn hình thì chỉ vùng mô tả cuộn, không phóng ảnh hoặc đẩy nút ra ngoài.

- F16 — Một mục Cài đặt chung trong lobby quản trò chứa các tùy chọn trước ván, hiện gồm Phù thủy thấy nạn nhân và đồng hồ ban ngày; mở rộng tại đây khi có yêu cầu tiếp theo (D46).

- F17 — Ảnh thẻ hiển thị lớn nhất có thể trong giới hạn màn hình (D47): ưu tiên không gian cho ảnh, giữ trọn thẻ và nút thao tác; mô tả dài cuộn riêng. Màn rộng/ngang đặt ảnh cạnh mô tả. Áp dụng cho xem vai trong catalog, xem vai cá nhân và màn nhận vai.

## Trải nghiệm thị giác — 2026-10-26

- F18 — Thiết kế lại tổng thể theo D48: bàn chơi trọng tâm, công cụ phòng gọn, bộ vai có tóm tắt/chỉnh sửa, một hành động chính mỗi bước; trang đầu dùng tab tạo/vào phòng. Giữ Cài đặt chung và ảnh thẻ lớn trong khung màn hình.
- F19 — Người chết trong đêm công bố gần nhất có X đỏ; người chết cũ chỉ làm mờ. Không đánh dấu trước công bố hoặc cho người bị treo cổ. Sáng mới không ai chết thì bỏ X cũ (D49).
- F20 — Icon khó hiểu cần nhãn ngắn: Làm mới / Vai. Icon quen thuộc có nhãn trợ năng; pop-up hỗ trợ Tab/Shift+Tab/Escape (D50).

- Làm rõ F19 (D51): X bị kill là ảnh vệt máu chéo nền trong suốt, thay icon X nét đơn.

- F21 — Quản trò lưu bộ vai trước chia, máy người chơi xem đúng thành phần/số lượng đã chọn ở nút Vai; chưa chọn thì không liệt kê vai khác (D52).
- F22 — Mô tả thẻ nguyên văn từ cards.json ở mọi nơi hiển thị vai; giữ luật thực thi riêng (D53).
- F23 — Chia vai → từng người đọc/xác nhận → quản trò thấy Sẵn sàng x/y và người đã xác nhận sáng lên → đủ y/y mới bắt đầu được. Máy chủ chặn bắt đầu/hành động sớm; reload giữ xác nhận (D54).

## Dùng máy và vòng đời phòng — 2026-10-26

- F24 — Debug dùng phòng tạm trong RAM, quản trò thoát thì xóa (2 giây grace cho reload; tín hiệu thoát bị mất thì lease 90 giây), người chơi thoát không xóa. Server thường không bật API xóa debug (D55).
- F25 — Chế độ thường cho người chơi/quản trò tiếp tục trên máy mới bằng mã phòng và tên cũ; thay phiên máy cũ, giữ vai/lượt/sẵn sàng (D56).
- F26 — Quản trò thêm thành viên dùng chung máy trước chia vai, lần lượt cho xem/đóng vai; đêm đến lượt thì tự hiện form của người đó cho quản trò thao tác theo người chơi. Người online giữ phiên và tương tác riêng; đủ tổng số người mới bắt đầu (D57).
- F27 — X máu nằm đúng tâm avatar; chi tiết thẻ chỉ dùng X góc trên để quay về danh sách vai, không có nút quay lại lớn ở dưới (D58).

- F28 — Quản trò bấm avatar mở menu gọn Chuyển sang offline / Rời khỏi trò chơi. Máy hết pin chuyển sang dùng máy quản trò, giữ vai/lượt; nghỉ giữa ván rút riêng người đó, không kích hoạt hiệu ứng chết, giữ chỗ ngồi và gỡ khỏi lượt/quorum (D59).

## Bổ sung ngày 2026-10-26 — D60

- Diễn biến: Đêm N: [tên] đã chết; Sáng N: [tên] bị vote chết; không có người chết ghi Không có ai chết.
- Tiên tri xem kết quả trong popup lớn: Sói nền đỏ, không phải Sói nền xanh; bấm Đã rõ, kể cả khi dùng máy quản trò.
- Cài đặt trước chia vai: tổng số ngày được không loại ai, 0–30 (mặc định 0). Mỗi phán quyết trống trừ một lượt; hết lượt phải chọn người. Giữ ngoại lệ vai Hoàng tử. Ván cũ giữ luật cũ; ván mới v12/schema7. Phiếu vẫn ngoài app.

## F24 — Bàn offline một máy và thao tác tối giản (D61, 2026-10-26)

Người dùng xác nhận cần chơi khi không có Internet. Quản trò chủ động thêm người không có điện thoại ở lobby; chọn chế độ một máy và tùy chọn tối giản trước chia vai. Quản trò nhập trực tiếp hành động theo vai, không chờ xác nhận thức dậy, không đợi từng Sói đồng thuận. Một lựa chọn chung được áp dụng cho các Sói đang có lượt; không đánh thức Sói ngủ hoặc tự thay luật. Tự bỏ qua vai vắng mặt, tự tổng kết đêm, vẫn có xác nhận kết quả soi và công bố sáng.

Ván lưu trên thiết bị, khôi phục khi tải lại. App và ảnh thẻ lưu sẵn sau lần mở bản build có mạng; dùng được khi mất Internet. Đây là ngoại lệ mở rộng offline đã được người dùng yêu cầu, thay giới hạn cũ chỉ chơi có Internet. Phòng online và quyền máy chủ vẫn giữ nguyên.

## Trang chủ — D62 (2026-10-26)

Vào phòng là tab mặc định bên trái; Tạo phòng là tab bên phải. Tạo phòng/bàn offline không yêu cầu nhập tên quản trò. Chỉ người chơi vào phòng cần mã phòng và tên của mình.

## Chọn chế độ tạo — D63 (2026-10-26)

Tab Tạo phòng dùng một nút chuyển Online / Offline thay cho checkbox. Online mặc định; chọn Offline để tạo bàn một máy lưu trên thiết bị.

## Tinh chỉnh D64–D66 (2026-10-26)

Online/Offline không có dòng chữ phụ gây lệch bố cục; nền chọn trượt mượt. Quản trò có nút Thoát phòng và xác nhận/Ở lại; bàn offline lưu để tiếp tục, phiên online giữ trên máy. Cài đặt Phù thủy thấy nạn nhân mặc định tắt cho ván mới từ giao diện.

## Mã phòng — D67 (2026-10-26)

Phòng/bàn tạo mới dùng mã 6 chữ số để nhập dễ trên điện thoại; ô mã dùng bàn phím số. Phòng và bàn đã lưu với mã chữ cũ vẫn hoạt động.

## Danh sách toàn bộ vai — D68 (2026-10-26)

Trong mục Vai, có thêm Toàn bộ vai trong game để xem ảnh/mô tả của mọi vai hiện được hỗ trợ, kể cả vai không được chọn cho ván. Danh sách người dùng máy quản trò có khoảng đệm hai bên cho tên và nhãn thao tác.

## Sổ tay quản trò — D69 (2026-10-26)

Sổ tay bí mật chia tab Người chơi, Chat Sói và Nhật ký. Trên điện thoại chỉ nội dung tab cuộn, nút đóng/thanh tab luôn nhìn thấy. Chat và nhật ký lọc được theo đêm; chuyển tab giữ vị trí cuộn.

## Giao diện gọi lượt — D70 (2026-10-26)

Đến lượt bạn hiện toàn màn hình để người chơi chú ý, với nút Tôi đã thức dậy lớn. Không lộ vai; xác nhận xong mới thấy form chọn hành động. Bộ lọc Đêm trong sổ tay nhỏ gọn, chữ nhẹ và đồng bộ giao diện.

## Trải nghiệm production — D74 (2026-10-27)

- Ảnh do app tự phục vụ, chuyển định dạng nhẹ và tải/cache trước để giảm chờ khi nhận/xem vai.
- Bàn ổn định khi vuốt và nhận cập nhật; người chơi có bàn lớn hơn, không có header MA SÓI/Đã đồng bộ. Icon mở/thu toàn màn hình ở góc trên phải.
- Chat bầy Sói mở toàn màn hình, bên ngoài chỉ vài tin xem trước. Mỗi lượt có hướng dẫn thao tác; dùng máy quản trò bỏ màn gọi thức dậy.
- Xem chi tiết vai từ danh sách tại lobby đóng về lobby ngay.
- Kết quả Tiên tri: “Là phe Sói”, biểu tượng đầu sói riêng đơn giản, tone đỏ đen; không dùng lá Ma Sói.

## Rời phòng, QR, nhớ tên và toàn màn hình — 2026-10-27

Người chơi có Rời phòng: xác nhận rồi rút hẳn, lobby bỏ ghế, ván đã chia giữ ghế đánh dấu rời và không kích hoạt chết dây chuyền. Máy chủ xác định người rời từ capability, không nhận ID người khác. Quản trò có icon QR cạnh mã phòng online; QR chỉ chứa link phòng. Tên người chơi được nhớ trên thiết bị sau khi vào thành công, có thể sửa lần sau. Icon góc màn hình mở/thoát fullscreen trình duyệt khi được hỗ trợ, khác icon phóng to bàn; iPhone không hỗ trợ hiện hướng dẫn Thêm vào Màn hình chính. Không ép Chrome qua QR.
