import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, dispatch, stepId, RuleError } from '../src/engine/engine.ts';
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

function night(g: Game, victim = 'v1'): Game {
  g = act(g, 'g', { type: 'protect', target: g.night === 1 ? 'g' : 's' });
  g = step(g, { type: 'advance' });
  g = act(g, 's', { type: 'inspect', target: 'w' });
  g = step(g, { type: 'advance' });
  g = act(g, 'w', { type: 'bite', target: victim });
  g = step(g, { type: 'advance' });
  g = step(g, { type: 'advance' });
  g = step(g, { type: 'resolve' });
  return step(g, { type: 'publish' });
}
const toDay = (settings?: Parameters<typeof createGame>[2]) => night(createGame('vote', roster, settings));

test('default settings forbid skipping: an empty verdict is refused until someone is voted out', () => {
  let g = toDay();
  assert.equal(g.settings!.skipVoteDays, 0);
  rejects(() => step(g, { type: 'verdict', target: null }), 'VOTE_REQUIRED');
  g = step(g, { type: 'verdict', target: 'w' }); // voting someone out always works
  assert.equal(g.verdictDone, true);
  assert.equal((g.daySkipsUsed ?? 0), 0);
});

test('the skip budget is spent per no-execution morning and persists across days', () => {
  let g = toDay({ witchSeesBite: true, skipVoteDays: 1 });
  g = step(g, { type: 'verdict', target: null });
  assert.equal(g.daySkipsUsed, 1);
  // sáng hôm sau: ngân sách đã hết — skip chính là phán quyết của ngày đó
  g = step(g, { type: 'nextNight' });
  g = night(g, 'v2');
  rejects(() => step(g, { type: 'verdict', target: null }), 'VOTE_REQUIRED');
  g = step(g, { type: 'verdict', target: 'g' });
  assert.equal(g.daySkipsUsed, 1);
});

test('v11/schema6 games keep the old skip-anytime behaviour', () => {
  let g = toDay();
  g.rulesVersion = 'classic-core-v11';
  g.schemaVersion = 6;
  delete (g as { daySkipsUsed?: number }).daySkipsUsed;
  g = step(g, { type: 'verdict', target: null }); // no budget, no refusal
  assert.equal(g.verdictDone, true);
  assert.equal(g.daySkipsUsed, undefined);
});

test('skip budget is validated before the game starts and cannot be changed mid-game', () => {
  for (const bad of [-1, 31, 1.5]) {
    rejects(() => createGame('bad', roster, { witchSeesBite: true, skipVoteDays: bad }), 'INVALID_SETTINGS');
  }
  const g = toDay({ witchSeesBite: true, skipVoteDays: 2 });
  assert.equal(g.settings!.skipVoteDays, 2);
});

test('retrying an accepted skip spends exactly one allowance and a refused skip changes nothing', () => {
  const g = toDay({ witchSeesBite: true, skipVoteDays: 1 });
  const request = { id: 'skip-once', gameId: g.id, stepId: stepId(g), command: { type: 'verdict', target: null } as const };
  const accepted = dispatch(g, { kind: 'moderator' }, request);
  assert.equal(accepted.daySkipsUsed, 1);
  assert.deepEqual(dispatch(accepted, { kind: 'moderator' }, request), accepted);
  const required = toDay(); const before = structuredClone(required);
  rejects(() => step(required, { type: 'verdict', target: null }), 'VOTE_REQUIRED');
  assert.deepEqual(required, before);
});
