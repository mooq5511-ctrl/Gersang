import type { Equipment } from "./game-state";
import {v1Definition} from './equipment-v1-policy.ts';
import {hasEquipmentInvestment} from './equipment-processing.ts';

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

export function fusionItemKey(item: Pick<Equipment, "slot" | "name" | "definitionId" | "balanceVersion">) {
  if(v1Definition(item))return `${item.balanceVersion}\u0000${item.definitionId}`;
  return `${item.slot}\u0000${fusionBaseName(item.name)}`;
}

export function fusionRecipe(rarity: string, item?: Equipment) {
  const legacy = EQUIPMENT_FUSION_RECIPES.find((recipe) => recipe.sourceRarity === rarity);
  if (!legacy) return undefined;
  const definition = item && v1Definition(item);
  const feeFactors = {普通:.25,稀有:.5,史詩:1,傳說:2};
  return definition ? {...legacy, ingredientCount:3, successRate:1, fee:Math.ceil(definition.price*feeFactors[legacy.sourceRarity])} : {...legacy, fee:0};
}

/** One shared, non-mutating plan for the confirmation screen and transaction. */
export function planEquipmentFusion(inventory: Equipment[], rarity: FusionSourceRarity) {
  const groups = new Map<string, Equipment[]>();
  for (const item of inventory) if (isFusionIngredient(item, rarity)) {
    const key = fusionItemKey(item);
    const items = groups.get(key) || [];
    items.push(item);
    groups.set(key, items);
  }
  const entries = [...groups.values()].flatMap(items => {
    const recipe = fusionRecipe(rarity, items[0])!;
    const batches = Math.floor(items.length / recipe.ingredientCount);
    return batches ? [{template:items[0], recipe, batches, items:items.slice(0, batches*recipe.ingredientCount)}] : [];
  });
  return {entries, consumedCount:entries.reduce((sum, entry)=>sum+entry.items.length,0), batches:entries.reduce((sum,entry)=>sum+entry.batches,0), fee:entries.reduce((sum,entry)=>sum+entry.recipe.fee*entry.batches,0)};
}

/** Enhanced or socketed equipment is deliberately protected from being consumed. */
export function isFusionIngredient(item: Equipment, rarity: FusionSourceRarity) {
  return item.rarity === rarity && item.enhance === 0 && !hasEquipmentInvestment(item);
}
