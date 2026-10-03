import { ECOLOGY_MONSTERS } from "./monster-ecology.ts";
import { sourceEnemyDefinitions, type SourceEnemyDefinition } from "../data/monsters/world-map-enemies.ts";
import { MONSTER_REDESIGN } from '../data/monsters/monster-redesign.ts';

export type SourceEnemy = SourceEnemyDefinition & {
  dungeonId?: keyof typeof ECOLOGY_MONSTERS;
  xp: number;
  hp?: number;
  mp?: number;
  attack?: number;
};

// Combat HP, MP, attack and XP come from the stable dungeon ID; map drops stay here.
export const sourceEnemies: SourceEnemy[] = sourceEnemyDefinitions.map((enemy) => {
  const id = enemy.id in ECOLOGY_MONSTERS ? enemy.id as keyof typeof ECOLOGY_MONSTERS : undefined;
  const combat = id ? ECOLOGY_MONSTERS[id] : undefined;
  const design = MONSTER_REDESIGN[enemy.id];
  return { ...enemy, boss: enemy.boss || enemy.id === "e_japan_sea_golden_starfish", ...(design ? { name: design.name, elite: design.elite, physicalResistance: design.physicalDefense, magicResistance: design.magicDefense, drops: design.materialDrops.map(drop => drop.item), skill: design.description } : {}), xp: combat?.xp ?? enemy.xp ?? 0, ...(combat ? { name: combat.name, dungeonId: id, hp: combat.hp, mp: combat.mp, attack: combat.atk } : {}) };
});

const sourceEnemiesByDungeonKey = new Map<string, SourceEnemy>();
for (const enemy of sourceEnemies) {
  if (enemy.dungeonId) sourceEnemiesByDungeonKey.set(enemy.dungeonId, enemy);
}

export function sourceEnemyForDungeonKey(key: string): SourceEnemy | undefined {
  return sourceEnemiesByDungeonKey.get(key);
}

export function sourceEnemyForMap(mapId: string, stage: number, isBoss: boolean, preferredName?: string) {
  const candidates = sourceEnemies.filter((enemy) => enemy.mapId === mapId && Boolean(enemy.boss) === isBoss);
  if (!candidates.length) return null;
  const oldId = sourceEnemyDefinitions.find(enemy => enemy.name === preferredName)?.id;
  const preferred = candidates.find((enemy) => enemy.name === preferredName || enemy.id === oldId);
  if (preferred) return preferred;
  return candidates[(Math.max(1, stage) - 1) % candidates.length];
}

export { officialEquipment } from "../data/items/official-equipment.ts";
export type { OfficialEquipment } from "../data/items/official-equipment.ts";
export { officialGems } from "../data/items/official-gems.ts";
export { awakeningProfiles } from "../data/mercenaries/awakening-profiles.ts";
export { gameplayContracts } from "../data/contracts/gameplay-contracts.ts";
export type { GameplayContract } from "../data/contracts/gameplay-contracts.ts";
