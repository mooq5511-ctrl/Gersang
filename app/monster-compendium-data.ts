import { isBossMonster } from "./dungeon-engine";
import { battleMaps } from "./reference-data";
import { sourceEnemies } from "./v17-content";

export const COMPENDIUM_MAP_IDS = [
  "starter-outskirts", "millennium-lake", "japan-sea", "miasma-forest", "sumeru",
] as const;

export type CompendiumMapId = (typeof COMPENDIUM_MAP_IDS)[number];
export type MonsterKind = "一般" | "菁英" | "首領";

export interface MonsterCompendiumEntry {
  id: string;
  name: string;
  mapId: CompendiumMapId;
  region: string;
  kind: MonsterKind;
  hp: number;
  mp: number;
  atk: number;
  exp: number;
  drops: string[];
  isBoss: boolean;
  prerequisite: string | null;
  skill: string | null;
}

const prerequisites: Record<CompendiumMapId, string | null> = {
  "starter-outskirts": null,
  "millennium-lake": "擊敗海賊王",
  "japan-sea": "擊敗狂風阿魯塔",
  "miasma-forest": "擊敗黃金海星",
  sumeru: "世界地圖達到第 40 關",
};

function monsterKind(name: string, boss: boolean): MonsterKind {
  if (boss) return "首領";
  if (/\(強\)|詭異|頭目|金剛|神獸|強力|神漢|邪靈/.test(name) || name === "海星") return "菁英";
  return "一般";
}

/** JSON payload built from the same numerical and drop sources as the battle map. */
export const monsterCompendiumJson = JSON.stringify(
  sourceEnemies
    .filter((enemy): enemy is typeof enemy & { mapId: CompendiumMapId } =>
      COMPENDIUM_MAP_IDS.includes(enemy.mapId as CompendiumMapId))
    .map((enemy): MonsterCompendiumEntry => {
      const map = battleMaps.find((entry) => entry.id === enemy.mapId);
      const boss = isBossMonster(enemy.name);
      return {
        id: enemy.dungeonId ?? `${enemy.mapId}:${enemy.name}`,
        name: enemy.name,
        mapId: enemy.mapId,
        region: map?.name ?? enemy.mapId,
        kind: monsterKind(enemy.name, boss),
        hp: enemy.hp ?? 0,
        mp: enemy.mp ?? 0,
        atk: enemy.attack ?? 0,
        exp: enemy.xp,
        drops: enemy.drops,
        isBoss: boss,
        prerequisite: prerequisites[enemy.mapId],
        skill: enemy.skill ?? null,
      };
    }),
);
