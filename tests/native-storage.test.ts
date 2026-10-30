import test from 'node:test';
import assert from 'node:assert/strict';
import { DurableStorage } from '../src/platform/durable-storage.ts';
import { LocalTable, type LocalMutation } from '../src/offline/table.ts';
import { DEFAULT_ONLINE_ORIGIN, onlineOrigin, roomInvite, roomRequestPath } from '../src/platform/urls.ts';

test('native room requests and invitations use the HTTPS host, preserve leading zeros and encode proxy IDs', () => {
  assert.equal(onlineOrigin(DEFAULT_ONLINE_ORIGIN + '/'), DEFAULT_ONLINE_ORIGIN);
  assert.equal(roomInvite(DEFAULT_ONLINE_ORIGIN, '012345'), DEFAULT_ONLINE_ORIGIN + '/?room=012345');
  assert.equal(roomRequestPath(), '/api/room?config=1');
  assert.equal(roomRequestPath('012345', 'a&b'), '/api/room?code=012345&offlinePlayerId=a%26b');
  for (const invalid of ['http://example.com', 'capacitor://localhost', 'https://example.com/api', 'https://a:b@example.com', 'https://example.com/?token=x']) {
    assert.throws(() => onlineOrigin(invalid));
  }
});

test('native storage waits for persistence, serializes overlapping commits and does not repeat unchanged writes', async () => {
  let durable: string | null = null, release!: () => void;
  let count = 0;
  const storage = new DurableStorage(null, async value => { count++; await new Promise<void>(resolve => { release = resolve; }); durable = value; });
  storage.setItem('turn', '1');
  const first = storage.flush();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(durable, null);
  storage.setItem('turn', '2');
  const second = storage.flush();
  release(); await first;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(new DurableStorage(durable, async () => {}).getItem('turn'), '1');
  release(); await second;
  await storage.flush();
  assert.equal(count, 2);
  assert.equal(new DurableStorage(durable, async () => {}).getItem('turn'), '2');
});

test('failed native write can roll back and retry without corrupting the committed table', async () => {
  let durable: string | null = null, fail = false;
  const storage = new DurableStorage(null, async value => { if (fail) throw new Error('disk full'); durable = value; });
  const table = new LocalTable(storage);
  const created = table.mutate({ type: 'create', requestId: 'create', name: 'Quản trò' });
  await storage.flush();
  const before = storage.checkpoint();
  const op: LocalMutation = { type: 'addOffline', code: created.room.code, requestId: 'add', expectedRevision: 0, name: 'Người A' };
  table.mutate(op);
  fail = true;
  await assert.rejects(storage.flush(), /disk full/);
  storage.restore(before);
  assert.equal(table.read(created.room.code).room.members.length, 0);
  assert.equal(new LocalTable(new DurableStorage(durable, async () => {})).read(created.room.code).room.members.length, 0);
  fail = false;
  table.mutate(op); await storage.flush();
  const restored = new LocalTable(new DurableStorage(durable, async () => {}));
  assert.equal(restored.read(created.room.code).room.members.length, 1);
  restored.mutate(op);
  assert.equal(restored.read(created.room.code).room.members.length, 1);
});

test('native storage rejects damaged/newer documents rather than silently replacing a saved game', () => {
  for (const value of ['broken', '{"version":2,"entries":{}}', '{"version":1,"entries":{"secret":false}}', '{"version":1,"entries":[]}']) {
    assert.throws(() => new DurableStorage(value, async () => {}));
  }
});
