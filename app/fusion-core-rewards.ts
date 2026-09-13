import type { GameState } from './game-state';

/** Pure reward helper. It clamps invalid amounts and never mutates the input state. */
export function awardFusionCores(state: GameState, amount: number): GameState {
  const awarded = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
  return awarded === 0 ? state : { ...state, fusionCores: state.fusionCores + awarded };
}
