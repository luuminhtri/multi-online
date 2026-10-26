import type { Mutation, Snapshot } from '../server/types.ts';
import './style.css';

type Identity = { token: string; name: string; id: string };
type State = { code: string; active: number; identities: Identity[] };
type Request = (body?: Mutation, capability?: string, room?: string) => Promise<Snapshot>;
const key = 'ma-soi:test:v1';
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Chỉ được import động trong dev --mode debug; không thuộc bundle sản phẩm.
export function createDebugPlayers() {
  let ownerRoom: { code: string; token: string } | null = null;
  window.addEventListener('pagehide', () => {
    if (ownerRoom) void fetch(`/api/room?code=${encodeURIComponent(ownerRoom.code)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ownerRoom.token}` }, keepalive: true }).catch(() => {});
  });
  // Background tabs keep their host lease; abrupt browser exits expire after 90s.
  setInterval(() => {
    if (ownerRoom && document.hidden) void fetch(`/api/room?code=${encodeURIComponent(ownerRoom.code)}`, { headers: { Authorization: `Bearer ${ownerRoom.token}` } }).catch(() => {});
  }, 10000);
  let state: State | null = null;
  try { state = JSON.parse(sessionStorage.getItem(key) ?? 'null'); } catch { /* storage unavailable */ }
  const persist = () => {
    try { state ? sessionStorage.setItem(key, JSON.stringify(state)) : sessionStorage.removeItem(key); } catch { /* storage unavailable */ }
  };
  return {
    forget() { ownerRoom = null; },
    watch(s: Snapshot, token?: string) { ownerRoom = s.room.debug && (s.viewer === 'moderator' || s.controller === 'moderator') && token ? { code: s.room.code, token } : null; },
    owns: (code: string) => state?.code === code,
    capability: (code: string) => state?.code === code ? state.identities[state.active]?.token : undefined,
    joining: () => !!document.querySelector<HTMLInputElement>('#join-test')?.checked,
    joinOption: () => '<label class="check"><input id="join-test" type="checkbox"><span>Chế độ thử 1 tab<small>Một tab điều khiển nhiều người chơi A–H.</small></span></label>',
    header(storage: string, code: string, disabled: boolean) {
      const button = (action: string, label: string, extra = '') => `<button type="button" data-action="${action}" ${disabled ? 'disabled' : ''} ${extra}>${label}</button>`;
      const bar = state?.code === code ? `<div class="test-bar"><span>THỬ 1 TAB</span>${state.identities.map((p, i) => button('test-switch', esc(p.name), `data-index="${i}" class="${i === state!.active ? 'active' : ''}"`)).join('')}${state.identities.length < 8 ? button('test-add', '＋', 'aria-label="Vào thêm người thử"') : ''}${button('test-exit', 'Thoát', 'class="quiet"')}</div>` : '';
      return `<div class="storage">DEBUG · ${esc(storage.toUpperCase())} · <a href="/debug/sandbox.html">Bàn thử luật</a></div>${bar}`;
    },
    async join(code: string, name: string, request: Request, random: () => string) {
      const token = random();
      const s = await request({ type: 'join', code, requestId: random(), name }, token);
      state = { code, active: 0, identities: [{ token, name: s.me.name, id: s.me.id }] };
      persist();
      return s;
    },
    async handle(action: string, el: HTMLElement, ctx: { request: Request; random: () => string; refresh: () => Promise<void>; accepted: (s: Snapshot) => void }) {
      if (action === 'test-switch') {
        const index = Number(el.dataset.index);
        if (state?.identities[index]) { state.active = index; persist(); await ctx.refresh(); }
        return true;
      }
      if (action === 'test-add') {
        if (state && state.identities.length < 8) {
          const token = ctx.random();
          const s = await ctx.request({ type: 'join', code: state.code, requestId: ctx.random(), name: String.fromCharCode(65 + state.identities.length) }, token);
          state.identities.push({ token, name: s.me.name, id: s.me.id });
          state.active = state.identities.length - 1;
          persist(); ctx.accepted(s);
        }
        return true;
      }
      if (action === 'test-exit') { state = null; persist(); location.href = '/'; return true; }
      return false;
    },
  };
}
