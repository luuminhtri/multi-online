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
async function fixture(t: Parameters<Parameters<typeof test>[1]>[0]) {
  const directory = await mkdtemp(join(tmpdir(), 'ma-soi-http-'));
  const repository = new FileRoomRepository(directory);
  const server = createServer(createApiHandler(new RoomService(repository)));
  const base = await listen(server);
  t.after(async () => { await close(server); await rm(directory, { recursive: true, force: true }); });
  let request = 0;
  async function post(token: string, operation: Record<string, unknown>, status = 200) {
    const response = await fetch(base + '/api/room', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ requestId: `test-${++request}`, ...operation }) });
    const body = await response.json(); assert.equal(response.status, status, JSON.stringify(body)); return body;
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
  assert.equal(config.status, 200); assert.equal((await config.json()).catalog.length, 27);
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
  assert.equal(current.game.settings.witchSeesBite, false); assert.equal(current.game.schemaVersion, 4);
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
