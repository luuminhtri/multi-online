import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, withdrawPlayer, actors, dispatch, stepId } from '../src/engine/engine.ts';
import type { Role } from '../src/engine/types.ts';
const game = (role: Role) => createGame('withdraw', [
  { id: 'w', name: 'Wolf', role: 'wolf' }, { id: 'quit', name: 'Quitter', role },
  { id: 'v1', name: 'V1', role: 'villager' }, { id: 'v2', name: 'V2', role: 'villager' },
  { id: 'v3', name: 'V3', role: 'villager' }, { id: 'v4', name: 'V4', role: 'villager' },
  { id: 'dp', name: 'Doppelganger', role: 'doppelganger' },
]);
for (const role of ['mad_bomber', 'hunter', 'wolf_cub', 'seer'] as Role[]) {
  test(`withdraw ${role}: only requested player leaves, no death abilities or inheritance`, () => {
    const g = game(role); g.lovers = ['quit', 'v1'];
    g.players.find(p => p.id === 'dp')!.doppelgangerTarget = 'quit';
    const before = structuredClone(g);
    const left = withdrawPlayer(g, 'quit');
    assert.deepEqual(left.players.filter(p => !p.alive).map(p => p.id), ['quit']);
    assert.equal(left.players.find(p => p.id === 'dp')!.role, 'doppelganger');
    assert.equal(left.lovers, null); assert.equal(left.doubleAttackNight, null);
    assert.equal(left.wolfDeathOccurred, false); assert.deepEqual(left.pendingHunters, []);
    assert.equal(left.events.some(e => ['death', 'explosion', 'hunter-shot', 'doppelganger-inherited'].includes(e.type)), false);
    assert.deepEqual(g, before);
  });
}
test('departed actor no longer blocks the step, and departure rechecks winner', () => {
  const g = game('guard'); g.step = 'guard';
  const left = withdrawPlayer(g, 'quit');
  assert.deepEqual(actors(left), []);
  const advanced = dispatch(left, { kind: 'moderator' }, { id: 'advance', gameId: left.id, stepId: stepId(left), command: { type: 'advance' } });
  assert.equal(advanced.step, 'seer');
  const lastWolf = withdrawPlayer(left, 'w'); assert.equal(lastWolf.winner, 'village');
});
test('night deaths remain unpublished when a separate player withdraws after resolve', () => {
  const g = game('villager'); g.step = 'review'; g.resolved = true;
  g.players.find(p => p.id === 'v1')!.alive = false; g.pendingDeaths = ['v1'];
  const left = withdrawPlayer(g, 'quit');
  assert.deepEqual(left.publicDead, ['quit']); assert.deepEqual(left.pendingDeaths, ['v1']); assert.equal(left.winner, null);
});
test('a Hunter who leaves during their queued shot is skipped without shooting', () => {
  const g = game('hunter'); g.players.find(p => p.id === 'quit')!.alive = false;
  g.publicDead = ['quit']; g.step = 'hunter'; g.activeHunterId = 'quit';
  const left = withdrawPlayer(g, 'quit');
  assert.equal(left.activeHunterId, null); assert.equal(left.step, 'day');
  assert.equal(left.players.find(p => p.id === 'v1')!.alive, true);
});
test('withdrawal resets pending wolf consensus and stale Hunter targets, preserves prior inspection knowledge', () => {
  const g = game('hunter'); g.step = 'wolves'; g.actions.w = { type: 'bite', target: 'v1' };
  const left = withdrawPlayer(g, 'v1'); assert.deepEqual(left.actions, {});
  const h = game('hunter'); h.step = 'hunter'; h.activeHunterId = 'quit'; h.actions.quit = { type: 'shoot', target: 'v1' };
  const next = withdrawPlayer(h, 'v1'); assert.equal(Object.hasOwn(next.actions, 'quit'), false); assert.equal(next.activeHunterId, 'quit');
  const s = game('seer'); s.step = 'seer'; s.actions.quit = { type: 'inspect', target: 'v1' };
  s.events.push({ id: 1, night: 1, type: 'inspection', audience: 'private', recipient: 'quit', data: { target: 'v1', isWolf: false } });
  const informed = withdrawPlayer(s, 'v1'); assert.deepEqual(informed.actions.quit, s.actions.quit); assert.deepEqual(informed.events[0], s.events[0]);
});
