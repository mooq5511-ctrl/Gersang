import { ECOLOGY_MONSTERS } from "./monster-ecology.ts";
import { sourceEnemyDefinitions, type SourceEnemyDefinition } from "../data/monsters/world-map-enemies.ts";

export type SourceEnemy = SourceEnemyDefinition & {
  xp: number;
  hp?: number;
  mp?: number;
  attack?: number;
};

// Combat HP, MP, attack and XP come from the stable dungeon ID; map drops stay here.
export const sourceEnemies: SourceEnemy[] = sourceEnemyDefinitions.map((enemy) => {
  const id = enemy.dungeonId;
  const combat = id ? ECOLOGY_MONSTERS[id] : undefined;
  return { ...enemy, xp: combat?.xp ?? enemy.xp ?? 0, ...(combat ? { dungeonId: id, hp: combat.hp, mp: combat.mp, attack: combat.atk } : {}) };
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
  const preferred = candidates.find((enemy) => enemy.name === preferredName);
  if (preferred) return preferred;
  return candidates[(Math.max(1, stage) - 1) % candidates.length];
}

export type OfficialEquipment = {
  id: string;
  name: string;
  kind: "weapon" | "armor";
  level: number;
  atk?: number;
  def?: number;
  str?: number;
  agi?: number;
  intel?: number;
  vit?: number;
  physical?: number;
  magic?: number;
  skill?: string;
  price: number;
};

export const officialEquipment: OfficialEquipment[] = [
  { id: "wood-blade", name: "木刀", kind: "weapon", level: 8, atk: 6, price: 1800 },
  { id: "iron-sword", name: "鐵劍", kind: "weapon", level: 34, atk: 26, price: 9000 },
  { id: "seven-star-sword", name: "七星劍", kind: "weapon", level: 52, atk: 39, price: 18000 },
  { id: "kusanagi", name: "草雉劍", kind: "weapon", level: 80, atk: 69, str: 25, intel: 10, price: 52000 },
  { id: "yitian", name: "倚天劍", kind: "weapon", level: 130, atk: 106, str: 45, vit: 30, price: 130000 },
  { id: "hot-sword", name: "火熱劍", kind: "weapon", level: 170, atk: 135, str: 100, vit: 20, intel: 50, skill: "煉獄術", price: 260000 },
  { id: "ice-sword", name: "寒冰劍", kind: "weapon", level: 185, atk: 158, str: 120, vit: 50, intel: 50, skill: "冰爆", price: 340000 },
  { id: "thunder-sword", name: "雷劍", kind: "weapon", level: 200, atk: 183, str: 150, vit: 50, intel: 50, skill: "雲雷", price: 480000 },
  { id: "leather", name: "牛皮盔甲", kind: "armor", level: 3, def: 5, price: 1200 },
  { id: "tiger-hide", name: "虎皮盔甲", kind: "armor", level: 10, def: 14, price: 3200 },
  { id: "copper-armor", name: "銅製盔甲", kind: "armor", level: 35, def: 38, price: 11000 },
  { id: "black-iron", name: "黑鐵盔甲", kind: "armor", level: 50, def: 54, price: 22000 },
  { id: "flying-tiger", name: "飛虎盔甲", kind: "armor", level: 70, def: 62, agi: 10, price: 41000 },
  { id: "white-tiger", name: "白虎盔甲", kind: "armor", level: 80, def: 90, str: 40, price: 65000 },
  { id: "water-dragon", name: "水龍盔甲", kind: "armor", level: 80, def: 81, intel: 20, physical: 30, magic: 30, price: 72000 },
  { id: "silver-armor", name: "白銀盔甲", kind: "armor", level: 120, def: 300, str: 30, vit: 30, price: 150000 },
  { id: "supreme-armor", name: "太皇盔甲", kind: "armor", level: 200, def: 500, str: 100, agi: 50, vit: 100, intel: 50, physical: 50, magic: 50, price: 620000 },
];

export const officialGems = [
  { id: "white-crystal", name: "白水晶", stat: "vit" as const, label: "體質", values: [15, 30, 60], costs: [6000, 18000, 52000] },
  { id: "placer", name: "沙金石", stat: "agi" as const, label: "敏捷", values: [15, 30, 60], costs: [6000, 18000, 52000] },
  { id: "moonstone", name: "月藏石", stat: "intel" as const, label: "智力", values: [15, 30, 60], costs: [6000, 18000, 52000] },
  { id: "obsidian", name: "黑曜石", stat: "str" as const, label: "力量", values: [15, 30, 60], costs: [6000, 18000, 52000] },
  { id: "bloodstone", name: "赤血石", stat: "all" as const, label: "全能力", values: [5, 10, 20], costs: [10000, 30000, 90000] },
];

export const awakeningProfiles: Record<string, { name: string; skill: string; stats: [number, number, number, number]; physical: number; magic: number }> = {
  "korea-1": { name: "覺醒・宣武功臣", skill: "爆流鐵壁", stats: [600, 25, 100, 200], physical: 65, magic: 65 },
  "korea-3": { name: "覺醒・源花美室", skill: "魅惑・淨化", stats: [100, 25, 275, 200], physical: 30, magic: 70 },
  "korea-4": { name: "覺醒・金庾信", skill: "火焰刺擊術", stats: [300, 45, 50, 225], physical: 70, magic: 30 },
  "korea-6": { name: "覺醒・雷法師", skill: "連雷擊・恢復術", stats: [100, 50, 300, 200], physical: 40, magic: 60 },
  "korea-7": { name: "覺醒・老黃忠臣", skill: "雷箭・雷電矢", stats: [100, 300, 100, 150], physical: 50, magic: 50 },
};

export type GameplayContract = {
  id: string;
  name: string;
  category: string;
  description: string;
  metric: "stage" | "kills" | "mercs" | "tier1" | "tier2" | "materials" | "equipment" | "awakened";
  target: number;
  reward: { gold: number; cores?: number; soul?: number; awakening?: number };
};

export const gameplayContracts: GameplayContract[] = [
  { id: "field-10", name: "朝鮮地面巡查", category: "怪物地圖", description: "推進至第 10 關，完成第一輪地面怪物討伐。", metric: "stage", target: 10, reward: { gold: 18000, cores: 1 } },
  { id: "hunt-20", name: "千年湖討伐令", category: "任務", description: "累計擊敗 20 隻怪物。", metric: "kills", target: 20, reward: { gold: 30000, soul: 5 } },
  { id: "roster-8", name: "八人商團", category: "傭兵", description: "商團名冊擁有 8 名傭兵。", metric: "mercs", target: 8, reward: { gold: 24000, cores: 2 } },
  { id: "tier1-2", name: "將帥初成", category: "轉職", description: "培養 2 名一階以上將帥。", metric: "tier1", target: 2, reward: { gold: 36000, soul: 5 } },
  { id: "tier2-2", name: "二階雙將", category: "轉職", description: "培養 2 名二階以上將帥。", metric: "tier2", target: 2, reward: { gold: 60000, cores: 3, soul: 10 } },
  { id: "loot-12", name: "材料收集令", category: "物品", description: "從怪物身上取得 12 件掉落材料。", metric: "materials", target: 12, reward: { gold: 28000, cores: 2 } },
  { id: "gear-6", name: "全副武裝", category: "裝備", description: "背包與全隊合計持有 6 件裝備。", metric: "equipment", target: 6, reward: { gold: 42000, soul: 5 } },
  { id: "awaken-1", name: "覺醒之路", category: "覺醒", description: "完成 1 名二階將帥覺醒。", metric: "awakened", target: 1, reward: { gold: 120000, cores: 5, awakening: 1 } },
];
