import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalTable, localCatalog, type LocalMutation } from '../src/offline/table.ts';
import type { Snapshot } from '../src/server/types.ts';
import type { Action, Role } from '../src/engine/types.ts';

function fixture(simplified = true, roles: Role[] = ['guard', 'seer', 'wolf', 'wolf', 'villager', 'villager', 'villager']) {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const table = new LocalTable(storage, () => 1_770_000_000_000);
  let s = table.mutate({ type: 'create', requestId: 'create', name: 'Quản trò' }) as Extract<Snapshot, { viewer: 'moderator' }>;
  let serial = 0;
  const send = (operation: Record<string, unknown>) => { s = table.mutate({ code: s.room.code, requestId: `r${++serial}`, ...operation } as LocalMutation) as typeof s; return s; };
  for (let i = 0; i < roles.length; i++) send({ type: 'addOffline', expectedRevision: s.room.revision, name: `Người ${i}` });
  const deal = () => send({ type: 'localStart', expectedRevision: s.room.revision, roles, simplified, settings: { witchSeesBite: true, skipVoteDays: 1 } });
  const begin = () => { deal(); send({ type: 'begin', expectedRevision: s.room.revision }); };
  const id = (role: Role) => s.game!.players.find(p => p.role === role)!.id;
  const act = (action: Action) => send({ type: 'simpleAct', stepId: s.game!.stepId, action });
  const cmd = (command: unknown) => send({ type: 'command', stepId: s.game!.stepId, command });
  return { table, storage, values, send, deal, begin, id, act, cmd, get s() { return s; } };
}

test('local table adds people explicitly, rejects duplicate names/stale edits and keeps network storage separate', () => {
  const f = fixture();
  assert.equal(f.s.room.local, true); assert.equal(f.s.room.members.length, 7);
  assert(f.s.room.members.every(p => p.offline));
  assert.throws(() => f.send({ type: 'addOffline', expectedRevision: f.s.room.revision, name: ' người 0 ' }));
  assert.throws(() => f.send({ type: 'addOffline', expectedRevision: 0, name: 'Mới' }));
  assert.equal(f.s.room.members.length, 7);
  assert([...f.values.keys()].every(k => k.startsWith('ma-soi:local-') || k === 'ma-soi:last-local'));
  const saved = f.s.room.code; assert.equal(new LocalTable(f.storage).lastCode(), saved);
  assert.equal(new LocalTable(f.storage).read(saved).room.members.length, 7);
});

test('simplified night needs one guard choice, inspection acknowledgment and one shared wolf choice', () => {
  const f = fixture(); f.begin();
  assert.equal(f.s.room.phase, 'playing'); assert.equal(f.s.game!.step, 'guard');
  assert.deepEqual(f.s.game!.awake, []);
  f.act({ type: 'protect', target: f.id('guard') });
  assert.equal(f.s.game!.step, 'seer');
  f.act({ type: 'inspect', target: f.id('wolf') });
  assert.equal(f.s.game!.step, 'seer'); assert.notEqual(f.s.room.inspection, null);
  const result = f.s.game!.events.find(e => e.id === f.s.room.inspection)!;
  assert.equal(result.type, 'inspection'); assert.equal(result.data.isWolf, true);
  // Persist the pending result, even across a reload.
  assert.equal(new LocalTable(f.storage).read(f.s.room.code).room.inspection, result.id);
  assert.throws(() => f.cmd({ type: 'advance' }));
  f.send({ type: 'simpleAck', stepId: f.s.game!.stepId });
  assert.equal(f.s.game!.step, 'wolves');
  f.act({ type: 'bite', target: f.id('guard') });
  assert.equal(f.s.game!.step, 'review'); assert.equal(f.s.game!.resolved, true);
  assert.equal(f.s.game!.events.filter(e => e.type === 'action-confirmed' && (e.data.action as Action).type === 'bite').length, 2);
  assert.deepEqual(f.s.game!.pendingDeaths, []);
  f.cmd({ type: 'publish' }); assert.equal(f.s.game!.step, 'day');
  f.cmd({ type: 'verdict', target: null }); f.cmd({ type: 'nextNight' });
  assert.equal(f.s.game!.night, 2); assert.equal(f.s.game!.step, 'guard');
});

test('bad actions and failed persistence do not partially apply a group action', () => {
  const f = fixture(); f.begin();
  const before = JSON.stringify(f.table.read(f.s.room.code));
  assert.throws(() => f.act({ type: 'protect', target: 'missing' }));
  assert.equal(JSON.stringify(f.table.read(f.s.room.code)), before);
  const failing = new LocalTable({ getItem: f.storage.getItem, setItem: () => { throw new Error('quota'); } });
  assert.throws(() => failing.mutate({ type: 'simpleAct', code: f.s.room.code, requestId: 'quota', stepId: f.s.game!.stepId, action: { type: 'protect', target: f.id('guard') } }), /quota/);
  assert.equal(JSON.stringify(f.table.read(f.s.room.code)), before);
});

test('simplified retries are idempotent, stale forms and repeat protection are refused', () => {
  const f = fixture(); f.begin();
  const op: LocalMutation = { type: 'simpleAct', code: f.s.room.code, requestId: 'once', stepId: f.s.game!.stepId, action: { type: 'protect', target: f.id('guard') } };
  const first = f.table.mutate(op); assert.deepEqual(f.table.mutate(op), first);
  assert.throws(() => f.table.mutate({ ...op, requestId: 'stale' }));
  assert.throws(() => f.table.mutate({ ...op, action: { type: 'protect', target: f.id('seer') } }));
});

test('normal local mode preserves individual wake/actions, role handoff and manual advancing', () => {
  const f = fixture(false); f.deal();
  const readyView = f.table.read(f.s.room.code, f.id('seer'));
  assert.equal(readyView.viewer, 'player'); assert(!('players' in (readyView.game ?? {}) && 'events' in (readyView.game ?? {})));
  assert.equal(readyView.controller, 'moderator');
  f.send({ type: 'begin', expectedRevision: f.s.room.revision });
  assert.throws(() => f.act({ type: 'protect', target: f.id('guard') }));
  const guard = f.id('guard');
  f.send({ type: 'offlineCommand', playerId: guard, stepId: f.s.game!.stepId, command: { type: 'wake' } });
  const game = f.table.read(f.s.room.code) as Extract<Snapshot, { viewer: 'moderator' }>;
  assert(game.game!.awake.includes(guard));
});

test('empty roles skip automatically while actual abilities and deaths use the same engine', () => {
  const f = fixture(true, ['wolf', 'villager', 'villager', 'villager', 'villager']); f.begin();
  assert.equal(f.s.game!.step, 'wolves');
  const victim = f.id('villager'); f.act({ type: 'bite', target: victim });
  assert.equal(f.s.game!.step, 'review'); assert.deepEqual(f.s.game!.pendingDeaths, [victim]);
  assert(!f.s.game!.publicDead.includes(victim));
  f.cmd({ type: 'publish' }); assert(f.s.game!.publicDead.includes(victim));
  f.cmd({ type: 'verdict', target: f.id('wolf') }); assert.equal(f.s.game!.winner, 'village');
});

test('offline catalog ships local images and original descriptions for every supported role', () => {
  assert.equal(localCatalog().length, 27);
  assert(localCatalog().every(r => r.image.startsWith('/offline-cards/') && r.description.length > 0));
});

test('shared wolf choice is atomic if any wolf rejects the target', () => {
  const f = fixture(true, ['wolf', 'wolf', 'villager', 'villager', 'villager']); f.begin();
  const before = f.table.read(f.s.room.code);
  assert.throws(() => f.act({ type: 'bite', target: f.id('wolf') }));
  assert.deepEqual(f.table.read(f.s.room.code), before);
});

test('offline seer can see a non-wolf and the next morning still enforces the skip budget', () => {
  const f = fixture(true, ['guard', 'seer', 'wolf', 'villager', 'villager', 'villager']); f.begin();
  f.act({ type: 'protect', target: f.id('guard') }); f.act({ type: 'inspect', target: f.id('villager') });
  assert.equal(f.s.game!.events.find(e => e.id === f.s.room.inspection)!.data.isWolf, false);
  f.send({ type: 'simpleAck', stepId: f.s.game!.stepId }); f.act({ type: 'bite', target: f.id('guard') }); f.cmd({ type: 'publish' });
  f.cmd({ type: 'verdict', target: null }); f.cmd({ type: 'nextNight' });
  assert.throws(() => f.act({ type: 'protect', target: f.id('guard') }));
  f.act({ type: 'protect', target: f.id('seer') }); f.act({ type: 'inspect', target: f.id('wolf') });
  f.send({ type: 'simpleAck', stepId: f.s.game!.stepId }); f.act({ type: 'bite', target: f.id('seer') }); f.cmd({ type: 'publish' });
  assert.throws(() => f.cmd({ type: 'verdict', target: null }), /VOTE_REQUIRED/);
});

test('cub sacrifice in simplified mode submits the offer before the rest of the pack', () => {
  const f = fixture(true, ['wolf', 'wolf_cub', 'villager', 'villager', 'villager']); f.begin();
  f.act({ type: 'sacrifice', target: f.id('wolf_cub') });
  assert.equal(f.s.game!.sacrificedCubId, f.id('wolf_cub'));
  assert.equal(f.s.game!.step, 'wolves');
});

test('hunter reaction remains an explicit single action after night publication', () => {
  const f = fixture(true, ['wolf', 'hunter', 'villager', 'villager', 'villager']); f.begin();
  f.act({ type: 'bite', target: f.id('hunter') }); f.cmd({ type: 'publish' });
  assert.equal(f.s.game!.step, 'hunter');
  f.act({ type: 'shoot', target: f.id('wolf') }); assert.equal(f.s.game!.winner, 'village');
});

test('complete local flow works when HTTP browser has no crypto.randomUUID', () => {
  const descriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
  try {
    const f = fixture(); f.begin();
    f.act({ type: 'protect', target: f.id('guard') });
    f.act({ type: 'inspect', target: f.id('wolf') });
    f.send({ type: 'simpleAck', stepId: f.s.game!.stepId });
    f.act({ type: 'bite', target: f.id('guard') }); f.cmd({ type: 'publish' });
    f.cmd({ type: 'verdict', target: null }); f.cmd({ type: 'nextNight' });
    assert.equal(f.s.game!.night, 2);
    const restored = new LocalTable(f.storage).read(f.s.room.code);
    assert.equal(restored.room.phase, 'playing');
    assert.equal(restored.game!.night, 2);
  } finally {
    if (descriptor) Object.defineProperty(crypto, 'randomUUID', descriptor);
    else Reflect.deleteProperty(crypto, 'randomUUID');
  }
});
