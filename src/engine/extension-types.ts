export const EXTRA_ROLE_IDS = ['ghost','idiot','mason','mayor','old_hag','pacifist','paranormal_investigator','priest','spellcaster','troublemaker','minion','sorceress','lone_wolf','drunk','cult_leader','hoodlum','tanner','vampire','wolverine','revealer','huntress','bigfoot','nostradamus','bloody_mary','leprechaun','chupacabra','beholder','count','insomniac','the_thing','bogeyman','frankenstein','blob','zombie','dracula','mummy','teen_wolf'] as const;
export type ExtraRole = typeof EXTRA_ROLE_IDS[number];
export const EXTRA_OPENING = ['drunk','mason','minion','beholder','count','nostradamus','hoodlum'] as const;
export const EXTRA_NIGHT = ['paranormal_investigator','priest','sorceress','old_hag','spellcaster','leprechaun','vampire','chupacabra','huntress','revealer','cult_leader','blob','zombie','dracula','mummy','troublemaker','the_thing','bogeyman','ghost','bloody_mary','insomniac'] as const;
export type ExtraStep = typeof EXTRA_OPENING[number] | typeof EXTRA_NIGHT[number];
export interface ExtraPlayer {
  initialized?: string[]; used?: string[]; blessed?: boolean; powers?: string[];
  marked?: string[]; prediction?: string; cult?: string[]; invaded?: string[]; brainEaten?: string[]; brides?: string[];
  drawnRole?: ExtraRole | string; killerId?:string; bridesAt?: number; angry?: boolean; grudge?: string; deathNight?: number; disqualified?: boolean;
}
export interface ExtraState {
  players: Record<string, ExtraPlayer>;
  woke: string[]; everWoke: string[]; withdrawn: string[];
  attacks: { actor: string; target: string; cause: string }[];
  pending: { actor: string; target: string; kind: string }[];
  day: { absent: string[]; silent: string[]; mummy: { actor: string; target: string }[]; brainEaten: string[] };
  verdictsRemaining: number; dayKills: number;
  roundStart?:string; staleRounds?:number; wolfTimedOut: boolean; penalties?:string[]; protectedTargets?:string[]; healedTargets?:string[]; poisonTargets?:string[];
  vampireVictims: string[];
  notes: { actor: string; text: string; approved: boolean | null }[];
  winnerIds?: string[]; additionalWins?: string[];
}
export interface ExtraTurn {
  kind: ExtraStep; count: number; allowPass: boolean;
  input: 'targets' | 'ack' | 'note' | 'prediction' | 'draw';
  choices?: string[];
}
