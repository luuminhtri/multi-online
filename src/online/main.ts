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
let editingWolfStep: string | null = null;
let chatDraftCleared = false;
const formMemory = new Map<string, string | boolean>();
function persist() { localStorage.setItem('ma-soi:sessions:v1', JSON.stringify(sessions)); if (pending) localStorage.setItem('ma-soi:pending:v1', JSON.stringify(pending)); else localStorage.removeItem('ma-soi:pending:v1'); }
const name = (id: unknown) => snapshot?.room.members.find(m => m.id === id)?.name ?? String(id ?? 'không ai');
const roleName = (id: unknown) => catalog.find(r => r.id === id)?.name ?? String(id);
const roleById = (id: unknown) => catalog.find(r => r.id === id);
const initial = (v: string) => [...v.trim()][0]?.toLocaleUpperCase('vi') ?? '?';
const cardImage = (roleId: string, fallbackText: string) => {
  const image = roleById(roleId)?.image;
  if (!image) return `<span class="img-fallback" aria-hidden="true">${esc(initial(fallbackText))}</span>`;
  return `<img class="card-img" loading="lazy" src="${esc(image)}" alt="" data-fallback="${esc(initial(fallbackText))}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'img-fallback',textContent:this.dataset.fallback}))">`;
};
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
    case 'fast': return 'Không cắn';
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
    case 'inspection': return `Soi ${name(d.target)}: ${d.isWolf ? 'Sói' : 'không phải Sói'}.`;
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
const moon = '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M43 8a24 24 0 1 0 13 37A26 26 0 0 1 43 8Z" fill="currentColor"/><path d="m49 15 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="currentColor"/></svg>';
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
// Bàn tròn: sáng là sống, mờ là đã chết. Thứ tự người chơi là vòng ghế cố định.
function roundTable(players: { id: string; name: string; alive: boolean }[], opts: { draggable?: boolean; hub?: string } = {}) {
  const n = players.length;
  const seats = players.map((p, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const x = 50 + 39 * Math.cos(angle), y = 50 + 39 * Math.sin(angle);
    const drag = opts.draggable ? 'data-drag="1"' : '';
    return `<div class="seat${p.alive ? '' : ' dead'}" data-id="${esc(p.id)}" data-seat="${i + 1}" style="--x:${x.toFixed(2)}%;--y:${y.toFixed(2)}%" ${drag}><span class="avatar">${esc(initial(p.name))}</span><span class="sname">${esc(p.name)}</span></div>`;
  }).join('');
  return `<div class="table${n > 12 ? ' dense' : ''}" data-table="${n}">${seats}<div class="hub">${opts.hub ?? `${n} người`}</div></div>`;
}
function catalogSection() {
  return `<details class="role-catalog"><summary>Các vai trong trò chơi<span>${catalog.length}</span></summary><div class="catalog-grid">${catalog.map(r => `<figure><div class="card-frame">${cardImage(r.id, r.name)}<figcaption>${esc(r.name)}</figcaption></div><p>${esc(r.description)}</p></figure>`).join('')}</div></details>`;
}
const sessionStorageKey = (gameId: string) => `ma-soi:role-read:${gameId}`;
// Chat bầy: chỉ Sói đang thức ở bước bầy mới gửi; lịch sử hiện gọn trong mục gập.
function chatPanel(g: Extract<Snapshot, { viewer: 'player' }>['game']): string {
  if (!g) return '';
  const c = g.packChat;
  if (!c.open && !c.items.length) return '';
  const list = c.items.slice(-20).map(m => `<p class="chat-line ${m.mine ? 'mine' : ''}"><strong>${esc(m.mine ? 'Bạn' : m.from)}</strong><span>${esc(m.text)}</span></p>`).join('');
  const input = c.open
    ? `<div class="chat-input"><input id="chat-text" maxlength="200" placeholder="Nhắn bầy..." autocomplete="off">${button('chat-send', 'Gửi')}</div>`
    : '<p class="muted">Bước đêm đã khép — chat chỉ mở khi bầy thức.</p>';
  return `<details class="fold pack-chat" ${c.open ? 'open' : ''}><summary>Chat bầy Sói</summary><div class="chat-body">${list || '<p class="empty">Chưa có tin nhắn.</p>'}${input}</div></details>`;
}
// Overlay chỉ hiện lần đầu nhận vai; sau khi xác nhận, vai luôn ẩn sau nút xem.
function roleInfo(g: Extract<Snapshot, { viewer: 'player' }>['game']) {
  if (!g) return '';
  const self = g.self;
  return `<div class="card-hero">${cardImage(self.role, roleName(self.role))}</div><h3>${esc(roleName(self.role))}</h3><p class="team-chip">${self.team === 'wolves' ? 'Phe Sói' : self.team === 'lovers' ? 'Phe Tình nhân' : 'Phe Dân'}</p><p class="role-desc">${esc(self.description)}</p>`;
}
function roleRevealOverlay(g: Extract<Snapshot, { viewer: 'player' }>['game']) {
  if (!g || sessionStorage.getItem(sessionStorageKey(g.gameId))) return '';
  return `<div class="overlay" id="role-overlay"><div class="overlay-card">${roleInfo(g)}<p class="muted">Đọc xong thì giữ bí mật cho riêng mình.</p>${button('role-read', 'Tôi đã đọc và sẵn sàng', false, 'class="primary wide"')}</div></div>`;
}
function rolePeek(g: Extract<Snapshot, { viewer: 'player' }>['game']) {
  if (!g) return '';
  return `<details class="role-peek"><summary>${moon.replace('<svg', '<svg class="peek-moon"')} Vai của bạn — chạm để xem</summary><div class="role-peek-body">${roleInfo(g)}<p class="muted">Chạm lại đầu mục để ẩn khi có người lại gần.</p></div></details>`;
}
function lobby(s: Snapshot) {
  const owner = s.viewer === 'moderator';
  const table = roundTable(s.room.members.map((m, i) => ({ id: m.id, name: m.name, alive: true })), {
    draggable: owner,
    hub: owner ? 'Kéo người<br>để xếp chỗ' : 'Chờ cả làng',
  });
  const manual = owner ? `<details><summary>Xếp ghế bằng nút ↑ ↓</summary><ol class="members">${s.room.members.map((m, i) => `<li><span class="seat-no">${String(i + 1).padStart(2, '0')}</span><strong>${esc(m.name)}</strong>${m.id === s.me.id ? '<small>Bạn</small>' : ''}<div class="reorder">${button('up', '↑', i === 0, `data-id="${m.id}" aria-label="Đưa ${esc(m.name)} lên"`)}${button('down', '↓', i === s.room.members.length - 1, `data-id="${m.id}" aria-label="Đưa ${esc(m.name)} xuống"`)}</div></li>`).join('') || '<li class="empty">Bàn còn trống. Gửi mã phòng cho mọi người nhé.</li>'}</ol></details>` : '';
  if (!owner) {
    return `<section class="panel">${table}<p class="muted center">${s.room.members.length} người đã vào bàn · ngồi đúng thứ tự để các vai liên quan ghế hoạt động đúng.</p>${manual}</section>${catalogSection()}`;
  }
  return `<section class="panel">${table}${manual}</section>
    <section class="panel"><h2>Chia vai</h2>${button('preset', 'Bộ vai gợi ý', false, 'class="secondary wide"')}<details class="deck-picker"><summary>Điều chỉnh từng vai<span>＋</span></summary><div class="deck">${catalog.map(r => `<label>${esc(r.name)}<input data-role="${r.id}" type="number" min="0" max="30" value="${deck[r.id] ?? 0}" inputmode="numeric"></label>`).join('')}</div></details><div class="rule-setting"><label class="check"><input id="witch-sees-bite" type="checkbox" checked><span>Phù thủy thấy nạn nhân<small>Tắt: Phù thủy chỉ chọn dùng/giữ thuốc, máy chủ cứu không lộ tên. Người Bảo vệ chặn cắn luôn được giấu.</small></span></label></div><p id="deck-total" class="deck-total"></p>${button('start', 'Chia vai · Bắt đầu', s.room.members.length < 3, 'class="primary wide"')}</section>
    ${catalogSection()}`;
}
function hubLabel(step: string, night: number) { return step === 'ended' ? 'Kết thúc' : step === 'day' ? 'Ban ngày' : step === 'review' ? 'Chưa công bố' : `Đêm ${night}`; }
function player(s: Extract<Snapshot, { viewer: 'player' }>) {
  const g = s.game!, t = g.turn;
  const alive = g.players.find(p => p.id === s.me.id)?.alive;
  let controls = g.phase === 'night' && alive
    ? `<div class="rest-box">${moon}<p>Mời bạn đi ngủ.<br><small>Quản trò sẽ gọi vai của bạn.</small></p></div>`
    : `<div class="rest-box"><p>${g.phase === 'ended' ? esc(winnerText(g.winner!)) : alive ? 'Cả làng thức dậy.' : 'Bạn đã rời cuộc chơi.'}</p></div>`;
  if (t) {
    if (!t.awake) controls = `<div class="turn-box"><h3>Đến lượt bạn</h3><p>Quản trò đang gọi vai.</p>${button('wake', 'Tôi đã thức dậy', false, 'class="primary wide"')}</div>`;
    else if (t.sleepReady && editingWolfStep !== t.stepId) controls = `<div class="rest-box sent"><span class="receipt">ĐÃ GỬI</span><p>${esc(describeAction(t.action!))}</p><p class="muted">${t.ability === 'hunter' ? 'Chờ công bố kết quả.' : 'Mời bạn đi ngủ.'}</p>${t.ability === 'wolves' ? button('edit-wolf', 'Đổi lựa chọn', false, 'class="quiet"') : ''}</div>`;
    else {
      let form = `<label>Chọn một người<select id="target">${options(t.targets)}</select></label>`;
      if (t.ability === 'wolves') {
        const plan = t.wolfPlan!;
        form = plan.maxTargets === 0 ? '<p class="big-note">Đêm nay bầy không cắn.</p>' : `<p class="big-note">Chọn ${plan.minTargets === plan.maxTargets ? plan.minTargets : `${plan.minTargets}–${plan.maxTargets}`} nạn nhân.${plan.adjacentPair ? ' Hai nạn nhân phải ngồi cạnh nhau.' : ''}</p>${form}${plan.maxTargets > 1 ? `<label>Người thứ hai<select id="target2">${options(t.targets, plan.minTargets > 1 ? 'Chọn người thứ hai' : 'Chỉ chọn một người')}</select></label>` : ''}${plan.canOfferSacrifice || plan.sacrificeTarget ? `<label class="check"><input id="sacrifice" type="checkbox">${plan.canOfferSacrifice ? 'Tự đề nghị hy sinh' : `Đồng ý hy sinh ${esc(name(plan.sacrificeTarget))}`}</label>` : ''}`;
      } else if (t.ability === 'witch') {
        const info = g.witchInfo!;
        form = `<div class="potions"><span><strong>${g.self.resources.heal}</strong> cứu</span><span><strong>${g.self.resources.poison}</strong> độc</span></div><div class="bite-note">${info.visibility === 'hidden' ? '<strong>Nạn nhân được giữ kín.</strong><p>Bạn chỉ chọn dùng hoặc giữ thuốc. Dùng là tốn một bình, kể cả không có nạn nhân.</p>' : info.visibility === 'unavailable' ? 'Bạn đã hết thuốc cứu.' : g.biteTargets.length ? `<span class="eyebrow">NẠN NHÂN BỊ CẮN</span><strong>${g.biteTargets.map(name).map(esc).join(', ')}</strong>` : 'Không có nạn nhân được báo đêm nay.'}</div><label class="check"><input id="heal" type="checkbox" ${!info.canHeal ? 'disabled' : ''}><span>Dùng thuốc cứu</span></label>${g.biteTargets.length > 1 ? `<label>Cứu một người<select id="healTarget">${options(g.biteTargets)}</select></label>` : ''}<label>Dùng thuốc độc<select id="poison" ${!g.self.resources.poison ? 'disabled' : ''}>${options(t.targets, 'Giữ lại thuốc độc')}</select></label>`;
      } else if (t.ability === 'cupid' || t.ability === 'mentalist') form = `<label>Người thứ nhất<select id="first">${options(t.targets)}</select></label><label>Người thứ hai<select id="second">${options(t.targets)}</select></label>`;
      else if (t.ability === 'alpha_wolf') form = `<label>Chuyển hóa<select id="convert">${options(t.targets, 'Không dùng quyền')}</select></label>`;
      controls = `<div class="action-box">${t.submitted ? `<p class="pack-status">Đã gửi: ${esc(describeAction(t.action!))}${t.action?.type === 'sacrifice' ? ' · chờ quản trò xác nhận' : ' · chờ bầy thống nhất'}</p>` : ''}${form}${button('submit', t.submitted ? 'Cập nhật lựa chọn' : 'Xác nhận', false, 'class="primary wide"')}</div>`;
    }
  }
  const privatePanel = `<details class="fold"><summary>Chỉ mình bạn biết</summary>${g.pack ? `<h3>Lựa chọn của bầy</h3><ul class="pack-list">${g.pack.map(p => `<li><strong>${esc(name(p.id))}</strong><span>${p.choice ? esc(describeAction(p.choice)) : 'Chưa chọn'}</span></li>`).join('')}</ul>` : ''}${g.messages.slice(-8).map(e => `<p class="private-message">${esc(eventText(e))}</p>`).join('') || '<p class="empty">Chưa có lời nhắn riêng.</p>'}</details>`;
  return `${controls}${chatPanel(g)}${rolePeek(g)}<section class="panel"><h2>Bàn tròn</h2>${roundTable(g.players, { hub: g.phase === 'ended' ? 'Kết thúc' : g.phase === 'day' ? 'Ban ngày' : `Đêm ${g.night}` })}</section>${privatePanel}<details class="fold"><summary>Diễn biến cả làng</summary>${g.announcements.slice(-6).map(e => `<p class="public-line">${esc(eventText(e))}</p>`).join('') || '<p class="empty">Chưa có công bố.</p>'}</details>${catalogSection()}`;
}
function moderator(s: Extract<Snapshot, { viewer: 'moderator' }>) {
  const g = s.game!; let controls = '';
  const done = g.progress.filter(p => p.submitted).length;
  const latest = g.events.filter(e => e.type === 'action-confirmed' && e.night === g.night).slice(-6).reverse();
  const allDone = g.progress.length > 0 && done === g.progress.length;
  if (g.step === 'review') controls = g.resolved ? `<div class="review-result"><span class="eyebrow">CHƯA CÔNG BỐ</span><p class="big-note">${g.pendingDeaths.length ? `Người chết: ${g.pendingDeaths.map(name).map(esc).join(', ')}.` : 'Đêm nay không ai chết.'}</p></div>${button('publish', 'Gọi cả làng thức dậy', false, 'class="primary wide"')}` : button('resolve', 'Tổng kết diễn biến đêm', false, 'class="primary wide"');
  else if (g.step === 'day') controls = g.verdictDone ? button('nextNight', 'Bắt đầu đêm tiếp', false, 'class="primary wide"') : `<label>Phán quyết<select id="verdict">${options(g.players.filter(p => p.alive).map(p => p.id), 'Không loại ai')}</select></label>${button('verdict', 'Chốt phán quyết', false, 'class="primary wide"')}`;
  else if (g.step === 'ended') controls = `<div class="positive">${esc(winnerText(g.winner!))}</div>`;
  else controls = `<div class="progress-head"><span>${done}/${g.progress.length} đã gửi</span></div><ul class="progress-list">${g.progress.map(p => `<li class="${p.submitted ? 'complete' : ''}"><strong>${esc(name(p.id))}</strong><small>${p.submitted ? esc(describeAction(g.actions[p.id])) : p.awake ? 'Đang chọn' : 'Chờ thức'}</small></li>`).join('') || '<li class="empty">Không ai cần hành động — chốt để qua.</li>'}</ul>${allDone && g.step !== 'wolves' && MODERATOR_SCRIPTS[g.step].sleep ? `<p class="sleep-cue">“${esc(MODERATOR_SCRIPTS[g.step].sleep)}”</p>` : ''}${button('advance', 'Chốt lượt · Gọi vai tiếp', !g.progress.every(p => p.submitted), 'class="primary wide"')}`;
  return `<section class="panel"><span class="eyebrow">${g.step === 'ended' ? 'KẾT THÚC' : g.step === 'day' ? 'BAN NGÀY' : 'ĐÊM ' + g.night}</span><h2>${esc(g.step === 'review' ? 'Tổng kết đêm' : g.step === 'day' ? 'Cả làng thảo luận' : g.step === 'wolves' ? 'Bầy Sói' : g.step === 'ended' ? 'Kết thúc' : roleName(g.step))}</h2><blockquote>${esc(MODERATOR_SCRIPTS[g.step].wake)}</blockquote>${controls}<details class="fold"><summary>Hành động vừa nhận</summary>${latest.map(e => `<p class="feed-line">↳ ${esc(eventText(e))}</p>`).join('') || '<p class="empty">Chờ người chơi gửi.</p>'}</details></section>
    <section class="panel"><h2>Bàn tròn</h2>${roundTable(g.players.map(p => ({ id: p.id, name: p.name, alive: !g.publicDead.includes(p.id) })), { hub: hubLabel(g.step, g.night) })}</section>
    <details class="fold secret-book"><summary>Sổ tay bí mật</summary><p class="muted">${g.rulesVersion === 'classic-core-v8' ? 'Ván cũ giữ luật v8.' : g.rulesVersion === 'classic-core-v9' ? 'Ván cũ giữ luật v9 (không có chat bầy).' : `Phù thủy ${g.settings?.witchSeesBite ? 'được xem nạn nhân (trừ người được Bảo vệ chặn)' : 'không xem nạn nhân · dùng thuốc không lộ tên'}.`}</p><ul class="secret-roster">${g.players.map((p, i) => `<li class="${p.alive ? '' : 'dead'}"><span class="seat-no">${String(i + 1).padStart(2, '0')}</span><div><strong>${esc(p.name)}</strong><small>${esc(roleName(p.role))}</small></div><span>${p.alive ? 'Sống' : !g.publicDead.includes(p.id) ? 'Chưa công bố' : 'Đã chết'}</span></li>`).join('')}</ul><details><summary>Chat bầy Sói</summary>${(g.chat ?? []).slice(-20).map(m => `<p class="log-entry">Đêm ${m.night} · ${esc(name(m.from))}: ${esc(m.text)}</p>`).join('') || '<p class="empty">Chưa có chat.</p>'}</details><details><summary>Nhật ký đầy đủ</summary>${g.events.slice(-15).map(e => `<p class="log-entry">${esc(eventText(e))}</p>`).join('')}</details></details>
    ${catalogSection()}`;
}
function render() {
  const phaseKey = snapshot?.game && 'stepId' in snapshot.game ? snapshot.game.stepId : snapshot?.viewer === 'player' ? snapshot.game?.turn?.stepId ?? 'wait' : 'lobby';
  const previousKey = app.dataset.phase;
  for (const el of app.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[id],select[id]')) {
    if (el.id === 'chat-text' && chatDraftCleared) { formMemory.delete(`${previousKey}:chat-text`); continue; }
    formMemory.set(`${previousKey}:${el.id}`, el.type === 'checkbox' ? (el as HTMLInputElement).checked : el.value);
  }
  app.dataset.phase = phaseKey;
  const overlay = snapshot?.viewer === 'player' && snapshot.game && snapshot.game.phase !== 'ended'
    ? roleRevealOverlay(snapshot.game) : '';
  app.innerHTML = `<header><a class="brand" href="/">${moon}<span>MA SÓI</span></a><div class="connection ${failed ? 'offline' : ''}">${esc(status)}</div></header><div class="storage">${storage === 'local' ? 'BÀN THỬ · LOCAL' : 'ONLINE'}</div>${notice ? `<div class="notice" role="status">${esc(notice)}</div>` : ''}${pending ? `<div class="notice">Đang chờ gửi lại — bấm “Thử gửi lại”.<button type="button" data-action="retry" ${busy ? 'disabled' : ''}>Thử gửi lại</button></div>` : ''}
    ${snapshot ? `<div class="room-heading"><h1>Phòng <span id="room-code">${snapshot.room.code}</span></h1><div class="room-tools">${button('copy', 'Sao chép link')}${button('refresh', 'Đồng bộ')}</div></div><main class="grid ${snapshot.viewer === 'player' && snapshot.game ? 'player-grid' : ''}">${!snapshot.game ? lobby(snapshot) : snapshot.viewer === 'moderator' ? moderator(snapshot) : player(snapshot)}</main>` : `<main class="welcome"><h1>Trời tối rồi.<br><em>Ai còn thức?</em></h1><div class="entry"><section class="entry-panel"><h2>Mở bàn chơi</h2><label>Tên quản trò<input id="create-name" maxlength="40" autocomplete="nickname" placeholder="Tên của bạn"></label>${button('create', 'Tạo phòng', false, 'class="primary wide"')}</section><section class="entry-panel"><h2>Vào phòng</h2><label>Mã phòng<input id="join-code" maxlength="6" value="${esc(code)}" placeholder="6 ký tự" autocapitalize="characters" autocomplete="off"></label><label>Tên của bạn<input id="join-name" maxlength="40" autocomplete="nickname" placeholder="Tên mọi người gọi"></label>${button('join', 'Vào phòng', false, 'class="primary wide"')}</section></div></main>`}<footer><span>Chuyện trong làng, giữ trong làng.</span><a href="/sandbox.html">Bàn thử luật ↗</a></footer>${overlay}`;
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
// Kéo thả xếp ghế ở lobby (chỉ quản trò). Kéo ghế tới vị trí khác trên bàn tròn.
let drag: { id: string; el: HTMLElement; ox: number; oy: number; moved: boolean } | null = null;
app.addEventListener('pointerdown', e => {
  if (!snapshot || snapshot.viewer !== 'moderator' || snapshot.game) return;
  const seat = (e.target as HTMLElement).closest<HTMLElement>('[data-drag]');
  if (!seat || (e.target as HTMLElement).closest('button')) return;
  drag = { id: seat.dataset.id!, el: seat, ox: e.clientX, oy: e.clientY, moved: false };
  seat.setPointerCapture?.(e.pointerId);
});
app.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.ox, dy = e.clientY - drag.oy;
  if (!drag.moved && Math.hypot(dx, dy) < 6) return;
  drag.moved = true; drag.el.classList.add('dragging');
  drag.el.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  const target = dropTarget(e.clientX, e.clientY);
  for (const el of app.querySelectorAll('.seat.drop-target')) el.classList.remove('drop-target');
  target?.classList.add('drop-target');
});
app.addEventListener('pointerup', e => {
  if (!drag) return;
  const { id, el, moved } = drag;
  el.classList.remove('dragging'); el.style.transform = '';
  for (const t of app.querySelectorAll('.seat.drop-target')) t.classList.remove('drop-target');
  drag = null;
  if (!moved || !snapshot) return;
  const target = dropTarget(e.clientX, e.clientY);
  if (!target || target.dataset.id === id) return;
  const ids = snapshot.room.members.map(m => m.id);
  const from = ids.indexOf(id), to = ids.indexOf(target.dataset.id!);
  ids.splice(to, 0, ...ids.splice(from, 1));
  void mutate({ type: 'reorder', code, requestId: random(), expectedRevision: snapshot.room.revision!, playerIds: ids });
});
function dropTarget(px: number, py: number): HTMLElement | null {
  const table = app.querySelector<HTMLElement>('.table'); if (!table) return null;
  const rect = table.getBoundingClientRect();
  const angle = (Math.atan2(py - (rect.top + rect.height / 2), px - (rect.left + rect.width / 2)) * 180 / Math.PI + 450) % 360;
  const n = snapshot?.room.members.length ?? 0; if (!n) return null;
  const index = Math.round(angle / (360 / n)) % n;
  return table.querySelector<HTMLElement>(`.seat[data-seat="${index + 1}"]`);
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
    if (action === 'role-read') { if (snapshot?.viewer === 'player' && snapshot.game) { try { sessionStorage.setItem(sessionStorageKey(snapshot.game.gameId), '1'); } catch {} } render(); return; }
    if (action === 'edit-wolf') { editingWolfStep = snapshot?.viewer === 'player' ? snapshot.game?.turn?.stepId ?? null : null; render(); return; }
    if (action === 'chat-send') {
      const text = value('chat-text').trim();
      const step = snapshot?.viewer === 'player' ? snapshot.game?.turn?.stepId : undefined;
      if (!text || !step) return;
      await mutate({ type: 'command', code, requestId: random(), stepId: step, command: { type: 'chat', text } });
      chatDraftCleared = true; render(); chatDraftCleared = false;
      return;
    }
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
    if (action === 'start') { await mutate({ type: 'start', code, requestId: random(), expectedRevision: snapshot.room.revision!, settings: { witchSeesBite: document.querySelector<HTMLInputElement>('#witch-sees-bite')!.checked }, roles: catalog.flatMap(r => Array.from({ length: deck[r.id] ?? 0 }, () => r.id)) }); return; }
    const step = snapshot.viewer === 'moderator' ? snapshot.game?.stepId : snapshot.game?.turn?.stepId;
    if (!step) return;
    if (action === 'submit') editingWolfStep = null;
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
