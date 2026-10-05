import {v1Definition} from './equipment-v1-policy.ts';

/** Credit newly defeated enemies once, even if the party later loses the encounter. */
export function newlyDefeatedExperience(previousCredited: number, enemyHp: readonly number[], xpPerEnemy: number) {
  const defeated = enemyHp.filter((hp) => hp <= 0).length;
  const credited = Math.max(0, Math.min(enemyHp.length, Math.floor(previousCredited || 0)));
  const kills = Math.max(0, defeated - credited);
  return { creditedKills: Math.max(credited, defeated), kills, xp: kills * xpPerEnemy };
}

/** Divide earned battle XP evenly without discarding a full party's remainder. */
export function sharedBattleExperience(totalXp: number, partySize: number) {
  const earned = Number.isFinite(totalXp) ? Math.max(0, totalXp) : 0;
  const members = Number.isFinite(partySize) ? Math.max(1, Math.floor(partySize)) : 1;
  return earned / members;
}

/** 新手期與上陣傭兵的戰鬥經驗加成；Lv.20 後取消新手倍率，傭兵加成最高 +50%。 */
export function battleExperienceMultiplier(heroLevel: number, deployedMercenaryCount: number) {
  const newbieMultiplier = heroLevel < 20 ? 2 : 1;
  const mercenaryCount = Math.max(0, Math.floor(Number.isFinite(deployedMercenaryCount) ? deployedMercenaryCount : 0));
  const mercenaryBonus = Math.min(0.5, mercenaryCount * 0.1);
  return newbieMultiplier * (1 + mercenaryBonus);
}

type ExperienceEquipment = {definitionId?:string;balanceVersion?:string;enhanceBonuses?:readonly {stat:string;value:number}[]};
/** New-series contribution is capped per person then averaged over the deployed party.
 * Legacy contributions retain their previous additive rule until an explicit conversion.
 * Empty companions are included in the denominator; duplicate party size cannot amplify V1.
 */
export function equipmentExperienceBreakdown(units:readonly {equip:Record<string,ExperienceEquipment|null>}[]) {
  let legacyPercent=0, cappedPersonalSum=0;
  for(const unit of units) {
    let personal=0;
    for(const item of Object.values(unit.equip)) {
      if(!item)continue;
      const percent=(item.enhanceBonuses||[]).reduce((sum,bonus)=>sum+(bonus.stat==='xpPercent'&&Number.isFinite(bonus.value)&&bonus.value>0?bonus.value:0),0);
      if(v1Definition(item))personal+=percent;
      else legacyPercent+=percent;
    }
    cappedPersonalSum+=Math.min(25,personal);
  }
  const versionedPercent=units.length?cappedPersonalSum/units.length:0;
  return {legacyPercent,versionedPercent,multiplier:1+(legacyPercent+versionedPercent)/100};
}
export function equipmentExperienceMultiplier(units:readonly {equip:Record<string,ExperienceEquipment|null>}[]) {
  return equipmentExperienceBreakdown(units).multiplier;
}
