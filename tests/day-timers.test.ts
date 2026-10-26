import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, dispatch, stepId, RuleError } from '../src/engine/engine.ts';
import { playerView, publicView } from '../src/engine/views.ts';
import type { Action, Command, Game, Role } from '../src/engine/types.ts';

const NOW = 1_770_000_000_000;
const rejects = (fn: () => unknown, code: string) => assert.throws(fn, (e: unknown) => e instanceof RuleError && e.code === code);

const roster: { id: string; name: string; role: Role }[] = [
  { id: 'w', name: 'W', role: 'wolf' }, { id: 'g', name: 'G', role: 'guard' },
  { id: 's', name: 'S', role: 'seer' }, { id: 'v1', name: 'V1', role: 'villager' },
  { id: 'v2', name: 'V2', role: 'villager' },
];

function step(g: Game, command: Command, actor?: string, now = NOW) {
  return dispatch(g, actor ? { kind: 'player', playerId: actor } : { kind: 'moderator' }, { id: `r${g.revision}`, gameId: g.id, stepId: stepId(g), command }, now);
}
function act(g: Game, actor: string, action: Action) { return step(step(g, { type: 'wake' }, actor), { type: 'act', action }, actor); }

function toDay(settings?: Parameters<typeof createGame>[2]): Game {
  let g = createGame('day', roster, settings);
  g = act(g, 'g', { type: 'protect', target: 'g' });
  g = step(g, { type: 'advance' });
  g = act(g, 's', { type: 'inspect', target: 'w' });
  g = step(g, { type: 'advance' });
  g = act(g, 'w', { type: 'bite', target: 'v1' });
  g = step(g, { type: 'advance' });
  g = step(g, { type: 'advance' });
  g = step(g, { type: 'resolve' });
  return step(g, { type: 'publish' });
}

test('morning opens with an idle discussion clock and the configured durations', () => {
  const g = toDay();
  assert.equal(g.step, 'day');
  assert.equal(g.dayPhase, 'discussion');
  assert.equal(g.dayPhaseEndsAt, null);
  assert.deepEqual(g.settings!.dayTimers, { discussion: 300, nomination: 15, defense: 30, finalvote: 15 });
  assert.equal(g.settings!.skipVoteDays, 0);
  const v = playerView(g, 'v2');
  assert.equal(v.dayPhase, 'discussion');
  assert.equal(v.dayEndsAt, null);
  const pv = publicView(g);
  assert.equal(pv.dayPhase, 'discussion');
  assert.equal(pv.dayEndsAt, null);
});

test('custom durations merge over defaults and invalid values are refused', () => {
  const merged = createGame('m', roster, { witchSeesBite: true, dayTimers: { discussion: 60, finalvote: 20 } });
  assert.deepEqual(merged.settings!.dayTimers, { discussion: 60, nomination: 15, defense: 30, finalvote: 20 });
  assert.equal(merged.settings!.skipVoteDays, 0);
  for (const bad of [{ discussion: 4 }, { nomination: 3601 }, { defense: 10.5 }, { weird: 5 }]) {
    rejects(() => createGame('bad', roster, { witchSeesBite: true, dayTimers: bad as never }), 'INVALID_SETTINGS');
  }
});

test('moderator starts each clock on server time and walks the phases in order', () => {
  let g = toDay();
  g = step(g, { type: 'dayPhase', action: 'start' });
  assert.equal(g.dayPhaseEndsAt, NOW + 300_000);
  g = step(g, { type: 'dayPhase', action: 'start' }, undefined, NOW + 5_000); // restart allowed
  assert.equal(g.dayPhaseEndsAt, NOW + 305_000);
  g = step(g, { type: 'dayPhase', action: 'next' });
  assert.equal(g.dayPhase, 'nomination');
  assert.equal(g.dayPhaseEndsAt, null);
  g = step(g, { type: 'dayPhase', action: 'start' }, undefined, NOW + 10_000);
  assert.equal(g.dayPhaseEndsAt, NOW + 25_000);
  g = step(g, { type: 'dayPhase', action: 'next' });
  g = step(g, { type: 'dayPhase', action: 'next' });
  assert.equal(g.dayPhase, 'finalvote');
  g = step(g, { type: 'dayPhase', action: 'next' });
  assert.equal(g.dayPhase, null);
  rejects(() => step(g, { type: 'dayPhase', action: 'next' }), 'DAY_PHASE_DONE');
  rejects(() => step(g, { type: 'dayPhase', action: 'start' }), 'DAY_PHASE_DONE');
});

test('the verdict stays manual and the next morning resets the clocks', () => {
  let g = toDay({ witchSeesBite: true, skipVoteDays: 2 });
  g = step(g, { type: 'dayPhase', action: 'start' });
  g = step(g, { type: 'verdict', target: null }); // phases do not gate the verdict
  assert.equal(g.verdictDone, true);
  g = step(g, { type: 'nextNight' });
  g = act(g, 'g', { type: 'protect', target: 's' });
  g = step(g, { type: 'advance' });
  g = act(g, 's', { type: 'inspect', target: 'v2' });
  g = step(g, { type: 'advance' });
  g = act(g, 'w', { type: 'bite', target: 'v2' });
  g = step(g, { type: 'advance' });
  g = step(g, { type: 'advance' });
  g = step(g, { type: 'resolve' });
  g = step(g, { type: 'publish' }, undefined, NOW + 600_000);
  assert.equal(g.night, 2);
  assert.equal(g.dayPhase, 'discussion');
  assert.equal(g.dayPhaseEndsAt, null);
});

test('day clocks are v11-only and moderator-only', () => {
  const g = toDay();
  const legacy = structuredClone(g);
  legacy.rulesVersion = 'classic-core-v10';
  legacy.schemaVersion = 5;
  delete (legacy as { dayPhase?: unknown }).dayPhase;
  delete (legacy as { dayPhaseEndsAt?: unknown }).dayPhaseEndsAt;
  rejects(() => step(legacy, { type: 'dayPhase', action: 'start' }), 'DAY_PHASE_UNAVAILABLE');
  rejects(() => dispatch(g, { kind: 'player', playerId: 'v2' }, { id: 'p', gameId: g.id, stepId: stepId(g), command: { type: 'dayPhase', action: 'start' } }, NOW), 'MODERATOR_REQUIRED');
});

test('saved v11 games retain working day clocks after v12 is introduced', () => {
  let g = toDay();
  g.rulesVersion = 'classic-core-v11'; g.schemaVersion = 6;
  delete g.settings!.skipVoteDays; delete g.daySkipsUsed;
  g = step(g, { type: 'dayPhase', action: 'start' });
  assert.equal(g.dayPhaseEndsAt, NOW + 300_000);
  g = step(g, { type: 'dayPhase', action: 'next' });
  assert.equal(g.dayPhase, 'nomination');
});
