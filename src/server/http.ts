import type { IncomingMessage, ServerResponse } from 'node:http';
import { ApiError, parseMutation, roomCode, token } from './validation.ts';
import { RoomService, supportedCatalog } from './rooms.ts';

const messages: Record<string, string> = {
  INVALID_HINT:'Gợi ý chỉ gồm một từ, không được dùng tên hoặc viết tắt tên người chơi.',
  INVALID_ACTION:'Lựa chọn không hợp lệ cho năng lực này.',
  WOLVES_ALREADY_AGREED:'Bầy đã thống nhất. Hãy chốt lượt thay vì báo quá giờ.',
  REQUEST_LIMIT: 'Đã gửi quá nhiều thao tác trong lượt này. Hãy nhờ quản trò chuyển lượt hoặc thao tác thay.',
  VOTE_REQUIRED: 'Đã hết lượt không loại ai. Hãy chọn một người để vote.',
  PLAYER_LEFT: 'Bạn đã rời trò chơi.', PLAYER_NOT_FOUND: 'Người chơi không còn tham gia phòng.',
  OFFLINE_PLAYER_REQUIRED: 'Chỉ thao tác thay người đang dùng máy quản trò.', DEBUG_UNAVAILABLE: 'Tính năng này chỉ có trong debug.', AMBIGUOUS_NAME: 'Tên trùng giữa quản trò và người chơi.',
  GAME_AWAITING_READY: 'Chờ mọi người đọc vai và quản trò bắt đầu.', PLAYERS_NOT_READY: 'Chưa đủ người chơi sẵn sàng.', READY_UNAVAILABLE: 'Không còn ở bước xác nhận vai.', PLAYER_REQUIRED: 'Chỉ người chơi được xác nhận sẵn sàng.',
  SESSION_REQUIRED: 'Cần phiên truy cập trên thiết bị này.', SESSION_NOT_IN_ROOM: 'Phiên này không có quyền vào phòng.',
  ROOM_NOT_FOUND: 'Không tìm thấy phòng hoặc phòng đã hết hạn.', MODERATOR_REQUIRED: 'Chỉ quản trò được thao tác này.',
  STALE_ROOM: 'Danh sách phòng vừa thay đổi. Hãy tải lại rồi thử tiếp.', ROOM_ALREADY_STARTED: 'Phòng đã bắt đầu, không thể đổi danh sách hoặc chia lại.',
  DUPLICATE_NAME: 'Tên này đã có trong phòng.', ROOM_FULL: 'Phòng đã đủ 30 người.',
  DECK_SIZE_MISMATCH: 'Số lá bài phải bằng số người chơi.', UNSUPPORTED_ROLE: 'Vai này chưa được hỗ trợ.',
  STORAGE_NOT_CONFIGURED: 'Máy chủ chưa được cấu hình Supabase.', STORAGE_UNAVAILABLE: 'Chưa kết nối được nơi lưu dữ liệu. Hãy thử lại.',
  STORAGE_BUSY: 'Phòng đang nhận nhiều thao tác. Hãy thử lại.', UNKNOWN_FIELD: 'Yêu cầu chứa trường không được phép.',
  REQUEST_ID_REUSED: 'Mã yêu cầu đã dùng cho một thao tác khác.', STALE_STEP: 'Lượt đã thay đổi. Hãy tải trạng thái mới.',
  WAITING_FOR_ACTIONS: 'Chưa đủ người hoàn tất hành động.', WOLVES_DISAGREE: 'Bầy Sói chưa thống nhất mục tiêu.',
  NOT_YOUR_TURN: 'Chưa đến lượt của bạn.', NOT_AWAKE: 'Cần xác nhận thức dậy trước.', INVALID_TARGET: 'Mục tiêu không hợp lệ hoặc đã chết.',
  ACTION_ALREADY_CONFIRMED: 'Hành động đã chốt.', INVALID_ROOM_CODE: 'Nhập mã phòng gồm 6 chữ số.',
  INVALID_NAME: 'Nhập tên từ 1 đến 40 ký tự.', REPEATED_PROTECTION: 'Không được bảo vệ cùng người hai đêm liền.',
};
function reply(res: ServerResponse, status: number, value: unknown) {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(value));
}
async function readJSON(req: IncomingMessage & { body?: unknown }) {
  if (Number(req.headers['content-length'] ?? 0) > 16384) { req.resume(); throw new ApiError('REQUEST_TOO_LARGE', 413); }
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) throw new ApiError('JSON_REQUIRED', 400);
  if (req.body !== undefined) {
    requireSize(req.body);
    try { return typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { throw new ApiError('INVALID_JSON'); }
  }
  const chunks: Buffer[] = []; let total = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); total += b.length;
    if (total > 16384) { req.resume(); throw new ApiError('REQUEST_TOO_LARGE', 413); } chunks.push(b);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ApiError('INVALID_JSON'); }
}
function requireSize(v: unknown) { if (Buffer.byteLength(typeof v === 'string' ? v : JSON.stringify(v)) > 16384) throw new ApiError('REQUEST_TOO_LARGE', 413); }
export function createApiHandler(service: RoomService | (() => RoomService)) {
  return async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    try {
      const origin = req.headers.origin;
      if (origin) {
        let allowed = false; try { allowed = new URL(origin).host === req.headers.host; } catch {}
        if (!allowed) throw new ApiError('ORIGIN_FORBIDDEN', 403);
      }
      const instance = typeof service === 'function' ? service() : service;
      const url = new URL(req.url ?? '/', 'http://local.invalid');
      if (req.method === 'GET') {
        if (url.searchParams.get('config') === '1' && [...url.searchParams.keys()].length === 1) {
          reply(res, 200, { storage: instance.repository.mode, catalog: supportedCatalog() }); return;
        }
        if ([...url.searchParams.keys()].some(k => k !== 'code' && k !== 'offlinePlayerId')) throw new ApiError('UNKNOWN_FIELD');
        reply(res, 200, await instance.read(roomCode(url.searchParams.get('code')), token(req.headers.authorization), url.searchParams.get('offlinePlayerId') ?? undefined));
      } else if (req.method === 'DELETE') {
        if ([...url.searchParams.keys()].some(k => k !== 'code')) throw new ApiError('UNKNOWN_FIELD');
        reply(res, 200, await instance.closeDebug(roomCode(url.searchParams.get('code')), token(req.headers.authorization)));
      } else if (req.method === 'POST') {
        const credential = token(req.headers.authorization);
        const operation = parseMutation(await readJSON(req));
        reply(res, 200, operation.type === 'leave' ? await instance.leave(operation, credential) : await instance.mutate(operation, credential));
      } else { res.setHeader('Allow', 'GET, POST, DELETE'); throw new ApiError('METHOD_NOT_ALLOWED', 405); }
    } catch (e) {
      const error = e instanceof ApiError ? e : new ApiError('INTERNAL_ERROR', 500);
      reply(res, error.status, { error: { code: error.code, message: messages[error.code] ?? 'Không thực hiện được thao tác. Hãy kiểm tra lựa chọn và thử lại.', retryable: error.retryable } });
    }
  };
}
