// Audit HTTP nhiều danh tính: lobby → bộ vai → chia → ready/begin → đêm/hành động/ACK
// → resolve/publish → phán quyết → rút người → thắng. Kèm đo độ trễ: thời gian ACK của
// người gửi và thời gian máy khác nhìn thấy thay đổi qua poll.
// Chạy: node docs/verification/audit-online-http.mjs [origin] [số mẫu trễ]
// Origin mặc định http://127.0.0.1:5199 (server thử nghiệm riêng, kho dữ liệu riêng).
const origin = process.argv[2] ?? 'http://127.0.0.1:5199';
const allowed=new URL(origin); if(!['127.0.0.1','localhost'].includes(allowed.hostname)) throw new Error('Audit chỉ chạy với kho thử local.');
const startedAt=Date.now(); let requestCount=0;
function bounded(){if(Date.now()-startedAt>120000||++requestCount>800)throw new Error('Audit vượt giới hạn thời gian/số yêu cầu.');}
const LATENCY_SAMPLES = Number(process.argv[3] ?? 12);
let failures = 0, checks = 0;
const latencyAck = [], latencyVisible = [];
let lastWrite = null; // ghi nhận write command thành công cuối để thử replay
const fail = (name, detail = '') => { failures++; throw new Error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); };
const ok = (name) => { checks++; console.log(`ok   ${name}`); };
const hex = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
const rid = () => hex().slice(0, 32);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function post(tok, body) {
  bounded();
  const t0 = performance.now();
  const res = await fetch(`${origin}/api/room`, {
    method: 'POST', signal:AbortSignal.timeout(8000), headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}` }, body: JSON.stringify(body),
  });
  const json = await res.json();
  const ms = Math.round(performance.now() - t0);
  if (res.status === 200 && body.type === 'command') lastWrite = { tok, body, revision: json?.room?.revision, viewVersion: json?.viewVersion };
  return { status: res.status, json, ms };
}
async function get(tok, code, extra = '') {
  bounded();
  const res = await fetch(`${origin}/api/room?code=${code}${extra}`, { signal:AbortSignal.timeout(8000), headers: { authorization: `Bearer ${tok}` } });
  return { status: res.status, json: await res.json() };
}
async function expectError(label, promise, code) {
  const r = await promise;
  if (r.status >= 400 && r.json?.error?.code === code) ok(`${label} → ${code}`);
  else fail(label, `kỳ vọng ${code}, nhận status=${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  return r;
}
function expect(cond, label, detail = '') { cond ? ok(label) : fail(label, detail); }

const mod = hex();
const players = Array.from({ length: 7 }, () => hex());

// 0) config
{
  const res = await fetch(`${origin}/api/room?config=1`);
  const cfg = await res.json();
  expect(res.status === 200 && cfg.storage === 'local', 'config đọc được, storage=local (không đụng cloud)', JSON.stringify(cfg).slice(0, 120));
}

// 1) tạo phòng + join
const created = await post(mod, { type: 'create', requestId: rid(), name: 'Quản trò' });
expect(created.status === 200 && created.json?.room?.code, 'tạo phòng', JSON.stringify(created.json).slice(0, 200));
const code = created.json.room.code;
const names = [...'P1 P2 P3 P4 P5 P6 P7'.split(' ')];
for (let i = 0; i < players.length; i++) {
  const r = await post(players[i], { type: 'join', requestId: rid(), code, name: names[i] });
  if (r.status !== 200) fail(`join ${names[i]}`, JSON.stringify(r.json).slice(0, 200));
}
ok('7 người chơi join');
await expectError('join mã phòng không tồn tại', post(hex(), { type: 'join', requestId: rid(), code: '000000', name: 'X' }), 'ROOM_NOT_FOUND');

// 2) bộ vai: chặn vai chưa hỗ trợ, CAS lệch revision
const rev = async () => (await get(mod, code)).json.room.revision;
await expectError('setDeck chứa vai chưa hỗ trợ', post(mod, { type: 'setDeck', requestId: rid(), code, expectedRevision: await rev(), roles: ['invented-role'] }), 'UNSUPPORTED_ROLE');
// 7 người chơi (quản trò không chơi): 2 Sói + 5 vai/lá còn lại
const deck = ['wolf', 'wolf', 'seer', 'guard', 'witch', 'hunter', 'villager'];
const staleRevision = await rev();
const setDeck = await post(mod, { type: 'setDeck', requestId: rid(), code, expectedRevision: await rev(), roles: deck });
expect(setDeck.status === 200, 'setDeck hợp lệ (7 lá)', JSON.stringify(setDeck.json).slice(0, 120));
await expectError('setDeck với revision đã cũ (CAS)', post(mod, { type: 'setDeck', requestId: rid(), code, expectedRevision: staleRevision, roles: deck }), 'STALE_ROOM');

// 3) start → ready → begin
const started = await post(mod, { type: 'start', requestId: rid(), code, expectedRevision: await rev(), roles: deck, settings: { witchSeesBite: false } });
expect(started.status === 200, 'chia vai (start)', JSON.stringify(started.json).slice(0, 200));
await expectError('begin khi chưa ai ready', post(mod, { type: 'begin', requestId: rid(), code, expectedRevision: await rev() }), 'PLAYERS_NOT_READY');
for (const tok of players) {
  const r = await post(tok, { type: 'ready', requestId: rid(), code });
  if (r.status !== 200) fail('ready', JSON.stringify(r.json).slice(0, 150));
}
ok('7 người chơi ready');
const begun = await post(mod, { type: 'begin', requestId: rid(), code, expectedRevision: await rev() });
expect(begun.status === 200 && begun.json.game, 'begin vào đêm 1', JSON.stringify(begun.json).slice(0, 150));

// Nhân dạng + định tuyến hành động theo vai từ moderator view (công cụ kiểm thử, không phải người chơi)
const g0 = begun.json.game;
expect(Array.isArray(g0.players) && g0.players.length === 7, '7 người chơi trong ván (quản trò không chơi)');
const roleOf = Object.fromEntries(g0.players.map(p => [p.id, p.role]));
const seatOf = Object.fromEntries(g0.players.map(p => [p.id, p.name]));
const tokenOf = {};
for (let i = 0; i < players.length; i++) {
  const snap = (await get(players[i], code)).json;
  tokenOf[snap.me.id] = players[i];
}
const byRole = r => Object.entries(roleOf).filter(([, v]) => v === r).map(([k]) => k);
const wolves = byRole('wolf'), seerId = byRole('seer')[0], guardId = byRole('guard')[0],
  witchId = byRole('witch')[0], hunterId = byRole('hunter')[0];
const wolfTokens = wolves.map(w => tokenOf[w]);
expect(wolves.length === 2 && !!seerId && !!guardId && !!witchId && !!hunterId, 'đủ vai trong deck', JSON.stringify(roleOf));

const modView = async () => (await get(mod, code)).json;
const game = async () => (await modView()).game;
const stepIdOf = gm => gm.stepId;
const alive = gm => gm.players.filter(p => p.alive).map(p => p.id);

// Người chơi không nhận room.revision (cố ý null) — quan sát thay đổi qua viewVersion.
async function pollVisible(prevVersion, tok, deadlineMs = 5000) {
  const t0 = performance.now();
  while (performance.now() - t0 < deadlineMs) {
    const r = await get(tok, code);
    if (r.json?.viewVersion && r.json.viewVersion !== prevVersion) return Math.round(performance.now() - t0);
    await sleep(60);
  }
  return -1;
}

// Người chơi: đọc turn từ view của mình → wake → act. Đo trễ ACK + thời gian máy khác thấy.
async function playerAct(pid, action, opts = {}) {
  const tok = tokenOf[pid];
  const snap = (await get(tok, code)).json;
  const turn = snap.game?.turn;
  if (!turn) fail('actor không có lượt đang chờ', `actor=${seatOf[pid]??'unknown'} status=${snap.error?.code??'no-turn'}`);
  const stepId = turn.stepId;
  const other = players.find(t => t !== tok);
  await post(tok, { type: 'command', requestId: rid(), code, stepId, command: { type: 'wake' } })
    .then(r => { if (r.status !== 200) fail('wake bắt buộc thất bại', r.json?.error?.code??String(r.status)); });
  const otherVersion = (await get(mod, code)).json.viewVersion;
  const t0 = performance.now();
  const act = await post(tok, { type: 'command', requestId: rid(), code, stepId, command: { type: 'act', action } });
  if (act.status !== 200) return { error: 'act', json: act.json };
  if (!opts.noLatency && latencyAck.length < LATENCY_SAMPLES) latencyAck.push(Math.round(performance.now() - t0));
  if (!opts.noLatency && latencyVisible.length < LATENCY_SAMPLES) {
    // Hành động bí mật không đổi view người ngoài; quản trò luôn thấy tiến độ → đo qua view quản trò.
    const ms = await pollVisible(otherVersion, mod);
    if (ms >= 0) latencyVisible.push(ms);
  }
  return { ok: true, stepId };
}

// 4) chuyển người sang dùng máy quản trò + proxy có kiểm quyền (giữa ván, còn người sống)
{
  const cur = await modView();
  const member = cur.room.members.find(m => roleOf[m.id] === 'villager');
  if (member) {
    const off = await post(mod, { type: 'setOffline', requestId: rid(), code, expectedRevision: cur.room.revision, playerId: member.id });
    expect(off.status === 200, 'setOffline người chơi giữa ván', JSON.stringify(off.json).slice(0, 120));
    const proxied = await get(mod, code, `&offlinePlayerId=${member.id}`);
    expect(proxied.status === 200 && proxied.json.me?.id === member.id, 'GET qua proxy đúng danh tính người offline', JSON.stringify(proxied.json.me ?? {}));
    const proxyAct = await post(mod, { type: 'offlineCommand', requestId: rid(), code, playerId: member.id, stepId: stepIdOf(await game()), command: { type: 'dayPhase', action: 'next' } });
    expect(proxyAct.status !== 500, 'offlineCommand qua máy chủ không sập (quyền bị kiểm)', JSON.stringify(proxyAct.json).slice(0, 150));
    const stranger = await post(hex(), { type: 'offlineCommand', requestId: rid(), code, playerId: member.id, stepId: stepIdOf(await game()), command: { type: 'dayPhase', action: 'next' } });
    expect(stranger.status >= 400 && stranger.status < 500, 'người lạ không proxy được danh tính người khác', JSON.stringify(stranger.json).slice(0, 120));
  } else fail('không có dân làng để thử chuyển offline');
}

// 5) CAS đồng thời: hai mutation cùng expectedRevision, 1 thắng 1 STALE_ROOM
{
  const rev = (await modView()).room.revision;
  const targetA = (await modView()).room.members.find(m => m.offline)?.id ?? wolves[0];
  const targetB = wolves.find(w => w !== targetA) ?? wolves[0];
  const [a, b] = await Promise.all([
    post(mod, { type: 'setOffline', requestId: rid(), code, expectedRevision: rev, playerId: targetA }),
    post(mod, { type: 'setOffline', requestId: rid(), code, expectedRevision: rev, playerId: targetB }),
  ]);
  const stale = [a, b].filter(r => r.json?.error?.code === 'STALE_ROOM').length;
  const good = [a, b].filter(r => r.status === 200).length;
  expect(good === 1 && stale === 1, 'CAS đồng thời: 1 thắng 1 STALE_ROOM', `good=${good} stale=${stale} a=${a.json?.error?.code ?? 200} b=${b.json?.error?.code ?? 200}`);
}

// 6) vòng ván tới khi có winner
let night = 1;
let guardBlockedOneBite = false;
let guardTarget = null;
const guardHistory = [];
while (night <= 20) {
  const gm = await game();
  if (gm.winner) break;
  // -- Đêm: điều phối tới khi step review --
  for (let safety = 0; safety < 80; safety++) {
    const cur = await game();
    if (cur.winner) break;
    if (cur.step === 'review') break;
    const living = alive(cur);
    let needsActor = false;
    if (cur.step === 'guard' && living.includes(guardId)) {
      needsActor = true;
      const prefer = [witchId, seerId].find(x => x && living.includes(x) && x !== guardHistory.at(-1));
      guardTarget = guardHistory.length === 0 ? guardId : (prefer ?? living.find(x => x !== guardId && x !== guardHistory.at(-1)) ?? (guardHistory.at(-1) !== guardId ? guardId : null));
      const r = await playerAct(guardId, { type: 'protect', target: guardTarget });
      if (r.error) fail('guard act', JSON.stringify(r.json));
      guardHistory.push(guardTarget);
    } else if (cur.step === 'seer' && living.includes(seerId)) {
      needsActor = true;
      const t = living.find(x => x !== seerId);
      const r = await playerAct(seerId, { type: 'inspect', target: t });
      if (r.error) fail('seer act', JSON.stringify(r.json));
    } else if (cur.step === 'hunter' && living.includes(hunterId)) {
      needsActor = true;
      const t = living.find(x => !wolves.includes(x) && x !== hunterId) ?? living.find(x => x !== hunterId);
      const r = await playerAct(hunterId, { type: 'shoot', target: t }); // v13 bị động: ghim
      if (r.error) fail('hunter act', JSON.stringify(r.json));
    } else if (cur.step === 'witch' && living.includes(witchId)) {
      needsActor = true;
      const r = await playerAct(witchId, { type: 'potion', heal: false, poison: null });
      if (r.error) fail('witch act', JSON.stringify(r.json));
    } else if (cur.step === 'wolves' && living.some(x => wolves.includes(x))) {
      // Đêm 2: cắn đúng mục tiêu Bảo vệ đang giữ để xác minh việc chặn qua HTTP.
      // Đêm khác: ưu tiên Tiên tri → Phù thủy → Dân; tránh Thợ săn để ghim không kích hoạt sớm.
      const preyPref = (night === 2 && guardTarget && living.includes(guardTarget) && !wolves.includes(guardTarget))
        ? guardTarget
        : (['seer', 'witch', 'villager', 'hunter'].map(r => living.find(x => !wolves.includes(x) && x !== guardTarget && roleOf[x] === r)).find(Boolean)
          ?? living.find(x => !wolves.includes(x) && x !== guardTarget));
      const prey = preyPref;
      if (prey) {
        needsActor = true;
        const r1 = await playerAct(wolves[0], { type: 'maul', targets: [prey] });
        if (r1.error) fail('wolf act', JSON.stringify(r1.json));
        const otherPrey = living.find(x => !wolves.includes(x) && x !== prey);
        const snap2 = (await get(wolfTokens[1], code)).json;
        if (wolves[1] && otherPrey && living.includes(wolves[1]) && snap2.game?.turn) {
          const stepId = snap2.game.turn.stepId;
          await post(wolfTokens[1], { type: 'command', requestId: rid(), code, stepId, command: { type: 'wake' } });
          await post(wolfTokens[1], { type: 'command', requestId: rid(), code, stepId, command: { type: 'act', action: { type: 'maul', targets: [otherPrey] } } });
          const adv = await post(mod, { type: 'command', requestId: rid(), code, stepId: stepIdOf(await game()), command: { type: 'advance' } });
          if (adv.json?.error?.code === 'WOLVES_DISAGREE') ok('bầy bất đồng bị chặn khi advance (WOLVES_DISAGREE)');
          else fail('advance khi bầy bất đồng', JSON.stringify(adv.json).slice(0, 150));
          const r2 = await post(wolfTokens[1], { type: 'command', requestId: rid(), code, stepId, command: { type: 'act', action: { type: 'maul', targets: [prey] } } });
          if (r2.status !== 200) fail('sói đôi đổi ý đồng thuận', JSON.stringify(r2.json).slice(0, 150));
        }
      }
    } else if (!['guard', 'seer', 'hunter', 'witch', 'wolves', 'review'].includes(cur.step)) {
      needsActor = false; // step mở đầu/không có actor trong deck này → advance
    }
    const adv = await post(mod, { type: 'command', requestId: rid(), code, stepId: stepIdOf(await game()), command: { type: 'advance' } });
    if (adv.status !== 200 && adv.json?.error?.code === 'WAITING_FOR_ACTIONS') { if (needsActor) continue; fail('advance chờ hành động dù không còn actor', JSON.stringify(adv.json).slice(0, 200)); }
    else if (adv.status !== 200) fail(`advance step ${cur.step}`, JSON.stringify(adv.json).slice(0, 150));
  }
  const resolved = await post(mod, { type: 'command', requestId: rid(), code, stepId: stepIdOf(await game()), command: { type: 'resolve' } });
  expect(resolved.status === 200, `resolve đêm ${night}`, JSON.stringify(resolved.json).slice(0, 150));
  const published = await post(mod, { type: 'command', requestId: rid(), code, stepId: stepIdOf(await game()), command: { type: 'publish' } });
  expect(published.status === 200, `publish đêm ${night}`, JSON.stringify(published.json).slice(0, 150));
  const deadTonight = (await game()).events.filter(e => e.type === 'morning').at(-1)?.data?.dead ?? [];
  console.log(`     [đêm ${night}] chết: ${deadTonight.map(id => seatOf[id] ?? id).join(', ') || 'không ai'}`);
  if (night === 2 && deadTonight.length === 0) guardBlockedOneBite = true;
  // -- Ngày: mở đồng hồ, phán quyết treo người không phải sói --
  await post(mod, { type: 'command', requestId: rid(), code, stepId: stepIdOf(await game()), command: { type: 'dayPhase', action: 'start' } });
  const cur2 = await game();
  if (cur2.winner) break;
  if (!cur2.verdictDone) {
    const aliveNow = alive(cur2);
    // Treo một người không phải sói, không phải Thợ săn (giữ ghim), không phải Bảo vệ (giữ kịch bản chặn cắn)
    const victim = aliveNow.find(x => !wolves.includes(x) && x !== hunterId && x !== guardId) ?? aliveNow[0];
    const v = await post(mod, { type: 'command', requestId: rid(), code, stepId: stepIdOf(cur2), command: { type: 'verdict', target: victim } });
    if (v.status !== 200) fail(`verdict ngày ${night}`, JSON.stringify(v.json).slice(0, 150));
  }
  if (!(await game()).winner) {
    const nn = await post(mod, { type: 'command', requestId: rid(), code, stepId: stepIdOf(await game()), command: { type: 'nextNight' } });
    if (nn.status !== 200) fail('nextNight', JSON.stringify(nn.json).slice(0, 150));
    night++;
  }
}
const finalG = await game();
expect(!!finalG.winner, `ván kết thúc có winner (sau ${night - 1} đêm)`, JSON.stringify(finalG.winner ?? null));
expect(finalG.winner === 'wolves', 'phe Sói thắng khi đạt parity (kịch bản này)', JSON.stringify(finalG.winner));

// 7) idempotency qua HTTP thật: replay write thành công cuối + đổi nội dung
{
  expect(!!lastWrite, 'có ghi nhận write thành công để thử replay');
  if (lastWrite) {
    const r2 = await post(lastWrite.tok, lastWrite.body);
    expect(r2.status === 200 && r2.json?.room?.revision === lastWrite.revision && r2.json?.viewVersion === lastWrite.viewVersion,
      'retry cùng requestId+content → ACK lại snapshot cũ (revision/viewVersion không đổi)',
      `kỳ vọng rev=${lastWrite.revision}, nhận ${r2.status}/${r2.json?.room?.revision}`);
    const r3 = await post(lastWrite.tok, { ...lastWrite.body, command: { type: 'verdict', target: null } });
    expect(r3.status >= 400 && r3.status < 500 && r3.json?.error?.code === 'REQUEST_ID_REUSED', 'requestId trùng, nội dung khác → REQUEST_ID_REUSED', JSON.stringify(r3.json));
    const r4 = await post(lastWrite.tok, { ...lastWrite.body, stepId: 'fake:9:9:wolves' });
    expect(r4.status >= 400 && r4.status < 500 && ['REQUEST_ID_REUSED', 'STALE_STEP'].includes(r4.json?.error?.code), 'stepId giả → STALE_STEP/REQUEST_ID_REUSED', JSON.stringify(r4.json));
  }
}

// 8) rò rỉ bí mật trên mọi player view
{
  const leaked = [];
  for (const tok of Object.values(tokenOf)) {
    const snap = (await get(tok, code)).json;
    const raw = JSON.stringify(snap);
    for (const key of ['"initialRole"', '"hunterMark"', '"healTarget"', '"poisonTarget"', '"protectedTarget"', '"alphaTarget"', '"knownWolves"', '"receipts"', '"lastProtected"', '"delayedDeathNight"']) {
      if (raw.includes(key)) leaked.push(`${key} lộ cho ${snap.me.name}`);
    }
    // biteTargets chỉ được khác rỗng cho Phù thủy đang lượt và bật xem nạn nhân
    const bites = snap.game?.biteTargets;
    if (Array.isArray(bites) && bites.length > 0 && snap.game?.self?.role !== 'witch') leaked.push(`biteTargets ${JSON.stringify(bites)} lộ cho ${snap.me.name}`);
    if (Array.isArray(snap.game?.players)) {
      for (const p of snap.game.players) {
        if (p.id !== snap.me.id && ('role' in p || 'initialRole' in p)) leaked.push(`role của ${seatOf[p.id] ?? p.id} lộ cho ${snap.me.name}`);
      }
    }
  }
  expect(leaked.length === 0, 'player view không rò bí mật (role/actions/targets/receipts)', leaked.join('; '));
  const modSnap = await modView();
  expect(Array.isArray(modSnap.game?.events) && modSnap.game.events.length > 0, 'moderator view giữ nhật ký đầy đủ');
}

// 9) form cũ / trường lạ / JSON sai
{
  await expectError('mutation chứa trường lạ', post(mod, { type: 'command', requestId: rid(), code, stepId: stepIdOf(await game()), command: { type: 'advance' }, extra: 1 }), 'UNKNOWN_FIELD');
  const bad = await fetch(`${origin}/api/room`, { method: 'POST', signal:AbortSignal.timeout(8000), headers: { 'content-type': 'text/plain', authorization: `Bearer ${mod}` }, body: '{}' });
  expect(bad.status === 400 && (await bad.json()).error?.code === 'JSON_REQUIRED', 'content-type sai → JSON_REQUIRED');
  const bad2 = await fetch(`${origin}/api/room`, { method: 'POST', signal:AbortSignal.timeout(8000), headers: { 'content-type': 'application/json', authorization: `Bearer ${mod}` }, body: '{nope' });
  expect(bad2.status === 400 && (await bad2.json()).error?.code === 'INVALID_JSON', 'JSON hỏng → INVALID_JSON');
  const bad3 = await fetch(`${origin}/api/room?code=${code}&hijack=1`, { headers: { authorization: `Bearer ${mod}` } });
  expect(bad3.status === 400 && (await bad3.json()).error?.code === 'UNKNOWN_FIELD', 'GET tham số lạ → UNKNOWN_FIELD');
}

// 10) rút người giữa ván: không dây chuyền, không kết thúc oan
{
  const cur = await modView();
  const gm = cur.game;
  const deadBefore = gm.publicDead.length;
  const target = cur.room.members.find(m => !m.left && !m.offline && gm.players.find(p => p.id === m.id)?.alive && roleOf[m.id] !== 'wolf')
    ?? cur.room.members.find(m => !m.left && !m.offline);
  if (target) {
    const rem = await post(mod, { type: 'removeMember', requestId: rid(), code, expectedRevision: cur.room.revision, playerId: target.id });
    expect(rem.status === 200, 'rút người giữa ván', JSON.stringify(rem.json).slice(0, 150));
    const after = await game();
    const added = after.publicDead.filter(x => !gm.publicDead.includes(x));
    expect(added.length === 1 && added[0] === target.id, 'rút người chỉ đánh dấu người rút là công khai, không dây chuyền (D59)', `thêm=${JSON.stringify(added)} kỳ vọng=[${target.id}]`);
  } else fail('không còn người phù hợp để thử rút');
}

// 11) reconnect: cùng token đọc lại cùng viewVersion
{
  const tok = Object.values(tokenOf)[0];
  const s1 = (await get(tok, code)).json;
  const s2 = (await get(tok, code)).json;
  expect(s1.viewVersion === s2.viewVersion, 'đọc lại cùng token cùng viewVersion (reconnect ổn định)');
  expect(!!s1.game, 'reconnect vẫn thấy ván');
}

const summary = arr => arr.length ? { n: arr.length, median: [...arr].sort((x, y) => x - y)[Math.floor(arr.length / 2)], max: Math.max(...arr) } : null;
console.log('\n=== ĐỘ TRỲ (ms, local) ===');
console.log('ACK người gửi:', JSON.stringify(summary(latencyAck)));
console.log('Máy khác thấy qua poll:', JSON.stringify(summary(latencyVisible)));
console.log(guardBlockedOneBite ? 'ok   Bảo vệ chặn được cắn qua HTTP (một đêm không ai chết)' : 'WARN không xác minh được Bảo vệ chặn cắn (đêm 2 vẫn có chết)');
console.log(`\n${failures ? `${failures} FAIL / ${checks} ok` : `TẤT CẢ ${checks} kiểm tra ĐẠT`}`);
process.exit(failures ? 1 : 0);
