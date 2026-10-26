import test from 'node:test';
import assert from 'node:assert/strict';
import { actors, createGame, dispatch, RuleError, stepId } from '../src/engine/engine.ts';
import { playerView, publicView } from '../src/engine/views.ts';
import type { Action, Command, Game, Role } from '../src/engine/types.ts';

const mod = { kind: 'moderator' } as const;
function cmd(g: Game, command: Command, playerId?: string): Game {
  return dispatch(g, playerId ? { kind: 'player', playerId } : mod,
    { id: `t${g.revision}`, gameId: g.id, stepId: stepId(g), command });
}
function act(g: Game, id: string, action: Action): Game {
  return cmd(cmd(g, { type: 'wake' }, id), { type: 'act', action }, id);
}
function game(extra: Record<string, Role> = {}) {
  const roles: Record<string, Role> = { w: 'wolf', a: 'villager', b: 'villager', z: 'villager', ...extra };
  return createGame('interactions', Object.entries(roles).map(([id, role]) => ({ id, name: id, role })), { witchSeesBite: true, skipVoteDays: 30 });
}
function pair(g: Game, x: string, y: string): Game {
  return cmd(act(g, 'c', { type: 'pair', targets: [x, y] }), { type: 'advance' });
}
function mimic(g: Game, target: string): Game {
  return cmd(act(g, 'd', { type: 'mimic', target }), { type: 'advance' });
}
function night(g: Game, bite: string, poison: string | null = null, protect?: string, heal = false): Game {
  while (g.step !== 'review') {
    for (const id of actors(g)) {
      const action: Action = g.step === 'guard' ? { type: 'protect', target: protect ?? id }
        : g.step === 'seer' ? { type: 'inspect', target: 'w' }
        : g.step === 'wolves' ? { type: 'bite', target: bite }
        : { type: 'potion', heal, poison };
      g = act(g, id, action);
    }
    g = cmd(g, { type: 'advance' });
  }
  return cmd(g, { type: 'resolve' });
}
function dawn(g: Game, bite = 'z') { return cmd(night(g, bite), { type: 'publish' }); }
const p = (g: Game, id: string) => g.players.find(p => p.id === id)!;
const rejects = (fn: () => unknown, code: string) => assert.throws(fn, (e: unknown) => e instanceof RuleError && e.code === code);
function assertPrivateCauses(g: Game) {
  for (const e of publicView(g).announcements) {
    assert.ok(!('causes' in e.data), JSON.stringify(e));
    assert.ok(!['hunter-shot', 'lovers-chosen', 'doppelganger-inherited', 'cursed-transformed'].includes(e.type));
  }
}

test('shot and heartbreak publish deaths without exposing cause, roles or partner link', () => {
  let g = dawn(pair(game({ c: 'cupid', h: 'hunter' }), 'a', 'b'), 'h');
  assert.equal(publicView(g).phase, 'day');
  g = cmd(act(g, 'h', { type: 'shoot', target: 'a' }), { type: 'advance' });
  assert.equal(p(g, 'b').alive, false);
  assertPrivateCauses(g);
  assert.equal(g.events.find(e => e.type === 'death' && e.data.player === 'b')!.audience, 'moderator');
});

test('verdict heartbreak triggers inheritance for the secondary victim', () => {
  let g = dawn(mimic(pair(game({ c: 'cupid', d: 'doppelganger', s: 'seer' }), 'a', 's'), 's'));
  g = cmd(g, { type: 'verdict', target: 'a' });
  assert.equal(p(g, 's').alive, false);
  assert.equal(p(g, 'd').role, 'seer');
  assertPrivateCauses(g);
});

test('shot heartbreak triggers inheritance for the secondary victim', () => {
  let g = dawn(mimic(pair(game({ c: 'cupid', d: 'doppelganger', s: 'seer', h: 'hunter' }), 'a', 's'), 's'), 'h');
  g = cmd(act(g, 'h', { type: 'shoot', target: 'a' }), { type: 'advance' });
  assert.equal(p(g, 'd').role, 'seer');
});

test('night inheritance stays hidden until morning publication', () => {
  let g = mimic(game({ d: 'doppelganger', s: 'seer' }), 's');
  const before = playerView(g, 'd');
  g = night(g, 's');
  assert.equal(playerView(g, 'd').self.role, before.self.role);
  assert.deepEqual(playerView(g, 'd').messages, before.messages);
  g = cmd(g, { type: 'publish' });
  assert.equal(playerView(g, 'd').self.role, 'seer');
});

test('cursed transformation and pack membership stay hidden until publication', () => {
  let g = game({ u: 'cursed', s: 'seer' });
  g = night(g, 'u');
  assert.equal(playerView(g, 'u').self.role, 'cursed');
  assert.deepEqual(playerView(g, 'w').pack!.map(p => p.id), ['w']);
  g = cmd(g, { type: 'publish' });
  assert.equal(p(g, 'u').role, 'wolf');
  assert.deepEqual(playerView(g, 'w').pack!.map(p => p.id), ['w', 'u']);
});

test('mixed lover wolf remains in pack, is seen as wolf and cannot be bitten by pack', () => {
  let g = pair(game({ c: 'cupid', w2: 'wolf', s: 'seer' }), 'w', 'a');
  g = cmd(g, { type: 'advance' }); // guard absent
  g = act(g, 's', { type: 'inspect', target: 'w' });
  assert.equal(playerView(g, 's').messages.at(-1)!.data.isWolf, true);
  g = cmd(g, { type: 'advance' });
  assert.deepEqual(playerView(g, 'w').pack!.map(p => p.id), ['w', 'w2']);
  for (const id of actors(g)) {
    assert.ok(!playerView(g, id).turn!.targets.includes('w'));
    rejects(() => act(g, id, { type: 'bite', target: 'w' }), 'WOLF_TARGET');
  }
});

test('pure wolves need parity against all opponents, including a lover wolf', () => {
  let g = dawn(pair(game({ c: 'cupid', w2: 'wolf', w3: 'wolf' }), 'w', 'a'));
  // Living: lover wolf w, lover a, pure wolves w2/w3, villagers b/c.
  g = cmd(g, { type: 'verdict', target: 'b' });
  assert.equal(g.winner, null); // 2 pure wolves vs 3 opponents
  g = cmd(g, { type: 'nextNight' });
  g = dawn(g, 'c');
  assert.equal(g.winner, 'wolves'); // 2 pure wolves vs 2 opponents
});

test('inheriting transformed cursed copies current wolf role, not original cursed role', () => {
  let g = mimic(game({ u: 'cursed', d: 'doppelganger', s: 'seer' }), 'u');
  g = dawn(g, 'u');
  g = cmd(g, { type: 'verdict', target: 'u' });
  assert.equal(p(g, 'd').role, 'wolf');
  assert.equal(p(g, 'd').team, 'wolves');
});

test('inheritance preserves own lover allegiance, not the deceased lover allegiance', () => {
  let g = mimic(pair(game({ c: 'cupid', d: 'doppelganger', s: 'seer' }), 'd', 'w'), 's');
  g = dawn(g, 's');
  assert.equal(p(g, 'd').role, 'seer');
  assert.equal(p(g, 'd').team, 'lovers');
  assert.equal(p(g, 'w').team, 'lovers');
});

test('cursed conversion recalculates lovers allegiance when both become wolves', () => {
  let g = pair(game({ c: 'cupid', u: 'cursed', s: 'seer' }), 'w', 'u');
  g = dawn(g, 'u');
  assert.equal(p(g, 'u').role, 'wolf');
  assert.equal(p(g, 'w').team, 'wolves');
  assert.equal(p(g, 'u').team, 'wolves');
});

test('simultaneous lover deaths kill each once; a dead mimic never inherits', () => {
  let g = mimic(pair(game({ c: 'cupid', d: 'doppelganger', h: 'witch' }), 'd', 'a'), 'a');
  g = night(g, 'a', 'd');
  assert.deepEqual(new Set(g.pendingDeaths), new Set(['a', 'd']));
  g = cmd(g, { type: 'publish' });
  assert.equal(p(g, 'd').role, 'doppelganger');
  assert.equal(g.events.filter(e => e.type === 'death' && e.data.player === 'd').length, 1);
});

test('hunter inheritance permits chained shots; winner waits for last shot and retries do not repeat kills', () => {
  let g = dawn(mimic(game({ h: 'hunter', d: 'doppelganger' }), 'h'), 'h');
  assert.equal(p(g, 'd').role, 'hunter');
  g = cmd(act(g, 'h', { type: 'shoot', target: 'd' }), { type: 'advance' });
  assert.equal(g.activeHunterId, 'd');
  assert.equal(g.winner, null);
  rejects(() => cmd(g, { type: 'verdict', target: 'w' }), 'WRONG_PHASE');
  g = act(g, 'd', { type: 'shoot', target: 'w' });
  const request = { id: 'last-shot', gameId: g.id, stepId: stepId(g), command: { type: 'advance' } as Command };
  g = dispatch(g, mod, request);
  assert.equal(g.winner, 'village');
  assert.equal(p(g, 'd').resources.hunterShot, 0);
  assert.deepEqual(dispatch(g, mod, request), g);
  assertPrivateCauses(g);
});

test('a simultaneous final batch with no legal hunter target finishes as a draw', () => {
  let g = createGame('draw', [
    { id: 'w', name: 'w', role: 'wolf' }, { id: 'c', name: 'c', role: 'cupid' },
    { id: 'h', name: 'h', role: 'hunter' }, { id: 'd', name: 'd', role: 'doppelganger' },
    { id: 't', name: 't', role: 'witch' },
  ], { witchSeesBite: true, skipVoteDays: 30 });
  g = mimic(pair(g, 'd', 't'), 'h');
  g = dawn(g, 'h');
  g = cmd(act(g, 'h', { type: 'shoot', target: 'c' }), { type: 'advance' });
  g = cmd(g, { type: 'verdict', target: null });
  g = cmd(g, { type: 'nextNight' });
  // Witch poisons the wolf as the bite kills her and her hunter lover.
  g = cmd(night(g, 't', 'w'), { type: 'publish' });
  assert.equal(g.winner, 'draw');
  assert.equal(g.step, 'ended');
  assert.equal(g.activeHunterId, null);
  assert.deepEqual(g.pendingHunters, []);
  assert.equal(g.players.filter(p => p.alive).length, 0);
});

test('protection and healing prevent cursed conversion; simultaneous poison kills normally', () => {
  for (const protect of [false, true]) for (const heal of [false, true]) for (const poison of [null, 'u']) {
    let g = game({ u: 'cursed', t: 'witch', g: 'guard' });
    if (protect && heal) { rejects(() => night(g, 'u', poison, 'u', heal), 'NO_HEAL_AVAILABLE'); continue; }
    g = cmd(night(g, 'u', poison, protect ? 'u' : 'g', heal), { type: 'publish' });
    assert.equal(p(g, 'u').alive, poison === null);
    assert.equal(p(g, 'u').role, !protect && !heal && !poison ? 'wolf' : 'cursed');
    assert.equal(g.events.filter(e => e.type === 'cursed-transformed').length, !protect && !heal && !poison ? 1 : 0);
  }
});

test('mimic copies remaining witch potions and cannot replenish or reuse them', () => {
  let g = mimic(game({ t: 'witch', d: 'doppelganger' }), 't');
  g = cmd(night(g, 't', 'a'), { type: 'publish' });
  assert.equal(p(g, 'd').role, 'witch');
  assert.deepEqual(p(g, 'd').resources, { heal: 1, poison: 0, hunterShot: 0 });
  g = cmd(g, { type: 'verdict', target: null });
  g = cmd(g, { type: 'nextNight' });
  g = cmd(g, { type: 'advance' }); g = cmd(g, { type: 'advance' });
  g = cmd(act(g, 'w', { type: 'bite', target: 'b' }), { type: 'advance' });
  rejects(() => act(g, 'd', { type: 'potion', heal: false, poison: 'w' }), 'NO_POISON_AVAILABLE');
  g = cmd(act(g, 'd', { type: 'potion', heal: true, poison: null }), { type: 'advance' });
  g = cmd(cmd(g, { type: 'resolve' }), { type: 'publish' });
  assert.equal(p(g, 'b').alive, true);
  assert.equal(p(g, 'd').resources.heal, 0);
});

test('inherited guard carries last protection cooldown into the next night', () => {
  let g = mimic(game({ g: 'guard', d: 'doppelganger' }), 'g');
  g = cmd(night(g, 'g', null, 'a'), { type: 'publish' });
  assert.equal(p(g, 'd').role, 'guard');
  g = cmd(g, { type: 'verdict', target: null }); g = cmd(g, { type: 'nextNight' });
  rejects(() => act(g, 'd', { type: 'protect', target: 'a' }), 'REPEATED_PROTECTION');
  assert.ok(!playerView(g, 'd').turn!.targets.includes('a'));
});

test('a dead actor cannot act again; invalid commands leave the input unchanged', () => {
  const g = dawn(game({ h: 'hunter' }), 'h');
  const before = structuredClone(g);
  rejects(() => cmd(g, { type: 'nextNight' }), 'VERDICT_REQUIRED');
  rejects(() => act(g, 'a', { type: 'shoot', target: 'w' }), 'NOT_YOUR_TURN');
  rejects(() => act(g, 'h', { type: 'shoot', target: 'h' }), 'SELF_TARGET');
  assert.deepEqual(g, before);
  let done = cmd(act(g, 'h', { type: 'shoot', target: 'w' }), { type: 'advance' });
  rejects(() => act(done, 'h', { type: 'shoot', target: 'a' }), 'NOT_YOUR_TURN');
});

// Seeded full games exercise the real command protocol, not hand-mutated states.
// The fixed seed makes any failing game replayable.
test('100 seeded full games preserve state, privacy, retries and termination invariants', () => {
  for (let seed = 1; seed <= 100; seed++) {
    let value = seed;
    const pick = <T>(items: T[]): T => {
      assert.ok(items.length > 0, `seed ${seed}: no legal target`);
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return items[value % items.length];
    };
    let g = game({ w2: 'wolf', c: 'cupid', d: 'doppelganger', h: 'hunter', t: 'witch', s: 'seer', u: 'cursed', g: 'guard' });
    for (let count = 0; g.step !== 'ended' && count < 600; count++) {
      const before = structuredClone(g);
      let command: Command;
      let id: string | undefined;
      if (g.step === 'review') command = { type: g.resolved ? 'publish' : 'resolve' };
      else if (g.step === 'day') command = g.verdictDone ? { type: 'nextNight' }
        : { type: 'verdict', target: pick(g.players.filter(p => p.alive)).id };
      else {
        id = actors(g).find(id => !Object.hasOwn(g.actions, id));
        if (!id) command = { type: 'advance' };
        else if (!g.awake.includes(id)) command = { type: 'wake' };
        else {
          const v = playerView(g, id), targets = v.turn!.targets;
          const otherChoice = Object.values(g.actions).find(a => a.type === 'bite');
          const action: Action = g.step === 'cupid' ? { type: 'pair', targets: [pick(targets), pick(targets)] }
            : g.step === 'doppelganger' ? { type: 'mimic', target: pick(targets) }
            : g.step === 'guard' ? { type: 'protect', target: pick(targets) }
            : g.step === 'seer' ? { type: 'inspect', target: pick(targets) }
            : g.step === 'wolves' ? { type: 'bite', target: otherChoice?.type === 'bite' ? otherChoice.target : pick(targets) }
            : g.step === 'hunter' ? { type: 'shoot', target: pick(targets) }
            : { type: 'potion', heal: v.self.resources.heal > 0 && !!v.biteTarget && pick([true, false]),
                poison: v.self.resources.poison > 0 && pick([true, false]) ? pick(targets) : null };
          if (action.type === 'pair' && action.targets[0] === action.targets[1]) {
            action.targets[1] = pick(targets.filter(t => t !== action.targets[0]));
          }
          command = { type: 'act', action };
        }
      }
      const who = id ? { kind: 'player' as const, playerId: id } : mod;
      const request = { id: `seed-${seed}-${count}`, gameId: g.id, stepId: stepId(g), command };
      const input = g;
      g = dispatch(g, who, request);
      assert.deepEqual(input, before);
      assert.equal(g.revision, before.revision + 1);
      assert.deepEqual(dispatch(g, who, request), g);
      assert.equal(g.publicDead.length, new Set(g.publicDead).size);
      assert.ok(g.publicDead.every(id => !p(g, id).alive));
      assertPrivateCauses(g);
      for (const player of g.players) {
        assert.ok(Object.values(player.resources).every(n => n >= 0));
        if (player.team === 'wolves') assert.equal(player.role, 'wolf');
        assert.equal(playerView(g, player.id).self.role, player.role);
      }
      if (g.step === 'review') assert.equal(g.winner, null);
    }
    assert.equal(g.step, 'ended', `seed ${seed}: did not finish`);
    assert.ok(g.winner);
  }
});

test('same-side wolf lovers keep normal wolf allegiance and cannot bite one another', () => {
  let g = pair(game({ c: 'cupid', w2: 'wolf' }), 'w', 'w2');
  assert.equal(p(g, 'w').team, 'wolves');
  assert.equal(p(g, 'w2').team, 'wolves');
  g = cmd(cmd(g, { type: 'advance' }), { type: 'advance' });
  rejects(() => act(g, 'w', { type: 'bite', target: 'w2' }), 'WOLF_TARGET');
  assert.equal(playerView(g, 'a').lover, null);
  assert.equal(playerView(g, 'a').pack, null);
});

test('a hunter eliminated in daytime reacts once before the winner is evaluated', () => {
  let g = dawn(game({ h: 'hunter' }));
  g = cmd(g, { type: 'verdict', target: 'h' });
  assert.equal(g.activeHunterId, 'h');
  assert.equal(g.verdictDone, true);
  assert.equal(g.winner, null);
  g = cmd(act(g, 'h', { type: 'shoot', target: 'w' }), { type: 'advance' });
  assert.equal(g.winner, 'village');
  assert.equal(g.events.filter(e => e.type === 'hunter-shot').length, 1);
  assertPrivateCauses(g);
});

test('v4 snapshots are rejected and failures do not change the input', () => {
  const g = game();
  g.rulesVersion = 'classic-core-v4';
  const before = structuredClone(g);
  rejects(() => cmd(g, { type: 'advance' }), 'UNSUPPORTED_RULES_VERSION');
  assert.deepEqual(g, before);
});
