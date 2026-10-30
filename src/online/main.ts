import QRCode from 'qrcode';
import { native, isNativeApp, deviceStorage, flushDeviceStorage, publicOrigin, copyText } from '../platform/runtime.ts';
import { roomInvite, roomRequestPath } from '../platform/urls.ts';
import { patchHtml } from './dom.ts';
import { ROLE_IMAGES } from '../catalog/images.ts';
import { pickTarget, visiblePackIds, type TargetSlot } from './target-picker.ts';
import type { Snapshot, Mutation } from '../server/types.ts';
import { votingRule } from '../engine/extensions.ts';
import type { Game, Action, Command, DayTimers, GameEvent, Role } from '../engine/types.ts';
import { LocalTable, localCatalog, type LocalMutation } from '../offline/table.ts';
import { actors, RuleError } from '../engine/engine.ts';
import { playerView } from '../engine/views.ts';
import { baseTeam } from '../engine/role-policy.ts';
import { MODERATOR_SCRIPTS } from '../engine/rules.ts';
import './style.css';
import { ROLE_CATALOG } from '../catalog/roles.ts';
import { icon } from './icons.ts';
import deathBloodX from './assets/death-blood-x.png';
import wolfEmblem from './assets/wolf-faction.svg?raw';
import { latestNightDeaths, missingLibraryRoles, publicEventText, latestAbilityResult } from './presentation.ts';

type Session = { token: string };
type Pending = { token: string; operation: LocalMutation };
const app = document.querySelector<HTMLDivElement>('#app')!;
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const random = () => [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join('');
// Debug tabs represent separate devices; production keeps persistent device sessions.
const sessionStore = import.meta.env.DEBUG_TOOLS ? sessionStorage : deviceStorage;
function load<T>(key: string, fallback: T): T { try { return JSON.parse(sessionStore.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } }
// Vite loại bỏ import này khỏi mọi bản build, kể cả build --mode debug.
const debug = import.meta.env.DEBUG_TOOLS
  ? (await import('../debug/players.ts')).createDebugPlayers() : null;
let sessions = load<Record<string, Session>>('ma-soi:sessions:v1', {});
const capabilityFor = (c: string) => localMode ? 'local' : debug?.capability(c) ?? sessions[c]?.token;
let pending = load<Pending | null>('ma-soi:pending:v1', null);
const localTable = new LocalTable(deviceStorage);
let localMode = native && pending ? load<boolean>('ma-soi:pending-local:v1', false) : new URL(location.href).searchParams.has('local');
let localSimplified = true;
let code = (new URL(location.href).searchParams.get('local') ?? new URL(location.href).searchParams.get('room'))?.toUpperCase() ?? '';
let entryMode: 'create' | 'join' = 'join';
let proxyPlayerId: string | null = null;
try { proxyPlayerId = sessionStorage.getItem(`ma-soi:offline:${code}`); } catch {}
let switchingView = false, readSequence = 0, sessionMoved = false;
let offlineAutoSkip: string | null = null;
function setProxy(id: string | null) {
  proxyPlayerId = id;
  try { id ? sessionStorage.setItem(`ma-soi:offline:${code}`, id) : sessionStorage.removeItem(`ma-soi:offline:${code}`); } catch {}
}
let snapshot: Snapshot | null = null;
let catalog: Snapshot['catalog'] = localCatalog();
let storage = 'local';
let status = 'Đang kết nối…', notice = '', busy = false, fetching = false;
let busyAction: string | null = null;
let lastAction: string | null = null;
let poll: ReturnType<typeof setTimeout> | undefined;
let appActive = !isNativeApp || !document.hidden;
let reconnectAfterWrite = false;
let deck: Record<string, number> = {};
let deckDirty = false;
let failed = false;
let editingWolfStep: string | null = null;
let chatDraftCleared = false;
const formMemory = new Map<string, string | boolean>();
let savedPlayerName = '';
try { savedPlayerName = sessionStore.getItem('ma-soi:player-name:v1') ?? ''; } catch {}
let inviteQr = '', inviteQrUrl = '';
const inviteUrl = () => roomInvite(publicOrigin, code);

function persist() { sessionStore.setItem('ma-soi:sessions:v1', JSON.stringify(sessions)); if (pending) sessionStore.setItem('ma-soi:pending:v1', JSON.stringify(pending)); else sessionStore.removeItem('ma-soi:pending:v1'); if (native) sessionStore.setItem('ma-soi:pending-local:v1', JSON.stringify(localMode)); }
async function goHome() {
  if (native) { deviceStorage.removeItem('ma-soi:resume-route:v1'); await flushDeviceStorage(); }
  location.assign('/');
}
const name = (id: unknown) => snapshot?.room.members.find(m => m.id === id)?.name ?? String(id ?? 'không ai');
const roleName = (id: unknown) => catalog.find(r => r.id === id)?.name ?? String(id);
const roleLibraryMissing = () => missingLibraryRoles(catalog.map(r => r.id), ROLE_CATALOG);
const roleById = (id: unknown) => catalog.find(r => r.id === id);
// Thứ tự đọc do sản phẩm chọn: vai nền tảng trước, rồi các vai mở rộng theo thư viện.
const familiarRoleOrder = [
  'villager', 'wolf', 'seer', 'guard', 'witch', 'hunter', 'cupid',
  'wolf_cub', 'cursed', 'mason', 'tanner', 'idiot', 'mayor', 'prince',
  'apprentice_seer', 'lycan', 'minion', 'sorceress', 'lone_wolf',
  'alpha_wolf', 'big_bad_wolf', 'doppelganger', 'drunk', 'diseased',
];
const libraryRoleOrder = [...new Set([...familiarRoleOrder, ...ROLE_CATALOG.map(r => r.id)])];
const libraryRoleRank = new Map(libraryRoleOrder.map((id, index) => [id, index]));

const initial = (v: string) => [...v.trim()][0]?.toLocaleUpperCase('vi') ?? '?';
const cardImage = (roleId: string, fallbackText: string) => {
  const image = ROLE_IMAGES[roleId];
  if (!image) return `<span class="img-fallback" aria-hidden="true">${esc(initial(fallbackText))}</span>`;
  return `<img class="card-img" loading="eager" decoding="async" src="${esc(image)}" alt="" data-fallback="${esc(initial(fallbackText))}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'img-fallback',textContent:this.dataset.fallback}))">`;
};
const button = (action: string, text: string, disabled = false, extra = '') => `<button type="button" data-action="${action}" ${busy && busyAction === action ? 'aria-busy="true"' : ''} ${disabled || busy || !!pending ? 'disabled' : ''} ${extra}>${text}</button>`;
const iconButton = (action: string, glyph: string, label: string, extra = '') => button(action, icon(glyph), false, `class="icon-button" aria-label="${esc(label)}" title="${esc(label)}" ${extra}`);
const modalButton = (id: string, glyph: string, label: string) => iconButton('modal-open', glyph, label, `data-modal="${id}"`);
function options(ids: string[], empty?: string) { return (empty !== undefined ? `<option value="">${esc(empty)}</option>` : '') + ids.map(id => `<option value="${esc(id)}">${esc(name(id))}</option>`).join(''); }
function describeAction(a: Action): string {
  switch (a.type) {
    case 'bite': return `Cắn ${name(a.target)}`;
    case 'maul': return `Cắn ${a.targets.map(name).join(' và ')}`;
    case 'protect': return `Bảo vệ ${name(a.target)}`;
    case 'inspect': return `Soi ${name(a.target)}`;
    case 'ability': return a.pass ? 'Không dùng năng lực' : a.text?`Gửi gợi ý: ${a.text}`:a.choice==='draw'?'Bốc vai thật':a.choice?`Dự đoán: ${winnerText(a.choice)}`:a.targets.length ? 'Chọn ' + a.targets.map(name).join(', ') : 'Đã xác nhận';
    case 'hold': return 'Giữ lại phát bắn';
    case 'shoot': return `${snapshot?.game && (snapshot.viewer === 'moderator' ? ['classic-core-v13','classic-core-v14'].includes(snapshot.game.rulesVersion) && !snapshot.game.settings?.hunterActiveShot : snapshot.game.hunterMode === 'passive') ? 'Ghim' : 'Bắn'} ${name(a.target)}`;
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
function abilityResultText(e: GameEvent): string {
 const d=e.data, kind=String(d.kind), people=(key:string)=>Array.isArray(d[key])?(d[key] as string[]).map(name).join(', '):'';
 if(kind==='drunk')return `Vai thật của bạn: ${roleName(String(d.role))}.`;
 if(kind==='mason')return `Sinh đôi khác: ${people('people') || 'Không có'}.`;
 if(kind==='minion')return `Phe Sói: ${people('people') || 'Không có'}.`;
 if(kind==='beholder')return `Tiên tri: ${people('people') || 'Không có Tiên tri còn sống'}.`;
 if(kind==='count')return `Nửa thứ nhất (${people('first')}): ${d.firstCount} Sói. Nửa thứ hai (${people('second')}): ${d.secondCount} Sói.`;
 if(kind==='insomniac')return d.awake?'Có người bên cạnh thức dậy đêm nay.':'Không ai bên cạnh thức dậy đêm nay.';
 if(kind==='sorceress')return `${name(d.target)} ${d.isSeer?'là':'không phải'} Tiên tri.`;
 if(kind==='paranormal_investigator')return d.isWolf?'Có Sói trong ba người đã kiểm tra.':'Không có Sói trong ba người đã kiểm tra.';
 if(kind==='the_thing')return `Đã vỗ vai ${name(d.target)}.`;
 return String(d.message??'Kết quả đã được lưu.');
}
function eventText(e: GameEvent): string {
  const d = e.data;
  switch (e.type) {
    case 'player-left': return `${name(d.player)} đã rời trò chơi.`;
    case 'morning': case 'deaths': case 'verdict': case 'prince-revealed':
      return publicEventText(e, name)!;
    case 'game-ended': return `Sáng ${e.night}: ${winnerText(String(d.winner))}.`;
    case 'ghost-hint': return `Gợi ý của Con ma: ${String(d.text)}.`;
    case 'wolf-timeout': return 'Quản trò xác nhận bầy Sói quá giờ.';
    case 'rule-penalty': return `Quản trò ghi hình phạt đêm cho ${name(d.target)}.`;
    case 'metal-sound': return 'Trong đêm vang lên tiếng kim loại chạm vào nhau.';
    case 'ability-result': return abilityResultText(e);
    case 'day-restrictions': return `Ban ngày: ${[Array.isArray(d.absent)&&d.absent.length?'Vắng mặt: '+d.absent.map(name).join(', '):'',Array.isArray(d.silent)&&d.silent.length?'Không nói: '+d.silent.map(name).join(', '):'',Array.isArray(d.controlled)&&d.controlled.length?'Phiếu bị điều khiển: '+d.controlled.map(name).join(', '):'',Array.isArray(d.brainEaten)&&d.brainEaten.length?'Không được bỏ phiếu: '+d.brainEaten.map(name).join(', '):'',d.verdicts===2?'Có hai phán quyết treo cổ':''].filter(Boolean).join(' · ')}.`;
    case 'tapped': return 'Bạn được The Thing vỗ vai.';
    case 'blessing': return `${name(d.actor)} ban phước cho ${name(d.target)}.`;
    case 'inspection': return `Soi ${name(d.target)}: ${d.isWolf ? 'Sói' : 'không phải Sói'}.`;
    case 'aura-inspection': return `${name(d.target)} ${d.hasAbility ? 'có' : 'không có'} năng lực đặc biệt.`;
    case 'mystic-inspection': return `${name(d.target)}: ${roleName(d.role)}.`;
    case 'alignment-comparison': return `${(d.targets as string[]).map(name).join(' và ')} ${d.sameTeam ? 'cùng' : 'khác'} phe.`;
    case 'lovers': return `Người yêu của bạn: ${name(d.partner)}.`;
    case 'power-inherited': return `Bạn nhận thêm kỹ năng ${roleName(d.role)}.`;
    case 'role-inherited': return `Bạn nhận vai ${roleName(d.newRole)}.`;
    case 'transformed-to-wolf': return 'Bạn đã chuyển thành Ma Sói.';
    case 'feared-by': return `${name(d.actor)} đã chọn bạn; bạn sẽ chết theo nếu người đó chết.`;
    case 'death-bond': return `Liên kết: ${name(d.target)}.`;
    case 'mimic-target': return `Bạn chọn nhân bản ${name(d.target)}.`;
    case 'hunter-fired': return `${name(d.actor)} dùng phát bắn vào ${name(d.target)}.`;
    case 'hunter-marked': return `${name(d.actor)} ghim ${name(d.target)} trong đêm ${e.night}.`;
    case 'hunter-shot': return `Thợ săn ${name(d.hunter)} kéo ${name(d.target)} chết theo.`;
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
function playerViewForVoting(g:Game,id:string){return {...votingRule(g,id),follow:g.extra?.day.mummy.find(p=>p.target===id)?.actor??false};}
function votingText(v: {canVote:boolean;canSpeak:boolean;weight:number;required:string|null;follow:string|boolean|null}) {
 return [!v.canSpeak?'Không được phát biểu hôm nay':'',!v.canVote?'Không được bỏ phiếu hôm nay':v.weight===2?'Phiếu tính hai lần':'',v.required==='kill'?'Luôn bỏ phiếu loại người':v.required==='spare'?'Luôn bỏ phiếu giữ người':'',v.follow?typeof v.follow==='string'?'Phiếu theo '+name(v.follow):'Phiếu theo hướng dẫn của quản trò':''].filter(Boolean).join(' · ')||'Thảo luận và bỏ phiếu theo quản trò.';
}
const winnerText = (w: string) => ({ village: 'Phe Dân thắng', wolves: 'Phe Sói thắng', lovers: 'Tình nhân thắng', lone_wolf:'Sói đơn độc thắng',vampires:'Ma cà rồng thắng',cult:'Giáo phái thắng',tanner:'Chán đời thắng',hoodlum:'Du côn thắng',nostradamus:'Nostradamus thắng',bogeyman:'Ông kẹ thắng',blob:'Blob thắng',zombie:'Thây ma thắng',dracula:'Dracula thắng',chupacabra:'Chupacabra thắng',bloody_mary:'Bloody Mary thắng',draw: 'Hòa' })[w] ?? w;
const moon = '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M43 8a24 24 0 1 0 13 37A26 26 0 0 1 43 8Z" fill="currentColor"/><path d="m49 15 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="currentColor"/></svg>';
// Đồng hồ ban ngày: mặc định 300/15/30/15 giây, quản trò chỉnh trước khi chia vai.
const DAY_PHASE_NAMES: Record<string, string> = { discussion: 'Thảo luận', nomination: 'Vote chỉ người', defense: 'Thanh minh', finalvote: 'Biểu quyết sống/chết' };
const DAY_PHASES = ['discussion', 'nomination', 'defense', 'finalvote'] as const;
const DEFAULT_DAY_TIMERS: Record<string, number> = { discussion: 300, nomination: 15, defense: 30, finalvote: 15 };
const lobbySettings = { hunterActiveShot: false, witchSeesBite: false, dayTimers: { ...DEFAULT_DAY_TIMERS }, skipVoteDays: 0 };
let serverOffset = 0;
const fmtClock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function tickCountdowns() {
  const now = Date.now() - serverOffset;
  for (const el of app.querySelectorAll<HTMLElement>('[data-countdown]')) {
    const strong = el.querySelector('strong'); if (!strong) continue;
    const ends = Number(el.dataset.ends ?? 0);
    if (!ends) { strong.textContent = 'chưa bấm'; el.classList.remove('expired'); continue; }
    const remaining = ends - now;
    strong.textContent = remaining > 0 ? fmtClock(remaining) : 'HẾT GIỜ';
    el.classList.toggle('expired', remaining <= 0);
  }
}
setInterval(tickCountdowns, 500);
const dayClockHtml = (phase: string | null, endsAt: number | null, big = false) => {
  if (!phase) return '<p class="muted">Đồng hồ đã chạy hết các phần — chốt phán quyết.</p>';
  return `<div class="day-clock${big ? ' big' : ''}" data-countdown data-ends="${endsAt ?? ''}"><span>${DAY_PHASE_NAMES[phase] ?? phase}</span><strong>${endsAt ? '' : 'chưa bấm'}</strong></div>`;
};
function dayPhaseBar(dayPhase: string | null): string {
  const index = dayPhase ? DAY_PHASES.indexOf(dayPhase as typeof DAY_PHASES[number]) : -1;
  return `<div class="phase-chips">${DAY_PHASES.map((p, i) => `<span class="phase-chip${i === index ? ' active' : i < index ? ' passed' : ''}">${DAY_PHASE_NAMES[p]}</span>`).join('')}</div>`;
}
function preset() {
  const n = snapshot?.room.members.filter(m => !m.left).length ?? 0; deck = {}; deckDirty = true;
  if (n < 3) return;
  deck.wolf = Math.max(1, Math.floor(n / 4));
  if (n >= 4) deck.seer = 1;
  if (n >= 5) deck.guard = 1;
  if (n >= 6) deck.witch = 1;
  if (n >= 7) deck.hunter = 1;
  deck.villager = n - Object.values(deck).reduce((a, b) => a + b, 0);
}
let activeTargetSlot = '';
function targetingView() {
  if (!snapshot?.game || snapshot.room.phase !== 'playing') return null;
  if (snapshot.viewer === 'moderator') return snapshot.room.simplified && !['day', 'review', 'ended'].includes(snapshot.game.step) ? simpleView(snapshot.game) : null;
  const g = snapshot.game, t = g.turn;
  return t && (t.awake || snapshot.controller) && (!t.sleepReady || editingWolfStep === t.stepId) ? g : null;
}
function pickerSlots(): TargetSlot[] {
  return [...app.querySelectorAll<HTMLElement>('[data-target-slot]')].map(el => ({ id: el.dataset.targetSlot!, targets: JSON.parse(el.dataset.targets!), optional: el.dataset.optional === 'true' }));
}
function mountTargetPicker(phaseKey: string) {
  const view = targetingView();
  if (!view) return;
  const ids = ['target', 'target2', 'first', 'second', 'healTarget', 'poison', 'convert'];
  for (const id of ids) {
    const select = app.querySelector<HTMLSelectElement>(`select#${id}`);
    if (!select) continue;
    if (select.disabled) { const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.id = id; hidden.value = ''; const note = document.createElement('p'); note.className = 'muted'; note.textContent = 'Đã hết thuốc độc.'; select.parentElement!.replaceWith(hidden, note); continue; }
    const label = select.parentElement!, text = label.firstChild?.textContent?.trim() ?? 'Mục tiêu';
    const choices = [...select.options], optional = choices.some(o => o.value === '');
    const selected = formMemory.get(`${phaseKey}:${id}`);
    const value = typeof selected === 'string' && choices.some(o => o.value === selected) ? selected : '';
    const field = document.createElement('div'); field.className = 'avatar-target-field'; field.dataset.targetSlot = id;
    field.dataset.targets = JSON.stringify(choices.filter(o => o.value).map(o => o.value)); field.dataset.optional = String(optional);
    const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.id = id; hidden.value = value;
    const slot = document.createElement('button'); slot.type = 'button'; slot.className = 'target-slot'; slot.dataset.action = 'target-slot'; slot.dataset.slot = id;
    const caption = document.createElement('span'); caption.textContent = text;
    const selectedName = document.createElement('strong'); selectedName.dataset.targetName = id;
    slot.append(caption, selectedName); field.append(hidden, slot);
    if (optional) {
      const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'text-button target-clear'; clear.dataset.action = 'target-clear'; clear.dataset.slot = id;
      clear.textContent = choices.find(o => !o.value)?.textContent ?? 'Bỏ chọn'; field.append(clear);
    }
    label.replaceWith(field);
  }
  const slots = pickerSlots();
  if (slots.length === 1) app.querySelector('.avatar-target-field')?.classList.add('single-target');
  if (!slots.some(s => s.id === activeTargetSlot)) activeTargetSlot = slots[0]?.id ?? '';
  if (slots.length && !app.querySelector('.turn-instruction')) {
    const help = document.createElement('p'); help.className = 'muted target-help'; help.textContent = 'Bấm avatar trên bàn để chọn mục tiêu, rồi xác nhận.';
    app.querySelector('.avatar-target-field')?.before(help);
  }
  updateTargetPicker();
}
function updateTargetPicker() {
  const slots = pickerSlots(), active = slots.find(s => s.id === activeTargetSlot);
  const values = Object.fromEntries(slots.map(s => [s.id, app.querySelector<HTMLInputElement>(`#${s.id}`)?.value ?? '']));
  for (const el of app.querySelectorAll<HTMLElement>('[data-target-slot]')) {
    const id = el.dataset.targetSlot!, chosen = values[id];
    el.querySelector<HTMLElement>('[data-target-name]')!.textContent = chosen ? name(chosen) : el.dataset.optional === 'true' ? 'Chưa chọn · không dùng' : 'Bấm avatar để chọn';
    const button = el.querySelector<HTMLButtonElement>('.target-slot')!;
    button.classList.toggle('active', id === activeTargetSlot); button.setAttribute('aria-pressed', String(id === activeTargetSlot));
  }
  for (const avatar of app.querySelectorAll<HTMLButtonElement>('[data-action="pick-target"]')) {
    const id = avatar.dataset.playerId!, allowed = !!active?.targets.includes(id);
    const selected = Object.values(values).includes(id);
    avatar.setAttribute('aria-disabled', String(!allowed)); avatar.setAttribute('aria-pressed', String(selected));
    avatar.closest('.seat')?.classList.toggle('target-selected', selected);
    avatar.closest('.seat')?.classList.toggle('target-available', allowed);
  }
  const sacrifice = app.querySelector<HTMLInputElement>('#sacrifice')?.checked;
  const healing = app.querySelector<HTMLInputElement>('#heal')?.checked;
  const ready = sacrifice || app.querySelector<HTMLInputElement>('#ability-pass')?.checked || slots.every(s => s.optional || s.id === 'healTarget' && !healing || !!values[s.id]);
  const submit = app.querySelector<HTMLButtonElement>('[data-action="submit"], [data-action="simple-submit"]');
  if (submit) submit.disabled = busy || !!pending || !ready;
}
// Bàn tròn: sáng là sống, mờ là đã chết. Thứ tự người chơi là vòng ghế cố định.
function tableExpandButton() {
  const label = tableFullscreen ? 'Thu nhỏ bàn chơi' : 'Mở bàn chơi toàn màn hình';
  return button('table-fullscreen', icon(tableFullscreen ? 'collapse' : 'expand'), false,
    `class="table-expand icon-button" aria-label="${label}" title="${label}" aria-pressed="${tableFullscreen}"`);
}
function roundTable(players: { id: string; name: string; alive: boolean }[], opts: { draggable?: boolean; hub?: string; recentDeaths?: string[]; readyPlayers?: string[] } = {}) {
  const n = players.length;
  const seats = players.map((p, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const x = 50 + 39 * Math.cos(angle), y = 50 + 39 * Math.sin(angle);
    const left = snapshot?.room.members.find(m => m.id === p.id)?.left;
    const manage = snapshot?.viewer === 'moderator' && !snapshot.controller;
    const view = targetingView();
    const picking = !!view && !!view.turn?.targets.length;
    const packView = snapshot?.viewer === 'player' ? snapshot.game : view;
    const packMate = visiblePackIds(packView, snapshot?.viewer === 'moderator' && !!snapshot.room.simplified).includes(p.id);
    const recent = !left && !p.alive && opts.recentDeaths?.includes(p.id);
    const drag = opts.draggable ? 'data-drag="1"' : '';
    return `<div class="seat${packMate ? ' pack-mate' : ''}${left ? ' left' : ''}${p.alive ? '' : ' dead'}${recent ? ' recently-dead' : ''}${opts.readyPlayers && !opts.readyPlayers.includes(p.id) ? ' awaiting-ready' : ''}" data-ui-key="seat-${esc(p.id)}" data-id="${esc(p.id)}" data-seat="${i + 1}" style="--x:${x.toFixed(2)}%;--y:${y.toFixed(2)}%" ${drag}>${picking ? `<button type="button" class="avatar" data-action="pick-target" data-player-id="${p.id}" aria-label="Chọn ${esc(p.name)}">` : manage ? `<button type="button" id="seat-${p.id}" class="avatar" data-action="seat-menu" data-player-id="${p.id}" aria-label="Cài đặt ${esc(p.name)}" aria-haspopup="menu" aria-expanded="${memberMenu?.id === p.id}" ${left ? 'disabled' : ''}>` : '<span class="avatar">'}${esc(initial(p.name))}${opts.readyPlayers?.includes(p.id) ? `<span class="ready-check">${icon('check')}</span>` : ''}${recent ? `<span class="death-mark" role="img" aria-label="Chết đêm gần nhất" title="Chết đêm gần nhất"><img src="${deathBloodX}" alt="" aria-hidden="true" decoding="async"></span>` : ''}${manage || picking ? '</button>' : '</span>'}${manage && picking ? `<button type="button" class="seat-settings" data-action="seat-menu" data-player-id="${p.id}" aria-label="Cài đặt ${esc(p.name)}">${icon('settings')}</button>` : ''}<span class="sname">${esc(p.name)}</span>${left ? '<small class="left-label">Đã rời</small>' : ''}</div>`;
  }).join('');
  return `<div data-ui-key="round-table" class="table${n === 0 ? ' vacant' : ''}${n > 12 ? ' dense' : ''}" data-table="${n}">${seats}${n === 0 ? Array.from({ length: 8 }, (_, i) => `<span class="empty-seat" style="--angle:${i * 45}deg">${icon('user')}</span>`).join('') : ''}<div class="hub">${opts.hub ?? `<strong>${n}</strong><span>người chơi</span>`}</div></div>`;
}
// Pop-up: các mục cài đặt/mở rộng ẩn mặc định, bấm mới mở; ESC hoặc bấm nền để đóng.
let modal: string | null = null;
const collapsedFactions = new Set<string>();
function factionRoleRows(rows: { id: string; count: number; html: string }[], unit: string, picker = false): string {
  const factions = [ ['village', 'Phe dân'], ['wolves', 'Phe sói'], ['third', 'Phe thứ ba'] ] as const;
  return factions.map(([faction, label]) => {
    const members = rows.filter(row => {
      const team = baseTeam(row.id as Role);
      return (team === 'wolves' || team === 'village' ? team : 'third') === faction;
    });
    if (!members.length) return '';
    if (picker) members.sort((a, b) => Number(b.count > 0) - Number(a.count > 0));
    const total = members.reduce((sum, row) => sum + row.count, 0);
    const key = `${modal}:${faction}`;
    const collapsed = collapsedFactions.has(key);
    return `<section class="role-faction role-faction-${faction}" aria-label="${label}"><h4><button type="button" class="faction-toggle" data-action="toggle-faction" data-faction-key="${key}" aria-expanded="${!collapsed}" aria-controls="faction-${faction}">${label}<span>${total} ${unit}</span>${icon('chevron')}</button></h4><div id="faction-${faction}" class="${picker ? 'deck' : 'role-rows'}" ${collapsed ? 'hidden' : ''}>${members.map(row => row.html).join('')}</div></section>`;
  }).join('');
}

let roleListParent: 'catalog' | 'allroles' | null = null;
let tableFullscreen = false;
const NOTEBOOK_TABS = { players: 'Người chơi', chat: 'Chat Sói', history: 'Nhật ký' } as const;
type NotebookTab = keyof typeof NOTEBOOK_TABS;
let notebookTab: NotebookTab = 'players';
let notebookNight = 'all';
const notebookScroll: Record<NotebookTab, number> = { players: 0, chat: 0, history: 0 };
let memberMenu: { id: string; x: number; y: number; confirm: boolean } | null = null;
let ignoreSeatClickUntil = 0;
let modalReturnTarget: string | null = null;
const utilityIcons: Record<string, string> = { rolepeek: 'eye', private: 'message', publiclog: 'book', feed: 'check', secret: 'book', catalog: 'cards', settings: 'settings', deck: 'edit', packchat: 'message' };
const foldTrigger = (id: string, label: string, badge = '') => `<button type="button" class="fold-trigger" data-action="modal-open" data-modal="${id}">${icon(utilityIcons[id] ?? 'cards')}<span>${esc(label)}</span>${badge ? `<span class="fold-badge">${esc(badge)}</span>` : ''}${icon('chevron')}</button>`;
function memberMenuHtml(): string {
  if (!memberMenu || snapshot?.viewer !== 'moderator') return '';
  const m = snapshot.room.members.find(m => m.id === memberMenu!.id);
  if (!m || m.left) { memberMenu = null; return ''; }
  const width = Math.min(248, innerWidth - 24);
  const x = Math.max(12, Math.min(memberMenu.x, innerWidth - width - 12));
  const y = Math.max(12, Math.min(memberMenu.y, innerHeight - 180));
  return `<div class="member-menu" role="menu" aria-label="Cài đặt ${esc(m.name)}" style="left:${x}px;top:${y}px;width:${width}px"><strong>${esc(m.name)}</strong>${memberMenu.confirm ? `<p>Cho người này rời trò chơi?</p>${button('member-cancel', 'Hủy', false, 'role="menuitem"')}${button('member-remove', 'Cho rời trò chơi', false, 'class="danger" role="menuitem"')}` : `${button('member-offline', icon('user') + '<span>Chuyển sang offline</span>', m.offline, 'role="menuitem"')}${button('member-confirm', icon('close') + '<span>Rời khỏi trò chơi</span>', false, 'class="danger" role="menuitem"')}`}</div>`;
}
function positionMemberMenu() {
  if (!memberMenu) return;
  const anchor = document.getElementById(`seat-${memberMenu.id}`), popup = app.querySelector<HTMLElement>('.member-menu');
  if (!anchor || !popup) return;
  const r = anchor.getBoundingClientRect(), width = popup.offsetWidth, height = popup.offsetHeight;
  let x: number, y = r.top - 4;
  if (r.right + width + 12 <= innerWidth) x = r.right + 8;
  else if (r.left - width - 8 >= 12) x = r.left - width - 8;
  else { x = r.left + r.width / 2 - width / 2; y = r.bottom + 8 + height <= innerHeight - 12 ? r.bottom + 8 : r.top - height - 8; }
  popup.style.left = `${Math.max(12, Math.min(x, innerWidth - width - 12))}px`;
  popup.style.top = `${Math.max(12, Math.min(y, innerHeight - height - 12))}px`;
}
function modalShell(inner: string) {
  if (modal === 'inspect-result' || modal === 'local-inspect-result') return `<div class="modal-back"><div class="modal inspection-modal" role="dialog" aria-modal="true" aria-label="Kết quả soi"><div class="modal-body">${inner}</div></div></div>`;
  if (modal === 'secret') {
    const tabs = (Object.entries(NOTEBOOK_TABS) as [NotebookTab, string][]).map(([id, label]) => button('notebook-tab', label, false, `id="notebook-tab-${id}" role="tab" aria-selected="${notebookTab === id}" aria-controls="notebook-panel" tabindex="${notebookTab === id ? 0 : -1}" data-tab="${id}"`)).join('');
    return `<div class="modal-back" data-action="modal-close"><div class="modal secret-notebook" role="dialog" aria-modal="true" aria-labelledby="notebook-title"><button type="button" class="modal-close" data-action="modal-open" data-modal="__close" aria-label="Đóng">${icon('close')}</button><h3 id="notebook-title">Sổ tay bí mật</h3><nav class="notebook-tabs" role="tablist" aria-label="Mục sổ tay">${tabs}</nav><div class="modal-body" id="notebook-panel" role="tabpanel" aria-labelledby="notebook-tab-${notebookTab}" tabindex="0">${inner}</div></div></div>`;
  }
  const roleDetail = modal === 'packchat' ? ' chat-fullscreen' : modal?.startsWith('role:') || modal === 'rolepeek' ? ' role-detail' : '';
  return `<div class="modal-back" data-action="modal-close"><div class="modal${roleDetail}${['deck', 'catalog', 'allroles'].includes(modal ?? '') ? ' role-browser' : ''}" role="dialog" aria-modal="true" aria-label="${modal === 'exit-room' ? 'Thoát phòng' : modal === 'settings' || modal === 'tools' ? 'Cài đặt' : modal === 'deck' ? 'Bộ vai' : modal === 'catalog' || modal === 'allroles' ? 'Danh sách vai' : modal?.startsWith('role:') ? esc(roleName(modal.slice(5))) : 'Thông tin ván'}"><button type="button" class="modal-close" data-action="modal-open" data-modal="__close" aria-label="Đóng">${icon('close')}</button><div class="modal-body">${inner}</div>${modal === 'deck' ? button('save-deck', 'Lưu bộ vai', false, 'class="primary wide modal-footer"') : modal === 'offline-add' ? button('add-offline', 'Thêm người chơi', false, 'class="primary wide modal-footer"') : ''}</div></div>`;
}
function modalHtml() {
  if (!modal) return '';
  const g = snapshot?.viewer === 'player' ? snapshot.game : null;
  const gm = snapshot?.viewer === 'moderator' ? snapshot.game : null;
  let inner = '';
  if (modal === 'tools' && snapshot) {
    inner = `<h3>Cài đặt</h3><div class="room-tool-menu">${isNativeApp ? '' : button('browser-fullscreen', icon(document.fullscreenElement ? 'window-restore' : 'window-fullscreen') + `<span>${document.fullscreenElement ? 'Thu nhỏ' : 'Toàn màn hình'}</span>`, false, 'class="secondary"')}${localMode ? '' : button('copy', icon('copy') + '<span>Sao chép link mời</span>', false, 'class="secondary"')}${button('refresh', icon('refresh') + '<span>Đồng bộ lại</span>', false, 'class="secondary"')}${snapshot.viewer === 'moderator' && !snapshot.game ? button('modal-open', icon('settings') + '<span>Cài đặt ván chơi</span>', false, 'class="secondary" data-modal="settings"') : ''}${snapshot.viewer === 'moderator' && snapshot.game ? button('modal-open', icon('refresh') + '<span>Làm mới ván</span>', false, 'class="secondary" data-modal="reset-game"') : ''}${snapshot.controller ? button('return-moderator', icon('close') + '<span>Về quản trò</span>', false, 'class="secondary"') : button('exit-room', icon('exit') + `<span>${snapshot.viewer === 'moderator' ? 'Thoát phòng' : 'Rời phòng'}</span>`, false, 'class="danger"')}</div>`;
  } else if (modal === 'browser-fullscreen-help') {
    inner = '<h3>Mở toàn màn hình</h3><p>Trình duyệt này chưa cho phép trang web bật toàn màn hình.</p><p>Trên iPhone: mở menu Chia sẻ trong Safari hoặc Chrome → Thêm vào Màn hình chính → mở Ma Sói từ biểu tượng vừa thêm. Nếu có tùy chọn Mở dưới dạng ứng dụng web, hãy bật.</p><p class="muted">Bạn vẫn có thể dùng icon ở góc bàn để chỉ xem bàn chơi trong cửa sổ hiện tại.</p>';
  } else if (modal === 'invite-qr' && snapshot?.viewer === 'moderator' && !localMode) {
    inner = `<h3>Quét mã để vào phòng</h3><div class="invite-qr">${inviteQr}</div><p class="qr-room-code">${esc(code)}</p><p class="muted">Mở Camera iPhone, hướng vào mã QR rồi chạm liên kết.</p>${button('copy', 'Sao chép link mời', false, 'class="secondary wide"')}<details class="install-help"><summary>Mở bằng Chrome / toàn màn hình</summary><p>Đặt Chrome làm trình duyệt mặc định trong Cài đặt iPhone để mở liên kết bằng Chrome.</p><p>Để mở như ứng dụng: trong trình duyệt chọn Chia sẻ → Thêm vào Màn hình chính, sau đó mở từ biểu tượng vừa thêm. Không thể tự ép Chrome hoặc ẩn thanh trình duyệt ngay khi quét QR.</p></details>`;
  } else if (modal === 'exit-room' && snapshot?.viewer === 'player' && !snapshot.controller) {
    inner = `<h3>Rời phòng chơi?</h3><p>Bạn sẽ rút hẳn khỏi ${snapshot.game ? 'ván này và không thể vào lại ván đang chơi bằng tên cũ' : 'phòng và bỏ chỗ đang giữ'}. Hành động này không thể hoàn tác.</p><div class="exit-actions">${button('cancel-exit', 'Ở lại', false, 'class="secondary"')}${button('confirm-leave', 'Rời phòng', false, 'class="danger"')}</div>`;
  } else if (modal === 'exit-room' && snapshot?.viewer === 'moderator') {
    const message = localMode ? 'Ván được lưu trên máy. Bạn có thể tiếp tục từ trang chủ.'
      : snapshot.room.debug ? 'Phòng thử sẽ được đóng và xóa khi bạn thoát.' : 'Bạn có thể vào lại bằng mã phòng trên thiết bị này.';
    inner = `<h3>Thoát phòng?</h3><p class="muted">${message}</p><div class="exit-actions">${button('cancel-exit', 'Ở lại', false, 'class="secondary"')}${button('confirm-exit', 'Thoát phòng', false, 'class="primary"')}</div>`;
  } else if (modal === 'offline-add' && snapshot?.viewer === 'moderator' && !snapshot.game) {
    inner = '<h3>Dùng máy quản trò</h3><p class="muted">Thêm người không có điện thoại. Vai và lượt của họ sẽ hiện lần lượt trên máy này.</p><label>Tên người chơi<input id="offline-name" maxlength="40" autocomplete="off" placeholder="Tên người chơi"></label>';
  } else if (modal === 'deck') {
    inner = `<div class="modal-title"><h3>Bộ vai</h3>${button('preset', icon('shuffle') + ' Gợi ý', false, 'class="text-button"')}</div><p class="muted">Số thẻ cần bằng số người chơi.</p>${factionRoleRows(catalog.map(r => ({ id: r.id, count: deck[r.id] ?? 0, html: `<label data-ui-key="deck-row-${r.id}" class="${deck[r.id] > 0 ? 'deck-selected' : ''}">${esc(r.name)}<input id="deck-${r.id}" data-role="${r.id}" ${busy || pending ? 'disabled' : ''} type="number" min="0" max="30" value="${deck[r.id] ?? 0}" inputmode="numeric"></label>` })), 'thẻ đã chọn', true)}`;
  } else if (modal === 'reset-game' && snapshot?.viewer === 'moderator' && snapshot.game) {
    inner = `<h3>Làm mới ván chơi?</h3><p>Giữ nguyên người chơi, thứ tự chỗ ngồi và bộ vai. Xóa vai đã chia, diễn biến và kết quả để chuẩn bị chia lại. Người đã rời được bỏ khỏi bàn.</p><div class="exit-actions">${button('modal-open', 'Hủy', false, 'class="secondary" data-modal="tools"')}${button('confirm-reset', 'Làm mới ván', false, 'class="danger"')}</div>`;
  } else if (modal === 'settings' && snapshot?.viewer === 'moderator' && !snapshot.game) {
    inner = `<h3>Cài đặt</h3>${localMode ? `<label class="check"><input id="local-simplified" type="checkbox" ${localSimplified ? 'checked' : ''}><span>Tối giản thao tác ban đêm<small>Quản trò nhập trực tiếp. Một lựa chọn chung cho bầy Sói.</small></span></label>` : ''}<label class="check"><input id="witch-sees-bite" type="checkbox" ${lobbySettings.witchSeesBite ? 'checked' : ''}><span>Phù thủy thấy nạn nhân<small>Tắt: Phù thủy chỉ chọn dùng/giữ thuốc, máy chủ cứu không lộ tên. Người Bảo vệ chặn cắn luôn được giấu.</small></span></label><label class="check"><input id="hunter-active-shot" type="checkbox" ${lobbySettings.hunterActiveShot ? 'checked' : ''}><span>Thợ săn bắn chủ động<small>Tắt: ghim mỗi đêm, chết đêm thì kéo mục tiêu chết theo. Bật: một phát cả ván; trúng phe Sói thì sống, bắn sai thì cả hai chết.</small></span></label><h4>Đồng hồ ban ngày</h4><div class="timer-fields">${DAY_PHASES.map(p => `<label>${DAY_PHASE_NAMES[p]} (giây)<input id="day-${p}" type="number" min="5" max="3600" value="${lobbySettings.dayTimers[p]}" inputmode="numeric"></label>`).join('')}</div><h4>Bỏ phiếu trắng</h4><label>Số ngày được không loại ai (0–30)<input id="skip-vote-days" type="number" min="0" max="30" value="${lobbySettings.skipVoteDays}" inputmode="numeric"></label><p class="muted">0 = sáng nào cũng phải vote loại một người. Hết lượt bỏ qua, mỗi sáng phải chọn một người để vote.</p>`;
  } else if (modal === 'rolepeek' && g) {
    inner = roleInfo(g);
  } else if (modal === 'inspect-result' && g) {
    const last = unseenInspection(g);
    const wolf = Boolean(last?.data.isWolf);
    if(last && last.type!=='inspection') return modalShell(`<h3>Kết quả năng lực</h3><p class="big-note">${esc(eventText(last))}</p>${button('inspect-ack','Đã rõ',false,'class="primary wide"')}`);
    inner = last ? `<div class="inspect-result ${wolf ? 'wolf' : 'safe'}"><span class="eyebrow">KẾT QUẢ SOI · ĐÊM ${last.night}</span><p class="inspect-target">${esc(name(last.data.target))}</p><div class="inspect-illustration" aria-hidden="true">${wolfEmblem}</div><p class="inspect-verdict">${wolf ? 'Là phe Sói' : 'Không phải phe Sói'}</p><p class="muted">Chỉ mình bạn biết — giữ bí mật.</p></div>${button('inspect-ack', 'Đã rõ', false, 'class="primary wide"')}` : '<p class="empty">Không có kết quả soi mới.</p>';
  } else if (modal === 'local-inspect-result' && gm) {
    const last = gm.events.find(e => e.id === snapshot?.room.inspection);
    inner = last?.type === 'inspection' ? `<div class="inspect-result ${last.data.isWolf ? 'wolf' : 'safe'}"><span class="eyebrow">KẾT QUẢ SOI · ĐÊM ${last.night}</span><p class="inspect-target">${esc(name(last.data.target))}</p><div class="inspect-illustration" aria-hidden="true">${wolfEmblem}</div><p class="inspect-verdict">${last.data.isWolf ? 'Là phe Sói' : 'Không phải phe Sói'}</p></div>` : `<p class="big-note">${last ? esc(eventText(last)) : 'Kết quả đã được lưu.'}</p>`;
    inner += button('simple-ack', 'Đã rõ · Vai tiếp', false, 'class="primary wide"');
  } else if (modal === 'private' && g) {
    inner = `${g.pack ? `<h3>Lựa chọn của bầy</h3><ul class="pack-list">${g.pack.map(p => `<li><strong>${esc(name(p.id))}</strong><span>${p.choice ? esc(describeAction(p.choice)) : 'Chưa chọn'}</span></li>`).join('')}</ul>` : ''}${g.messages.slice(-8).map(e => `<p class="private-message">${esc(eventText(e))}</p>`).join('') || '<p class="empty">Chưa có lời nhắn riêng.</p>'}`;
  } else if (modal === 'publiclog' && g) {
    inner = g.announcements.slice(-6).map(e => `<p class="public-line">${esc(eventText(e))}</p>`).join('') || '<p class="empty">Chưa có công bố.</p>';
  } else if (modal === 'packchat' && g) {
    inner = `<h3>Chat bầy Sói</h3><div class="chat-messages">${g.packChat.items.map(m => `<p class="chat-line ${m.mine ? 'mine' : ''}"><strong>${esc(m.mine ? 'Bạn' : m.from)}</strong><span>${esc(m.text)}</span></p>`).join('') || '<p class="empty">Chưa có tin nhắn.</p>'}</div>${g.packChat.open ? `<div class="chat-input"><input id="chat-text" maxlength="200" placeholder="Nhắn bầy…" autocomplete="off">${button('chat-send', 'Gửi')}</div>` : '<p class="muted">Chat chỉ gửi được khi bầy đang thức.</p>'}`;
  } else if (modal === 'feed' && gm) {
    const latest = gm.events.filter(e => e.type === 'action-confirmed' && e.night === gm.night).slice(-8).reverse();
    inner = latest.map(e => `<p class="feed-line">↳ ${esc(eventText(e))}</p>`).join('') || '<p class="empty">Chờ người chơi gửi.</p>';
  } else if (modal === 'secret' && gm) {
    const nightFilter = `<label class="notebook-filter">Đêm<select id="notebook-night"><option value="all" ${notebookNight === 'all' ? 'selected' : ''}>Tất cả</option>${Array.from({ length: gm.night }, (_, i) => i + 1).reverse().map(n => `<option value="${n}" ${String(n) === notebookNight ? 'selected' : ''}>Đêm ${n}</option>`).join('')}</select></label>`;
    if (notebookTab === 'players') {
      inner = `<p class="muted notebook-rules">${gm.rulesVersion === 'classic-core-v8' ? 'Ván cũ giữ luật v8.' : gm.rulesVersion === 'classic-core-v9' ? 'Ván cũ giữ luật v9 (không có chat bầy).' : gm.rulesVersion === 'classic-core-v10' ? 'Ván cũ giữ luật v10 (không có đồng hồ).' : `Phù thủy ${gm.settings?.witchSeesBite ? 'được xem nạn nhân (trừ người được Bảo vệ chặn)' : 'không xem nạn nhân · dùng thuốc không lộ tên'}.`}</p><ul class="secret-roster">${gm.players.map((p, i) => `<li class="${p.alive ? '' : 'dead'}"><span class="seat-no">${String(i + 1).padStart(2, '0')}</span><div><strong>${esc(p.name)}</strong><small>${esc(roleName(p.role))}</small>${gm.step==='day'&&gm.rulesVersion==='classic-core-v14'?`<small>${esc(votingText(playerViewForVoting(gm,p.id)))}</small>`:''}</div><span>${snapshot?.room.members.find(m => m.id === p.id)?.left ? 'Đã rời' : p.alive ? 'Sống' : !gm.publicDead.includes(p.id) ? 'Chưa công bố' : 'Đã chết'}</span></li>`).join('')}</ul>`;
    } else if (notebookTab === 'chat') {
      const messages = (gm.chat ?? []).filter(m => notebookNight === 'all' || String(m.night) === notebookNight);
      inner = `${nightFilter}${messages.map(m => `<p class="log-entry"><small>Đêm ${m.night} · ${esc(name(m.from))}</small><span>${esc(m.text)}</span></p>`).join('') || '<p class="empty">Chưa có chat trong mục này.</p>'}`;
    } else {
      const events = gm.events.filter(e => notebookNight === 'all' || String(e.night) === notebookNight);
      inner = `${nightFilter}${[...events].reverse().map(e => `<p class="log-entry"><small>Đêm ${e.night}</small><span>${esc(eventText(e))}</span></p>`).join('') || '<p class="empty">Chưa có diễn biến trong mục này.</p>'}`;
    }
  } else if (modal === 'catalog') {
    const selected = snapshot?.viewer === 'moderator' && !snapshot.game ? deck : snapshot?.deck ?? {};
    const rows = Object.entries(selected).filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1] || roleName(a[0]).localeCompare(roleName(b[0]), 'vi'))
      .map(([id, count]) => ({ id, count, html: `<button type="button" class="role-row" data-action="modal-open" data-modal="role:${esc(id)}"><span>${esc(roleName(id))}</span><b>×${count}</b></button>` }));
    inner = `<h3>Vai trong ván này</h3>${rows.length ? `<p class="muted">Bấm vào vai để xem ảnh và mô tả.</p>${factionRoleRows(rows, 'thẻ')}` : '<p class="empty">Quản trò chưa chọn bộ vai.</p>'}${button('modal-open', `Vai đã hỗ trợ (${catalog.length}/${ROLE_CATALOG.length}) ` + icon('chevron'), false, 'class="secondary wide" data-modal="allroles"')}`;
  } else if (modal === 'allroles') {
    const roles = [...catalog].sort((a, b) => (libraryRoleRank.get(a.id) ?? Infinity) - (libraryRoleRank.get(b.id) ?? Infinity) || a.name.localeCompare(b.name, 'vi'));
    const missing = roleLibraryMissing();
    inner = `<h3>Vai đã hỗ trợ (${roles.length}/${ROLE_CATALOG.length})</h3><p class="muted">Trong mỗi phe, các vai quen thuộc được xếp trước.</p>${factionRoleRows(roles.map(r => ({ id: r.id, count: 1, html: `<button type="button" class="role-row" data-action="modal-open" data-modal="role:${esc(r.id)}"><span>${esc(r.name)}</span>${icon('chevron')}</button>` })), 'vai')}${missing.length ? `<h3>Thư viện nguồn — chưa hỗ trợ (${missing.length})</h3><p class="muted">Có trong dữ liệu nguồn nhưng chưa thể chơi.</p><p class="library-missing">${missing.map(r => `<span class="library-role"><span>${esc(r.displayName)}</span><em>Chưa hỗ trợ</em></span>`).join('')}</p>` : ''}`;
  } else if (modal.startsWith('role:')) {
    const id = modal.slice(5);
    const r = roleById(id);
    const count = (snapshot?.viewer === 'moderator' && !snapshot.game ? deck : snapshot?.deck)?.[id];
    inner = `<div class="modal-role"><div class="card-hero">${cardImage(id, r?.name ?? id)}</div><h3>${esc(r?.name ?? id)}</h3>${count ? `<p class="team-chip">×${count} người</p>` : ''}<p class="role-desc">${esc(r?.description ?? '')}</p></div>`;
  } else return '';
  return modalShell(inner);
}
const sessionStorageKey = (gameId: string) => `ma-soi:role-read:${gameId}`;
// Kết quả soi lưu riêng từng người, chỉ xác nhận bằng nút Đã rõ.
const inspectionSeenKey = (gameId: string, playerId: string) => `ma-soi:insp:${gameId}:${playerId}`;
function unseenInspection(g: Extract<Snapshot, { viewer: 'player' }>['game']) {
  if (!g) return null;
  let seen = 0;
  try { seen = Number(sessionStorage.getItem(inspectionSeenKey(g.gameId, g.self.id)) ?? 0); } catch {}
  return latestAbilityResult(g.messages,seen);
}
function markInspectionSeen(g: Extract<Snapshot, { viewer: 'player' }>['game']) {
  if (!g) return;
  const last = latestAbilityResult(g.messages);
  if (last) { try { sessionStorage.setItem(inspectionSeenKey(g.gameId, g.self.id), String(last.id)); } catch {} }
}
// Chat bầy: đang ở bước bầy thì khung nhắn hiện trực tiếp; đã khép thì lịch sử nằm trong pop-up.
function chatPanel(g: Extract<Snapshot, { viewer: 'player' }>['game']): string {
  if (!g) return '';
  const c = g.packChat;
  if (!c.open && !c.items.length) return '';
  const preview = c.items.slice(-2).map(m => `<p class="chat-line"><strong>${esc(m.mine ? 'Bạn' : m.from)}</strong><span>${esc(m.text)}</span></p>`).join('');
  return `<div class="pack-chat preview">${foldTrigger('packchat', 'Chat bầy Sói', String(c.items.length))}${preview}</div>`;
}
// Overlay chỉ hiện lần đầu nhận vai; sau khi xác nhận, vai luôn ẩn sau nút xem.
function roleInfo(g: Extract<Snapshot, { viewer: 'player' }>['game']) {
  if (!g) return '';
  const self = g.self;
  return `<div class="modal-role"><div class="card-hero">${cardImage(self.role, roleName(self.role))}</div><h3>${esc(roleName(self.role))}</h3><p class="team-chip">${({wolves:'Phe Sói',lovers:'Phe Tình nhân',village:'Phe Dân',vampires:'Phe Ma cà rồng',cult:'Giáo phái',independent:'Thắng riêng'})[self.team]}</p>${self.powers?.length?`<p class="muted">Kỹ năng đã nhận: ${self.powers.map(roleName).map(esc).join(', ')}.</p>`:''}${self.role === 'hunter' ? `<p class="muted">${esc(self.description)}</p>` : ''}<p class="role-desc">${esc(roleById(self.role)?.description ?? '')}</p></div>`;
}
function roleRevealOverlay(g: Extract<Snapshot, { viewer: 'player' }>['game']) {
  if (!g || modal === 'exit-room') return '';
  const preparing = snapshot?.room.phase === 'ready';
  if (!(snapshot?.room.local && preparing) && (snapshot?.room.readyPlayerIds.includes(g.self.id) || !preparing && sessionStorage.getItem(sessionStorageKey(g.gameId)))) return '';
  return `<div class="overlay" id="role-overlay"><div class="overlay-card">${roleInfo(g)}${button('role-read', 'Tôi đã đọc và sẵn sàng', false, 'class="primary wide"')}${!snapshot?.controller ? button('exit-room', 'Rời phòng', false, 'class="quiet"') : ''}</div></div>`;
}
function wakeOverlay(s: Snapshot | null): string {
  if (s?.viewer !== 'player' || s.controller || modal === 'exit-room' || s.room.phase !== 'playing' || !s.game?.turn || s.game.turn.awake) return '';
  return `<div class="overlay wake-screen" id="wake-overlay" role="alertdialog" aria-modal="true" aria-labelledby="wake-title" aria-describedby="wake-description"><div class="wake-content"><span class="wake-icon" aria-hidden="true">${icon('eye')}</span><span class="eyebrow">${s.game.phase === 'night' ? `Đêm ${s.game.night}` : 'Ban ngày'}</span><h2 id="wake-title">Đến lượt bạn</h2><p id="wake-description">Quản trò đang gọi bạn.</p>${notice ? `<p class="wake-notice" role="status">${esc(notice)}</p>` : ''}${button('wake', 'Tôi đã thức dậy', false, 'class="primary wide"')}${button('exit-room', 'Rời phòng', false, 'class="quiet"')}</div></div>`;
}
function rolePeek(g: Extract<Snapshot, { viewer: 'player' }>['game']) {
  if (!g) return '';
  return foldTrigger('rolepeek', 'Vai của bạn');
}
function deckSummary() {
  const selected = Object.entries(deck).filter(([, count]) => count > 0);
  return selected.length ? selected.map(([id, count]) => `<div class="deck-summary-row"><span>${esc(roleName(id))}</span><b>×${count}</b></div>`).join('')
    : '<p class="deck-empty">Chưa chọn vai</p>';
}
function lobby(s: Snapshot) {
  const owner = s.viewer === 'moderator', count = s.room.members.filter(m => !m.left).length;
  const table = roundTable(s.room.members.map(m => ({ id: m.id, name: m.name, alive: true })), {
    draggable: owner,
    hub: count === 0 ? `${icon('users')}<span>Chờ người chơi</span>` : `<strong>${count}</strong><span>người chơi</span>`,
  });
  const stage = `<section class="table-stage" data-ui-key="table-stage"><div class="section-heading"><h2>Bàn chơi</h2>${tableExpandButton()}<div class="stage-tools"><span class="live-label">${count ? 'Đang chuẩn bị' : 'Chưa có người chơi'}</span>${owner ? button('modal-open', icon('user') + '<span>Thêm người offline</span>', false, 'class="text-button" data-modal="offline-add" aria-label="Thêm người không có điện thoại"') : ''}</div></div>${table}<div class="table-caption">${owner && count > 1 ? 'Kéo để đổi chỗ ngồi' : count ? 'Chờ quản trò bắt đầu' : 'Chia sẻ mã phòng để mời mọi người'}</div></section>`;
  if (!owner) {
    const roles = Object.entries(s.deck ?? {}).filter(([, quantity]) => quantity > 0)
      .sort((a, b) => b[1] - a[1] || roleName(a[0]).localeCompare(roleName(b[0]), 'vi'));
    return `${stage}<section class="setup-panel"><div class="setup-heading"><h2>Vai trong ván này</h2></div>${roles.length ? `<div class="role-rows">${roles.map(([id, quantity]) => `<button type="button" class="role-row" data-action="modal-open" data-modal="role:${esc(id)}"><span>${esc(roleName(id))}</span><b>×${quantity}</b></button>`).join('')}</div>` : '<p class="muted">Quản trò chưa lưu bộ vai.</p>'}<p class="muted">Đang chờ quản trò chia vai.</p></section>`;
  }
  return `${stage}<aside class="setup-panel"><div class="setup-heading"><div><span class="eyebrow">TRƯỚC KHI BẮT ĐẦU</span><h2>Bộ vai</h2></div>${modalButton('deck', 'edit', 'Chỉnh bộ vai')}</div><div class="card-stack" aria-hidden="true"><i>${moon}</i><i>${moon}</i><i>${moon}</i></div><div id="deck-summary" class="deck-summary">${deckSummary()}</div><div class="setup-footer"><p id="deck-total" class="deck-total"></p>${button('start', `Chia vai ${icon('arrow')}`, count < 3, 'class="primary wide start-button"')}<p id="start-hint" class="start-hint"></p></div></aside>`;
}
function hubLabel(step: string, night: number) { return step === 'ended' ? 'Kết thúc' : step === 'day' ? 'Ban ngày' : step === 'review' ? 'Chưa công bố' : `Đêm ${night}`; }
function turnInstruction(ability: string, hunterMode?: string | null) {
  const instructions: Record<string, string> = {
    guard: 'Chọn người bạn muốn bảo vệ đêm nay rồi xác nhận.',
    seer: 'Chọn một người để soi phe, rồi đọc kết quả bí mật.',
    aura_seer: 'Chọn một người để kiểm tra năng lực đặc biệt.',
    mystic_seer: 'Chọn một người để xem vai của họ.',
    paranormal_investigator: 'Chọn người để điều tra cùng hai người ngồi bên cạnh.',
    wolves: 'Thảo luận với bầy, chọn mục tiêu trên bàn rồi xác nhận.',
    witch: 'Chọn dùng hoặc giữ thuốc cứu và thuốc độc rồi xác nhận.',
    cupid: 'Chọn hai người để ghép đôi rồi xác nhận.',
    mentalist: 'Chọn hai người để so sánh phe rồi xác nhận.',
    doppelganger: 'Chọn người bạn muốn nhân bản rồi xác nhận.',
    wild_child: 'Chọn hình mẫu của bạn rồi xác nhận.',
    dire_wolf: 'Chọn người để liên kết: bạn sẽ chết theo nếu người đó chết.',
    virginia_woolf: 'Chọn người để liên kết: người đó sẽ chết theo nếu bạn chết.',
    alpha_wolf: 'Chọn người để chuyển hóa hoặc giữ lại quyền rồi xác nhận.',
    hunter: hunterMode === 'passive' ? 'Ghim một người đêm nay: nếu bạn chết trong đêm, người đó chết theo.' : 'Chọn người để bắn hoặc giữ lại phát bắn rồi xác nhận.',
  };
  return instructions[ability] ?? 'Chọn mục tiêu trên bàn rồi bấm Xác nhận.';
}
function actionForm(g: NonNullable<Extract<Snapshot, { viewer: 'player' }>['game']>): string {
  const t = g.turn!;
  if(t.power) {
    const p=t.power;
    if(p.input==='note')return '<label>Gợi ý một từ<input id="power-note" maxlength="40" autocomplete="off"></label><p class="muted">Không dùng tên hoặc viết tắt tên. Quản trò duyệt trước khi công khai.</p>';
    if(p.input==='prediction')return `<label>Dự đoán phe thắng<select id="power-choice">${p.choices!.map(c=>`<option value="${c}">${esc(winnerText(c))}</option>`).join('')}</select></label>`;
    if(p.input==='draw')return '<p class="muted">Xác nhận bốc vai thật. Vai được lưu lại và không thể bốc lại.</p>';
    const fields=p.count===2?['first','second']:p.count===1?['target']:[];
    return `<p class="muted">${p.kind==='leprechaun'?'Chọn một nạn nhân cắn, rồi chọn người thay ở bên cạnh; có thể giữ nguyên.':p.input==='ack'?'Xác nhận để nhận thông tin riêng.':'Bấm avatar để chọn người.'}</p>${fields.map((id,i)=>`<label>${p.count===2?'Người '+(i+1):'Mục tiêu'}<select id="${id}">${options(t.targets)}</select></label>`).join('')}${p.allowPass?'<label class="check"><input id="ability-pass" type="checkbox">Giữ lại năng lực đêm nay</label>':''}`;
  }
      let form = `<label>${t.ability === 'hunter' && g.hunterMode === 'passive' ? 'Ghim một người đêm nay' : 'Chọn một người'}<select id="target">${options(t.targets)}</select></label>`;
      if (t.ability === 'hunter' && g.hunterMode === 'active') form = `<p class="muted">Một phát trong cả ván. Bắn sai phe Sói thì cả hai chết.</p><label>Bắn ai đêm nay?<select id="target">${options(t.targets, 'Giữ lại phát bắn')}</select></label>`;
      if (t.ability === 'wolves') {
        const plan = t.wolfPlan!;
        form = plan.maxTargets === 0 ? '<p class="big-note">Đêm nay bầy không cắn.</p>' : `<p class="big-note">Chọn ${plan.minTargets === plan.maxTargets ? plan.minTargets : `${plan.minTargets}–${plan.maxTargets}`} nạn nhân.${plan.adjacentPair ? ' Hai nạn nhân phải ngồi cạnh nhau.' : ''}</p>${form}${plan.maxTargets > 1 ? `<label>Người thứ hai<select id="target2">${options(t.targets, plan.minTargets > 1 ? 'Chọn người thứ hai' : 'Chỉ chọn một người')}</select></label>` : ''}${plan.canOfferSacrifice || plan.sacrificeTarget ? `<label class="check"><input id="sacrifice" type="checkbox">${plan.canOfferSacrifice ? 'Tự đề nghị hy sinh' : `Đồng ý hy sinh ${esc(name(plan.sacrificeTarget))}`}</label>` : ''}`;
      } else if (t.ability === 'witch') {
        const info = g.witchInfo!;
        form = `<div class="potions"><span><strong>${g.self.resources.heal}</strong> cứu</span><span><strong>${g.self.resources.poison}</strong> độc</span></div><div class="bite-note">${info.visibility === 'hidden' ? '<strong>Nạn nhân được giữ kín.</strong><p>Bạn chỉ chọn dùng hoặc giữ thuốc. Dùng là tốn một bình, kể cả không có nạn nhân.</p>' : info.visibility === 'unavailable' ? 'Bạn đã hết thuốc cứu.' : g.biteTargets.length ? `<span class="eyebrow">NẠN NHÂN BỊ CẮN</span><strong>${g.biteTargets.map(name).map(esc).join(', ')}</strong>` : 'Không có nạn nhân được báo đêm nay.'}</div><label class="check"><input id="heal" type="checkbox" ${!info.canHeal ? 'disabled' : ''}><span>Dùng thuốc cứu</span></label>${g.biteTargets.length > 1 ? `<label>Cứu một người<select id="healTarget">${options(g.biteTargets)}</select></label>` : ''}<label>Dùng thuốc độc<select id="poison" ${!g.self.resources.poison ? 'disabled' : ''}>${options(t.targets, 'Giữ lại thuốc độc')}</select></label>`;
      } else if (t.ability === 'cupid' || t.ability === 'mentalist') form = `<label>Người thứ nhất<select id="first">${options(t.targets)}</select></label><label>Người thứ hai<select id="second">${options(t.targets)}</select></label>`;
      else if (t.ability === 'alpha_wolf') form = `<label>Chuyển hóa<select id="convert">${options(t.targets, 'Không dùng quyền')}</select></label>`;
  return `<p class="turn-instruction">${esc(turnInstruction(t.ability, g.hunterMode))}</p>${form}`;
}
function gmNotesHtml(){
 if(snapshot?.viewer!=='moderator'||!snapshot.game?.extra)return '';
 return snapshot.game.extra.notes.filter(n=>n.approved===null).map(n=>`<div class="notice"><p>Con ma gửi: <strong>${esc(n.text)}</strong></p>${button('hint-approve','Duyệt',false,`data-player-id="${esc(n.actor)}"`)}${button('hint-reject','Từ chối',false,`data-player-id="${esc(n.actor)}"`)}</div>`).join('');
}
function simpleView(g: NonNullable<Extract<Snapshot, { viewer: 'moderator' }>['game']>) {
  const ids = actors(g);
  const id = g.step === 'wolves' ? ids.find(id => g.players.find(p => p.id === id)?.role === 'wolf_cub') ?? ids[0] : ids.find(id => !Object.hasOwn(g.actions, id));
  return id ? playerView(g, id) : null;
}
function player(s: Extract<Snapshot, { viewer: 'player' }>) {
  const g = s.game!, t = g.turn;
  if (s.room.phase === 'ready') return `<section class="table-stage" data-ui-key="table-stage"><div class="section-heading"><h2>Bàn chơi</h2>${tableExpandButton()}<span class="live-label">Sẵn sàng ${s.room.readyPlayerIds.length}/${s.room.members.filter(m => !m.left).length}</span></div>${roundTable(g.players, { hub: 'Chờ bắt đầu', readyPlayers: s.room.readyPlayerIds })}</section><section class="player-controls"><div class="rest-box">${icon('check')}<h3>Bạn đã sẵn sàng</h3><p class="muted">Chờ quản trò bắt đầu.</p></div></section><nav class="game-utilities">${foldTrigger('rolepeek', 'Vai của bạn')}</nav>`;

  const alive = g.players.find(p => p.id === s.me.id)?.alive;
  const dayInfo = g.phase === 'day' && g.dayPhase ? `<p class="day-note">${esc(DAY_PHASE_NAMES[g.dayPhase] ?? g.dayPhase)}</p>${dayClockHtml(g.dayPhase, g.dayEndsAt ?? null)}` : '';
  let controls = g.phase === 'night' && alive
    ? `<div class="rest-box">${moon}<p>Mời bạn đi ngủ.<br><small>Quản trò sẽ gọi vai của bạn.</small></p></div>`
    : `<div class="rest-box"><p>${g.phase === 'ended' ? esc(winnerText(g.winner!)) : alive ? 'Cả làng thức dậy.' : 'Bạn đã rời cuộc chơi.'}</p>${dayInfo}${g.phase==='day'&&g.self.voting?`<p class="day-note">${esc(votingText(g.self.voting))}</p>`:''}</div>`;
  if (t) {
    if (!t.awake && !s.controller) controls = '<p class="muted">Quản trò đang gọi bạn.</p>';
    else if (t.sleepReady && editingWolfStep !== t.stepId) controls = `<div class="rest-box sent"><span class="receipt">ĐÃ GỬI</span><p>${esc(describeAction(t.action!))}</p><p class="muted">${t.ability === 'hunter' && !g.hunterMode ? 'Chờ công bố kết quả.' : 'Mời bạn đi ngủ.'}</p>${t.ability === 'wolves' ? button('edit-wolf', 'Đổi lựa chọn', false, 'class="quiet"') : ''}</div>`;
    else {
      const form = actionForm(g);
      controls = `<div class="action-box">${t.submitted ? `<p class="pack-status">Đã gửi: ${esc(describeAction(t.action!))}${t.action?.type === 'sacrifice' ? ' · chờ quản trò xác nhận' : ' · chờ bầy thống nhất'}</p>` : ''}${form}${button('submit', t.submitted ? 'Cập nhật lựa chọn' : 'Xác nhận', false, 'class="primary wide"')}</div>`;
    }
  }
  return `<section class="table-stage" data-ui-key="table-stage"><div class="section-heading"><h2>Bàn chơi</h2>${tableExpandButton()}<span class="live-label">${g.players.filter(p => p.alive).length}/${g.players.length} còn sống</span></div>${roundTable(g.players, { hub: g.phase === 'ended' ? 'Kết thúc' : g.phase === 'day' ? 'Ban ngày' : `Đêm ${g.night}`, recentDeaths: latestNightDeaths(g.announcements) })}</section><section class="player-controls">${controls}${chatPanel(g)}</section><nav class="game-utilities" aria-label="Thông tin ván">${foldTrigger('rolepeek', 'Vai của bạn')}${foldTrigger('private', 'Tin riêng', g.messages.length ? String(g.messages.length) : '')}${foldTrigger('publiclog', 'Diễn biến')}</nav>`;
}
function offlineQueue(s: Extract<Snapshot, { viewer: 'moderator' }>): string {
  if (s.room.simplified && s.room.phase !== 'ready') return '';
  const offline = s.room.members.filter(m => m.offline && !m.left && (s.room.phase === 'ready' || s.game?.progress.some(p => p.id === m.id)));
  if (!offline.length) return '';
  return `<div class="offline-queue"><h4>Dùng máy quản trò</h4>${offline.map(m => {
    const ready = s.room.readyPlayerIds.includes(m.id);
    const submitted = s.game?.progress.find(p => p.id === m.id)?.submitted;
    return button('control-offline', `${icon(ready && s.room.phase === 'ready' || submitted ? 'check' : 'user')}<span>${esc(m.name)}</span><small>${s.room.phase === 'ready' ? s.room.local ? 'Xem vai' : ready ? 'Đã sẵn sàng' : 'Xem vai' : submitted ? s.game?.step === 'wolves' ? 'Đã gửi · sửa' : 'Đã gửi' : 'Thao tác'}</small>`, !s.room.local && s.room.phase === 'ready' && ready, `class="offline-person" data-player-id="${m.id}"`);
  }).join('')}</div>`;
}
function moderator(s: Extract<Snapshot, { viewer: 'moderator' }>) {
  const g = s.game!; let controls = '';
  if (s.room.phase === 'ready') {
    const ready = s.room.readyPlayerIds.length, total = s.room.members.filter(m => !m.left).length;
    return `<section class="table-stage" data-ui-key="table-stage"><div class="section-heading"><h2>Bàn chơi</h2>${tableExpandButton()}<span class="live-label">Sẵn sàng ${ready}/${total}</span></div>${roundTable(g.players, { hub: `<strong>${ready}/${total}</strong><span>sẵn sàng</span>`, readyPlayers: s.room.readyPlayerIds })}</section><section class="moderator-controls"><span class="eyebrow">ĐÃ CHIA VAI</span><h2>${s.room.local ? 'Sẵn sàng bắt đầu' : 'Chờ sẵn sàng'}</h2><p class="muted">${s.room.local ? 'Có thể đưa máy lần lượt để xem vai, rồi bấm Bắt đầu khi cả bàn sẵn sàng.' : 'Mọi người đọc vai và xác nhận trên máy của mình.'}</p><p class="ready-count">Sẵn sàng <strong>${ready}/${total}</strong></p>${offlineQueue(s)}${button('begin', `Bắt đầu ${icon('arrow')}`, ready !== total || total === 0, 'class="primary wide"')}</section>`;
  }

  const done = g.progress.filter(p => p.submitted).length;
  const allDone = g.progress.length > 0 && done === g.progress.length;
  if (g.step === 'review') controls = g.resolved ? `<div class="review-result"><span class="eyebrow">CHƯA CÔNG BỐ</span><p class="big-note">${g.pendingDeaths.length ? `Người chết: ${g.pendingDeaths.map(name).map(esc).join(', ')}.` : 'Đêm nay không ai chết.'}</p></div>${button('publish', 'Gọi cả làng thức dậy', false, 'class="primary wide"')}` : button('resolve', 'Tổng kết diễn biến đêm', false, 'class="primary wide"');
  else if (g.step === 'day') {
    const skipBudget = ['classic-core-v12', 'classic-core-v13', 'classic-core-v14'].includes(g.rulesVersion) ? g.settings?.skipVoteDays : undefined;
    const skipLeft = skipBudget === undefined ? null : skipBudget - (g.daySkipsUsed ?? 0);
    const canSkip = skipLeft === null || skipLeft > 0;
    const verdictBlock = g.verdictDone ? button('nextNight', 'Bắt đầu đêm tiếp', false, 'class="primary wide"')
      : `<label>Phán quyết<select id="verdict">${options(g.players.filter(p => p.alive).map(p => p.id), canSkip ? 'Không loại ai' : undefined)}</select></label>${skipLeft !== null ? `<p class="muted">${canSkip ? `Còn ${skipLeft} ngày được không loại ai.` : 'Ngày này phải vote loại một người.'}</p>` : ''}${button('verdict', 'Chốt phán quyết', false, 'class="primary wide"')}`;
    const clockRunning = !!g.dayPhaseEndsAt;
    controls = `${dayPhaseBar(g.dayPhase ?? null)}${dayClockHtml(g.dayPhase ?? null, g.dayPhaseEndsAt ?? null, true)}<div class="day-buttons">${button('phase-start', clockRunning ? 'Bấm lại' : 'Bắt đầu giờ', !g.dayPhase, 'class="secondary wide"')}${button('phase-next', 'Pha tiếp', !g.dayPhase)}</div>${g.extra&&g.extra.verdictsRemaining>1?'<p class="day-note">Hôm nay còn hai phán quyết treo cổ.</p>':''}${verdictBlock}`;
  }
  else if (g.step === 'ended') controls = `<div class="positive">${esc(winnerText(g.winner!))}</div>`;
  else controls = `<div class="progress-head"><span>${done}/${g.progress.length} đã gửi</span></div><ul class="progress-list">${g.progress.map(p => `<li class="${p.submitted ? 'complete' : ''}"><strong>${esc(name(p.id))}</strong><small>${p.submitted ? esc(describeAction(g.actions[p.id])) : p.awake ? 'Đang chọn' : 'Chờ thức'}</small></li>`).join('') || '<li class="empty">Không ai cần hành động — chốt để qua.</li>'}</ul>${allDone && g.step !== 'wolves' && MODERATOR_SCRIPTS[g.step].sleep ? `<p class="sleep-cue">“${esc((g.step === 'hunter' && ['classic-core-v13','classic-core-v14'].includes(g.rulesVersion) ? 'Thợ săn đi ngủ.' : MODERATOR_SCRIPTS[g.step].sleep))}”</p>` : ''}${button('advance', 'Gọi vai tiếp', !g.progress.every(p => p.submitted), 'class="primary wide"')}`;
  if (s.room.simplified && !['day', 'review', 'ended'].includes(g.step)) {
    const view = simpleView(g);
    controls = s.room.inspection != null ? button('local-result', 'Xem kết quả soi', false, 'class="primary wide"')
      : view ? `<p class="muted">${g.step === 'wolves' ? 'Nhập lựa chọn chung của bầy Sói.' : esc(name(view.self.id))}</p>${actionForm(view)}${button('simple-submit', 'Xác nhận', false, 'class="primary wide"')}` : '';
  }
  return `<section class="panel moderator-controls"><span class="eyebrow">${g.step === 'ended' ? 'KẾT THÚC' : g.step === 'day' ? 'BAN NGÀY' : 'ĐÊM ' + g.night}</span><h2>${esc(g.step === 'review' ? 'Tổng kết đêm' : g.step === 'day' ? 'Cả làng thảo luận' : g.step === 'wolves' ? 'Bầy Sói' : g.step === 'ended' ? 'Kết thúc' : roleName(g.step))}</h2><blockquote>${esc(s.room.simplified && !['day', 'review', 'ended'].includes(g.step) ? ({ guard: 'Bảo vệ chọn ai?', seer: 'Tiên tri soi ai?', wolves: 'Bầy Sói cắn ai?', witch: 'Phù thủy dùng thuốc nào?', hunter: ['classic-core-v13','classic-core-v14'].includes(g.rulesVersion) ? g.settings?.hunterActiveShot ? 'Thợ săn bắn ai, hay giữ lại phát bắn?' : 'Thợ săn ghim ai đêm nay?' : 'Thợ săn bắn ai?' } as Record<string, string>)[g.step] ?? `Nhập lựa chọn của ${roleName(g.step)}.` : g.step === 'hunter' && ['classic-core-v13','classic-core-v14'].includes(g.rulesVersion) ? (g.settings?.hunterActiveShot ? 'Thợ săn thức dậy, chọn bắn hoặc giữ lại phát bắn duy nhất.' : 'Thợ săn thức dậy, ghim một người cho đêm nay rồi đi ngủ.') : MODERATOR_SCRIPTS[g.step].wake)}</blockquote>${controls}${g.step==='wolves'&&g.rulesVersion==='classic-core-v14'&&g.players.some(p=>p.alive&&(p.role==='bogeyman'||p.role==='frankenstein'&&g.extra?.players[p.id]?.powers?.includes('bogeyman')))?button('wolf-timeout','Bầy Sói quá giờ',false,'class="text-button"'):''}${gmNotesHtml()}${g.rulesVersion==='classic-core-v14'&&g.players.some(p=>p.initialRole==='mason'||p.alive&&p.role==='teen_wolf')?`<details><summary>Vi phạm luật vai</summary><label>Người vi phạm<select id="penalty-player">${options(g.players.filter(p=>p.alive&&(p.role==='teen_wolf'||g.players.some(v=>v.initialRole==='mason'))).map(p=>p.id))}</select></label>${button('rule-penalty','Xác nhận phạt vào đêm')}</details>`:''}${offlineQueue(s)}</section>
    <section class="table-stage" data-ui-key="table-stage"><div class="section-heading"><h2>Bàn chơi</h2>${tableExpandButton()}<span class="live-label">${g.players.length - g.publicDead.length}/${g.players.length} còn sống</span></div>${roundTable(g.players.map(p => ({ id: p.id, name: p.name, alive: !g.publicDead.includes(p.id) })), { hub: hubLabel(g.step, g.night), recentDeaths: latestNightDeaths(g.events) })}</section>
    <nav class="game-utilities" aria-label="Công cụ quản trò">${foldTrigger('secret', 'Sổ tay bí mật')}${foldTrigger('feed', 'Vừa nhận', done ? String(done) : '')}</nav>`;
}
// Thanh chế độ thử: bấm tên để tab này thành người đó, ＋ để vào thêm vai (tối đa 8).
function render() {
  const active = document.activeElement as HTMLInputElement | null;
  const focusId = active?.id;
  const selection = active instanceof HTMLInputElement && active.type === 'text' ? [active.selectionStart, active.selectionEnd] : null;
  const previousModal = app.dataset.modal ?? '';
  const chat = app.querySelector('.chat-fullscreen .chat-messages');
  const followChat = !chat || chat.scrollHeight - chat.scrollTop - chat.clientHeight < 48;
  const hadWakeOverlay = !!app.querySelector('#wake-overlay');
  const modalScroll = modal === 'secret' ? notebookScroll[notebookTab] : app.querySelector('.modal-body')?.scrollTop ?? 0;
  const phaseKey = snapshot?.game && 'stepId' in snapshot.game ? snapshot.game.stepId : snapshot?.viewer === 'player' ? snapshot.game?.turn?.stepId ?? 'wait' : 'lobby';
  const previousKey = app.dataset.phase;
  for (const el of app.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[id],select[id]')) {
    if (el.dataset.role) continue;
    if (el.id === 'chat-text' && chatDraftCleared) { formMemory.delete(`${previousKey}:chat-text`); continue; }
    formMemory.set(`${previousKey}:${el.id}`, el.type === 'checkbox' ? (el as HTMLInputElement).checked : el.value);
  }
  app.dataset.phase = phaseKey;
  app.dataset.modal = modal ?? '';
  const overlay = snapshot?.viewer === 'player' && snapshot.game && snapshot.game.phase !== 'ended'
    ? roleRevealOverlay(snapshot.game) : '';
  patchHtml(app, `<header data-ui-key="header"><a class="brand" href="/">${moon}<span>MA SÓI</span></a><div class="connection ${failed ? 'offline' : ''}" role="status" title="${esc(status)}"><span>${esc(status)}</span></div></header>${localMode ? '' : debug?.header(storage, code, busy || !!pending) ?? ''}${notice && !pending ? `<div class="notice" role="status">${esc(notice)}</div>` : ''}${pending && !busy ? `<div class="notice" role="status">${esc(notice || 'Thao tác chưa được xác nhận. Bạn có thể thử gửi lại.')}<button type="button" data-action="retry">Thử gửi lại</button></div>` : ''}
    ${snapshot ? `<div class="room-heading" data-ui-key="room-heading"><nav class="room-tools" aria-label="Công cụ phòng">${button('modal-open', icon('settings') + '<span>Cài đặt</span>', false, 'class="tool-button" data-modal="tools"')}${button('modal-open', icon('cards') + '<span>Vai</span>', false, 'class="tool-button" data-modal="catalog" aria-label="Danh sách vai"')}</nav><div class="room-identity"><span class="eyebrow">${snapshot.controller ? 'DÙNG MÁY QUẢN TRÒ · ' + esc(snapshot.me.name) : snapshot.viewer === 'moderator' ? localMode ? 'QUẢN TRÒ · MỘT MÁY' : 'QUẢN TRÒ' : esc(snapshot.me.name)}</span><h1><span class="room-prefix">${localMode ? 'Bàn' : 'Phòng'}</span> <span id="room-code">${snapshot.room.code}</span>${snapshot.viewer === 'moderator' && !localMode ? iconButton('invite-qr', 'qr', 'Mã QR vào phòng') : ''}</h1></div></div><main data-ui-key="game-main" class="grid ${!snapshot.game ? 'lobby-layout' : snapshot.viewer === 'moderator' ? 'moderator-layout' : 'player-layout'}">${!snapshot.game ? lobby(snapshot) : snapshot.viewer === 'moderator' ? moderator(snapshot) : player(snapshot)}</main>` : switchingView ? `<main class="switching-view" role="status">Đang chuyển màn hình…</main>` : `<main class="welcome"><div class="welcome-mark" aria-hidden="true">${moon}</div><h1>Ma Sói</h1><div class="entry-tabs" role="tablist" aria-label="Vào bàn chơi">${button('entry-join', 'Vào phòng', false, `id="tab-join" role="tab" aria-selected="${entryMode === 'join'}" aria-controls="entry-panel"`)}${button('entry-create', 'Tạo phòng', false, `id="tab-create" role="tab" aria-selected="${entryMode === 'create'}" aria-controls="entry-panel"`)}</div><section id="entry-panel" class="entry-panel" role="tabpanel" aria-labelledby="tab-${entryMode}">${entryMode === 'create' ? `${button('toggle-mode', '<span class="mode-indicator" aria-hidden="true"></span><span class="mode-label mode-online">Online</span><span class="mode-label mode-offline">Offline</span>', false, `id="create-mode" class="mode-switch" role="switch" aria-label="Chế độ offline" aria-checked="${localMode}"`)}${button('create', `Tạo ${localMode ? 'bàn' : 'phòng'} ${icon('arrow')}`, false, 'class="primary wide"')}${localTable.lastCode() ? button('resume-local', 'Tiếp tục bàn đã lưu trên máy', false, 'class="secondary wide"') : ''}` : `<label>Mã phòng<div class="join-code-row"><input id="join-code" maxlength="6" inputmode="numeric" value="${esc(code)}" placeholder="••••••" autocomplete="off">${button('scan-qr', icon('qr') + '<span>Quét QR</span>', false, 'class="secondary" aria-label="Quét mã QR phòng"')}</div></label><label>Tên của bạn<input id="join-name" value="${esc(savedPlayerName)}" maxlength="40" autocomplete="nickname" placeholder="Tên hoặc Biệt danh"></label>${debug?.joinOption() ?? '<p class="muted">Đổi máy: nhập mã phòng và đúng tên cũ để tiếp tục.</p>'}${button('join', `Vào phòng ${icon('arrow')}`, false, 'class="primary wide"')}`}</section></main>`}${overlay}${overlay ? '' : wakeOverlay(snapshot)}${modalHtml()}${memberMenuHtml()}${busy && pending?.operation.type === 'create' ? '<div class="create-loading" data-ui-key="create-loading" role="status" aria-label="Đang tạo phòng" aria-busy="true"><span class="create-spinner" aria-hidden="true"></span></div>' : ''}`);
  app.classList.toggle('player-view', snapshot?.viewer === 'player');
  app.classList.toggle('table-fullscreen', tableFullscreen && !!snapshot);
  for (const region of app.querySelectorAll<HTMLElement>('header, .room-heading, main.grid > :not(.table-stage)')) region.inert = tableFullscreen && !!snapshot;
  for (const el of app.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[id],select[id]')) {
    if (el.dataset.role) continue;
    const value = formMemory.get(`${phaseKey}:${el.id}`); if (value === undefined) continue;
    if (el.type === 'checkbox') (el as HTMLInputElement).checked = Boolean(value); else if (el.tagName !== 'SELECT' || [...(el as HTMLSelectElement).options].some(o => o.value === value)) el.value = String(value);
  }
  if (previousKey !== phaseKey) activeTargetSlot = '';
  mountTargetPicker(phaseKey);
  updateDeck(); positionMemberMenu();
  const nextChat = app.querySelector('.chat-fullscreen .chat-messages');
  if (nextChat && followChat) nextChat.scrollTop = nextChat.scrollHeight;
  const dialogBody = app.querySelector('.modal-body');
  if (dialogBody && previousModal === modal) dialogBody.scrollTop = modalScroll;
  if (!hadWakeOverlay && app.querySelector('#wake-overlay')) { app.querySelector<HTMLButtonElement>('#wake-overlay [data-action="wake"]')?.focus({ preventScroll: true }); return; }
  const restore = focusId ? document.getElementById(focusId) : null;
  if (restore) {
    restore.focus({ preventScroll: true });
    if (selection && restore instanceof HTMLInputElement) restore.setSelectionRange(selection[0], selection[1]);
  } else if (modal && previousModal !== modal) app.querySelector<HTMLButtonElement>('.modal-close')?.focus({ preventScroll: true });
  else if (!modal && previousModal && modalReturnTarget) app.querySelector<HTMLElement>(`[data-modal="${CSS.escape(modalReturnTarget)}"]`)?.focus({ preventScroll: true });
}
function updateDeck() {
  const total = document.querySelector('#deck-total'); if (!total) return;
  const count = Object.values(deck).reduce((a, b) => a + b, 0), n = snapshot!.room.members.length;
  total.innerHTML = `<span class="${count === n && n >= 3 ? 'ready' : ''}">${count === n && n >= 3 ? icon('check') : icon('cards')}${count} thẻ <span class="divider">/</span> ${n} người</span>`;
  const summary = document.querySelector('#deck-summary'); if (summary) summary.innerHTML = deckSummary();
  const hint = document.querySelector('#start-hint'); if (hint) hint.textContent = n < 3 ? 'Cần ít nhất 3 người chơi' : deckDirty ? 'Lưu bộ vai để mọi người cùng xem' : count !== n ? `Chọn ${n} thẻ cho ${n} người chơi` : 'Mỗi người sẽ nhận một vai bí mật';
  const start = document.querySelector<HTMLButtonElement>('[data-action="start"]'); if (start) start.disabled = busy || !!pending || n < 3 || count !== n || deckDirty;
}
// Kéo thả xếp ghế ở lobby (chỉ quản trò). Kéo ghế tới vị trí khác trên bàn tròn.
let drag: { id: string; el: HTMLElement; ox: number; oy: number; moved: boolean } | null = null;
app.addEventListener('pointerdown', e => {
  if (!snapshot || snapshot.viewer !== 'moderator' || snapshot.game) return;
  const seat = (e.target as HTMLElement).closest<HTMLElement>('[data-drag]');
  if (!seat || (e.target as HTMLElement).closest('button:not(.avatar)')) return;
  drag = { id: seat.dataset.id!, el: seat, ox: e.clientX, oy: e.clientY, moved: false };
});
app.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.ox, dy = e.clientY - drag.oy;
  if (!drag.moved && Math.hypot(dx, dy) < 6) return;
  if (!drag.moved) { drag.el.setPointerCapture?.(e.pointerId); memberMenu = null; }
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
  ignoreSeatClickUntil = performance.now() + 350;
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
  const n = snapshot?.room.members.filter(m => !m.left).length ?? 0; if (!n) return null;
  const index = Math.round(angle / (360 / n)) % n;
  return table.querySelector<HTMLElement>(`.seat[data-seat="${index + 1}"]`);
}
async function request(body?: LocalMutation, capability?: string, room?: string) {
  if (localMode) {
    try {
      if (body) {
        const checkpoint = native?.storage.checkpoint();
        try {
          const result = localTable.mutate(body, proxyPlayerId);
          await flushDeviceStorage();
          return result;
        } catch (error) { if (checkpoint) native!.storage.restore(checkpoint); throw error; }
      }
      if (room) return localTable.read(room, proxyPlayerId);
      return { storage: 'local', catalog: localCatalog() };
    } catch (e) {
      const messages: Record<string, string> = { INVALID_TARGET: 'Mục tiêu không hợp lệ hoặc đã chết.', SELF_TARGET: 'Hãy chọn những người khác nhau theo kỹ năng.', REPEATED_PROTECTION: 'Không được bảo vệ cùng một người hai đêm liền.', VOTE_REQUIRED: 'Đã hết lượt không loại ai. Hãy chọn một người để vote.', UNBALANCED_START: 'Bộ vai cần có Sói và số Sói ít hơn số người còn lại.', DUPLICATE_SPECIAL_ROLE: 'Mỗi vai đặc biệt chỉ có một người.', INVALID_SETTINGS: 'Cài đặt không hợp lệ. Hãy kiểm tra lại.' };
      const error = e instanceof RuleError ? new Error(messages[e.code] ?? 'Lựa chọn chưa hợp lệ. Hãy kiểm tra mục tiêu và thử lại.')
        : e instanceof DOMException && e.name === 'QuotaExceededError' ? new Error('Không đủ bộ nhớ để lưu ván trên máy. Hãy giải phóng bộ nhớ rồi thử lại.')
        : e instanceof Error ? e : new Error(String(e));
      throw Object.assign(error, { status: 409 });
    }
  }
  // A storage write may involve two bounded 5s upstream calls. Do not label
  // it lost before the server has had time to return its acknowledgement.
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const path = body ? '/api/room' : roomRequestPath(room, proxyPlayerId);
    const headers = { ...(capability ? { Authorization: `Bearer ${capability}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) };
    let httpStatus: number, data;
    if (native) {
      const response = await native.request(publicOrigin + path, body, headers);
      httpStatus = response.status; data = response.data;
    } else {
      const response = await fetch(path, {
        method: body ? 'POST' : 'GET', headers,
        body: body ? JSON.stringify(body) : undefined, signal: controller.signal, cache: 'no-store',
      });
      httpStatus = response.status; data = await response.json();
    }
    if (httpStatus < 200 || httpStatus >= 300) {
      throw Object.assign(new Error(data?.error?.message ?? 'Không thực hiện được thao tác.'), { status: httpStatus, code: data?.error?.code });
    }
    return data;
  } finally { clearTimeout(timeout); }
}
function accepted(s: Snapshot) {
  const previousModal = modal;
  if (snapshot?.game && !s.game) { modal = null; deckDirty = false; memberMenu = null; }
  const changed = snapshot?.viewVersion !== s.viewVersion;
  if (snapshot?.room.code !== s.room.code) { deckDirty = false; deck = {}; notebookTab = 'players'; notebookNight = 'all'; notebookScroll.players = notebookScroll.chat = notebookScroll.history = 0; }
  switchingView = false; sessionMoved = false;
  if (s.controller) setProxy(s.me.id);
  if (s.viewer === 'player' && !s.controller) { savedPlayerName = s.me.name; try { sessionStore.setItem('ma-soi:player-name:v1', savedPlayerName); } catch {} }
  snapshot = s; code = s.room.code; catalog = s.catalog; storage = s.storage;
  serverOffset = Date.now() - Date.parse(s.serverTime);
  if (!s.room.local) debug?.watch(s, capabilityFor(code));
  const route = `/?${localMode ? 'local' : 'room'}=${code}`;
  history.replaceState(null, '', route);
  if (native && (changed || deviceStorage.getItem('ma-soi:resume-route:v1') !== route)) {
    deviceStorage.setItem('ma-soi:resume-route:v1', route);
    void flushDeviceStorage().catch(() => {});
  }
  status = localMode ? 'Đã lưu trên máy' : 'Đã đồng bộ'; failed = false;
  if (s.viewer === 'moderator' && !s.game && !deckDirty) {
    deck = { ...(s.deck ?? {}) };
    if (!Object.keys(deck).length && s.room.members.filter(m => !m.left).length >= 3) preset();
  }
  if (s.viewer === 'player' && s.game && (!modal || modal === 'inspect-result') && unseenInspection(s.game)) modal = 'inspect-result';
  if (s.viewer === 'moderator' && s.room.local && s.room.inspection != null) modal = 'local-inspect-result';
  if (!s.room.simplified && s.viewer === 'moderator' && s.room.phase === 'playing' && s.game && offlineAutoSkip !== s.game.stepId) {
    const next = s.game.progress.find(p => !p.submitted && s.room.members.some(m => m.id === p.id && m.offline));
    if (next) queueMicrotask(() => { if (!busy && !pending && snapshot?.viewer === 'moderator') void controlOffline(next.id); });
  }
  if (changed || modal !== previousModal) render(); else { const label = document.querySelector<HTMLElement>('.connection'); if (label) { label.innerHTML = `<span>${esc(status)}</span>`; label.title = status; label.className = 'connection'; } tickCountdowns(); }
}
async function refresh(force = false) {
  const capability = capabilityFor(code);
  if (!code || !capability || sessionMoved || !force && (!appActive || fetching || busy)) return;
  const sequence = ++readSequence;
  fetching = true;
  try { const result = await request(undefined, capability, code); if (sequence === readSequence) accepted(result); }
  catch (e) {
    if (sequence !== readSequence) return;
    const statusCode = (e as Error & { status?: number }).status;
    if (proxyPlayerId && statusCode === 403) { setProxy(null); switchingView = false; await refresh(true); return; }
    if (statusCode === 403 || statusCode === 404) {
      const previousName = snapshot?.me.name;
      snapshot = null; switchingView = false; sessionMoved = true; entryMode = 'join';
      if (previousName) formMemory.set('lobby:join-name', previousName);
      notice = (e as Error & { code?: string }).code === 'PLAYER_LEFT' ? 'Bạn đã rời trò chơi.' : statusCode === 403 ? 'Phiên đã chuyển sang thiết bị khác. Nhập mã phòng và tên để vào lại.' : 'Phòng đã đóng hoặc hết hạn.';
      status = (e as Error & { code?: string }).code === 'PLAYER_LEFT' ? 'Đã rời trò chơi' : statusCode === 403 ? 'Phiên đã chuyển' : 'Phòng đã đóng'; failed = true; debug?.forget(); render(); return;
    }
    status = 'Chưa kết nối · sẽ thử lại'; failed = true;
    const label = document.querySelector<HTMLElement>('.connection');
    if (label) { label.innerHTML = `<span>${esc(status)}</span>`; label.title = status; label.className = 'connection offline'; }
  }
  finally { if (sequence === readSequence) { fetching = false; schedule(); } }
}
async function controlOffline(id: string) {
  setProxy(id); modal = null; memberMenu = null; switchingView = true; snapshot = null; render(); await refresh(true);
}
async function returnModerator(skip = true) {
  if (skip && snapshot?.viewer === 'player') offlineAutoSkip = snapshot.game?.turn?.stepId ?? null;
  setProxy(null); modal = null; switchingView = true; snapshot = null; render(); await refresh(true);
}
function schedule() { clearTimeout(poll); if (sessionMoved || localMode || !appActive) return; poll = setTimeout(() => { if (!document.hidden) void refresh(); else schedule(); }, failed ? 5000 : snapshot?.room.phase === 'playing' && (snapshot.viewer === 'moderator' ? snapshot.game?.step !== 'day' : snapshot.game?.phase !== 'day') ? 750 : 1500); }
async function sendPending() {
  if (!pending || busy) return false;
  let success = false;
  // A poll started before this write must not overwrite its newer ACK later.
  readSequence++; fetching = false; clearTimeout(poll);
  busyAction = lastAction === 'retry' || !lastAction ? (pending.operation.type === 'command' || pending.operation.type === 'offlineCommand' ? pending.operation.command.type === 'act' ? 'submit' : pending.operation.command.type : pending.operation.type) : lastAction;
  busy = true; notice = ''; render();
  try {
    // Persist the request ID before sending: termination/retry must not duplicate a turn.
    await flushDeviceStorage();
    const leaving = pending.operation.type === 'leave' ? pending.operation.code : null;
    const s = await request(pending.operation, pending.token);
    if (leaving) {
      if (s.left !== true || s.code !== leaving) throw new Error('Không xác nhận được việc rời phòng.');
      delete sessions[s.code]; pending = null; persist(); setProxy(null); clearTimeout(poll); sessionMoved = true;
      await goHome(); success = true; return true;
    }
    if (pending.operation.type === 'setDeck') deckDirty = false;
    const sending = pending, previousSessions = { ...sessions }, checkpoint = native?.storage.checkpoint();
    if (!debug?.owns(s.room.code)) sessions[s.room.code] = { token: pending.token }; pending = null; persist();
    try { await flushDeviceStorage(); } catch (error) {
      sessions = previousSessions; pending = sending; if (checkpoint) native!.storage.restore(checkpoint); throw error;
    }
    accepted(s); notice = ''; failed = false; success = true;
  } catch (e) {
    const statusCode = (e as Error & { status?: number }).status;
    if (statusCode && statusCode < 500) { pending = null; persist(); }
    notice = statusCode ? (e as Error).message : 'Chưa nhận được xác nhận từ máy chủ. Giữ thao tác và thử gửi lại.';
    failed = !statusCode || statusCode >= 500;
    if (failed) status = 'Chờ gửi lại';
    if (native) await flushDeviceStorage().catch(() => {});
  } finally {
    busy = false; busyAction = null; render(); schedule();
    // Successful writes already return the authoritative snapshot. An extra
    // immediate GET doubles storage work without making that ACK more current.
    // A foreground/network event can arrive while this request is still busy.
    // Consume it after settling: retry the persisted ID on a lost ACK, or read
    // current state if the room advanced while this device was away.
    if (reconnectAfterWrite && appActive) queueMicrotask(reconnect);
    else if (!success && !pending) void refresh();
  }
  return success;
}
async function mutate(operation: LocalMutation, capability = capabilityFor(code)) {
  if (busy || pending) return;
  if (!capability) { notice = 'Thiết bị này chưa có phiên của phòng.'; render(); return; }
  if (proxyPlayerId && operation.type === 'command') operation = { ...operation, type: 'offlineCommand', playerId: proxyPlayerId };
  pending = { operation, token: capability };
  try { persist(); } catch { pending = null; notice = 'Không lưu được phiên trên trình duyệt. Hãy cho phép lưu dữ liệu trang này rồi thử lại.'; render(); return; }
  return await sendPending();
}
const value = (id: string) => document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!.value;
function ownAction(view = snapshot?.viewer === 'player' ? snapshot.game : null): Action {
  if (!view?.turn) throw new Error('Chưa đến lượt của bạn.');
  const g = view, t = g.turn!;
  if(t.power) return {type:'ability',...(t.power.input==='note'?{text:value('power-note')}:{}),...(t.power.input==='prediction'?{choice:value('power-choice')}:t.power.input==='draw'?{choice:'draw'}:{}),targets: document.querySelector<HTMLInputElement>('#ability-pass')?.checked?[]:t.power.count===2?[value('first'),value('second')]:t.power.count===1?[value('target')]:[], ...(document.querySelector<HTMLInputElement>('#ability-pass')?.checked?{pass:true}:{})};
  if (t.ability === 'hunter' && g.hunterMode === 'active' && !value('target')) return { type: 'hold' };
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
app.addEventListener('scroll', e => {
  if (modal === 'secret' && (e.target as HTMLElement).id === 'notebook-panel') notebookScroll[notebookTab] = (e.target as HTMLElement).scrollTop;
}, true);
app.addEventListener('change', e => {
  const input = e.target as HTMLSelectElement;
  if (input.id === 'notebook-night') { notebookNight = input.value; notebookScroll.chat = notebookScroll.history = 0; render(); }
});
app.addEventListener('change', e => {
  if ((e.target as HTMLInputElement).dataset.role) render();
});
app.addEventListener('input', e => { const input = e.target as HTMLInputElement;
  if (input.id === 'heal' || input.id === 'sacrifice' || input.id === 'ability-pass') updateTargetPicker();
  if (input.id === 'local-simplified') localSimplified = input.checked;
  if (input.id === 'hunter-active-shot') lobbySettings.hunterActiveShot = input.checked;
  if (input.id === 'witch-sees-bite') lobbySettings.witchSeesBite = input.checked;
  const phase = input.id.startsWith('day-') ? input.id.slice(4) : '';
  if (DAY_PHASES.includes(phase as typeof DAY_PHASES[number])) lobbySettings.dayTimers[phase] = Number(input.value);
 if (input.id === 'skip-vote-days') lobbySettings.skipVoteDays = Math.max(0, Math.min(30, Math.trunc(Number(input.value) || 0)));
 if (input.dataset.role) { deckDirty = true; deck[input.dataset.role] = Math.max(0, Math.min(30, Math.trunc(Number(input.value) || 0))); updateDeck(); } });
app.addEventListener('click', async e => {
  const el = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]'); if (!el || el.disabled) return;
  const action = el.dataset.action!;
  if (action === 'toggle-faction') {
    const key = el.dataset.factionKey!;
    if (collapsedFactions.has(key)) collapsedFactions.delete(key); else collapsedFactions.add(key);
    render(); return;
  }
  if (['pick-target', 'target-clear', 'toggle-mode', 'notebook-tab'].includes(action)) native?.feedback();
  if (!busy) lastAction = action;
  try {
    if (action === 'scan-qr') {
      el.disabled = true;
      try {
        const { scanRoomQr } = await import('./qr-scanner.ts');
        scanRoomQr(scanned => {
          const input = document.querySelector<HTMLInputElement>('#join-code');
          if (input) { input.value = scanned; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); }
        }, publicOrigin);
      } finally { el.disabled = false; }
      return;
    }
    if (action === 'browser-fullscreen') {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (document.fullscreenEnabled && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        else { modal = 'browser-fullscreen-help'; render(); }
      } catch { modal = 'browser-fullscreen-help'; render(); }
      return;
    }
    if (action === 'target-slot') { activeTargetSlot = el.dataset.slot!; updateTargetPicker(); return; }
    if (action === 'pick-target' || action === 'target-clear') {
      const slots = pickerSlots(), slot = action === 'target-clear' ? el.dataset.slot! : activeTargetSlot;
      const values = Object.fromEntries(slots.map(s => [s.id, value(s.id)]));
      const view = targetingView();
      const next = pickTarget(slots, values, slot, action === 'target-clear' ? '' : el.dataset.playerId!, ['wolves', 'cupid', 'mentalist'].includes(view?.turn?.ability ?? ''));
      if (next) { for (const [id, selected] of Object.entries(next)) app.querySelector<HTMLInputElement>(`#${id}`)!.value = selected;
        const empty = slots.find(s => s.id !== slot && !next[s.id]); if (empty && action !== 'target-clear') activeTargetSlot = empty.id;
        updateTargetPicker(); }
      return;
    }
    if (action === 'table-fullscreen') { tableFullscreen = !tableFullscreen; render(); return; }
    if (action === 'local-result') { modal = 'local-inspect-result'; render(); return; }
    if ((action === 'simple-submit' || action === 'simple-ack') && snapshot?.viewer === 'moderator' && snapshot.game && localMode) {
      const g = snapshot.game;
      const operation: LocalMutation = action === 'simple-ack' ? { type: 'simpleAck', code, requestId: random(), stepId: g.stepId }
        : { type: 'simpleAct', code, requestId: random(), stepId: g.stepId, action: ownAction(simpleView(g)) };
      const ok = await mutate(operation);
      if (ok && action === 'simple-ack') { modal = null; render(); }
      return;
    }
    if (action === 'invite-qr' && snapshot?.viewer === 'moderator' && !localMode) {
      const url = inviteUrl();
      if (inviteQrUrl !== url) { inviteQr = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 4 }); inviteQrUrl = url; }
      modal = 'invite-qr'; modalReturnTarget = null; render(); return;
    }
    if (action === 'confirm-reset' && snapshot?.viewer === 'moderator' && snapshot.game) {
      const ok = await mutate({ type: 'reset', code, requestId: random(), expectedRevision: snapshot.room.revision! });
      if (ok) { deckDirty = false; deck = { ...(snapshot.deck ?? {}) }; modal = null; memberMenu = null; render(); }
      return;
    }
    if (action === 'confirm-leave' && snapshot?.viewer === 'player' && !snapshot.controller) { await mutate({ type: 'leave', code, requestId: random() }); return; }
    if (action === 'exit-room' && snapshot && !snapshot.controller) {
      modalReturnTarget = null; modal = 'exit-room'; render();
      app.querySelector<HTMLButtonElement>('[data-action="cancel-exit"]')?.focus(); return;
    }
    if (action === 'cancel-exit') { modal = null; render(); app.querySelector<HTMLButtonElement>('[data-action="exit-room"]')?.focus(); return; }
    if (action === 'confirm-exit' && snapshot?.viewer === 'moderator') { setProxy(null); await goHome(); return; }
    if (action === 'notebook-tab' && modal === 'secret' && snapshot?.viewer === 'moderator') {
      const tab = el.dataset.tab as NotebookTab;
      if (!Object.hasOwn(NOTEBOOK_TABS, tab)) return;
      notebookScroll[notebookTab] = app.querySelector('.modal-body')?.scrollTop ?? 0;
      notebookTab = tab; render(); document.getElementById(`notebook-tab-${tab}`)?.focus({ preventScroll: true }); return;
    }
    if (action === 'seat-menu' && snapshot?.viewer === 'moderator') {
      if (performance.now() < ignoreSeatClickUntil) return;
      const r = el.getBoundingClientRect(), width = Math.min(248, innerWidth - 24);
      memberMenu = memberMenu?.id === el.dataset.playerId ? null : { id: el.dataset.playerId!, x: r.right + width + 12 <= innerWidth ? r.right + 8 : r.left - width - 8, y: r.top - 4, confirm: false };
      render(); app.querySelector<HTMLButtonElement>('.member-menu button:not(:disabled)')?.focus(); return;
    }
    if (action === 'member-confirm' && memberMenu) { memberMenu.confirm = true; render(); return; }
    if (action === 'member-cancel' && memberMenu) { memberMenu.confirm = false; render(); return; }
    if ((action === 'member-offline' || action === 'member-remove') && memberMenu && snapshot?.viewer === 'moderator') {
      const id = memberMenu.id; memberMenu = null;
      if (action === 'member-offline') offlineAutoSkip = null;
      await mutate({ type: action === 'member-offline' ? 'setOffline' : 'removeMember', code, requestId: random(), expectedRevision: snapshot.room.revision!, playerId: id }); return;
    }
    if (action === 'modal-open') {
      const target = el.dataset.modal!;
      if (target === '__close') { modal = modal?.startsWith('role:') ? roleListParent : modal === 'allroles' ? 'catalog' : null; render(); return; }
      if (target.startsWith('role:')) roleListParent = modal === 'allroles' ? 'allroles' : modal === 'catalog' ? 'catalog' : null;
      if (!modal) modalReturnTarget = target;
      modal = target; render(); return;
    }
    if (action === 'modal-close') {
      if ((e.target as HTMLElement).closest('.modal')) return; // bấm trong pop-up không đóng
      modal = null; render(); return;
    }
    if (action === 'return-moderator') { if (modal === 'inspect-result' || modal === 'local-inspect-result') return; await returnModerator(); return; }
    if (action === 'control-offline') { await controlOffline(el.dataset.playerId!); return; }
    if (action === 'add-offline' && snapshot) { if (await mutate({ type: 'addOffline', code, requestId: random(), expectedRevision: snapshot.room.revision!, name: value('offline-name') })) { modal = null; render(); } return; }
    if (action === 'entry-create' || action === 'entry-join') { entryMode = action === 'entry-create' ? 'create' : 'join'; render(); return; }
    if (action === 'retry') { await sendPending(); return; }
    if (action === 'refresh') { await refresh(true); return; }
    if (action === 'copy') { await copyText(inviteUrl()); notice = 'Đã sao chép link vào phòng.'; modal = null; render(); return; }
    if (action === 'role-read' && snapshot?.room.phase === 'ready') { const proxy = proxyPlayerId; const ok = await mutate(proxy ? { type: 'offlineReady', code, requestId: random(), playerId: proxy } : { type: 'ready', code, requestId: random() }); if (ok && proxy) await returnModerator(false); return; }
    if (action === 'role-read') { if (snapshot?.viewer === 'player' && snapshot.game) { try { sessionStorage.setItem(sessionStorageKey(snapshot.game.gameId), '1'); } catch {} } render(); return; }
    if (action === 'inspect-ack' && snapshot?.viewer === 'player') { markInspectionSeen(snapshot.game); modal = null; if (proxyPlayerId) await returnModerator(false); else render(); return; }
    if (action === 'edit-wolf') { editingWolfStep = snapshot?.viewer === 'player' ? snapshot.game?.turn?.stepId ?? null : null; render(); return; }
    if (action === 'chat-send') {
      const text = value('chat-text').trim();
      const step = snapshot?.viewer === 'player' ? snapshot.game?.turn?.stepId : undefined;
      if (!text || !step) return;
      await mutate({ type: 'command', code, requestId: random(), stepId: step, command: { type: 'chat', text } });
      chatDraftCleared = true; render(); chatDraftCleared = false;
      return;
    }
    if (action === 'preset') {
      if ((snapshot?.room.members.filter(m => !m.left).length ?? 0) < 3) {
        notice = 'Cần ít nhất 3 người chơi để gợi ý bộ vai.'; modal = null; render(); return;
      }
      preset(); render();
      // Inputs edited by the user have a dirty value; changing the HTML attribute alone does not reset it.
      app.querySelectorAll<HTMLInputElement>('[data-role]').forEach(input => { input.value = String(deck[input.dataset.role!] ?? 0); });
      return;
    }
    if (action === 'resume-local') { notice = ''; localMode = true; code = localTable.lastCode(); setProxy(null); modal = null; await refresh(true); return; }
    if (action === 'toggle-mode') {
      localMode = !localMode;
      // Keep the same element so the CSS transition can run without a layout reset.
      el.setAttribute('aria-checked', String(localMode));
      const create = app.querySelector<HTMLButtonElement>('[data-action="create"]');
      if (create) create.innerHTML = `Tạo ${localMode ? 'bàn' : 'phòng'} ${icon('arrow')}`;
      return;
    }
    if (action === 'create') { await mutate({ type: 'create', requestId: random(), name: localMode ? 'Quản trò' : `Quản trò ${random().slice(0, 24)}` }, random()); return; }
    if (action === 'join') {
      localMode = false;
      const entered = value('join-code').trim().toUpperCase();
      if (debug?.joining()) {
        accepted(await debug.join(entered, value('join-name'), request, random));
        return;
      }
      await mutate({ type: 'join', code: entered, requestId: random(), name: value('join-name') }, sessions[entered]?.token ?? random()); return;
    }
    if (debug && await debug.handle(action, el, { request, random, refresh, accepted })) return;
    if (!snapshot) return;
    if(['hint-approve','hint-reject','wolf-timeout','rule-penalty'].includes(action)&&snapshot.viewer==='moderator'&&snapshot.game){
      const command:Command=action==='wolf-timeout'?{type:'wolfTimeout'}:action==='rule-penalty'?{type:'penalty',target:value('penalty-player')}:{type:'reviewNote',actor:el.dataset.playerId!,approve:action==='hint-approve'};
      await mutate({type:'command',code,requestId:random(),stepId:snapshot.game.stepId,command});return;
    }
    if (action === 'begin') { await mutate({ type: 'begin', code, requestId: random(), expectedRevision: snapshot.room.revision! }); return; }
    if (action === 'save-deck') {
      await mutate({ type: 'setDeck', code, requestId: random(), expectedRevision: snapshot.room.revision!, roles: catalog.flatMap(r => Array.from({ length: deck[r.id] ?? 0 }, () => r.id)) });
      if (!deckDirty) { modal = null; render(); }
      return;
    }
    if (action === 'start') {
      const getTimer = (p: typeof DAY_PHASES[number]) => {
        const n = Math.round(lobbySettings.dayTimers[p]);
        return Number.isSafeInteger(n) && n >= 5 && n <= 3600 ? n : DEFAULT_DAY_TIMERS[p];
      };
      const dayTimers: DayTimers = { discussion: getTimer('discussion'), nomination: getTimer('nomination'), defense: getTimer('defense'), finalvote: getTimer('finalvote') };
      await mutate({ ...(localMode ? { type: 'localStart' as const, simplified: localSimplified } : { type: 'start' as const }), code, requestId: random(), expectedRevision: snapshot.room.revision!, settings: { hunterActiveShot: lobbySettings.hunterActiveShot, witchSeesBite: lobbySettings.witchSeesBite, dayTimers, skipVoteDays: Math.max(0, Math.min(30, Math.trunc(lobbySettings.skipVoteDays) || 0)) }, roles: catalog.flatMap(r => Array.from({ length: deck[r.id] ?? 0 }, () => r.id)) }); return;
    }
    const step = snapshot.viewer === 'moderator' ? snapshot.game?.stepId : snapshot.game?.turn?.stepId;
    if (!step) return;
    if (action === 'submit') editingWolfStep = null;
    const command: Command = action === 'submit' ? { type: 'act', action: ownAction() } : action === 'verdict' ? { type: 'verdict', target: value('verdict') || null }
      : action === 'phase-start' ? { type: 'dayPhase', action: 'start' } : action === 'phase-next' ? { type: 'dayPhase', action: 'next' }
      : { type: action as 'wake' | 'advance' | 'resolve' | 'publish' | 'nextNight' };
    const proxy = proxyPlayerId;
    if (proxy && command.type === 'act' && snapshot.viewer === 'player' && !snapshot.game?.turn?.awake) {
      if (!await mutate({ type: 'command', code, requestId: random(), stepId: step, command: { type: 'wake' } })) return;
    }
    const ok = await mutate({ type: 'command', code, requestId: random(), stepId: step, command });
    if (ok && proxy && command.type === 'act' && modal !== 'inspect-result') await returnModerator(false);
  } catch (e) { if (action === 'copy') modal = null; notice = action === 'copy' ? `Không thể tự sao chép. Hãy sao chép link này: ${inviteUrl()}` : (e as Error).message; render(); }
});
document.addEventListener('fullscreenchange', () => render());
function reconnect() {
  if (!appActive) return;
  if (busy) { reconnectAfterWrite = true; return; }
  reconnectAfterWrite = false;
  if (pending) void sendPending(); else void refresh(true);
}
function setAppActive(active: boolean) {
  if (appActive === active) return;
  appActive = active;
  clearTimeout(poll);
  if (!active) { readSequence++; fetching = false; }
  else reconnect();
}
window.addEventListener('online', reconnect);
document.addEventListener('visibilitychange', () => { if (native) setAppActive(!document.hidden); else if (!document.hidden) reconnect(); });
if (native) {
  void native.listen(setAppActive, reconnect).catch(() => {});
  app.addEventListener('click', e => {
    if ((e.target as HTMLElement).closest('a.brand')) { e.preventDefault(); void goHome(); }
  });
}
document.addEventListener('click', e => {
  if (memberMenu && !(e.target as HTMLElement).closest('.member-menu, [data-action="seat-menu"]')) { memberMenu = null; render(); }
});
window.addEventListener('resize', () => { if (memberMenu) { memberMenu = null; render(); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && app.querySelector('#wake-overlay')) { e.preventDefault(); return; }
  if (e.key === 'Escape' && tableFullscreen && !modal) { tableFullscreen = false; render(); return; }
  if (e.key === 'Escape' && memberMenu) { const id = memberMenu.id; memberMenu = null; render(); document.getElementById(`seat-${id}`)?.focus(); return; }
  if (memberMenu && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
    const items = [...app.querySelectorAll<HTMLButtonElement>('.member-menu button:not(:disabled)')];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (items.length) { e.preventDefault(); items[(index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
  }

  if (e.key === 'Escape' && (modal === 'inspect-result' || modal === 'local-inspect-result')) { e.preventDefault(); return; }
  if (e.key === 'Escape' && modal) { modal = modal.startsWith('role:') ? roleListParent : modal === 'allroles' ? 'catalog' : null; render(); return; }
  const dialog = app.querySelector<HTMLElement>('.modal, .overlay, .member-menu');
  if (e.key === 'Tab' && dialog) {
    const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]')].filter(el => el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (first && last && (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement)) || !e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement)))) {
      e.preventDefault(); (e.shiftKey ? last : first).focus();
    }
  }
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) && (e.target as HTMLElement).dataset.action === 'notebook-tab') {
    e.preventDefault();
    const tabs = Object.keys(NOTEBOOK_TABS) as NotebookTab[], index = tabs.indexOf(notebookTab);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    app.querySelector<HTMLButtonElement>(`[data-action="notebook-tab"][data-tab="${tabs[next]}"]`)?.click(); return;
  }
  if (['ArrowLeft', 'ArrowRight'].includes(e.key) && (e.target as HTMLElement).getAttribute('role') === 'tab') {
    e.preventDefault(); app.querySelector<HTMLButtonElement>(`[data-action="${entryMode === 'create' ? 'entry-join' : 'entry-create'}"]`)?.click();
  }
  if (e.key === 'Enter' && !snapshot && !e.isComposing) {
    const id = (e.target as HTMLElement).id;
    if (['join-name', 'join-code'].includes(id)) {
      e.preventDefault(); app.querySelector<HTMLButtonElement>('[data-action="join"]')?.click();
    }
  }
});
render();
native?.ready();
(async () => {
  // Restore a local table immediately; do not wait for the network configuration.
  if (pending) { await sendPending(); return; }
  if (code && (localMode || sessions[code])) { await refresh(true); return; }
  try {
    const config = await request();
    // A slow startup request must not overwrite a table created in the meantime.
    if (!snapshot && !busy && !pending && !localMode) { storage = config.storage; catalog = config.catalog; status = 'Máy chủ sẵn sàng'; render(); }
  } catch {
    if (!snapshot && !busy && !pending && !localMode) { failed = true; status = 'Chưa kết nối'; notice = 'Chưa kết nối được máy chủ. Bạn vẫn có thể tạo bàn một máy hoặc tiếp tục bàn đã lưu.'; render(); }
  }
})();

window.addEventListener('storage', e => { if (localMode && e.key === `ma-soi:local-table:v1:${code}`) void refresh(true); });
if (import.meta.env.PROD && !isNativeApp && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* Online rooms remain usable if browser blocks caching. */ });
}

const warmedImages = new Map<string, HTMLImageElement>();
async function warmCards() {
  // Bundled native assets need no network prefetch. Keep only a few common
  // cards decoded instead of retaining ~88 MB of decoded images for all 64.
  const urls = isNativeApp ? ['villager', 'wolf', 'seer', 'guard'].map(id => ROLE_IMAGES[id]) : localCatalog().map(r => ROLE_IMAGES[r.id]);
  for (let offset = 0; offset < urls.length; offset += 2) {
    if (!appActive) break;
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    await Promise.all(urls.slice(offset, offset + 2).map(async url => {
      if (warmedImages.has(url)) return;
      const image = new Image(); image.decoding = 'async'; image.fetchPriority = 'low'; image.src = url;
      warmedImages.set(url, image);
      try { await image.decode(); } catch { warmedImages.delete(url); }
    }));
  }
}
// Decode visible cards on demand. Warm the remaining cards only while idle,
// yielding between pairs so startup and taps retain the main thread.
function scheduleCardWarmup() {
  if ('requestIdleCallback' in window) window.requestIdleCallback(() => void warmCards(), { timeout: 3000 });
  else setTimeout(() => void warmCards(), 800);
}
if (document.readyState === 'complete') scheduleCardWarmup();
else window.addEventListener('load', scheduleCardWarmup, { once: true });
