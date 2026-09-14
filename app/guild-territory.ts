import type { Equipment, GameState } from "./game-state";

export const TERRITORY_ENTRY_ID = "guild-territory";
export const TERRITORY_UNLOCK_LEVEL = 20;

export const BUILDINGS = {
  flag: { name: "商團旗幟", icon: "🚩", maxLevel: 5, baseCost: 2000, description: "所有百分比加成 +1%／級" },
  waystation: { name: "驛站", icon: "🐎", maxLevel: 10, baseCost: 1200, description: "放置金錢與信用 +2%／級" },
  lounge: { name: "休息室", icon: "🛏️", maxLevel: 10, baseCost: 1500, description: "戰敗客棧療傷速度 +3%／級" },
  training: { name: "訓練場", icon: "⚔️", maxLevel: 10, baseCost: 1800, description: "角色與傭兵經驗 +2%／級" },
  warehouse: { name: "倉庫", icon: "📦", maxLevel: 8, baseCost: 2500, description: "三角色共用倉庫 +10 格／級" },
  smithy: { name: "鐵匠鋪", icon: "🔨", maxLevel: 6, baseCost: 5000, description: "開放裝備強化，成功率 +1.5 個百分點／級", unlockLevel: 50 },
} as const;

export type BuildingId = keyof typeof BUILDINGS;
export type GuildTerritory = { buildings: Record<BuildingId, number> };
export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

export function freshTerritory(): GuildTerritory {
  return { buildings: { flag: 0, waystation: 0, lounge: 0, training: 0, warehouse: 0, smithy: 0 } };
}

export function restoreTerritory(raw: unknown): GuildTerritory {
  const source = raw && typeof raw === "object" && "buildings" in raw && raw.buildings && typeof raw.buildings === "object"
    ? raw.buildings as Record<string, unknown> : {};
  const result = freshTerritory();
  for (const id of BUILDING_IDS) {
    const level = source[id];
    result.buildings[id] = typeof level === "number" && Number.isFinite(level)
      ? Math.max(0, Math.min(BUILDINGS[id].maxLevel, Math.floor(level))) : 0;
  }
  return result;
}

export function buildingCost(id: BuildingId, currentLevel: number): number {
  return BUILDINGS[id].baseCost * (currentLevel + 1) ** 2;
}

export function territoryBonus(territory: GuildTerritory | undefined, target: "idle" | "xp" | "recovery" | "smithy"): number {
  const levels = territory?.buildings || freshTerritory().buildings;
  const own = target === "idle" ? levels.waystation * 0.02
    : target === "xp" ? levels.training * 0.02
    : target === "recovery" ? levels.lounge * 0.03
    : levels.smithy * 0.015;
  return own + levels.flag * 0.01;
}

export function warehouseLimit(territory: GuildTerritory | undefined): number {
  return 30 + (territory?.buildings.warehouse || 0) * 10;
}

export function territoryHealInterval(territory: GuildTerritory | undefined): number {
  return Math.max(500, Math.round(2000 / (1 + territoryBonus(territory, "recovery"))));
}

export function upgradeBuilding(state: GameState, id: BuildingId): { game: GameState; error?: string } {
  const building = BUILDINGS[id];
  const territory = state.territory || freshTerritory();
  const level = territory.buildings[id];
  if (state.hero.level < TERRITORY_UNLOCK_LEVEL) return { game: state, error: `商團領地在主角 Lv.${TERRITORY_UNLOCK_LEVEL} 開放。` };
  if ("unlockLevel" in building && state.hero.level < building.unlockLevel) return { game: state, error: `${building.name}需要主角 Lv.${building.unlockLevel}。` };
  if (level >= building.maxLevel) return { game: state, error: `${building.name}已達最高等級。` };
  const cost = buildingCost(id, level);
  if (state.gold < cost) return { game: state, error: `升級${building.name}需要 ${cost.toLocaleString()} 兩。` };
  return {
    game: {
      ...state,
      gold: state.gold - cost,
      territory: { buildings: { ...territory.buildings, [id]: level + 1 } },
      logs: [`商團領地：${building.name}升至 Lv.${level + 1}，加成立即生效。`, ...state.logs].slice(0, 40),
    },
  };
}

export function enhancementChance(territory: GuildTerritory, item: Equipment): number {
  return Math.min(1, Math.max(0.1, 1 - item.enhance * 0.08 + territoryBonus(territory, "smithy")));
}

export function enhancementCost(item: Equipment): number {
  return 1000 * (item.enhance + 1) ** 2;
}

export function enhanceEquipment(state: GameState, itemUid: string, roll: number): { game: GameState; error?: string } {
  const territory = state.territory || freshTerritory();
  if (territory.buildings.smithy < 1) return { game: state, error: "請先建造鐵匠鋪。" };
  const item = state.inventory.find((entry) => entry.uid === itemUid);
  if (!item) return { game: state, error: "找不到這件背包裝備。" };
  if (item.enhance >= 10) return { game: state, error: "裝備已達強化上限 +10。" };
  const cost = enhancementCost(item);
  if (state.gold < cost) return { game: state, error: `強化需要 ${cost.toLocaleString()} 兩。` };
  const success = roll < enhancementChance(territory, item);
  return { game: {
    ...state, gold: state.gold - cost,
    inventory: success ? state.inventory.map((entry) => entry.uid === itemUid ? { ...entry, enhance: entry.enhance + 1 } : entry) : state.inventory,
    logs: [`鐵匠鋪：${item.name}強化${success ? `成功，達到 +${item.enhance + 1}` : "失敗，裝備未受損"}；消耗 ${cost.toLocaleString()} 兩。`, ...state.logs].slice(0, 40),
  } };
}
