// Native ships its UI locally; only room requests and invitations use the web host.
export const DEFAULT_ONLINE_ORIGIN = 'https://multi-online.vercel.app';
export const PUBLIC_ROOM_ORIGINS = [DEFAULT_ONLINE_ORIGIN, 'https://masoi.yennhi.tech'] as const;

// Both production addresses serve the same rooms. Never accept arbitrary QR
// hosts or change the API host based on untrusted QR content.
export function trustedRoomOrigins(origin: string): readonly string[] {
  return PUBLIC_ROOM_ORIGINS.some(value => value === origin) ? PUBLIC_ROOM_ORIGINS : [origin];
}
export function onlineOrigin(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Địa chỉ máy chủ iPhone phải là HTTPS origin, không chứa đường dẫn hoặc thông tin đăng nhập.');
  }
  return url.origin;
}
export function roomRequestPath(room?: string, proxy?: string | null) {
  const params = room ? new URLSearchParams({ code: room }) : new URLSearchParams({ config: '1' });
  if (room && proxy) params.set('offlinePlayerId', proxy);
  return `/api/room?${params}`;
}
export function roomInvite(origin: string, code: string) {
  return `${origin}/?room=${encodeURIComponent(code)}`;
}
