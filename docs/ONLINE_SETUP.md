# Kết nối online đang chuẩn bị

Chưa có project Supabase; chưa deploy. Có thể phát triển và kiểm tra local trong lúc chức năng tạo project của nhà cung cấp gặp sự cố.

## Chạy local

`npm ci` rồi `npm run dev:online`, mở http://127.0.0.1:5174/. Trang chính có tạo/vào phòng; sandbox thử luật ở `/sandbox.html`.

Khi không đặt biến Supabase, dev server lưu phòng vào `.local-rooms/`, chỉ dành cho phát triển. Phòng hết hạn sau 24 giờ. Tải lại cùng trình duyệt giữ danh tính bằng phiên trong localStorage; xóa dữ liệu trình duyệt sẽ mất quyền truy cập, chưa có chức năng nhận lại quyền. Quản trò là một phiên riêng, không đồng thời là người chơi. Hiện dùng polling, chưa tích hợp Realtime.

Không đưa `.local-rooms/` vào Git hoặc thư mục public. Nếu tiến trình bị dừng đột ngột và để lại `rooms.lock`, chỉ xóa lock sau khi đã dừng tất cả dev server đang dùng thư mục đó.

## Khi có project Supabase

1. Áp dụng `supabase/migrations/202610250001_rooms.sql` vào database của project. Bảng và RPC chỉ cấp quyền cho service_role, không mở đọc/ghi trực tiếp từ trình duyệt.
2. Tạo `.env.local` từ `.env.example`; đặt `SUPABASE_URL` và `SUPABASE_SECRET_KEY`. Có thể dùng `SUPABASE_SERVICE_ROLE_KEY` JWT cũ thay cho secret key mới. Chỉ cấu hình một loại key.
3. Khởi động lại dev server. Kiểm tra nhãn lưu trữ chuyển sang Supabase, thử tạo/vào phòng, tải lại và gửi trùng thao tác trên dữ liệu thử.
4. Kiểm chứng RLS, cạnh tranh ghi và lỗi mạng trên project thật trước khi dùng cho ván thật. Adapter đã được kiểm tra qua HTTP local; chưa chứng minh SQL/RLS hoặc dịch vụ cloud hoạt động đúng.

Key chỉ đặt ở máy chủ, không dùng tiền tố `VITE_`, không gửi vào chat và không đưa vào Git. Secret key mới đi trong header `apikey`; JWT service_role cũ dùng thêm Bearer. Tham khảo [API keys của Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

Entry `api/room.ts` dành cho Node trên Vercel và từ chối hoạt động nếu thiếu cấu hình Supabase; không tự dùng filesystem tạm của cloud. `vercel.json` chỉ là cấu hình chuẩn bị, chưa deploy. `npm run preview` chỉ phục vụ bundle tĩnh, không chạy API phòng.

Kiểm tra: `npm test`, `npm run test:data`, `npm run build`. HTTP test dùng thư mục tạm và upstream HTTP local để thử 503, JSON lỗi, timeout, retry và phân quyền; không gọi project thật. Postman smoke chỉ kiểm config công khai, không thay thế kiểm thử ván nhiều thiết bị.
