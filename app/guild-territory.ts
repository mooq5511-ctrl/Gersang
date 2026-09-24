import type { Equipment, EnhancementBonus, GameState } from "./game-state";

export const TERRITORY_ENTRY_ID = "guild-territory";
export const TERRITORY_UNLOCK_LEVEL = 20;
export const BUILDING_LEVEL_CAP = 100;

// The first ten levels retain the original balance. From level 11 onward,
// gains accelerate toward a powerful level-100 target, giving the long
// progression a meaningful endgame payoff without changing early saves.
const CURVE_START_LEVEL = 10;
const CURVE_EXPONENT = 1.2;
const COST_EXPONENT = 1.45;

export const BUILDINGS = {
  flag: { name: "商團旗幟", icon: "🚩", maxLevel: BUILDING_LEVEL_CAP, baseCost: 2000, description: "所有百分比加成：Lv.1–10 每級 +1%，Lv.100 共 +40%" },
  waystation: { name: "驛站", icon: "🐎", maxLevel: BUILDING_LEVEL_CAP, baseCost: 1200, description: "放置金錢與信用：Lv.1–10 每級 +2%，Lv.100 共 +120%" },
  lounge: { name: "休息室", icon: "🛏️", maxLevel: BUILDING_LEVEL_CAP, baseCost: 1500, description: "戰敗客棧療傷：Lv.1–10 每級 +3%，Lv.100 共 +160%" },
  training: { name: "訓練場", icon: "⚔️", maxLevel: BUILDING_LEVEL_CAP, baseCost: 1800, description: "角色與傭兵經驗：Lv.1–10 每級 +2%，Lv.100 共 +120%" },
  warehouse: { name: "倉庫", icon: "📦", maxLevel: BUILDING_LEVEL_CAP, baseCost: 2500, description: "三角色共用倉庫：Lv.1–10 每級 +10 格，Lv.100 共 +1,000 格" },
  smithy: { name: "鐵匠鋪", icon: "🔨", maxLevel: BUILDING_LEVEL_CAP, baseCost: 5000, description: "Lv.20 開放裝備強化；Lv.1–10 每級成功率 +1.5 個百分點，Lv.100 共 +35 個百分點", unlockLevel: 20 },
  restaurant: { name: "餐廳", icon: "🍲", maxLevel: BUILDING_LEVEL_CAP, baseCost: 2200, description: "使用怪物材料製作食物；Lv.1 開放 3 種食譜，升級後可解鎖更多料理" },
} as const;

export type BuildingId = keyof typeof BUILDINGS;
export type GuildTerritory = { buildings: Record<BuildingId, number> };
export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

export function freshTerritory(): GuildTerritory {
  return { buildings: { flag: 0, waystation: 0, lounge: 0, training: 0, warehouse: 0, smithy: 0, restaurant: 0 } };
}

export const RESTAURANT_RECIPES = [
  { id: "seafood-porridge", name: "海鮮粥", ingredients: { 海鮮: 3, 銀松草: 1 }, outputId: "restaurant-seafood-porridge", outputName: "海鮮粥", amount: 2, effect: "恢復 15% 最大 HP" },
  { id: "herbal-stew", name: "山珍燉湯", ingredients: { 桂皮: 2, 熟地黃: 1 }, outputId: "restaurant-herbal-stew", outputName: "山珍燉湯", amount: 1, effect: "恢復 20% 最大 HP" },
  { id: "bezoar-feast", name: "牛黃藥膳", ingredients: { 牛黃: 2, 熟地黃: 2 }, outputId: "restaurant-bezoar-feast", outputName: "牛黃藥膳", amount: 1, effect: "恢復 25% 最大 HP" },
] as const;

export function craftRestaurantFood(state: GameState, recipeId: string): { game: GameState; error?: string } {
  if ((state.territory?.buildings.restaurant || 0) < 1) return { game: state, error: "請先建造餐廳。" };
  const recipe = RESTAURANT_RECIPES.find((entry) => entry.id === recipeId);
  if (!recipe) return { game: state, error: "找不到這道料理。" };
  for (const [material, required] of Object.entries(recipe.ingredients)) {
    if ((state.materials[material] || 0) < required) return { game: state, error: `材料不足：${material} 需要 ${required} 個。` };
  }
  const materials = { ...state.materials };
  for (const [material, required] of Object.entries(recipe.ingredients)) materials[material] = (materials[material] || 0) - required;
  return { game: { ...state, materials, medicines: { ...state.medicines, [recipe.outputId]: (state.medicines[recipe.outputId] || 0) + recipe.amount }, logs: [`餐廳：製作${recipe.outputName} ×${recipe.amount}。`, ...state.logs].slice(0, 40) } };
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

function clampLevel(level: number): number {
  return Math.max(0, Math.min(BUILDING_LEVEL_CAP, Math.floor(level)));
}

/**
 * Interpolates from the original level-10 value to the new level-100 cap.
 * The exponent above one makes the late levels more rewarding while keeping
 * the curve continuous at level 10.
 */
function curvedValue(level: number, atTen: number, atHundred: number): number {
  const safeLevel = clampLevel(level);
  if (safeLevel <= CURVE_START_LEVEL) return atTen * safeLevel / CURVE_START_LEVEL;
  const progress = (safeLevel - CURVE_START_LEVEL) / (BUILDING_LEVEL_CAP - CURVE_START_LEVEL);
  return atTen + (atHundred - atTen) * progress ** CURVE_EXPONENT;
}

export function buildingEffect(id: BuildingId, level: number): number {
  const targets: Record<BuildingId, [number, number]> = {
    flag: [0.1, 0.4],
    waystation: [0.2, 1.2],
    lounge: [0.3, 1.6],
    training: [0.2, 1.2],
    warehouse: [100, 1000],
    smithy: [0.15, 0.35],
    restaurant: [0, 0.8],
  };
  return curvedValue(level, ...targets[id]);
}

export function buildingCost(id: BuildingId, currentLevel: number): number {
  const nextLevel = clampLevel(currentLevel + 1);
  if (nextLevel <= CURVE_START_LEVEL) return BUILDINGS[id].baseCost * nextLevel ** 2;
  // Keep the original quadratic prices through Lv.10, then extend them with
  // a gentler 1.45-power curve and a small late-game surcharge.
  const scaled = 100 * (nextLevel / CURVE_START_LEVEL) ** COST_EXPONENT;
  const surcharge = 1 + (nextLevel - CURVE_START_LEVEL) * 0.003;
  return Math.round(BUILDINGS[id].baseCost * scaled * surcharge);
}

export function territoryBonus(territory: GuildTerritory | undefined, target: "idle" | "xp" | "recovery" | "smithy"): number {
  const levels = territory?.buildings || freshTerritory().buildings;
  const own = target === "idle" ? buildingEffect("waystation", levels.waystation)
    : target === "xp" ? buildingEffect("training", levels.training)
    : target === "recovery" ? buildingEffect("lounge", levels.lounge)
    : buildingEffect("smithy", levels.smithy);
  return own + buildingEffect("flag", levels.flag);
}

export function warehouseLimit(territory: GuildTerritory | undefined): number {
  return 30 + Math.round(buildingEffect("warehouse", territory?.buildings.warehouse || 0));
}

export function territoryHealInterval(territory: GuildTerritory | undefined): number {
  return Math.max(500, Math.round(2000 / (1 + territoryBonus(territory, "recovery"))));
}

export function upgradeBuilding(state: GameState, id: BuildingId): { game: GameState; error?: string } {
  const building = BUILDINGS[id];
  const territory = state.territory || freshTerritory();
  const level = territory.buildings[id] ?? 0;
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

/** 強化屬性採用每級 ×115%，避免高階仍停留在線性成長。 */
export function enhancementMultiplier(level: number): number {
  return 1.15 ** Math.max(0, Math.floor(level));
}

const ENHANCEMENT_MILESTONE_TABLE = {
  5: [
    { id: "attackPercent", name: "烈武契印", stat: "attackPercent", min: 3, max: 10, text: "攻擊力" },
    { id: "defensePercent", name: "玄鎧契印", stat: "defensePercent", min: 3, max: 10, text: "防禦力" },
    { id: "xpPercent", name: "求知契印", stat: "xpPercent", min: 3, max: 10, text: "經驗值" },
  ],
  10: [
    { id: "attackPercent", name: "烈武契印", stat: "attackPercent", min: 11, max: 20, text: "攻擊力" },
    { id: "defensePercent", name: "玄鎧契印", stat: "defensePercent", min: 11, max: 20, text: "防禦力" },
    { id: "xpPercent", name: "求知契印", stat: "xpPercent", min: 11, max: 20, text: "經驗值" },
  ],
  15: [
    { id: "attackPercent", name: "烈武契印", stat: "attackPercent", min: 21, max: 50, text: "攻擊力" },
    { id: "defensePercent", name: "玄鎧契印", stat: "defensePercent", min: 21, max: 50, text: "防禦力" },
    { id: "xpPercent", name: "求知契印", stat: "xpPercent", min: 21, max: 50, text: "經驗值" },
  ],
} as const;

export function enhancementMilestoneOptions(level: 5 | 10 | 15) {
  return ENHANCEMENT_MILESTONE_TABLE[level].map((entry) => ({ ...entry, chance: 1 / ENHANCEMENT_MILESTONE_TABLE[level].length }));
}

/** 在里程碑等級隨機抽取一條全域百分比屬性。 */
export function rollEnhancementMilestoneBonus(level: 5 | 10 | 15, random = Math.random): EnhancementBonus {
  const options = ENHANCEMENT_MILESTONE_TABLE[level];
  const bonus = options[Math.floor(random() * options.length)];
  const value = bonus.min + Math.floor(random() * (bonus.max - bonus.min + 1));
  return { id: bonus.id, name: bonus.name, stat: bonus.stat, value, text: `${bonus.text} +${value}%` };
}

export function enhancementCost(item: Equipment): number {
  return 1000 * (item.enhance + 1) ** 2;
}

export function enhanceEquipment(state: GameState, itemUid: string, roll: number, random = Math.random): { game: GameState; error?: string } {
  const territory = state.territory || freshTerritory();
  if (territory.buildings.smithy < 1) return { game: state, error: "請先建造鐵匠鋪。" };
  const item = state.inventory.find((entry) => entry.uid === itemUid);
  if (!item) return { game: state, error: "找不到這件背包裝備。" };
  if (item.enhance >= 15) return { game: state, error: "裝備已達強化上限 +15。" };
  const cost = enhancementCost(item);
  if (state.gold < cost) return { game: state, error: `強化需要 ${cost.toLocaleString()} 兩。` };
  const pityReady = (item.luckyValue || 0) >= 100;
  const success = pityReady || roll < enhancementChance(territory, item);
  const nextLevel = item.enhance + 1;
  const milestoneBonus = success && [5, 10, 15].includes(nextLevel) ? rollEnhancementMilestoneBonus(nextLevel as 5 | 10 | 15, random) : undefined;
  const uniqueBonuses = Array.from(new Map((item.enhanceBonuses || []).map((bonus) => [bonus.id, bonus])).values());
  const nextBonuses = milestoneBonus ? [...uniqueBonuses.filter((bonus) => bonus.id !== milestoneBonus.id), milestoneBonus] : uniqueBonuses;
  return { game: {
    ...state, gold: state.gold - cost,
    inventory: state.inventory.map((entry) => entry.uid === itemUid ? success ? { ...entry, enhance: nextLevel, luckyValue: 0, enhanceBonuses: nextBonuses } : { ...entry, luckyValue: Math.min(100, (entry.luckyValue || 0) + 10) } : entry),
    logs: [`鐵匠鋪：${item.name}強化${success ? `成功，達到 +${nextLevel}${pityReady ? "（幸運保底）" : ""}${milestoneBonus ? `，獲得${milestoneBonus.name}` : ""}` : `失敗，裝備未受損，幸運值 +10（${Math.min(100, (item.luckyValue || 0) + 10)}/100）`}；消耗 ${cost.toLocaleString()} 兩。`, ...state.logs].slice(0, 40),
  } };
}
