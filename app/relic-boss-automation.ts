import type {GameState} from './game-state';
import {relicDungeonAction,type RelicDungeonState} from './relic-dungeon';
import {relicRewardRandom,settleRelicRewards} from './relic-reward-settlement';

export const RELIC_OFFLINE_ROUNDS_PER_TICK=300;
/** Invalid clocks must not grant an arbitrary offline backlog or restart a battle. */
export function normalizeRelicBossAutomation(state:RelicDungeonState):RelicDungeonState {
  const valid=state.status==='boss'&&state.autoBattle===true&&Number.isSafeInteger(state.nextBossAttackAt)&&Number(state.nextBossAttackAt)>0;
  return {...state,autoBattle:valid,nextBossAttackAt:valid?state.nextBossAttackAt:0};
}

/** Replay scheduled seconds through the actual strike and reward paths, with bounded work. */
export function settleDueRelicBossBattle(game:GameState,now:number,rewardSeed:number,roundBudget=RELIC_OFFLINE_ROUNDS_PER_TICK):GameState {
  if(!Number.isFinite(now))return game;
  const random=relicRewardRandom(rewardSeed);
  let next=game;
  const budget=Number.isFinite(roundBudget)?Math.min(RELIC_OFFLINE_ROUNDS_PER_TICK,Math.max(1,Math.floor(roundBudget))):RELIC_OFFLINE_ROUNDS_PER_TICK;
  for(let round=0;round<budget;round++) {
    const before=next.relicDungeon;
    if(!before||before.status!=='boss'||before.autoBattle!==true)return next;
    const due=before.nextBossAttackAt;
    if(!Number.isSafeInteger(due)||Number(due)<=0)return {...next,relicDungeon:normalizeRelicBossAutomation(before)};
    if(now<Number(due))return next;
    const after=relicDungeonAction(before,'attack-boss',before.dispatchPower||before.partyPower,{
      now:Number(due),maxHp:before.maxHp,currentHp:before.hp,partyPower:before.dispatchPower,
      partyNames:before.dispatchPartyNames,partyReady:before.hp>0,
    });
    next=settleRelicRewards(next,before,after,'attack-boss',random);
  }
  // Keep the next scheduled second: work left by the cap is not discarded or rewarded early.
  return next;
}
