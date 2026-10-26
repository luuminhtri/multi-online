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
  hunterMark?: { target: string; night: number; active?: boolean; hitWolf?: boolean } | null;
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
  | { type: 'hold' }
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
  | { type: 'chat'; text: string }
  | { type: 'dayPhase'; action: 'start' | 'next' }
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
  // v8/schema3 through v10/schema5 snapshots retain their original rules; new
  // games use v13/schema8 (Hunter mode); v12/schema7 (day clocks since v11, mandatory-vote budget since
  // v12). Older optional fields exist only in later schemas.
  schemaVersion: 3 | 4 | 5 | 6 | 7 | 8;
  settings?: GameSettings;
  id: string;
  rulesVersion: string;
  revision: number;
  night: number;
  step: Step;
  stepSequence: number;
  players: Player[];
  awake: string[];
  actions: Record<string, Action>;
  chat?: ChatMessage[];
  dayPhase?: DayPhase | null;
  dayPhaseEndsAt?: number | null;
  // No-execution mornings used so far (v12 budget from settings.skipVoteDays).
  daySkipsUsed?: number;
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
export interface GameSettings { witchSeesBite: boolean; hunterActiveShot?: boolean; dayTimers?: DayTimers; skipVoteDays?: number; }
// Pack chat: recipients are computed by the engine at send time (awake pack
// members only). Sleepers and undiscovered Dream Wolves are never recipients.
export interface ChatMessage { id: number; night: number; from: string; recipients: string[]; text: string; }
// Day phase clocks run on server time; the moderator starts each one manually.
export type DayPhase = 'discussion' | 'nomination' | 'defense' | 'finalvote';
export interface DayTimers { discussion: number; nomination: number; defense: number; finalvote: number; }
