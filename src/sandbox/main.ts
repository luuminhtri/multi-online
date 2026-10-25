import { actors, createGame, dispatch, RuleError, stepId } from '../engine/engine.ts';
import { playerView, publicView } from '../engine/views.ts';
import { MODERATOR_SCRIPTS, ROLES } from '../engine/rules.ts';
import type { Action, Command, GameEvent, Principal, Role, Step } from '../engine/types.ts';
import './style.css';

// Local test harness only. Canonical state is deliberately visible to the tester.
// This is NOT the multiplayer frontend and must not be used with real secret games.
const roster: { id: string; name: string; role: Role }[] = [
  { id: 'p1', name: 'Minh', role: 'wolf' },
  { id: 'p2', name: 'Lan', role: 'guard' },
  { id: 'p3', name: 'Hà', role: 'seer' },
  { id: 'p4', name: 'Hương', role: 'witch' },
  { id: 'p5', name: 'An', role: 'villager' },
  { id: 'p6', name: 'Bình', role: 'villager' },
];
const rosterFull: { id: string; name: string; role: Role }[] = [
  { id: 'p1', name: 'Minh', role: 'wolf' },
  { id: 'p2', name: 'Lan', role: 'guard' },
  { id: 'p3', name: 'Hà', role: 'seer' },
  { id: 'p4', name: 'Hương', role: 'witch' },
  { id: 'p5', name: 'Hùng', role: 'hunter' },
  { id: 'p6', name: 'Mai', role: 'cupid' },
  { id: 'p7', name: 'Tuấn', role: 'cursed' },
  { id: 'p8', name: 'Dũng', role: 'doppelganger' },
  { id: 'p9', name: 'An', role: 'villager' },
  { id: 'p10', name: 'Bình', role: 'villager' },
];
const rosterWolves = (['wolf_cub', 'alpha_wolf', 'big_bad_wolf', 'guard', 'witch', 'hunter', 'cursed', 'tough_guy', 'diseased', 'villager', 'villager', 'villager'] as Role[])
  .map((role, index) => ({ id: `z${index + 1}`, name: `${ROLES[role].name} ${index + 1}`, role }));
const rosterConditional = (['dire_wolf', 'virginia_woolf', 'fang_face', 'fruit_wolf', 'dream_wolf', 'wolf', 'witch', 'hunter', 'cursed', 'villager', 'villager', 'villager', 'villager', 'villager', 'villager'] as Role[])
  .map((role, index) => ({ id: `y${index + 1}`, name: `${ROLES[role].name} ${index + 1}`, role }));
const rosterExtended = (Object.keys(ROLES) as Role[]).map((role, index) => ({ id: `x${index + 1}`, name: ROLES[role].name, role }));
let game = createGame('sandbox', rosterFull);
let selected = 'p6';
let notice = 'Bắt đầu ở lượt Thần tình yêu Cupid. Bấm “Đã thức dậy” rồi chọn 2 người kết duyên.';
let error = false;
const app = document.querySelector<HTMLDivElement>('#app')!;
const labels: Record<Step, string> = {
  dire_wolf: 'Sói tuyết chọn bạn', virginia_woolf: 'Virginia chọn liên kết', alpha_wolf: 'Sói Alpha',
  aura_seer: 'Tiên tri hào quang', mystic_seer: 'Tiên tri huyền bí', mentalist: 'Nhà tinh thần học',
  cupid: 'Thần tình yêu', doppelganger: 'Nhân bản', guard: 'Bảo vệ', seer: 'Tiên tri', wolves: 'Bầy Sói',
  witch: 'Phù thủy', hunter: 'Thợ săn nổ súng', review: 'Tổng kết đêm', day: 'Ban ngày', ended: 'Kết thúc',
};
const winners = { village: 'Phe Dân thắng', wolves: 'Phe Sói thắng', lovers: 'Phe Tình nhân thắng ❤️', draw: 'Hòa' };
const errors: Record<string, string> = {
  INVALID_TARGET_COUNT: 'Chọn đúng số nạn nhân của bầy trong đêm này.',
  TARGETS_NOT_ADJACENT: 'Hai nạn nhân phải là hai người sống ngồi cạnh nhau.',
  HEAL_TARGET_REQUIRED: 'Cần chọn người được cứu trong số các nạn nhân bị cắn.',
  INVALID_HEAL_TARGET: 'Chỉ được cứu một nạn nhân trong danh sách bị cắn.',
  CANNOT_BITE: 'Vai hiện tại không được cắn trong đêm này.',
  CANNOT_FAST: 'Chỉ Sói ăn chay cuối cùng được xác nhận không cắn.',
  PACK_MEMBER_ASLEEP: 'Chưa thể hy sinh khi vẫn có Sói đang ngủ theo luật.',
  SACRIFICE_NOT_OFFERED: 'Sói con phải tự đề nghị hy sinh trước khi bầy đồng ý.',
  WAITING_FOR_ACTIONS: 'Chưa đủ người hoàn tất. Hãy gửi hành động của vai.',
  WOLVES_DISAGREE: 'Bầy Sói chưa thống nhất. Chọn từng Sói và đổi về cùng mục tiêu.',
  REPEATED_PROTECTION: 'Không được bảo vệ cùng người hai đêm liên tiếp.',
  ACTION_ALREADY_CONFIRMED: 'Người này đã chốt hành động.',
  NOT_AWAKE: 'Cần xác nhận đã thức dậy trước.', NOT_YOUR_TURN: 'Chưa đến lượt người này.',
  INVALID_TARGET: 'Mục tiêu không hợp lệ hoặc đã chết.', NO_HEAL_AVAILABLE: 'Không còn thuốc cứu hoặc không có mục tiêu bị cắn.',
  NO_POISON_AVAILABLE: 'Đã hết thuốc độc.',
  STALE_STEP: 'Lượt đã thay đổi, hãy thao tác lại.', VERDICT_REQUIRED: 'Cần chốt phán quyết ban ngày trước.',
};
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const name = (id: unknown) => game.players.find(p => p.id === id)?.name ?? String(id ?? 'không ai');
const btn = (action: string, text: string, disabled = false, cls = '') => `<button type="button" data-action="${action}" class="${cls}" ${disabled ? 'disabled' : ''}>${text}</button>`;
function apply(command: Command, principal: Principal = { kind: 'moderator' }) {
  game = dispatch(game, principal, { id: crypto.randomUUID(), gameId: game.id, stepId: stepId(game), command });
}
function selectActive() { selected = actors(game)[0] ?? selected; }
function options(ids: string[], empty?: string) {
  return (empty ? `<option value="">${empty}</option>` : '') + ids.map(id => `<option value="${esc(id)}">${esc(name(id))}</option>`).join('');
}
function describeAction(a: Action): string {
  switch (a.type) {
    case 'bond': return `Liên kết với ${name(a.target)}`;
    case 'fast': return 'Xác nhận không cắn vì là Sói ăn chay cuối cùng';
    case 'compare': return `So sánh phe ${name(a.targets[0])} và ${name(a.targets[1])}`;
    case 'pair': return `Ghép đôi ${name(a.targets[0])} và ${name(a.targets[1])}`;
    case 'shoot': return `Bắn ${name(a.target)}`;
    case 'mimic': return `Sao chép ${name(a.target)}`;
    case 'protect': return `Bảo vệ ${name(a.target)}`;
    case 'inspect': return `Soi ${name(a.target)}`;
    case 'maul': return `Cắn ${a.targets.map(name).join(' và ')}`;
    case 'sacrifice': return `Đồng ý hy sinh ${name(a.target)}`;
    case 'convert': return a.target ? `Chuyển hóa ${name(a.target)}` : 'Không chuyển hóa';
    case 'bite': return `Cắn ${name(a.target)}`;
    case 'potion': {
      const parts = [a.heal ? 'Dùng thuốc cứu' : '', a.poison ? `Đầu độc ${name(a.poison)}` : ''].filter(Boolean);
      return parts.length ? parts.join(' · ') : 'Không dùng thuốc đêm nay';
    }
  }
}
function describeEvent(e: GameEvent) {
  const d = e.data;
  switch (e.type) {
    case 'death-bond-chosen': return `${name(d.actor)} chọn ${name(d.target)} cho liên kết ${d.kind === 'follow' ? 'bạn đồng hành' : 'người sợ mình'}.`;
    case 'death-bond': return `Bạn đã chọn ${name(d.target)}: ${d.kind === 'follow' ? 'bạn sẽ chết theo nếu người này chết' : 'người này sẽ chết nếu bạn chết'}.`;
    case 'feared-by': return `Bạn được ${name(d.actor)} chọn làm người sợ họ; nếu họ chết thì bạn chết theo.`;
    case 'cub-sacrifice-approved': return `Bầy đã thống nhất hy sinh ${name(d.actor)}, chuyển sang chọn hai nạn nhân.`;
    case 'alpha-converted': return `${name(d.actor)} đã chuyển hóa ${name(d.target)} thành Sói.`;
    case 'aura-inspection': return `${name(d.target)}: ${d.hasAbility ? 'có' : 'không có'} năng lực đặc biệt.`;
    case 'mystic-inspection': return `${name(d.target)} mang vai ${ROLES[d.role as Role].name}.`;
    case 'alignment-comparison': return `${(d.targets as string[]).map(name).join(' và ')} ${d.sameTeam ? 'cùng' : 'khác'} phe.`;
    case 'prince-revealed': return `${name(d.player)} là Hoàng tử, không bị treo cổ. Phán quyết hôm nay kết thúc.`;
    case 'apprentice-promoted': return `${name(d.actor)} trở thành Tiên tri mới.`;
    case 'bomb-exploded': return `${name(d.actor)} phát nổ, kéo theo ${(d.targets as string[]).map(name).join(', ') || 'không ai'}.`;
    case 'bite-delayed': return `${name(d.target)} mang vết cắn, sẽ chết cuối đêm ${d.deathNight}.`;
    case 'wolves-infected': return `Bầy Sói không được cắn trong đêm ${d.blockedNight}.`;
    case 'lovers': return `Bạn đã được se duyên với ${esc(d.partnerName)} ❤️`;
    case 'lovers-chosen': return `Cupid đã kết duyên cho ${(d.targets as string[]).map(name).join(' và ')}.`;
    case 'hunter-shot': return `${name(d.hunter)} nổ súng bắn ${name(d.target)}.`;
    case 'mimic-chosen': return `${name(d.actor)} đã chọn sao chép ${name(d.target)}.`;
    case 'mimic-target': return `Bạn đã chọn sao chép ${esc(d.targetName)}. Khi họ chết bạn sẽ nhận vai của họ!`;
    case 'cursed-transformed': return `Kẻ bị nguyền ${name(d.target)} bị Sói cắn và đã hóa thành Ma Sói!`;
    case 'transformed-to-wolf': return 'Bạn đã bị Sói cắn và biến thành Ma Sói! Từ nay bạn thuộc phe Sói.';
    case 'doppelganger-inherited': return `Nhân bản ${name(d.actor)} nhận vai ${ROLES[d.newRole as Role].name} từ ${name(d.from)}.`;
    case 'role-inherited': return `Mục tiêu đã chết! Bạn chính thức nhận vai ${esc(d.roleName)}.`;
    case 'action-confirmed': return `${name(d.actor)}: ${describeAction(d.action as Action)}`;
    case 'inspection': return `${name(d.target)}: ${d.isWolf ? 'mang vai Sói' : 'không mang vai Sói'}`;
    case 'pack-bite-blocked': return `Đòn cắn vào ${name(d.target)} không gây chết vì mục tiêu cũng là Sói chưa được bầy biết.`;
    case 'bite-blocked': return `${name(d.target)} sống qua đòn cắn nhờ ${[d.protected ? 'bảo vệ' : '', d.healed ? 'thuốc cứu' : ''].filter(Boolean).join(' và ')}.`;
    case 'death': return `${name(d.player)} chết do ${(d.causes as string[]).map(x => x === 'bite' ? 'Sói cắn' : x === 'poison' ? 'thuốc độc' : x === 'shot' ? 'Thợ săn bắn' : x === 'heartbreak' ? 'đau buồn vì người yêu chết' : x === 'delayed-bite' ? 'vết cắn từ đêm trước' : x === 'explosion' ? 'vụ nổ' : x === 'verdict' ? 'phán quyết' : x === 'sacrifice' ? 'bầy hy sinh' : x === 'companion' ? 'bạn đồng hành chết' : x === 'fear' ? 'liên kết Virginia' : x).join(' và ')}.`;
    case 'deaths': return `Công bố: ${(d.dead as string[]).map(name).join(', ')} đã chết.`;
    case 'morning': return (d.dead as string[]).length ? `Công bố: ${(d.dead as string[]).map(name).join(', ')} đã chết.` : 'Công bố: đêm qua không ai chết.';
    case 'verdict': return d.target ? `Phán quyết: loại ${name(d.target)}.` : 'Phán quyết: không loại ai.';
    case 'game-ended': return winners[d.winner as keyof typeof winners];
    default: return e.type;
  }
}
function playerPanel() {
  const v = playerView(game, selected), p = game.players.find(p => p.id === selected)!;
  const t = v.turn;
  let control = '<p class="hint">Chưa đến lượt hoặc người này không có hành động ở bước hiện tại.</p>';
  if (t) {
    if (!t.awake) control = btn('wake', 'Đã thức dậy');
    else if (t.submitted && game.step !== 'wolves') control = `<div class="success">Đã chốt: ${esc(describeAction(t.action!))}</div>`;
    else {
      const form = game.step === 'witch'
        ? `<div class="resources"><span>Cứu: ${v.self.resources.heal}</span><span>Độc: ${v.self.resources.poison}</span></div>
          <p>Mục tiêu cắn: <strong>${v.self.resources.heal > 0 ? v.biteTargets.map(name).map(esc).join(', ') || 'không ai' : 'không được xem (đã hết cứu)'}</strong></p>
          <label class="check"><input id="heal" type="checkbox" ${v.self.resources.heal === 0 || !v.biteTargets.length ? 'disabled' : ''}> Dùng thuốc cứu</label>
          ${v.biteTargets.length > 1 ? `<label>Người được cứu<select id="healTarget">${options(v.biteTargets)}</select></label>` : ''}
          <label>Thuốc độc<select id="poison" ${v.self.resources.poison === 0 ? 'disabled' : ''}>${options(t.targets, 'Không dùng độc')}</select></label>`
        : game.step === 'wolves'
        ? t.wolfPlan!.maxTargets === 0 ? '<p>Bạn là Sói ăn chay cuối cùng. Xác nhận thức dậy và không cắn đêm nay.</p>' : `<p>Chọn ${t.wolfPlan!.minTargets === t.wolfPlan!.maxTargets ? t.wolfPlan!.minTargets : `${t.wolfPlan!.minTargets}–${t.wolfPlan!.maxTargets}`} nạn nhân.${t.wolfPlan!.adjacentPair ? ' Hai người phải ngồi cạnh nhau nếu chọn hai.' : ''}</p>
          <label>Mục tiêu thứ nhất<select id="target">${options(t.targets)}</select></label>
          ${t.wolfPlan!.maxTargets > 1 ? `<label>Mục tiêu thứ hai<select id="target2">${options(t.targets, t.wolfPlan!.minTargets > 1 ? 'Phải chọn người thứ hai' : 'Chỉ chọn một người')}</select></label>` : ''}
          ${t.wolfPlan!.canOfferSacrifice || t.wolfPlan!.sacrificeTarget ? `<label class="check"><input id="sacrifice" type="checkbox"> ${t.wolfPlan!.canOfferSacrifice ? 'Tự đề nghị hy sinh' : `Đồng ý hy sinh ${esc(name(t.wolfPlan!.sacrificeTarget))}`}</label>` : ''}`
        : game.step === 'alpha_wolf'
        ? `<label>Chuyển hóa một nạn nhân<select id="convert">${options(t.targets, 'Không chuyển hóa')}</select></label>`
        : game.step === 'mentalist'
        ? `<p>Chọn hai người để so sánh phe:</p><label>Người thứ nhất<select id="compare1">${options(t.targets)}</select></label><label>Người thứ hai<select id="compare2">${options(t.targets)}</select></label>`
        : game.step === 'cupid'
        ? `<p>Chọn 2 người để se duyên:</p>
          <label>Người thứ nhất<select id="lover1">${options(t.targets)}</select></label>
          <label>Người thứ hai<select id="lover2">${options(t.targets)}</select></label>`
        : game.step === 'dire_wolf' || game.step === 'virginia_woolf'
        ? `<label>${game.step === 'dire_wolf' ? 'Bạn đồng hành' : 'Người sợ mình'}<select id="target">${options(t.targets)}</select></label>`
        : game.step === 'doppelganger'
        ? `<p>Chọn một người để sao chép vai khi họ chết:</p>
          <label>Mục tiêu sao chép<select id="target">${options(t.targets)}</select></label>`
        : game.step === 'hunter'
        ? `<div class="warning">Bạn đã chết! Hãy bắn phát súng cuối cùng vào một người khác.</div>
          <label>Mục tiêu bắn<select id="target">${options(t.targets)}</select></label>`
        : `<label>Mục tiêu<select id="target">${options(t.targets)}</select></label>`;
      control = `${t.submitted ? `<div class="success">Đã chọn: ${esc(describeAction(t.action!))}. Có thể đổi trước khi đóng lượt.</div>` : ''}${form}<div class="actions">${btn('submit', 'Xác nhận hành động')}</div>`;
    }
  }
  return `<h2>Thao tác người chơi</h2><label>Đóng vai người nào?<select id="player">${game.players.map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${esc(p.name)} · ${ROLES[p.role].name}</option>`).join('')}</select></label>
    <div class="role"><span class="eyebrow">THÔNG TIN RIÊNG CỦA ${esc(p.name)}</span><h3>${ROLES[p.role].name}</h3><p>${esc(v.self.description)}</p></div>
    ${v.deathBond ? `<div class="warning">Liên kết riêng: ${esc(name(v.deathBond.target))} (${v.deathBond.kind === 'follow' ? 'bạn chết theo người này' : 'người này chết theo bạn'}).</div>` : ''}
    ${v.lover ? `<div class="success">❤️ Người yêu của bạn: <strong>${esc(v.lover.partnerName)}</strong> (nếu một người chết, người kia chết theo)</div>` : ''}
    ${v.mimic ? `<div class="warning">🎭 Bạn đang sao chép <strong>${esc(v.mimic.targetName)}</strong>. Khi người này chết, bạn sẽ nhận vai của họ!</div>` : ''}
    ${control}
    ${v.pack ? `<h3 class="subheading">Lựa chọn của bầy</h3><ul>${v.pack.map(w => `<li>${esc(name(w.id))}: ${w.choice ? esc(describeAction(w.choice)) : 'chưa chọn'}</li>`).join('')}</ul>` : ''}
    ${v.messages.length ? `<h3 class="subheading">Kết quả riêng</h3>${v.messages.map(e => `<p class="success">Đêm ${e.night}: ${esc(describeEvent(e))}</p>`).join('')}` : ''}`;
}
function moderatorPanel() {
  const active = actors(game);
  let controls = '';
  if (['dire_wolf', 'virginia_woolf', 'cupid', 'doppelganger', 'guard', 'seer', 'aura_seer', 'mystic_seer', 'mentalist', 'wolves', 'alpha_wolf', 'witch', 'hunter'].includes(game.step)) {
    controls = `<ul class="progress">${active.length ? active.map(id => `<li><strong>${esc(name(id))}</strong><span>${Object.hasOwn(game.actions, id) ? '✓ Đã gửi' : game.awake.includes(id) ? 'Đang chọn' : 'Chưa thức dậy'}</span></li>`).join('') : '<li>Không có người cần hành động. Có thể chuyển lượt.</li>'}</ul>${btn('advance', 'Chốt lượt → Bước tiếp', !active.every(id => Object.hasOwn(game.actions, id)))}`;
  } else if (game.step === 'review') {
    controls = game.resolved
      ? `<div class="warning">Kết quả riêng: ${game.pendingDeaths.length ? game.pendingDeaths.map(name).map(esc).join(', ') + ' chết' : 'không ai chết'}. Làng chưa thấy.</div>${btn('publish', 'Công bố buổi sáng')}`
      : `<p>Đã thu đủ hành động. Bấm để tính tương tác theo luật.</p>${btn('resolve', 'Xử lý đêm')}`;
  } else if (game.step === 'day') {
    controls = game.verdictDone ? btn('nextNight', 'Bắt đầu đêm tiếp theo')
      : `<p class="hint">Tạm ghi phán quyết bằng tay để test. Chưa có giao diện bỏ phiếu hoặc đồng hồ.</p><label>Phán quyết<select id="verdict">${options(game.players.filter(p => p.alive).map(p => p.id), 'Không loại ai')}</select></label>${btn('verdict', 'Chốt phán quyết')}`;
  } else controls = `<div class="success">${winners[game.winner!]}</div><p>Bấm “Ván mới” ở đầu trang để thử lại.</p>`;
  const script = MODERATOR_SCRIPTS[game.step];
  const speechBox = script
    ? `<div class="speech-prompt"><span class="eyebrow">LỜI ĐỌC GỢI Ý CHO QUẢN TRÒ</span><p>🗣️ “${esc(script.wake)}”</p>${script.sleep ? `<p class="hint">Khi xong bước: “${esc(script.sleep)}”</p>` : ''}</div>`
    : '';
  return `<h2>Điều phối quản trò</h2><div class="stage"><span>Đêm / Ngày ${game.night}</span><strong>${labels[game.step]}</strong></div>${speechBox}${controls}<h3 class="subheading">Toàn bộ vai — chỉ để test</h3><div class="roster">${game.players.map(p => `<div class="person ${p.alive ? '' : 'dead'}"><strong>${esc(p.name)}</strong><span>${ROLES[p.role].name}</span><small>${p.alive ? 'Còn sống' : 'Đã chết'}${!p.alive && !game.publicDead.includes(p.id) ? ' · chưa công bố' : ''}</small></div>`).join('')}</div>`;
}
function render() {
  const pub = publicView(game);
  app.innerHTML = `<header><div><span class="eyebrow">MULTI-ONLINE / SANDBOX 0.2</span><h1>Bàn thử luật Ma Sói</h1><p>Bấm thử một ván, xem điều gì xảy ra.</p></div><div class="actions">${btn('conditional', 'Mẫu liên kết và ngủ', false, 'secondary')}${btn('wolves', 'Mẫu bầy Sói', false, 'secondary')}${btn('extended', `Mẫu ${rosterExtended.length} vai`, false, 'secondary')}${btn('full', 'Mẫu 10 người (9 vai nền)', false, 'secondary')}${btn('reset', 'Mẫu 6 người cơ bản', false, 'secondary')}${btn('pack', 'Mẫu 7 người · 2 Sói', false, 'secondary')}</div></header>
  <div class="warning">Bản thử trên một máy: bạn điều khiển tất cả vai. Không có phòng online, tự lưu hay bảo mật vai thật. Tải lại trang sẽ bắt đầu lại.</div>
  <details class="guide"><summary>Cách thử nhanh</summary><ol><li>Chọn người đang được gọi → “Đã thức dậy” → chọn mục tiêu → xác nhận.</li><li>Ở cột quản trò, chốt lượt để sang vai tiếp. Mọi vai đều phải hoàn tất hành động.</li><li>Xử lý đêm để xem nguyên nhân; bấm công bố rồi so sánh bảng cả làng.</li></ol><p>Thử: Bảo vệ chọn An, Sói cắn An, Phù thủy độc An. An vẫn chết do độc.</p></details>
  <div id="notice" class="notice ${error ? 'error' : ''}" role="status" aria-live="polite">${esc(notice)}</div>
  <main><section>${moderatorPanel()}</section><section>${playerPanel()}</section><section><h2>Cả làng nhìn thấy</h2><p class="hint">Bản xem trước dữ liệu công khai. Không hiện vai hay nguyên nhân chết.</p><div class="stage"><span>Ngày / Đêm ${pub.night}</span><strong>${pub.phase === 'night' ? 'Đang trong đêm' : pub.phase === 'day' ? 'Trời sáng' : 'Ván kết thúc'}</strong></div>
  <ul class="public-list">${pub.players.map(p => `<li><strong>${esc(p.name)}</strong><span class="${p.alive ? 'alive' : 'out'}">${p.alive ? 'Còn sống' : 'Đã chết'}</span></li>`).join('')}</ul>
  <h3 class="subheading">Thông báo chung</h3>${pub.announcements.length ? pub.announcements.map(e => `<p class="announcement">${esc(describeEvent(e))}</p>`).join('') : '<p class="hint">Chưa có công bố.</p>'}</section></main>
  <section class="log"><h2>Nhật ký riêng của quản trò</h2><p class="hint">Dùng để đối chiếu hành động và kết quả. Dữ liệu này không thuộc bảng cả làng.</p>${game.events.length ? `<ol>${[...game.events].reverse().map(e => `<li><span>Đêm ${e.night}</span> ${esc(describeEvent(e))}</li>`).join('')}</ol>` : '<p>Chưa có hành động.</p>'}</section>`;
}
function reset(mode: 'basic' | 'pack' | 'full' | 'extended' | 'wolves' | 'conditional') {
  if (game.revision > 0 && !window.confirm('Bỏ ván thử hiện tại và bắt đầu ván mới?')) return;
  if (mode === 'conditional') {
    game = createGame('sandbox', rosterConditional); selected = actors(game)[0]; notice = 'Mẫu 15 người cho liên kết một chiều và Sói ngủ theo điều kiện.';
  } else if (mode === 'wolves') {
    game = createGame('sandbox', rosterWolves); selected = 'z4'; notice = 'Ván thử 12 người cho Sói con, Sói đại ca và Alpha.';
  } else if (mode === 'extended') {
    game = createGame('sandbox', rosterExtended);
    selected = actors(game)[0] ?? rosterExtended[0].id; notice = `Ván thử ${rosterExtended.length} vai. Thứ tự danh sách là thứ tự ghế vòng tròn.`;
  } else if (mode === 'full') {
    game = createGame('sandbox', rosterFull);
    selected = 'p6'; notice = 'Ván mới 10 người đủ 9 vai. Bắt đầu với Cupid.';
  } else if (mode === 'pack') {
    game = createGame('sandbox', [...roster, { id: 'p7', name: 'Nam', role: 'wolf' }]);
    selected = 'p2'; notice = 'Ván mới 7 người 2 Sói. Bắt đầu với Bảo vệ.';
  } else {
    game = createGame('sandbox', roster);
    selected = 'p2'; notice = 'Ván mới 6 người cơ bản. Bắt đầu với Bảo vệ.';
  }
  error = false;
}
app.addEventListener('change', e => {
  if ((e.target as HTMLElement).id === 'player') { selected = (e.target as HTMLSelectElement).value; render(); }
});
app.addEventListener('click', e => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  const principal: Principal = { kind: 'player', playerId: selected };
  const value = (id: string) => document.querySelector<HTMLSelectElement>(`#${id}`)!.value;
  try {
    error = false;
    if (action === 'conditional') reset('conditional');
    else if (action === 'wolves') reset('wolves');
    else if (action === 'extended') reset('extended');
    else if (action === 'reset') reset('basic');
    else if (action === 'pack') reset('pack');
    else if (action === 'full') reset('full');
    else if (action === 'wake') { apply({ type: 'wake' }, principal); notice = 'Đã thức dậy. Chọn hành động bên dưới.'; }
    else if (action === 'submit') {
      const a: Action = game.step === 'witch'
        ? { type: 'potion', heal: document.querySelector<HTMLInputElement>('#heal')!.checked, ...(document.querySelector<HTMLInputElement>('#heal')!.checked && document.querySelector('#healTarget') ? { healTarget: value('healTarget') } : {}), poison: value('poison') || null }
        : game.step === 'wolves'
        ? playerView(game, selected).turn!.wolfPlan!.maxTargets === 0 ? { type: 'fast' } : document.querySelector<HTMLInputElement>('#sacrifice')?.checked
          ? { type: 'sacrifice', target: game.players.find(p => p.id === selected)!.role === 'wolf_cub' ? selected : playerView(game, selected).turn!.wolfPlan!.sacrificeTarget! }
          : document.querySelector('#target2') && value('target2') ? { type: 'maul', targets: [value('target'), value('target2')] } : { type: 'bite', target: value('target') }
        : game.step === 'alpha_wolf'
        ? { type: 'convert', target: value('convert') || null }
        : game.step === 'mentalist'
        ? { type: 'compare', targets: [value('compare1'), value('compare2')] }
        : game.step === 'cupid'
        ? { type: 'pair', targets: [value('lover1'), value('lover2')] }
        : game.step === 'hunter'
        ? { type: 'shoot', target: value('target') }
        : game.step === 'dire_wolf' || game.step === 'virginia_woolf'
        ? { type: 'bond', target: value('target') }
        : game.step === 'doppelganger'
        ? { type: 'mimic', target: value('target') }
        : { type: game.step === 'guard' ? 'protect' : ['seer', 'aura_seer', 'mystic_seer'].includes(game.step) ? 'inspect' : 'bite', target: value('target') };
      apply({ type: 'act', action: a }, principal); notice = 'Đã ghi nhận hành động. Quản trò có thể chốt lượt khi đủ người.';
    } else if (action === 'verdict') { apply({ type: 'verdict', target: value('verdict') || null }); notice = 'Đã chốt phán quyết ban ngày.'; }
    else if (['advance', 'resolve', 'publish', 'nextNight'].includes(action!)) {
      apply({ type: action } as Command); selectActive();
      notice = action === 'resolve' ? 'Đã xử lý đêm. Xem nhật ký nguyên nhân trước khi công bố.' : action === 'publish' ? 'Kết quả đã xuất hiện ở bảng cả làng.' : `Đã chuyển sang: ${labels[game.step]}.`;
    }
    render();
  } catch (err) {
    error = true; notice = err instanceof RuleError ? errors[err.code] ?? `Luật từ chối thao tác: ${err.code}` : 'Không thực hiện được thao tác. Hãy thử lại.';
    // Preserve the selections so the tester can correct a rejected action.
    const n = document.querySelector('#notice')!; n.textContent = notice; n.className = 'notice error';
  }
});
render();
