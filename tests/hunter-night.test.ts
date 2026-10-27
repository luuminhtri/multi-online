import test from 'node:test';
import assert from 'node:assert/strict';
import { actors, createGame, dispatch, stepId, RuleError } from '../src/engine/engine.ts';
import { playerView, publicView } from '../src/engine/views.ts';
import type { Action, Command, Game, Role } from '../src/engine/types.ts';
import { parseMutation } from '../src/server/validation.ts';

function game(active = false, extras: Record<string, Role> = {}) {
  const roles: Record<string, Role> = { w: 'wolf', h: 'hunter', a: 'villager', b: 'villager', c: 'villager', d: 'villager', ...extras };
  return createGame('hunter13', Object.entries(roles).map(([id, role]) => ({ id, name: id, role })), { witchSeesBite: false, hunterActiveShot: active, skipVoteDays: 30 });
}
function cmd(g: Game, command: Command, id?: string) {
  return dispatch(g, id ? { kind: 'player', playerId: id } : { kind: 'moderator' }, { id: `r${g.revision}`, gameId: g.id, stepId: stepId(g), command });
}
function act(g: Game, id: string, action: Action) { return cmd(cmd(g, { type: 'wake' }, id), { type: 'act', action }, id); }
function night(g: Game, mark: Action, bite = 'a', poison: string | null = null, pair: [string, string] = ['a', 'b']) {
  while (g.step !== 'review') {
    for (const id of actors(g)) {
      const action: Action = g.step === 'hunter' ? mark
        : g.step === 'wolves' ? { type: 'bite', target: bite }
        : g.step === 'witch' ? { type: 'potion', heal: false, poison }
        : g.step === 'doppelganger' ? { type: 'mimic', target: 'h' }
        : g.step === 'cupid' ? { type: 'pair', targets: pair }
        : { type: 'protect', target: 'b' };
      g = act(g, id, action);
    }
    g = cmd(g, { type: 'advance' });
  }
  return g;
}
const alive = (g: Game, id: string) => g.players.find(p => p.id === id)!.alive;
const rejects = (f: () => unknown, code: string) => assert.throws(f, (e: unknown) => e instanceof RuleError && e.code === code);

test('v13 default is passive; living hunter is called nightly and must pin a valid other player', () => {
  let g = game(); assert.equal(g.schemaVersion, 8); assert.equal(g.rulesVersion, 'classic-core-v13'); assert.equal(g.settings!.hunterActiveShot, false);
  g = cmd(g, { type: 'advance' }); assert.equal(g.step, 'hunter'); assert.deepEqual(actors(g), ['h']);
  assert.equal(playerView(g, 'h').hunterMode, 'passive');
  rejects(() => cmd(g, { type: 'advance' }), 'WAITING_FOR_ACTIONS');
  rejects(() => act(g, 'h', { type: 'hold' }), 'WRONG_ABILITY');
  rejects(() => act(g, 'h', { type: 'shoot', target: 'h' }), 'SELF_TARGET');
  rejects(() => act(g, 'a', { type: 'shoot', target: 'w' }), 'NOT_YOUR_TURN');
});

for (const cause of ['bite', 'poison', 'heartbreak', 'explosion', 'delayed-bite'] as const) {
  test(`passive hunter pulls pin on night ${cause}; unpublished death and pin remain secret`, () => {
    let g = game(false, cause === 'poison' ? { t: 'witch' } : cause === 'heartbreak' ? { cu: 'cupid' } : cause === 'explosion' ? { a: 'mad_bomber' } : {});
    if (cause === 'delayed-bite') g.players.find(p => p.id === 'h')!.delayedDeathNight = 1;
    const bite = cause === 'bite' ? 'h' : 'a';
    g = night(g, { type: 'shoot', target: 'd' }, bite, cause === 'poison' ? 'h' : null, ['h', 'a']);
    const hidden = playerView(g, 'h'), publicBefore = publicView(g);
    g = cmd(g, { type: 'resolve' });
    assert.equal(alive(g, 'h'), false); assert.equal(alive(g, 'd'), false);
    assert.deepEqual(playerView(g, 'h'), hidden); assert.deepEqual(publicView(g), publicBefore);
    g = cmd(g, { type: 'publish' });
    assert(g.publicDead.includes('h')); assert(g.publicDead.includes('d')); assert.notEqual(g.step, 'hunter');
    assert(!publicView(g).announcements.some(e => ['hunter-shot', 'hunter-marked'].includes(e.type)));
  });
}

test('passive daytime death does not shoot; prior-night pin is reset before a new night', () => {
  let g = cmd(cmd(night(game(), { type: 'shoot', target: 'd' }), { type: 'resolve' }), { type: 'publish' });
  g = cmd(g, { type: 'verdict', target: 'h' });
  assert.equal(alive(g, 'd'), true); assert.equal(g.step, 'day');
  let next = cmd(cmd(cmd(cmd(night(game(), { type: 'shoot', target: 'd' }), { type: 'resolve' }), { type: 'publish' }), { type: 'verdict', target: null }), { type: 'nextNight' });
  assert.equal(next.players.find(p => p.id === 'h')!.hunterMark, null);
  next = cmd(cmd(night(next, { type: 'shoot', target: 'c' }, 'h'), { type: 'resolve' }), { type: 'publish' });
  assert.equal(alive(next, 'd'), true); assert.equal(alive(next, 'c'), false);
});

test('active hunter can hold and use exactly one shot later; spent hunter is not called again', () => {
  let g = cmd(cmd(night(game(true, { w2: 'wolf' }), { type: 'hold' }, 'a'), { type: 'resolve' }), { type: 'publish' });
  assert.equal(g.players.find(p => p.id === 'h')!.resources.hunterShot, 1);
  g = cmd(cmd(g, { type: 'verdict', target: null }), { type: 'nextNight' });
  g = night(g, { type: 'shoot', target: 'w' }, 'b');
  assert.equal(g.players.find(p => p.id === 'h')!.resources.hunterShot, 0);
  g = cmd(cmd(g, { type: 'resolve' }), { type: 'publish' });
  assert.equal(alive(g, 'h'), true); assert.equal(alive(g, 'w'), false);
  g = cmd(cmd(g, { type: 'verdict', target: null }), { type: 'nextNight' });
  g = cmd(g, { type: 'advance' }); assert.equal(g.step, 'hunter'); assert.deepEqual(actors(g), []);
  rejects(() => act(g, 'h', { type: 'shoot', target: 'w2' }), 'NOT_YOUR_TURN');
});

for (const role of ['villager', 'lycan', 'wolf_man', 'dream_wolf'] as Role[]) {
  test(`active shot classifies actual team of ${role}, not seer appearance; protection cannot stop shot`, () => {
    let g = night(game(true, { d: role, guard: 'guard' }), { type: 'shoot', target: 'd' }, 'a');
    g.protectedTarget = 'd'; g.healTarget = 'd';
    g = cmd(g, { type: 'resolve' });
    assert.equal(alive(g, 'd'), false);
    assert.equal(alive(g, 'h'), role === 'wolf_man' || role === 'dream_wolf');
    g = cmd(g, { type: 'publish' });
    assert(!publicView(g).announcements.some(e => e.type === 'hunter-fired'));
  });
}

test('active shot is idempotent and still fires if hunter is also bitten that night', () => {
  let g = night(game(true), { type: 'shoot', target: 'w' }, 'h');
  const req = { id: 'resolve-once', gameId: g.id, stepId: stepId(g), command: { type: 'resolve' } as Command };
  const resolved = dispatch(g, { kind: 'moderator' }, req);
  assert.deepEqual(dispatch(resolved, { kind: 'moderator' }, req), resolved);
  assert.equal(alive(resolved, 'w'), false); assert.equal(alive(resolved, 'h'), false);
  assert.equal(alive(g, 'h'), true);
});

test('API accepts active setting and hold shape, rejects invalid setting', () => {
  const start = { type: 'start', requestId: 'start', code: '123456', expectedRevision: 0, roles: ['wolf', 'hunter', 'villager'], settings: { witchSeesBite: false, hunterActiveShot: true } };
  assert.equal(parseMutation(start).type, 'start');
  assert.throws(() => parseMutation({ ...start, settings: { ...start.settings, hunterActiveShot: 'yes' } }));
  const command = { type: 'command', code: '123456', requestId: 'hold', gameId: 'g', stepId: 's', command: { type: 'act', action: { type: 'hold' } } };
  // Same command envelope as the product (game ID is carried by step, not trusted from client).
  delete (command as { gameId?: string }).gameId;
  assert.equal(parseMutation(command).type, 'command');
});


test('inheriting active Hunter copies spent ammunition, never refills or copies the night pin', () => {
  let g = cmd(cmd(night(game(true, { x: 'doppelganger' }), { type: 'shoot', target: 'd' }), { type: 'resolve' }), { type: 'publish' });
  const x = g.players.find(p => p.id === 'x')!;
  assert.equal(x.role, 'hunter'); assert.equal(x.resources.hunterShot, 0); assert.equal(x.hunterMark, null);
  g = cmd(cmd(g, { type: 'verdict', target: null }), { type: 'nextNight' });
  g = cmd(g, { type: 'advance' }); assert.deepEqual(actors(g), []);
});

for (const active of [false, true]) {
  test(`v13 ${active ? 'active' : 'passive'} hunter keeps sleeping players in night until dawn is published`, () => {
    let g = game(active);
    let calledHunter = false;
    while (g.step !== 'review') {
      assert.equal(publicView(g).phase, 'night', g.step);
      for (const p of g.players) assert.equal(playerView(g, p.id).phase, 'night', `${g.step}/${p.id}`);
      if (g.step === 'hunter') {
        calledHunter = true;
        assert.equal(playerView(g, 'a').turn, null);
        assert.equal(playerView(g, 'h').turn?.ability, 'hunter');
      }
      for (const id of actors(g)) {
        g = act(g, id, g.step === 'hunter'
          ? active ? { type: 'hold' } : { type: 'shoot', target: 'd' }
          : { type: 'bite', target: 'a' });
      }
      g = cmd(g, { type: 'advance' });
    }
    assert(calledHunter);
    assert.equal(publicView(g).phase, 'night');
    g = cmd(g, { type: 'resolve' });
    assert.equal(playerView(g, 'b').phase, 'night');
    g = cmd(g, { type: 'publish' });
    assert.equal(playerView(g, 'b').phase, 'day');
    g = cmd(cmd(g, { type: 'verdict', target: null }), { type: 'nextNight' });
    assert.equal(playerView(g, 'b').phase, 'night');
  });
}
