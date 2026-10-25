import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, dispatch, stepId, RuleError } from '../src/engine/engine.ts';
import { playerView, moderatorView, publicView } from '../src/engine/views.ts';
import type { Action, Command, Game, Role } from '../src/engine/types.ts';

function cmd(g: Game, command: Command, actor?: string, id = `r${g.revision}`) {
  return dispatch(g, actor ? { kind: 'player', playerId: actor } : { kind: 'moderator' }, { id, gameId: g.id, stepId: stepId(g), command });
}
function act(g: Game, actor: string, action: Action) { return cmd(cmd(g, { type: 'wake' }, actor), { type: 'act', action }, actor); }
const roster: { id: string; name: string; role: Role }[] = [
  { id: 'w', name: 'W', role: 'big_bad_wolf' }, { id: 'g', name: 'G', role: 'guard' },
  { id: 't', name: 'T', role: 'witch' }, { id: 's', name: 'S', role: 'seer' },
  { id: 'a', name: 'A', role: 'villager' }, { id: 'b', name: 'B', role: 'villager' },
  { id: 'c', name: 'C', role: 'villager' }, { id: 'd', name: 'D', role: 'villager' },
];
function witch(bites: string[], protect = 'g', visible = true, legacy = false) {
  let g = createGame('visibility', roster, { witchSeesBite: visible });
  if (legacy) { g.schemaVersion = 3; g.rulesVersion = 'classic-core-v8'; delete g.settings; }
  if (!bites.length) g.wolvesBlockedNight = 1;
  g = cmd(act(g, 'g', { type: 'protect', target: protect }), { type: 'advance' });
  g = cmd(act(g, 's', { type: 'inspect', target: 'w' }), { type: 'advance' });
  if (bites.length) g = act(g, 'w', { type: 'maul', targets: bites });
  return cmd(g, { type: 'advance' });
}
const rejects = (fn: () => unknown, code: string) => assert.throws(fn, (e: unknown) => e instanceof RuleError && e.code === code);

test('Guard blocks Witch disclosure and healing; poison remains independent', () => {
  let g = witch(['a'], 'a');
  const v = playerView(g, 't');
  assert.deepEqual(v.biteTargets, []); assert.equal(v.biteTarget, null); assert.equal(v.witchInfo!.canHeal, false);
  rejects(() => act(g, 't', { type: 'potion', heal: true, healTarget: 'a', poison: null }), 'NO_HEAL_AVAILABLE');
  g = cmd(act(g, 't', { type: 'potion', heal: false, poison: 'a' }), { type: 'advance' });
  g = cmd(g, { type: 'resolve' });
  assert.deepEqual(g.pendingDeaths, ['a']);
  assert.equal(g.players.find(p => p.id === 't')!.resources.heal, 1);
  assert.deepEqual(publicView(g).announcements, []);
});

test('a protected victim and no bite give identical Witch data', () => {
  const protectedView = playerView(witch(['a'], 'a'), 't');
  const emptyView = playerView(witch([], 'a'), 't');
  assert.deepEqual(protectedView, emptyView);
});

test('two bites reveal only unprotected victim; implicit heal selects that victim', () => {
  let g = witch(['a', 'b'], 'a');
  assert.deepEqual(playerView(g, 't').biteTargets, ['b']);
  assert.equal(playerView(g, 't').biteTarget, 'b');
  rejects(() => act(g, 't', { type: 'potion', heal: true, healTarget: 'a', poison: null }), 'INVALID_HEAL_TARGET');
  g = cmd(act(g, 't', { type: 'potion', heal: true, poison: null }), { type: 'advance' });
  assert.equal(g.healTarget, 'b');
  assert.deepEqual(cmd(g, { type: 'resolve' }).pendingDeaths, []);
});

test('hidden mode accepts the same potion and returns identical data with zero, blocked, one or two bites', () => {
  const worlds = [witch([], 'g', false), witch(['a'], 'a', false), witch(['b'], 'g', false), witch(['a', 'b'], 'g', false)];
  const views = worlds.map(g => playerView(g, 't'));
  for (const view of views) {
    assert.deepEqual(view, views[0]); assert.deepEqual(view.biteTargets, []);
    assert.equal(view.biteTarget, null); assert.equal(view.witchInfo!.canHeal, true);
    assert.equal(view.witchInfo!.visibility, 'hidden');
  }
  const after = worlds.map(g => act(g, 't', { type: 'potion', heal: true, poison: null }));
  for (const g of after) assert.deepEqual(playerView(g, 't'), playerView(after[0], 't'));
  const closed = after.map(g => cmd(g, { type: 'advance' }));
  assert.deepEqual(closed.map(g => g.healTarget), [null, null, 'b', 'a']);
  for (const g of closed) {
    assert.equal(g.players.find(p => p.id === 't')!.resources.heal, 0);
    assert.deepEqual(playerView(g, 't'), playerView(closed[0], 't'));
  }
  assert.deepEqual(cmd(closed[3], { type: 'resolve' }).pendingDeaths, ['b']);
});

test('hidden mode cannot probe victims using forged healTarget; no resource consumed on rejection', () => {
  for (const bites of [[], ['a'], ['b'], ['a', 'b']]) {
    const g = witch(bites, 'g', false), before = structuredClone(g);
    for (const target of ['a', 'b', 'g', 'absent']) rejects(() => act(g, 't', { type: 'potion', heal: true, healTarget: target, poison: null }), 'INVALID_HEAL_TARGET');
    assert.deepEqual(g, before);
  }
});

test('hidden heal retry never consumes a second potion, including after closing the turn', () => {
  let g = cmd(witch(['a'], 'g', false), { type: 'wake' }, 't');
  const request = { id: 'one-potion', gameId: g.id, stepId: stepId(g), command: { type: 'act', action: { type: 'potion', heal: true, poison: null } } as const };
  g = dispatch(g, { kind: 'player', playerId: 't' }, request);
  assert.deepEqual(dispatch(g, { kind: 'player', playerId: 't' }, request), g);
  g = cmd(g, { type: 'advance' });
  assert.deepEqual(dispatch(g, { kind: 'player', playerId: 't' }, request), g);
  assert.equal(g.players.find(p => p.id === 't')!.resources.heal, 0);
});

test('hidden mode can keep potion or self-heal; exhausted potion gives no target data', () => {
  let g = witch(['t'], 'g', false);
  const kept = cmd(act(g, 't', { type: 'potion', heal: false, poison: null }), { type: 'advance' });
  assert.equal(kept.players.find(p => p.id === 't')!.resources.heal, 1);
  g = cmd(act(g, 't', { type: 'potion', heal: true, poison: null }), { type: 'advance' });
  assert.equal(g.healTarget, 't'); assert.deepEqual(cmd(g, { type: 'resolve' }).pendingDeaths, []);
  const empty = witch(['a'], 'g', false); empty.players.find(p => p.id === 't')!.resources.heal = 0;
  assert.deepEqual(playerView(empty, 't').biteTargets, []);
  assert.equal(playerView(empty, 't').witchInfo!.canHeal, false);
  rejects(() => act(empty, 't', { type: 'potion', heal: true, poison: null }), 'NO_HEAL_AVAILABLE');
});

test('sleep acknowledgement follows accepted action and action details stay moderator-only', () => {
  const initial = witch(['a']);
  assert.equal(playerView(initial, 't').turn!.sleepReady, false);
  const g = act(initial, 't', { type: 'potion', heal: true, poison: 'b' });
  assert.equal(playerView(g, 't').turn!.sleepReady, true);
  const event = moderatorView(g).events.findLast(e => e.type === 'action-confirmed');
  assert.deepEqual(event!.data, { actor: 't', action: { type: 'potion', heal: true, poison: 'b' } });
  assert(!publicView(g).announcements.some(e => e.type === 'action-confirmed'));
  for (const id of ['a', 'b', 'w', 'g']) assert(!playerView(g, id).messages.some(e => e.type === 'action-confirmed'));
});

test('wolves sleep only after consensus and wake screen returns when another wolf revises', () => {
  let g = createGame('wolves', [...roster, { id: 'w2', name: 'W2', role: 'wolf' }]);
  g = cmd(act(g, 'g', { type: 'protect', target: 'g' }), { type: 'advance' });
  g = cmd(act(g, 's', { type: 'inspect', target: 'w' }), { type: 'advance' });
  g = act(g, 'w', { type: 'bite', target: 'a' });
  assert.equal(playerView(g, 'w').turn!.sleepReady, false);
  g = act(g, 'w2', { type: 'maul', targets: ['a'] });
  assert.equal(playerView(g, 'w').turn!.sleepReady, true);
  assert.equal(playerView(g, 'w2').turn!.sleepReady, true);
  g = act(g, 'w2', { type: 'bite', target: 'b' });
  assert.equal(playerView(g, 'w').turn!.sleepReady, false);
});

test('v8/schema3 saved game keeps old Witch semantics; no silent relabeling', () => {
  let g = witch(['a'], 'a', true, true);
  assert.deepEqual(playerView(g, 't').biteTargets, ['a']);
  g = cmd(act(g, 't', { type: 'potion', heal: true, poison: null }), { type: 'advance' });
  assert.equal(g.healTarget, 'a'); assert.equal(g.schemaVersion, 3); assert.equal(g.rulesVersion, 'classic-core-v8');
  assert.equal(g.settings, undefined);
  const malformed = createGame('bad', roster); delete malformed.settings;
  rejects(() => cmd(malformed, { type: 'wake' }, 'g'), 'INVALID_SETTINGS');
  const oldSchema = createGame('bad', roster); oldSchema.schemaVersion = 3;
  rejects(() => cmd(oldSchema, { type: 'wake' }, 'g'), 'UNSUPPORTED_SCHEMA_VERSION');
});
