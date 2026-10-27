import { isProtected } from './power-policy.ts';
import { nightImmune } from './extensions.ts';
import type { Game } from './types.ts';

export const legacyWitchRules = (g: Game) => g.rulesVersion === 'classic-core-v8' && g.schemaVersion === 3;
export const witchSeesBite = (g: Game) => legacyWitchRules(g) || g.settings?.witchSeesBite === true;

// This list is private to the engine. Never serialize it in hidden mode.
export function healableBites(g: Game): string[] {
  return legacyWitchRules(g) ? [...g.biteTargets] : g.biteTargets.filter(id => !isProtected(g,id) && !nightImmune(g,id,['bite']));
}
