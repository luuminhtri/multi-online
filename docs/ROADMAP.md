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
| Vai bầy còn lại | Hoãn, có thể bổ sung sau | Minion/Sorceress, Wolverine, Teen Wolf; Lone Wolf đi cùng mô hình thắng riêng |
| Ngày, vote và hiệu ứng quyền | Chưa triển khai | Vote vào core, trọng số/quyền bỏ phiếu, nhiều lần phán quyết, hiệu ứng hết hạn và xác nhận hành vi ngoài app |
| Thông tin theo ghế/kỹ năng một lần | Có nền ghế/bom; các vai còn lại chưa làm | Tập mục tiêu hợp lệ, dữ liệu theo quyền, tài nguyên một lần và phản ứng chuyển mục tiêu |
| Phe riêng/kết quả đồng thời | Hiện chỉ có phe tình nhân | Không ép Tanner/Nostradamus/Hoodlum vào winner đơn; cái chết chậm của Vampire, tập người thắng và thứ tự kiểm tra |
| Nhiều năng lực/chuyển đổi phức tạp | Chưa làm | Drunk có vai ẩn, Frankenstein tích lũy kỹ năng, Bloody Mary hành động sau chết và truy nguyên nguyên nhân |
| Online và độ tin cậy | Đang làm: API/local UI, adapter và migration; có test HTTP, chưa xác minh cloud | Kiểm tra trọn ván nhiều trình duyệt, SQL/RLS và CAS trên database, sau đó project Supabase thật; chưa deploy |

Danh sách từng vai, ID và phụ thuộc tại [ROLE_COVERAGE.md](ROLE_COVERAGE.md); kết quả chạy thực tế tại [STATUS.md](STATUS.md).

## Nguyên tắc từng mốc

Mỗi vai cần luật hardcode rõ, test kết quả và thông tin, thử tương tác với vai đã có; version/migration khi trạng thái thay đổi. Không chỉ thêm tên vai vào union rồi coi là hỗ trợ. Các chức năng ngoài app cần lệnh quản trò có nhật ký, không giả định hệ thống nghe được lời nói thật.

Không phát âm thanh máy; quản trò đọc lời thoại. Nhập số người/vòng tròn ghế/tên từng ghế vẫn hoãn. Không mở rộng offline/native hoặc chat/voice thay đối thoại trực tiếp.
