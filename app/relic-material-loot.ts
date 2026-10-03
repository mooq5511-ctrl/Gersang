import { RELIC_DUNGEON_MONSTERS } from '../data/monsters/relic-dungeon-monsters.ts';
import { MONSTER_REDESIGN, rollRedesignedMaterials } from '../data/monsters/monster-redesign.ts';

/** Successful reward settlements only; randomness is sampled outside React's updater. */
export function relicMaterialLoot(monsterId: string, rolls: number[]) {
  if (MONSTER_REDESIGN[monsterId]) return rollRedesignedMaterials(monsterId, rolls);
  const monster = RELIC_DUNGEON_MONSTERS[monsterId as keyof typeof RELIC_DUNGEON_MONSTERS];
  if (!monster || !(rolls[0] >= 0 && rolls[0] < monster.drop)) return [];
  const choice = Math.max(0, Math.min(.999999, rolls[1] ?? 0));
  return [monster.loot[Math.floor(choice * monster.loot.length)]];
}
