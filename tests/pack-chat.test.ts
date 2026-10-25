import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, dispatch, stepId, RuleError } from '../src/engine/engine.ts';
import { playerView, moderatorView, publicView } from '../src/engine/views.ts';
import type { Action, Command, Game, Role } from '../src/engine/types.ts';

function cmd(g: Game, command: Command, actor?: string, id = `r${g.revision}`) {
  return dispatch(g, actor ? { kind: 'player', playerId: actor } : { kind: 'moderator' }, { id, gameId: g.id, stepId: stepId(g), command });
}
function act(g: Game, actor: string, action: Action) { return cmd(cmd(g, { type: 'wake' }, actor), { type: 'act', action }, actor); }
const rejects = (fn: () => unknown, code: string) => assert.throws(fn, (e: unknown) => e instanceof RuleError && e.code === code);

const roster: { id: string; name: string; role: Role }[] = [
  { id: 'w1', name: 'W1', role: 'wolf' }, { id: 'w2', name: 'W2', role: 'wolf' },
  { id: 'd', name: 'D', role: 'dream_wolf' }, { id: 'g', name: 'G', role: 'guard' },
  { id: 's', name: 'S', role: 'seer' }, { id: 't', name: 'T', role: 'witch' },
  { id: 'v', name: 'V', role: 'villager' }, { id: 'v2', name: 'V2', role: 'villager' },
];
// 8 players: 3 wolves (incl. undiscovered Dream) vs 5 villagers.

function wolvesStep(chatless = false): Game {
  let g = createGame('chat', roster);
  if (chatless) { g.rulesVersion = 'classic-core-v9'; g.schemaVersion = 4; delete g.chat; }
  g = cmd(act(g, 'g', { type: 'protect', target: 'g' }), { type: 'advance' });
  g = cmd(act(g, 's', { type: 'inspect', target: 'w1' }), { type: 'advance' });
  return g;
}

test('pack chat reaches every awake wolf with engine-computed recipients and stays open while the step runs', () => {
  let g = wolvesStep();
  g = cmd(g, { type: 'wake' }, 'w1');
  g = cmd(g, { type: 'chat', text: 'Cắn ai?' }, 'w1');
  g = cmd(g, { type: 'wake' }, 'w2');
  g = cmd(g, { type: 'chat', text: '  Cắn S đi  ' }, 'w2');
  assert.deepEqual(g.chat, [
    { id: 1, night: 1, from: 'w1', recipients: ['w1', 'w2'], text: 'Cắn ai?' },
    { id: 2, night: 1, from: 'w2', recipients: ['w1', 'w2'], text: 'Cắn S đi' },
  ]);
  const first = playerView(g, 'w1'), second = playerView(g, 'w2');
  assert.equal(first.packChat.open, true);
  assert.deepEqual(first.packChat.items, [
    { id: 1, night: 1, mine: true, from: 'W1', text: 'Cắn ai?' },
    { id: 2, night: 1, mine: false, from: 'W2', text: 'Cắn S đi' },
  ]);
  assert.deepEqual(second.packChat.items.map(i => i.mine), [false, true]);
});

test('undiscovered Dream Wolves and non-wolves never receive or read pack chat', () => {
  let g = wolvesStep();
  g = cmd(cmd(g, { type: 'wake' }, 'w1'), { type: 'chat', text: 'bàn bầy' }, 'w1');
  assert.deepEqual(playerView(g, 'd').packChat, { open: false, items: [] });
  assert.deepEqual(playerView(g, 'v').packChat, { open: false, items: [] });
  assert(!JSON.stringify(publicView(g)).includes('bàn bầy'));
  rejects(() => cmd(g, { type: 'chat', text: 'tôi là Sói?' }, 'd'), 'NOT_YOUR_TURN');
  assert.equal(moderatorView(g).chat?.length, 1); // moderator reads everything
});

test('chat does not block the bite, sleep readiness or advancing; history stays readable after the step', () => {
  let g = wolvesStep();
  g = cmd(g, { type: 'wake' }, 'w1');
  g = cmd(g, { type: 'chat', text: 'đồng thuận đi' }, 'w1');
  g = act(g, 'w1', { type: 'bite', target: 's' });
  assert.equal(playerView(g, 'w1').turn!.sleepReady, false); // w2 has not chosen yet
  g = cmd(g, { type: 'wake' }, 'w2');
  g = cmd(g, { type: 'chat', text: 'ok' }, 'w2');
  g = act(g, 'w2', { type: 'bite', target: 's' });
  assert.equal(playerView(g, 'w2').turn!.sleepReady, true);
  g = cmd(g, { type: 'advance' }); // chat is not an action; the pack can still be advanced
  assert.equal(g.step, 'witch');
  assert.equal(g.chat!.length, 2);
  const after = playerView(g, 'w1');
  assert.equal(after.packChat.open, false);
  assert.deepEqual(after.packChat.items.map(i => i.text), ['đồng thuận đi', 'ok']);
});

test('chat validation: awake wolves only during their step, bounded text, retry and cap', () => {
  let g = wolvesStep();
  rejects(() => cmd(g, { type: 'chat', text: 'chưa thức' }, 'w1'), 'NOT_AWAKE');
  g = cmd(g, { type: 'wake' }, 'w1');
  rejects(() => cmd(g, { type: 'chat', text: '' }, 'w1'), 'INVALID_MESSAGE');
  rejects(() => cmd(g, { type: 'chat', text: '   ' }, 'w1'), 'INVALID_MESSAGE');
  rejects(() => cmd(g, { type: 'chat', text: 'a'.repeat(201) }, 'w1'), 'INVALID_MESSAGE');
  rejects(() => cmd(g, { type: 'chat', text: 'x\u0000y' }, 'w1'), 'INVALID_MESSAGE');
  rejects(() => cmd(g, { type: 'chat', text: 'x' }), 'PLAYER_REQUIRED');
  g = dispatch(g, { kind: 'player', playerId: 'w1' }, { id: 'chat-once', gameId: g.id, stepId: stepId(g), command: { type: 'chat', text: 'ok' } });
  // Retrying the same request id with the same text never duplicates.
  assert.deepEqual(dispatch(g, { kind: 'player', playerId: 'w1' }, { id: 'chat-once', gameId: g.id, stepId: stepId(g), command: { type: 'chat', text: 'ok' } }), g);
  rejects(() => dispatch(g, { kind: 'player', playerId: 'w1' }, { id: 'chat-once', gameId: g.id, stepId: stepId(g), command: { type: 'chat', text: 'khác' } }), 'REQUEST_ID_REUSED');
  g = act(g, 'w1', { type: 'bite', target: 's' });
  g = act(g, 'w2', { type: 'bite', target: 's' });
  g = cmd(g, { type: 'advance' });
  rejects(() => cmd(g, { type: 'chat', text: 'đêm khác' }, 'w1'), 'WRONG_PHASE');
  const full = cmd(wolvesStep(), { type: 'wake' }, 'w1');
  full.chat = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, night: 1, from: 'w1', recipients: ['w1'], text: 'n' }));
  rejects(() => dispatch(full, { kind: 'player', playerId: 'w1' }, { id: 'cap', gameId: full.id, stepId: stepId(full), command: { type: 'chat', text: 'nữa' } }), 'CHAT_FULL');
});

test('v9/schema4 games keep playing without chat; chat is refused there', () => {
  let g = wolvesStep(true);
  assert.equal(g.chat, undefined);
  g = cmd(g, { type: 'wake' }, 'w1'); // normal commands still work
  rejects(() => cmd(g, { type: 'chat', text: 'cũ' }, 'w1'), 'CHAT_UNAVAILABLE');
  g = act(g, 'w1', { type: 'bite', target: 's' });
  assert.equal(g.actions.w1.type, 'bite');
});

test('a wolf who joins the pack later does not read chat from before it knew the pack', () => {
  let g = wolvesStep();
  g = cmd(cmd(g, { type: 'wake' }, 'w1'), { type: 'chat', text: 'bí mật đêm nay' }, 'w1');
  g = act(g, 'w1', { type: 'bite', target: 's' });
  g = cmd(g, { type: 'wake' }, 'w2');
  g = act(g, 'w2', { type: 'bite', target: 's' });
  g = cmd(g, { type: 'advance' }); // wolves -> witch
  g = act(g, 't', { type: 'potion', heal: false, poison: null });
  g = cmd(g, { type: 'advance' }); // witch -> review
  g = cmd(g, { type: 'resolve' });
  assert.deepEqual(g.pendingDeaths, ['s']);
  g = cmd(g, { type: 'publish' }); // seer death does not wake Dream
  assert.equal(g.wolfDeathOccurred, false);
  assert.equal(playerView(g, 'd').packChat.items.length, 0);
  g = cmd(g, { type: 'verdict', target: 'w1' }); // wolf executed by day vote
  assert.equal(g.wolfDeathOccurred, true); // Dream is now awake for later nights
  const dream = playerView(g, 'd');
  assert.equal(dream.packChat.items.length, 0); // was never a recipient
  const mate = playerView(g, 'w2');
  assert.deepEqual(mate.packChat.items.map(i => i.text), ['bí mật đêm nay']);
});
