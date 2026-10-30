import { ROLES } from '../src/engine/rules.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { FileRoomRepository, SupabaseRoomRepository, configuredRepository } from '../src/server/repositories.ts';
import { RoomService } from '../src/server/rooms.ts';
import { createApiHandler } from '../src/server/http.ts';
import type { Snapshot } from '../src/server/types.ts';

const credential = () => randomBytes(32).toString('hex');
async function listen(server: Server) {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert(address && typeof address !== 'string');
  return `http://127.0.0.1:${address.port}`;
}
async function close(server: Server) {
  server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
}
async function fixture(t: Parameters<Parameters<typeof test>[1]>[0], autoBegin = true) {
  const directory = await mkdtemp(join(tmpdir(), 'ma-soi-http-'));
  const repository = new FileRoomRepository(directory);
  const server = createServer(createApiHandler(new RoomService(repository)));
  const base = await listen(server);
  t.after(async () => { await close(server); await rm(directory, { recursive: true, force: true }); });
  let request = 0;
  const guestTokens = new Set<string>();
  async function post(token: string, operation: Record<string, unknown>, status = 200) {
    const response = await fetch(base + '/api/room', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ requestId: `test-${++request}`, ...operation }) });
    let body = await response.json(); assert.equal(response.status, status, JSON.stringify(body));
    if (status === 200 && operation.type === 'join') guestTokens.add(token);
    // Existing engine/HTTP scenarios start from a ready table; lifecycle tests opt out.
    if (autoBegin && status === 200 && operation.type === 'start' && body.room.phase === 'ready') {
      for (const guest of guestTokens) body = await post(guest, { type: 'ready', code: operation.code });
      body = await post(token, { type: 'begin', code: operation.code, expectedRevision: (await read(operation.code as string, token)).room.revision });
    }
    return body;
  }
  async function read(code: string, token: string, status = 200): Promise<Snapshot> {
    const response = await fetch(base + '/api/room?code=' + code, { headers: { authorization: `Bearer ${token}` } });
    const body = await response.json(); assert.equal(response.status, status, JSON.stringify(body)); return body;
  }
  return { base, directory, repository, post, read };
}

test('room HTTP: concurrent joins survive, restart resumes identity, secret projections and start retries', async t => {
  const f = await fixture(t), owner = credential();
  const create = { type: 'create', requestId: 'create-once', name: 'Quản trò' };
  const room = await f.post(owner, create);
  assert.equal((await f.post(owner, create)).room.code, room.room.code);
  assert.equal((await f.post(owner, { ...create, name: 'Khác' }, 409)).error.code, 'REQUEST_ID_REUSED');
  const code = room.room.code, tokens = Array.from({ length: 4 }, credential);
  const guests = await Promise.all(tokens.map((token, i) => f.post(token, { type: 'join', code, name: `Người ${i}` })));
  const lobby = await f.read(code, owner);
  assert.equal(lobby.room.members.length, 4);
  assert.equal(new Set(lobby.room.members.map(m => m.id)).size, 4);
  const recreated = new RoomService(new FileRoomRepository(f.directory));
  assert.equal((await recreated.read(code, tokens[0])).me.id, guests[0].me.id);
  assert.equal((await f.post(tokens[0], { type: 'join', code, name: 'Đổi tên' })).me.id, guests[0].me.id);
  assert.equal((await f.post(tokens[0], { type: 'start', code, expectedRevision: lobby.room.revision, roles: ['wolf', 'seer', 'villager', 'villager'] }, 403)).error.code, 'MODERATOR_REQUIRED');
  const start = { type: 'start', requestId: 'start-once', code, expectedRevision: lobby.room.revision, roles: ['wolf', 'seer', 'villager', 'villager'] };
  const started = await f.post(owner, start);
  assert.deepEqual((await f.post(owner, start)).game.players, started.game.players);
  assert.equal((await f.post(credential(), { type: 'join', code, name: 'Muộn' }, 409)).error.code, 'ROOM_ALREADY_STARTED');
  await f.read(code, credential(), 403);
  for (let i = 0; i < tokens.length; i++) {
    const snapshot = await f.read(code, tokens[i]);
    assert.equal(snapshot.viewer, 'player'); assert.equal(snapshot.room.revision, null);
    if (snapshot.viewer !== 'player') assert.fail();
    assert.equal(snapshot.game!.self.id, guests[i].me.id);
    const expected = started.game.players.find((p: { id: string }) => p.id === guests[i].me.id);
    assert.equal(snapshot.game!.self.role, expected.role);
    assert(snapshot.game!.players.every(p => !Object.hasOwn(p, 'role')));
    const raw = JSON.stringify(snapshot);
    for (const forbidden of ['tokenHash', 'createKey', 'receipts', 'initialRole', ...tokens, owner]) assert(!raw.includes(forbidden));
  }
  const player = await f.read(code, tokens[0]);
  await f.post(tokens[0], { type: 'command', code, stepId: started.game.stepId, command: { type: 'advance' } }, 403);
  assert.equal((await f.read(code, tokens[0])).viewVersion, player.viewVersion);
});

test('room HTTP: missing identity, principal spoofing, invalid JSON, oversized bodies and cross-origin writes fail', async t => {
  const f = await fixture(t);
  const config = await fetch(f.base + '/api/room?config=1');
  assert.equal(config.status, 200); assert.equal((await config.json()).catalog.length, 64);
  assert.equal((await fetch(f.base + '/api/room?code=ABCDEF')).status, 401);
  assert.equal((await f.post(credential(), { type: 'create', name: 'A', principal: { kind: 'moderator' } }, 400)).error.code, 'UNKNOWN_FIELD');
  for (const [body, status] of [['{', 400], ['x'.repeat(17000), 413]] as const) {
    const response = await fetch(f.base + '/api/room', { method: 'POST', headers: { authorization: `Bearer ${credential()}`, 'content-type': 'application/json' }, body });
    assert.equal(response.status, status);
  }
  const response = await fetch(f.base + '/api/room', { method: 'POST', headers: { origin: 'https://unrelated.example', authorization: `Bearer ${credential()}`, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('Supabase HTTP adapter: new secret uses apikey only, legacy JWT retains Bearer, CAS failures stay false', async t => {
  const captured: { key: string | undefined; authorization: string | undefined; url: string | undefined }[] = [];
  const server = createServer((req, res) => {
    captured.push({ key: req.headers.apikey as string, authorization: req.headers.authorization, url: req.url });
    req.resume(); res.setHeader('content-type', 'application/json');
    res.end(req.method === 'POST' ? 'false' : '[]');
  });
  const base = await listen(server); t.after(() => close(server));
  const local = await fixture(t);
  const created = await local.post(credential(), { type: 'create', name: 'T' });
  const document = await local.repository.read(created.room.code); assert(document);
  for (const key of ['sb_secret_test-only', 'test.legacy.jwt']) {
    const repository = new SupabaseRoomRepository(base, key);
    assert.equal(await repository.read('ABCDEF'), null);
    assert.equal(await repository.findCreated('hash'), null);
    // Only the wire shape matters for this upstream; never infer a successful commit from HTTP 200.
    assert.equal(await repository.commit(document, 0), false);
  }
  assert(captured.every(c => c.url!.startsWith('/rest/v1/')));
  assert(captured.slice(0, 3).every(c => c.key === 'sb_secret_test-only' && c.authorization === undefined));
  assert(captured.slice(3).every(c => c.authorization === 'Bearer test.legacy.jwt'));
});

test('Supabase failure never acknowledges a mutation or exposes upstream details; retry can recover', async t => {
  let mode = 'error', calls = 0;
  const upstream = createServer((req, res) => {
    calls++; req.resume();
    if (mode === 'timeout') return;
    if (mode === 'error') { res.statusCode = 503; res.end('<html>private upstream diagnostic</html>'); }
    else if (mode === 'invalid') res.end('not-json');
    else res.end('[]');
  });
  const base = await listen(upstream); t.after(() => close(upstream));
  const repository = new SupabaseRoomRepository(base, 'sb_secret_do-not-expose', 100);
  const server = createServer(createApiHandler(new RoomService(repository)));
  const api = await listen(server); t.after(() => close(server));
  for (mode of ['error', 'invalid', 'timeout']) {
    const response = await fetch(api + '/api/room', { method: 'POST', headers: { authorization: `Bearer ${credential()}`, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'create', requestId: 'retry-me', name: 'T' }) });
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.deepEqual(body.error, { code: 'STORAGE_UNAVAILABLE', message: 'Chưa kết nối được nơi lưu dữ liệu. Hãy thử lại.', retryable: true });
    assert(!JSON.stringify(body).includes('do-not-expose'));
  }
  assert.equal(calls, 3); // No write RPC was issued after the read failed.
  mode = 'recovered'; assert.equal(await repository.read('ABCDEF'), null);
});

test('cloud configuration never silently falls back to local; partial configuration fails', () => {
  assert.throws(() => configuredRepository({}, false), { code: 'STORAGE_NOT_CONFIGURED' });
  assert.throws(() => configuredRepository({ SUPABASE_SECRET_KEY: 'sb_secret_test' }, true), { code: 'STORAGE_NOT_CONFIGURED' });
  assert.equal(configuredRepository({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' }, false).mode, 'supabase');
  assert.equal(configuredRepository({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test.jwt.key' }, false).mode, 'supabase');
});

test('room HTTP: only moderator can deal with Witch settings; hidden healing survives retries and reconnect', async t => {
  const f = await fixture(t), owner = credential();
  const created = await f.post(owner, { type: 'create', name: 'Owner' }), code = created.room.code;
  const tokens = Array.from({ length: 6 }, credential), tokenById = new Map<string, string>();
  for (const [i, token] of tokens.entries()) {
    const joined = await f.post(token, { type: 'join', code, name: `P${i}` }); tokenById.set(joined.me.id, token);
  }
  const lobby = await f.read(code, owner);
  const start = { type: 'start', code, requestId: 'settings-start', expectedRevision: lobby.room.revision, roles: ['wolf', 'guard', 'seer', 'witch', 'villager', 'villager'], settings: { witchSeesBite: false } };
  await f.post(tokens[0], start, 403);
  await f.post(owner, { ...start, settings: { witchSeesBite: 'false' } }, 400);
  await f.post(owner, { ...start, settings: { witchSeesBite: false, clientAdmin: true } }, 400);
  let current = await f.post(owner, start);
  assert.equal(current.game.settings.witchSeesBite, false); assert.equal(current.game.schemaVersion, 9);
  assert.deepEqual(current.deck, { wolf: 1, guard: 1, seer: 1, witch: 1, villager: 2 }); // public deck counts, no assignment
  assert.deepEqual((await f.post(owner, start)).game, current.game);
  await f.post(owner, { ...start, settings: { witchSeesBite: true } }, 409);
  const byRole = (role: string) => current.game.players.find((p: { role: string }) => p.role === role).id as string;
  const victim = byRole('villager'), witch = byRole('witch');
  async function command(token: string, command: Record<string, unknown>) {
    const result = await f.post(token, { type: 'command', code, stepId: current.game.stepId, command });
    current = await f.read(code, owner); return result;
  }
  async function actAs(role: string, action: Record<string, unknown>) {
    const token = tokenById.get(byRole(role))!;
    await command(token, { type: 'wake' }); return command(token, { type: 'act', action });
  }
  await actAs('guard', { type: 'protect', target: byRole('guard') }); await command(owner, { type: 'advance' });
  await actAs('seer', { type: 'inspect', target: byRole('wolf') }); await command(owner, { type: 'advance' });
  await actAs('wolf', { type: 'bite', target: victim }); await command(owner, { type: 'advance' });
  const view = await f.read(code, tokenById.get(witch)!);
  assert.equal(view.viewer, 'player'); if (view.viewer !== 'player') assert.fail();
  assert.equal(view.game!.witchInfo!.visibility, 'hidden'); assert.deepEqual(view.game!.biteTargets, []);
  await command(tokenById.get(witch)!, { type: 'wake' });
  const action = { type: 'command', code, requestId: 'heal-once', stepId: current.game.stepId, command: { type: 'act', action: { type: 'potion', heal: true, poison: null } } };
  const accepted = await f.post(tokenById.get(witch)!, action);
  assert.equal(accepted.game.turn.sleepReady, true);
  assert.deepEqual((await f.post(tokenById.get(witch)!, action)).game, accepted.game);
  current = await f.read(code, owner);
  assert.equal(current.game.events.at(-1).type, 'action-confirmed');
  await command(owner, { type: 'advance' }); assert.equal(current.game.healTarget, victim);
  const reconnected = await new RoomService(new FileRoomRepository(f.directory)).read(code, tokenById.get(witch)!);
  assert.equal(reconnected.viewer, 'player');
  if (reconnected.viewer === 'player') {
    assert.equal(reconnected.game!.self.resources.heal, 0);
    assert.deepEqual(reconnected.game!.biteTargets, []);
    assert(!Object.hasOwn(reconnected.game!, 'healTarget'));
  }
  const retry = await f.post(tokenById.get(witch)!, action);
  assert.equal(retry.game.self.resources.heal, 0);
});


test('lobby deck is persisted, public before dealing, moderator-only and revision/idempotency checked', async t => {
  const f = await fixture(t), owner = credential(), guest = credential();
  const created = await f.post(owner, { type: 'create', name: 'Quản trò' });
  const code = created.room.code;
  assert.deepEqual(created.deck, {});
  const joined = await f.post(guest, { type: 'join', code, name: 'A' });
  const operation = { type: 'setDeck', requestId: 'save-deck', code, expectedRevision: joined.room.revision, roles: ['wolf', 'witch', 'villager', 'villager'] };
  assert.equal((await f.post(guest, operation, 403)).error.code, 'MODERATOR_REQUIRED');
  const saved = await f.post(owner, operation);
  const visible = await f.read(code, guest);
  assert.deepEqual(visible.deck, { wolf: 1, witch: 1, villager: 2 });
  assert.equal(visible.game, null); assert.equal(visible.viewer, 'player');
  assert.equal((await f.post(owner, operation)).room.revision, saved.room.revision);
  assert.equal((await f.post(owner, { ...operation, roles: ['wolf'] }, 409)).error.code, 'REQUEST_ID_REUSED');
  assert.equal((await f.post(owner, { ...operation, requestId: 'stale' }, 409)).error.code, 'STALE_ROOM');
  assert.equal((await f.post(owner, { ...operation, requestId: 'bad', expectedRevision: saved.room.revision, roles: ['invented'] }, 400)).error.code, 'UNSUPPORTED_ROLE');
  const restarted = new RoomService(new FileRoomRepository(f.directory));
  assert.deepEqual((await restarted.read(code, guest)).deck, visible.deck);
  const cleared = await f.post(owner, { ...operation, requestId: 'clear', expectedRevision: saved.room.revision, roles: [] });
  assert.deepEqual(cleared.deck, {}); assert.deepEqual((await f.read(code, guest)).deck, {});
});

test('legacy room schema 1 migrates on write without changing a running game or its rules', async t => {
  const f = await fixture(t), owner = credential(), guest = credential();
  const created = await f.post(owner, { type: 'create', name: 'Cũ' }); const code = created.room.code;
  const stored = (await f.repository.read(code))!;
  stored.schemaVersion = 1; delete stored.lobbyRoles; stored.revision++;
  assert.ok(await f.repository.commit(stored, created.room.revision));
  assert.deepEqual((await f.read(code, owner)).deck, {});
  const joined = await f.post(guest, { type: 'join', code, name: 'A' });
  assert.equal((await f.repository.read(code))!.schemaVersion, 4);
  await f.post(credential(), { type: 'join', code, name: 'B' });
  await f.post(credential(), { type: 'join', code, name: 'C' });
  const lobby = await f.read(code, owner);
  const started = await f.post(owner, { type: 'start', code, expectedRevision: lobby.room.revision, roles: ['wolf', 'villager', 'villager'] });
  assert.equal((await f.post(owner, { type: 'setDeck', code, expectedRevision: started.room.revision, roles: [] }, 409)).error.code, 'ROOM_ALREADY_STARTED');
  const running = (await f.repository.read(code))!; running.schemaVersion = 1; delete running.lobbyRoles; delete running.gameStarted; delete running.readyPlayerIds; running.revision++;
  assert.ok(await f.repository.commit(running, started.room.revision));
  const before = structuredClone(running.game);
  // Read does not migrate or relabel a legacy game.
  assert.equal((await f.read(code, owner)).game!.rulesVersion, before!.rulesVersion);
  assert.deepEqual((await f.repository.read(code))!.game, before);
  await f.post(owner, { type: 'command', code, stepId: started.game.stepId, command: { type: 'advance' } });
  const migrated = (await f.repository.read(code))!;
  assert.equal(migrated.schemaVersion, 4); assert.equal(migrated.game!.rulesVersion, before!.rulesVersion); assert.equal(migrated.game!.schemaVersion, before!.schemaVersion);
});


test('deal waits for every authenticated player; only moderator can begin, retries and restart preserve readiness', async t => {
  const f = await fixture(t, false), owner = credential(), tokens = [credential(), credential(), credential()];
  const created = await f.post(owner, { type: 'create', name: 'Ready' }); const code = created.room.code;
  for (let i = 0; i < tokens.length; i++) await f.post(tokens[i], { type: 'join', code, name: String(i) });
  const lobby = await f.read(code, owner);
  const dealt = await f.post(owner, { type: 'start', code, expectedRevision: lobby.room.revision, roles: ['wolf', 'villager', 'villager'] });
  assert.equal(dealt.room.phase, 'ready'); assert.deepEqual(dealt.room.readyPlayerIds, []);
  const player = await f.read(code, tokens[0]);
  assert.equal(player.viewer, 'player'); if (player.viewer !== 'player') assert.fail(); assert.equal(player.game!.turn, null);
  assert.equal((await f.post(owner, { type: 'begin', code, expectedRevision: dealt.room.revision }, 409)).error.code, 'PLAYERS_NOT_READY');
  assert.equal((await f.post(owner, { type: 'command', code, stepId: dealt.game.stepId, command: { type: 'advance' } }, 409)).error.code, 'GAME_AWAITING_READY');
  assert.equal((await f.post(owner, { type: 'ready', code }, 403)).error.code, 'PLAYER_REQUIRED');
  const confirm = { type: 'ready', requestId: 'confirm-once', code };
  const first = await f.post(tokens[0], confirm); assert.equal(first.room.readyPlayerIds.length, 1);
  assert.equal((await f.post(tokens[0], confirm)).room.revision, first.room.revision);
  assert.equal((await new RoomService(new FileRoomRepository(f.directory)).read(code, owner)).room.readyPlayerIds.length, 1);
  const second = await f.post(tokens[1], { type: 'ready', code });
  assert.equal((await f.post(owner, { type: 'begin', code, expectedRevision: (await f.read(code, owner)).room.revision }, 409)).error.code, 'PLAYERS_NOT_READY');
  const all = await f.post(tokens[2], { type: 'ready', code });
  assert.equal((await f.post(tokens[2], { type: 'begin', code, expectedRevision: (await f.read(code, owner)).room.revision }, 403)).error.code, 'MODERATOR_REQUIRED');
  const begin = { type: 'begin', requestId: 'begin-once', code, expectedRevision: (await f.read(code, owner)).room.revision };
  const started = await f.post(owner, begin); assert.equal(started.room.phase, 'playing');
  assert.equal((await f.post(owner, begin)).room.revision, started.room.revision);
  assert.equal((await f.post(tokens[0], { type: 'ready', code }, 409)).error.code, 'READY_UNAVAILABLE');
});


test('normal name recovery rotates device capability and preserves role, ready and action; owner can resume too', async t => {
  const f = await fixture(t), owner = credential(), tokens = [credential(), credential(), credential()];
  const created = await f.post(owner, { type: 'create', name: 'Quản trò' }); const code = created.room.code;
  const guests = [];
  for (let i = 0; i < tokens.length; i++) guests.push(await f.post(tokens[i], { type: 'join', code, name: `Người ${i}` }));
  const lobby = await f.read(code, owner);
  let state = await f.post(owner, { type: 'start', code, expectedRevision: lobby.room.revision, roles: ['wolf', 'villager', 'villager'] });
  while (state.game.step !== 'wolves') state = await f.post(owner, { type: 'command', code, stepId: state.game.stepId, command: { type: 'advance' } });
  const wolf = state.game.players.find((p: { role: string }) => p.role === 'wolf');
  const index = guests.findIndex(g => g.me.id === wolf.id), old = tokens[index], moved = credential();
  const resumed = await f.post(moved, { type: 'join', code, name: guests[index].me.name.toLowerCase() });
  assert.equal(resumed.me.id, wolf.id); assert.equal(resumed.game.self.role, 'wolf');
  await f.read(code, old, 403);
  await f.post(moved, { type: 'command', code, stepId: state.game.stepId, command: { type: 'wake' } });
  const target = state.game.players.find((p: { role: string }) => p.role === 'villager').id;
  await f.post(moved, { type: 'command', code, stepId: state.game.stepId, command: { type: 'act', action: { type: 'bite', target } } });
  const second = credential();
  const again = await f.post(second, { type: 'join', code, name: guests[index].me.name });
  assert.equal(again.me.id, wolf.id); assert.deepEqual(again.game.turn.action, { type: 'bite', target });
  assert.equal(again.room.readyPlayerIds.length, 3); await f.read(code, moved, 403);
  const newOwner = credential(); const host = await f.post(newOwner, { type: 'join', code, name: 'quản trò' });
  assert.equal(host.viewer, 'moderator'); assert.equal(host.game.id, state.game.id); await f.read(code, owner, 403);
  assert.equal((await f.post(credential(), { type: 'join', code, name: 'Người chưa có' }, 409)).error.code, 'ROOM_ALREADY_STARTED');
});

test('offline player handoff is scoped, owner-only, uses player rules, and can move to a phone without changing identity', async t => {
  const { createGame } = await import('../src/engine/engine.ts');
  const f = await fixture(t, false), owner = credential(), online = [credential(), credential()];
  const created = await f.post(owner, { type: 'create', name: 'Chủ bàn' }); const code = created.room.code;
  const a = await f.post(online[0], { type: 'join', code, name: 'A' });
  await f.post(online[1], { type: 'join', code, name: 'B' });
  let lobby = await f.read(code, owner);
  assert.equal((await f.post(online[0], { type: 'addOffline', code, expectedRevision: lobby.room.revision, name: 'C' }, 403)).error.code, 'MODERATOR_REQUIRED');
  const add = { type: 'addOffline', requestId: 'add-once', code, expectedRevision: lobby.room.revision, name: 'C' };
  lobby = await f.post(owner, add);
  assert.equal((await f.post(owner, add)).room.members.length, 3);
  const offline = lobby.room.members.find((m: { offline: boolean }) => m.offline);
  let state = await f.post(owner, { type: 'start', code, expectedRevision: lobby.room.revision, roles: ['wolf', 'guard', 'villager'] });
  // Deterministic actor assignment in this fixture; production still shuffles on the server.
  const stored = (await f.repository.read(code))!;
  stored.game = createGame(stored.game!.id, stored.members.map(m => ({ id: m.id, name: m.name, role: m.id === offline.id ? 'guard' : m.id === a.me.id ? 'wolf' : 'villager' })));
  stored.revision++; assert.ok(await f.repository.commit(stored, state.room.revision));
  const view = await new RoomService(f.repository).read(code, owner, offline.id);
  assert.equal(view.viewer, 'player'); assert.equal(view.controller, 'moderator');
  if (view.viewer !== 'player') assert.fail(); assert.equal(view.game!.self.id, offline.id); assert.equal(view.game!.turn, null);
  assert.equal(Object.hasOwn(view.game!, 'actions'), false); assert.equal(JSON.stringify(view).includes('tokenHash'), false);
  const denied = await fetch(f.base + `/api/room?code=${code}&offlinePlayerId=${offline.id}`, { headers: { Authorization: `Bearer ${online[0]}` } });
  assert.equal(denied.status, 403);
  assert.equal((await f.post(owner, { type: 'offlineReady', code, playerId: a.me.id }, 403)).error.code, 'OFFLINE_PLAYER_REQUIRED');
  await f.post(owner, { type: 'offlineReady', code, playerId: offline.id });
  for (const token of online) await f.post(token, { type: 'ready', code });
  state = await f.read(code, owner);
  state = await f.post(owner, { type: 'begin', code, expectedRevision: state.room.revision });
  const base = { type: 'offlineCommand', code, playerId: offline.id, stepId: state.game.stepId };
  assert.equal((await f.post(online[0], { ...base, command: { type: 'wake' } }, 403)).error.code, 'MODERATOR_REQUIRED');
  assert.equal((await f.post(owner, { ...base, command: { type: 'advance' } }, 403)).error.code, 'MODERATOR_REQUIRED');
  await f.post(owner, { ...base, command: { type: 'wake' } });
  const act = { ...base, requestId: 'proxy-act', command: { type: 'act', action: { type: 'protect', target: a.me.id } } };
  const acted = await f.post(owner, act);
  assert.equal(acted.game.self.id, offline.id); assert.equal(acted.game.turn.submitted, true);
  assert.equal((await f.post(owner, act)).viewVersion, acted.viewVersion);
  const phone = credential(); const recovered = await f.post(phone, { type: 'join', code, name: 'C' });
  assert.equal(recovered.me.id, offline.id); assert.deepEqual(recovered.game.turn.action, { type: 'protect', target: a.me.id });
  assert.equal(recovered.room.members.find((m: { id: string }) => m.id === offline.id).offline, false);
  assert.equal((await f.post(owner, { ...base, command: { type: 'wake' } }, 403)).error.code, 'OFFLINE_PLAYER_REQUIRED');
});


test('avatar actions require moderator/revision; offline transfer preserves identity and current action', async t => {
  const f = await fixture(t), owner = credential(), guest = credential();
  const created = await f.post(owner, { type: 'create', name: 'Host' }); const code = created.room.code;
  const joined = await f.post(guest, { type: 'join', code, name: 'A' });
  const operation = { type: 'setOffline', requestId: 'battery-empty', code, playerId: joined.me.id, expectedRevision: joined.room.revision };
  assert.equal((await f.post(guest, operation, 403)).error.code, 'MODERATOR_REQUIRED');
  const changed = await f.post(owner, operation);
  assert.equal(changed.room.members[0].offline, true);
  assert.equal(changed.room.members[0].id, joined.me.id);
  assert.equal((await f.post(owner, operation)).room.revision, changed.room.revision);
  await f.read(code, guest, 403);
  assert.equal((await f.post(owner, { ...operation, requestId: 'stale' }, 409)).error.code, 'STALE_ROOM');
  const leave = { type: 'removeMember', code, playerId: joined.me.id, expectedRevision: changed.room.revision, requestId: 'leave-lobby' };
  const left = await f.post(owner, leave);
  assert.equal(left.room.members.length, 0);
  assert.equal((await f.post(owner, leave)).room.revision, left.room.revision);
});

test('withdrawal after dealing retains seat, revokes recovery and adjusts ready quorum without death chains', async t => {
  const f = await fixture(t, false), owner = credential(), tokens = Array.from({ length: 5 }, credential);
  const created = await f.post(owner, { type: 'create', name: 'Host' }); const code = created.room.code;
  const members = [];
  for (let i = 0; i < tokens.length; i++) members.push(await f.post(tokens[i], { type: 'join', code, name: `P${i}` }));
  const lobby = await f.read(code, owner);
  let state = await f.post(owner, { type: 'start', code, expectedRevision: lobby.room.revision, roles: ['wolf','guard','villager','villager','villager'] });
  const quitter = state.game.players.find((p: { role: string }) => p.role === 'villager');
  const index = members.findIndex(m => m.me.id === quitter.id);
  const remove = { type: 'removeMember', requestId: 'withdraw', code, expectedRevision: state.room.revision, playerId: quitter.id };
  assert.equal((await f.post(tokens[(index+1)%5], remove, 403)).error.code, 'MODERATOR_REQUIRED');
  state = await f.post(owner, remove);
  assert.equal(state.game.players.length, 5); assert.equal(state.room.members.length, 5);
  assert.equal(state.room.members.find((m: { id: string }) => m.id === quitter.id).left, true);
  assert.equal(state.game.players.filter((p: { alive: boolean }) => !p.alive).length, 1);
  assert.equal((await f.post(owner, remove)).room.revision, state.room.revision);
  await f.read(code, tokens[index], 403);
  assert.equal((await f.post(credential(), { type: 'join', code, name: quitter.name }, 403)).error.code, 'PLAYER_LEFT');
  for (let i = 0; i < tokens.length; i++) if (i !== index) await f.post(tokens[i], { type: 'ready', code });
  const ready = await f.read(code, owner);
  const begun = await f.post(owner, { type: 'begin', code, expectedRevision: ready.room.revision });
  assert.equal(begun.room.phase, 'playing'); assert.equal(begun.room.readyPlayerIds.length, 4);
});

test('v14 HTTP powers: choices, Ghost moderation, wolf timeout, role privacy and moderator authorization',async t=>{
 const f=await fixture(t),owner=credential();const created=await f.post(owner,{type:'create',name:'Quản trò'}),code=created.room.code;
 const tokens=Array.from({length:8},credential);for(let i=0;i<tokens.length;i++)await f.post(tokens[i],{type:'join',code,name:'E'+i});
 let host=await f.post(owner,{type:'start',code,expectedRevision:(await f.read(code,owner)).room.revision,roles:['wolf','ghost','bogeyman','vampire','nostradamus','villager','villager','villager'],settings:{witchSeesBite:false,skipVoteDays:3}});
 const byId=new Map<string,string>();for(const tok of tokens){const v=await f.read(code,tok);byId.set(v.me.id,tok);assert.ok(!('extra' in v.game!));}
 const villagers=host.game.players.filter((p:{role:string})=>p.role==='villager').map((p:{id:string})=>p.id);
 async function send(command:Record<string,unknown>,token=owner,status=200){const state=await f.read(code,owner);return f.post(token,{type:'command',code,stepId:state.game!.stepId,command},status);}
 assert.equal((await send({type:'wolfTimeout'},tokens[0],403)).error.code,'MODERATOR_REQUIRED');
 let timed=false;
 for(let n=0;n<40;n++){
  host=await f.read(code,owner);assert.equal(host.viewer,'moderator');if(host.viewer!=='moderator')assert.fail();const g=host.game!;
  if(g.step==='review')break;
  if(g.step==='wolves'){await send({type:'wolfTimeout'});timed=true;continue;}
  for(const progress of g.progress){const tok=byId.get(progress.id)!;await send({type:'wake'},tok);const v=await f.read(code,tok);if(v.viewer!=='player')assert.fail();const turn=v.game!.turn!;
   const action=turn.power?{type:'ability',targets:turn.power.count?[villagers[0]]:[],...(turn.power.input==='prediction'?{choice:'village'}:turn.power.input==='note'?{text:'rừng'}:{})}:null;
   assert.ok(action);await send({type:'act',action},tok);
  }
  await send({type:'advance'});
 }
 assert.equal(timed,true);host=await f.read(code,owner);if(host.viewer!=='moderator')assert.fail();const ghost=host.game!.players.find(p=>p.role==='ghost')!;
 for(const tok of tokens){const v=await f.read(code,tok);assert.ok(!JSON.stringify(v.game).includes('"notes"'));assert.ok(!JSON.stringify(v.game!.announcements).includes('rừng'));}
 assert.equal((await send({type:'reviewNote',actor:ghost.id,approve:true},tokens[0],403)).error.code,'MODERATOR_REQUIRED');
 await send({type:'reviewNote',actor:ghost.id,approve:true});const seen=await f.read(code,tokens[0]);assert.ok(JSON.stringify(seen.game!.announcements).includes('rừng'));
 await send({type:'resolve'});await send({type:'publish'});host=await f.read(code,owner);assert.equal(host.game!.players.find((p:{id:string})=>p.id===villagers[0])!.alive,false);
});

for (const started of [false, true]) test(`self leave ${started ? 'game' : 'lobby'} revokes access and retries return no secrets`, async t => {
  const f = await fixture(t), owner = credential(), tokens = Array.from({length: 6}, credential);
  const {room:{code}} = await f.post(owner, {type:'create',name:'Host'});
  const players = [];
  for (const [i, token] of tokens.entries()) players.push(await f.post(token,{type:'join',code,name:`Player ${i}`}));
  if(started) await f.post(owner,{type:'start',code,expectedRevision:(await f.read(code,owner)).room.revision,roles:['wolf','hunter','villager','villager','villager','villager']});
  await f.post(owner,{type:'leave',code},403);
  await f.post(credential(),{type:'leave',code},403);
  await f.post(tokens[0],{type:'leave',code,playerId:players[1].me.id},400);
  const op={type:'leave',code,requestId:'leave-once'};
  assert.deepEqual(await f.post(tokens[0],op),{left:true,code});
  const before=await f.read(code,owner);
  assert.deepEqual(await f.post(tokens[0],op),{left:true,code});
  assert.equal((await f.read(code,owner)).room.revision,before.room.revision);
  await f.read(code,tokens[0],403);
  if(started) {
    assert(before.room.members.find(m=>m.id===players[0].me.id)?.left);
    await f.post(credential(),{type:'join',code,name:'Player 0'},403);
  } else assert(!before.room.members.some(m=>m.id===players[0].me.id));
  assert(!before.room.members.find(m=>m.id===players[1].me.id)?.left);
});

test('reset preserves seats and sessions, clears secrets, checks authority/revision and retries safely', async t => {
  const f = await fixture(t, false), owner = credential(), guest = credential();
  let s = await f.post(owner, { type: 'create', name: 'Quản trò' }); const code = s.room.code;
  await f.post(guest, { type: 'join', code, name: 'A' });
  for (const name of ['B', 'C']) { s = await f.read(code, owner); await f.post(owner, { type: 'addOffline', code, name, expectedRevision: s.room.revision }); }
  s = await f.read(code, owner);
  s = await f.post(owner, { type: 'start', code, expectedRevision: s.room.revision, roles: ['wolf', 'seer', 'villager'] });
  const members = s.room.members, oldStep = s.game.stepId;
  const reset = { type: 'reset', code, expectedRevision: s.room.revision, requestId: 'reset-once' };
  await f.post(guest, reset, 403);
  await f.post(owner, { ...reset, expectedRevision: 0 }, 409);
  s = await f.post(owner, reset);
  assert.equal(s.room.phase, 'lobby'); assert.equal(s.game, null); assert.deepEqual(s.room.members, members);
  assert.deepEqual(s.room.readyPlayerIds, []); assert.deepEqual(s.deck, { wolf: 1, seer: 1, villager: 1 });
  assert.equal((await f.post(owner, reset)).room.revision, s.room.revision);
  assert.equal((await f.read(code, guest)).game, null);
  s = await f.post(owner, { type: 'start', code, expectedRevision: s.room.revision, roles: ['wolf', 'seer', 'villager'] });
  assert.notEqual(s.game.stepId, oldStep);
  const retry = await f.post(owner, reset); assert.equal(retry.room.phase, 'ready');
  await f.post(owner, { type: 'command', code, stepId: oldStep, command: { type: 'advance' } }, 409);
});
