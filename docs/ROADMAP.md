# Lộ trình multi-online

Cập nhật 2026-10-25. Người dùng đồng ý bổ sung các vai còn lại sau, chuyển sang luồng online với 27 vai hiện có. Ưu tiên kiểm chứng phòng, phân quyền, lưu bền vững và retry. Chưa có project Supabase; chuẩn bị kết nối và kiểm tra local trước. Không ước lượng phần trăm khi thiếu nghiệm thu tương tác.

| Mốc | Trạng thái | Điều kiện tiếp tục/nghiệm thu |
|---|---|---|
| Dữ liệu và catalog | 64 vai/9 nhóm khớp response.html; source-map-v2 | Duy trì --check và test catalog; không lấy bình luận làm luật |
| 9 vai nền | Đã ổn định mốc v5 | Giữ hồi quy khi thêm vai |
| 10 vai mở rộng v6 | Đã thêm ở v6, tổng 19 vai ở v6; đã giữ hồi quy ở v7 | Tiếp tục kiểm tình huống kết hợp; nhóm chơi thử các mặc định |
| Bầy Sói nhiều mục tiêu | Đã làm ở v7: Sói con/đại ca/Alpha; tổng 22 vai, 100 test Node và 8 test dữ liệu đạt | Duy trì kiểm tra đa mục tiêu, hy sinh/chuyển hóa và thông tin khi mở rộng |
| Liên kết và điều kiện thức | Đã làm ở v8: Dire/Virginia/Fruit/Fang/Dream; tổng 27 vai, 127 test Node và 8 test dữ liệu đạt | Giữ hồi quy bí mật, bộ nhớ và chuỗi chết |
| Tùy chọn Phù thủy | Đã làm ở v9: witchSeesBite hai chế độ do quản trò chọn khi chia vai, Game schema4; 143 test Node, Postman và trình duyệt hai phòng đạt | Giữ hồi quy chế độ ẩn (không dò nạn nhân qua lệnh), ván v8/schema3 không đổi luật giữa ván, Bảo vệ che được nạn nhân ở cả hai chế độ |
| Giao diện tối, bàn tròn, chat bầy | Đã làm ở v10: UI tối mobile-first (F06–F11), bàn tròn sống/chết, kéo thả xếp ghế, mục vai có ảnh; chat bầy ở bước Sói (F12) với schema5; 150 test Node và browser hai phòng đạt | Giữ hồi quy bí mật chat (người nhận do máy chủ quyết), ván v9/4 và v8/3 không đổi luật giữa ván |
| Vai bầy còn lại | Hoãn, có thể bổ sung sau | Minion/Sorceress, Wolverine, Teen Wolf; Lone Wolf đi cùng mô hình thắng riêng |
| Ngày, hiệu ứng quyền và vai nhóm ngày | Đồng hồ 4 pha buổi sáng đã làm ở v11 (D41); phán quyết thủ công có sẵn (D40); hiệu ứng quyền chưa làm | Nhiều lần phán quyết, hiệu ứng hết hạn, xác nhận hành vi ngoài app có nhật ký; các vai nhóm ngày (Thị trưởng, Thằng ngốc…) theo mô hình phán quyết thủ công, không làm phiếu in-app; tự chuyển bước khi hết giờ là câu hỏi mở |
| Thông tin theo ghế/kỹ năng một lần | Có nền ghế/bom; các vai còn lại chưa làm | Tập mục tiêu hợp lệ, dữ liệu theo quyền, tài nguyên một lần và phản ứng chuyển mục tiêu |
| Phe riêng/kết quả đồng thời | Hiện chỉ có phe tình nhân | Không ép Tanner/Nostradamus/Hoodlum vào winner đơn; cái chết chậm của Vampire, tập người thắng và thứ tự kiểm tra |
| Nhiều năng lực/chuyển đổi phức tạp | Chưa làm | Drunk có vai ẩn, Frankenstein tích lũy kỹ năng, Bloody Mary hành động sau chết và truy nguyên nguyên nhân |
| Online và độ tin cậy | Đang làm: API/local UI, adapter và migration; có test HTTP, chưa xác minh cloud | Kiểm tra trọn ván nhiều trình duyệt, SQL/RLS và CAS trên database, sau đó project Supabase thật; chưa deploy |

Danh sách từng vai, ID và phụ thuộc tại [ROLE_COVERAGE.md](ROLE_COVERAGE.md); kết quả chạy thực tế tại [STATUS.md](STATUS.md).

## Nguyên tắc từng mốc

Mỗi vai cần luật hardcode rõ, test kết quả và thông tin, thử tương tác với vai đã có; version/migration khi trạng thái thay đổi. Không chỉ thêm tên vai vào union rồi coi là hỗ trợ. Các chức năng ngoài app cần lệnh quản trò có nhật ký, không giả định hệ thống nghe được lời nói thật.

Không phát âm thanh máy; quản trò đọc lời thoại. Nhập số người/vòng tròn ghế/tên từng ghế vẫn hoãn. Không mở rộng offline/native hoặc chat/voice thay đối thoại trực tiếp.

D44 (2026-10-26): đã tách product/testing/debug; bỏ slogan tự thêm, sandbox và công cụ nhiều người chơi chỉ chạy trong debug dev server, mọi build chỉ chứa product. Kiểm chứng mới nhất ở STATUS.md.

D48–D50 (2026-10-26): đã thiết kế lại giao diện phòng, phân cấp công cụ/hành động, thêm dấu X đỏ theo đêm công khai và làm rõ icon bằng nhãn ngắn. Đã kiểm UI nhiều kích thước và ván sáu người qua hai đêm; không thay mốc backend/cloud.

D52–D54 (2026-10-26): đã đồng bộ bộ vai lobby, hiển thị mô tả nguyên văn và tách chia vai/sẵn sàng/bắt đầu với kiểm quyền máy chủ; room schema 2, Game v11/schema6 không đổi. Migration SQL mới chưa được kiểm trên Supabase thật.

D55–D58 (2026-10-26): đã tách phòng debug tạm trong RAM với xóa theo vòng đời quản trò; đổi máy bằng tên cũ; người dùng chung máy quản trò, xem vai riêng và proxy lượt. Room schema 3, Game không đổi; chuẩn bị migration SQL mới, chưa chạy cloud. Đã sửa tâm X máu và điều hướng X của chi tiết thẻ.

D59 (2026-10-26): đã thêm menu avatar chuyển offline/rút người, giữ kéo thả lobby; rút không kích hoạt hiệu ứng chết và không làm mắc lượt. Room schema 4, API 0.8.0; SQL mới chưa kiểm cloud.
