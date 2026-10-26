import type { Game } from '../../src/engine/types.ts';
// Explicit compatibility fixture: existing saved v12 games retain death-time shots.
// New nightly-pin rules are tested independently in hunter-night.test.ts.
export function legacyHunter(g: Game): Game {
  g.rulesVersion = 'classic-core-v12'; g.schemaVersion = 7;
  return g;
}
