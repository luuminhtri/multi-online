import { DEFAULT_ONLINE_ORIGIN, onlineOrigin } from './urls.ts';

export const isNativeApp = import.meta.env.NATIVE_APP;
export const publicOrigin = isNativeApp
  ? onlineOrigin(import.meta.env.VITE_ONLINE_ORIGIN || DEFAULT_ONLINE_ORIGIN) : location.origin;

// Native data must be hydrated before main.ts reads a session or a local table.
export const native = isNativeApp ? await (async () => {
  try { return await (await import('./native.ts')).initializeNative(); }
  catch {
    document.body.innerHTML = '<main style="padding:64px 24px;color:#eeeae2;background:#101516;font:17px -apple-system,sans-serif"><h1>Chưa mở được bản lưu</h1><p>Hãy đóng rồi mở lại ứng dụng để thử lại. Dữ liệu đã lưu được giữ nguyên.</p><button onclick="location.reload()">Thử lại</button></main>';
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide().catch(() => {});
    // Do not start an empty game over unreadable device data.
    throw new Error('Không đọc được bộ nhớ iPhone.');
  }
})() : null;
export const deviceStorage: Storage = native?.storage ?? localStorage;
export const flushDeviceStorage = () => native?.storage.flush() ?? Promise.resolve();
export async function copyText(text: string): Promise<void> {
  if (native) { await native.copy(text); return; }
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  } catch { /* Try the selection-based fallback when clipboard access is denied. */ }
  // Local HTTP addresses on the LAN may not expose navigator.clipboard.
  const previousFocus = document.activeElement;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;left:0;top:0;opacity:0;font-size:16px';
  document.body.append(field);
  try {
    field.focus(); field.select(); field.setSelectionRange(0, text.length);
    if (!document.execCommand('copy')) throw new Error('Không thể truy cập clipboard.');
  } finally {
    field.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  }
}

if (native && !location.search) {
  const route = deviceStorage.getItem('ma-soi:resume-route:v1');
  if (route && /^\/\?(?:room|local)=(?:\d{6}|[A-Z2-9]{4,8})$/.test(route)) history.replaceState(null, '', route);
}
