import { actors, stepId } from './engine.ts';
import { offeredCub, wolfPlan, packMembers, roleCanWake, canSacrifice, canWolfTarget } from './wolf-pack.ts';
import { ROLES } from './rules.ts';
import type { Game } from './types.ts';

// Explicit allowlists: never serialize the whole Game to a player or public channel.
export function publicView(g: Game) {
  return {
    gameId: g.id, night: g.night,
    phase: g.step === 'ended' ? 'ended' : (g.step === 'day' || g.step === 'hunter') ? 'day' : 'night',
    winner: g.winner,
    players: g.players.map(p => ({ id: p.id, name: p.name, alive: !g.publicDead.includes(p.id) })),
    announcements: structuredClone(g.events.filter(e => e.audience === 'public').map((e, i) => ({ ...e, id: i + 1 }))),
  };
}
export function playerView(g: Game, id: string) {
  const p = g.players.find(p => p.id === id);
  if (!p) throw new Error('UNKNOWN_PLAYER');
  // Use the published life state until morning: an early death flag leaks night results.
  const canAct = actors(g).includes(id);
  const pack = packMembers(g, p);
  return {
    ...publicView(g),
    self: { id, role: p.role, description: ROLES[p.role].description, team: p.team,
      resources: { ...p.resources } },
    turn: canAct ? {
      stepId: stepId(g), ability: g.step, awake: g.awake.includes(id),
      submitted: Object.hasOwn(g.actions, id),
      action: Object.hasOwn(g.actions, id) ? structuredClone(g.actions[id]) : null,
      wolfPlan: g.step === 'wolves' ? { ...wolfPlan(g),
        sacrificeTarget: offeredCub(g),
        canOfferSacrifice: p.role === 'wolf_cub' && canSacrifice(g),
      } : null,
      targets: g.players.filter(t => t.alive && (
        g.step === 'wolves' ? canWolfTarget(g, p, t) :
        g.step === 'alpha_wolf' ? g.biteTargets.includes(t.id) :
        ['seer', 'aura_seer', 'mystic_seer', 'mentalist'].includes(g.step) || g.step === 'hunter' || g.step === 'doppelganger' || g.step === 'dire_wolf' || g.step === 'virginia_woolf' ? t.id !== id :
        g.step === 'guard' ? t.id !== p.lastProtected : true
      )).map(t => t.id),
    } : null,
    deathBond: (p.role === 'dire_wolf' || p.role === 'virginia_woolf') && p.deathBond ? structuredClone(p.deathBond) : null,
    lover: g.lovers && g.lovers.includes(id) ? {
      partnerId: g.lovers[0] === id ? g.lovers[1] : g.lovers[0],
      partnerName: g.players.find(pl => pl.id === (g.lovers![0] === id ? g.lovers![1] : g.lovers![0]))!.name,
    } : null,
    mimic: p.doppelgangerTarget ? {
      targetId: p.doppelgangerTarget,
      targetName: g.players.find(pl => pl.id === p.doppelgangerTarget)!.name,
    } : null,
    // Legacy single-target convenience is intentionally null for a multi-bite.
    biteTarget: g.step === 'witch' && p.role === 'witch' && p.alive && p.resources.heal > 0 && g.biteTargets.length === 1 ? g.biteTargets[0] : null,
    biteTargets: g.step === 'witch' && p.role === 'witch' && p.alive && p.resources.heal > 0 ? [...g.biteTargets] : [],
    alphaAvailable: p.role === 'alpha_wolf' ? !p.alphaUsed : null,
    wolvesBlocked: roleCanWake(g, p, true) ? g.wolvesBlockedNight === g.night : null,
    pack: pack ? pack.map(t => ({
      id: t.id, alive: !g.publicDead.includes(t.id),
      choice: g.step === 'wolves' && canAct && Object.hasOwn(g.actions, t.id) ? structuredClone(g.actions[t.id]) : null,
    })) : null,
    messages: structuredClone(g.events.filter(e => e.audience === 'private' && e.recipient === id).map((e, i) => ({ ...e, id: i + 1 }))),
  };
}
export function moderatorView(g: Game) {
  return { ...structuredClone(g), stepId: stepId(g), progress: actors(g).map(id => ({
    id, awake: g.awake.includes(id), submitted: Object.hasOwn(g.actions, id),
  })) };
}
