# Phản hồi kiểm tra độc lập cho AI đang làm 64 vai

Copy phần dưới dấu `---` sang AI đang làm ở `.agent-roles64-worktree`. Đối chiếu trực tiếp ngày 2026-10-27. Người review chỉ đọc và chạy kiểm tra độc lập, không sửa worktree đó.

---

Tiếp tục nhiệm vụ hoàn thiện 64 vai, nhưng trước hết xử lý các finding dưới đây. Không merge/push/deploy bản đang có và không tiếp tục dựa vào kết luận rằng cắt receipts còn 300 là đã an toàn.

## 1. Finding đã tái hiện: cap 300 làm replay cũ đổi hành động hiện tại

Vị trí hiện tại:
- `src/engine/engine.ts`: gọi `pruneReceipts` sau dispatch, xóa bản ghi cũ nhất khi vượt 300.
- `src/server/rooms.ts`: cap Room.receipts còn 300 trước kiểm tra kích thước.
- `tests/receipt-cap.test.ts`: hai test hiện đạt nhưng chỉ replay bản ghi mới nhất, chưa kiểm tra bản ghi bị evict.

Tình huống đã chạy độc lập, hoàn toàn trong RAM:
1. Tạo ván 1 Sói + 3 Dân, đi đến lượt wolves và wake Sói.
2. Gửi request `lost-ack`, bite A, cùng gameId/stepId hiện tại.
3. Gửi request mới, đổi lựa chọn sang B.
4. Gửi 305 request wake hợp lệ với ID khác nhau, vẫn trong cùng lượt wolves.
5. Replay nguyên request `lost-ack` (ID, principal, gameId, stepId, nội dung đều không đổi).

Kết quả đối chiếu:
- Main: trước B/revision 310; sau vẫn B/revision 310.
- Worktree cap 300: trước B/revision 310; sau trở lại A/revision 311.

Đây là regression về idempotency: request cũ đã thực hiện bị coi thành request mới, có thể đổi lựa chọn/đồng thuận. Client hiện lưu pending trong localStorage, nên giả định “retry luôn đến trong vài giây” không phải hợp đồng của sản phẩm.

Thêm test tái hiện TRƯỚC khi sửa, và giữ nguyên expected rằng replay cũ không được làm đổi lựa chọn hiện tại. Kiểm tra cùng lỗi qua HTTP để đi qua cả Room.receipts và Game.receipts, nhiều principal, nhiều lớp retry. Kiểm tra đổi nội dung của ID đã bị evict: không được tự động coi là ID hoàn toàn mới để thực thi.

Thiết kế lại chính sách dedup có giới hạn và hợp đồng rõ: phạm vi theo principal/step, thời hạn/cửa sổ replay, cách từ chối yêu cầu đã hết hạn, tương thích client cũ và cách giữ quyền tiến ván của quản trò. Nếu chọn cơ chế sequence/generation hoặc kho dedup riêng, giải thích tradeoff và migration. Không chỉ nâng cap từ 300 lên số khác rồi coi là đã sửa; cũng không đơn giản bỏ mọi giới hạn và bỏ qua vấn đề kích thước.

Có thể tái hiện bằng lệnh sau từ worktree (không dùng mạng/database):

```sh
node --input-type=module <<'JS'
import { createGame, dispatch, stepId } from './src/engine/engine.ts';
let g = createGame('receipt-replay', [
  {id:'w',name:'W',role:'wolf'}, {id:'a',name:'A',role:'villager'},
  {id:'b',name:'B',role:'villager'}, {id:'c',name:'C',role:'villager'},
]);
const mod={kind:'moderator'}, wolf={kind:'player',playerId:'w'};
const send=(id,command,principal=wolf)=>{
  g=dispatch(g,principal,{id,gameId:g.id,stepId:stepId(g),command});
};
send('guard',{type:'advance'},mod);
send('seer',{type:'advance'},mod);
send('wake',{type:'wake'});
const old={id:'lost-ack',gameId:g.id,stepId:stepId(g),command:{type:'act',action:{type:'bite',target:'a'}}};
g=dispatch(g,wolf,old);
send('changed-choice',{type:'act',action:{type:'bite',target:'b'}});
for(let i=0;i<305;i++) send('wake-'+i,{type:'wake'});
const before={target:g.actions.w.target,revision:g.revision};
g=dispatch(g,wolf,old);
console.log({before,after:{target:g.actions.w.target,revision:g.revision}});
JS
```

## 2. Cap receipts chưa đủ chứng minh phòng không thể vượt 2 MB

`action-confirmed` vẫn được thêm vào `Game.events` mỗi lần Sói đổi lựa chọn hợp lệ. Cắt receipts không giới hạn toàn bộ document. Test lặp wake hoặc setDeck trong lobby chỉ chứng minh đúng hai trường hợp đó, không chứng minh ván đang chơi không bị đầy.

Bổ sung kiểm tra nhiều lần sửa lựa chọn và nhiều đêm với events/chat/progress thực tế. Đo kích thước document theo thành phần. Đề xuất cách giới hạn, tách lưu hoặc chống flood mà vẫn giữ nhật ký cần thiết, retry, bí mật, offline và khả năng quản trò tiếp tục/xử lý phòng. Không xóa lịch sử tùy tiện hoặc tắt guard 2 MB để test xanh.

## 3. Sửa harness trước khi kết luận app lỗi

Trong `docs/verification/audit-online-http.mjs` hiện tại:
- `playerAct` dùng `.then(r => { if (r.status !== 200) return {error:...}; })` cho wake, nhưng bỏ kết quả rồi tiếp tục act. Lỗi bắt buộc phải được trả ra/throw và dừng nhánh.
- `{ skipped: true }` khi không có turn cần phân biệt vai vắng hợp lệ và actor đáng lẽ phải có lượt; không được bỏ qua lỗi định danh/token/step.
- Các kiểm tra resolve/publish đang chấp nhận cả lỗi sai phase như thành công. Với luồng happy path phải xác nhận đang đúng review, resolve thành công và publish thành công. Test lỗi có expected riêng, không gộp vào happy path.
- Cần deadline toàn run, timeout từng request, giới hạn mutation theo phase và guard không tiến triển theo step/actions. Lỗi bắt buộc đầu tiên phải dừng với snapshot/seed đã khử bí mật. Không tiếp tục hàng nghìn write sau khi đã mất actor hoặc advance không thể thành công.
- 5 lần chạy chỉ có ý nghĩa sau khi đã có một kịch bản deterministic đúng, có assertion chặt. Không dùng script sai làm benchmark hoặc bằng chứng app ổn định.

Sửa harness có review độc lập, chạy lại các kịch bản đã cố định seed và lưu summary thực tế. Không ghi capability/secret/dữ liệu ván thật vào repo. `.agent-rooms/` đang hiện untracked: không add/commit kho dữ liệu đó.

## 4. Tiến độ thực tế và bước tiếp theo

Đã kiểm ROLES trong worktree: vẫn 27 vai. Hợp đồng `role-contracts-v14.md` là bản thiết kế, không được tính thành 64 vai đã hỗ trợ. Nguồn ghi “luật phổ biến” cần dẫn chứng cụ thể hoặc chuyển thành GIẢ ĐỊNH; chưa review xong thì không tuyên bố giải quyết hết các finding chỉ vì đã bổ sung đoạn văn.

Sau khi hai lớp idempotency, giới hạn document và harness đã đạt regression + review độc lập:
1. Chốt đợt ổn định với báo cáo có phạm vi, không kéo dài audit vô hạn.
2. Bắt đầu một nhóm vai mới nhỏ, hoàn tất luật → core → API/projection → avatar UI → offline → test → phản biện.
3. Tiếp tục các nhóm còn lại theo prompt bàn giao ban đầu; không dừng ở việc viết hợp đồng 37 vai.
4. Giữ toàn bộ luật Thợ săn v13, lựa chọn avatar, viền đồng đội theo projection, vùng sin1 và bảo đảm của bản hiện tại. Khi bump v14, kiểm tra riêng mọi nhánh đang so sánh literal v13 để không vô tình tắt ghim/bắn chủ động, skip budget, chat hoặc clocks.

Báo cáo mỗi mốc: số vai thực sự playable/64; finding đã tái hiện/sửa; test mới và regression đã chạy; giới hạn còn lại. Không tuyên bố đã có reviewer độc lập hoặc đã kiểm nhiều điện thoại nếu thực tế chưa làm.
