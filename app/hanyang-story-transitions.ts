import type { GameState } from './game-state';

/** Shared delivery transition, using the caller's existing quest target. */
export function syncHanyangDeliveryKills(state: GameState, target: number): GameState {
  const step = state.hanyangPrologueStep;
  if ((step === 'outskirts' || step === 'first-sale') && state.starterDeliveryKills < target) {
    return step === 'outskirts' ? state : { ...state, hanyangPrologueStep: 'outskirts' };
  }
  if ((step === 'outskirts' || step === 'first-battle') && state.starterDeliveryKills >= target) {
    return { ...state, hanyangPrologueStep: 'first-sale' };
  }
  return state;
}

/** Shared by the UI effect and headless flow audits; preserves existing story gates. */
export function syncHanyangReturnProgress(state: GameState): GameState {
  if (state.hanyangPrologueStep === 'bandit-trial' && state.dungeon?.status !== 'fighting') {
    const victory = state.dungeon?.logs.some(entry => entry.includes('成功擊敗') && (entry.includes('黑巾斥候') || entry.includes('黑巾山賊')));
    if (victory) return { ...state, hanyangPrologueStep: 'caravan-delivery', hanyangPrologueFlags: { ...state.hanyangPrologueFlags, caravanRestored: true }, dungeon: state.dungeon ? { ...state.dungeon, status: 'idle', autoHunt: false } : state.dungeon };
  }
  if (state.hanyangPrologueStep === 'return' && !state.hanyangPrologueFlags.caravanCargoDelivered) return { ...state, hanyangPrologueStep: 'caravan-delivery' };
  return state;
}
