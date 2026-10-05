import {combatStats,vitalStats} from './vitals-engine';
import type {Hero,Unit,Equipment} from './game-state';
import type {EquipmentSlot} from './equipment-slots';
export function gemInvestmentPreview(unit:Hero|Unit,slot:EquipmentSlot,item:Equipment){
  const next={...unit,equip:{...unit.equip,[slot]:item}};
  const beforeCombat=combatStats(unit),afterCombat=combatStats(next);
  const beforeVital=vitalStats(unit),afterVital=vitalStats(next);
  const delta={attack:afterCombat.attack-beforeCombat.attack,defense:afterCombat.defense-beforeCombat.defense,
    maxHp:afterVital.maxHp-beforeVital.maxHp,maxMp:afterVital.maxMp-beforeVital.maxMp,
    intelligence:afterVital.intelligence-beforeVital.intelligence,speed:afterCombat.speed-beforeCombat.speed,accuracy:afterCombat.accuracy-beforeCombat.accuracy};
  return {delta,unchanged:Object.values(delta).every(value=>value===0)};
}
