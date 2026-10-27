import type { Role, Team } from './types.ts';

// Actual faction/ability and information returned by a Seer are distinct.
export function isWolf(role: Role): boolean { return ['wolf', 'wolf_man', 'wolf_cub', 'big_bad_wolf', 'alpha_wolf', 'dire_wolf', 'fruit_wolf', 'fang_face', 'dream_wolf','wolverine','lone_wolf','teen_wolf'].includes(role); }
export function seenAsWolf(role: Role): boolean { return role === 'lycan' || role==='bigfoot' || (isWolf(role) && role !== 'wolf_man'); }
export function baseTeam(role: Role): Team { if(role==='vampire')return 'vampires';if(role==='cult_leader')return 'cult';if(['chupacabra','bogeyman','blob','zombie','dracula','tanner','hoodlum','nostradamus'].includes(role))return 'independent';return isWolf(role) || role==='minion' || role==='sorceress' ? 'wolves' : 'village'; }
export function hasSpecialAbility(role: Role): boolean { return role !== 'wolf' && role !== 'villager'; }
