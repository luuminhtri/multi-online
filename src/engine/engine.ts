import { hasPower, isProtected, isHealed } from './power-policy.ts';
import { EXTRA_OPENING } from './extension-types.ts';
import { isExtended, isModernHunter, isExtraStep, extraState, extraPlayer, extraActors, extraTargets, applyExtraAction, finishExtraStep, nightImmune, publishDayPowers, wolverineCue, independentWinner, overrideWinner, progressSignature } from './extensions.ts';
import { baseTeam, hasSpecialAbility, isWolf, seenAsWolf } from './role-policy.ts';
import { adjacentLivingSeats, biteChoices, offeredCub, wolfActors, wolfPlan, canSacrifice, fruitMustFast, packMembers, canWolfTarget, roleCanWake } from './wolf-pack.ts';
import { NIGHT_STEPS, ROLES, RULES, LEGACY_V13_ROLES } from './rules.ts';
import { healableBites, legacyWitchRules, witchSeesBite } from './witch.ts';
import type { Action, Command, Game, GameSettings, Principal, Request, Role, Step } from './types.ts';

export class RuleError extends Error {
  code: string;
  constructor(code: string) { super(code); this.name = 'RuleError'; this.code = code; }
}
function requireRule(ok: unknown, code: string): asserts ok {
  if (!ok) throw new RuleError(code);
}
export function stepId(g: Game): string { return `${g.id}:${g.night}:${g.stepSequence}:${g.step}`; }
export function actors(g: Game): string[] {
  if (isExtraStep(g.step)) return extraActors(g,g.step);
  if (g.step === 'wolves') return wolfActors(g);
  if (g.step === 'alpha_wolf') return g.alphaEligibleNight === g.night && g.biteTargets.length > 0 ? g.players.filter(p => p.alive && hasPower(g,p,'alpha_wolf') && !p.alphaUsed).map(p => p.id) : [];
  if (g.step === 'cupid') return (g.night === 1 || isExtended(g)&&g.players.some(p=>p.alive&&p.role==='frankenstein'&&hasPower(g,p,g.step)) || isExtended(g)&&g.players.some(p=>p.initialRole==='drunk'&&p.role==='cupid')) && !g.lovers ? g.players.filter(p => p.alive && hasPower(g,p,'cupid')).map(p => p.id) : [];
  if (g.step === 'doppelganger') return (g.night === 1 || isExtended(g)&&g.players.some(p=>p.alive&&p.role==='frankenstein'&&hasPower(g,p,g.step)) || isExtended(g)&&g.players.some(p=>p.initialRole==='drunk'&&p.role==='doppelganger'&&!p.doppelgangerTarget)) ? g.players.filter(p => p.alive && hasPower(g,p,'doppelganger')&&(!isExtended(g)||!(g.extra?.players[p.id]?.initialized??[]).includes('doppelganger'))).map(p => p.id) : [];
  if (g.step === 'dire_wolf' || g.step === 'virginia_woolf') return g.players.filter(p => p.alive && hasPower(g,p,g.step) && p.deathBond === null).map(p => p.id);
  if (g.step === 'hunter') return isModernHunter(g) ? g.players.filter(p => p.alive && hasPower(g,p,'hunter') && (!g.settings?.hunterActiveShot || p.resources.hunterShot > 0)).map(p => p.id) : g.activeHunterId ? [g.activeHunterId] : [];
  const role = g.step;
  return g.players.filter(p => p.alive && hasPower(g,p,role)).map(p => p.id);
}
function event(g: Game, type: string, data: Record<string, unknown>, recipient?: string) {
  g.events.push({ id: g.events.length + 1, night: g.night, type, data,
    audience: recipient ? 'private' : 'moderator', ...(recipient ? { recipient } : {}) });
}
function move(g: Game, step: Step) {
  g.step = step; g.stepSequence++; g.awake = []; g.actions = {};
  // Every morning starts fresh: the phase clocks exist but only run once the
  // moderator presses start.
  if (step === 'day') { g.dayPhase = 'discussion'; g.dayPhaseEndsAt = null; }
}
function nextOpening(g: Game, after?: Step): Step {
  const steps: Step[] = ['cupid', 'doppelganger', ...(isExtended(g)?EXTRA_OPENING:[]), 'dire_wolf', 'virginia_woolf'];
  return steps.slice(after ? steps.indexOf(after) + 1 : 0).find(step => actors({ ...g, step }).length > 0) ?? 'guard';
}
export function createGame(id: string, roster: { id: string; name: string; role: Role }[], settings: GameSettings = { witchSeesBite: true }): Game {
  requireRule(typeof settings?.witchSeesBite === 'boolean' &&
    Object.keys(settings).every(k => k === 'witchSeesBite' || k === 'dayTimers' || k === 'skipVoteDays' || k === 'hunterActiveShot'), 'INVALID_SETTINGS');
  requireRule(settings.hunterActiveShot === undefined || typeof settings.hunterActiveShot === 'boolean', 'INVALID_SETTINGS');
  const dayTimers = { ...RULES.defaultDayTimers, ...(settings.dayTimers ?? {}) };
  requireRule(Object.keys(dayTimers).length === 4 &&
    Object.values(dayTimers).every(v => Number.isSafeInteger(v) && v >= 5 && v <= 3600), 'INVALID_SETTINGS');
  const skipVoteDays = settings.skipVoteDays ?? 0;
  requireRule(Number.isSafeInteger(skipVoteDays) && skipVoteDays >= 0 && skipVoteDays <= 30, 'INVALID_SETTINGS');
  requireRule(id.trim() && roster.length >= 3, 'INVALID_GAME');
  requireRule(new Set(roster.map(p => p.id)).size === roster.length, 'DUPLICATE_ID');
  requireRule(new Set(roster.map(p => p.name.trim().toLocaleLowerCase('vi'))).size === roster.length, 'DUPLICATE_NAME');
  for (const p of roster) requireRule(p.id.trim() && p.name.trim() && Object.hasOwn(ROLES, p.role), 'INVALID_PLAYER');
  for (const role of Object.keys(ROLES).filter(role => role !== 'wolf' && role !== 'villager' && role !== 'wolf_man' && role !== 'mason')) {
    requireRule(roster.filter(p => p.role === role).length <= 1, 'DUPLICATE_SPECIAL_ROLE');
  }
  const wolves = roster.filter(p => isWolf(p.role)).length;
  requireRule(wolves > 0 && wolves < roster.length - wolves, 'UNBALANCED_START');
  const startStep: Step = 'guard';
  const game: Game = {
    schemaVersion: 9, settings: { witchSeesBite: settings.witchSeesBite, hunterActiveShot: settings.hunterActiveShot ?? false, dayTimers, skipVoteDays }, id, rulesVersion: RULES.version, revision: 0, night: 1, step: startStep, stepSequence: 0,
    players: roster.map(p => ({ ...p, name: p.name.trim(), initialRole: p.role,
      team: baseTeam(p.role), alive: true,
      hunterMark: null, lastProtected: null, delayedDeathNight: null, alphaUsed: false, deathBond: null, knownWolves: [], cursedTransformed: false, doppelgangerTarget: null,
      resources: {
        heal: p.role === 'witch' ? 1 : 0,
        poison: p.role === 'witch' ? 1 : 0,
        hunterShot: p.role === 'hunter' ? 1 : 0,
      } })),
    awake: [], actions: {}, chat: [], dayPhase: null, dayPhaseEndsAt: null, daySkipsUsed: 0,
    wolfDeathOccurred: false, wolvesBlockedNight: null, biteTarget: null,
    biteTargets: [], doubleAttackNight: null, sacrificedCubId: null,
    alphaEligibleNight: null, alphaTarget: null, alphaActorId: null, protectedTarget: null, healTarget: null,
    poisonTarget: null, resolved: false, pendingDeaths: [], publicDead: [], verdictDone: false,
    winner: null, lovers: null, pendingHunters: [], activeHunterId: null, postHunterStep: 'day',
    events: [], receipts: {},
  };
  const state=extraState(game);state.players=Object.fromEntries(game.players.map(p=>[p.id,{}]));state.roundStart=progressSignature(game); game.step = nextOpening(game); return game;
}
function target(g: Game, id: string) {
  const p = g.players.find(p => p.id === id);
  requireRule(p?.alive, 'INVALID_TARGET'); return p;
}
// Role determines abilities; team determines the winning side. Recompute allegiance
// after role changes without copying another player's personal lover relationship.
function refreshTeams(g: Game) {
  for (const p of g.players) p.team = baseTeam(p.role);
  if (g.lovers) {
    const pair = g.lovers.map(id => g.players.find(p => p.id === id)!);
    if (pair[0].team !== pair[1].team) pair.forEach(p => { p.team = 'lovers'; });
  }
}
function inheritPowers(g:Game,deadIds:string[]){
 for(const holder of g.players.filter(p=>p.alive&&p.role==='frankenstein')){
  const s=extraPlayer(g,holder.id);s.powers??=[];
  for(const id of deadIds){const victim=g.players.find(p=>p.id===id)!,role=victim.role;if(['wolf','villager','frankenstein'].includes(role)||s.powers.includes(role))continue;
   s.powers.push(role);if(role==='alpha_wolf')holder.alphaUsed=holder.alphaUsed||victim.alphaUsed;const source=g.extra?.players[id];s.used=[...new Set([...(s.used??[]),...(source?.used??[])])];
   for(const key of ['heal','poison','hunterShot'] as const)holder.resources[key]=Math.max(holder.resources[key],victim.resources[key]);
   event(g,'power-inherited',{role,from:id},holder.id);
  }
 }
}
function checkDoppelgangerInheritance(g: Game, deadIds: string[]) {
  for (const p of g.players) {
    if (p.alive && hasPower(g,p,'doppelganger') && p.doppelgangerTarget && deadIds.includes(p.doppelgangerTarget)) {
      const victim = g.players.find(v => v.id === p.doppelgangerTarget)!;
      if(p.role==='frankenstein'){inheritPowers(g,[victim.id]);p.doppelgangerTarget=null;continue;}
      p.role = victim.role;
      if(isExtended(g))extraState(g).players[p.id]=structuredClone(g.extra?.players[victim.id]??{});
      p.resources = { ...victim.resources };
      p.lastProtected = victim.lastProtected;
      p.cursedTransformed = victim.cursedTransformed;
      p.alphaUsed = victim.alphaUsed;
      // A personal bond is not copied from the dead target. Set up the newly
      // inherited linking role at the next opening, even after night one.
      p.deathBond = null;
      p.hunterMark = null;
      p.knownWolves = [];
      if (p.role === 'hunter' && !isModernHunter(g)) p.resources.hunterShot = 1;
      event(g, 'doppelganger-inherited', { actor: p.id, newRole: p.role, from: victim.id });
      event(g, 'role-inherited', { newRole: p.role, roleName: ROLES[p.role].name }, p.id);
    }
  }
  // A mimic inheriting Seer has priority; an apprentice only fills a vacancy.
  if (deadIds.some(id => g.players.find(p => p.id === id)!.role === 'seer') &&
      !g.players.some(p => p.alive && p.role === 'seer')) {
    const apprentice = g.players.find(p => p.alive && p.role === 'apprentice_seer');
    if (apprentice) {
      apprentice.role = 'seer';
      event(g, 'apprentice-promoted', { actor: apprentice.id });
      event(g, 'role-inherited', { newRole: 'seer', roleName: ROLES.seer.name }, apprentice.id);
    }
  }
  if(isExtended(g))inheritPowers(g,deadIds);
  refreshTeams(g);
  // Remember identities learned at publication too (for example a Cursed
  // becoming a wolf after Fang Face's first-night ballot). Sleep must never
  // make a player forget information already revealed.
  for (const p of g.players) {
    if (p.alive && roleCanWake(g, p, true)) p.knownWolves = packMembers(g, p)!.map(v => v.id);
  }
}
// Mark the entire batch before inheritance or reactions. A mimic dying in the
// same batch cannot inherit, and every cause is recorded only for the moderator.
export function livingNeighbors(g: Game, id: string): string[] {
  const index = g.players.findIndex(p => p.id === id);
  requireRule(index >= 0, 'UNKNOWN_PLAYER');
  const neighbors = new Set<string>();
  for (const direction of [-1, 1]) {
    for (let distance = 1; distance < g.players.length; distance++) {
      const p = g.players[(index + direction * distance + g.players.length) % g.players.length];
      if (p.alive) { neighbors.add(p.id); break; }
    }
  }
  return [...neighbors];
}
function applyDeaths(g: Game, causes: Map<string, string[]>): string[] {
  const dead: string[] = [];
  const mark = (id: string, reasons: string[]) => {
    const p = g.players.find(p => p.id === id)!;
    if (!p.alive || nightImmune(g,id,reasons)) return;
    p.alive = false;
    if(isExtended(g)){
     const s=extraPlayer(g,id);s.deathNight=g.night;
     if(p.role==='bloody_mary'){
      const cause=reasons[0];const attack=g.extra!.attacks.find(a=>a.target===id&&a.cause===cause);
      const actor=attack?.actor??(cause==='poison'?g.players.find(p=>p.role==='witch')?.id:cause==='shot'?g.players.find(p=>p.hunterMark?.target===id&&p.hunterMark.night===g.night)?.id:undefined);
      s.killerId=actor;s.grudge=cause==='bite'?'wolves':cause==='verdict'?'village':cause==='drained'?'vampires':actor?g.players.find(p=>p.id===actor)!.team:'village';
     }
    }
    dead.push(id);
    if (hasPower(g,p,'wolf_cub') && !reasons.includes('sacrifice')) g.doubleAttackNight = g.night + 1;
    if (isWolf(p.role) && (g.step === 'day' || g.step === 'hunter')) g.alphaEligibleNight = g.night + 1;
    event(g, 'death', { player: id, causes: [...reasons] });
  };
  // Direct victims die together before automatic reactions inspect living seats.
  for (const [id, reasons] of causes) mark(id, reasons);
  for (let index = 0; index < dead.length; index++) {
    const id = dead[index];
    if (g.lovers?.includes(id)) {
      const partner = g.lovers.find(p => p !== id)!;
      mark(partner, ['heartbreak']);
    }
    for (const follower of g.players.filter(p => p.alive && hasPower(g,p,'dire_wolf') && p.deathBond?.kind === 'follow' && p.deathBond.target === id)) {
      mark(follower.id, ['companion']);
    }
    const deceased = g.players.find(p => p.id === id)!;
    if (hasPower(g,deceased,'virginia_woolf') && deceased.deathBond?.kind === 'revenge') mark(deceased.deathBond.target, ['fear']);
    if (isModernHunter(g) && g.step !== 'day' && !g.settings?.hunterActiveShot && hasPower(g,deceased,'hunter') && deceased.hunterMark?.night === g.night && g.players.some(p => p.id === deceased.hunterMark!.target && p.alive)) {
      event(g, 'hunter-shot', { hunter: id, target: deceased.hunterMark.target });
      mark(deceased.hunterMark.target, ['shot']);
    }
    if (hasPower(g,deceased,'mad_bomber')) {
      const neighbors = livingNeighbors(g, id);
      event(g, 'bomb-exploded', { actor: id, targets: neighbors });
      for (const neighbor of neighbors) mark(neighbor, ['explosion']);
    }
  }
  return dead;
}
function publishDeaths(g: Game, dead: string[]) {
  for (const id of dead) {
    if (!g.publicDead.includes(id)) g.publicDead.push(id);
    if (isWolf(g.players.find(p => p.id === id)!.role)) g.wolfDeathOccurred = true;
  }
}
function announceDeaths(g: Game, dead: string[]) {
  if (!dead.length) return;
  event(g, 'deaths', { dead: [...dead] });
  g.events.at(-1)!.audience = 'public';
}
function queueHunters(g: Game, dead: string[]) {
  if (isModernHunter(g)) return;
  for (const id of dead) {
    const p = g.players.find(p => p.id === id)!;
    if (p.role === 'hunter' && p.resources.hunterShot > 0 && !g.pendingHunters.includes(id) && g.activeHunterId !== id) {
      g.pendingHunters.push(id);
    }
  }
}
function continueHunters(g: Game) {
  g.activeHunterId = null;
  while (g.pendingHunters.length) {
    const id = g.pendingHunters.shift()!;
    const p = g.players.find(p => p.id === id)!;
    // With nobody left alive, there is no legal shot. Finish the batch as a draw.
    if (!p.alive && p.resources.hunterShot > 0 && g.players.some(p => p.alive)) {
      g.activeHunterId = id;
      move(g, 'hunter');
      return;
    }
  }
  move(g, g.postHunterStep);
  checkWinner(g);
}
function applyAction(g: Game, actorId: string, a: Action) {
  requireRule(actors(g).includes(actorId), 'NOT_YOUR_TURN');
  requireRule(g.awake.includes(actorId), 'NOT_AWAKE');
  requireRule(g.step === 'wolves' || !Object.hasOwn(g.actions, actorId), 'ACTION_ALREADY_CONFIRMED');
  const p = g.players.find(p => p.id === actorId)!;
  requireRule(a && typeof a.type === 'string', 'INVALID_ACTION');
  if (isExtraStep(g.step) && isExtended(g)) {
    applyExtraAction(g,actorId,a,{check:requireRule,event,neighbors:livingNeighbors});
    if(g.step==='drunk'){
     const pool=(Object.keys(ROLES) as Role[]).filter(r=>!['drunk','ghost','frankenstein'].includes(r)&&(r==='wolf'||r==='villager'||!g.players.some(p=>p.role===r)));
     const role=pool[Math.floor(Math.random()*pool.length)];extraPlayer(g,actorId).drawnRole=role;event(g,'ability-result',{kind:'drunk',role},actorId);
    }
  } else if (g.step === 'dire_wolf' || g.step === 'virginia_woolf') {
    requireRule(a.type === 'bond' && typeof a.target === 'string', 'WRONG_ABILITY');
    requireRule(a.target !== actorId, 'SELF_TARGET');
    target(g, a.target);
  } else if (g.step === 'cupid') {
    requireRule(a.type === 'pair' && Array.isArray(a.targets) && a.targets.length === 2, 'WRONG_ABILITY');
    requireRule(a.targets[0] !== a.targets[1], 'SELF_TARGET');
    target(g, a.targets[0]); target(g, a.targets[1]);
  } else if (g.step === 'doppelganger') {
    requireRule(a.type === 'mimic' && typeof a.target === 'string', 'WRONG_ABILITY');
    requireRule(a.target !== actorId, 'SELF_TARGET');
    target(g, a.target);
  } else if (g.step === 'guard') {
    requireRule(a.type === 'protect' && typeof a.target === 'string', 'WRONG_ABILITY');
    target(g, a.target);
    requireRule(RULES.guardCanSelfProtect || a.target !== actorId, 'SELF_TARGET');
    requireRule(RULES.guardCanRepeat || a.target !== p.lastProtected, 'REPEATED_PROTECTION');
  } else if (g.step === 'seer') {
    requireRule(a.type === 'inspect' && typeof a.target === 'string', 'WRONG_ABILITY');
    const t = target(g, a.target);
    requireRule(t.id !== actorId, 'SELF_TARGET');
    event(g, 'inspection', { target: t.id, isWolf: seenAsWolf(t.role)||t.role==='frankenstein'&&(hasPower(g,t,'lycan')||hasPower(g,t,'bigfoot')) }, actorId);
  } else if (g.step === 'aura_seer' || g.step === 'mystic_seer') {
    requireRule(a.type === 'inspect' && typeof a.target === 'string', 'WRONG_ABILITY');
    const t = target(g, a.target);
    requireRule(t.id !== actorId, 'SELF_TARGET');
    if (g.step === 'aura_seer') event(g, 'aura-inspection', { target: t.id, hasAbility: hasSpecialAbility(t.role) }, actorId);
    else event(g, 'mystic-inspection', { target: t.id, role: t.role }, actorId);
  } else if (g.step === 'mentalist') {
    requireRule(a.type === 'compare' && Array.isArray(a.targets) && a.targets.length === 2 && a.targets.every(t => typeof t === 'string'), 'WRONG_ABILITY');
    requireRule(a.targets[0] !== a.targets[1] && !a.targets.includes(actorId), 'SELF_TARGET');
    const first = target(g, a.targets[0]), second = target(g, a.targets[1]);
    event(g, 'alignment-comparison', { targets: [...a.targets], sameTeam: first.team === second.team }, actorId);
  } else if (g.step === 'wolves') {
    if (a.type === 'fast') {
      requireRule((hasPower(g,p,'fruit_wolf') || isExtended(g)&&p.role==='minion') && fruitMustFast(g), 'CANNOT_FAST');
    } else if (a.type === 'sacrifice') {
      requireRule(canSacrifice(g), 'PACK_MEMBER_ASLEEP');
      requireRule(typeof a.target === 'string' && g.sacrificedCubId === null, 'INVALID_SACRIFICE');
      // Only the Cub may reveal itself by offering. Other wolves cannot probe
      // secret roles by submitting guesses for a sacrifice target.
      requireRule((hasPower(g,p,'wolf_cub') && a.target === actorId) || offeredCub(g) === a.target, 'SACRIFICE_NOT_OFFERED');
    } else {
      requireRule(a.type === 'bite' || (a.type === 'maul' && Array.isArray(a.targets)), 'WRONG_ABILITY');
      const chosen = biteChoices(a)!;
      requireRule(chosen.every(id => typeof id === 'string') && new Set(chosen).size === chosen.length, 'INVALID_WOLF_TARGETS');
      const plan = wolfPlan(g);
      requireRule(plan.maxTargets > 0, 'CANNOT_BITE');
      requireRule(chosen.length >= plan.minTargets && chosen.length <= plan.maxTargets, 'INVALID_TARGET_COUNT');
      for (const id of chosen) requireRule(canWolfTarget(g, p, target(g, id)), 'WOLF_TARGET');
      requireRule(chosen.length !== 2 || !plan.adjacentPair || adjacentLivingSeats(g, chosen[0], chosen[1]), 'TARGETS_NOT_ADJACENT');
    }
  } else if (g.step === 'alpha_wolf') {
    requireRule(a.type === 'convert' && (a.target === null || typeof a.target === 'string'), 'WRONG_ABILITY');
    if (a.target !== null) requireRule(g.biteTargets.includes(a.target), 'INVALID_CONVERSION_TARGET');
  } else if (g.step === 'witch') {
    requireRule(a.type === 'potion' && typeof a.heal === 'boolean' && (a.poison === null || typeof a.poison === 'string'), 'WRONG_ABILITY');
    requireRule(RULES.witchCanUseBoth || !a.heal || a.poison === null, 'TWO_POTIONS');
    if (a.heal) {
      requireRule(p.resources.heal > 0, 'NO_HEAL_AVAILABLE');
      if (witchSeesBite(g)) {
        const bites = healableBites(g);
        requireRule(bites.length > 0, 'NO_HEAL_AVAILABLE');
        requireRule(bites.length === 1 || typeof a.healTarget === 'string', 'HEAL_TARGET_REQUIRED');
        const healed = a.healTarget ?? bites[0];
        requireRule(bites.includes(healed), 'INVALID_HEAL_TARGET');
        requireRule(RULES.witchCanSelfHeal || healed !== actorId, 'NO_SELF_HEAL');
      } else {
        // Identical acceptance with zero/one/two bites; a guessed ID must not
        // turn validation into an oracle for hidden or protected targets.
        requireRule(a.healTarget === undefined, 'INVALID_HEAL_TARGET');
      }
    }
    requireRule(a.heal || a.healTarget === undefined, 'INVALID_HEAL_TARGET');
    if (a.poison !== null) { requireRule(p.resources.poison > 0, 'NO_POISON_AVAILABLE'); target(g, a.poison); }
  } else if (g.step === 'hunter') {
    if (isModernHunter(g) && g.settings?.hunterActiveShot && a.type === 'hold') {
      Object.defineProperty(g.actions, actorId, { value: structuredClone(a), enumerable: true, writable: true, configurable: true });
      event(g, 'action-confirmed', { actor: actorId, action: structuredClone(a) });
      return;
    }
    requireRule(a.type === 'shoot' && typeof a.target === 'string', 'WRONG_ABILITY');
    requireRule(a.target !== actorId, 'SELF_TARGET');
    target(g, a.target);
  } else throw new RuleError('WRONG_PHASE');
  Object.defineProperty(g.actions, actorId, { value: structuredClone(a), enumerable: true, writable: true, configurable: true });
  event(g, 'action-confirmed', { actor: actorId, action: structuredClone(a) });
}
function nightSequence(g: Game): Step[] {
  return NIGHT_STEPS.filter(step => step===g.step || (isExtraStep(step) ? isExtended(g)&&g.players.some(p=>hasPower(g,p,step)) : (step!=='hunter'||isModernHunter(g)) && (['guard','seer','wolves','witch'].includes(step)||g.players.some(p=>hasPower(g,p,step)))));
}
function advance(g: Game) {
  if (isExtraStep(g.step) && isExtended(g)) {
    const expected=actors(g);
    requireRule(expected.every(id=>Object.hasOwn(g.actions,id)), 'WAITING_FOR_ACTIONS');
    finishExtraStep(g,expected);
    if(g.step==='drunk'){
     for(const id of expected){const p=g.players.find(p=>p.id===id)!,role=extraPlayer(g,id).drawnRole as Role;if(p.role==='frankenstein'){extraPlayer(g,id).powers=[...new Set([...(extraPlayer(g,id).powers??[]),role])];}else{p.role=role;p.team=baseTeam(role);}const resources={heal:role==='witch'?1:0,poison:role==='witch'?1:0,hunterShot:role==='hunter'?1:0};if(p.role==='frankenstein')for(const key of ['heal','poison','hunterShot'] as const)resources[key]=Math.max(resources[key],p.resources[key]);p.resources=resources;event(g,'role-inherited',{newRole:role,roleName:ROLES[role].name},id);}
     move(g,nextOpening(g));return;
    }
    const opening=EXTRA_OPENING.includes(g.step as typeof EXTRA_OPENING[number]);
    if(opening) move(g,nextOpening(g,g.step));
    else {const steps=nightSequence(g); const index=steps.indexOf(g.step); requireRule(index>=0,'WRONG_PHASE'); move(g,steps[index+1]??'review');}
    return;
  }
  if (g.step === 'dire_wolf' || g.step === 'virginia_woolf') {
    const step = g.step;
    const expected = actors(g);
    requireRule(expected.every(id => Object.hasOwn(g.actions, id)), 'WAITING_FOR_ACTIONS');
    for (const id of expected) {
      const a = g.actions[id];
      requireRule(a.type === 'bond', 'INVALID_ACTION');
      const p = g.players.find(p => p.id === id)!;
      p.deathBond = { kind: step === 'dire_wolf' ? 'follow' : 'revenge', target: a.target };
      event(g, 'death-bond-chosen', { actor: id, kind: p.deathBond.kind, target: a.target });
      event(g, 'death-bond', { kind: p.deathBond.kind, target: a.target }, id);
      if (step === 'virginia_woolf') event(g, 'feared-by', { actor: id }, a.target);
    }
    move(g, nextOpening(g, step));
    return;
  }
  if (g.step === 'cupid') {
    const expected = actors(g);
    requireRule(expected.every(id => Object.hasOwn(g.actions, id)), 'WAITING_FOR_ACTIONS');
    const actions = expected.map(id => g.actions[id]);
    if (expected[0]) {
      const action = actions[0];
      requireRule(action?.type === 'pair', 'INVALID_ACTION');
      g.lovers = action.targets;
      const p1 = g.players.find(p => p.id === action.targets[0])!;
      const p2 = g.players.find(p => p.id === action.targets[1])!;
      refreshTeams(g);
      event(g, 'lovers', { partner: p2.id, partnerName: p2.name }, p1.id);
      event(g, 'lovers', { partner: p1.id, partnerName: p1.name }, p2.id);
      event(g, 'lovers-chosen', { targets: action.targets });
    }
    move(g, nextOpening(g, 'cupid'));
    return;
  }
  if (g.step === 'doppelganger') {
    const expected = actors(g);
    if(isExtended(g))finishExtraStep(g,expected);
    requireRule(expected.every(id => Object.hasOwn(g.actions, id)), 'WAITING_FOR_ACTIONS');
    const actions = expected.map(id => g.actions[id]);
    if (expected[0]) {
      const action = actions[0];
      requireRule(action?.type === 'mimic', 'INVALID_ACTION');
      const dp = g.players.find(p => p.id === expected[0])!;
      dp.doppelgangerTarget = action.target;
      event(g, 'mimic-chosen', { actor: dp.id, target: action.target });
      event(g, 'mimic-target', { target: action.target, targetName: g.players.find(p => p.id === action.target)!.name }, dp.id);
    }
    move(g, nextOpening(g, 'doppelganger'));
    return;
  }
  if (g.step === 'hunter' && !isModernHunter(g)) {
    const expected = actors(g);
    requireRule(expected.length > 0 && Object.hasOwn(g.actions, expected[0]), 'WAITING_FOR_ACTIONS');
    const action = g.actions[expected[0]];
    requireRule(action?.type === 'shoot', 'INVALID_ACTION');
    const hunterPlayer = g.players.find(p => p.id === expected[0])!;
    hunterPlayer.resources.hunterShot = 0;
    event(g, 'hunter-shot', { hunter: expected[0], target: action.target });

    target(g, action.target);
    const dead = applyDeaths(g, new Map([[action.target, ['shot']]]));
    publishDeaths(g, dead);
    announceDeaths(g, dead);
    checkDoppelgangerInheritance(g, dead);
    queueHunters(g, dead);
    continueHunters(g);
    return;
  }

  const steps = nightSequence(g);
  const index = steps.indexOf(g.step);
  requireRule(index >= 0, 'WRONG_PHASE');
  const expected = actors(g);
  requireRule(expected.every(id => Object.hasOwn(g.actions, id)), 'WAITING_FOR_ACTIONS');
  if(isExtended(g))finishExtraStep(g,expected);
  const actions = expected.map(id => g.actions[id]);
  if (g.step === 'hunter') {
    for (const id of expected) {
      const action = g.actions[id];
      const hunter = g.players.find(p => p.id === id)!;
      if (action.type === 'hold') { hunter.hunterMark = null; continue; }
      requireRule(action.type === 'shoot', 'INVALID_ACTION');
      hunter.hunterMark = { target: action.target, night: g.night, active: !!g.settings?.hunterActiveShot, hitWolf: g.players.find(p => p.id === action.target)!.team === 'wolves' };
      if (g.settings?.hunterActiveShot) hunter.resources.hunterShot = 0;
      event(g, g.settings?.hunterActiveShot ? 'hunter-fired' : 'hunter-marked', { actor: id, target: action.target });
    }
  }
  if(g.step==='guard'&&isExtended(g))extraState(g).protectedTargets=[];
  if (g.step === 'guard') for(const id of expected){
    const action = g.actions[id];
    requireRule(action?.type === 'protect', 'INVALID_ACTION');
    g.protectedTarget = action.target;
    g.players.find(p => p.id === id)!.lastProtected = action.target;
    if(isExtended(g))extraState(g).protectedTargets!.push(action.target);
  }
  if (g.step === 'wolves' && expected.length > 0 && !fruitMustFast(g)) {
    if (actions.every(a => a.type === 'sacrifice')) {
      const cubId = (actions[0] as { target: string }).target;
      requireRule(actions.every(a => a.type === 'sacrifice' && a.target === cubId) && offeredCub(g) === cubId, 'WOLVES_DISAGREE');
      g.sacrificedCubId = cubId;
      event(g, 'cub-sacrifice-approved', { actor: cubId });
      // New step ID invalidates stale approvals. Cub remains publicly alive
      // until resolution/publication, and is excluded only from this ballot.
      move(g, 'wolves');
      return;
    }
    const choices = actions.map(a => biteChoices(a)?.sort());
    requireRule(choices.every(c => c !== null && JSON.stringify(c) === JSON.stringify(choices[0])), 'WOLVES_DISAGREE');
    g.biteTargets = g.players.filter(p => choices[0]!.includes(p.id)).map(p => p.id);
    g.biteTarget = g.biteTargets[0] ?? null;
    if(isExtended(g))wolverineCue(g,event);
  }
  if (g.step === 'alpha_wolf' && expected[0]) {
    const action = actions[0];
    requireRule(action.type === 'convert', 'INVALID_ACTION');
    g.alphaTarget = action.target;
    g.alphaActorId = action.target !== null ? expected[0] : null;
  }
  if (g.step === 'witch') for(const id of expected){
    const p = g.players.find(p => p.id === id)!, a = g.actions[id];
    if (a.type === 'potion') {
      if (a.heal) { g.healTarget = a.healTarget ?? healableBites(g)[0] ?? null; p.resources.heal--;if(isExtended(g)&&g.healTarget)(extraState(g).healedTargets??=[]).push(g.healTarget); }
      if (a.poison !== null) { g.poisonTarget = a.poison; p.resources.poison--;if(isExtended(g))(extraState(g).poisonTargets??=[]).push(a.poison); }
    }
  }
  move(g, steps[index + 1] ?? 'review');
}
function resolve(g: Game) {
  requireRule(g.step === 'review' && !g.resolved, 'ALREADY_RESOLVED_OR_WRONG_PHASE');
  const causes = new Map<string, string[]>();
  const kill = (id: string, cause: string) => causes.set(id, [...(causes.get(id) ?? []), cause]);
  if(isExtended(g))for(const id of extraState(g).penalties??[])kill(id,'penalty');
  if(isExtended(g))extraState(g).penalties=[];
  if(isExtended(g)&&g.night===1)for(const p of g.players.filter(p=>p.alive&&p.role==='ghost'))kill(p.id,'missing');
  if (g.sacrificedCubId) kill(g.sacrificedCubId, 'sacrifice');
  for (const id of g.biteTargets) {
    const blocked = isProtected(g,id) || isHealed(g,id) || nightImmune(g,id,['bite']);
    if (blocked) event(g, 'bite-blocked', { target: id, protected: isProtected(g,id), healed: isHealed(g,id) });
    else {
      const bitten = g.players.find(p => p.id === id)!;
      if (isWolf(bitten.role)||isExtended(g)&&bitten.role==='vampire') {
        // Do not turn validation into an oracle for an undiscovered Dream Wolf.
        event(g, 'pack-bite-blocked', { target: id });
        continue;
      }
      // Conversions and delayed wounds commit at publication. Poison and
      // automatic death reactions may still kill the intended survivor.
      if (id !== g.alphaTarget && (!hasPower(g,bitten,'cursed') || bitten.cursedTransformed) && !hasPower(g,bitten,'tough_guy')) kill(id, 'bite');
    }
  }
  for(const poison of [...new Set([...(g.poisonTarget?[g.poisonTarget]:[]),...(isExtended(g)?g.extra?.poisonTargets??[]:[])])]) {
    if (RULES.protectionBlocksPoison && isProtected(g,poison)) event(g, 'poison-blocked', { target: poison });
    else kill(poison, 'poison');
  }
  for (const p of g.players) {
    if (p.alive && p.delayedDeathNight !== null && p.delayedDeathNight <= g.night) kill(p.id, 'delayed-bite');
  }
  if (isModernHunter(g) && g.settings?.hunterActiveShot) {
    for (const p of g.players) {
      const mark = p.hunterMark;
      if (mark?.active && mark.night === g.night) {
        kill(mark.target, 'shot');
        if (!mark.hitWolf) kill(p.id, 'hunter-miss');
      }
    }
  }
  if(isExtended(g))for(const attack of extraState(g).attacks)kill(attack.target,attack.cause);
  g.pendingDeaths = [...new Set([...g.pendingDeaths,...applyDeaths(g, causes)])];
  g.resolved = true;
}
function publishRoleChanges(g: Game) {
  for (const id of g.biteTargets) {
    const bitten = g.players.find(p => p.id === id)!;
    if (!bitten.alive || isProtected(g,id) || isHealed(g,id) || nightImmune(g,id,['bite'])) continue;
    if (id === g.alphaTarget) {
      bitten.role = 'wolf';
      const alpha = g.players.find(p => p.id === g.alphaActorId)!;
      alpha.alphaUsed = true;
      event(g, 'alpha-converted', { actor: alpha.id, target: id });
      event(g, 'transformed-to-wolf', { message: 'Bạn đã được Sói Alpha chuyển thành Ma Sói.' }, id);
    } else if (hasPower(g,bitten,'cursed') && !bitten.cursedTransformed) {
      bitten.cursedTransformed = true;
      if(bitten.role==='frankenstein')extraPlayer(g,id).powers=[...new Set([...(extraPlayer(g,id).powers??[]),'wolf'])];else bitten.role = 'wolf';
      event(g, 'cursed-transformed', { target: id });
      event(g, 'transformed-to-wolf', { message: 'Bạn đã bị Sói cắn và biến thành Ma Sói.' }, id);
    } else if (hasPower(g,bitten,'tough_guy') && bitten.delayedDeathNight === null) {
      bitten.delayedDeathNight = g.night + 1;
      event(g, 'bite-delayed', { target: id, deathNight: bitten.delayedDeathNight });
    }
  }
  for (const id of g.pendingDeaths) {
    const dead = g.players.find(p => p.id === id)!;
    if (hasPower(g,dead,'diseased') && g.events.some(e => e.night === g.night && e.type === 'death' && e.data.player === id && (e.data.causes as string[]).includes('bite'))) {
      g.wolvesBlockedNight = g.night + 1;
      event(g, 'wolves-infected', { blockedNight: g.wolvesBlockedNight });
    }
  }
  checkDoppelgangerInheritance(g, g.pendingDeaths);
}

function checkWinner(g: Game) {
  if(isExtended(g)&&!g.players.some(p=>p.role==='tanner'&&g.publicDead.includes(p.id)&&!g.extra!.withdrawn.includes(p.id))&&g.extra!.vampireVictims.some(id=>g.players.some(p=>p.id===id&&p.alive)))return;
  const alive = g.players.filter(p => p.alive);
  const special=isExtended(g)?independentWinner(g):null;
  if(special){g.winner=special;}else if (alive.length === 0) {
    g.winner = 'draw';
  } else if (
    g.lovers &&
    alive.length === 2 &&
    alive.every(p => g.lovers!.includes(p.id)) &&
    g.players.find(p => p.id === g.lovers![0])!.team === 'lovers'
  ) {
    g.winner = 'lovers';
  } else {
    const vampires=alive.filter(p=>p.role==='vampire');
    if(isExtended(g)&&vampires.length>0&&vampires.length>=alive.length-vampires.length)g.winner='vampires';
    const wolves = alive.filter(p => isWolf(p.role)).length;
    const blockers=isExtended(g)&&alive.some(p=>['cult_leader','blob','zombie','dracula','chupacabra','bogeyman'].includes(p.role));
    if(g.winner==='vampires'){}else if (wolves === 0 && vampires.length===0&&!blockers) {
      g.winner = 'village';
    } else {
      const pureWolves = alive.filter(p => isWolf(p.role) && p.team === 'wolves').length;
      if (pureWolves > 0 && alive.some(p=>isWolf(p.role)&&p.role!=='lone_wolf') && pureWolves >= alive.length - pureWolves || alive.length===1&&alive[0].role==='lone_wolf') g.winner = 'wolves';
      else g.winner = null;
    }
  }
  if (g.winner) {
    if(isExtended(g)){
     const e=extraState(g);e.winnerIds=g.players.filter(p=>!e.withdrawn.includes(p.id)&&!e.players[p.id]?.disqualified&&(g.winner==='tanner'?p.role==='tanner':g.winner==='lovers'?g.lovers?.includes(p.id):g.winner==='wolves'?(alive.length===1&&alive[0].role==='lone_wolf'?p.id===alive[0].id:p.team==='wolves'&&p.role!=='lone_wolf'):g.winner==='village'?p.team==='village':g.winner==='vampires'?p.role==='vampire':g.winner==='cult'?p.alive&&p.role==='cult_leader':p.role===g.winner)).map(p=>p.id);
     overrideWinner(g);
    }
    move(g, 'ended');
    event(g, 'game-ended', { winner: g.winner, ...(g.extra?.winnerIds?{winnerIds:g.extra.winnerIds}:{}) });
    g.events.at(-1)!.audience = 'public';
  }
}
// Administrative withdrawal is not a game death: no chained effects or inheritance.
// RoomService authorizes the moderator and persists the left-member marker/idempotency.
export function withdrawPlayer(input: Game, id: string): Game {
  const g = structuredClone(input);
  const p = g.players.find(p => p.id === id);
  requireRule(p, 'UNKNOWN_PLAYER');
  p.alive = false;
  if(isExtended(g))extraState(g).withdrawn.push(id);
  p.resources.hunterShot = 0;
  p.hunterMark = null;
  g.awake = g.awake.filter(v => v !== id);
  delete g.actions[id];
  if (g.step === 'wolves') g.actions = {}; // Consensus must reflect the remaining pack/targets.
  else if (['guard', 'cupid', 'doppelganger', 'dire_wolf', 'virginia_woolf', 'alpha_wolf', 'witch', 'hunter'].includes(g.step)) {
    for (const [actor, action] of Object.entries(g.actions)) {
      const affected = ('target' in action && action.target === id) || ('targets' in action && action.targets.includes(id)) || (action.type === 'potion' && (action.healTarget === id || action.poison === id));
      if (affected) {
        delete g.actions[actor];
        if ((g.step === 'dire_wolf' || g.step === 'virginia_woolf') && g.players.find(v => v.id === actor)?.deathBond?.target === id) g.players.find(v => v.id === actor)!.deathBond = null;
      }
    }
  }
  g.biteTargets = g.biteTargets.filter(v => v !== id);
  g.biteTarget = g.biteTargets[0] ?? null;
  for (const key of ['protectedTarget', 'healTarget', 'poisonTarget', 'alphaTarget', 'sacrificedCubId'] as const) if (g[key] === id) g[key] = null;
  for (const other of g.players) if (other.hunterMark?.target === id) other.hunterMark = null;
  g.pendingDeaths = g.pendingDeaths.filter(v => v !== id);
  g.pendingHunters = g.pendingHunters.filter(v => v !== id);
  if (!g.publicDead.includes(id)) g.publicDead.push(id);
  if (g.lovers?.includes(id)) { g.lovers = null; refreshTeams(g); }
  event(g, 'player-left', { player: id }); g.events.at(-1)!.audience = 'public';
  g.stepSequence++; // In-flight forms from before withdrawal must refresh.
  g.revision++;
  if (g.activeHunterId === id && g.step === 'hunter') continueHunters(g);
  else if (g.step !== 'ended' && !(g.step === 'review' && g.resolved)) checkWinner(g);
  return g;
}
function finishVerdictPowers(g:Game){
 if(!isExtended(g)||!g.verdictDone)return;
 const e=extraState(g);if(e.dayKills===0)for(const p of g.players.filter(p=>p.alive&&hasPower(g,p,'bigfoot')))extraPlayer(g,p.id).angry=true;
 const victims=[...new Set(e.vampireVictims)];e.vampireVictims=[];if(!victims.length)return;
 g.step='review';const dead=applyDeaths(g,new Map(victims.map(id=>[id,['drained']])));g.step='day';
 publishDeaths(g,dead);announceDeaths(g,dead);checkDoppelgangerInheritance(g,dead);
}
function moderatorCommand(g: Game, cmd: Command, now: number) {
  switch (cmd.type) {
    case 'wolfTimeout':{
      requireRule(isExtended(g)&&g.step==='wolves'&&g.players.some(p=>p.alive&&hasPower(g,p,'bogeyman')),'WRONG_PHASE');
      const voting=actors(g),choices=voting.map(id=>g.actions[id]);requireRule(voting.length>0&&!(choices.every(Boolean)&&choices.every(a=>JSON.stringify(a)===JSON.stringify(choices[0]))),'WOLVES_ALREADY_AGREED');
      extraState(g).wolfTimedOut=true;g.actions={};g.biteTargets=[];g.biteTarget=null;
      const sequence=nightSequence(g);move(g,sequence[sequence.indexOf('wolves')+1]??'review');event(g,'wolf-timeout',{});break;
    }
    case 'reviewNote':{
      requireRule(isExtended(g),'WRONG_PHASE');const note=[...extraState(g).notes].reverse().find(n=>n.actor===cmd.actor&&n.approved===null);requireRule(note,'INVALID_ACTION');note.approved=cmd.approve;
      event(g,'hint-reviewed',{actor:cmd.actor,approved:cmd.approve});if(cmd.approve){event(g,'ghost-hint',{text:note.text});g.events.at(-1)!.audience='public';}break;
    }
    case 'penalty':{
      requireRule(isExtended(g)&&!['ended','review'].includes(g.step),'WRONG_PHASE');const p=target(g,cmd.target);requireRule(p.role==='teen_wolf'||g.players.some(v=>v.initialRole==='mason'||hasPower(g,v,'mason')),'INVALID_TARGET');extraPlayer(g,p.id).disqualified=true;
      const e=extraState(g);e.penalties=[...new Set([...(e.penalties??[]),p.id])];
      event(g,'rule-penalty',{target:p.id});break;
    }
    case 'advance': advance(g); break;
    case 'resolve': resolve(g); break;
    case 'dayPhase': {
      // Day clocks exist from v11/schema6 onward. Deadlines use server time
      // and only signal; the moderator still transitions every phase manually.
      requireRule((g.rulesVersion === 'classic-core-v11' && g.schemaVersion === 6) ||
        (g.rulesVersion === 'classic-core-v12' && g.schemaVersion === 7) ||
        (g.rulesVersion === 'classic-core-v13' && g.schemaVersion === 8) ||
        (g.rulesVersion === RULES.version && g.schemaVersion === 9), 'DAY_PHASE_UNAVAILABLE');
      requireRule(g.step === 'day' && !g.winner, 'WRONG_PHASE');
      const phases = RULES.dayPhases;
      if (cmd.action === 'start') {
        requireRule(g.dayPhase != null, 'DAY_PHASE_DONE');
        g.dayPhaseEndsAt = now + g.settings!.dayTimers![g.dayPhase] * 1000;
      } else {
        const index = g.dayPhase == null ? -1 : phases.indexOf(g.dayPhase);
        requireRule(index >= 0, 'DAY_PHASE_DONE');
        g.dayPhase = index < phases.length - 1 ? phases[index + 1] : null;
        g.dayPhaseEndsAt = null;
      }
      break;
    }
    case 'publish': {
      requireRule(g.step === 'review' && g.resolved, 'NOT_READY_TO_PUBLISH');
      if (isModernHunter(g)) for (const p of g.players) if (!p.alive && p.role === 'hunter') p.resources.hunterShot = 0;
      publishDeaths(g, g.pendingDeaths);
      publishRoleChanges(g);
      publishDayPowers(g,event);
      event(g, 'morning', { dead: [...g.pendingDeaths] });
      g.events.at(-1)!.audience = 'public';
      queueHunters(g, g.pendingDeaths);
      g.postHunterStep = 'day';
      continueHunters(g);
      break;
    }
    case 'verdict': {
      requireRule(g.step === 'day' && !g.verdictDone, 'WRONG_PHASE');
      if (cmd.target === null && ['classic-core-v12', 'classic-core-v13', 'classic-core-v14'].includes(g.rulesVersion)) {
        // From v12 a no-execution morning spends the pre-game skip budget.
        requireRule((g.daySkipsUsed ?? 0) < g.settings!.skipVoteDays!, 'VOTE_REQUIRED');
        g.daySkipsUsed = (g.daySkipsUsed ?? 0) + 1;
      }
      g.verdictDone = !isExtended(g) || --extraState(g).verdictsRemaining === 0;
      if (cmd.target !== null) {
        const condemned = target(g, cmd.target);
        if (hasPower(g,condemned,'prince')) {
          event(g, 'prince-revealed', { player: condemned.id, role: 'prince' });
          g.events.at(-1)!.audience = 'public';
          finishVerdictPowers(g);checkWinner(g);
          return;
        }
        const dead = applyDeaths(g, new Map([[cmd.target, ['verdict']]]));
        if(isExtended(g))extraState(g).dayKills+=dead.length;
        publishDeaths(g, dead);
        event(g, 'verdict', { target: cmd.target });
        g.events.at(-1)!.audience = 'public';
        announceDeaths(g, dead.filter(id => id !== cmd.target));
        checkDoppelgangerInheritance(g, dead);
        queueHunters(g, dead);
        g.postHunterStep = 'day';
        finishVerdictPowers(g);continueHunters(g);
        return;
      } else {
        event(g, 'verdict', { target: null });
        g.events.at(-1)!.audience = 'public';
      }
      finishVerdictPowers(g);checkWinner(g);
      break;
    }
    case 'nextNight':
      requireRule(g.step === 'day' && g.verdictDone, 'VERDICT_REQUIRED');
      if(isExtended(g)){
       const e=extraState(g),signature=progressSignature(g);e.staleRounds=signature===e.roundStart?(e.staleRounds??0)+1:0;e.roundStart=signature;
       if(e.staleRounds>=2&&g.players.some(p=>p.alive&&['lone_wolf','vampire','chupacabra','cult_leader','bogeyman','blob','zombie','dracula'].includes(p.role))){g.winner='draw';e.winnerIds=[];move(g,'ended');event(g,'game-ended',{winner:'draw',winnerIds:[]});g.events.at(-1)!.audience='public';break;}
      }
      for (const p of g.players) p.hunterMark = null;
      if(isExtended(g)){const e=extraState(g);e.protectedTargets=[];e.healedTargets=[];e.poisonTargets=[];e.woke=[];e.attacks=[];e.pending=[];e.wolfTimedOut=false;}
      if(isExtended(g))for(const p of g.players.filter(p=>p.alive&&hasPower(g,p,'bigfoot')&&g.extra?.players[p.id]?.angry)){if(p.role==='frankenstein')extraPlayer(g,p.id).powers=[...new Set([...(extraPlayer(g,p.id).powers??[]),'wolf'])];else{p.role='wolf';p.team='wolves';}event(g,'transformed-to-wolf',{message:'Không ai bị treo cổ. Bạn đã chuyển thành Ma Sói.'},p.id);}
      g.night++; g.resolved = false; g.pendingDeaths = []; g.verdictDone = false;
      g.biteTargets = []; g.sacrificedCubId = null; g.alphaTarget = g.alphaActorId = null;
      g.biteTarget = g.protectedTarget = g.healTarget = g.poisonTarget = null;
      move(g, nextOpening(g)); break;
    default: throw new RuleError('INVALID_COMMAND');
  }
}
export function dispatch(input: Game, principal: Principal, request: Request, now = Date.now()): Game {
  // Version pairs are accepted exactly, including legacy snapshots. Old games
  // keep playing forever; chat requires v10/schema5, day clocks require v11/6.
  requireRule(input.rulesVersion === 'classic-core-v8' || input.rulesVersion === 'classic-core-v9' ||
    input.rulesVersion === 'classic-core-v10' || input.rulesVersion === 'classic-core-v11' || input.rulesVersion === 'classic-core-v12' || input.rulesVersion === 'classic-core-v13' ||
    input.rulesVersion === RULES.version, 'UNSUPPORTED_RULES_VERSION');
  const expectedSchema = input.rulesVersion === 'classic-core-v8' ? 3
    : input.rulesVersion === 'classic-core-v9' ? 4
    : input.rulesVersion === 'classic-core-v10' ? 5
    : input.rulesVersion === 'classic-core-v11' ? 6 : input.rulesVersion === 'classic-core-v12' ? 7 : input.rulesVersion === 'classic-core-v13' ? 8 : 9;
  requireRule(isExtended(input)||input.players.every(p=>LEGACY_V13_ROLES.includes(p.role)), 'UNSUPPORTED_ROLE');
  requireRule(input.schemaVersion === expectedSchema, 'UNSUPPORTED_SCHEMA_VERSION');
  requireRule(input.rulesVersion === 'classic-core-v8' || typeof input.settings?.witchSeesBite === 'boolean', 'INVALID_SETTINGS');
  requireRule(request.gameId === input.id && typeof request.id === 'string' && request.id.length > 0 && request.id.length <= 128, 'INVALID_REQUEST');
  requireRule(principal.kind === 'moderator' || (principal.kind === 'player' && input.players.some(p => p.id === principal.playerId)), 'FORBIDDEN');
  const key = JSON.stringify([principal.kind, principal.kind === 'player' ? principal.playerId : '', request.id]);
  const fingerprint = JSON.stringify([request.gameId, request.stepId, request.command]);
  const prior = input.receipts[key];
  if (prior) { requireRule(prior.fingerprint === fingerprint, 'REQUEST_ID_REUSED'); return structuredClone(input); }
  requireRule(request.stepId === stepId(input), 'STALE_STEP');
  const g = structuredClone(input), cmd = request.command;
  const windowStep = stepId(input);
  const window = g.requestWindow?.step === windowStep ? g.requestWindow : { step: windowStep, counts: {} };
  const sender = principal.kind === 'moderator' ? 'moderator' : principal.playerId;
  const transition = principal.kind === 'moderator' && ['advance', 'resolve', 'publish', 'verdict', 'nextNight', 'reviewNote','penalty','wolfTimeout'].includes(cmd.type);
  const firstAction = principal.kind === 'player' && cmd.type === 'act' && !Object.hasOwn(g.actions, principal.playerId);
  requireRule(transition || firstAction || principal.kind === 'player' && principal.proxy || (Object.hasOwn(window.counts,sender)?window.counts[sender]:0) < 64, 'REQUEST_LIMIT');
  Object.defineProperty(window.counts,sender,{value:(Object.hasOwn(window.counts,sender)?window.counts[sender]:0)+1,enumerable:true,writable:true,configurable:true});
  g.requestWindow = window;
  if (cmd.type === 'wake' || cmd.type === 'act') {
    requireRule(principal.kind === 'player', 'PLAYER_REQUIRED');
    const id = principal.playerId;
    requireRule(actors(g).includes(id), 'NOT_YOUR_TURN');
    if (cmd.type === 'wake') {
      if (!g.awake.includes(id)) g.awake.push(id);
      if (g.step === 'wolves' && isExtended(g)) {const p=g.players.find(p=>p.id===id)!;p.knownWolves=[...new Set([...p.knownWolves,...g.players.filter(v=>hasPower(g,v,'minion')||v.role==='frankenstein'&&roleCanWake(g,v)).map(v=>v.id)])];}
      if (g.step === 'wolves') g.players.find(p => p.id === id)!.knownWolves = packMembers(g, g.players.find(p => p.id === id)!)!.map(p => p.id);
    }
    else applyAction(g, id, cmd.action);
  } else if (cmd.type === 'chat') {
    applyChat(g, principal, cmd.text);
  } else {
    requireRule(principal.kind === 'moderator', 'MODERATOR_REQUIRED'); moderatorCommand(g, cmd, now);
  }
  g.revision++;
  g.receipts[key] = { fingerprint, revision: g.revision };
  return g;
}
// Pack chat is only available to awake wolves during the wolves step. The
// engine, never the client, decides the recipients: the currently awake pack.
// Sleeping wolves keep their old information and undiscovered Dream Wolves are
// not pack actors yet, so neither ever receives a message.
function applyChat(g: Game, principal: Principal, raw: string) {
  requireRule(principal.kind === 'player', 'PLAYER_REQUIRED');
  requireRule((g.rulesVersion === 'classic-core-v10' && g.schemaVersion === 5) ||
    (g.rulesVersion === 'classic-core-v11' && g.schemaVersion === 6) ||
    (g.rulesVersion === 'classic-core-v12' && g.schemaVersion === 7) ||
        (g.rulesVersion === 'classic-core-v13' && g.schemaVersion === 8) ||
        (g.rulesVersion === RULES.version && g.schemaVersion === 9), 'CHAT_UNAVAILABLE');
  requireRule(g.step === 'wolves', 'WRONG_PHASE');
  requireRule(actors(g).includes(principal.playerId), 'NOT_YOUR_TURN');
  requireRule(g.awake.includes(principal.playerId), 'NOT_AWAKE');
  const text = typeof raw === 'string' ? raw.trim() : '';
  requireRule(text.length > 0 && text.length <= 200 && !/[\u0000-\u001f\u007f]/u.test(text), 'INVALID_MESSAGE');
  requireRule((g.chat?.length ?? 0) < 200, 'CHAT_FULL');
  g.chat ??= [];
  g.chat.push({ id: g.chat.length + 1, night: g.night, from: principal.playerId, recipients: [...wolfActors(g)], text });
}
