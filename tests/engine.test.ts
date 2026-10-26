import test from 'node:test';
import assert from 'node:assert/strict';
import { actors, createGame, dispatch, RuleError, stepId } from '../src/engine/engine.ts';
import { playerView, publicView } from '../src/engine/views.ts';
import type { Action, Command, Game, Principal, Role } from '../src/engine/types.ts';

const roster: { id: string; name: string; role: Role }[] = [
  { id: 'w', name: 'Sói', role: 'wolf' }, { id: 'g', name: 'Bảo vệ', role: 'guard' },
  { id: 's', name: 'Tiên tri', role: 'seer' }, { id: 'h', name: 'Phù thủy', role: 'witch' },
  { id: 'a', name: 'An', role: 'villager' }, { id: 'b', name: 'Bình', role: 'villager' },
];
const mod: Principal = { kind: 'moderator' };
function command(g: Game, c: Command, who: Principal = mod): Game {
  return dispatch(g, who, { id: `r${g.revision}`, gameId: g.id, stepId: stepId(g), command: c });
}
function act(g: Game, id: string, action: Action): Game {
  g = command(g, { type: 'wake' }, { kind: 'player', playerId: id });
  return command(g, { type: 'act', action }, { kind: 'player', playerId: id });
}
function night(protect: string, bite: string, heal = false, poison: string | null = null): Game {
  let g = createGame('test', roster, { witchSeesBite: true, skipVoteDays: 30 });
  g = act(g, 'g', { type: 'protect', target: protect });
  g = command(g, { type: 'advance' });
  g = act(g, 's', { type: 'inspect', target: 'w' });
  g = command(g, { type: 'advance' });
  g = act(g, 'w', { type: 'bite', target: bite });
  g = command(g, { type: 'advance' });
  g = act(g, 'h', { type: 'potion', heal, poison });
  g = command(g, { type: 'advance' });
  return command(g, { type: 'resolve' });
}
const rejects = (f: () => unknown, code: string) => assert.throws(f, (e: unknown) => e instanceof RuleError && e.code === code);

test('protection blocks bite, but not poison; original input is unchanged', () => {
  const g = night('a', 'a'); assert.ok(g.players.find(p => p.id === 'a')!.alive);
  const poisoned = night('a', 'a', false, 'a');
  assert.deepEqual(poisoned.pendingDeaths, ['a']);
  assert.deepEqual(poisoned.events.find(e => e.type === 'death')!.data.causes, ['poison']);
  const original = createGame('test', roster, { witchSeesBite: true, skipVoteDays: 30 }), before = structuredClone(original);
  act(original, 'g', { type: 'protect', target: 'a' }); assert.deepEqual(original, before);
});
test('healing does not cancel poison; both potions consumed exactly once', () => {
  const g = night('g', 'a', true, 'a'); assert.deepEqual(g.pendingDeaths, ['a']);
  assert.deepEqual(g.players.find(p => p.id === 'h')!.resources, { heal: 0, poison: 0, hunterShot: 0 });
  rejects(() => command(g, { type: 'resolve' }), 'ALREADY_RESOLVED_OR_WRONG_PHASE');
});
test('witch can self-heal, and a dying witch still poisons', () => {
  assert.ok(night('g', 'h', true).players.find(p => p.id === 'h')!.alive);
  assert.deepEqual(new Set(night('g', 'h', false, 'w').pendingDeaths), new Set(['h', 'w']));
});
test('death is not revealed before publication, and seer result is private', () => {
  const g = night('g', 'a');
  assert.ok(publicView(g).players.find(p => p.id === 'a')!.alive);
  assert.ok(playerView(g, 'a').players.find(p => p.id === 'a')!.alive);
  assert.equal(playerView(g, 's').messages[0].data.isWolf, true);
  assert.equal(playerView(g, 'a').messages.length, 0);
  const view = JSON.stringify(publicView(g));
  for (const secret of ['initialRole', 'resources', 'biteTarget', 'inspection', 'stepSequence']) assert.ok(!view.includes(secret));
  const published = command(g, { type: 'publish' });
  assert.equal(publicView(published).players.find(p => p.id === 'a')!.alive, false);
  assert.deepEqual(publicView(published).announcements[0].data, { dead: ['a'] });
});
test('views cannot mutate canonical state', () => {
  const g = night('g', 'a'); playerView(g, 's').messages[0].data.isWolf = false;
  assert.equal(playerView(g, 's').messages[0].data.isWolf, true);
});
test('retries are idempotent even after changing steps; reused ID with changed payload fails', () => {
  let g = createGame('test', roster, { witchSeesBite: true, skipVoteDays: 30 });
  const request = { id: 'same', gameId: g.id, stepId: stepId(g), command: { type: 'wake' } as Command };
  const who: Principal = { kind: 'player', playerId: 'g' };
  g = dispatch(g, who, request); assert.deepEqual(dispatch(g, who, request), g);
  g = command(g, { type: 'act', action: { type: 'protect', target: 'a' } }, who);
  g = command(g, { type: 'advance' });
  assert.deepEqual(dispatch(g, who, request), g);
  rejects(() => dispatch(g, who, { ...request, command: { type: 'act', action: { type: 'protect', target: 'b' } } }), 'REQUEST_ID_REUSED');
  rejects(() => dispatch(g, who, { ...request, id: 'late' }), 'STALE_STEP');
});
test('server role and turn boundaries; skip action is rejected and roles must act', () => {
  const g = createGame('test', roster, { witchSeesBite: true, skipVoteDays: 30 });
  rejects(() => command(g, { type: 'advance' }), 'WAITING_FOR_ACTIONS');
  rejects(() => command(g, { type: 'advance' }, { kind: 'player', playerId: 'g' }), 'MODERATOR_REQUIRED');
  rejects(() => act(g, 'a', { type: 'protect', target: 'b' } as Action), 'NOT_YOUR_TURN');
  rejects(() => command(g, { type: 'act', action: { type: 'protect', target: 'b' } }, { kind: 'player', playerId: 'g' }), 'NOT_AWAKE');
  rejects(() => act(g, 'g', { type: 'protect', target: 'absent' }), 'INVALID_TARGET');
  rejects(() => act(g, 'g', { type: 'bite', target: 'a' } as Action), 'WRONG_ABILITY');
  rejects(() => act(g, 'g', { type: 'skip' } as unknown as Action), 'WRONG_ABILITY');
});
test('guard cannot repeat consecutive nights, but may protect again on night 3', () => {
  let g = command(night('a', 'b'), { type: 'publish' }); // 'b' dies
  g = command(g, { type: 'verdict', target: null });
  g = command(g, { type: 'nextNight' });
  rejects(() => act(g, 'g', { type: 'protect', target: 'a' }), 'REPEATED_PROTECTION');
  assert.ok(!playerView(g, 'g').turn!.targets.includes('a'));
  g = act(g, 'g', { type: 'protect', target: 'g' }); g = command(g, { type: 'advance' });
  assert.equal(g.players.find(p => p.id === 'g')!.lastProtected, 'g');
  g = act(g, 's', { type: 'inspect', target: 'w' }); g = command(g, { type: 'advance' });
  g = act(g, 'w', { type: 'bite', target: 'a' }); g = command(g, { type: 'advance' });
  g = act(g, 'h', { type: 'potion', heal: false, poison: null }); g = command(g, { type: 'advance' });
  g = command(g, { type: 'resolve' });
  g = command(g, { type: 'publish' }); // 'a' dies
  g = command(g, { type: 'verdict', target: null });
  g = command(g, { type: 'nextNight' });
  // Night 3: guard can protect 's' or 'h', and 'g' is forbidden (repeated)
  assert.ok(!playerView(g, 'g').turn!.targets.includes('g'));
  assert.ok(playerView(g, 'g').turn!.targets.includes('s'));
  g = act(g, 'g', { type: 'protect', target: 's' });
  assert.equal(g.actions['g'].type, 'protect');
});
test('wolves must agree and may revise before moderator closes their step', () => {
  let g = createGame('pack', [...roster, { id: 'w2', name: 'Sói 2', role: 'wolf' }], { witchSeesBite: true, skipVoteDays: 30 });
  g = act(g, 'g', { type: 'protect', target: 'g' }); g = command(g, { type: 'advance' });
  g = act(g, 's', { type: 'inspect', target: 'a' }); g = command(g, { type: 'advance' });
  g = act(g, 'w', { type: 'bite', target: 'a' }); g = act(g, 'w2', { type: 'bite', target: 'b' });
  rejects(() => command(g, { type: 'advance' }), 'WOLVES_DISAGREE');
  rejects(() => act(g, 'w', { type: 'bite', target: 'w2' }), 'WOLF_TARGET');
  g = act(g, 'w2', { type: 'bite', target: 'a' }); g = command(g, { type: 'advance' });
  assert.equal(g.biteTarget, 'a');
});
test('winner checked after simultaneous effects and withheld until morning', () => {
  const g = night('g', 'h', false, 'w'); assert.equal(g.winner, null);
  const published = command(g, { type: 'publish' }); assert.equal(published.winner, 'village');
  rejects(() => command(published, { type: 'nextNight' }), 'VERDICT_REQUIRED');
});
test('unsupported roles and rule versions are rejected', () => {
  rejects(() => createGame('bad', [...roster, { id: 'x', name: 'X', role: 'wolf-cub' as Role }]), 'INVALID_PLAYER');
  const g = createGame('v', roster); g.rulesVersion = 'future-v4';
  rejects(() => command(g, { type: 'advance' }), 'UNSUPPORTED_RULES_VERSION');
});
test('no roles present in a step can be advanced; wolf parity ends after daytime verdict', () => {
  const fourRoster: { id: string; name: string; role: Role }[] = [
    { id: 'w', name: 'Sói', role: 'wolf' },
    { id: 'a', name: 'An', role: 'villager' },
    { id: 'b', name: 'Bình', role: 'villager' },
    { id: 'c', name: 'Chi', role: 'villager' },
  ];
  let g = createGame('small', fourRoster, { witchSeesBite: true, skipVoteDays: 30 });
  g = command(g, { type: 'advance' }); // guard step (absent)
  g = command(g, { type: 'advance' }); // seer step (absent)
  g = act(g, 'w', { type: 'bite', target: 'c' }); g = command(g, { type: 'advance' });
  g = command(g, { type: 'advance' }); // witch step (absent)
  g = command(g, { type: 'resolve' });
  g = command(g, { type: 'publish' });
  assert.equal(g.winner, null); // 1 wolf, 2 villagers ('a', 'b')
  g = command(g, { type: 'verdict', target: 'a' }); // eliminate 'a'
  assert.equal(g.winner, 'wolves'); assert.equal(g.step, 'ended');
});
test('witch can choose not to use potions, and still wakes up when potions are exhausted', () => {
  let g = createGame('potions', roster, { witchSeesBite: true, skipVoteDays: 30 });
  g = act(g, 'g', { type: 'protect', target: 'g' }); g = command(g, { type: 'advance' });
  g = act(g, 's', { type: 'inspect', target: 'a' }); g = command(g, { type: 'advance' });
  g = act(g, 'w', { type: 'bite', target: 'a' }); g = command(g, { type: 'advance' });
  // Witch chooses to hold potions (heal: false, poison: null)
  g = act(g, 'h', { type: 'potion', heal: false, poison: null });
  g = command(g, { type: 'advance' });
  assert.deepEqual(g.players.find(p => p.id === 'h')!.resources, { heal: 1, poison: 1, hunterShot: 0 });
  g = command(g, { type: 'resolve' });
  g = command(g, { type: 'publish' }); // 'a' dies from bite
  g = command(g, { type: 'verdict', target: null });
  g = command(g, { type: 'nextNight' });

  // Night 2: Witch uses both heal and poison
  g = act(g, 'g', { type: 'protect', target: 's' }); g = command(g, { type: 'advance' });
  g = act(g, 's', { type: 'inspect', target: 'w' }); g = command(g, { type: 'advance' });
  g = act(g, 'w', { type: 'bite', target: 'b' }); g = command(g, { type: 'advance' });
  g = act(g, 'h', { type: 'potion', heal: true, poison: 'w' }); g = command(g, { type: 'advance' });
  assert.deepEqual(g.players.find(p => p.id === 'h')!.resources, { heal: 0, poison: 0, hunterShot: 0 });
  g = command(g, { type: 'resolve' }); // 'w' dies of poison, 'b' saved by heal
  g = command(g, { type: 'publish' }); // wolf dies -> village wins
  assert.equal(g.winner, 'village');
});
test('witch waking up with 0 potions can submit empty potion action to avoid leaking state', () => {
  let g = createGame('empty_potions', roster, { witchSeesBite: true, skipVoteDays: 30 });
  g.players.find(p => p.id === 'h')!.resources = { heal: 0, poison: 0, hunterShot: 0 };
  g = act(g, 'g', { type: 'protect', target: 'g' }); g = command(g, { type: 'advance' });
  g = act(g, 's', { type: 'inspect', target: 'w' }); g = command(g, { type: 'advance' });
  g = act(g, 'w', { type: 'bite', target: 'a' }); g = command(g, { type: 'advance' });
  // Witch has turn despite 0 potions
  assert.ok(playerView(g, 'h').turn !== null);
  assert.equal(playerView(g, 'h').biteTarget, null);
  // Trying to heal or poison fails
  rejects(() => act(g, 'h', { type: 'potion', heal: true, poison: null }), 'NO_HEAL_AVAILABLE');
  rejects(() => act(g, 'h', { type: 'potion', heal: false, poison: 'w' }), 'NO_POISON_AVAILABLE');
  // Submitting no-potion succeeds
  g = act(g, 'h', { type: 'potion', heal: false, poison: null });
  g = command(g, { type: 'advance' });
  assert.equal(g.healTarget, null);
  assert.equal(g.poisonTarget, null);
});
test('public and private event IDs do not reveal the number of secret events', () => {
  const g = command(night('g', 'a'), { type: 'publish' });
  assert.deepEqual(publicView(g).announcements.map(e => e.id), [1]);
  assert.deepEqual(playerView(g, 's').messages.map(e => e.id), [1]);
});
test('exhaustive basic protection/heal/poison combinations match the fixed policy', () => {
  for (const protect of ['g', 'a', 'b']) for (const heal of [false, true]) for (const poison of [null, 'a', 'b']) {
    if (protect === 'a' && heal) { rejects(() => night(protect, 'a', heal, poison), 'NO_HEAL_AVAILABLE'); continue; }
    const g = night(protect, 'a', heal, poison);
    const dead = new Set<string>();
    if (protect !== 'a' && !heal) dead.add('a');
    if (poison) dead.add(poison);
    assert.deepEqual(new Set(g.pendingDeaths), dead, JSON.stringify({ protect, heal, poison }));
  }
});

test('cupid pairs players on night 1; cross-team lovers form 3rd party; heartbreak kills partner', () => {
  const cupidRoster: { id: string; name: string; role: Role }[] = [
    { id: 'w', name: 'Sói', role: 'wolf' },
    { id: 'c', name: 'Cupid', role: 'cupid' },
    { id: 'a', name: 'An', role: 'villager' },
    { id: 'b', name: 'Bình', role: 'villager' },
  ];
  let g = createGame('cupid_game', cupidRoster, { witchSeesBite: true, skipVoteDays: 30 });
  assert.equal(g.step, 'cupid');
  // Cupid pairs wolf 'w' and villager 'a'
  rejects(() => act(g, 'c', { type: 'pair', targets: ['a', 'a'] }), 'SELF_TARGET');
  g = act(g, 'c', { type: 'pair', targets: ['w', 'a'] });
  g = command(g, { type: 'advance' });
  assert.equal(g.players.find(p => p.id === 'w')!.team, 'lovers');
  assert.equal(g.players.find(p => p.id === 'a')!.team, 'lovers');
  assert.equal(playerView(g, 'w').lover?.partnerId, 'a');
  assert.equal(playerView(g, 'a').lover?.partnerId, 'w');

  // Guard & Seer absent -> advance to wolves
  g = command(g, { type: 'advance' }); // guard absent
  g = command(g, { type: 'advance' }); // seer absent
  g = act(g, 'w', { type: 'bite', target: 'b' }); g = command(g, { type: 'advance' });
  g = command(g, { type: 'advance' }); // witch absent
  g = command(g, { type: 'resolve' });
  g = command(g, { type: 'publish' }); // 'b' dies
  assert.equal(g.players.find(p => p.id === 'b')!.alive, false);

  // Day: village votes to eliminate wolf 'w'
  g = command(g, { type: 'verdict', target: 'w' });
  // 'w' dies, and partner 'a' dies immediately of heartbreak
  assert.equal(g.players.find(p => p.id === 'w')!.alive, false);
  assert.equal(g.players.find(p => p.id === 'a')!.alive, false);
  const heartbreakEvent = g.events.find(e => e.type === 'death' && (e.data.causes as string[]).includes('heartbreak'));
  assert.ok(heartbreakEvent);
  assert.equal(heartbreakEvent.data.player, 'a');
});

test('hunter shoots on night death; cascading shot can trigger lover heartbreak', () => {
  const hunterRoster: { id: string; name: string; role: Role }[] = [
    { id: 'w', name: 'Sói', role: 'wolf' },
    { id: 'ht', name: 'Thợ săn', role: 'hunter' },
    { id: 'c', name: 'Cupid', role: 'cupid' },
    { id: 'a', name: 'An', role: 'villager' },
    { id: 'b', name: 'Bình', role: 'villager' },
  ];
  let g = createGame('hunter_game', hunterRoster, { witchSeesBite: true, skipVoteDays: 30 });
  // Night 1: Cupid pairs 'a' and 'b'
  g = act(g, 'c', { type: 'pair', targets: ['a', 'b'] });
  g = command(g, { type: 'advance' });
  g = command(g, { type: 'advance' }); // guard absent
  g = command(g, { type: 'advance' }); // seer absent
  // Wolf bites Hunter 'ht'
  g = act(g, 'w', { type: 'bite', target: 'ht' }); g = command(g, { type: 'advance' });
  g = command(g, { type: 'advance' }); // witch absent
  g = command(g, { type: 'resolve' });
  g = command(g, { type: 'publish' }); // 'ht' dies -> step becomes 'hunter'
  assert.equal(g.step, 'hunter');
  assert.equal(g.activeHunterId, 'ht');

  // Hunter shoots 'a' (who is paired with 'b')
  rejects(() => act(g, 'ht', { type: 'shoot', target: 'ht' }), 'SELF_TARGET');
  g = act(g, 'ht', { type: 'shoot', target: 'a' });
  g = command(g, { type: 'advance' });
  // 'a' dies from shot, 'b' dies from heartbreak
  assert.equal(g.players.find(p => p.id === 'a')!.alive, false);
  assert.equal(g.players.find(p => p.id === 'b')!.alive, false);
  // With 'ht', 'a', 'b' dead, only 1 wolf ('w') and 1 villager ('c') remain -> wolf parity -> wolves win!
  assert.equal(g.step, 'ended');
  assert.equal(g.winner, 'wolves');
  assert.equal(g.players.find(p => p.id === 'ht')!.resources.hunterShot, 0);
});

test('mixed lovers win when only the two lovers survive', () => {
  const loverRoster: { id: string; name: string; role: Role }[] = [
    { id: 'w', name: 'Sói', role: 'wolf' },
    { id: 'c', name: 'Cupid', role: 'cupid' },
    { id: 'a', name: 'An', role: 'villager' },
  ];
  let g = createGame('lover_win', loverRoster, { witchSeesBite: true, skipVoteDays: 30 });
  // Cupid pairs 'w' and 'a'
  g = act(g, 'c', { type: 'pair', targets: ['w', 'a'] });
  g = command(g, { type: 'advance' });
  g = command(g, { type: 'advance' }); // guard
  g = command(g, { type: 'advance' }); // seer
  // Sói bites Cupid 'c'
  g = act(g, 'w', { type: 'bite', target: 'c' }); g = command(g, { type: 'advance' });
  g = command(g, { type: 'advance' }); // witch
  g = command(g, { type: 'resolve' });
  g = command(g, { type: 'publish' }); // Cupid dies
  // Now only 'w' and 'a' are alive -> lovers win!
  assert.equal(g.winner, 'lovers');
  assert.equal(g.step, 'ended');
});

test('cursed survives wolf bite and transforms into a wolf from the next night', () => {
  const cursedRoster: { id: string; name: string; role: Role }[] = [
    { id: 'w', name: 'Sói', role: 'wolf' },
    { id: 'cur', name: 'Kẻ bị nguyền', role: 'cursed' },
    { id: 's', name: 'Tiên tri', role: 'seer' },
    { id: 'a', name: 'An', role: 'villager' },
    { id: 'b', name: 'Bình', role: 'villager' },
  ];
  let g = createGame('cursed_game', cursedRoster, { witchSeesBite: true, skipVoteDays: 30 });
  // Night 1: Seer inspects cursed -> not a wolf yet
  g = command(g, { type: 'advance' }); // guard absent
  g = act(g, 's', { type: 'inspect', target: 'cur' }); g = command(g, { type: 'advance' });
  assert.equal(playerView(g, 's').messages[0].data.isWolf, false);

  // Wolf bites cursed
  g = act(g, 'w', { type: 'bite', target: 'cur' }); g = command(g, { type: 'advance' });
  g = command(g, { type: 'advance' }); // witch absent
  g = command(g, { type: 'resolve' });
  // Cursed does NOT die in resolve
  assert.deepEqual(g.pendingDeaths, []);
  assert.equal(g.players.find(p => p.id === 'cur')!.alive, true);
  // The transformation is not exposed before moderator publication.
  assert.equal(playerView(g, 'cur').self.role, 'cursed');
  g = command(g, { type: 'publish' });
  // Cursed is transformed to wolf!
  assert.equal(g.players.find(p => p.id === 'cur')!.role, 'wolf');
  assert.equal(g.players.find(p => p.id === 'cur')!.team, 'wolves');

  // Morning: no one died
  assert.equal(g.publicDead.length, 0);
  g = command(g, { type: 'verdict', target: null });
  g = command(g, { type: 'nextNight' });

  // Night 2: Seer inspects cursed -> now is a wolf!
  g = command(g, { type: 'advance' }); // guard absent
  g = act(g, 's', { type: 'inspect', target: 'cur' }); g = command(g, { type: 'advance' });
  assert.equal(playerView(g, 's').messages[1].data.isWolf, true);

  // Now both 'w' and 'cur' are wolves in wolves step! Both must bite the same target
  g = act(g, 'w', { type: 'bite', target: 'a' });
  g = act(g, 'cur', { type: 'bite', target: 'a' });
  g = command(g, { type: 'advance' });
  assert.equal(g.biteTarget, 'a');
});

test('cursed dies normally when poisoned by witch', () => {
  const cursedPoisonRoster: { id: string; name: string; role: Role }[] = [
    { id: 'w', name: 'Sói', role: 'wolf' },
    { id: 'cur', name: 'Kẻ bị nguyền', role: 'cursed' },
    { id: 'h', name: 'Phù thủy', role: 'witch' },
    { id: 'a', name: 'An', role: 'villager' },
  ];
  let g = createGame('cursed_poison', cursedPoisonRoster, { witchSeesBite: true, skipVoteDays: 30 });
  g = command(g, { type: 'advance' }); // guard
  g = command(g, { type: 'advance' }); // seer
  g = act(g, 'w', { type: 'bite', target: 'a' }); g = command(g, { type: 'advance' });
  // Witch poisons cursed
  g = act(g, 'h', { type: 'potion', heal: false, poison: 'cur' }); g = command(g, { type: 'advance' });
  g = command(g, { type: 'resolve' });
  assert.ok(g.pendingDeaths.includes('cur'));
  assert.equal(g.players.find(p => p.id === 'cur')!.alive, false);
});

test('doppelganger mimics seer on night 1 and inherits seer role when seer dies', () => {
  const dpRoster: { id: string; name: string; role: Role }[] = [
    { id: 'w', name: 'Sói', role: 'wolf' },
    { id: 's', name: 'Tiên tri', role: 'seer' },
    { id: 'dp', name: 'Nhân bản', role: 'doppelganger' },
    { id: 'a', name: 'An', role: 'villager' },
    { id: 'b', name: 'Bình', role: 'villager' },
  ];
  let g = createGame('dp_game', dpRoster, { witchSeesBite: true, skipVoteDays: 30 });
  // Night 1 starts with doppelganger (since no cupid)
  assert.equal(g.step, 'doppelganger');
  rejects(() => act(g, 'dp', { type: 'mimic', target: 'dp' }), 'SELF_TARGET');
  g = act(g, 'dp', { type: 'mimic', target: 's' });
  g = command(g, { type: 'advance' });
  assert.equal(g.players.find(p => p.id === 'dp')!.doppelgangerTarget, 's');
  assert.equal(g.step, 'guard');

  g = command(g, { type: 'advance' }); // guard absent
  // Original seer 's' inspects 'w'
  g = act(g, 's', { type: 'inspect', target: 'w' }); g = command(g, { type: 'advance' });
  // Wolf bites original seer 's'
  g = act(g, 'w', { type: 'bite', target: 's' }); g = command(g, { type: 'advance' });
  g = command(g, { type: 'advance' }); // witch absent
  g = command(g, { type: 'resolve' });
  assert.equal(playerView(g, 'dp').self.role, 'doppelganger');
  g = command(g, { type: 'publish' }); // inheritance is published with the death
  // Original seer died in night 1 -> doppelganger inherits seer!
  assert.equal(g.players.find(p => p.id === 'dp')!.role, 'seer');
  assert.equal(g.players.find(p => p.id === 'dp')!.team, 'village');

  g = command(g, { type: 'verdict', target: null });
  g = command(g, { type: 'nextNight' });

  // Night 2: Doppelganger (now Seer!) wakes up at seer step and inspects!
  g = command(g, { type: 'advance' }); // guard absent
  assert.equal(g.step, 'seer');
  assert.deepEqual(actors(g), ['dp']);
  g = act(g, 'dp', { type: 'inspect', target: 'w' });
  g = command(g, { type: 'advance' });
  assert.equal(playerView(g, 'dp').messages.find(e => e.type === 'inspection' && e.night === 2 && e.data.target === 'w')?.data.isWolf, true);
});


