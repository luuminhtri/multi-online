import test from 'node:test';
import assert from 'node:assert/strict';
import { actors, createGame, dispatch, livingNeighbors, RuleError, stepId } from '../src/engine/engine.ts';
import { playerView, publicView } from '../src/engine/views.ts';
import { ROLES } from '../src/engine/rules.ts';
import { biteChoices } from '../src/engine/wolf-pack.ts';
import { isWolf } from '../src/engine/role-policy.ts';
import type { Action, Command, Game, Role } from '../src/engine/types.ts';

function make(extra: Record<string, Role> = {}) {
  return createGame('expanded', Object.entries({ w: 'wolf', a: 'villager', b: 'villager', c: 'villager', e: 'villager', f: 'villager', ...extra } as Record<string, Role>)
    .map(([id, role]) => ({ id, name: id, role })));
}
function cmd(g: Game, command: Command, id?: string): Game {
  return dispatch(g, id ? { kind: 'player', playerId: id } : { kind: 'moderator' },
    { id: `x${g.revision}`, gameId: g.id, stepId: stepId(g), command });
}
function act(g: Game, id: string, action: Action) { return cmd(cmd(g, { type: 'wake' }, id), { type: 'act', action }, id); }
const p = (g: Game, id: string) => g.players.find(p => p.id === id)!;
const rejects = (fn: () => unknown, code: string) => assert.throws(fn, (e: unknown) => e instanceof RuleError && e.code === code);
interface Choices { bite?: string; poison?: string | null; heal?: boolean; protect?: string; actions?: Record<string, Action> }
function step(g: Game, choice: Choices = {}) {
  for (const id of actors(g)) {
    const targets = playerView(g, id).turn!.targets;
    const action: Action = choice.actions?.[id] ?? (g.step === 'guard' ? { type: 'protect', target: choice.protect ?? targets[0] }
      : ['seer', 'aura_seer', 'mystic_seer'].includes(g.step) ? { type: 'inspect', target: targets[0] }
      : g.step === 'mentalist' ? { type: 'compare', targets: [targets[0], targets[1]] }
      : g.step === 'wolves' ? { type: 'bite', target: choice.bite ?? 'a' }
      : g.step === 'doppelganger' ? { type: 'mimic', target: 's' }
      : g.step === 'cupid' ? { type: 'pair', targets: ['a', 'b'] }
      : { type: 'potion', heal: choice.heal ?? false, poison: choice.poison ?? null });
    g = act(g, id, action);
  }
  return cmd(g, { type: 'advance' });
}
function until(g: Game, target: string, choice: Choices = {}) {
  for (let i = 0; g.step !== target && i < 12; i++) g = step(g, choice);
  assert.equal(g.step, target);
  return g;
}
function night(g: Game, choice: Choices = {}) { return cmd(until(g, 'review', choice), { type: 'resolve' }); }
function dawn(g: Game, choice: Choices = {}) { return cmd(night(g, choice), { type: 'publish' }); }
function next(g: Game) { return cmd(cmd(g, { type: 'verdict', target: null }), { type: 'nextNight' }); }
function message(g: Game, id: string, type: string) { return playerView(g, id).messages.findLast(e => e.type === type); }

for (const [role, expected] of [['lycan', true], ['wolf_man', false], ['wolf', true], ['villager', false], ['cursed', false]] as const) {
  test(`seer perception of ${role} is ${expected}, independent of actual faction`, () => {
    const g = until(make({ s: 'seer', v: role }), 'wolves', { actions: { s: { type: 'inspect', target: 'v' } } });
    assert.equal(message(g, 's', 'inspection')?.data.isWolf, expected);
    assert.equal(p(g, 'v').team, isWolf(role) ? 'wolves' : 'village');
    assert.equal(message(g, 'a', 'inspection'), undefined);
    assert.ok(!JSON.stringify(publicView(g)).includes('inspection'));
  });
}
for (const [role, expected] of [['wolf', false], ['villager', false], ['lycan', true], ['wolf_man', true], ['prince', true]] as const) {
  test(`aura detects special ability of ${role}: ${expected}`, () => {
    const g = until(make({ au: 'aura_seer', v: role }), 'wolves', { actions: { au: { type: 'inspect', target: 'v' } } });
    assert.equal(message(g, 'au', 'aura-inspection')?.data.hasAbility, expected);
  });
}

test('mystic learns exact current role; own target and action retries are rejected safely', () => {
  let g = until(make({ m: 'mystic_seer', v: 'wolf_man' }), 'mystic_seer');
  const before = structuredClone(g);
  rejects(() => act(g, 'm', { type: 'inspect', target: 'm' }), 'SELF_TARGET');
  assert.deepEqual(g, before);
  g = act(g, 'm', { type: 'inspect', target: 'v' });
  assert.equal(message(g, 'm', 'mystic-inspection')?.data.role, 'wolf_man');
  rejects(() => act(g, 'm', { type: 'inspect', target: 'a' }), 'ACTION_ALREADY_CONFIRMED');
  assert.ok(!JSON.stringify(playerView(g, 'a')).includes('mystic-inspection'));
});

test('mentalist compares current lovers allegiance and validates two distinct other targets', () => {
  let g = until(make({ cu: 'cupid', m: 'mentalist' }), 'mentalist', { actions: { cu: { type: 'pair', targets: ['w', 'a'] } } });
  rejects(() => act(g, 'm', { type: 'compare', targets: ['a', 'a'] }), 'SELF_TARGET');
  rejects(() => act(g, 'm', { type: 'compare', targets: ['m', 'a'] }), 'SELF_TARGET');
  rejects(() => act(g, 'm', { type: 'compare', targets: ['absent', 'a'] }), 'INVALID_TARGET');
  g = act(g, 'm', { type: 'compare', targets: ['w', 'a'] });
  assert.equal(message(g, 'm', 'alignment-comparison')?.data.sameTeam, true);
  assert.equal(message(g, 'w', 'alignment-comparison'), undefined);
  const separate = until(make({ m: 'mentalist' }), 'wolves', { actions: { m: { type: 'compare', targets: ['w', 'a'] } } });
  assert.equal(message(separate, 'm', 'alignment-comparison')?.data.sameTeam, false);
});

test('wolf-man shares pack and consensus but cannot be bitten by any wolf', () => {
  let g = until(make({ wm: 'wolf_man' }), 'wolves');
  assert.deepEqual(actors(g), ['w', 'wm']);
  assert.deepEqual(playerView(g, 'wm').pack!.map(p => p.id), ['w', 'wm']);
  assert.ok(!playerView(g, 'w').turn!.targets.includes('wm'));
  rejects(() => act(g, 'w', { type: 'bite', target: 'wm' }), 'WOLF_TARGET');
  g = act(g, 'w', { type: 'bite', target: 'a' });
  g = act(g, 'wm', { type: 'bite', target: 'b' });
  rejects(() => cmd(g, { type: 'advance' }), 'WOLVES_DISAGREE');
  g = act(g, 'wm', { type: 'bite', target: 'a' });
  g = cmd(g, { type: 'advance' });
  assert.equal(g.biteTarget, 'a');
});

test('a wolf-man alone can start the game and survives normal-wolf elimination', () => {
  let g = createGame('wm', [{ id: 'wm', name: 'wm', role: 'wolf_man' }, { id: 'a', name: 'a', role: 'villager' }, { id: 'b', name: 'b', role: 'villager' }]);
  g = dawn(g, { bite: 'a' });
  assert.equal(g.winner, 'wolves');
  g = dawn(make({ wm: 'wolf_man' }));
  g = cmd(g, { type: 'verdict', target: 'w' });
  assert.equal(g.winner, null);
});

test('apprentice fills Seer vacancy on publication, not before', () => {
  let g = night(make({ s: 'seer', ap: 'apprentice_seer' }), { bite: 's' });
  assert.equal(playerView(g, 'ap').self.role, 'apprentice_seer');
  g = cmd(g, { type: 'publish' });
  assert.equal(playerView(g, 'ap').self.role, 'seer');
  g = next(g);
  g = until(g, 'seer');
  assert.deepEqual(actors(g), ['ap']);
  g = act(g, 'ap', { type: 'inspect', target: 'w' });
  assert.equal(message(g, 'ap', 'inspection')?.data.isWolf, true);
});

test('apprentice does not promote without a Seer death; mimic Seer takes precedence', () => {
  assert.equal(p(dawn(make({ ap: 'apprentice_seer' })), 'ap').role, 'apprentice_seer');
  let g = dawn(make({ s: 'seer', ap: 'apprentice_seer', d: 'doppelganger' }), { bite: 's' });
  assert.equal(p(g, 'd').role, 'seer');
  assert.equal(p(g, 'ap').role, 'apprentice_seer');
  g = cmd(g, { type: 'verdict', target: 'd' });
  assert.equal(p(g, 'ap').role, 'seer');
});

test('apprentice dying in the same night cannot promote', () => {
  const g = dawn(make({ s: 'seer', ap: 'apprentice_seer', t: 'witch' }), { bite: 's', poison: 'ap' });
  assert.equal(p(g, 'ap').role, 'apprentice_seer');
  assert.equal(p(g, 'ap').alive, false);
});

test('tough guy survives bite, then dies next night despite protection and healing', () => {
  let g = night(make({ tough: 'tough_guy', g: 'guard', t: 'witch' }), { bite: 'tough', protect: 'g' });
  assert.equal(p(g, 'tough').alive, true);
  assert.equal(p(g, 'tough').delayedDeathNight, null);
  g = cmd(g, { type: 'publish' });
  assert.equal(p(g, 'tough').delayedDeathNight, 2);
  assert.ok(!JSON.stringify(playerView(g, 'tough')).includes('delayedDeathNight'));
  g = next(g);
  const protectedAgain = dawn(g, { bite: 'tough', protect: 'tough' });
  assert.equal(p(protectedAgain, 'tough').alive, false);
  g = dawn(g, { bite: 'tough', protect: 't', heal: true });
  assert.equal(p(g, 'tough').alive, false);
  assert.deepEqual(g.events.findLast(e => e.type === 'death' && e.data.player === 'tough')?.data.causes, ['delayed-bite']);
});

test('blocking first tough-guy bite creates no wound; poison still kills immediately', () => {
  for (const heal of [true, false]) {
    const g = dawn(make({ tough: 'tough_guy', g: 'guard', t: 'witch' }), { bite: 'tough', protect: heal ? 'g' : 'tough', heal });
    assert.equal(p(g, 'tough').delayedDeathNight, null);
    assert.equal(p(g, 'tough').alive, true);
  }
  const g = dawn(make({ tough: 'tough_guy', t: 'witch' }), { bite: 'tough', poison: 'tough' });
  assert.equal(p(g, 'tough').alive, false);
  assert.equal(p(g, 'tough').delayedDeathNight, null);
});

test('diseased bite disables only next night; wolves resume afterwards', () => {
  let g = dawn(make({ sick: 'diseased', wm: 'wolf_man', t: 'witch' }), { bite: 'sick' });
  assert.equal(g.wolvesBlockedNight, 2);
  g = next(g); g = until(g, 'wolves');
  assert.deepEqual(actors(g), []);
  assert.equal(playerView(g, 'wm').wolvesBlocked, true);
  assert.equal(playerView(g, 'a').wolvesBlocked, null);
  rejects(() => act(g, 'w', { type: 'bite', target: 'a' }), 'NOT_YOUR_TURN');
  g = dawn(g);
  assert.equal(g.biteTarget, null);
  g = next(g); g = until(g, 'wolves');
  assert.deepEqual(actors(g), ['w', 'wm']);
});

test('poison, verdict or blocked bite on Diseased do not infect wolves', () => {
  const poisoned = dawn(make({ sick: 'diseased', t: 'witch' }), { bite: 'a', poison: 'sick' });
  assert.equal(poisoned.wolvesBlockedNight, null);
  const saved = dawn(make({ sick: 'diseased', g: 'guard' }), { bite: 'sick', protect: 'sick' });
  assert.equal(saved.wolvesBlockedNight, null);
  const voted = cmd(saved, { type: 'verdict', target: 'sick' });
  assert.equal(voted.wolvesBlockedNight, null);
});

test('Prince publicly reveals and survives verdict repeatedly; poison and heartbreak still kill', () => {
  let g = dawn(make({ pr: 'prince' }));
  g = cmd(g, { type: 'verdict', target: 'pr' });
  assert.equal(p(g, 'pr').alive, true);
  assert.equal(g.verdictDone, true);
  assert.equal(publicView(g).announcements.find(e => e.type === 'prince-revealed')?.data.role, 'prince');
  rejects(() => cmd(g, { type: 'verdict', target: 'pr' }), 'WRONG_PHASE');
  g = dawn(cmd(g, { type: 'nextNight' }), { bite: 'b' });
  g = cmd(g, { type: 'verdict', target: 'pr' });
  assert.equal(p(g, 'pr').alive, true);
  assert.equal(p(dawn(make({ pr: 'prince', t: 'witch' }), { poison: 'pr' }), 'pr').alive, false);
  const loved = dawn(make({ pr: 'prince', cu: 'cupid' }), { bite: 'a', actions: { cu: { type: 'pair', targets: ['a', 'pr'] } } });
  assert.equal(p(loved, 'pr').alive, false);
});

test('bomber uses nearest surviving circular seats and excludes already eliminated seats', () => {
  const roles: Role[] = ['wolf', 'villager', 'mad_bomber', 'villager', 'villager', 'villager', 'villager'];
  let g = createGame('seats', roles.map((role, i) => ({ id: String(i), name: String(i), role })));
  assert.deepEqual(livingNeighbors(g, '2'), ['1', '3']);
  g = dawn(g, { bite: '1' });
  g = cmd(g, { type: 'verdict', target: '2' });
  assert.equal(p(g, '0').alive, false); // previous living neighbor, wraps past dead 1
  assert.equal(p(g, '3').alive, false);
  assert.equal(g.winner, 'village');
  assert.equal(g.events.filter(e => e.type === 'bomb-exploded').length, 1);
  assert.ok(!JSON.stringify(publicView(g)).includes('explosion'));
});

test('bomb cascades into lover death and hunter reaction before checking winner', () => {
  // Circular order: w, h, bomb, a, b, c, cupid. Bomb kills h and a, then a kills b.
  let g = createGame('chain', [
    ['w', 'wolf'], ['h', 'hunter'], ['bomb', 'mad_bomber'], ['a', 'villager'],
    ['b', 'villager'], ['c', 'villager'], ['cu', 'cupid'],
  ].map(([id, role]) => ({ id, name: id, role: role as Role })));
  g = dawn(g, { bite: 'bomb' });
  assert.deepEqual(new Set(g.publicDead), new Set(['bomb', 'h', 'a', 'b']));
  assert.equal(g.activeHunterId, 'h');
  assert.equal(g.winner, null);
  g = cmd(act(g, 'h', { type: 'shoot', target: 'w' }), { type: 'advance' });
  assert.equal(g.winner, 'village');
});

test('mimic inherits new role after bomber secondary death and joins correct next-night ability', () => {
  let g = createGame('inherit-bomb', [
    ['w', 'wolf'], ['a', 'villager'], ['bomb', 'mad_bomber'], ['m', 'mystic_seer'],
    ['b', 'villager'], ['d', 'doppelganger'], ['e', 'villager'],
  ].map(([id, role]) => ({ id, name: id, role: role as Role })));
  g = dawn(g, { bite: 'bomb', actions: { d: { type: 'mimic', target: 'm' } } });
  assert.equal(p(g, 'd').role, 'mystic_seer');
  assert.equal(p(g, 'd').alive, true);
  g = next(g); g = until(g, 'mystic_seer');
  assert.deepEqual(actors(g), ['d']);
});

test('all 27 runtime roles complete 100 seeded games with automatic death chains and no leaked night secrets', () => {
  for (let seed = 1; seed <= 100; seed++) {
    let rand = seed;
    const pick = <T>(xs: T[]) => { assert.ok(xs.length, `seed ${seed}: empty choice`); rand = (Math.imul(rand, 1664525) + 1013904223) >>> 0; return xs[rand % xs.length]; };
    const roster = (Object.keys(ROLES) as Role[]).map((role, i) => ({ id: `p${i}`, name: `n${i}`, role }));
    // Shuffle seating as well as actions; bomber must not depend on role ordering.
    for (let i = roster.length - 1; i > 0; i--) { const j = pick(Array.from({ length: i + 1 }, (_, k) => k)); [roster[i], roster[j]] = [roster[j], roster[i]]; }
    let g = createGame(`seed-${seed}`, roster);
    for (let n = 0; g.step !== 'ended' && n < 800; n++) {
      const input = g, before = structuredClone(g);
      const privateBefore = new Map(g.players.map(p => [p.id, playerView(g, p.id)]));
      let id: string | undefined;
      let command: Command;
      if (g.step === 'review') command = { type: g.resolved ? 'publish' : 'resolve' };
      else if (g.step === 'day') command = g.verdictDone ? { type: 'nextNight' }
        : { type: 'verdict', target: pick(g.players.filter(p => p.alive)).id };
      else {
        const cub = g.step === 'wolves' && seed % 4 === 0 && !Object.keys(g.actions).length && !g.sacrificedCubId ? actors(g).find(id => p(g, id).role === 'wolf_cub') : undefined;
        id = cub ?? actors(g).find(id => !Object.hasOwn(g.actions, id));
        if (!id) command = { type: 'advance' };
        else if (!g.awake.includes(id)) command = { type: 'wake' };
        else {
          const v = playerView(g, id), ts = v.turn!.targets;
          const bite = Object.values(g.actions).map(biteChoices).find(a => a !== null);
          const pair = () => { const first = pick(ts); return [first, pick(ts.filter(t => t !== first))] as [string, string]; };
          const useHeal = g.step === 'witch' && v.self.resources.heal > 0 && v.biteTargets.length > 0 && pick([true, false]);
          const healTarget = useHeal ? pick(v.biteTargets) : undefined;
          const action: Action = g.step === 'dire_wolf' || g.step === 'virginia_woolf' ? { type: 'bond', target: pick(ts) } : g.step === 'cupid' ? { type: 'pair', targets: pair() }
            : g.step === 'doppelganger' ? { type: 'mimic', target: pick(ts) }
            : g.step === 'guard' ? { type: 'protect', target: pick(ts) }
            : ['seer', 'aura_seer', 'mystic_seer'].includes(g.step) ? { type: 'inspect', target: pick(ts) }
            : g.step === 'mentalist' ? { type: 'compare', targets: pair() }
            : g.step === 'wolves' ? v.turn!.wolfPlan!.maxTargets === 0 ? { type: 'fast' } : v.turn!.wolfPlan!.canOfferSacrifice && seed % 4 === 0 ? { type: 'sacrifice', target: id } : v.turn!.wolfPlan!.sacrificeTarget ? { type: 'sacrifice', target: v.turn!.wolfPlan!.sacrificeTarget } : bite ? { type: 'maul', targets: bite } : v.turn!.wolfPlan!.minTargets > 1 ? { type: 'maul', targets: pair() } : { type: 'bite', target: pick(ts) }
            : g.step === 'alpha_wolf' ? { type: 'convert', target: pick([null, ...ts]) }
            : g.step === 'hunter' ? { type: 'shoot', target: pick(ts) }
            : { type: 'potion', heal: useHeal, ...(healTarget ? { healTarget } : {}), poison: v.self.resources.poison > 0 && pick([true, false]) ? pick(ts) : null };
          command = { type: 'act', action };
        }
      }
      const who = id ? { kind: 'player' as const, playerId: id } : { kind: 'moderator' as const };
      const request = { id: `r${n}`, gameId: g.id, stepId: stepId(g), command };
      g = dispatch(g, who, request);
      assert.deepEqual(input, before);
      assert.deepEqual(dispatch(g, who, request), g);
      assert.equal(g.publicDead.length, new Set(g.publicDead).size);
      assert.ok(g.publicDead.every(id => !p(g, id).alive));
      for (const event of publicView(g).announcements) {
        assert.ok(!('causes' in event.data));
        assert.ok(!['bomb-exploded', 'aura-inspection', 'mystic-inspection', 'alignment-comparison', 'bite-delayed', 'wolves-infected'].includes(event.type));
      }
      if (command.type === 'resolve') {
        assert.deepEqual(publicView(g), publicView(before));
        for (const player of g.players) assert.deepEqual(playerView(g, player.id), privateBefore.get(player.id));
      }
      for (const player of g.players) assert.ok(Object.values(player.resources).every(n => n >= 0));
    }
    assert.equal(g.step, 'ended', `seed ${seed}: no termination`);
  }
});
