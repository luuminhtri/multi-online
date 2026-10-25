import type { Snapshot, Mutation } from '../server/types.ts';
import type { Action, Command, GameEvent, Role } from '../engine/types.ts';
import { MODERATOR_SCRIPTS } from '../engine/rules.ts';
import './style.css';

type Session = { token: string };
type Pending = { token: string; operation: Mutation };
const app = document.querySelector<HTMLDivElement>('#app')!;
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const random = () => [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join('');
function load<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } }
let sessions = load<Record<string, Session>>('ma-soi:sessions:v1', {});
let pending = load<Pending | null>('ma-soi:pending:v1', null);
let code = new URL(location.href).searchParams.get('room')?.toUpperCase() ?? '';
let snapshot: Snapshot | null = null;
let catalog: Snapshot['catalog'] = [];
let storage = 'local';
let status = 'Đang kết nối…', notice = '', busy = false, fetching = false;
let poll: ReturnType<typeof setTimeout> | undefined;
let deck: Record<string, number> = {};
let failed = false;
const formMemory = new Map<string, string | boolean>();
function persist() { localStorage.setItem('ma-soi:sessions:v1', JSON.stringify(sessions)); if (pending) localStorage.setItem('ma-soi:pending:v1', JSON.stringify(pending)); else localStorage.removeItem('ma-soi:pending:v1'); }
const name = (id: unknown) => snapshot?.room.members.find(m => m.id === id)?.name ?? String(id ?? 'không ai');
const roleName = (id: unknown) => catalog.find(r => r.id === id)?.name ?? String(id);
const button = (action: string, text: string, disabled = false, extra = '') => `<button type="button" data-action="${action}" ${disabled || busy || !!pending ? 'disabled' : ''} ${extra}>${text}</button>`;
function options(ids: string[], empty?: string) { return (empty !== undefined ? `<option value="">${esc(empty)}</option>` : '') + ids.map(id => `<option value="${esc(id)}">${esc(name(id))}</option>`).join(''); }
function describeAction(a: Action): string {
  switch (a.type) {
    case 'bite': return `Cắn ${name(a.target)}`;
    case 'maul': return `Cắn ${a.targets.map(name).join(' và ')}`;
    case 'protect': return `Bảo vệ ${name(a.target)}`;
    case 'inspect': return `Soi ${name(a.target)}`;
    case 'shoot': return `Bắn ${name(a.target)}`;
    case 'mimic': return `Nhân bản ${name(a.target)}`;
    case 'bond': return `Liên kết với ${name(a.target)}`;
    case 'pair': return `Kết duyên ${a.targets.map(name).join(' và ')}`;
    case 'compare': return `So sánh ${a.targets.map(name).join(' và ')}`;
    case 'sacrifice': return `Đồng ý hy sinh ${name(a.target)}`;
    case 'convert': return a.target ? `Chuyển hóa ${name(a.target)}` : 'Không chuyển hóa';
    case 'fast': return 'Không cắn theo luật Sói ăn chay';
    case 'potion': return [a.heal ? `Cứu ${a.healTarget ? name(a.healTarget) : 'nạn nhân'}` : '', a.poison ? `Độc ${name(a.poison)}` : ''].filter(Boolean).join(' · ') || 'Không dùng thuốc';
  }
}
function eventText(e: GameEvent): string {
  const d = e.data;
  switch (e.type) {
    case 'morning': case 'deaths': return (d.dead as string[]).length ? `Đã chết: ${(d.dead as string[]).map(name).join(', ')}.` : 'Đêm qua không ai chết.';
    case 'verdict': return d.target ? `Phán quyết: loại ${name(d.target)}.` : 'Không loại ai hôm nay.';
    case 'game-ended': return `Kết thúc: ${winnerText(String(d.winner))}.`;
    case 'prince-revealed': return `${name(d.player)} là Hoàng tử và không bị treo cổ.`;
    case 'inspection': return `Kết quả soi ${name(d.target)}: ${d.isWolf ? 'Sói' : 'không phải Sói'}.`;
    case 'aura-inspection': return `${name(d.target)} ${d.hasAbility ? 'có' : 'không có'} năng lực đặc biệt.`;
    case 'mystic-inspection': return `${name(d.target)}: ${roleName(d.role)}.`;
    case 'alignment-comparison': return `${(d.targets as string[]).map(name).join(' và ')} ${d.sameTeam ? 'cùng' : 'khác'} phe.`;
    case 'lovers': return `Người yêu của bạn: ${name(d.partner)}.`;
    case 'role-inherited': return `Bạn nhận vai ${roleName(d.newRole)}.`;
    case 'transformed-to-wolf': return 'Bạn đã chuyển thành Ma Sói.';
    case 'feared-by': return `${name(d.actor)} đã chọn bạn; bạn sẽ chết theo nếu người đó chết.`;
    case 'death-bond': return `Liên kết: ${name(d.target)}.`;
    case 'mimic-target': return `Bạn chọn nhân bản ${name(d.target)}.`;
    case 'action-confirmed': return `${name(d.actor)}: ${describeAction(d.action as Action)}.`;
    case 'death': return `${name(d.player)} chết (${(d.causes as string[]).map(c => ({ bite: 'cắn', poison: 'độc', shot: 'bắn', heartbreak: 'tình nhân', explosion: 'nổ', verdict: 'phán quyết', companion: 'bạn đồng hành', fear: 'Virginia', sacrifice: 'hy sinh', 'delayed-bite': 'vết cắn cũ' })[c] ?? c).join(', ')}).`;
    case 'bite-blocked': return `${name(d.target)} được chặn đòn cắn.`;
    case 'pack-bite-blocked': return `Đòn cắn không giết Sói chưa được bầy biết: ${name(d.target)}.`;
    case 'alpha-converted': return `${name(d.actor)} chuyển hóa ${name(d.target)}.`;
    case 'cursed-transformed': return `${name(d.target)} hóa Sói.`;
    case 'wolves-infected': return `Bầy bị bệnh đêm ${d.blockedNight}.`;
    case 'bite-delayed': return `${name(d.target)} mang vết cắn đến đêm ${d.deathNight}.`;
    case 'cub-sacrifice-approved': return `Bầy thống nhất hy sinh ${name(d.actor)}.`;
    case 'death-bond-chosen': return `${name(d.actor)} liên kết với ${name(d.target)}.`;
    case 'bomb-exploded': return `${name(d.actor)} phát nổ.`;
    case 'doppelganger-inherited': return `${name(d.actor)} nhận vai ${roleName(d.newRole)}.`;
    case 'apprentice-promoted': return `${name(d.actor)} trở thành Tiên tri.`;
    default: return 'Diễn biến đã được ghi nhận.';
  }
}
const winnerText = (w: string) => ({ village: 'Phe Dân thắng', wolves: 'Phe Sói thắng', lovers: 'Tình nhân thắng', draw: 'Hòa' })[w] ?? w;
function preset() {
  const n = snapshot?.room.members.length ?? 0; deck = {};
  if (n < 3) return;
  deck.wolf = Math.max(1, Math.floor(n / 4));
  if (n >= 4) deck.seer = 1;
  if (n >= 5) deck.guard = 1;
  if (n >= 6) deck.witch = 1;
  if (n >= 7) deck.hunter = 1;
  deck.villager = n - Object.values(deck).reduce((a, b) => a + b, 0);
}
function lobby(s: Snapshot) {
  const owner = s.viewer === 'moderator';
  return `<section><h2>Chỗ ngồi <span class="count">${s.room.members.length}/30</span></h2><p class="muted">Thứ tự này là vòng ghế trong ván.</p><ol class="members">${s.room.members.map((m, i) => `<li><span class="seat">${m.seat}</span><strong>${esc(m.name)}</strong>${m.id === s.me.id ? '<small>Bạn</small>' : ''}${owner ? `<div class="reorder">${button('up', '↑', i === 0, `data-id="${m.id}" aria-label="Đưa ${esc(m.name)} lên"`)}${button('down', '↓', i === s.room.members.length - 1, `data-id="${m.id}" aria-label="Đưa ${esc(m.name)} xuống"`)}</div>` : ''}</li>`).join('') || '<li>Chia sẻ mã để mọi người vào phòng.</li>'}</ol></section>
    <section>${owner ? `<h2>Chuẩn bị bài</h2><p class="muted">Chỉ những vai đã có luật và kiểm thử mới được chọn.</p>${button('preset', 'Dùng bộ vai gợi ý')}<details><summary>Chọn vai chi tiết</summary><div class="deck">${catalog.map(r => `<label>${esc(r.name)}<input data-role="${r.id}" type="number" min="0" max="30" value="${deck[r.id] ?? 0}" inputmode="numeric"></label>`).join('')}</div></details><p id="deck-total"></p>${button('start', 'Chia vai và bắt đầu', s.room.members.length < 3)}` : '<h2>Chờ quản trò chia vai</h2><p>Tên và ghế của bạn đã được lưu. Bạn có thể tải lại trang trên thiết bị này để trở về đúng chỗ.</p>'}</section>`;
}
function player(s: Extract<Snapshot, { viewer: 'player' }>) {
  const g = s.game!; const t = g.turn;
  let controls = '<p class="muted">Chưa đến lượt của bạn. Hãy làm theo lời quản trò.</p>';
  if (t) {
    if (!t.awake) controls = button('wake', 'Tôi đã thức dậy');
    else if (t.submitted && t.ability !== 'wolves') controls = `<div class="positive">Đã chốt: ${esc(describeAction(t.action!))}</div>`;
    else {
      let form = `<label>Mục tiêu<select id="target">${options(t.targets)}</select></label>`;
      if (t.ability === 'wolves') {
        const plan = t.wolfPlan!;
        form = plan.maxTargets === 0 ? '<p>Bạn là Sói ăn chay cuối cùng. Xác nhận không cắn đêm nay.</p>' : `<p>Chọn ${plan.minTargets === plan.maxTargets ? plan.minTargets : `${plan.minTargets}–${plan.maxTargets}`} nạn nhân.${plan.adjacentPair ? ' Nếu chọn hai, họ phải ngồi cạnh nhau.' : ''}</p>${form}${plan.maxTargets > 1 ? `<label>Mục tiêu thứ hai<select id="target2">${options(t.targets, plan.minTargets > 1 ? 'Cần chọn người thứ hai' : 'Chỉ chọn một người')}</select></label>` : ''}${plan.canOfferSacrifice || plan.sacrificeTarget ? `<label class="check"><input id="sacrifice" type="checkbox">${plan.canOfferSacrifice ? 'Tự đề nghị hy sinh' : `Đồng ý hy sinh ${esc(name(plan.sacrificeTarget))}`}</label>` : ''}`;
      } else if (t.ability === 'witch') form = `<p>Còn ${g.self.resources.heal} cứu, ${g.self.resources.poison} độc.</p><p>Mục tiêu cắn: ${g.self.resources.heal ? g.biteTargets.map(name).map(esc).join(', ') || 'không ai' : 'không xem được khi hết cứu'}.</p><label class="check"><input id="heal" type="checkbox" ${!g.self.resources.heal || !g.biteTargets.length ? 'disabled' : ''}> Dùng thuốc cứu</label>${g.biteTargets.length > 1 ? `<label>Người được cứu<select id="healTarget">${options(g.biteTargets)}</select></label>` : ''}<label>Thuốc độc<select id="poison" ${!g.self.resources.poison ? 'disabled' : ''}>${options(t.targets, 'Không dùng độc')}</select></label>`;
      else if (t.ability === 'cupid' || t.ability === 'mentalist') form = `<label>Người thứ nhất<select id="first">${options(t.targets)}</select></label><label>Người thứ hai<select id="second">${options(t.targets)}</select></label>`;
      else if (t.ability === 'alpha_wolf') form = `<label>Quyết định chuyển hóa<select id="convert">${options(t.targets, 'Không dùng quyền')}</select></label>`;
      controls = `${t.submitted ? `<p class="positive">Đã chọn: ${esc(describeAction(t.action!))}. Có thể sửa đến khi quản trò chốt.</p>` : ''}${form}${button('submit', 'Xác nhận hành động')}`;
    }
  }
  return `<section class="role-card"><span class="eyebrow">VAI RIÊNG CỦA BẠN</span><h2>${esc(roleName(g.self.role))}</h2><p>${esc(g.self.description)}</p><p class="muted">${g.players.find(p => p.id === s.me.id)?.alive ? 'Còn sống' : 'Đã bị loại'}</p>${g.lover ? `<p>Người yêu: <strong>${esc(g.lover.partnerName)}</strong></p>` : ''}${controls}</section><section><h2>Thông tin riêng</h2>${g.pack ? `<h3>Lựa chọn của bầy</h3><ul>${g.pack.map(p => `<li>${esc(name(p.id))}: ${p.choice ? esc(describeAction(p.choice)) : 'chưa chọn'}</li>`).join('')}</ul>` : ''}${g.messages.slice(-8).map(e => `<p class="private-message">${esc(eventText(e))}</p>`).join('') || '<p class="muted">Chưa có thông báo riêng.</p>'}</section>`;
}
function moderator(s: Extract<Snapshot, { viewer: 'moderator' }>) {
  const g = s.game!; let controls = '';
  if (g.step === 'review') controls = g.resolved ? `<p>Kết quả đang chờ: ${g.pendingDeaths.map(name).map(esc).join(', ') || 'không ai chết'}.</p>${button('publish', 'Công bố sáng')}` : button('resolve', 'Xử lý diễn biến đêm');
  else if (g.step === 'day') controls = g.verdictDone ? button('nextNight', 'Bắt đầu đêm tiếp') : `<label>Phán quyết<select id="verdict">${options(g.players.filter(p => p.alive).map(p => p.id), 'Không loại ai')}</select></label>${button('verdict', 'Chốt phán quyết')}`;
  else if (g.step === 'ended') controls = `<div class="positive">${esc(winnerText(g.winner!))}</div>`;
  else controls = `<ul>${g.progress.map(p => `<li>${esc(name(p.id))}: ${p.submitted ? 'đã gửi' : p.awake ? 'đang chọn' : 'chưa thức dậy'}</li>`).join('') || '<li>Không có người cần hành động.</li>'}</ul>${button('advance', 'Chốt lượt, sang bước tiếp', !g.progress.every(p => p.submitted))}`;
  return `<section><span class="eyebrow">ĐIỀU PHỐI</span><h2>Đêm ${g.night} · ${esc(g.step === 'review' ? 'Tổng kết' : g.step === 'day' ? 'Ban ngày' : g.step === 'wolves' ? 'Bầy Sói' : g.step === 'ended' ? 'Kết thúc' : roleName(g.step))}</h2><blockquote>${esc(MODERATOR_SCRIPTS[g.step].wake)}</blockquote>${controls}</section><section><h2>Toàn cảnh · chỉ quản trò</h2><ul>${g.players.map(p => `<li>${esc(p.name)} · ${esc(roleName(p.role))} · ${p.alive ? 'sống' : 'chết'}${!p.alive && !g.publicDead.includes(p.id) ? ' (chưa công bố)' : ''}</li>`).join('')}</ul><details><summary>Nhật ký riêng</summary>${g.events.slice(-15).map(e => `<p>${esc(eventText(e))}</p>`).join('')}</details></section>`;
}
function publicPanel(s: Snapshot) {
  if (!s.game) return '';
  const g = s.game; const players = s.viewer === 'moderator' ? g.players.map(p => ({ ...p, alive: !(s.game as Extract<Snapshot, { viewer: 'moderator' }>['game'])!.publicDead.includes(p.id) })) : g.players;
  const announcements = s.viewer === 'moderator' ? (s.game as NonNullable<Extract<Snapshot, { viewer: 'moderator' }>['game']>).events.filter(e => e.audience === 'public') : (s.game as NonNullable<Extract<Snapshot, { viewer: 'player' }>['game']>).announcements;
  return `<section class="public"><h2>Cả làng</h2><div class="public-people">${players.map(p => `<div class="${p.alive ? '' : 'dead'}"><strong>${esc(p.name)}</strong><small>${p.alive ? 'Còn sống' : 'Đã bị loại'}</small></div>`).join('')}</div>${announcements.slice(-5).map(e => `<p>${esc(eventText(e))}</p>`).join('')}</section>`;
}
function render() {
  const phaseKey = snapshot?.game && 'stepId' in snapshot.game ? snapshot.game.stepId : snapshot?.viewer === 'player' ? snapshot.game?.turn?.stepId ?? 'wait' : 'lobby';
  const previousKey = app.dataset.phase;
  for (const el of app.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[id],select[id]')) formMemory.set(`${previousKey}:${el.id}`, el.type === 'checkbox' ? (el as HTMLInputElement).checked : el.value);
  app.dataset.phase = phaseKey;
  app.innerHTML = `<header><a class="brand" href="/">☾ <span>MA SÓI<small>Cùng bàn, cùng câu chuyện.</small></span></a><div class="connection ${failed ? 'offline' : ''}">${esc(status)}</div></header><div class="storage">${storage === 'local' ? 'Bản local · dữ liệu lưu trên máy chủ đang chạy, chưa nối Supabase' : 'Đã cấu hình lưu Supabase'}</div>${notice ? `<div class="notice" role="status">${esc(notice)}</div>` : ''}${pending ? `<div class="notice">Thao tác đang chờ xác nhận. Có thể gửi lại an toàn với cùng mã yêu cầu.<button type="button" data-action="retry" ${busy ? 'disabled' : ''}>Thử gửi lại</button></div>` : ''}
    ${snapshot ? `<div class="room-heading"><div><span class="eyebrow">${snapshot.viewer === 'moderator' ? 'QUẢN TRÒ' : esc(snapshot.me.name)}</span><h1>Phòng <span id="room-code">${snapshot.room.code}</span></h1></div><div>${button('copy', 'Sao chép link')}${button('refresh', 'Đồng bộ lại')}</div></div><main class="grid">${!snapshot.game ? lobby(snapshot) : snapshot.viewer === 'moderator' ? moderator(snapshot) : player(snapshot)}</main>${publicPanel(snapshot)}` : `<main class="welcome"><div class="intro"><span class="eyebrow">MỖI NGƯỜI MỘT BÍ MẬT</span><h1>Cả làng<br>đã sẵn sàng?</h1><p>Tạo một phòng, ngồi đúng chỗ và để câu chuyện bắt đầu.</p></div><div class="entry"><section><h2>Tạo phòng</h2><label>Tên quản trò<input id="create-name" maxlength="40" autocomplete="nickname" placeholder="Tên của bạn"></label>${button('create', 'Tạo phòng mới')}</section><section><h2>Vào phòng</h2><label>Mã phòng<input id="join-code" maxlength="6" value="${esc(code)}" placeholder="6 ký tự" autocapitalize="characters" autocomplete="off"></label><label>Tên người chơi<input id="join-name" maxlength="40" autocomplete="nickname" placeholder="Tên mọi người sẽ gọi"></label>${button('join', 'Vào phòng')}</section></div></main>`}<footer>Mỗi thiết bị giữ phiên riêng. Link chia sẻ chỉ chứa mã phòng. <a href="/sandbox.html">Bàn thử luật</a></footer>`;
  for (const el of app.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[id],select[id]')) {
    const value = formMemory.get(`${phaseKey}:${el.id}`); if (value === undefined) continue;
    if (el.type === 'checkbox') (el as HTMLInputElement).checked = Boolean(value); else if (el.tagName !== 'SELECT' || [...(el as HTMLSelectElement).options].some(o => o.value === value)) el.value = String(value);
  }
  updateDeck();
}
function updateDeck() {
  const total = document.querySelector('#deck-total'); if (!total) return;
  const count = Object.values(deck).reduce((a, b) => a + b, 0), n = snapshot!.room.members.length;
  total.textContent = `${count} lá / ${n} người (quản trò không nhận vai)`;
  const start = document.querySelector<HTMLButtonElement>('[data-action="start"]'); if (start) start.disabled = busy || !!pending || n < 3 || count !== n;
}
async function request(body?: Mutation, capability?: string, room?: string) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`/api/room${body ? '' : room ? `?code=${encodeURIComponent(room)}` : '?config=1'}`, {
      method: body ? 'POST' : 'GET', headers: { ...(capability ? { Authorization: `Bearer ${capability}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: controller.signal, cache: 'no-store',
    });
    const data = await response.json(); if (!response.ok) { const error = new Error(data.error?.message ?? 'Không thực hiện được thao tác.') as Error & { status: number }; error.status = response.status; throw error; }
    return data;
  } finally { clearTimeout(timeout); }
}
function accepted(s: Snapshot) {
  const changed = snapshot?.viewVersion !== s.viewVersion;
  snapshot = s; code = s.room.code; catalog = s.catalog; storage = s.storage;
  history.replaceState(null, '', `/?room=${code}`); status = 'Đã đồng bộ'; failed = false;
  if (s.viewer === 'moderator' && !s.game && !Object.keys(deck).length) preset();
  if (changed) render(); else { const label = document.querySelector('.connection'); if (label) { label.textContent = status; label.className = 'connection'; } }
}
async function refresh() {
  if (!code || !sessions[code] || fetching || busy) return;
  fetching = true;
  try { accepted(await request(undefined, sessions[code].token, code)); }
  catch (e) { status = 'Chưa kết nối · sẽ thử lại'; failed = true; const label = document.querySelector('.connection'); if (label) { label.textContent = status; label.className = 'connection offline'; } }
  finally { fetching = false; schedule(); }
}
function schedule() { clearTimeout(poll); poll = setTimeout(() => { if (!document.hidden) void refresh(); else schedule(); }, failed ? 5000 : 1500); }
async function sendPending() {
  if (!pending || busy) return;
  busy = true; render();
  try {
    const s: Snapshot = await request(pending.operation, pending.token);
    sessions[s.room.code] = { token: pending.token }; pending = null; persist();
    accepted(s); notice = ''; failed = false;
  } catch (e) {
    const statusCode = (e as Error & { status?: number }).status;
    if (statusCode && statusCode < 500) { pending = null; persist(); }
    notice = statusCode ? (e as Error).message : 'Chưa nhận được xác nhận từ máy chủ. Giữ thao tác và thử gửi lại.';
    failed = !statusCode || statusCode >= 500;
  } finally { busy = false; render(); schedule(); if (!pending) void refresh(); }
}
async function mutate(operation: Mutation, capability = sessions[code]?.token) {
  if (busy || pending) return;
  if (!capability) { notice = 'Thiết bị này chưa có phiên của phòng.'; render(); return; }
  pending = { operation, token: capability };
  try { persist(); } catch { pending = null; notice = 'Không lưu được phiên trên trình duyệt. Hãy cho phép lưu dữ liệu trang này rồi thử lại.'; render(); return; }
  await sendPending();
}
const value = (id: string) => document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!.value;
function ownAction(): Action {
  if (snapshot?.viewer !== 'player' || !snapshot.game?.turn) throw new Error('Chưa đến lượt của bạn.');
  const g = snapshot.game, t = g.turn!;
  if (t.ability === 'wolves') {
    if (!t.wolfPlan!.maxTargets) return { type: 'fast' };
    if (document.querySelector<HTMLInputElement>('#sacrifice')?.checked) return { type: 'sacrifice', target: t.wolfPlan!.canOfferSacrifice ? g.self.id : t.wolfPlan!.sacrificeTarget! };
    return document.querySelector('#target2') && value('target2') ? { type: 'maul', targets: [value('target'), value('target2')] } : { type: 'bite', target: value('target') };
  }
  if (t.ability === 'witch') { const heal = document.querySelector<HTMLInputElement>('#heal')!.checked;
    return { type: 'potion', heal, ...(heal && document.querySelector('#healTarget') ? { healTarget: value('healTarget') } : {}), poison: value('poison') || null }; }
  if (t.ability === 'cupid' || t.ability === 'mentalist') return { type: t.ability === 'cupid' ? 'pair' : 'compare', targets: [value('first'), value('second')] };
  if (t.ability === 'alpha_wolf') return { type: 'convert', target: value('convert') || null };
  return { type: t.ability === 'guard' ? 'protect' : t.ability === 'hunter' ? 'shoot' : t.ability === 'doppelganger' ? 'mimic' : t.ability === 'dire_wolf' || t.ability === 'virginia_woolf' ? 'bond' : 'inspect', target: value('target') };
}
app.addEventListener('input', e => { const input = e.target as HTMLInputElement; if (input.dataset.role) { deck[input.dataset.role] = Math.max(0, Math.min(30, Math.trunc(Number(input.value) || 0))); updateDeck(); } });
app.addEventListener('click', async e => {
  const el = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]'); if (!el || el.disabled) return;
  const action = el.dataset.action!;
  try {
    if (action === 'retry') { await sendPending(); return; }
    if (action === 'refresh') { await refresh(); return; }
    if (action === 'copy') { await navigator.clipboard.writeText(`${location.origin}/?room=${code}`); notice = 'Đã sao chép link vào phòng.'; render(); return; }
    if (action === 'preset') { preset(); render(); return; }
    if (action === 'create') { await mutate({ type: 'create', requestId: random(), name: value('create-name') }, random()); return; }
    if (action === 'join') {
      const entered = value('join-code').trim().toUpperCase();
      await mutate({ type: 'join', code: entered, requestId: random(), name: value('join-name') }, sessions[entered]?.token ?? random()); return;
    }
    if (!snapshot) return;
    if (action === 'up' || action === 'down') {
      const ids = snapshot.room.members.map(m => m.id), i = ids.indexOf(el.dataset.id!); const j = i + (action === 'up' ? -1 : 1);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      await mutate({ type: 'reorder', code, requestId: random(), expectedRevision: snapshot.room.revision!, playerIds: ids }); return;
    }
    if (action === 'start') { await mutate({ type: 'start', code, requestId: random(), expectedRevision: snapshot.room.revision!, roles: catalog.flatMap(r => Array.from({ length: deck[r.id] ?? 0 }, () => r.id)) }); return; }
    const step = snapshot.viewer === 'moderator' ? snapshot.game?.stepId : snapshot.game?.turn?.stepId;
    if (!step) return;
    const command: Command = action === 'submit' ? { type: 'act', action: ownAction() } : action === 'verdict' ? { type: 'verdict', target: value('verdict') || null } : { type: action as 'wake' | 'advance' | 'resolve' | 'publish' | 'nextNight' };
    await mutate({ type: 'command', code, requestId: random(), stepId: step, command });
  } catch (e) { notice = action === 'copy' ? `Link vào phòng: ${location.origin}/?room=${code}` : (e as Error).message; render(); }
});
window.addEventListener('online', () => { if (pending) void sendPending(); else void refresh(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (pending) void sendPending(); else void refresh(); } });
render();
(async () => {
  try { const config = await request(); storage = config.storage; catalog = config.catalog; status = 'Máy chủ sẵn sàng'; render();
    if (pending) await sendPending(); else if (code && sessions[code]) await refresh();
  } catch (e) { failed = true; status = 'Chưa kết nối'; notice = (e as Error).message || 'Chưa kết nối được máy chủ.'; render(); }
})();
