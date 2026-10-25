export type Role = 'wolf' | 'villager' | 'seer' | 'guard' | 'witch' | 'hunter' | 'cupid' | 'cursed' | 'doppelganger' | 'apprentice_seer' | 'aura_seer' | 'mystic_seer' | 'mentalist' | 'lycan' | 'wolf_man' | 'tough_guy' | 'diseased' | 'prince' | 'mad_bomber' | 'wolf_cub' | 'big_bad_wolf' | 'alpha_wolf' | 'dire_wolf' | 'virginia_woolf' | 'fruit_wolf' | 'fang_face' | 'dream_wolf';
export type Team = 'wolves' | 'village' | 'lovers';
export type Step = 'dire_wolf' | 'virginia_woolf' | 'alpha_wolf' | 'aura_seer' | 'mystic_seer' | 'mentalist' | 'cupid' | 'doppelganger' | 'guard' | 'seer' | 'wolves' | 'witch' | 'hunter' | 'review' | 'day' | 'ended';
export type Principal = { kind: 'moderator' } | { kind: 'player'; playerId: string };
export interface Player {
  id: string;
  name: string;
  initialRole: Role;
  role: Role;
  team: Team;
  alive: boolean;
  lastProtected: string | null;
  delayedDeathNight: number | null;
  alphaUsed: boolean;
  deathBond: { kind: 'follow' | 'revenge'; target: string } | null;
  knownWolves: string[];
  resources: { heal: number; poison: number; hunterShot: number };
  cursedTransformed?: boolean;
  doppelgangerTarget?: string | null;
}
export type Action =
  | { type: 'protect'; target: string }
  | { type: 'inspect'; target: string }
  | { type: 'compare'; targets: [string, string] }
  | { type: 'bond'; target: string }
  | { type: 'fast' }
  | { type: 'bite'; target: string }
  | { type: 'maul'; targets: string[] }
  | { type: 'sacrifice'; target: string }
  | { type: 'convert'; target: string | null }
  | { type: 'potion'; heal: boolean; healTarget?: string; poison: string | null }
  | { type: 'pair'; targets: [string, string] }
  | { type: 'shoot'; target: string }
  | { type: 'mimic'; target: string };
export type Command =
  | { type: 'wake' }
  | { type: 'act'; action: Action }
  | { type: 'advance' }
  | { type: 'resolve' }
  | { type: 'publish' }
  | { type: 'verdict'; target: string | null }
  | { type: 'nextNight' };
export interface Request {
  id: string;
  gameId: string;
  stepId: string;
  command: Command;
}
export interface GameEvent {
  id: number;
  night: number;
  type: string;
  audience: 'moderator' | 'public' | 'private';
  recipient?: string;
  data: Record<string, unknown>;
}
export interface Game {
  schemaVersion: 3;
  id: string;
  rulesVersion: string;
  revision: number;
  night: number;
  step: Step;
  stepSequence: number;
  players: Player[];
  awake: string[];
  actions: Record<string, Action>;
  wolfDeathOccurred: boolean;
  wolvesBlockedNight: number | null;
  // biteTarget is a compatibility alias for the first committed target.
  biteTarget: string | null;
  biteTargets: string[];
  doubleAttackNight: number | null;
  sacrificedCubId: string | null;
  alphaEligibleNight: number | null;
  alphaTarget: string | null;
  alphaActorId: string | null;
  protectedTarget: string | null;
  healTarget: string | null;
  poisonTarget: string | null;
  resolved: boolean;
  pendingDeaths: string[];
  publicDead: string[];
  verdictDone: boolean;
  winner: Team | 'draw' | null;
  lovers: [string, string] | null;
  pendingHunters: string[];
  activeHunterId: string | null;
  postHunterStep: Step;
  events: GameEvent[];
  receipts: Record<string, { fingerprint: string; revision: number }>;
}
