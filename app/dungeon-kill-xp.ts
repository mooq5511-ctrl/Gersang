/** Credit newly defeated enemies once, even if the party later loses the encounter. */
export function newlyDefeatedExperience(previousCredited: number, enemyHp: readonly number[], xpPerEnemy: number) {
  const defeated = enemyHp.filter((hp) => hp <= 0).length;
  const credited = Math.max(0, Math.min(enemyHp.length, Math.floor(previousCredited || 0)));
  const kills = Math.max(0, defeated - credited);
  return { creditedKills: Math.max(credited, defeated), kills, xp: kills * xpPerEnemy };
}
