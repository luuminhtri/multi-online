import test from 'node:test';
import assert from 'node:assert/strict';
import { actors, createGame, dispatch, RuleError, stepId } from '../src/engine/engine.ts';
import { playerView, publicView } from '../src/engine/views.ts';
import { wolfPlan } from '../src/engine/wolf-pack.ts';
import { RULES } from '../src/engine/rules.ts';
import type { Action, Command, Game, Role } from '../src/engine/types.ts';

function make(extra: Record<string, Role> = {}) {
  const roles: Record<string, Role> = { w: 'wolf', a: 'villager', b: 'villager', c: 'villager', d: 'villager', e: 'villager', f: 'villager', g: 'villager', h: 'villager', i: 'villager', j: 'villager', ...extra };
  return createGame('conditional', Object.entries(roles).map(([id, role]) => ({ id, name: id, role })), { witchSeesBite: true, skipVoteDays: 30 });
}
function cmd(g: Game, command: Command, id?: string) {
  return dispatch(g, id ? { kind: 'player', playerId: id } : { kind: 'moderator' }, { id: `q${g.revision}`, gameId: g.id, stepId: stepId(g), command });
}
function act(g: Game, id: string, action: Action) { return cmd(cmd(g, { type: 'wake' }, id), { type: 'act', action }, id); }
const p = (g: Game, id: string) => g.players.find(p => p.id === id)!;
const rejects = (fn: () => unknown, code: string) => assert.throws(fn, (e: unknown) => e instanceof RuleError && e.code === code);
interface Choice { convert?: string | null; bite?: string; poison?: string | null; protect?: string; links?: Record<string, string>; pair?: [string, string]; mimic?: string }
function turn(g: Game, c: Choice = {}) {
  for (const id of actors(g)) {
    const v = playerView(g, id), ts = v.turn!.targets;
    const a: Action = g.step === 'dire_wolf' || g.step === 'virginia_woolf' ? { type: 'bond', target: c.links?.[id] ?? ts[0] }
      : g.step === 'cupid' ? { type: 'pair', targets: c.pair ?? ['c', 'd'] }
      : g.step === 'doppelganger' ? { type: 'mimic', target: c.mimic ?? 'w' }
      : g.step === 'guard' ? { type: 'protect', target: c.protect ?? ts[0] }
      : g.step === 'wolves' ? v.turn!.wolfPlan!.maxTargets === 0 ? { type: 'fast' } : { type: 'bite', target: c.bite ?? 'a' }
      : g.step === 'alpha_wolf' ? { type: 'convert', target: c.convert ?? null }
      : g.step === 'witch' ? { type: 'potion', heal: false, poison: c.poison ?? null }
      : g.step === 'mentalist' ? { type: 'compare', targets: [ts[0], ts[1]] }
      : { type: 'inspect', target: ts[0] };
    g = act(g, id, a);
  }
  return cmd(g, { type: 'advance' });
}
function until(g: Game, target: string, c: Choice = {}) {
  for (let n = 0; g.step !== target && n < 16; n++) g = turn(g, c);
  assert.equal(g.step, target);
  return g;
}
function night(g: Game, c: Choice = {}) { return cmd(until(g, 'review', c), { type: 'resolve' }); }
function dawn(g: Game, c: Choice = {}) { return cmd(night(g, c), { type: 'publish' }); }
function next(g: Game) {
  if (!g.verdictDone) g = cmd(g, { type: 'verdict', target: null });
  return cmd(g, { type: 'nextNight' });
}
function packIds(g: Game, id: string) { return playerView(g, id).pack?.map(p => p.id) ?? null; }
function assertPrivate(g: Game) {
  const text = JSON.stringify(publicView(g));
  for (const secret of ['deathBond', 'knownWolves', 'wolfDeathOccurred', 'death-bond', 'feared-by', 'pack-bite-blocked', 'companion', 'fear']) assert.ok(!text.includes(secret), secret);
}

test('Dire chooses one living companion, cannot target itself and cannot rebind after confirmation', () => {
  let g = make({ dr: 'dire_wolf' });
  assert.equal(g.step, 'dire_wolf');
  const before = structuredClone(g);
  rejects(() => cmd(g, { type: 'act', action: { type: 'bond', target: 'a' } }, 'dr'), 'NOT_AWAKE');
  rejects(() => act(g, 'dr', { type: 'bond', target: 'dr' }), 'SELF_TARGET');
  rejects(() => act(g, 'dr', { type: 'bond', target: 'missing' }), 'INVALID_TARGET');
  assert.deepEqual(g, before);
  g = act(g, 'dr', { type: 'bond', target: 'a' });
  rejects(() => act(g, 'dr', { type: 'bond', target: 'b' }), 'ACTION_ALREADY_CONFIRMED');
  g = cmd(g, { type: 'advance' });
  assert.deepEqual(playerView(g, 'dr').deathBond, { kind: 'follow', target: 'a' });
  assert.equal(playerView(g, 'a').deathBond, null);
  assert.equal(playerView(g, 'a').messages.length, 0);
  assertPrivate(g);
});

test('companion death kills Dire in the same night batch, hidden until publication', () => {
  let g = until(make({ dr: 'dire_wolf' }), 'review', { links: { dr: 'a' }, bite: 'a' });
  const before = new Map(g.players.map(p => [p.id, playerView(g, p.id)]));
  g = cmd(g, { type: 'resolve' });
  assert.deepEqual(new Set(g.pendingDeaths), new Set(['a', 'dr']));
  for (const player of g.players) assert.deepEqual(playerView(g, player.id), before.get(player.id));
  g = cmd(g, { type: 'publish' });
  assert.equal(p(g, 'dr').alive, false);
  assertPrivate(g);
});

test('Dire dying never kills companion and an existing bond is not reset next night', () => {
  let g = dawn(make({ dr: 'dire_wolf', wt: 'witch' }), { links: { dr: 'b' }, bite: 'a', poison: 'dr' });
  assert.equal(p(g, 'b').alive, true);
  g = dawn(make({ dr: 'dire_wolf' }), { links: { dr: 'b' }, bite: 'a' });
  g = next(g);
  assert.equal(g.step, 'guard');
  assert.deepEqual(p(g, 'dr').deathBond, { kind: 'follow', target: 'b' });
});

test('Virginia default is village; fear notification goes only to the selected person', () => {
  let g = make({ vw: 'virginia_woolf' });
  assert.equal(p(g, 'vw').team, 'village');
  g = turn(g, { links: { vw: 'a' } });
  assert.deepEqual(playerView(g, 'vw').deathBond, { kind: 'revenge', target: 'a' });
  assert.equal(playerView(g, 'a').messages[0].type, 'feared-by');
  assert.deepEqual(playerView(g, 'a').messages[0].data, { actor: 'vw' });
  assert.equal(playerView(g, 'b').messages.length, 0);
  g = until(g, 'wolves');
  assert.ok(!actors(g).includes('vw'));
  assert.equal(playerView(g, 'vw').pack, null);
  assertPrivate(g);
});

test('Virginia death kills feared person but the inverse never kills Virginia', () => {
  let g = dawn(make({ vw: 'virginia_woolf', wt: 'witch' }), { links: { vw: 'b' }, bite: 'a', poison: 'vw' });
  assert.equal(p(g, 'b').alive, false);
  assert.equal(p(g, 'vw').alive, false);
  g = dawn(make({ vw: 'virginia_woolf' }), { links: { vw: 'a' }, bite: 'a' });
  assert.equal(p(g, 'vw').alive, true);
  assertPrivate(g);
});

test('cyclic one-way bonds terminate and each player dies once', () => {
  let g = dawn(make({ dr: 'dire_wolf', vw: 'virginia_woolf', wt: 'witch' }), { links: { dr: 'vw', vw: 'dr' }, bite: 'a', poison: 'vw' });
  assert.equal(p(g, 'dr').alive, false);
  for (const id of ['dr', 'vw']) assert.equal(g.events.filter(e => e.type === 'death' && e.data.player === id).length, 1);
  assertPrivate(g);
});

test('Virginia to companion to Dire to lover to Hunter resolves before winner', () => {
  let g = dawn(make({ dr: 'dire_wolf', vw: 'virginia_woolf', cu: 'cupid', ht: 'hunter' }), {
    bite: 'j', links: { dr: 'a', vw: 'a' }, pair: ['dr', 'ht'],
  });
  g = cmd(g, { type: 'verdict', target: 'vw' });
  for (const id of ['vw', 'a', 'dr', 'ht']) assert.equal(p(g, id).alive, false);
  assert.equal(g.activeHunterId, 'ht');
  assert.equal(g.winner, null);
  g = cmd(act(g, 'ht', { type: 'shoot', target: 'w' }), { type: 'advance' });
  assert.equal(g.winner, 'village');
  assertPrivate(g);
});

test('inheriting a bond role does not copy personal target; setup happens next night', () => {
  for (const role of ['dire_wolf', 'virginia_woolf'] as const) {
    let g = dawn(make({ owner: role, dp: 'doppelganger', wt: 'witch' }), { bite: 'j', poison: 'owner', links: { owner: 'b' }, mimic: 'owner' });
    assert.equal(p(g, 'dp').role, role);
    assert.equal(p(g, 'dp').deathBond, null);
    g = next(g);
    assert.equal(g.step, role);
    g = turn(g, { links: { dp: 'c' } });
    assert.deepEqual(p(g, 'dp').deathBond, { kind: role === 'dire_wolf' ? 'follow' : 'revenge', target: 'c' });
  }
});

test('Dream Wolf is absent from the pack but remains an indistinguishable legal unknown target', () => {
  let g = until(make({ dream: 'dream_wolf' }), 'wolves');
  assert.deepEqual(actors(g), ['w']);
  assert.deepEqual(packIds(g, 'w'), ['w']);
  assert.equal(playerView(g, 'dream').pack, null);
  assert.equal(playerView(g, 'dream').wolvesBlocked, null);
  assert.equal(playerView(g, 'dream').turn, null);
  assert.ok(playerView(g, 'w').turn!.targets.includes('dream'));
  rejects(() => act(g, 'dream', { type: 'bite', target: 'a' }), 'NOT_YOUR_TURN');
  g = act(g, 'w', { type: 'bite', target: 'dream' }); // no validation oracle
  g = cmd(g, { type: 'advance' });
  g = dawn(g);
  assert.equal(p(g, 'dream').alive, true);
  assert.equal(g.publicDead.length, 0);
  assert.equal(g.wolfDeathOccurred, false);
  assert.equal(playerView(g, 'dream').pack, null);
  assertPrivate(g);
});

test('ordinary wolf death activates Dream only at publication and allows next-night action', () => {
  let g = night(make({ dream: 'dream_wolf', wt: 'witch' }), { bite: 'a', poison: 'w' });
  assert.equal(g.wolfDeathOccurred, false);
  assert.equal(playerView(g, 'dream').pack, null);
  g = cmd(g, { type: 'publish' });
  assert.equal(g.wolfDeathOccurred, true);
  assert.ok(packIds(g, 'dream')!.includes('dream'));
  g = until(next(g), 'wolves', { bite: 'b' });
  assert.deepEqual(actors(g), ['dream']);
  g = act(g, 'dream', { type: 'bite', target: 'b' });
  assert.equal(g.actions.dream.type, 'bite');
});

test('an undiscovered Dream killed at night is not identified to other wolves afterward', () => {
  const g = dawn(make({ dream: 'dream_wolf', wt: 'witch' }), { bite: 'a', poison: 'dream' });
  assert.equal(g.wolfDeathOccurred, true);
  assert.equal(p(g, 'dream').alive, false);
  assert.ok(!packIds(g, 'w')!.includes('dream'));
  assertPrivate(g);
});

test('Lycan and Virginia death never activate Dream, but Wolf-man death does', () => {
  for (const [role, activate] of [['lycan', false], ['virginia_woolf', false], ['wolf_man', true]] as const) {
    const g = dawn(make({ dream: 'dream_wolf', victim: role, wt: 'witch' }), { bite: 'a', poison: 'victim', links: { victim: 'b' } });
    assert.equal(g.wolfDeathOccurred, activate, role);
  }
});

test('a lone dormant Dream still counts for faction victory without getting a fake turn', () => {
  let g = createGame('dream-only', [
    { id: 'dream', name: 'dream', role: 'dream_wolf' }, { id: 'a', name: 'a', role: 'villager' }, { id: 'b', name: 'b', role: 'villager' },
  ], { witchSeesBite: true, skipVoteDays: 30 });
  g = dawn(g);
  assert.equal(g.winner, null);
  assert.equal(g.biteTargets.length, 0);
  g = cmd(g, { type: 'verdict', target: 'a' });
  assert.equal(g.winner, 'wolves');
});

test('Fang wakes night one, sleeps with another living wolf, then wakes when alone', () => {
  let g = until(make({ fang: 'fang_face' }), 'wolves');
  assert.deepEqual(actors(g), ['w', 'fang']);
  g = dawn(g);
  g = next(g); g = until(g, 'wolves', { bite: 'b' });
  assert.deepEqual(actors(g), ['w']);
  g = act(g, 'w', { type: 'bite', target: 'b' });
  assert.equal(playerView(g, 'fang').turn, null);
  assert.ok(playerView(g, 'fang').pack!.every(p => p.choice === null));
  rejects(() => act(g, 'fang', { type: 'bite', target: 'b' }), 'NOT_YOUR_TURN');
  g = dawn(cmd(g, { type: 'advance' }));
  g = cmd(g, { type: 'verdict', target: 'w' });
  g = until(next(g), 'wolves', { bite: 'c' });
  assert.deepEqual(actors(g), ['fang']);
});

test('sleeping Fang receives neither new converted wolves nor live ballots', () => {
  let g = dawn(make({ fang: 'fang_face', cur: 'cursed' }), { bite: 'a' });
  const known = packIds(g, 'fang');
  g = next(g);
  g = dawn(g, { bite: 'cur' });
  assert.equal(p(g, 'cur').role, 'wolf');
  assert.ok(packIds(g, 'w')!.includes('cur'));
  assert.deepEqual(packIds(g, 'fang'), known);
  assert.ok(!packIds(g, 'fang')!.includes('cur'));
});

test('Fang does not forget conversion revealed at publication of its first awake night', () => {
  let g = dawn(make({ fang: 'fang_face', cur: 'cursed' }), { bite: 'cur' });
  assert.ok(packIds(g, 'fang')!.includes('cur'));
  g = next(g);
  assert.ok(packIds(g, 'fang')!.includes('cur'));
});

test('Fang plus dormant Dream can both sleep; moderator can still complete an empty night', () => {
  let g = createGame('sleepers', [
    ['fang', 'fang_face'], ['dream', 'dream_wolf'], ['a', 'villager'], ['b', 'villager'], ['c', 'villager'], ['d', 'villager'], ['e', 'villager'],
  ].map(([id, role]) => ({ id, name: id, role: role as Role })), { witchSeesBite: true, skipVoteDays: 30 });
  g = next(dawn(g));
  g = until(g, 'wolves');
  assert.deepEqual(actors(g), []);
  g = dawn(g);
  assert.equal(g.step, 'day');
  assert.equal(g.biteTargets.length, 0);
});

test('last Fruit wakes but can only confirm fasting; empty maul is not a skip', () => {
  let g = createGame('fruit', [
    ['fruit', 'fruit_wolf'], ['a', 'villager'], ['b', 'villager'], ['c', 'villager'],
  ].map(([id, role]) => ({ id, name: id, role: role as Role })), { witchSeesBite: true, skipVoteDays: 30 });
  g = until(g, 'wolves');
  assert.deepEqual(actors(g), ['fruit']);
  assert.equal(wolfPlan(g).maxTargets, 0);
  rejects(() => act(g, 'fruit', { type: 'bite', target: 'a' }), 'CANNOT_BITE');
  rejects(() => act(g, 'fruit', { type: 'maul', targets: [] }), 'CANNOT_BITE');
  g = act(g, 'fruit', { type: 'fast' });
  g = dawn(cmd(g, { type: 'advance' }));
  assert.equal(g.publicDead.length, 0);
  const ordinary = until(make(), 'wolves');
  rejects(() => act(ordinary, 'w', { type: 'fast' }), 'CANNOT_FAST');
});

test('Fruit is not the last wolf when a dormant Dream remains alive', () => {
  let g = createGame('fruit-dream', [
    ['fruit', 'fruit_wolf'], ['dream', 'dream_wolf'], ['a', 'villager'], ['b', 'villager'], ['c', 'villager'], ['d', 'villager'], ['e', 'villager'],
  ].map(([id, role]) => ({ id, name: id, role: role as Role })));
  g = until(g, 'wolves');
  assert.deepEqual(actors(g), ['fruit']);
  assert.equal(wolfPlan(g).maxTargets, 1);
  g = act(g, 'fruit', { type: 'bite', target: 'a' });
  assert.equal(g.actions.fruit.type, 'bite');
});

test('Fruit restriction overrides Cub sacrifice bonus once Cub leaves the second ballot', () => {
  let g = createGame('fruit-cub', [
    ['fruit', 'fruit_wolf'], ['cb', 'wolf_cub'], ['a', 'villager'], ['b', 'villager'], ['c', 'villager'], ['d', 'villager'], ['e', 'villager'],
  ].map(([id, role]) => ({ id, name: id, role: role as Role })));
  g = until(g, 'wolves');
  g = act(g, 'cb', { type: 'sacrifice', target: 'cb' });
  g = act(g, 'fruit', { type: 'sacrifice', target: 'cb' });
  g = cmd(g, { type: 'advance' });
  assert.deepEqual(actors(g), ['fruit']);
  assert.equal(wolfPlan(g).maxTargets, 0);
  g = dawn(g);
  assert.deepEqual(g.publicDead, ['cb']);
});

test('Cub cannot collect full consent while any living wolf is asleep', () => {
  let g = until(make({ cb: 'wolf_cub', dream: 'dream_wolf' }), 'wolves');
  assert.equal(playerView(g, 'cb').turn!.wolfPlan!.canOfferSacrifice, false);
  rejects(() => act(g, 'cb', { type: 'sacrifice', target: 'cb' }), 'PACK_MEMBER_ASLEEP');
  g = dawn(g);
  g = next(cmd(g, { type: 'verdict', target: 'w' }));
  g = until(g, 'wolves', { bite: 'b' });
  assert.equal(playerView(g, 'cb').turn!.wolfPlan!.canOfferSacrifice, true);
  g = act(g, 'cb', { type: 'sacrifice', target: 'cb' });
  assert.equal(g.actions.cb.type, 'sacrifice');
});

test('new schema rejects v7 snapshots and old schema even under current rule label', () => {
  const g = make();
  g.rulesVersion = 'classic-core-v7';
  rejects(() => cmd(g, { type: 'advance' }), 'UNSUPPORTED_RULES_VERSION');
  g.rulesVersion = RULES.version;
  (g as unknown as { schemaVersion: number }).schemaVersion = 2;
  rejects(() => cmd(g, { type: 'advance' }), 'UNSUPPORTED_SCHEMA_VERSION');
});

test('Dream and villager worlds have identical wolf views and acceptance before outcomes are published', () => {
  let hidden = until(make({ unknown: 'dream_wolf' }), 'wolves');
  let ordinary = until(make({ unknown: 'villager' }), 'wolves');
  assert.deepEqual(playerView(hidden, 'w'), playerView(ordinary, 'w'));
  hidden = act(hidden, 'w', { type: 'bite', target: 'unknown' });
  ordinary = act(ordinary, 'w', { type: 'bite', target: 'unknown' });
  assert.deepEqual(playerView(hidden, 'w'), playerView(ordinary, 'w'));
  hidden = night(cmd(hidden, { type: 'advance' }));
  ordinary = night(cmd(ordinary, { type: 'advance' }));
  assert.deepEqual(publicView(hidden), publicView(ordinary));
  assert.deepEqual(playerView(hidden, 'w'), playerView(ordinary, 'w'));
});

test('bond projection and remembered pack choices cannot mutate canonical state', () => {
  const g = until(make({ dr: 'dire_wolf', fang: 'fang_face' }), 'wolves', { links: { dr: 'a' } });
  const before = structuredClone(g);
  const view = playerView(g, 'dr');
  view.deathBond!.target = 'b';
  view.pack!.splice(0);
  assert.deepEqual(g, before);
});

test('disease suppresses last Fruit waking too, then fasting resumes next night', () => {
  let g = dawn(make({ fruit: 'fruit_wolf', sick: 'diseased' }), { bite: 'sick' });
  g = next(cmd(g, { type: 'verdict', target: 'w' }));
  g = until(g, 'wolves');
  assert.deepEqual(actors(g), []);
  rejects(() => act(g, 'fruit', { type: 'fast' }), 'NOT_YOUR_TURN');
  g = dawn(g);
  g = until(next(g), 'wolves');
  assert.deepEqual(actors(g), ['fruit']);
  g = act(g, 'fruit', { type: 'fast' });
  assert.equal(g.actions.fruit.type, 'fast');
});

test('a bond follows companion identity through Cursed conversion', () => {
  let g = dawn(make({ dr: 'dire_wolf', cur: 'cursed' }), { bite: 'cur', links: { dr: 'cur' } });
  assert.equal(p(g, 'cur').role, 'wolf');
  assert.equal(p(g, 'dr').alive, true);
  g = cmd(g, { type: 'verdict', target: 'cur' });
  assert.equal(p(g, 'dr').alive, false);
});

test('Virginia losing its role to Alpha also loses its death-trigger ability', () => {
  let g = dawn(make({ vw: 'virginia_woolf', al: 'alpha_wolf' }), { bite: 'j', links: { vw: 'b' } });
  g = next(cmd(g, { type: 'verdict', target: 'w' }));
  g = dawn(g, { bite: 'vw', convert: 'vw' });
  assert.equal(p(g, 'vw').role, 'wolf');
  assert.equal(playerView(g, 'vw').deathBond, null);
  g = cmd(g, { type: 'verdict', target: 'vw' });
  assert.equal(p(g, 'b').alive, true);
});
