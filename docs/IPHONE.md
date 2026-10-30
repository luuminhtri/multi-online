# Bản iPhone — Capacitor

Bản iPhone dùng chung giao diện, catalog 64 vai và engine TypeScript với web. Project Xcode ở `ios/App/App.xcodeproj`, bundle ID `vn.masoi.app`, iOS tối thiểu 15. Xcode 26+ và Node 22.18+.

## Chạy trên iPhone thật

```sh
npm ci
npm run ios:sync
npm run ios:open
```

Trong Xcode chọn scheme App, chọn iPhone đã cắm, kiểm tra Signing & Capabilities → Automatically manage signing và Team của bạn, rồi Run. iPhone cần mở khóa, tin cậy Mac và bật Developer Mode nếu iOS yêu cầu. Không cần Simulator hoặc phát hành App Store.

Máy hiện tại có thể đặt `DEVELOPMENT_TEAM = YOUR_TEAM_ID` trong `ios/local-signing.xcconfig` (được gitignore). Debug kế thừa file này qua `ios/debug.xcconfig`. Không đưa chứng chỉ/private key hoặc provisioning profile vào Git. Nếu dùng Personal Team, bản cài thử bị giới hạn theo provisioning của Apple; xem ngày hết hạn trong Xcode.

Mỗi lần sửa web, chạy lại `npm run ios:sync` trước khi Run. Web dùng `dist/`; iPhone dùng `dist-ios/` nên hai build không ghi đè nhau. `ios/App/App/public` và cấu hình JSON sao chép vào Xcode là file sinh, không chỉnh trực tiếp.

## Online và offline

- Toàn bộ giao diện, engine, mô tả và 64 ảnh WebP nằm trong app. Offline dùng được ngay từ lần mở đầu, không cần chuẩn bị cache bằng mạng.
- Bàn offline là một máy quản trò; không tự chuyển phòng online thành phòng nhiều máy không Internet.
- Online dùng `https://multi-online.vercel.app` và cùng API/phân quyền với web. Transport iOS dùng CapacitorHttp; không đổi CORS hoặc đưa secret Supabase vào app. Link mời/QR luôn trỏ về web để người không cài app vẫn tham gia được. Bộ đọc QR nhận cả `https://masoi.yennhi.tech` và `https://multi-online.vercel.app` vì hai địa chỉ dùng cùng phòng; không tự đổi máy chủ theo QR. Quét điền mã và giữ tên, người dùng vẫn bấm Vào phòng để xác nhận.
- Đổi máy chủ khi build bằng `VITE_ONLINE_ORIGIN=https://your-host.example npm run ios:sync`. Giá trị phải là HTTPS origin, không đường dẫn, query, credential hoặc secret. Build kiểm tra cấu hình này trước khi xuất bundle.
- Bản lưu offline, phiên online, request đang chờ và địa chỉ bàn gần nhất nằm trong bộ nhớ native qua Preferences với document version 1. Engine đọc từ bộ nhớ đã hydrate; chờ native xác nhận ghi trước khi chốt thao tác offline. Lỗi đọc không khởi tạo đè bản lưu. Bộ nhớ này dành cho dữ liệu cục bộ hiện tại, chưa phải cơ sở dữ liệu cho lịch sử ván không giới hạn.
- Bản lưu web/Safari và bản lưu app độc lập. Gỡ app sẽ xóa dữ liệu app; không có đồng bộ bản lưu offline hoặc chức năng nhập từ Safari trong mốc này.

## Tốc độ và phản hồi

- Hiện giao diện bằng tài nguyên cục bộ, không chờ cấu hình mạng mới cho thao tác hoặc khôi phục bàn offline. Splash đóng sau lần render đầu.
- Giữ cập nhật DOM từng phần, không dựng lại cả bàn do polling. Phản hồi nhấn bằng CSS ngay tại thiết bị; rung nhẹ khi chọn mục tiêu, đổi chế độ/tab. Kết quả ván vẫn chờ máy chủ xác nhận.
- Tạm dừng polling khi app xuống nền; trở lại hoặc có kết nối thì lấy trạng thái mới/gửi lại cùng request ID. Poll online vẫn 750/1500 ms theo pha; chưa đổi backend sang Realtime.
- Chỉ tải trước giải mã 4 ảnh phổ biến trên iPhone, làm lúc rảnh và nhường luồng giữa các cặp; tránh giữ ảnh giải mã của cả 64 vai trong RAM. Ảnh khác đọc ngay từ bundle khi cần.
- Ẩn status bar (giờ/sóng/pin), tự ẩn Home indicator; nền phủ toàn màn hình, vùng Dynamic Island/tai thỏ vật lý vẫn tồn tại. Nội dung tương tác và popup có safe area; dùng font hệ thống, phản hồi chạm ngay, không blur toàn màn hình native. Giữ hỗ trợ Reduce Motion và phóng to văn bản.
- Tắt log bridge vì payload có token và vai bí mật. Privacy manifest khai báo UserDefaults theo plugin Preferences; Info.plist có lý do xin camera cho QR.

## Kiểm trực tiếp trên iPhone

1. Mở app, thử Online: tạo/vào phòng, có người vào bằng web, QR và sao chép link hoạt động.
2. Tạo bàn Offline, thêm người/chia vai/chơi qua đêm, xem ảnh và kết quả riêng. Đóng hẳn rồi mở lại phải tiếp tục được.
3. Bật chế độ máy bay và mở lại app: tạo/tiếp tục bàn offline và thư viện vai vẫn hoạt động.
4. Online: khóa/mở màn hình, chuyển app, đổi Wi-Fi/di động. Kiểm tra trạng thái phục hồi, gửi lại không nhân đôi lệnh.
5. Kiểm camera cho phép/từ chối, bàn phím nhập tên/chat, popup Vai, nút đóng, xoay màn hình và cỡ chữ lớn.
6. Đánh giá độ mượt bằng bản Release trên iPhone thật; dùng Instruments khi có khựng. Chưa có số đo FPS, pin hoặc thời gian khởi động được nghiệm thu.

Kiểm tự động: `npm test` (gồm lưu native và ranh giới build), `npm run build`, `npm run build:ios`, `node scripts/test-ui-performance.mjs --smoke`. Các kiểm Chrome không thay thế kiểm WKWebView/iPhone thật.


## Kiểm hồi quy bản cài khi không có Internet ngay lần đầu

`npm run test:ios-shell` build đúng bundle iPhone rồi mở trong Chrome với hồ sơ mới và tất cả HTTPS bị chặn. Kiểm dùng web fallback của các plugin Capacitor: không phải Simulator/iPhone và không thay thế nghiệm thu native. Kịch bản đưa hình QR thật của masoi.yennhi.tech qua video camera giả lập, xác minh điền mã/giữ tên/đóng camera; tạo bàn offline, thêm người, mở lại từ `/` và giải mã đủ 64 ảnh từ bundle, không cần service worker hoặc lượt mở online trước. Không gọi ghi API production hoặc dùng bản lưu thật.

Logo nguồn và prompt: [branding/README.md](branding/README.md).


## Kiểm nối lại và một ván web ↔ iPhone (28/10/2026)

Kết quả đã kiểm trên T21 và giới hạn bằng chứng: [iphone-online-lifecycle.json](verification/iphone-online-lifecycle.json). Người dùng thao tác khóa/mở, chuyển app và vuốt đóng app; bộ kiểm phía Mac điều khiển bàn web production riêng. Đã đi từ lobby → nhận vai/sẵn sàng → đêm → ngày → kết thúc. Người dùng xác nhận giữ phiên, tự cập nhật và thao tác mượt khi trở về. Không coi lượt XCTest runner lỗi bootstrap là kiểm native đạt.

Đã sửa sự kiện foreground/network bị bỏ quên khi một POST đang busy: ghi nhớ yêu cầu nối lại, xử lý sau khi POST kết thúc; mất ACK thì gửi lại đúng requestId đã lưu, thành công thì đọc trạng thái mới nếu phòng đã tiến triển lúc app ở nền. Không tự đổi luật hay giả lập kết quả máy chủ trên client.

`npm run test:ios-reconnect` kiểm lỗi mất ACK, đọc cũ trả về muộn và tạm dừng/tiếp tục polling trên đúng bundle iOS, với Capacitor web fallback và dịch vụ phòng thật trong RAM. Không dùng tài khoản/Supabase/phòng cloud.

Bài kiểm thiết bị thật riêng: scheme OnlineLifecycle và `tests/ios/OnlineLifecycleTests.swift` đã build-for-testing được; chưa có lượt XCTest thực thi thành công. Cần UI Automation và đủ chỗ cài app phát triển. Tài khoản miễn phí có thể hết chỗ khi cùng cài bản chính, app Test và runner; không xóa app riêng của người dùng để chạy kiểm. App Test dùng `TEST_APP_SUFFIX=.lifecycle`, dữ liệu tách khỏi bản chính; `APP_DISPLAY_NAME` đặt tên riêng. Scheme App vẫn là luồng build/run/archive bản chính.

`scripts/test-iphone-online.mjs` chỉ cho tạo fixture production khi đặt `MA_SOI_LIVE_TEST=1`; cần chọn `MA_SOI_DEVICE`. `MA_SOI_MANUAL_TEST=1` là chế độ phối hợp qua stdin, dành cho bước phần cứng không có API XCTest. Không in capability, không dùng profile Chrome hoặc bản lưu app chính. Chỉ xử lý phòng thử do script tạo; kết thúc/gỡ bản Test khi xong. Kết quả mô phỏng không được ghi là kết quả iPhone thật.
