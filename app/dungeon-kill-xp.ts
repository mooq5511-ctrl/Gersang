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

/** 計算出戰角色穿戴的求知契印經驗加成。 */
export function equipmentExperienceMultiplier(units: readonly { equip: Record<string, { enhanceBonuses?: readonly { stat: string; value: number }[] } | null> }[]) {
  const percent = units.reduce((sum, unit) => sum + Object.values(unit.equip).reduce((total, item) => total + (item?.enhanceBonuses || []).filter((bonus) => bonus.stat === "xpPercent").reduce((value, bonus) => value + bonus.value, 0), 0), 0);
  return 1 + percent / 100;
}
