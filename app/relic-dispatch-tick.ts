import type {GameState} from './game-state';
import {relicDungeonAction} from './relic-dungeon';
import {relicRewardRandom,settleRelicRewards} from './relic-reward-settlement';

/** Dispatch completion is a global clock event, independent of the active tab. */
export function settleDueRelicDispatch(game:GameState,now:number,rewardSeed:number):GameState {
  const before=game.relicDungeon;
  if(!before||before.status!=='dispatching'||!Number.isFinite(now)||now<before.dispatchEndsAt)return game;
  const after=relicDungeonAction(before,'claim',before.dispatchPower,{
    now,maxHp:before.maxHp,currentHp:before.hp,partyPower:before.dispatchPower,
    partyEquipmentScore:before.dispatchEquipmentScore,partyNames:before.dispatchPartyNames,
    partyUids:before.dispatchPartyUids,partyReady:before.dispatchPartyNames.length>0,
  });
  return settleRelicRewards(game,before,after,'claim',relicRewardRandom(rewardSeed));
}
