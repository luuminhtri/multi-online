import type { Game, Player, Role } from './types.ts';
// An inherited ability does not change the holder's actual role or allegiance.
export function hasPower(g: Game,p: Player,role:Role|string): boolean {
 return p.role===role || g.rulesVersion==='classic-core-v14'&&p.role==='frankenstein'&&!!g.extra?.players[p.id]?.powers?.includes(role);
}

export function isProtected(g:Game,id:string){return id===g.protectedTarget||g.rulesVersion==='classic-core-v14'&&!!g.extra?.protectedTargets?.includes(id);}
export function isHealed(g:Game,id:string){return id===g.healTarget||g.rulesVersion==='classic-core-v14'&&!!g.extra?.healedTargets?.includes(id);}
