## 2026-10-30 — Làm gọn giao diện danh sách vai

- Bỏ dải nền đậm/in hoa/viền dày của tiêu đề phe; dùng chấm màu, chữ đậm và số lượng nhẹ hơn, giữ nút thu gọn.
- Tên vai màu chữ chính, giảm đường viền từng dòng; ô số lượng nhỏ gọn, vai đã chọn có nền màu rất nhẹ.
- Riêng cửa sổ bộ vai/danh sách vai bỏ viền ngoài, giảm bo góc; không đổi các cửa sổ khác.
- Build/TypeScript đạt; chưa xác minh trực quan trên Chrome. Chưa deploy/iPhone.

## 2026-10-30 — Thu gọn nhóm phe

- Bấm tiêu đề phe để đóng/mở danh sách trong hai mục xem vai và bộ chọn vai quản trò; mặc định mở, giữ trạng thái riêng từng mục trong phiên trang.
- Tổng thẻ vẫn hiện khi thu gọn; nút hỗ trợ bàn phím, aria-expanded/aria-controls và mũi tên chỉ trạng thái. Không thay số lượng vai khi thu gọn.
- TypeScript/build đạt; chưa kiểm trực quan Chrome. Chưa deploy/cập nhật iPhone.

## 2026-10-30 — Nhóm phe trong danh sách và bộ chọn vai

- Xếp Phe dân → Phe sói → Phe thứ ba trong cả hai mục xem vai và bộ chọn vai quản trò.
- Tiêu đề nhóm dùng dải nền màu, chữ lớn/đậm/in hoa, huy hiệu tổng thẻ; dòng vai thụt vào để không nhầm tiêu đề với một vai.
- Bộ chọn hiển thị tổng thẻ đã chọn mỗi phe, ưu tiên vai có số lượng > 0 lên đầu phe sau khi xác nhận thay đổi ô số; giữ thứ tự catalog trong mỗi nhóm đã chọn/chưa chọn. Vai đã chọn được tô rõ.
- Kiểm tra: TypeScript và build đạt. Chưa kiểm trực quan Chrome trong phiên này; môi trường chặn mở cổng local (EPERM). Chưa deploy hoặc cập nhật bản iPhone.

# Trạng thái làm việc

## 2026-10-30 — Danh sách vai theo phe

- Cả Vai trong ván này và Vai đã hỗ trợ chia theo thứ tự Phe sói (đỏ), Phe dân (xanh), Phe thứ ba (xám trung tính), có đường kẻ ngang giữa các nhóm. Giữ thứ tự cũ bên trong từng phe và thao tác mở chi tiết vai.
- Hiện tổng số thẻ trong bộ vai của ván hoặc số vai trong thư viện ở tiêu đề nhóm; bỏ nhóm rỗng. Dùng baseTeam của luật để phân loại vai ban đầu, không suy ra phe hiện tại hay số người còn sống.
- Kiểm: npm run build (bao gồm typecheck) đạt. Chưa kiểm trực quan trên thiết bị, chưa deploy hoặc cập nhật bản iPhone đã cài.
- Tiếp theo: kiểm giao diện trên điện thoại khi chơi thử.

## 2026-10-28 — Một ván web ↔ iPhone thật và sửa nối lại lúc đang gửi

- Tái hiện lỗi bằng đúng bundle iOS + plugin web fallback/dịch vụ phòng thật trong RAM: máy chủ đã nhận join nhưng ACK bị mất; foreground đến khi POST busy bị bỏ qua, người chơi mắc ở Thử gửi lại. Đã thêm hàng đợi nối lại sau khi write kết thúc; retry đúng requestId, không tự nhận kết quả khi chưa có ACK. Khi không còn pending, sự kiện nối lại lấy trạng thái mới ngay, không chờ lượt polling cũ.
- Kiểm có kiểm soát sau sửa đạt: 2 POST join cùng ID nhưng chỉ một người; snapshot GET cũ bị giữ qua background không ghi đè snapshot mới; polling dừng khi nền và khởi động ngay khi trở về. Script `test:ios-reconnect` chạy ở local, không dùng cloud/phiên thật.
- Đã phối hợp cùng người dùng kiểm một phòng production riêng: quản trò trên web masoi.yennhi.tech, 4 ghế dùng chung máy và 1 người chơi trên bản Release iPhone Test (bundle riêng, không đụng dữ liệu app chính). Đi lobby → chia vai/ready → đêm → ngày → kết thúc. Người dùng xác nhận khóa/mở nhận vai không nhập lại; chuyển app khi công bố sáng thì tự cập nhật và thao tác mượt; vuốt đóng, web kết thúc, cập nhật Test/mở lại vẫn đúng phòng và trạng thái Kết thúc. Web DOM cũng được kiểm hiện Kết thúc; replay cùng verdict không tăng revision.
- Không ghi là XCTest native tự động đạt: runner ba lượt lỗi bootstrap, UI Automation ban đầu tắt; sau đó cài Test báo giới hạn app của profile miễn phí. Đã gỡ runner do tác vụ tạo, chuyển sang kiểm phối hợp thực tế. Có scheme/Swift test đã build-for-testing để tái dùng khi đủ điều kiện. Thêm scheme App chia sẻ rõ ràng để luồng build chính vẫn hoạt động; suffix/display name tham số hóa chỉ để cô lập bản kiểm.
- Kiểm: 275/275 Node tests; Chrome 7 tab/UI regression; web/iOS build + typecheck; Release arm64 bản chính và Test; `git diff --check` đạt. Postman request cấu hình production hiện tại: 1 request, 3 assertions, 0 failed, exit 0, không report lên workspace. Chỉ config được Postman xác minh; các tình huống vòng đời do kiểm local và bước iPhone thực tế xác minh.
- Đã cập nhật/cài/mở bản chính vn.masoi.app trên T21 với bản sửa mới, giữ dữ liệu; gỡ app Test riêng; phòng thử đã kết thúc và đóng profile Chrome tạm. Không deploy web, không đổi server/API/schema/luật. Người dùng có thể tắt lại UI Automation đã bật để thử.
- Bằng chứng đã lược token/tên/mã phòng: [iphone-online-lifecycle.json](verification/iphone-online-lifecycle.json); đầu ra Postman nguyên văn: [iphone-postman-config.txt](verification/iphone-postman-config.txt). Độ mượt là quan sát người dùng trên T21, chưa có số đo FPS/pin bằng Instruments; không suy thành bảo đảm mọi thiết bị/mọi mạng.

## 2026-10-28 — Sửa QR masoi.yennhi.tech, logo mới và ẩn status bar iPhone (D77)

- Người dùng xác nhận bản đầu mở và thao tác được trên T21. Sau đó báo quét QR từ web đọc được nhưng không điền mã; xác nhận domain `masoi.yennhi.tech`. Nguyên nhân parser chỉ nhận cùng origin Vercel. Cho nhận chéo hai HTTPS origin production, vẫn chặn host lạ/lookalike/credential/HTTP/local và không lấy API host từ QR. Giữ tên và bước bấm Vào phòng.
- Tạo logo Sói/trăng vàng nền tối bằng imagegen; nguồn/prompt tại docs/branding, icon 1024×1024 sRGB không alpha đã đưa vào asset catalog iOS.
- Bật SystemBars.hidden và UIStatusBarHidden để ẩn giờ/sóng/pin, Home indicator tự ẩn. Nền phủ màn hình; giữ safe area tránh Dynamic Island/tai thỏ phần cứng. Dùng API cấu hình tích hợp Capacitor; không override thuộc tính Home indicator không-open của framework.
- Xác nhận hai domain đều trả API config 200, Supabase, 64 vai (chỉ đọc; không ghi production). 10/10 tests QR/native storage/product boundaries đạt, web/iOS build và typecheck đạt, Chrome smoke 7 tab đạt. Script mới `npm run test:ios-shell` dùng đúng bundle iOS, profile mới/chặn HTTPS và plugin web fallback: hình QR custom domain qua video camera giả lập điền mã/giữ tên/đóng camera; tạo/thêm người/lưu bàn và mở lại từ `/`, giải mã đủ 64 ảnh cục bộ, không service worker. Không thay thế kiểm camera/lưu native/máy bay thật.
- Xcode Release arm64 build thành công, đã cập nhật và mở app trên iPhone T21 đang cắm, giữ dữ liệu app. Kiểm bundle đã ký có SystemBars.hidden, UIStatusBarHidden và đủ 64 WebP. Không deploy web/publish App Store. Bước tiếp theo: người dùng quét lại QR tên miền riêng và xác nhận status bar/icon trên máy thật.

## 2026-10-28 — Bản iPhone Capacitor, đã cài Release lên thiết bị thật (D76)

- Theo yêu cầu người dùng, tạo project `ios/App/App.xcodeproj` (Capacitor 8.5.3/SPM, bundle `vn.masoi.app`, iOS 15+). Giữ online/offline và cùng engine/catalog 64 vai với web. Cập nhật PRODUCT/DECISIONS/AGENTS theo phạm vi native mới.
- Build iOS riêng `dist-ios`, chứa toàn bộ UI/engine/64 ảnh; không service worker hoặc website tải từ xa. Dùng native HTTP tới máy chủ hiện tại, link/QR mời dùng web origin; giữ hợp đồng máy chủ, kiểm quyền và request ID. Web build vẫn độc lập, không chứa runtime/plugin native.
- Bộ nhớ native Preferences document v1 hydrate trước main; commit trước xác nhận bàn offline, rollback bộ nhớ khi lỗi ghi và giữ request để retry. Lưu phiên/thao tác đang chờ/route để mở lại. Dữ liệu Safari và app độc lập. Không in bridge chứa token/vai.
- Startup không chờ mạng khi khôi phục offline; phản hồi nhấn tức thì, rung lựa chọn, safe area/nền tối/status bar sáng; bỏ nút fullscreen trình duyệt trong app. Không blur toàn màn hình native, chỉ giải mã trước 4 ảnh phổ biến khi rảnh, nhường luồng giữa các cặp. Poll dừng khi app xuống nền và nối lại khi trở về/có mạng. Giữ chu kỳ 750/1500 ms và cập nhật DOM từng phần.
- Có icon theo hình trăng hiện tại, mô tả quyền camera, PrivacyInfo UserDefaults. Chứng chỉ/provisioning không đưa vào Git; Team local trong xcconfig được ignore. Hướng dẫn tại [IPHONE.md](IPHONE.md).
- Kiểm: 274/274 Node tests đạt; sau tinh chỉnh lifecycle/refresh chạy lại 23/23 tests lưu native/offline/QR/ranh giới build đạt. Smoke Chrome 7 tab đạt (phiên độc lập/reload, retry cùng request, giữ DOM/bố cục 390px, avatar/chat/soi/fullscreen). Build web và iOS/typecheck đạt, `git diff --check` đạt. Audit runtime không có lỗ hổng được báo; npm audit toàn bộ còn 3 moderate trong dependency công cụ CLI (xcode/uuid), không nằm trong runtime app.
- Xcode build Debug và Release cho iPhone arm64 thành công; ký và cài/mở thành công trên iPhone thật T21 đang cắm (iOS 26.2.1). Người dùng chọn bỏ Simulator; chưa chạy kiểm UI trên Simulator. Bản đang cài cuối mốc là Release. Provisioning bản thử hết hạn 04/11/2026 lúc 03:33 (UTC+7); cần ký/cài lại sau đó nếu tiếp tục dùng cơ chế phát triển này.
- Giới hạn: thành công cài/mở không thay thế xác nhận UI/chơi thật. Chưa nghiệm thu camera/rung/keyboard/airplane-mode/reconnect/FPS/pin trên điện thoại; đã hỏi người dùng về màn hình thực tế. Không deploy web, không publish App Store, không sửa backend hoặc luật. Bước tiếp theo là thử online cùng web, offline khi máy bay, đóng/mở ván, rồi đo điểm khựng trên iPhone thật.

## 2026-10-28 — Camera trên HTTP mạng nội bộ

- Người dùng xác nhận iPhone Chrome đang mở địa chỉ HTTP LAN: không phải secure context nên không có hộp xin quyền camera. Quét trực tiếp cần HTTPS được thiết bị tin cậy.
- Scanner kiểm tra secure context/API trước khi xin quyền, báo riêng lỗi quyền/camera bận/không có camera/phát video, có nút thử lại; đặt muted và playsInline bằng thuộc tính video.
- Build/typecheck và 2 tests QR đạt; chưa thử camera iPhone thật, chưa deploy.

## 2026-10-28 — Quét QR trên màn Vào phòng

- Nút Quét QR cạnh ô mã, ưu tiên camera sau, điền mã sáu số từ QR cùng origin hoặc mã thuần. Giữ nguyên ô tên (kể cả tên đã lưu), không tự gửi yêu cầu vào phòng. Tắt camera khi đóng/quét thành công/ẩn trang; báo cách nhập tay nếu không mở được camera.
- jsQR tải động khi bấm quét; loại chunk scanner khỏi precache để không tải nền ở lần mở app. Chunk scanner 131.91 kB, gzip 48.71 kB; bundle chính gzip 68.62 kB.
- Build/typecheck, 2 tests QR (phân tích URL và giải QR do qrcode tạo), 3 product boundaries đạt. Chưa kiểm camera iPhone thật, chưa deploy.

## 2026-10-28 — Vai quen thuộc đứng trước trong thư viện

- Danh sách xem 64 vai ưu tiên Dân làng, Ma sói, Tiên tri, Bảo vệ, Phù thủy, Thợ săn, Thần tình yêu; tiếp đến các vai quen thuộc mở rộng rồi phần còn lại theo thứ tự thư viện nguồn. Đây là thứ tự biên tập, không phải thống kê tần suất chơi.
- Giữ đủ vai, nguyên mô tả/ảnh và dữ liệu cards.json; không đổi luật hay thứ tự chia vai. Build/typecheck đạt; chưa deploy.

## 2026-10-28 — Gom công cụ phòng vào Cài đặt

- Thanh phòng quản trò/người chơi chỉ giữ Cài đặt và Vai; ID/QR vẫn bên phải. Cài đặt mở danh sách Toàn màn hình, Sao chép link, Làm mới, Rời/Thoát phòng; quản trò ở lobby có mục Cài đặt ván chơi. Chế độ dùng máy quản trò có mục quay về quản trò.
- Build/typecheck, smoke Chrome 7 tab (bao gồm bố cục 390px, fullscreen và rời phòng), diff check đều đạt. Chưa deploy, chưa kiểm tra iPhone thật.

## 2026-10-28 — Nhãn dưới icon công cụ phòng

- Thêm nhãn “Sao chép”, “Toàn màn hình” (đổi thành “Thu nhỏ” khi đang fullscreen) dưới icon; dùng cùng bố cục icon trên, nhãn dưới cho công cụ phòng.
- Giữ công cụ bên trái, ID bên phải và nút thu nhỏ bàn riêng.
- Kiểm tra: `npm run build`, smoke Chrome 7 tab `node scripts/test-ui-performance.mjs --smoke`, `git diff --check` đều đạt. Chưa deploy; chưa kiểm tra trên iPhone thật.

## 2026-10-27 — Tách icon toàn màn hình và đổi vị trí thanh phòng

- Bỏ icon fullscreen trình duyệt cố định góc trên và khoảng trống 38px riêng. Đặt vào room-tools với icon cửa sổ riêng; công cụ bên trái, mã phòng/QR bên phải, công cụ tự xuống dòng trong vùng của mình khi màn hẹp.
- Phóng to bàn giữ icon bốn góc, khi mở có nút thu nhỏ 44px nằm trên bàn, không bị icon trình duyệt che. Fullscreen trình duyệt và phóng to bàn hoạt động độc lập.
- Typecheck/build đạt, Chrome regression kiểm vị trí thanh/ID trên 390px, elementFromPoint tại nút thu nhỏ trúng đúng nút, phóng bàn không bật Fullscreen API. Chưa deploy.

## 2026-10-27 — Rời ván, QR, nhớ tên và fullscreen trình duyệt

- Player có Rời phòng cả ở nhận vai/gọi dậy; xác nhận rút hẳn. API leave tự xác định danh tính; lobby xóa ghế, giữa ván withdrawPlayer không hiệu ứng chết dây chuyền, bỏ quorum/lượt; thu hồi quyền đọc. Reply chỉ left/code, retry cùng request vẫn thành công không trả bí mật. Client xóa phiên phòng sau ACK, giữ tên. Quản trò và giả mạo playerId bị chặn. Không schema migration.
- Icon QR cạnh ID ở quản trò phòng online, SVG QR tạo tại thiết bị bằng qrcode, URL phòng không có credential. Offline không có QR mời vào phòng. Nhớ tên sau join thành công qua localStorage, debug cô lập sessionStorage.
- Icon fullscreen riêng cố định góc màn hình gọi requestFullscreen/exitFullscreen và theo fullscreenchange. Không hỗ trợ/bị từ chối hiện hướng dẫn iPhone Chrome/Safari Chia sẻ → Thêm vào Màn hình chính. Manifest standalone và metadata iOS đã thêm. Không hứa ép Chrome hay tự fullscreen khi quét QR.
- Kiểm 24 tests rooms/withdrawal và 3 product boundaries đạt; build/typecheck đạt; Chrome 7 tab kiểm QR xuất hiện, xác nhận/hủy rời, member left và tên điền lại; kiểm requestFullscreen/exitFullscreen với user gesture và hướng dẫn khi fullscreenEnabled=false. Postman spec syntax và collection lint đạt. Lượt Postman đầu lỗi token fixture có dấu gạch, đã sửa generator thành hex; lượt cuối 6 requests, 8 assertions, 0 failures. Chưa kiểm camera iPhone/Safari thật; chưa deploy.


## 2026-10-27 — Loading giữa màn hình khi tạo phòng

- Khi create đang gửi, hiện spinner giữa viewport trên lớp nền dịu, không banner chữ; không chạy đồng thời spinner trên nút. Các thao tác khác giữ loading tại nút. Thành công/lỗi đều đóng lớp loading; mất ACK vẫn có retry đúng request cũ.
- Build/typecheck và Chrome 7 tab regression đạt, bổ sung đo tâm spinner theo viewport khi giữ ACK, xác nhận không banner và retry không tạo trùng.
- Kiểm chỉ đọc production: bundle main-Du0uwrvy.js đã có aria-busy, không chứa “Đang gửi thao tác”, chưa có create-loading. Nếu người dùng còn thấy câu cũ có thể tab/service worker vẫn giữ build trước; chưa xác minh cache trên máy người dùng. Bản loading giữa màn hình chưa deploy.

## 2026-10-27 — Đã phát hành v14 lên production

- Người dùng yêu cầu đưa toàn bộ sửa đổi lên production. Đã ghép main 2c037cf vào bản 64 vai, giữ tối ưu WebP/DOM/loading/fullscreen/chat; push main commit code 3283ce1. Production https://multi-online.vercel.app phục vụ bundle main-Du0uwrvy.js khớp build đã kiểm.
- Kiểm cuối: 266/266 Node tests, 8/8 data tests, typecheck/build và UI nhiều tab đạt. Sửa thêm xác nhận popup cho mọi loại kết quả riêng, tránh mở lại sau khi bấm Đã rõ.
- Kiểm thật trên Vercel + Supabase bằng phòng thử riêng: catalog 64; classic-core-v14/schema9; hai Mason nhận kết quả riêng; Ghost chỉ công khai sau duyệt; Vampire giữ nạn nhân đến sau phán quyết; replay receipt cũ không thay đổi revision. Nhật ký không chứa token: [v14-production-smoke.json](verification/v14-production-smoke.json).
- Chrome xác nhận trang và service worker tải được bundle production mới. Không đổi secret/SQL/RLS. Ván v8–v13 giữ luật cũ; tạo ván mới để dùng v14. Người đang mở trang nên tải lại một lần nhận giao diện mới.
- Các ghi chú “chưa deploy” bên dưới là lịch sử trước lần phát hành này. Vẫn chưa chứng minh mọi tổ hợp 64 vai hoặc nhiều điện thoại vật lý.

## 2026-10-27 — Ghép bản 64 vai với tối ưu production, chuẩn bị phát hành

- Ghép toàn bộ v14 với main 2c037cf, giữ DOM patch/loading tại nút, fullscreen/chat, ảnh WebP và các sửa hiệu năng. Xóa PNG trùng để service worker chỉ cache 64 WebP.
- Kiểm tra lại sau ghép: 265/265 Node tests; typecheck/build đạt; script UI nhiều tab đạt (DOM/viewport/avatar/chat/soi). Bổ sung sửa xác nhận popup kết quả cho mọi vai thông tin, 7/7 presentation tests đạt.
- Người dùng đã yêu cầu đưa toàn bộ sửa đổi lên production. Đang phát hành qua nhánh main, không thay secret hoặc SQL/RLS.

## 2026-10-27 — Tiếp quản và mở rộng 64 vai (nhánh riêng, chưa deploy)

- Ván mới classic-core-v14/schema9: catalog/core/ảnh offline đủ 64 ID nguồn. Bổ sung 37 vai, lượt chọn/xác nhận/thông tin riêng, phe thứ ba, thắng thay thế, Vampire sau treo cổ, Ghost cần duyệt, Minion cắn cùng bầy và Frankenstein tích lũy kỹ năng. Giữ nguyên mô tả nguồn và luật Hunter của người dùng.
- Ván v8–v13 giữ version/schema cũ và 27 ID legacy đóng băng. Không cần SQL migration. Lựa chọn ghế/avatar và luồng một máy dùng chung engine; hai Mason không còn dùng chung một lượt kết quả.
- Sửa lỗi cắt receipt của bản nháp: replay hơn 300 yêu cầu không đổi lại mục tiêu cũ. Giữ receipt, thêm quota per-step cùng đường hỗ trợ của quản trò. Không tuyên bố document được giới hạn tuyệt đối cho ván dài vô hạn.
- Kiểm: 263/263 Node tests (gồm 100 ván nền và 100 bàn trộn v14), 8/8 data tests; typecheck/build đạt. HTTP audit 40 kiểm tra; Postman v14 4 requests/8 assertions/0 failed và Hunter 46 requests/50 assertions/0 failed. Syntax lint đạt, governance lint chưa chạy vì CLI chưa đăng nhập.
- Chrome mobile 390×844: hai Mason xác nhận riêng, form Nostradamus, avatar cắn/Vampire, gửi và duyệt Ghost khi mất mạng; bản build cache đủ 64 ảnh, reload và tạo bàn offline khi network fetch bị chặn. Không tràn ngang ở màn đã kiểm.
- Ba vòng **tự rà soát nối tiếp**, không giả danh reviewer độc lập. Chưa kiểm mọi tổ hợp, điện thoại vật lý hoặc v14 trên production. Không push/merge/deploy. Bản production vẫn ở v13; thay đổi nằm trong `.agent-roles64-worktree`, nhánh `agent/roles-64`.
- Luật/quy ước: [role-contracts-v14.md](verification/role-contracts-v14.md). Kiểm chứng và giới hạn: [roles-v14-review.md](verification/roles-v14-review.md).

## 2026-10-27 — Gửi thao tác yên lặng, loading tại nút

- Bỏ banner “Đang gửi thao tác… Vui lòng chờ máy chủ xác nhận” trong yêu cầu bình thường. Nút vừa bấm giữ kích thước/nhãn trợ năng, có aria-busy và spinner sau 180ms để phản hồi nhanh không nháy loading. Tôn trọng giảm chuyển động; vẫn khóa gửi trùng.
- Chỉ báo khi có lỗi/mất ACK; gộp thông báo và Thử gửi lại thành một banner. Retry vẫn giữ nguyên capability/requestId/payload, không giả định thao tác đã thành công.
- Typecheck/build đạt. Chrome 7 tab regression đạt; thêm mô phỏng giữ rồi mất ACK tạo phòng: không banner khi gửi, nút không đổi rộng, mất ACK chỉ một banner, retry cùng payload và xóa loading khi thành công. Chưa deploy.

## 2026-10-27 — Sửa báo thức dậy nhầm ở lượt Thợ săn ban đêm

- Nguyên nhân: publicView còn ánh xạ mọi step hunter thành day theo luật bắn sau công bố sáng cũ. V13 gọi Thợ săn trong đêm nên người không có lượt nhận phase day và UI báo “Cả làng thức dậy”.
- Chỉ coi hunter là day ở luật cũ; v13 giữ night cho cả chủ động/bị động, review và resolve, tới publish mới day. Không đổi schema/lệnh/quyền hoặc luật Thợ săn; phòng online và bàn local dùng chung projection đã sửa.
- Kiểm: 51 tests hunter-night/interactions/rooms đạt, gồm hai hồi quy đầy đủ qua đêm → resolve → publish → đêm sau và tương thích Thợ săn cũ. Typecheck/build đạt. Chưa deploy bản sửa này.

## 2026-10-27 — Giảm giật giao diện, ảnh WebP và bàn/chat toàn màn hình

- Thay dựng lại toàn bộ DOM bằng patch có khóa ổn định cho khung bàn/ghế; cập nhật vẫn theo snapshot máy chủ, giữ focus/draft và ảnh đã decode. Thông báo gửi nổi không đẩy bố cục. Bàn thường tính theo chiều rộng, không theo chiều cao thanh trình duyệt; bỏ co bàn xuống 140px khi có lượt/chat. Màn người chơi ẩn header MA SÓI/Đã đồng bộ, bàn lớn hơn; icon mở/thu toàn màn hình ở góc phải trên, có nhãn trợ năng/Escape.
- Chi tiết vai mở trực tiếp từ danh sách ở lobby đóng về lobby ngay. Mở từ catalog vẫn quay đúng danh sách. Chat Sói bên ngoài chỉ xem trước hai tin, bấm mở toàn màn hình có ô gửi; giữ vị trí đọc hoặc theo tin mới khi đang ở cuối.
- Thêm hướng dẫn hành động theo lượt. Player projection dùng chung máy không hiện overlay gọi dậy; Xác nhận gửi wake rồi act qua hai lệnh hợp lệ hiện có, giữ requestId/retry và chờ ACK từng lệnh. Chưa gộp hai lệnh API.
- Tiên tri hiện “Là phe Sói” cùng biểu tượng đầu sói SVG riêng, nhúng trực tiếp, đỏ/đen; không dùng lá Ma Sói. Không thay luật kết quả soi/ngoại lệ vai.
- Tải đủ 64 ảnh theo cards.json vào cache nguồn local data/source-cards (gitignore), chuyển WebP q88 giữ nguyên độ phân giải, lưu public/offline-cards. 64 ảnh: 14.075.037 → 1.647.924 bytes (~88,3%); 27 vai đang chạy: 7.858.360 → 932.852 bytes (~88,1%). Không đổi cards.json hoặc bật vai chưa có core. Runtime chỉ dùng ảnh cùng origin, tải/decode trước 27 vai theo hàng đợi 2 ảnh; SW cache cả 64 WebP. Xóa PNG trùng khỏi public. npm run gen:images cần cwebp, chỉ tải nguồn thiếu.
- Poll khi đang chơi ban đêm giảm khoảng nghỉ 1500→750ms; lobby/ngày giữ 1500ms, lỗi 5000ms, tab ẩn không poll. Đây là đổi độ trễ nhận cập nhật, không phải cam kết tốc độ API; số GET khi đêm tăng. Không thay API/schema/luật hoặc cấu hình vùng sin1 đã có.
- Kiểm: typecheck/build đạt; 225/225 Node tests; Chrome 7 tab smoke đạt. scripts/test-ui-performance.mjs kiểm đóng vai trực tiếp, DOM bàn/ghế giữ nguyên, chiều cao viewport 844→650 tại rộng 390 không đổi cỡ bàn, header ẩn, fullscreen, ready/wake, hướng dẫn/avatar, chat và kết quả soi/biểu tượng. Đã thử riêng proxy Tiên tri ở chế độ không tối giản: không overlay wake, một lần Xác nhận ra kết quả, Đã rõ về quản trò.
- Kiểm production chỉ đọc `/api/room?config=1`: HTTP 200 cả 3 lượt, x-vercel-id chứa hkg1::sin1, thời gian 718/169/96ms. Endpoint config không truy vấn DB; không coi đây là số đo tạo phòng hoặc bằng chứng cold start.
- Kiểm build bằng Chrome: SW có 64 WebP/0 PNG thẻ, không request ảnh tới nguồn; chặn mạng, reload vẫn tạo bàn local và xem ảnh Tiên tri được; request chưa cache thất bại xác nhận mạng đã chặn. Chưa thử điện thoại vật lý, chưa đo tải nhiều phòng hoặc đo cold start production. Chưa commit/push/deploy.


## 2026-10-27 — Chrome thử tự tạo phòng và sáu người chơi

- `npm run test:players` tự chạy server debug RAM ở cổng trống, mở một cửa sổ Chrome tạm gồm quản trò ngẫu nhiên và A–F tự vào phòng mã ngẫu nhiên. Không cần nhập mã, server có sẵn hoặc các profile người chơi. Đóng Chrome/Ctrl+C dừng server và dọn thư mục tạm.
- Phiên/capability và pending trong debug lưu sessionStorage theo tab; production vẫn dùng localStorage theo thiết bị. Không đổi API, luật, schema hoặc build sản phẩm. Không tự chia vai/bắt đầu ván.
- Kiểm: typecheck đạt; 6 tests debug lifetime/product boundaries đạt (bao gồm build thường và build mode debug); Chrome headless smoke đạt tạo phòng sáu số, 6 người vào, 7 capability khác nhau, cùng windowId, reload sáu tab giữ đúng danh tính và không ghi capability vào localStorage.
- Chưa kiểm trọn ván hoặc nhiều máy vật lý; tiếp theo chọn bộ vai/chia vai tại cửa sổ vừa mở để thử thao tác các vai.

## 2026-10-27 — Sửa độ trễ production và trạng thái gửi

- Chẩn đoán trực tiếp dashboard: default Function Region iad1 (Mỹ), Supabase ap-southeast-1 (Singapore). Đã đặt regions sin1 trong vercel.json, commit d905db6; guard đọc cũ ở 6f8ccd8. Production asset đã khớp build mới.
- Pending không đồng nghĩa thất bại: khi busy chỉ hiện Đang gửi thao tác, không có nút retry. Chỉ khi mất ACK mới cho retry. Giữ nguyên capability/requestId; xóa notice cũ lúc retry. Client timeout 12s bao phủ hai lượt upstream 5s. ACK thành công dùng snapshot trả về, bỏ GET dư; đọc bắt đầu trước write bị vô hiệu bằng readSequence để tránh đè ACK. Poll thường giữ 1.5s; ván/luật/schema không thay đổi.
- Đo từ cùng máy, 3 lượt create/read/write trước/sau (verification/latency-before.json và latency-after.json): create median 1420→260ms; read 1126→144ms; write 1437→342ms. Một write sau 835ms; số liệu nhỏ, không cam kết p95 hay mọi mạng. Không lộ token/key/role vào artifacts.
- Kiểm: typecheck/build đạt, 16 test boundaries/rooms đạt; Postman Room codes 5 requests/9 assertions/0 failures. Chrome chạy production bundle qua proxy cục bộ giữ ACK: đang gửi không hiện retry; mô phỏng đã lưu nhưng mất phản hồi rồi retry trở về đúng phòng cũ, cùng requestId, không tạo trùng. GET đầu tiên sau ACK 1522ms (không còn GET tức thì). Debug in-memory tránh network/database, do đó vẫn nhanh hơn online; chưa chuyển sang Realtime.


## 2026-10-27 — Thợ săn v13 và avatar mục tiêu

- Luật người dùng chốt: mặc định bị động ghim mỗi đêm, chết đêm mọi nguyên nhân kéo người ghim đêm đó chết theo; chết ban ngày không bắn. Tùy chọn chủ động thay thế: một phát cả ván, được giữ lại; trúng team Sói lúc chốt thì sống, sai thì cả hai chết. Bảo vệ/cứu không chặn phát bắn. Tổng kết cùng đợt đêm; không lộ nguyên nhân.
- classic-core-v13/schema8 cho ván mới; v8–v12 giữ đúng luật/ghép schema cũ (gồm chat, clocks, skip budget). Thợ săn Nhân bản không nạp lại đạn chủ động hay sao chép ghim. Không cần SQL migration. Test tương tác luật Thợ săn cũ được đánh dấu legacyHunter rõ, vẫn có kiểm tra 100 ván seed theo luật mới.
- Chọn mục tiêu đêm qua avatar, nhiều mục tiêu có từng ô chọn; giữ Xác nhận riêng. Viền vàng mục tiêu, đỏ đồng đội sống từ pack projection khi thức ở lượt bầy. Sửa giảm sáng awaiting-ready; offline không làm người sống tối đi. Menu quản lý riêng trên avatar khi đang chọn mục tiêu ở chế độ tối giản.
- Kiểm: 225/225 Node tests, typecheck và build đạt. Spec syntax lint/collection lint đạt. Postman Night modes 46 requests/50 assertions/0 failures (log verification/hunter-modes-postman.txt). Chrome đã thử ghim Thợ săn, tự sang Sói, chọn avatar, menu quản lý; đo tất cả ghế sống opacity 1, 0 select mục tiêu, viền đỏ chỉ đúng Sói đã biết và viền chọn độc lập. Chiều rộng 390 không tràn ngang.
- Đã push 3aae288 và 5aea8c0, production asset khớp build mới. Đã chạy trọn lượt đêm thật trên Vercel + Supabase cho cả passive và active: schema8/v13, mục tiêu và Thợ săn sống/chết đúng, thắng được xét sau đợt chết. Hai bàn dữ liệu thử sẽ hết hạn theo TTL thường.
- Chưa thử nhiều điện thoại vật lý hoặc mọi tổ hợp vai trên giao diện; core/privacy/legacy/offline có test tự động.


## 2026-10-26 — Bộ vai công khai ngay màn chờ người chơi

- Giữ nút Vai và contract setDeck có sẵn. Thêm danh sách vai và số lượng trực tiếp ở lobby người chơi trước khi chia; bấm từng vai xem ảnh/mô tả. Chỉ hiện bộ vai quản trò đã lưu, không lộ phân vai. Bộ vai chưa lưu có thông báo rõ.
- Kiểm: typecheck + production build đạt; test lobby deck public/persistence/authorization/retry đạt.


## 2026-10-26 — Supabase và Vercel production đã kiểm chứng

- Người dùng đã chạy 5 migration và kiểm tra RLS/grants. Đã cấu hình server-only env cục bộ và trên Vercel theo xác nhận của người dùng; không ghi giá trị bí mật vào repo.
- Production: https://multi-online.vercel.app — repo main, bản sửa deployment `45fcacc`. Lần deploy đầu lỗi ERR_MODULE_NOT_FOUND do import `.ts` trong JS emitted; bật `rewriteRelativeImportExtensions` để compiler viết đường dẫn `.js`. Không đổi contract, luật hay schema.
- Đã kiểm: handler JS biên dịch load được độc lập; 6 test product boundaries/room codes đạt; typecheck + production build đạt; production config HTTP 200 storage=supabase; tạo phòng qua Chrome thành công, xác minh bản ghi thật qua Supabase; client khác join và đọc lại đều HTTP 200, revision tăng. Phòng dùng dữ liệu thử.
- Chưa kiểm trọn ván nhiều điện thoại hoặc chế độ máy bay trên điện thoại thật. Git main tự deploy sau push; các tài liệu đang sửa khác được giữ nguyên, chưa đưa vào commit sửa runtime.


Cập nhật: 2026-10-26 (Asia/Ho_Chi_Minh). **Core 27/64 vai, luật classic-core-v12, Game schemaVersion=7 cho ván mới; ván v11/schema6 (không giới hạn bỏ vote), v10/schema5 (không đồng hồ), v9/schema4 (không chat) và v8/schema3 đã lưu giữ luật cũ đến hết ván.** Còn 37 vai có thể bổ sung sau. Ưu tiên hiện hành là luồng online; bản local đang được kiểm chứng, chưa deploy hoặc có project Supabase.

## Hướng dẫn người dùng tự kết nối và deploy (2026-10-26)

- Viết lại ONLINE_SETUP theo repo thực tế: Node local đang 26.5.0 nên khuyên test bằng Node 24 LTS tương ứng Vercel; Git root/nhánh main/repo multi-online, Root Directory cloud là dấu chấm.
- Nêu rõ 5 migration theo thứ tự, key server-only, SQL kiểm bảng/RPC/RLS/quyền, test adapter bằng dev:online và xác nhận hàng thật. Sửa hướng dẫn cũ nhầm debug để kiểm Supabase: debug luôn dùng RAM.
- Bao gồm cấu hình Vercel, env Production/Preview và redeploy, checklist nhiều máy/offline/khôi phục, bảng lỗi thường gặp. Đối chiếu tài liệu Supabase/Vercel chính thức tại ngày hướng dẫn. Chỉ sửa tài liệu, không kết nối cloud, không deploy, không chạy SQL hoặc xem secret thực tế.

## Bộ lọc gọn và gọi lượt toàn màn hình (D70, 2026-10-26)

- Select Tất cả/Đêm đổi thành cụm căn phải, font 13px weight 400, nền surface/viền nhẹ/mũi tên SVG; focus panel sổ tay dùng viền nhẹ.
- Player có turn chưa awake ở phase playing được overlay toàn màn hình (alertdialog), tiêu đề lớn, icon mắt và nút Tôi đã thức dậy. Không hiện tên vai. Dùng lệnh wake cũ, không đánh dấu trên client; khi nhận snapshot awake mới bỏ overlay. Giữ ready/ended/simplified moderator không có overlay. Focus được đưa tới nút wake, trap trong overlay, Escape không đóng, thông báo lỗi gửi nằm trong overlay.
- Browser 320×568 fixture normal local dùng player projection: overlay bằng viewport, nút lọt màn/nhận focus, chỉ có một nút wake; reload vẫn hiện, Escape không đóng. Bấm wake đóng overlay và hiện form Bảo vệ; gửi hành động về quản trò được. Sổ tay Nhật ký đo font13px/weight400/select40px, custom arrow và không tràn màn. **50/50 test** engine/rooms/offline-table/product-boundaries đạt; build/typecheck và git diff --check sạch. Chưa kiểm điện thoại vật lý/iOS; không deploy.

## Sổ tay bí mật chia tab (D69, 2026-10-26)

- Thay nội dung dài liên tục bằng ba tab Người chơi / Chat Sói / Nhật ký. Header/tab/đóng nằm ngoài vùng cuộn; dialog giới hạn viewport. Tab có aria-selected/tabpanel, roving focus và Arrow/Home/End. Mỗi tab giữ scroll riêng; đổi filter reset scroll chat/history. Bàn mới reset trạng thái sổ tay.
- Chat/nhật ký lọc theo đêm hoặc Tất cả; nhật ký hiển thị mới nhất trước và không cắt còn 15 dòng. Giữ ghi chú luật trên tab Người chơi; trạng thái Đã rời phân biệt Đã chết. Chỉ render từ moderator snapshot, giữ escape nội dung. Không đổi API/schema/engine.
- Browser fixture thật 7 người, hai đêm, 4 tin Sói và 17 sự kiện: ở 320×568 dialog lọt màn, không tràn ngang, danh sách người chơi cuộn trong body; Chat có 4 tin, lọc đêm 1 còn 2, ký tự HTML hiện như chữ; nhật ký cùng filter đúng; về Người chơi giữ scroll 120px, phím phải chọn Chat. **14/14 test** presentation/product-boundaries/pack-chat đạt, build/typecheck và git diff --check sạch. Chưa kiểm điện thoại vật lý, không deploy.

## Toàn bộ vai trong game và đệm dòng người chơi (D68, 2026-10-26)

- Cửa sổ Vai trong ván này thêm nút Toàn bộ vai trong game, hiển thị 27 vai catalog theo tên; kể cả chưa có bộ vai vẫn mở được. Chi tiết dùng ảnh/mô tả hiện có, không thay dữ liệu nguồn. X/Escape quay lại đúng danh sách; danh sách toàn bộ quay về bộ ván. Không đổi API/luật/quyền.
- Dòng offline-person thêm padding ngang 12px, bo góc hover, tên co/wrap và nhãn thao tác không co. Khắc phục Xem vai sát mép theo ảnh người dùng.
- Browser xác nhận có đủ 27 vai khi bộ ván trống, mở Sói con và quay lại đúng hai cấp; ở 320×568 kiểm dòng Xem vai có padding 12px, không tràn ngang. **13/13 test** presentation/catalog/product-boundaries đạt, build/typecheck và git diff --check đạt. Không deploy.

## Sửa viền focus ô nhập trong popup (2026-10-26)

- Theo ảnh người dùng, outline offset 4px bị vùng modal-body cuộn cắt ở hai bên. Chuyển outline ô nhập/select vào trong (-2px), đồng màu border vàng khi focus; giữ focus bàn phím và không thay overflow/layout.
- Browser popup Thêm người offline: focus-visible đúng, outline-offset -2px, border/outline cùng màu, ô nằm trong body. Build/typecheck và git diff --check đạt.

## Sửa tạo bàn offline khi không có crypto.randomUUID (2026-10-26)

- Không giả định crypto.randomUUID có sẵn ở HTTP LAN. Thêm shared/random-id: ưu tiên native, nếu thiếu dùng crypto.getRandomValues sinh UUID v4 đúng version/variant, không dùng Math.random. Dùng cho ID quản trò, người chơi, game và các lệnh offline; sandbox thử luật dùng cùng helper. Không đổi mã phòng, schema, capability online hay bản lưu cũ.
- **20/20 test** random-id, offline-table, room-codes và product-boundaries đạt, có giả lập thiếu native và chơi/lưu/khôi phục tới đêm 2; build/typecheck và git diff --check đạt.
- Browser bản build 5180 với crypto.randomUUID bị gỡ trước khi load: tạo offline 644750, thêm 3 người, chia vai/bắt đầu và gửi lựa chọn Sói tới review resolved thành công. Đây là giả lập đúng lỗi API thiếu; chưa kiểm điện thoại vật lý trên HTTP LAN. Service worker vẫn cần HTTPS/localhost để cài cache cho tải lại khi hoàn toàn mất mạng.

## Tinh chỉnh lại chuyển động toggle (2026-10-26)

- Theo phản hồi mất cảm giác mượt sau đổi màu: tách indicator thành span riêng có layer rõ ràng thay pseudo-element z-index âm; giữ DOM khi toggle. Chuyển sang transform 320 ms cubic-bezier(.4,0,.2,1), giữ xám than/chữ trắng ấm và reduced-motion.
- Browser xác nhận hai chiều: các frame x=0,4,11,23,41…157 và trở về 0, transition 0.32s; node không thay, vị trí nút tạo không đổi. Build/typecheck và git diff --check đạt; không đổi logic tạo phòng.

## Điều chỉnh màu chế độ theo ảnh phản hồi (2026-10-26)

- Người dùng phản hồi xanh sage lạc bảng màu. Đổi nền chọn sang xám than #303938, viền nhẹ #46504b, chữ trắng ấm #eeeae2; giữ vàng cho nút tạo. Giữ hiệu ứng trượt và bố cục. Build/typecheck đạt, không đổi logic.

## Tinh chỉnh màu nút chế độ (2026-10-26)

- Theo yêu cầu người dùng: nền chọn Online/Offline đổi sang xanh sage #78958B, chữ #101A16 để tách khỏi nút tạo phòng màu vàng; giữ hiệu ứng trượt. Kiểm diff sạch, cập nhật build local; không đổi logic.

## Mốc mới — mã phòng chỉ gồm số (D67, 2026-10-26)

- Phòng online và bàn local mới sinh mã string 6 chữ số, giữ 0 đầu và dùng cả 0/1; ô nhập inputmode=numeric, placeholder 6 chữ số. UUID người chơi/game/phiên không thay đổi.
- Parser/API chấp nhận mã số mới và mã chữ cũ; bản lưu/phòng cũ không đổi code. Chuẩn bị SQL migration 202610260004_numeric_room_codes mở constraint Supabase, chưa chạy trên cloud; không đổi room/Game schema. OpenAPI cập nhật pattern tương thích.
- **202/202 Node tests đạt**; thêm HTTP tạo/join số, fixture có 0 đầu/1, mã chữ cũ và local numeric/legacy resume. Typecheck/build, spec syntax lint, collection lint và git diff --check đạt. Postman Numeric room codes: **5 requests / 9 assertions / 0 failed**, log docs/verification/numeric-codes-postman.txt. Skill Postman được cập nhật theo quy trình repo, không publish.
- Browser tạo online được mã 775935, vào bằng context người chơi khác; ô nhập numeric. Bàn local dùng generator số được kiểm trong unit tests. Không deploy; Supabase migration cần chạy trước khi dùng server mới trên cloud.

## Mốc mới — chuyển mượt, Thoát phòng và mặc định Phù thủy (D64–D66, 2026-10-26)

- Bỏ hint Offline, hai chế độ giữ bố cục bằng nhau. Nền chọn dùng CSS transform/transition 240 ms; không thay DOM nút khi toggle nên animation chạy liên tục. Reduced motion tắt transition. Bỏ trạng thái text cache-ready, hướng dẫn chuẩn bị offline chuyển về tài liệu.
- Toolbar quản trò có Thoát phòng từ lobby hoặc giữa ván; popup xác nhận/Ở lại, về trang chủ khi đồng ý. Bàn local giữ save, phòng online giữ phiên trên máy, debug giữ xóa phòng khi pagehide theo D55. Toolbar mobile được wrap để không tràn ngang, nút có icon và nhãn.
- Lobby settings witchSeesBite mặc định false cho cả UI online/local, gửi rõ theo lựa chọn lúc start. Giữ settings ván cũ và engine/API mặc định tương thích; không đổi schema/luật.
- Browser 390×844: đo trước/giữa/cuối animation translateX 0 → 45,7 → 157 px, cùng một DOM node; tọa độ/chiều cao nút tạo không đổi, không còn hint. Reduced-motion đo transition 0s. Browser 320×568: nút thoát lọt màn, không tràn ngang; settings Phù thủy mặc định tắt; tạo ván local nhận false. Ở bước Sói, Ở lại giữ màn, xác nhận thoát về trang chủ, revision/save giữ nguyên, Tiếp tục bàn đã lưu trở lại đúng đêm 1. Online debug hiện đúng cảnh báo xóa phòng và thoát về trang đầu.
- Kiểm chứng: typecheck/build đạt; **24/24 test** witch-visibility, offline-table, product-boundaries đạt; git diff --check sạch. Không sửa API hoặc deploy. Phòng online production/cloud chưa kiểm thực tế; debug và local đã kiểm UI.

## Mốc mới — nút chuyển Online / Offline (D63, 2026-10-26)

- Thay ô tick chế độ một máy bằng một nút chuyển Online / Offline, tô màu trạng thái được chọn; hỗ trợ bàn phím, aria-checked và giữ focus. Online mặc định; hướng dẫn lưu app chỉ hiện ở Offline. Handler tạo dùng trực tiếp trạng thái, handler vào phòng dùng mạng.
- Browser 390×844: chuyển Online → Offline → Online cập nhật đúng trạng thái và nhãn nút tạo, không còn checkbox, nút lọt màn; tạo bàn Offline và phòng Online bằng UI được. Typecheck/build và git diff --check đạt. Không đổi API/schema/luật; không deploy.

## Mốc mới — trang chủ vào phòng và tạo không tên (D62, 2026-10-26)

- Trang gốc chọn Vào phòng mặc định, đặt tab này trước Tạo phòng. Bỏ ô tên quản trò và handler Enter của ô đã xóa; giữ nhập tên/mã và Enter cho người chơi vào phòng.
- Tạo phòng online tự cấp nhãn nội bộ ngẫu nhiên thay vì tên chung dễ đoán trong cơ chế nhận lại phiên; bàn local dùng Quản trò. Không đổi API, luật/schema hoặc phiên phòng cũ.
- Kiểm chứng: browser context sạch xác nhận thứ tự/aria-selected và form mặc định; tab tạo chỉ còn chọn chế độ một máy, không có ô tên; tạo online và bàn một máy không nhập tên đều vào lobby được. Typecheck/build đạt, git diff --check sạch. Bản build đã cập nhật, không deploy.

## Mốc mới — bàn một máy không Internet và thao tác tối giản (D61, 2026-10-26)

- Người dùng xác nhận cần chơi khi máy quản trò không có Internet. Thêm lựa chọn Một máy · không cần Internet ở trang tạo, cùng nút tiếp tục bàn đã lưu. Nút thêm người trong lobby ghi rõ Thêm người offline (cả phòng thường và bàn một máy).
- LocalTable lưu document riêng version 1 vào localStorage, tách phòng/capability/API online. Game vẫn classic-core-v12/schema7; không sửa luật, schema phòng server hoặc SQL. Tải lại khôi phục bàn, bước hiện tại và kết quả soi đang chờ; lưu lỗi không hiển thị thành công, hành động nhóm không commit một phần. Local một máy có ready tự đủ, xem vai lần lượt tùy chọn rồi quản trò Bắt đầu.
- Cài đặt Tối giản thao tác ban đêm mặc định bật trước chia vai; có thể tắt để dùng luồng từng người. Tối giản có một form và một nút Xác nhận mỗi vai: tự wake/act cho actor, Sói dùng chung lựa chọn, tự qua vai vắng và tự resolve cuối đêm. Sói ngủ/bệnh bầy/nhóm cắn/thuốc/liên kết/Thợ săn đều qua engine cũ; không giả định bỏ lượt của người đang có kỹ năng. Soi dừng ở popup đến Đã rõ · Vai tiếp. Quản trò vẫn bấm công bố sáng và nhập phán quyết ngày.
- Build sinh service worker cache shell, engine, mô tả và 27 ảnh nguồn PNG nội bộ (~7,6 MB); không cache API/phòng online. Phiên bản cache theo nội dung build, không xóa local save khi cập nhật. Cần mở bản build lần đầu có mạng/HTTPS hoặc localhost tới khi báo đã sẵn sàng dùng không mạng; dev/debug không cài service worker. Script cache-offline-cards chỉ tải ảnh còn thiếu, giữ nguyên cards.json/map nguồn.
- Kiểm chứng: **199/199 Node tests đạt**, gồm 11 test offline cho lưu/khôi phục, quyền chiếu vai, validation/rollback khi lưu lỗi, retry/stale, một lựa chọn cho nhiều Sói, soi hai kết quả, giới hạn skip, hy sinh Sói con và Thợ săn. Sau các tinh chỉnh UI/thông báo, chạy lại **14/14 test offline + ranh giới product/debug** đạt; typecheck/build cuối đạt, git diff --check sạch. Không thay API nên không có collection Postman mới ở mốc này.
- Browser bản build preview 5180, context sạch, viewport 390×844: chặn mạng (fetch API probe thất bại), tạo bàn và thêm 7 người qua giao diện; lưu bộ vai 2 Sói/Bảo vệ/Tiên tri/3 Dân; Cài đặt có tối giản mặc định bật và popup lọt màn. Đã xem vai trên máy quản trò, bắt đầu, nhập Bảo vệ/Tiên tri qua UI, kết quả đỏ lưu qua reload vẫn chặn mạng; Đã rõ chuyển tới form chung hai Sói, chỉ một nút Xác nhận, không có wake/đồng thuận từng người. Nhập Sói xong tự tổng kết đêm; công bố, skip ngày 1 và sang đêm 2 được. Đã xác minh cache có đủ 27 ảnh và ảnh Tiên tri tải đúng khi mạng bị chặn. Chưa kiểm điện thoại vật lý/cloud/install lên màn hình chính.
- Không deploy/publish/commit. Preview local được giữ tại http://127.0.0.1:5180 để xem bản build; server debug có sẵn không bị chủ động dừng. Hướng dẫn chuẩn bị offline trong README. Bản lưu chỉ nằm trong cùng trình duyệt/thiết bị; xóa dữ liệu trang sẽ xóa ván.

## Mốc mới — diễn biến, popup soi và giới hạn bỏ vote (D60, 2026-10-26)

- Hoàn tất phần AI trước dừng giữa chừng: diễn biến đêm ghi Đêm N kể cả không có người chết; phán quyết ghi Sáng N, tên người bị vote hoặc Không có ai chết. Helper trình bày dùng chung, có test cho các nhánh.
- Popup Tiên tri lớn: đỏ khi là Sói, xanh khi không phải Sói, có Đã rõ; Escape/bấm nền không xác nhận. Sửa dùng chung máy: giữ kết quả đến xác nhận rồi mới về quản trò. Lưu đã xem tách theo ván/người; polling mở popup kể cả khi snapshot không đổi sau khi đóng mục khác.
- Cài đặt lobby skipVoteDays 0–30, mặc định 0; tổng số ngày không loại ai trong cả ván. Mỗi phán quyết trống dùng một lượt; hết lượt UI bỏ lựa chọn trống, máy chủ chặn VOTE_REQUIRED. Có thông báo tiếng Việt; retry không trừ hai lần. Giữ ngoại lệ Hoàng tử.
- Ván mới classic-core-v12/schema7; không migration ngầm. Sửa hồi quy do nâng version: ván v10/v11 vẫn chat được, v11 vẫn chạy đồng hồ; ván cũ giữ luật skip không giới hạn. Room schema vẫn 4, chưa cần SQL mới cho Game JSON.
- Kiểm chứng: **188/188 Node tests đạt**, gồm hồi quy chat/đồng hồ legacy, nhãn diễn biến và retry ngân sách; typecheck/build đạt. Postman **58 requests / 68 assertions / 0 failed**; OpenAPI syntax lint và collection lint đạt. Collection Day skip contract, folder Vote budget; log docs/verification/day-skip-postman.txt. Không publish.
- Browser local: cài đặt skip=1 đóng/mở giữ giá trị; popup đỏ đêm 1/xanh đêm 2 lọt màn, chờ xác nhận ở máy quản trò. Escape và nền không đóng popup. Ngày 1 skip được; ngày 2 không còn option trống và có nhắc bắt buộc chọn người; vote mục tiêu được. Diễn biến thực tế: Đêm 1 không ai chết, Sáng 1 không ai chết, Đêm 2 Bình đã chết, Sáng 2 Chi bị vote chết. Luồng được dựng bằng API, thao tác soi/xác nhận/skip/vote và đọc diễn biến kiểm qua giao diện; chưa kiểm điện thoại vật lý/cloud. Không deploy, không commit; giữ các sửa đổi trước đó của người dùng.
- Khi sửa server local, Vite có thể khởi tạo lại kho debug RAM làm mất phòng thử. Đã dựng lại ván để kiểm phần còn lại sau lần reload; không coi đây là lỗi lưu ván production. Server debug có sẵn được giữ chạy.

## Mốc mới — menu avatar (D59, 2026-10-26)

- Bấm avatar ở màn quản trò mở pop-up cạnh ghế, hai lựa chọn Chuyển sang offline / Rời khỏi trò chơi. Chuyển offline giữ vai/ready/hành động và ngắt máy cũ. Rút trước chia xóa ghế; sau chia giữ ghế Đã rời, gỡ khỏi actor/target/quorum, chặn phiên và nhận lại tên. Theo lựa chọn rõ của người dùng: rút riêng, không hiệu ứng chết dây chuyền.
- Helper withdrawPlayer không gọi death pipeline, giữ thứ tự ghế/kiến thức đã biết, gỡ Hunter đang chờ và phiếu Sói khi cần, kiểm thắng nhưng không lộ đêm chưa công bố. Game/schema không đổi; room schema 4, đọc v1/v2/v3 rồi migrate on write. SQL 202610260003_member_controls chưa kiểm trên Supabase thật.
- **180/180 test đạt**: thêm 8 test rút vai/quan hệ/hunter/win/đêm kín/phiếu và 2 test HTTP quản lý ghế, quyền/revision/retry/quorum/thu hồi. Postman Member controls contract **22 requests / 24 assertions / 0 failed**, spec/collection lint đạt; log docs/verification/member-controls-postman.txt. Typecheck/build đạt; không deploy/publish.
- Browser phòng GVS8B8 (5 người): click thật mở menu; drag thật An sang Bình đổi đúng thứ tự và không bật menu. Chia/bắt đầu, Bảo vệ Hà đã gửi tự bảo vệ; bấm avatar chuyển offline: máy cũ 403, giữ lựa chọn và mục thao tác thay. Cho Thợ săn Bình rời: chỉ một ghế Đã rời, không có bắn, chuyển lượt vẫn được. Ở 320×568 kiểm 4 menu ghế còn lại đều trong viewport; menu mở cạnh hoặc dưới khi hai bên không đủ chỗ. Các helper/API mới đã được kiểm cả qua HTTP và browser; chưa kiểm điện thoại vật lý.
- Server kiểm thử dừng sau nghiệm thu. Full suite chạy trước tinh chỉnh cuối vị trí popup/avatar mobile và nhãn Đã gửi, các tinh chỉnh được kiểm browser/typecheck/build.

## Mốc mới — đổi máy, dùng chung máy và dọn debug (D55–D58, 2026-10-26)

- Phòng debug mới ở RAM, tách khỏi file/cloud. Pagehide của quản trò gọi DELETE keepalive, xóa sau 2 giây grace; reload giữ nếu trở lại kịp; lease 90 giây cho mất tín hiệu. Người chơi không có quyền xóa; production không bật DELETE debug. Chưa xóa hàng loạt phòng file cũ vì không có nhãn phân biệt debug/normal trước đây.
- Chế độ thường nhập mã phòng/tên cũ tiếp tục người chơi hoặc quản trò, giữ UUID/vai/hành động/ready, capability cũ bị thu hồi. Máy cũ 403 chuyển về form thay vì hiển thị phiên cũ. Thành viên dùng máy quản trò nhận máy riêng được chuyển sang online, quản trò không còn proxy được người đó.
- Thêm người dùng máy quản trò trong lobby, xem/đóng riêng từng vai, xác nhận sẵn sàng; ban đêm tự mở actor offline chưa gửi, lệnh được dispatch như player. Gửi xong về quản trò; có quay về thủ công và sửa lựa chọn. GET scoped/ready/command proxy đều kiểm quyền quản trò và offline flag, không trả sổ tay hoặc điều khiển người online.
- X máu căn tâm avatar (sai lệch đo được 0px ngang / ~0.00002px dọc). Chi tiết bỏ nút quay lại dưới ảnh; X → danh sách → X đóng, đã kiểm trình duyệt.
- **170/170 test đạt**; Postman Shared-device contract **23 requests / 30 assertions / 0 failed**, collection/spec syntax lint đạt; log docs/verification/shared-device-postman.txt. Node tests mới cho khôi phục/từ chối capability cũ, proxy quyền/nhân vật/retry/đổi sang online, debug xóa/lease/reload. Typecheck/build cuối đạt; thêm test xóa debug khi có ghi cạnh tranh. Room schema 3, đọc v1/v2 và migrate on write; SQL 202610260002_shared_devices chưa chạy trên Supabase thật; Game v11/schema6 không đổi.
- Trình duyệt phòng 6P2W6M: một online An + ba dùng máy quản trò Bình/Chi/Dũng; thêm qua UI, lưu/chia 4 vai, từng lượt handoff chỉ một vai và không có DOM quản trò, xác nhận xong đóng; 3/4 chờ online, 4/4 bắt đầu. Máy quản trò tự nhận Chi/Bảo vệ, Dũng/Tiên tri, Bình/Sói ở các bước; Bảo vệ/Tiên tri đã gửi bằng UI và quay lại quản trò. Máy online vẫn là An, không có công cụ quản trò. Context máy mới nhập An tiếp tục; máy cũ về form và báo chuyển phiên. Debug reload giữ phòng; đóng tab quản trò thì guest đọc 404 sau 2728ms (chưa đến lease). Không kiểm thực địa ngắt mạng/kill process trên điện thoại; đã kiểm lease ở Node.
- Server kiểm thử local dừng sau nghiệm thu; không deploy hoặc publish workspace. Toàn bộ 170 test và build được chạy lại sau các chỉnh sửa cuối; Postman 23 request/30 assertions đạt trước phần retry xóa debug (được kiểm thêm bằng Node).

## Mốc mới — bộ vai lobby và xác nhận sẵn sàng (D52–D54, 2026-10-26)

- Quản trò chỉnh/Lưu bộ vai, nút Vai ở máy người chơi chỉ hiện các vai và số lượng đó trước chia. Mô tả ở catalog, overlay và xem vai lấy nguyên văn cards.json qua map nguồn/generator, giữ xuống dòng; engine không đổi luật.
- Chia vai vào ready, chưa chạy đêm. Người chơi xác nhận theo phiên; ghế sáng/check và số Sẵn sàng x/y trên quản trò. Chỉ quản trò begin khi đủ tất cả; mọi engine command sớm bị chặn. Readiness lưu trên máy chủ, retry/reload giữ đúng, không hiện overlay lại sau xác nhận/bắt đầu.
- Room schema 2, tương thích đọc v1 và migrate on write; Game classic-core-v11/schema6 giữ nguyên. Đã thêm SQL 202610260001_lobby_ready cho constraint/RPC nhận cả 1/2; chưa chạy SQL/cloud thật.
- Kiểm chứng: **165/165 test đạt** (thêm mô tả nguyên văn, lưu/phân quyền/CAS/retry bộ vai, migration phòng, ready/begin/restart). Trình duyệt hai context phòng Y7YYK4: player thấy đúng Ma Sói/Phù thủy/Dân, mô tả Phù thủy đúng nguồn, chưa chia không có vai gán; sau chia 0/3 dim, xác nhận 1/3 chỉ một ghế sáng; reload giữ; 3/3 mở Bắt đầu và chuyển vào đêm, không hỏi đọc lại.
- Postman OpenAPI 0.6.0 syntax lint/collection lint đạt. Collection Lobby deck contract: 17 requests, 22 assertions, 0 failed, log docs/verification/lobby-ready-postman.txt. Lần đầu mẫu test gửi revision dạng chuỗi làm sai 13 assertions/4 script; đã sửa template số và chạy lại đạt; log đầu lưu lobby-ready-postman-first.txt. CLI chưa đăng nhập vẫn chạy local được; governance lint cần đăng nhập nên chỉ chạy syntax lint.
- Typecheck/build cuối đạt; test:data 8/8 đạt, cards.json/HTML nguồn không đổi. SQL/cloud chưa kiểm, không deploy hoặc publish. Server kiểm thử dừng sau nghiệm thu.

## Mốc mới — dấu kill bằng ảnh vệt máu (D51, 2026-10-26)

- Thay icon X bằng PNG vệt máu có nền trong suốt, 256×256; giữ nguyên điều kiện đêm công bố gần nhất. Asset/prompt ở D51.
- Kiểm chứng: typecheck/build đạt, PNG có alpha và được đóng gói vào dist; 3 test dấu chết đạt. Trình duyệt 390×844 phòng thử 7KUCJF: ảnh tải đúng, người vừa chết có X máu, người chết trước vẫn mờ. Server kiểm thử đã dừng.

## Mốc mới — đại trùng tu giao diện (D48–D50, 2026-10-26)

- Thiết kế lại toàn bộ trang vào/lobby/quản trò/người chơi/pop-up: nền tối xanh rêu, trắng ấm/vàng nhạt, ít khung, icon SVG cùng nét; bàn chơi trọng tâm. Mã phòng và công cụ gọn trên thanh trên; Làm mới/Vai có nhãn ngắn theo góp ý. Tóm tắt bộ vai trực tiếp, bút mở chỉnh vai, Gợi ý nằm trong pop-up; một nút Bắt đầu. Trang đầu hai tab tạo/vào, chỉ một form mỗi lần.
- Mobile lobby 8 người lọt trọn 390×844 và 320×568; bộ vai dài cuộn riêng. Màn hành động/chat dùng bàn nhỏ hơn để nhường chỗ. Các mục phụ nằm trong thanh công cụ; giữ ảnh thẻ lớn. Tab/Shift+Tab giữ focus trong pop-up, Escape trả về nút mở, form hỗ trợ Enter.
- X đỏ chỉ trên người chết của morning công khai mới nhất; người chết cũ mờ; không dùng kết quả bí mật hoặc treo cổ. Helper riêng `src/online/presentation.ts` và ba test, không đổi API/luật/schema.
- Kiểm chứng: **161/161 test đạt**; sau tinh chỉnh UI chạy lại 6 test presentation/ranh giới build đạt, typecheck/build cuối đạt. Ba cỡ màn 390×844, 320×568, 844×390 kiểm toàn bộ 27 chi tiết vai, ảnh/tên/nút đều trong viewport. Kiểm bàn phím settings, đóng/mở giữ dữ liệu; tạo phòng bằng Enter, vào phòng ở browser context riêng, người chơi không có Cài đặt.
- Ván local 7KUCJF (6 người, 2 Sói/1 Bảo vệ/1 Tiên tri/1 Phù thủy/1 Dân): chia vai qua UI, đọc/ẩn vai, Bảo vệ gửi qua UI, chat Sói và đồng thuận, Phù thủy giữ thuốc; resolve không có X mới; công bố đêm 1 Bình có X; bấm/chuyển pha đồng hồ; không treo cổ, đêm 2 Hà có X/Bình mờ, Sói thắng. Các hành động phụ được thiết lập bằng request với phiên thử để kiểm luồng trình bày; không phải toàn bộ thao tác đều bấm tay. Không kiểm lại kéo thả bằng thiết bị vật lý; cloud/RLS/CAS/deploy vẫn chưa kiểm.
- Ảnh chụp ở `docs/verification/ui-overhaul-mobile.png`, `ui-overhaul-desktop.png`, `ui-overhaul-deaths.png`. Server local kiểm thử đã dừng sau khi nghiệm thu.

## Mốc mới — ảnh thẻ lớn nhất trong khung (D47, 2026-10-26)

- Ảnh thẻ dùng phần diện tích còn lại của pop-up/màn nhận vai, thay các giới hạn 160–180px/22dvh. Vẫn giữ trọn thẻ bằng contain, tên và nút thao tác trong viewport; mô tả cuộn riêng. Màn rộng/ngang dùng hai cột ảnh/nội dung; xem vai cá nhân dùng cùng bố cục.
- Kiểm chứng: typecheck/build đạt. Trình duyệt kiểm cả 27 chi tiết vai ở 390×844, 320×568, 844×390: ảnh/tên/nút đóng/quay lại không vượt viewport. Đã xem ảnh chụp Phù thủy 390×844: ảnh lớn hơn rõ rệt và giữ trọn thẻ. Chưa kiểm lại luồng nhận vai và xem vai cá nhân trên ván thật ở mốc này. Server kiểm thử đã dừng sau khi kiểm.

## Mốc mới — Cài đặt chung (D46, 2026-10-26)

- Lobby quản trò có một nút Cài đặt: gom tùy chọn Phù thủy và bốn thời lượng ban ngày. Bỏ mục Xếp ghế bằng nút và handler lên/xuống, giữ kéo thả bàn tròn.
- Cài đặt có bản nháp riêng, không phụ thuộc input còn nằm trong DOM khi bấm chia vai. Đóng/mở pop-up và polling giữ giá trị đã chọn; chia vai gửi bản nháp qua API hiện có.
- Kiểm chứng: typecheck/build đạt. Trình duyệt 390×844: pop-up Cài đặt lọt màn, không cần cuộn; màn chính không có checkbox Phù thủy/mục xếp ghế bằng nút. Đổi Phù thủy sang tắt, thảo luận 123s, đóng/mở giữ giá trị; đóng rồi chia vai với ba người thử, snapshot máy chủ nhận đúng false và 123/15/30/15. Chưa kiểm lại trọn ván hoặc thao tác kéo thả ở mốc này.

## Mốc mới — pop-up vai lọt khung hình (D45, 2026-10-26)

- Sửa ảnh chi tiết vai thiếu khung giới hạn, trước đây ảnh hiện theo kích thước gốc. Ảnh dùng card-hero, giới hạn theo viewport, giữ trọn ảnh; pop-up giới hạn 100dvh, nút đóng/quay lại luôn trong khung; mô tả dài cuộn riêng. Thu gọn ảnh màn nhận vai theo chiều cao màn hình.
- Kiểm chứng trình duyệt thật: Phù thủy ở 390×844 hiện trọn ảnh/tên/mô tả/nút quay lại, không tràn ngang. Kiểm cả 27 vai ở 320×568 và ngang 844×390: pop-up, ảnh, nút đóng/quay lại đều trong viewport; ở 320×568 có một mô tả dài cần cuộn riêng. Typecheck/build đạt; không chạy lại toàn bộ test luật vì chỉ đổi trình bày. Chưa kiểm lại luồng nhận vai trọn ván.

## Mốc mới — tách product/testing/debug (D44, 2026-10-26)

- Bỏ slogan “Trời tối rồi. Ai còn thức?” và “Chuyện trong làng, giữ trong làng.”; tiêu đề vào phòng là Ma Sói. Product không hiện nhãn hạ tầng hoặc link/công cụ thử.
- Sandbox chuyển sang `debug/sandbox.html`, mã thử ở `src/debug/` (sandbox và điều khiển nhiều người chơi). Chỉ `npm run debug` phục vụ; dev thường chặn HTML và mã debug bằng 404. Build chỉ có entry product; cờ compile-time `DEBUG_TOOLS` tắt với mọi build, kể cả mode debug.
- Kiểm chứng: 158/158 test đạt; typecheck/build đạt. Ba test mới kiểm HTTP dev/debug, đường dẫn mã hóa và @fs, và nội dung output của cả production/debug build không có HTML/mã/CSS công cụ thử.
- Trình duyệt thật: dev thường không có checkbox, thanh thử, nhãn hạ tầng hoặc link sandbox; sandbox trả 404. Debug mở sandbox với ba bảng; tạo phòng thử, vào A, thêm B, chuyển về A hoạt động; tab quản trò vẫn giữ quyền riêng. Chưa kiểm lại trọn ván hoặc deploy ở mốc này.

## Mốc vừa hoàn tất — v9: tùy chọn Phù thủy và luồng phòng

- Luật classic-core-v9, Game schemaVersion=4, `settings.witchSeesBite` do quản trò chọn khi chia vai, không đổi giữa ván. Bật (mặc định): Phù thủy còn thuốc cứu thì thấy nạn nhân cắn, trừ người Bảo vệ đã chặn và không thể cứu người đó. Tắt: không gửi tên/số nạn nhân; Phù thủy chỉ chọn dùng/giữ thuốc; máy chủ cứu tối đa một nạn nhân chưa được bảo vệ theo thứ tự ghế; dùng thuốc vẫn tốn kể cả không có nạn nhân. Lệnh gửi `healTarget` ở chế độ ẩn bị từ chối để không dò nạn nhân.
- Ván v8/schema3 tiếp tục chạy luật cũ qua handler riêng (`src/engine/witch.ts`); không nâng nhãn, không đổi luật giữa ván. Dispatch và lưu phòng chỉ chấp nhận đúng cặp v8/3 hoặc v9/4 có settings hợp lệ.
- Player view có `sleepReady`: sau khi máy chủ nhận hành động, người chơi thấy lời mời ngủ kèm tóm tắt hành động của mình (chế độ ẩn ghi "Cứu nạn nhân", không tên). Bầy Sói chỉ được mời ngủ khi cả bầy thống nhất; thành viên khác đổi phiếu thì màn hình thức dậy trở lại. Quản trò thấy ai vừa gửi và hành động gì trong bảng tiến độ và nhật ký "Hành động vừa nhận".
- UI trang phòng làm mới: giấy ngà, xanh đậm, đỏ đất, minh họa SVG nội bộ; quản trò bật/tắt tùy chọn Phù thủy trong lobby trước khi chia vai; màn Phù thủy hai chế độ; sổ tay quản trò có dòng tóm tắt luật đang dùng. Kiểm mobile 375px không tràn ngang.
- Postman collection "Witch settings" (8 requests, 8 assertions, 0 failed; log `docs/verification/v9-postman.txt`); OpenAPI 0.2.0 bổ sung GameSettings. `scripts/open-test-players.mjs` đã chạy thật: mở 8 Chrome A–H vào phòng lobby, tên trùng bị máy chủ từ chối 409, chạy lại giữ đúng phiên, đã đóng cửa sổ test.
- Giao diện trang phòng viết lại theo yêu cầu người dùng (D36–D38, F06–F11): nền tối, chữ lớn, ít chữ, mobile-first; bàn tròn hiển thị sống (sáng) / chết (mờ) làm màn hình mặc định; vai luôn ẩn — lần đầu nhận vai có overlay đọc vai với nút "Tôi đã đọc và sẵn sàng" (theo từng ván trên từng tab), sau đó chỉ mở bằng nút xem; mọi thông tin phụ (nhật ký, lời nhắn riêng, sổ tay, diễn biến) đặt trong mục gập; mục "Các vai trong trò chơi" có ảnh thẻ ở lobby và trong ván; quản trò kéo thả xếp ghế trên bàn tròn trước khi chia vai (mutation `reorder` giữ nguyên, còn nút ↑↓ dự phòng).
- Ảnh thẻ sinh tự động vào `src/catalog/images.ts` từ cards.json qua `npm run gen:images` (script chỉ đọc nguồn); catalog API trả thêm `image`, có thể null khi thiếu; UI có dự phòng chữ cái khi ảnh không tải được. Ảnh nằm trên máy chủ nguồn, quyền sử dụng chưa xác minh — xem CARD_DATA.md.
- Chat trong đêm bầy Sói (F12, D39): luật classic-core-v10, Game schema5. Chỉ Sói đang thức ở bước bầy gửi được tin; máy chủ tự quyết định người nhận là Sói đang thức của bước đó — bạn ngủ và Dream chưa biết không gửi/không nhận, sau thức dậy không đọc lại chat cũ. Chat không phải hành động, không cản đồng thuận hay chốt lượt; giới hạn 200 ký tự/tin, 200 tin/ván, retry cùng requestId không trùng tin. UI: khung "Chat bầy Sói" mở trong bước bầy (kể cả trên màn mời ngủ), lịch sử gập lại sau đó; quản trò xem toàn bộ trong Sổ tay bí mật. Ván v9/schema4 và v8/schema3 tiếp tục chơi nhưng lệnh chat bị từ chối `CHAT_UNAVAILABLE`.
- Đồng hồ ban ngày (F05, D41): luật classic-core-v11, Game schema6. Buổi sáng có bốn pha Thảo luận (300s) → Vote chỉ người (15s) → Thanh minh (30s) → Biểu quyết sống/chết (15s); giá trị chỉnh 5–3600 giây trong cài đặt lobby và lưu cùng snapshot. Mỗi sáng pha về Thảo luận với đồng hồ chưa bấm; quản trò bấm bắt đầu/bấm lại, chuyển pha thủ công; hết giờ chỉ báo hiệu. Deadline theo giờ máy chủ, hiển thị công khai cho mọi máy. Ván v10/schema5 trở về trước từ chối lệnh đồng hồ `DAY_PHASE_UNAVAILABLE`.
- Chế độ thử 1 tab (D42): chỉ chạy `npm run debug` (vite --mode debug) mới có ô tick và thanh chuyển vai A–H; `npm run dev:online`, build và deploy không có. Phiên nằm trong sessionStorage từng tab, không đụng phiên quản trò trong localStorage của trình duyệt. Reload giữ chế độ; thoát xóa sạch. Chỉ là công cụ test, mô hình chơi thật vẫn một phiên mỗi máy.
- Giao diện pop-up và tổng quan vai (D43): các mục cài đặt/mở rộng mở thành pop-up (đóng bằng ✕/nền/ESC), màn chính chỉ giữ nội dung đang tương tác. Mục vai trong ván thành bảng tổng quan "vai × số người" không ảnh (dữ liệu công khai `deck` do máy chủ tính khi chiếu snapshot, không đổi Game/schema); bấm vai mới hiện ảnh thẻ + mô tả; lobby liệt kê toàn bộ catalog cùng kiểu.

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
| npm test | **180/180 đạt**, thêm 10 test quản lý/rút người; thêm 5 test đổi máy/proxy/debug; thêm 4 test catalog/lobby/readiness; thêm 3 test dấu X công khai; gồm 3 test ranh giới product/debug/build; các test visibility, HTTP phòng, ảnh catalog, 6 test chat bầy và 5 test đồng hồ ban ngày |
| npm run test:data | **8/8 đạt**, JSON khớp HTML nguồn |
| npm run typecheck/build | Đạt; bundle chỉ có trang phòng, không có sandbox/debug (D44) |
| Postman | Collection "Witch settings": 8 requests, 8 assertions, 0 failed; log tại docs/verification/v9-postman.txt. CLI báo chưa đăng nhập, chạy local vẫn đạt |
| Trình duyệt v9 | Hai phòng ẩn/hiện chạy trọn đêm như mục trên; mobile 375px không tràn ngang |
| Trình duyệt giao diện tối | Phòng NXR4RE qua UI mới: tạo phòng, kéo thả ghế (Dũng lên chỗ 1), mở catalog 27 ảnh (không lỗi ảnh), overlay đọc vai Phù thủy có ảnh thẻ, xác nhận rồi vai ẩn cả sau reload, Phù thủy dùng thuốc qua form mới, resolve/publish, phán quyết treo cổ Sói → Dân thắng, bàn tròn làm mờ người chết; đo tràn ngang mobile 390px sạch |
| Trình duyệt chat bầy | Phòng UNG354 (2 Sói): Bình nhắn → Dũng thấy qua polling; chat vẫn mở trên màn mời ngủ sau khi gửi cắn; khép đêm resolve/publish bình thường, lịch sử giữ trong ván; snapshot Bảo vệ/Tiên tri không chứa nội dung chat; quản trò thấy "Đêm 1 · tên: tin" trong Sổ tay bí mật |
| Trình duyệt đồng hồ ban ngày | Phòng HLDK5D (10s/6s/6s/6s): chip pha + đồng hồ "chưa bấm"; bấm bắt đầu → đếm ngược 0:09 → 0:05 → "HẾT GIỜ" đúng theo giờ máy chủ; "Sang phần tiếp" chuyển chip và xóa đồng hồ; người chơi thấy pha + đồng hồ trên màn mình; mobile 390px không tràn ngang |
| HTTP phòng và adapter | 6 test: cạnh tranh join, restart, phân quyền, retry start, key mới/cũ, 503/timeout/JSON lỗi, settings và retry chữa trị ẩn |
| Trình duyệt v8 | Mẫu 15 người chạy qua hai đêm (mốc trước) |
| npm run demo | Đạt |
| Script mở người chơi test | 8 phiên Chrome A–H vào phòng; chặn tên trùng; chạy lại giữ phiên; đã dọn tiến trình |

Các ván mô phỏng kiểm input bất biến, retry, revision, tài nguyên, danh sách chết, bí mật trước publish và kết thúc. Chưa bao phủ mọi tổ hợp hoặc chứng minh bảo mật nhiều thiết bị; chưa kiểm ván nhiều vai mở rộng qua UI online.

## Nguồn, version và giới hạn

cards.json vẫn 64 vai/9 nhóm; response.html không đổi; source-map-v2 truy vết 1–1. Audit/backup ở CARD_DATA.md; bản sửa mới nhất chỉ đổi khóa `Imagage Url` thành `Image Url` ở Mason, có backup trong data/backups. Không thêm vai ngoài nguồn.

Đã có mã phòng/API, phiên khách, chia bài trên máy chủ, projection theo quyền, lưu local và adapter HTTP Supabase; UI tạo/vào phòng, lobby có tùy chọn luật. Chưa kiểm trọn ván nhiều người thật ngoài hai phòng thử, SQL/RLS hoặc cạnh tranh ghi trên database. Chưa có project cloud, Realtime, vote/timer, undo hoặc deploy. Sandbox giữ toàn bộ bí mật trên một máy và tải lại mất ván, không dùng cho ván thật nhiều điện thoại.

Key mới SUPABASE_SECRET_KEY dùng apikey, key JWT cũ dùng thêm Bearer. Khi cloud thiếu cấu hình, API trả 503 thay vì lưu vào filesystem tạm. Các lỗi upstream được kiểm qua HTTP local và không lộ key/chẩn đoán upstream. Xem ONLINE_SETUP.md.

Snapshot v8/schema3 và v9/schema4 được chấp nhận song song; bản cũ hơn bị từ chối, không tự nâng nhãn. Room schema mới là 4, đọc được v1/v2/v3 và chuyển khi ghi; Game có version riêng. Muốn áp dụng luật mới cho ván đang chạy thì tạo ván mới.

## Tiếp theo

Cho nhóm chơi thử ván thật nhiều điện thoại qua mạng LAN/Internet bằng dev server, gom góp ý về mặc định Phù thủy và hiển thị lời mời ngủ. Bước trống (ví dụ không ai làm Tiên tri) vẫn mở để giữ bí mật và quản trò chốt thủ công; cân nhắc gộp thông báo nếu gây khó chịu khi dùng thật. Khi người dùng có project Supabase, đặt key vào môi trường máy chủ rồi kiểm tra cloud theo ONLINE_SETUP.md; trước đó chưa kiểm RLS/CAS trên database thật.

Các vai còn lại giữ backlog tại ROLE_COVERAGE.md và ROADMAP.md. Chưa tự deploy. Server local cổng 5174 phục vụ trang phòng; sandbox chỉ có với npm run debug tại /debug/sandbox.html. Git hiện có commit 8d2559c; thay đổi lượt v9 và luồng phòng chưa commit. Không reset/discard hoặc sửa app cha.
