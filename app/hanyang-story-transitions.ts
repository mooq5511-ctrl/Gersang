import type { GameState } from './game-state';
import {battleExperienceMultiplier,equipmentExperienceMultiplier,sharedBattleExperience} from './dungeon-kill-xp';
import {grantTerritoryXp} from './game-progression';

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
    if (victory) {
      const activeIds=new Set(state.active),deployed=state.mercs.filter(unit=>activeIds.has(unit.uid));
      // Preserve the original first-trial XP (40 encounter + 130 story), not
      // the old 170 XP on every repeatable scout. Existing story flag is the receipt.
      const bonus=state.hanyangPrologueFlags.caravanRestored?0:sharedBattleExperience(
        130*battleExperienceMultiplier(state.hero.level,deployed.length)*equipmentExperienceMultiplier([state.hero,...deployed]),1+deployed.length);
      return { ...state, hero:bonus?grantTerritoryXp(state,state.hero,bonus):state.hero,
        mercs:bonus?state.mercs.map(unit=>activeIds.has(unit.uid)?grantTerritoryXp(state,unit,bonus):unit):state.mercs,
        logs:bonus?[`首次斥候試煉完成：獲得130基礎經驗的商路訓練獎勵，按出戰隊伍均分（只領取一次）。`,...state.logs].slice(0,40):state.logs,
        hanyangPrologueStep: 'caravan-delivery', hanyangPrologueFlags: { ...state.hanyangPrologueFlags, caravanRestored: true }, dungeon: state.dungeon ? { ...state.dungeon, status: 'idle', autoHunt: false } : state.dungeon };
    }
  }
  if (state.hanyangPrologueStep === 'return' && !state.hanyangPrologueFlags.caravanCargoDelivered) return { ...state, hanyangPrologueStep: 'caravan-delivery' };
  return state;
}
