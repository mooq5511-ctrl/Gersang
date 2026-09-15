import type { Equipment } from "./game-state";

export const EQUIPMENT_FUSION_RECIPES = [
  { sourceRarity: "普通", targetRarity: "稀有", ingredientCount: 5, successRate: 1 },
  { sourceRarity: "稀有", targetRarity: "史詩", ingredientCount: 5, successRate: 0.7 },
  { sourceRarity: "史詩", targetRarity: "傳說", ingredientCount: 5, successRate: 0.35 },
  { sourceRarity: "傳說", targetRarity: "金色", ingredientCount: 5, successRate: 0.2 },
] as const;

export type FusionSourceRarity = (typeof EQUIPMENT_FUSION_RECIPES)[number]["sourceRarity"];

export const FUSION_RARITY_LABEL: Record<Equipment["rarity"], string> = {
  "普通": "白色・普通",
  "稀有": "綠色・稀有",
  "史詩": "藍色・史詩",
  "傳說": "紫色・傳說",
  "金色": "金色",
};

export function fusionBaseName(name: string) {
  return name.replace(/^(普通|稀有|史詩|傳說|金色)・/, "");
}

export function fusionItemKey(item: Pick<Equipment, "slot" | "name">) {
  return `${item.slot}\u0000${fusionBaseName(item.name)}`;
}

export function fusionRecipe(rarity: string) {
  return EQUIPMENT_FUSION_RECIPES.find((recipe) => recipe.sourceRarity === rarity);
}

/** Enhanced or socketed equipment is deliberately protected from being consumed. */
export function isFusionIngredient(item: Equipment, rarity: FusionSourceRarity) {
  return item.rarity === rarity && item.enhance === 0 && !item.socketGem;
}
