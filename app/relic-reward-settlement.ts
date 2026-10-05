import type {GameState} from './game-state';
import type {RelicDungeonAction,RelicDungeonState} from './relic-dungeon';
import {rollRelicEquipment} from './game-equipment-factory';
import {relicDropEquipmentLevel} from './relic-equipment-rewards';
import {relicMaterialLoot} from './relic-material-loot';
import {positionInventory} from './inventory-layout';
import {appendGameLog} from './game-runtime-actions';
import {settleRelicWarSeal} from './war-seals';
import {syncRelicPartyHealth} from './relic-party';

/** Settle only a newly accepted transition of the authoritative current expedition. */
export function settleRelicRewards(
  game:GameState,before:RelicDungeonState,after:RelicDungeonState,
  action:RelicDungeonAction,random:()=>number,
):GameState {
  if(game.relicDungeon&&game.relicDungeon!==before)return game;
  if(action==='attack-boss'&&before.status==='boss'&&after.bossTurn>before.bossTurn)game=syncRelicPartyHealth(game,before.dispatchPartyUids,after.hp,after.maxHp);
  if(after.status!=='boss')after={...after,autoBattle:false,nextBossAttackAt:0};
  const cleared=action==='attack-boss'&&before.status==='boss'&&after.status==='cleared'&&after.clearedRuns===before.clearedRuns+1;
  const claimed=action==='claim'&&before.status==='dispatching'&&before.dispatchEndsAt>0&&after.dispatchEndsAt===0&&(after.status==='idle'||after.status==='ready');
  const explored=action==='explore'&&before.status==='exploring'&&(after.roomIndex>before.roomIndex||after.status!==before.status);
  if(!cleared&&!claimed&&!explored)return {...game,relicDungeon:after};
  const reward=after.lastReward;
  const monsterId=cleared?before.bossMonsterId:after.encounterMonsterId;
  const items=Array.from({length:reward.equipment},()=>rollRelicEquipment(relicDropEquipmentLevel(monsterId),random,cleared));
  const loot=reward.gold&&(claimed||cleared)?relicMaterialLoot(monsterId,[random(),random()]):[];
  const materials={...game.materials};
  for(const [name,amount] of [['遺跡碎片',reward.shards],['遺跡材料',reward.materials],['古代裝備',reward.equipment]] as const){
    if(amount)materials[name]=(materials[name]||0)+amount;
  }
  for(const item of loot)materials[item]=(materials[item]||0)+1;
  let logs=game.logs;
  if(reward.gold||reward.shards||reward.materials||reward.equipment)logs=appendGameLog(logs,
    `遺跡遠征結算：${reward.gold?`獲得 ${reward.gold.toLocaleString()} 兩；`:''}${reward.materials?`遺跡材料 +${reward.materials}；`:''}${reward.equipment?`古代裝備 +${reward.equipment}；`:''}${reward.shards?`遺跡碎片 +${reward.shards}。`:''}`);
  if(loot.length)logs=appendGameLog(logs,`遺跡戰利品：${loot.join('、')}。`);
  const settled={...game,gold:game.gold+reward.gold,materials,logs,relicDungeon:after,
    inventory:items.length?positionInventory([...game.inventory,...items]):game.inventory};
  return cleared?settleRelicWarSeal(settled,before,after,random(),random()):settled;
}

/** One event seed gives repeated React updater evaluations identical loot rolls. */
export function relicRewardRandom(seed:number) {
  let value=Math.floor(seed*0x100000000)>>>0;
  return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/0x100000000;};
}
