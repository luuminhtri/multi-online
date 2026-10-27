import { hasPower } from './power-policy.ts';
import { isWolf } from './role-policy.ts';
import type { Action, Game, Player } from './types.ts';

// Views use published life state so unresolved night deaths cannot change what
// a sleeping wolf learns. Command validation uses authoritative life state.
export function roleCanWake(g: Game, p: Player, published = false): boolean {
  if (g.rulesVersion==='classic-core-v14' && hasPower(g,p,'minion')) return published ? !g.publicDead.includes(p.id) : p.alive;
  if (!isWolf(p.role)&&!(p.role==='frankenstein'&&g.extra?.players[p.id]?.powers?.some(r=>isWolf(r as Player['role'])))) return false;
  const alive = (v: Player) => published ? !g.publicDead.includes(v.id) : v.alive;
  if (!alive(p)) return false;
  if(p.role==='frankenstein'){const powers=g.extra?.players[p.id]?.powers?.filter(r=>isWolf(r as Player['role']))??[];if(powers.length&&powers.every(r=>r==='dream_wolf'||r==='fang_face'))return powers.includes('dream_wolf')&&g.wolfDeathOccurred||powers.includes('fang_face')&&(g.night===1||!g.players.some(v=>v.id!==p.id&&alive(v)&&isWolf(v.role)));}
  if (p.role === 'dream_wolf') return g.wolfDeathOccurred;
  if (p.role === 'fang_face') return g.night === 1 || !g.players.some(v => v.id !== p.id && alive(v) && isWolf(v.role));
  return true;
}
export function packMembers(g: Game, viewer: Player): Player[] | null {
  if(g.rulesVersion==='classic-core-v14' && (hasPower(g,viewer,'minion')||viewer.role==='frankenstein'&&roleCanWake(g,viewer))) return g.players.filter(p=>isWolf(p.role)||hasPower(g,p,'minion')||p.role==='frankenstein'&&roleCanWake(g,p));
  if (!isWolf(viewer.role) || (viewer.role === 'dream_wolf' && !g.wolfDeathOccurred)) return null;
  if (!roleCanWake(g, viewer, true)) {
    return g.players.filter(p => isWolf(p.role) && (p.id === viewer.id || viewer.knownWolves.includes(p.id)));
  }
  return g.players.filter(p => (isWolf(p.role) || g.rulesVersion==='classic-core-v14' && (hasPower(g,p,'minion')||p.role==='frankenstein'&&roleCanWake(g,p,true)) && viewer.knownWolves.includes(p.id)) && (
    viewer.knownWolves.includes(p.id) || p.id === viewer.id ||
    (!g.publicDead.includes(p.id) && (p.role !== 'dream_wolf' || g.wolfDeathOccurred))
  ));
}
export function canWolfTarget(g: Game, viewer: Player, target: Player): boolean {
  return target.alive && (g.rulesVersion==='classic-core-v14' && (hasPower(g,viewer,'minion')||viewer.role==='frankenstein') && target.role==='dream_wolf' && !g.wolfDeathOccurred || !(packMembers(g, viewer) ?? []).some(p => p.id === target.id));
}
export function canSacrifice(g: Game): boolean {
  return g.sacrificedCubId === null && g.wolvesBlockedNight !== g.night &&
    g.players.filter(p => p.alive && isWolf(p.role)).every(p => roleCanWake(g, p));
}
export function wolfActors(g: Game): string[] {
  return g.wolvesBlockedNight === g.night ? [] : g.players.filter(p => roleCanWake(g, p) && p.id !== g.sacrificedCubId).map(p => p.id);
}
export function fruitMustFast(g: Game): boolean {
  const alive = g.players.filter(p => p.alive && isWolf(p.role) && p.id !== g.sacrificedCubId);
  return !g.players.some(p=>p.alive&&p.role==='frankenstein'&&g.extra?.players[p.id]?.powers?.some(r=>isWolf(r as Player['role'])&&r!=='fruit_wolf'))&&alive.length === 1 && alive[0].role === 'fruit_wolf';
}
export function wolfPlan(g: Game) {
  const voting=wolfActors(g).map(id=>g.players.find(p=>p.id===id)!);
  const targets = g.players.filter(p=>p.alive&&voting.every(viewer=>canWolfTarget(g,viewer,p))).length;
  const blocked = g.wolvesBlockedNight === g.night || wolfActors(g).length === 0 || fruitMustFast(g);
  const revenge = g.doubleAttackNight === g.night || g.sacrificedCubId !== null;
  const big = g.players.some(p => p.alive && hasPower(g,p,'big_bad_wolf'));
  return {
    minTargets: blocked ? 0 : Math.min(revenge ? 2 : 1, targets),
    maxTargets: blocked ? 0 : Math.min(revenge || big ? 2 : 1, targets),
    adjacentPair: !revenge && big,
  };
}
// A plan exposes capabilities, never the identity of a Big Bad Wolf.
export function adjacentLivingSeats(g: Game, a: string, b: string): boolean {
  const ids = g.players.filter(p => p.alive).map(p => p.id);
  const index = ids.indexOf(a), other = ids.indexOf(b);
  return index >= 0 && other >= 0 && a !== b &&
    (ids[(index + 1) % ids.length] === b || ids[(index + ids.length - 1) % ids.length] === b);
}
export function biteChoices(action: Action): string[] | null {
  return action.type === 'bite' ? [action.target] : action.type === 'maul' ? [...action.targets] : null;
}
export function offeredCub(g: Game): string | null {
  if (g.sacrificedCubId !== null) return null;
  return g.players.find(p => p.alive && hasPower(g,p,'wolf_cub') &&
    g.actions[p.id]?.type === 'sacrifice' && (g.actions[p.id] as { target: string }).target === p.id)?.id ?? null;
}
