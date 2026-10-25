# Dữ liệu thẻ và đối chiếu HTML

Cập nhật 2026-10-25 theo yêu cầu người dùng kiểm tra lại crawl, đối chiếu cards.json với response.html rồi quay lại phát triển core.

## Nguồn và kết quả

- Bản HTML lưu cục bộ: [response.html](../response.html), giữ nguyên. Chỉ trích nội dung 9 vùng bài viết `.word-content`, không lấy bình luận, JSON-LD hoặc bài viết liên quan làm vai.
- JSON đã sửa: [cards.json](../cards.json), **9 nhóm, 64 vai riêng**. Không bổ sung vai ngoài bài nguồn trong mốc này.
- JSON người dùng vừa cập nhật trước sửa đã có Thợ săn và 58 mục; bản [backup](../data/backups/cards.before-html-repair.bcbef440dc32.json) giữ nguyên byte.
- [Báo cáo audit](data-audit.json) lưu hash HTML/JSON trước sửa, danh sách đổi và số dòng HTML của 64 vai. Hash HTML SHA-256: a1360a0ad6fae3c2a31db14c2e15a456a17a3e8634b652270924c78297519da1.
- Catalog [roles.ts](../src/catalog/roles.ts) version source-map-v2 có ID ổn định và ánh xạ 1–1 với 64 mục JSON. Thợ săn có nguồn chính xác, không còn là mục bổ sung ngoài nguồn.

| Nhóm | Số vai |
|---|---:|
| Phe dân làng | 22 |
| Phe sói | 5 |
| Đổi phe | 3 |
| Phe thứ 3 | 4 |
| Bản mở rộng Wolf Pack | 6 |
| Bản mở rộng Hunting Party | 6 |
| Bản mở rộng Urban Legends | 6 |
| Bản mở rộng Night Terrors | 6 |
| Bản mở rộng Classic Movie Monster | 6 |

## Lỗi crawl đã sửa theo bằng chứng trong HTML

- Hunter dùng heading h4, không phải h3. JSON người dùng đã thêm trước lượt kiểm tra này.
- Old Hag có ảnh trong heading h3 riêng. Bộ trích cũ nuốt sang Pacifist và lấy ảnh Pacifist; nay tách đúng vai/ảnh.
- Heading Nhân bản chứa ảnh Cursed rồi mới đến tên Nhân bản. Nay ảnh thuộc Cursed, mô tả và ảnh Nhân bản tách riêng.
- Drunk nằm trong đoạn p in đậm, ngay sau ảnh Nhân bản; Hoodlum cũng như vậy ngay sau ảnh Cult Leader. Đã khôi phục cả hai theo văn bản nguồn, không thêm bằng trí nhớ.
- Chân to, Nostradamus và Bloody Marry là ba heading riêng, ảnh nằm trong các heading/p khác nhau. Nay không gộp mô tả hoặc gán ảnh Bloody Mary cho Chân to.
- Có heading rỗng trước heading thật Kẻ Mất Ngủ. Nay bỏ heading rỗng và lấy đúng tên, không suy đoán tên từ ảnh nữa.
- Bỏ đoạn liên kết bài viết/video ở cuối phần khỏi mô tả thẻ.
- Chỉ gộp khoảng trắng để ổn định tên/đoạn, không sửa nội dung mô tả hoặc tên viết sai từ nguồn (Seeker, Alpha Wofl, Mad Bomberz, Bloody Marry…). ID chuẩn hóa độc lập với tên nguồn.

## Cách kiểm tra và tái trích

```sh
npm run test:data
python3 beauti.py --check
# Chỉ khi chủ động sửa dữ liệu nguồn:
python3 beauti.py --write --report docs/data-audit.json
```

beauti.py dùng HTMLParser của Python chuẩn, không cần BeautifulSoup/requests. Mặc định chỉ so sánh, trả mã lỗi nếu khác. Khi ghi, backup trước và thay tệp nguyên tử; từ chối nếu phát hiện JSON đã đổi trong lúc trích. Không chạy lại --write khi chỉ cần kiểm tra, để giữ báo cáo audit ban đầu.

Có 8 test Python cho h4, heading rỗng, ảnh trước tên vai mới, tên trong p in đậm, mô tả sau ảnh, bỏ bình luận/link, phát hiện trùng/thiếu dữ liệu, và CLI chỉ đọc/backup/idempotence. Test Node đối chiếu catalog đủ 64 vai và chạy --check để so sánh toàn bộ mô tả/URL ảnh với HTML.

## Phân biệt dữ liệu với luật

Giữ schema nguồn: mỗi nhóm có Summary và Deck of cards; mỗi vai có Description và Image Url. Việc sửa này thay các khóa bị gộp/rỗng thành vai riêng, version catalog tăng v1 → v2. Không có ván thật lưu bằng khóa nguồn cần migration. Mọi liên kết runtime dùng ID ổn định; không đổi vai đang chơi theo tên thẻ.

“Khớp HTML” không nghĩa là luật nguồn hoàn chỉnh, là luật chính thức hoặc ảnh đã được xác minh tải/quyền sử dụng. Các biến thể Hunter Ma cà rồng, Nhân bản chỉ kế thừa chết đêm… cần định nghĩa riêng và test trước khi bật. Sói con hy sinh đã có mặc định/test tại v7. Mặc định đang thực thi ở DEFAULT_RULES.md. Bảng phủ phân biệt rõ **27 vai có core** và **37 vai chưa có core**.
