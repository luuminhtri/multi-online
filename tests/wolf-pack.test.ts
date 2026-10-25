import test from 'node:test';
import assert from 'node:assert/strict';
import { actors, createGame, dispatch, RuleError, stepId } from '../src/engine/engine.ts';
import { playerView, publicView } from '../src/engine/views.ts';
import { RULES } from '../src/engine/rules.ts';
import { wolfPlan } from '../src/engine/wolf-pack.ts';
import type { Action, Command, Game, Role } from '../src/engine/types.ts';

function make(extra: Record<string, Role> = {}) {
  const base: Record<string, Role> = { w: 'wolf', a: 'villager', b: 'villager', c: 'villager', d: 'villager', e: 'villager', f: 'villager', g: 'villager', h: 'villager', i: 'villager', j: 'villager', ...extra };
  return createGame('pack-test', Object.entries(base).map(([id, role]) => ({ id, name: id, role })));
}
const mod = { kind: 'moderator' } as const;
function cmd(g: Game, command: Command, id?: string) {
  return dispatch(g, id ? { kind: 'player', playerId: id } : mod, { id: `p${g.revision}`, gameId: g.id, stepId: stepId(g), command });
}
function act(g: Game, id: string, action: Action) { return cmd(cmd(g, { type: 'wake' }, id), { type: 'act', action }, id); }
const p = (g: Game, id: string) => g.players.find(p => p.id === id)!;
const rejects = (fn: () => unknown, code: string) => assert.throws(fn, (e: unknown) => e instanceof RuleError && e.code === code);
interface Choices { targets?: string[]; protect?: string; healTarget?: string; poison?: string | null; convert?: string | null; pair?: [string, string]; mimic?: string }
function turn(g: Game, o: Choices = {}) {
  for (const id of actors(g)) {
    const t = playerView(g, id).turn!.targets;
    const targets = o.targets ?? ['a'];
    const action: Action = g.step === 'wolves' ? targets.length === 1 ? { type: 'bite', target: targets[0] } : { type: 'maul', targets }
      : g.step === 'alpha_wolf' ? { type: 'convert', target: o.convert ?? null }
      : g.step === 'guard' ? { type: 'protect', target: o.protect ?? t[0] }
      : g.step === 'witch' ? { type: 'potion', heal: !!o.healTarget, ...(o.healTarget ? { healTarget: o.healTarget } : {}), poison: o.poison ?? null }
      : g.step === 'cupid' ? { type: 'pair', targets: o.pair ?? ['c', 'd'] }
      : g.step === 'doppelganger' ? { type: 'mimic', target: o.mimic ?? 'w' }
      : g.step === 'mentalist' ? { type: 'compare', targets: [t[0], t[1]] }
      : { type: 'inspect', target: t[0] };
    g = act(g, id, action);
  }
  return cmd(g, { type: 'advance' });
}
function until(g: Game, target: string, o: Choices = {}) {
  for (let i = 0; g.step !== target && i < 15; i++) g = turn(g, o);
  assert.equal(g.step, target);
  return g;
}
function night(g: Game, o: Choices = {}) { return cmd(until(g, 'review', o), { type: 'resolve' }); }
function dawn(g: Game, o: Choices = {}) { return cmd(night(g, o), { type: 'publish' }); }
function next(g: Game) {
  if (!g.verdictDone) g = cmd(g, { type: 'verdict', target: null });
  return cmd(g, { type: 'nextNight' });
}
function eligible(extra: Record<string, Role> = {}) {
  let g = dawn(make({ al: 'alpha_wolf', ...extra }), { targets: ['j'] });
  g = cmd(g, { type: 'verdict', target: 'w' });
  return next(g);
}
function assertPrivate(g: Game) {
  for (const e of publicView(g).announcements) {
    assert.ok(!('causes' in e.data));
    assert.ok(!['cub-sacrifice-approved', 'alpha-converted', 'transformed-to-wolf', 'action-confirmed'].includes(e.type));
  }
}

test('ordinary wolves reject empty, duplicate, oversized, dead and wolf target sets', () => {
  const g = until(make(), 'wolves'), before = structuredClone(g);
  rejects(() => act(g, 'w', { type: 'maul', targets: [] }), 'INVALID_TARGET_COUNT');
  rejects(() => act(g, 'w', { type: 'maul', targets: ['a', 'a'] }), 'INVALID_WOLF_TARGETS');
  rejects(() => act(g, 'w', { type: 'maul', targets: ['a', 'b'] }), 'INVALID_TARGET_COUNT');
  rejects(() => act(g, 'w', { type: 'bite', target: 'w' }), 'WOLF_TARGET');
  rejects(() => act(g, 'w', { type: 'bite', target: 'missing' }), 'INVALID_TARGET');
  rejects(() => act(g, 'w', { type: 'maul', targets: null } as unknown as Action), 'WRONG_ABILITY');
  assert.deepEqual(g, before);
  const later = until(next(dawn(make())), 'wolves');
  rejects(() => act(later, 'w', { type: 'bite', target: 'a' }), 'INVALID_TARGET');
});

test('Big Bad Wolf grants an optional adjacent pair; nonadjacent and third targets fail', () => {
  let g = until(make({ bb: 'big_bad_wolf' }), 'wolves');
  assert.deepEqual(wolfPlan(g), { minTargets: 1, maxTargets: 2, adjacentPair: true });
  rejects(() => act(g, 'w', { type: 'maul', targets: ['a', 'c'] }), 'TARGETS_NOT_ADJACENT');
  rejects(() => act(g, 'w', { type: 'maul', targets: ['a', 'b', 'c'] }), 'INVALID_TARGET_COUNT');
  g = act(g, 'w', { type: 'maul', targets: ['b', 'a'] });
  g = act(g, 'bb', { type: 'maul', targets: ['a', 'b'] });
  g = cmd(g, { type: 'advance' });
  assert.deepEqual(g.biteTargets, ['a', 'b']);
  assert.equal(g.biteTarget, 'a');
  assert.ok(!JSON.stringify(playerView(g, 'w').pack).includes('big_bad_wolf'));
});

test('target sets require consensus; one-target bite and maul ballots are equivalent', () => {
  let g = until(make({ bb: 'big_bad_wolf' }), 'wolves');
  g = act(g, 'w', { type: 'maul', targets: ['a', 'b'] });
  g = act(g, 'bb', { type: 'bite', target: 'a' });
  rejects(() => cmd(g, { type: 'advance' }), 'WOLVES_DISAGREE');
  g = act(g, 'w', { type: 'maul', targets: ['a'] });
  g = cmd(g, { type: 'advance' });
  assert.deepEqual(g.biteTargets, ['a']);
});

test('circular adjacency wraps and skips seats already dead', () => {
  let g = createGame('ring', [
    ['a', 'villager'], ['w', 'wolf'], ['bb', 'big_bad_wolf'], ['x', 'villager'],
    ['y', 'villager'], ['z', 'villager'], ['b', 'villager'],
  ].map(([id, role]) => ({ id, name: id, role: role as Role })));
  g = until(g, 'wolves');
  g = act(g, 'w', { type: 'maul', targets: ['b', 'a'] });
  assert.equal(g.actions.w.type, 'maul');
  g = dawn(make({ bb: 'big_bad_wolf' }), { targets: ['b'] });
  g = next(g); g = until(g, 'wolves');
  g = act(g, 'w', { type: 'maul', targets: ['a', 'c'] }); // dead b no longer separates a/c
  assert.equal(g.actions.w.type, 'maul');
});

test('Big Bad Wolf bonus ends after its death', () => {
  let g = dawn(make({ bb: 'big_bad_wolf' }), { targets: ['j'] });
  g = next(cmd(g, { type: 'verdict', target: 'bb' }));
  assert.deepEqual(wolfPlan(g), { minTargets: 1, maxTargets: 1, adjacentPair: false });
});

test('two-bite protection, single-heal and poison combinations resolve independently; protected targets cannot be healed', () => {
  for (const protect of ['gr', 'a', 'b']) for (const healTarget of [undefined, 'a', 'b']) for (const poison of [null, 'a', 'b']) {
    if (healTarget === protect) {
      rejects(() => night(make({ bb: 'big_bad_wolf', gr: 'guard', wt: 'witch' }), { targets: ['a', 'b'], protect, healTarget, poison }), 'INVALID_HEAL_TARGET');
      continue;
    }
    const g = night(make({ bb: 'big_bad_wolf', gr: 'guard', wt: 'witch' }), { targets: ['a', 'b'], protect, healTarget, poison });
    const dead = new Set<string>();
    for (const id of ['a', 'b']) if (id !== protect && id !== healTarget) dead.add(id);
    if (poison) dead.add(poison);
    assert.deepEqual(new Set(g.pendingDeaths), dead, JSON.stringify({ protect, healTarget, poison }));
    assert.equal(p(g, 'wt').resources.heal, healTarget ? 0 : 1);
    assert.equal(p(g, 'wt').resources.poison, poison ? 0 : 1);
    assertPrivate(g);
  }
});

test('witch must choose exactly one bitten victim to heal and sees full bite list only with potion', () => {
  let g = until(make({ bb: 'big_bad_wolf', wt: 'witch' }), 'witch', { targets: ['a', 'b'] });
  assert.deepEqual(playerView(g, 'wt').biteTargets, ['a', 'b']);
  assert.equal(playerView(g, 'wt').biteTarget, null);
  assert.deepEqual(playerView(g, 'c').biteTargets, []);
  rejects(() => act(g, 'wt', { type: 'potion', heal: true, poison: null }), 'HEAL_TARGET_REQUIRED');
  rejects(() => act(g, 'wt', { type: 'potion', heal: true, healTarget: 'c', poison: null }), 'INVALID_HEAL_TARGET');
  rejects(() => act(g, 'wt', { type: 'potion', heal: false, healTarget: 'a', poison: null }), 'INVALID_HEAL_TARGET');
  g = turn(g, { healTarget: 'b' });
  g = cmd(cmd(g, { type: 'resolve' }), { type: 'publish' });
  assert.equal(p(g, 'b').alive, true);
  g = next(g); g = until(g, 'witch', { targets: ['c', 'd'] });
  assert.deepEqual(playerView(g, 'wt').biteTargets, []);
  rejects(() => act(g, 'wt', { type: 'potion', heal: true, healTarget: 'c', poison: null }), 'NO_HEAL_AVAILABLE');
});

test('Cub must offer itself before pack consent; mixed votes cannot approve sacrifice', () => {
  let g = until(make({ cb: 'wolf_cub' }), 'wolves');
  assert.equal(playerView(g, 'w').turn!.wolfPlan!.sacrificeTarget, null);
  rejects(() => act(g, 'w', { type: 'sacrifice', target: 'cb' }), 'SACRIFICE_NOT_OFFERED');
  rejects(() => act(g, 'cb', { type: 'sacrifice', target: 'w' }), 'SACRIFICE_NOT_OFFERED');
  g = act(g, 'cb', { type: 'sacrifice', target: 'cb' });
  assert.equal(playerView(g, 'w').turn!.wolfPlan!.sacrificeTarget, 'cb');
  rejects(() => cmd(g, { type: 'advance' }), 'WAITING_FOR_ACTIONS');
  g = act(g, 'w', { type: 'bite', target: 'a' });
  rejects(() => cmd(g, { type: 'advance' }), 'WOLVES_DISAGREE');
  assert.equal(g.sacrificedCubId, null);
});

test('unanimous sacrifice reopens a fresh two-target ballot, hidden until publication and replay-safe', () => {
  let g = until(make({ cb: 'wolf_cub' }), 'wolves');
  const initialPublic = publicView(g);
  g = act(g, 'cb', { type: 'sacrifice', target: 'cb' });
  g = act(g, 'w', { type: 'sacrifice', target: 'cb' });
  const oldStep = stepId(g);
  const request = { id: 'sacrifice-close', gameId: g.id, stepId: oldStep, command: { type: 'advance' } as const };
  g = dispatch(g, mod, request);
  assert.equal(g.step, 'wolves');
  assert.notEqual(stepId(g), oldStep);
  assert.deepEqual(actors(g), ['w']);
  assert.deepEqual(publicView(g), initialPublic);
  assert.equal(p(g, 'cb').alive, true);
  assert.deepEqual(dispatch(g, mod, request), g);
  rejects(() => dispatch(g, { kind: 'player', playerId: 'w' }, { id: 'late-bite', gameId: g.id, stepId: oldStep, command: { type: 'act', action: { type: 'bite', target: 'a' } } }), 'STALE_STEP');
  rejects(() => act(g, 'cb', { type: 'bite', target: 'a' }), 'NOT_YOUR_TURN');
  rejects(() => act(g, 'w', { type: 'bite', target: 'a' }), 'INVALID_TARGET_COUNT');
  g = night(g, { targets: ['a', 'c'] });
  assert.deepEqual(new Set(g.pendingDeaths), new Set(['cb', 'a', 'c']));
  assert.deepEqual(publicView(g), initialPublic);
  assert.equal(g.doubleAttackNight, null);
  assertPrivate(g);
  g = cmd(g, { type: 'publish' });
  assert.equal(p(g, 'cb').alive, false);
  assert.equal(g.events.filter(e => e.type === 'cub-sacrifice-approved').length, 1);
});

test('Cub can withdraw its offer before consensus and ordinary bite resumes', () => {
  let g = until(make({ cb: 'wolf_cub' }), 'wolves');
  g = act(g, 'cb', { type: 'sacrifice', target: 'cb' });
  g = act(g, 'w', { type: 'sacrifice', target: 'cb' });
  g = act(g, 'cb', { type: 'bite', target: 'a' });
  rejects(() => cmd(g, { type: 'advance' }), 'WOLVES_DISAGREE');
  assert.equal(playerView(g, 'w').turn!.wolfPlan!.sacrificeTarget, null);
  g = act(g, 'w', { type: 'bite', target: 'a' });
  g = cmd(g, { type: 'advance' });
  assert.equal(g.sacrificedCubId, null);
});

test('natural Cub night death gives exactly next night two nonadjacent bites, without stacking Big Bad bonus', () => {
  let g = dawn(make({ cb: 'wolf_cub', bb: 'big_bad_wolf', wt: 'witch' }), { targets: ['j'], poison: 'cb' });
  g = next(g);
  assert.deepEqual(wolfPlan(g), { minTargets: 2, maxTargets: 2, adjacentPair: false });
  g = dawn(g, { targets: ['a', 'c'] });
  g = next(g);
  assert.deepEqual(wolfPlan(g), { minTargets: 1, maxTargets: 2, adjacentPair: true });
});

test('Cub death by daytime verdict enables revenge and Alpha together', () => {
  let g = dawn(make({ cb: 'wolf_cub', al: 'alpha_wolf' }), { targets: ['j'] });
  g = next(cmd(g, { type: 'verdict', target: 'cb' }));
  assert.equal(g.doubleAttackNight, 2);
  assert.equal(g.alphaEligibleNight, 2);
  g = until(g, 'alpha_wolf', { targets: ['a', 'c'] });
  assert.deepEqual(actors(g), ['al']);
});

test('disease cancels the revenge night rather than deferring it', () => {
  let g = dawn(make({ cb: 'wolf_cub', wt: 'witch', sick: 'diseased' }), { targets: ['sick'], poison: 'cb' });
  g = next(g); g = until(g, 'wolves');
  assert.deepEqual(actors(g), []);
  assert.equal(wolfPlan(g).maxTargets, 0);
  g = dawn(g);
  g = next(g);
  assert.equal(wolfPlan(g).maxTargets, 1);
});

test('Alpha cannot convert before eligibility or after only a night wolf death', () => {
  let g = until(make({ al: 'alpha_wolf' }), 'alpha_wolf');
  assert.deepEqual(actors(g), []);
  rejects(() => act(g, 'al', { type: 'convert', target: 'a' }), 'NOT_YOUR_TURN');
  g = dawn(make({ al: 'alpha_wolf', wt: 'witch' }), { targets: ['j'], poison: 'w' });
  assert.equal(g.alphaEligibleNight, null);
  g = next(g); g = until(g, 'alpha_wolf');
  assert.deepEqual(actors(g), []);
});

test('Alpha converts one bite victim at publication without leaking result during review', () => {
  let g = eligible({ bb: 'big_bad_wolf', wt: 'witch' });
  g = until(g, 'alpha_wolf', { targets: ['a', 'b'] });
  rejects(() => act(g, 'al', { type: 'convert', target: 'c' }), 'INVALID_CONVERSION_TARGET');
  g = turn(g, { convert: 'b' });
  g = until(g, 'review');
  const before = new Map(g.players.map(p => [p.id, playerView(g, p.id)]));
  g = cmd(g, { type: 'resolve' });
  assert.deepEqual(g.pendingDeaths, ['a']);
  for (const player of g.players) assert.deepEqual(playerView(g, player.id), before.get(player.id));
  assert.equal(p(g, 'al').alphaUsed, false);
  g = cmd(g, { type: 'publish' });
  assert.equal(p(g, 'a').alive, false);
  assert.equal(p(g, 'b').role, 'wolf');
  assert.equal(p(g, 'al').alphaUsed, true);
  assert.equal(playerView(g, 'b').pack!.some(p => p.id === 'al'), true);
  assertPrivate(g);
});

test('blocked Alpha conversion preserves resource and needs a fresh daytime wolf death to retry', () => {
  let g = eligible({ wm: 'wolf_man', gr: 'guard' });
  g = dawn(g, { targets: ['a'], protect: 'a', convert: 'a' });
  assert.equal(p(g, 'a').role, 'villager');
  assert.equal(p(g, 'al').alphaUsed, false);
  g = next(cmd(g, { type: 'verdict', target: 'wm' }));
  g = dawn(g, { targets: ['b'], protect: 'gr', convert: 'b' });
  assert.equal(p(g, 'b').role, 'wolf');
  assert.equal(p(g, 'al').alphaUsed, true);
  g = next(cmd(g, { type: 'verdict', target: 'b' }));
  g = until(g, 'alpha_wolf', { targets: ['c'], protect: 'c' });
  assert.deepEqual(actors(g), []);
});

test('healing, simultaneous poison or heartbreak prevent Alpha conversion without consuming power', () => {
  let healed = eligible({ wt: 'witch' });
  healed = dawn(healed, { targets: ['a'], convert: 'a', healTarget: 'a' });
  assert.equal(p(healed, 'al').alphaUsed, false);
  assert.equal(p(healed, 'a').role, 'villager');
  let poisoned = eligible({ wt: 'witch' });
  poisoned = dawn(poisoned, { targets: ['a'], convert: 'a', poison: 'a' });
  assert.equal(p(poisoned, 'a').alive, false);
  assert.equal(p(poisoned, 'al').alphaUsed, false);
  let loved = eligible({ bb: 'big_bad_wolf', cu: 'cupid' }); // default c/d lovers
  loved = dawn(loved, { targets: ['c', 'd'], convert: 'd' });
  assert.equal(p(loved, 'd').alive, false);
  assert.equal(p(loved, 'al').alphaUsed, false);
});

test('Alpha eligibility expires even when unused and does not bypass disease', () => {
  let g = eligible({ wt: 'witch', sick: 'diseased' });
  g = dawn(g, { targets: ['sick'], convert: null });
  assert.equal(p(g, 'al').alphaUsed, false);
  g = next(g); g = until(g, 'alpha_wolf');
  assert.deepEqual(actors(g), []);
});

test('Alpha conversion replaces Cursed and Tough Guy bite effects, while other bite resolves normally', () => {
  for (const role of ['cursed', 'tough_guy'] as const) {
    let g = eligible({ bb: 'big_bad_wolf', a: role });
    g = dawn(g, { targets: ['a', 'b'], convert: 'a' });
    assert.equal(p(g, 'a').role, 'wolf');
    assert.equal(p(g, 'a').delayedDeathNight, null);
    assert.equal(p(g, 'b').alive, false);
  }
});

test('a dying Alpha still converts, and a mimic inherits the spent state', () => {
  let g = make({ al: 'alpha_wolf', wt: 'witch', dp: 'doppelganger' });
  g = dawn(g, { targets: ['j'], mimic: 'al' });
  g = next(cmd(g, { type: 'verdict', target: 'w' }));
  g = dawn(g, { targets: ['a'], convert: 'a', poison: 'al' });
  assert.equal(p(g, 'al').alive, false);
  assert.equal(p(g, 'a').role, 'wolf');
  assert.equal(p(g, 'dp').role, 'alpha_wolf');
  assert.equal(p(g, 'dp').alphaUsed, true);
});

test('two bites integrate simultaneous Cursed conversion, Tough Guy wound and later disease', () => {
  let g = dawn(make({ bb: 'big_bad_wolf', a: 'cursed', b: 'tough_guy', sick: 'diseased' }), { targets: ['a', 'b'] });
  assert.equal(p(g, 'a').role, 'wolf');
  assert.equal(p(g, 'b').delayedDeathNight, 2);
  g = next(g);
  // One target is always permitted without revenge; the old wound still kills b.
  g = dawn(g, { targets: ['sick'] });
  assert.equal(p(g, 'b').alive, false);
  assert.equal(g.wolvesBlockedNight, 3);
});

test('daytime Hunter shot triggers Cub revenge and Alpha; sacrifice Hunter lover waits until dawn', () => {
  let g = dawn(make({ ht: 'hunter', cb: 'wolf_cub', al: 'alpha_wolf' }), { targets: ['ht'] });
  g = cmd(act(g, 'ht', { type: 'shoot', target: 'cb' }), { type: 'advance' });
  assert.equal(g.doubleAttackNight, 2);
  assert.equal(g.alphaEligibleNight, 2);
  g = until(make({ ht: 'hunter', cb: 'wolf_cub', cu: 'cupid' }), 'wolves', { pair: ['cb', 'ht'] });
  g = act(g, 'cb', { type: 'sacrifice', target: 'cb' });
  g = act(g, 'w', { type: 'sacrifice', target: 'cb' });
  g = cmd(g, { type: 'advance' });
  g = dawn(g, { targets: ['a', 'c'] });
  assert.equal(g.activeHunterId, 'ht');
  assert.equal(g.winner, null);
  assertPrivate(g);
});

test('a lone Cub can sacrifice itself without deadlocking an empty second ballot', () => {
  let g = createGame('last', [
    { id: 'cb', name: 'cb', role: 'wolf_cub' }, { id: 'a', name: 'a', role: 'villager' }, { id: 'b', name: 'b', role: 'villager' },
  ]);
  g = until(g, 'wolves');
  g = act(g, 'cb', { type: 'sacrifice', target: 'cb' });
  g = cmd(g, { type: 'advance' });
  assert.deepEqual(actors(g), []);
  g = dawn(g);
  assert.equal(g.winner, 'village');
});

test('v6 and schema 1 are refused, not relabeled into a multi-target game', () => {
  const g = make();
  g.rulesVersion = 'classic-core-v6';
  rejects(() => cmd(g, { type: 'advance' }), 'UNSUPPORTED_RULES_VERSION');
  g.rulesVersion = RULES.version;
  (g as unknown as { schemaVersion: number }).schemaVersion = 1;
  rejects(() => cmd(g, { type: 'advance' }), 'UNSUPPORTED_SCHEMA_VERSION');
});

test('a bomb killing the Cub schedules revenge even when the Cub was not the bite target', () => {
  let g = dawn(make({ bomb: 'mad_bomber', cb: 'wolf_cub' }), { targets: ['bomb'] });
  assert.equal(p(g, 'cb').alive, false);
  assert.equal(g.doubleAttackNight, 2);
  g = next(g);
  assert.equal(wolfPlan(g).minTargets, 2);
});

test('a conversion victim killed by a simultaneous bomb does not consume Alpha power', () => {
  let g = eligible({ a: 'mad_bomber', bb: 'big_bad_wolf' });
  g = dawn(g, { targets: ['a', 'b'], convert: 'b' });
  assert.equal(p(g, 'b').alive, false);
  assert.equal(p(g, 'b').role, 'villager');
  assert.equal(p(g, 'al').alphaUsed, false);
});

test('converting own lover recalculates allegiance without copying or removing lover links', () => {
  let g = make({ al: 'alpha_wolf', cu: 'cupid' });
  g = dawn(g, { targets: ['j'], pair: ['al', 'a'] });
  g = next(cmd(g, { type: 'verdict', target: 'w' }));
  assert.equal(p(g, 'al').team, 'lovers');
  g = dawn(g, { targets: ['a'], convert: 'a' });
  assert.equal(p(g, 'a').role, 'wolf');
  assert.equal(p(g, 'a').team, 'wolves');
  assert.equal(p(g, 'al').team, 'wolves');
  assert.equal(playerView(g, 'a').lover!.partnerId, 'al');
});
