import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { RoomService } from '../src/server/rooms.ts';
import { DebugRoomRepository } from '../src/server/debug-rooms.ts';
import { createApiHandler } from '../src/server/http.ts';
import { roomCode, ApiError } from '../src/server/validation.ts';
import { LocalTable } from '../src/offline/table.ts';

test('six-digit codes preserve leading zeroes; legacy letter codes still normalize', () => {
  for (const code of ['001010', '000000', '123456', '999999']) assert.equal(roomCode(code), code);
  assert.equal(roomCode('abc234'), 'ABC234');
  for (const code of ['12345', '1234567', '12-456', '../123', '１２３４５６']) assert.throws(() => roomCode(code), ApiError);
});

test('HTTP creates numeric rooms, joins numeric codes and keeps legacy rooms reachable', async t => {
  const repository = new DebugRoomRepository(), service = new RoomService(repository);
  const server = createServer(createApiHandler(service));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { service.dispose(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/room`;
  const token = () => randomBytes(32).toString('hex'), host = token();
  async function post(credential: string, body: unknown) {
    const response = await fetch(base, { method: 'POST', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(response.status, 200); return response.json();
  }
  const created = await post(host, { type: 'create', requestId: 'create', name: 'Host' });
  assert.match(created.room.code, /^[0-9]{6}$/);
  const joined = await post(token(), { type: 'join', requestId: 'join', code: created.room.code, name: 'A' });
  assert.equal(joined.room.code, created.room.code);
  const original = (await repository.read(created.room.code))!;
  for (const code of ['001010', 'ABC234']) {
    const room = { ...structuredClone(original), code, createKey: 'fixture-'+code, revision: 0, members: [], receipts: {} };
    assert(await repository.commit(room, -1));
    const joined = await post(token(), { type: 'join', requestId: 'join-'+code, code: code.toLowerCase(), name: 'B' });
    assert.equal(joined.room.code, code);
  }
});

test('new local tables use numeric codes and old saved letter codes can still resume', () => {
  const values = new Map<string, string>();
  const store = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
  const table = new LocalTable(store), created = table.mutate({ type: 'create', requestId: 'new', name: 'Host' });
  assert.match(created.room.code, /^[0-9]{6}$/);
  const saved = JSON.parse(store.getItem('ma-soi:local-table:v1:'+created.room.code)!);
  saved.room.code = 'ABC234';store.setItem('ma-soi:local-table:v1:ABC234', JSON.stringify(saved));
  assert.equal(table.read('ABC234').room.code, 'ABC234');
});
