import jsQRModule from 'jsqr';
import type { Options, QRCode } from 'jsqr';
import { trustedRoomOrigins } from '../platform/urls.ts';
// jsQR ships CommonJS; Vite exposes its callable export as default.
const jsQR = jsQRModule as unknown as (data: Uint8ClampedArray, width: number, height: number, options?: Options) => QRCode | null;

export function roomCodeFromQr(text: string, origin: string): string | null {
  if (/^\d{6}$/.test(text.trim())) return text.trim();
  try {
    const url = new URL(text);
    const code = url.searchParams.get('room');
    return !url.username && !url.password && trustedRoomOrigins(origin).includes(url.origin) && code && /^\d{6}$/.test(code) ? code : null;
  } catch { return null; }
}

export function scanRoomQr(onRead: (code: string) => void, origin = location.origin) {
  const dialog = document.createElement('dialog');
  dialog.className = 'qr-scanner';
  dialog.innerHTML = '<button type="button" class="secondary">Đóng</button><h3>Quét mã phòng</h3><video autoplay muted playsinline></video><p role="status">Đang mở camera…</p>';
  document.body.append(dialog);
  const video = dialog.querySelector('video')!;
  const status = dialog.querySelector('p')!;
  video.muted = true;
  video.playsInline = true;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'secondary';
  retry.textContent = 'Thử mở camera lại';
  retry.hidden = true;
  dialog.append(retry);
  let stream: MediaStream | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  const cleanup = () => {
    closed = true;
    clearTimeout(timer);
    stream?.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    dialog.remove();
    document.removeEventListener('visibilitychange', onVisibility);
  };
  const onVisibility = () => { if (document.hidden) dialog.close(); };
  dialog.addEventListener('close', cleanup, { once: true });
  dialog.querySelector('button')!.onclick = () => dialog.close();
  document.addEventListener('visibilitychange', onVisibility);
  dialog.showModal();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const read = () => {
    if (closed) return;
    if (video.readyState >= 2 && video.videoWidth) {
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.round(video.videoHeight * canvas.width / video.videoWidth);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' });
      if (result) {
        const code = roomCodeFromQr(result.data, origin);
        if (code) { dialog.close(); onRead(code); return; }
        status.textContent = 'Mã này không phải mã phòng Ma Sói. Hãy quét mã của quản trò.';
      }
    }
    timer = setTimeout(read, 200);
  };
  const start = async () => {
    retry.hidden = true;
    if (!window.isSecureContext) {
      status.textContent = 'Camera cần địa chỉ HTTPS. Địa chỉ HTTP qua Wi-Fi nội bộ không thể hỏi quyền camera trên iPhone. Hãy mở bản HTTPS hoặc nhập mã phòng.';
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = 'Cửa sổ này không hỗ trợ camera. Hãy mở trực tiếp bằng Safari hoặc Chrome qua HTTPS, hoặc nhập mã phòng.';
      return;
    }
    status.textContent = 'Đang yêu cầu camera…';
    let stage: 'camera' | 'video' | 'decode' = 'camera';
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 } }, audio: false });
      if (closed) { stream.getTracks().forEach(track => track.stop()); return; }
      video.srcObject = stream;
      stage = 'video';
      await video.play();
      if (closed) return;
      status.textContent = 'Hướng camera vào mã QR của quản trò.';
      stage = 'decode';
      read();
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      if (closed) return;
      const name = error instanceof Error ? error.name : 'UnknownError';
      if (stage === 'video') {
        status.textContent = 'Đã truy cập camera nhưng chưa phát được hình. Bấm thử lại để mở hình camera.';
      } else if (stage === 'decode') {
        status.textContent = 'Không đọc được hình QR. Hãy thử lại hoặc nhập mã phòng.';
      } else if (name === 'NotAllowedError' || name === 'SecurityError') {
        status.textContent = 'Quyền camera đang bị chặn. Kiểm tra quyền camera của trang và Safari/Chrome trong Cài đặt iPhone, rồi bấm thử lại. Nếu đã từ chối, iPhone có thể không hỏi lại.';
      } else if (name === 'NotFoundError') {
        status.textContent = 'Không tìm thấy camera trên thiết bị. Bạn có thể nhập mã phòng.';
      } else if (name === 'NotReadableError' || name === 'AbortError') {
        status.textContent = 'Camera đang bận hoặc chưa khởi động được. Đóng ứng dụng đang dùng camera rồi thử lại.';
      } else {
        status.textContent = `Không mở được camera (${name}). Hãy thử lại hoặc nhập mã phòng.`;
      }
      retry.hidden = false;
    }
  };
  retry.onclick = () => { void start(); };
  void start();
}
