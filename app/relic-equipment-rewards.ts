import {RELIC_DUNGEON_MONSTERS,relicBossForRun,type RelicMonsterId} from '../data/monsters/relic-dungeon-monsters.ts';
/** Encounter identity, not the exploration percentage, defines reward level. */
export function relicDropEquipmentLevel(monsterId:string|undefined) {
  return monsterId&&Object.hasOwn(RELIC_DUNGEON_MONSTERS,monsterId)?RELIC_DUNGEON_MONSTERS[monsterId as RelicMonsterId].level:1;
}
/** Forge follows the existing run's boss but never creates gear above its owner's level. */
export function relicCraftEquipmentLevel(heroLevel:number,clearedRuns:number) {
  const level=Math.min(250,Math.max(1,Math.floor(Number(heroLevel)||1)));
  const runs=Number.isFinite(Number(clearedRuns))?Math.max(0,Math.floor(Number(clearedRuns)||0)):0;
  return Math.min(level,relicBossForRun(runs).level);
}
