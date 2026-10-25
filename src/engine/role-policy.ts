import type { Role } from './types.ts';

// Actual faction/ability and information returned by a Seer are distinct.
export function isWolf(role: Role): boolean { return ['wolf', 'wolf_man', 'wolf_cub', 'big_bad_wolf', 'alpha_wolf', 'dire_wolf', 'fruit_wolf', 'fang_face', 'dream_wolf'].includes(role); }
export function seenAsWolf(role: Role): boolean { return role === 'lycan' || (isWolf(role) && role !== 'wolf_man'); }
export function baseTeam(role: Role): 'wolves' | 'village' { return isWolf(role) ? 'wolves' : 'village'; }
export function hasSpecialAbility(role: Role): boolean { return role !== 'wolf' && role !== 'villager'; }
