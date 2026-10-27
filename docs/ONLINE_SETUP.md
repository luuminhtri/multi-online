# Tự test, kết nối Supabase và deploy Vercel

Cập nhật 2026-10-26. Hướng dẫn theo code hiện có; chưa xác nhận deployment/Supabase thật của người dùng. Không cần đưa secret vào chat.

Luồng online: điện thoại → Vercel `/api/room` → Supabase Data API/Postgres. Luồng Offline một máy chạy và lưu trong trình duyệt, không ghi phòng vào Supabase.

## 1. Chuẩn bị đúng thư mục và Node

Repo hiện tại là https://github.com/luuminhtri/multi-online, nhánh main. Git root trên máy là `/Users/yennhi/LMT/ma-soi-app/multi-online`; trên Vercel chọn Root Directory `.`.

Máy được kiểm tra đang chạy Node 26.5.0. Vercel hiện có Node 24.x/22.x; dùng Node 24 LTS cho cả local và Vercel để test cùng major version. `package.json` hiện `>=22.18.0` tương thích 24.x.

Nếu đã có nvm:

```sh
cd /Users/yennhi/LMT/ma-soi-app/multi-online
nvm install 24
nvm use 24
node --version
npm ci
npm test
npm run test:data
npm run build
```

Nếu chưa có nvm, cài Node 24 LTS rồi mở Terminal mới. `test:data` cần Python 3. Dừng ở lỗi đầu tiên, không bỏ qua lỗi test/build để tiếp tục deploy.

## 2. Tự kiểm giao diện và luật local

`npm run debug` chỉ dành cho thử giao diện/luật. Debug luôn dùng RAM, không kết nối Supabase, kể cả đã đặt biến môi trường. Đóng tab quản trò sẽ xóa phòng thử; restart server cũng mất phòng. Không dùng debug để xác nhận đã lưu cloud.

`npm run dev:online` chạy app thường ở cổng 5174; khi chưa có biến Supabase thì lưu vào `.local-rooms/`. Dừng server cũ bằng Ctrl+C trước khi chạy lệnh khác trên cùng cổng.

Dùng máy quản trò và các điện thoại/profile riêng. Hai tab bình thường cùng profile chia sẻ localStorage nên không phải hai người độc lập. Có thể thêm người offline vào máy quản trò để đủ bộ vai.

Kịch bản thử 5 người: 1 Sói, 1 Bảo vệ, 1 Tiên tri, 1 Phù thủy, 1 Dân.

- Tạo Online, vào bằng mã 6 số; kiểm tra tên/ghế đúng.
- Lưu bộ vai, chia, từng người đọc vai và sẵn sàng; chưa đủ thì chưa bắt đầu được.
- Mỗi người chỉ thấy vai mình; không có Sổ tay bí mật trên máy người chơi.
- Đến lượt hiện toàn màn hình; xác nhận xong mới chọn mục tiêu.
- Bảo vệ/Tiên tri/Sói/Phù thủy gửi hành động, quản trò chuyển bước được.
- Tiên tri thử cả Sói và Dân trong các đêm/ván riêng; Phù thủy mặc định không thấy nạn nhân.
- Trước công bố chưa lộ người chết; sau công bố các máy có cùng kết quả.
- Ngân sách skip=0 chặn Không loại ai; ván khác skip=1 dùng được một lần rồi hết.
- Tải lại, mất mạng rồi bật lại, bấm gửi nhanh hai lần; không nhân đôi hành động.
- Menu chuyển dùng máy quản trò/rút người, sổ tay ba tab và Thoát phòng hoạt động.
- Tạo Offline, thử chuỗi hành động tối giản và khôi phục bản lưu sau tải lại.

Vào điện thoại qua IP HTTP trong cùng mạng giúp test online/local đang mở, nhưng cache để tải lại hoàn toàn không mạng cần HTTPS hoặc localhost. Test offline thật bằng bản build/URL HTTPS ở bước 7.

## 3. Tạo project Supabase và chạy SQL

Tạo project từ https://supabase.com/dashboard, đặt tên, lưu mật khẩu database và chọn vùng gần người chơi (ví dụ Singapore nếu phù hợp). Chờ database sẵn sàng.

Trong project → SQL Editor → New query, mở và chạy toàn bộ từng file dưới đây theo thứ tự. Chạy xong một file không lỗi rồi mới sang file tiếp theo. Không chỉ chạy file cuối.

1. `supabase/migrations/202610250001_rooms.sql`
2. `supabase/migrations/202610260001_lobby_ready.sql`
3. `supabase/migrations/202610260002_shared_devices.sql`
4. `supabase/migrations/202610260003_member_controls.sql`
5. `supabase/migrations/202610260004_numeric_room_codes.sql`

Không cần tự dựng bảng bằng Table Editor. Các file tạo bảng `public.ma_soi_rooms`, RPC `public.ma_soi_commit_room`, RLS và quyền riêng cho server. Không tắt RLS hoặc cấp đọc/ghi bảng cho anon/authenticated để chữa lỗi.

Chạy SQL chỉ đọc sau để xác nhận bảng và RPC tồn tại:

```sql
select
  to_regclass('public.ma_soi_rooms') as room_table,
  to_regprocedure('public.ma_soi_commit_room(text,bigint,jsonb)') as commit_rpc;
```

Hai cột đều phải khác NULL. Xác nhận RLS và quyền:

```sql
select relrowsecurity as rls_enabled
from pg_class where oid = 'public.ma_soi_rooms'::regclass;

select
  has_table_privilege('anon', 'public.ma_soi_rooms', 'SELECT') as anon_read,
  has_table_privilege('authenticated', 'public.ma_soi_rooms', 'SELECT') as authenticated_read,
  has_function_privilege('anon', 'public.ma_soi_commit_room(text,bigint,jsonb)', 'EXECUTE') as anon_commit;
```

Kết quả mong đợi: rls_enabled=true; ba quyền public bên dưới đều false.

Trong phần Data API của project, bảo đảm Data API bật và schema public được phục vụ. Tên menu có thể là Integrations → Data API. Migration đã cấp quyền bảng/RPC cho service_role; không bật public access cho mọi người. App hiện dùng REST/polling nên chưa cần cấu hình Supabase Auth, Storage hay Realtime.

## 4. Lấy key và thử Supabase ngay từ local

Lấy Project URL trong Connect dialog. Vào Settings → API Keys lấy/tạo secret key `sb_secret_...`. Đây không phải publishable/anon key, mật khẩu database, access token tài khoản hoặc database connection string.

Tạo `.env.local` từ `.env.example` nếu chưa có, rồi điền hai biến:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_SECRET
```

Không thêm tiền tố VITE_, không đặt vào public/src, không commit hoặc gửi secret cho người khác. `.gitignore` hiện đã bỏ qua `.env.local`. Chỉ cấu hình một loại key; code vẫn hỗ trợ SUPABASE_SERVICE_ROLE_KEY cũ nhưng project mới nên dùng SUPABASE_SECRET_KEY.

Dừng server cũ và chạy lại:

```sh
npm run dev:online
```

Mở `http://localhost:5174/api/room?config=1`. JSON cần có `"storage":"supabase"`. Đây chỉ xác nhận adapter được chọn, chưa chứng minh kết nối database thành công.

Để chứng minh kết nối:

1. Mở app và tạo một phòng **Online**, không chọn Offline.
2. Ghi lại mã phòng.
3. Trong SQL Editor chạy:

```sql
select code, revision, expires_at
from public.ma_soi_rooms
order by expires_at desc
limit 10;
```

4. Phải thấy đúng mã vừa tạo; cho một người vào, revision cần tăng.
5. Tải lại máy quản trò/người chơi, thử chia vai và đọc lại hàng trong bảng.

Dữ liệu document chứa toàn bộ bí mật ván. Không chụp/paste document hoặc token vào nơi công khai.

## 5. Đẩy bản đã test lên GitHub

Trong đúng Git root:

```sh
git status
git check-ignore .env.local
git ls-files .env.local
```

`git check-ignore` cần báo `.env.local`; `git ls-files .env.local` không được in file này. Nếu file secret đã được track, xử lý việc bỏ track/đổi key trước khi push.

Kiểm thay đổi rồi commit/push nếu có thay đổi:

```sh
git add .
git diff --cached --stat
git diff --cached --check
git commit -m "Prepare Supabase and Vercel deployment"
git push origin main
```

Nếu không có thay đổi để commit, chỉ push các commit còn lại nếu cần. Trên GitHub phải có `api/room.ts`, `vercel.json`, `package-lock.json`, source mới và `public/offline-cards/` đủ 27 ảnh. Không upload riêng thư mục dist vì sẽ thiếu function API.

## 6. Deploy từ Vercel Dashboard

Vào https://vercel.com/dashboard → Add New → Project → Import Git Repository → chọn `luuminhtri/multi-online`.

Cấu hình:

| Mục | Giá trị |
|---|---|
| Framework Preset | Vite |
| Root Directory | `.` (gốc repo, không điền multi-online lần nữa) |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | `24.x` |
| Production Branch | `main` |

Giữ vercel.json hiện có. Không thêm rewrite mọi đường dẫn sang index.html vì có thể nuốt `/api/room`. Function Node ở api/room.ts được deploy cùng frontend; không cần chạy Vite dev server trên cloud.

Trong Environment Variables thêm:

- SUPABASE_URL = Project URL.
- SUPABASE_SECRET_KEY = secret key, đánh dấu Secret nếu UI cho chọn.

Áp dụng Production; áp dụng cả Preview nếu muốn test bằng preview deployment. Preview và Production dùng cùng project Supabase thì chia sẻ database; có thể dùng project test riêng nếu muốn tách dữ liệu. Không đặt NODE_ENV=production để bỏ devDependencies lúc install vì build cần Vite/TypeScript.

Bấm Deploy, chờ Ready. Nếu sửa env sau khi đã deploy, phải Redeploy: env mới không tự đổi deployment cũ. Có thể chọn vùng Function gần Supabase nếu tài khoản hỗ trợ; đây là tối ưu sau khi luồng cơ bản chạy được.

## 7. Kiểm bản deploy trên điện thoại

Mở đúng domain HTTPS, ví dụ `https://YOUR_APP.vercel.app/api/room?config=1`, kiểm storage=supabase. Sau đó tạo Online, xác nhận hàng trong Supabase và lặp lại kịch bản nhiều máy bước 2.

Dùng cùng một domain cho cả nhóm; khác preview URL/custom domain có localStorage/phiên khác nhau. Không thử qua debug: bản production không có badge/công cụ debug.

Nếu link preview bắt người chơi đăng nhập Vercel, kiểm tra Deployment Protection; chọn link Production có quyền truy cập phù hợp cho nhóm. Không cần chia sẻ tài khoản Vercel/Supabase cho người chơi.

Test Offline thật:

1. Mở cùng URL HTTPS khi còn mạng, đợi app và ảnh thẻ tải xong.
2. Tạo Offline, thêm người và bắt đầu ván.
3. Bật chế độ máy bay, tắt cả Wi-Fi nếu nó còn bật.
4. Tải lại cùng trang, kiểm ván/ảnh thẻ và chơi tiếp.
5. Thoát về trang đầu rồi Tiếp tục bàn đã lưu.

Có thể kiểm trên desktop ở DevTools → Application → Service Workers (worker activated), Cache Storage có ma-soi-shell-... trước khi test không mạng. Bản dev/debug không cài worker; npm run preview chỉ phục vụ build tĩnh và bàn Offline, không chạy API phòng Online.

Không xóa dữ liệu site khi còn cần bản lưu/phiên. Phòng online hiện hết hạn sau 24 giờ; chưa có cron dọn hàng hết hạn. Thoát phòng production giữ phòng và phiên trên máy, không đồng nghĩa đóng/xóa cho mọi người. Quản trò mới không nhập tên nên cần giữ phiên trên thiết bị đang dùng.

## 8. Lỗi thường gặp

| Triệu chứng | Kiểm tra |
|---|---|
| EADDRINUSE/cổng 5174 đang dùng | Dừng dev/debug cũ bằng Ctrl+C |
| storage vẫn local hoặc thấy DEBUG | Đang dùng debug; chuyển dev:online và restart sau khi đổi env |
| STORAGE_NOT_CONFIGURED | Thiếu/misspell hai env hoặc chưa áp dụng đúng môi trường Vercel/redeploy |
| STORAGE_UNAVAILABLE | Sai URL/key, project chưa sẵn sàng, Data API tắt, thiếu bảng/RPC/quyền/migration; xem Vercel function logs và Supabase API logs |
| Mã chứa 0/1 không tạo được | Chưa chạy migration numeric_room_codes |
| INVALID_ROOM_COMMIT hoặc schemaVersion constraint | Thiếu migration lobby/shared-device/member-controls |
| Trang lên nhưng /api/room trả HTML/404 | Sai Git root, thiếu api/room.ts, chỉ upload dist hoặc rewrite đè API |
| Build báo Node/version/TS | Chọn Node 24.x, npm ci, giữ devDependencies và kiểm build logs |
| Hai tab thành cùng người | Cùng profile chia sẻ localStorage; dùng điện thoại/profile độc lập |
| Giao diện cũ sau deploy | Kiểm đúng domain/deployment; service worker có thể còn bản cũ, đóng/mở lại sau khi online để cập nhật; không xóa site data nếu còn ván cần giữ |
| Offline không tải lại được | Chưa cache đủ, dùng HTTP LAN thay HTTPS, hoặc dữ liệu trình duyệt đã bị xóa |

Khi cần hỗ trợ, gửi bước bị lỗi, status/error code của /api/room và đoạn log đã che secret/token/danh tính vai. Trang lên thành công chưa đồng nghĩa backend đã được kiểm; tiêu chí tối thiểu là tạo/join/chia vai được và nhìn thấy dữ liệu đúng trong Supabase.

## Nguồn đối chiếu chính thức

- API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Data API: https://supabase.com/docs/guides/api/creating-routes
- Node.js trên Vercel: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- Build/root directory: https://vercel.com/docs/builds/configure-a-build
- Environment variables: https://vercel.com/docs/environment-variables
