import { DUNGEONS, isBossMonster } from './dungeon-engine';
import { DIVINE_EQUIPMENT,makeDivineEquipment,type DivineKey } from './divine-equipment';
import { sourceEnemies } from './v17-content';
import { MONSTER_REDESIGN, MONSTER_REGION_LABELS, type MonsterDrop } from '../data/monsters/monster-redesign';
import { RELIC_DUNGEON_MONSTERS } from '../data/monsters/relic-dungeon-monsters';
import { MATERIAL_PRICES } from './village-exchange';
import { equipmentSellPrice } from './equipment-market';
import { battleMaps } from './reference-data';

// The world-map codex uses exactly the same destinations and order as the map.
export const COMPENDIUM_MAP_IDS = battleMaps.map(map => map.id);
export type CompendiumMapId = string;
export type MonsterKind = '一般' | '菁英' | '首領';
export interface MonsterCompendiumEntry {
  id: string; name: string; mapId: CompendiumMapId; region: string; kind: MonsterKind;
  level: number; hp: number; mp: number; atk: number; exp: number; gold: number;
  physicalDefense: number; magicDefense: number; role: string;
  encounterTier: string;
  drops: string[]; dropDetails: MonsterDrop[]; equipmentDrops: MonsterDrop[]; isBoss: boolean; prerequisite: string | null; skill: string | null;
}

/** Every live dungeon ID is represented once, including legacy saves and all twelve national zones. */
export const monsterCatalogEntries: MonsterCompendiumEntry[] = Object.entries(DUNGEONS).map(([id, monster]) => {
  const design = MONSTER_REDESIGN[id];
  const source = sourceEnemies.find(enemy => enemy.dungeonId === id);
  const relic = RELIC_DUNGEON_MONSTERS[id as keyof typeof RELIC_DUNGEON_MONSTERS];
  const boss = isBossMonster(monster.name);
  const mapId = design?.region ?? (relic ? 'sunken-relic' : source?.mapId ?? 'legacy-dungeon');
  const drops = design ? [...design.materialDrops.map(drop => drop.item), ...(source?.mapId === 'starter-outskirts' ? ['古錢箱'] : [])] : source?.drops ?? relic?.loot ?? [];
  const regularDrops = drops.filter(item => item !== '[新手]兌換銅錢' && item !== '古錢箱');
  const dropDetails = design ? [...design.materialDrops, ...(source?.mapId === 'starter-outskirts' ? [{ item: '古錢箱', rate: 100, price: MATERIAL_PRICES['古錢箱'] }] : [])] : drops.map(item => ({
    item, price: item === '[新手]兌換銅錢' ? 0 : MATERIAL_PRICES[item] ?? 0,
    rate: item === '[新手]兌換銅錢' || item === '古錢箱' ? 100 : relic ? monster.drop * 100 / Math.max(1, drops.length) : 100 / Math.max(1, regularDrops.length),
  }));
  const equipmentDrops = [...new Set(monster.loot)].flatMap(key => {
    const spec = DIVINE_EQUIPMENT[key as keyof typeof DIVINE_EQUIPMENT];
    return spec ? [{ item: spec.name, rate: .01, price: equipmentSellPrice(makeDivineEquipment(key as DivineKey,'codex')) }] : [];
  });
  return {
    id, name: monster.name, mapId, region: MONSTER_REGION_LABELS[mapId],
    kind: boss ? '首領' : design?.elite || relic?.kind === '菁英' ? '菁英' : '一般',
    level: monster.level, hp: monster.hp, mp: monster.mp, atk: monster.atk, exp: monster.xp, gold: monster.gold,
    physicalDefense: 'physicalDefense' in monster ? monster.physicalDefense ?? 0 : 0,
    magicDefense: 'magicDefense' in monster ? monster.magicDefense ?? 0 : 0,
    role: design?.role ?? (boss ? '首領' : '均衡'), encounterTier: boss ? '首領' : design?.encounterTier ?? '主力怪', drops, dropDetails, equipmentDrops, isBoss: boss,
    prerequisite: null, skill: design?.description ?? source?.skill ?? relic?.skill ?? null,
  };
});
const catalogById = new Map(monsterCatalogEntries.map(entry => [entry.id, entry]));
export const monsterCompendiumEntries: MonsterCompendiumEntry[] = battleMaps.flatMap(map =>
  sourceEnemies.filter(enemy => enemy.mapId === map.id && enemy.dungeonId).flatMap(enemy => {
    const entry = catalogById.get(enemy.dungeonId!);
    return entry ? [{ ...entry, mapId: map.id, region: map.name }] : [];
  }),
);
export const monsterCompendiumJson = JSON.stringify(monsterCompendiumEntries);
