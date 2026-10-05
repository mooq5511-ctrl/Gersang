/** Offline candidate only. Not a shop, save, or inventory adapter. */
export const EQUIPMENT_ECONOMY_DRAFT_VERSION = 'equipment-v1-candidate-20261004';
export const DRAFT_QUALITIES = ['普通', '稀有', '史詩', '傳說', '金色'] as const;
export type DraftQuality = typeof DRAFT_QUALITIES[number];
export const DRAFT_QUALITY_MULTIPLIERS: Record<DraftQuality, number> = {
  普通: 1, 稀有: 1.2, 史詩: 1.5, 傳說: 2, 金色: 2.5,
};
export const DRAFT_ENHANCEMENT_CAP = 15;
// Three identical, unenhanced, unsocketed items; guaranteed result. No gambling sink.
export const DRAFT_FUSION_FEES = [.25, .5, 1, 2] as const;

function checkedPrice(price: number) {
  if (!Number.isSafeInteger(price) || price < 1 || price > 1_000_000_000) throw new RangeError('Invalid canonical ordinary price');
  return price;
}
function qualityIndex(quality: DraftQuality) {
  const index = DRAFT_QUALITIES.indexOf(quality);
  if (index < 0) throw new RangeError('Unknown quality');
  return index;
}
export function draftEnhancementMultiplier(level: number) {
  if (!Number.isInteger(level) || level < 0 || level > DRAFT_ENHANCEMENT_CAP) throw new RangeError('Invalid enhancement');
  return 1 + .04 * level;
}
export function draftCoreMultiplier(quality: DraftQuality, enhance: number) {
  qualityIndex(quality);
  return DRAFT_QUALITY_MULTIPLIERS[quality] * draftEnhancementMultiplier(enhance);
}
/** Uses canonical definition price, never mutable stats, affixes, or acquisition text. */
export function draftSellQuote(ordinaryPrice: number, quality: DraftQuality) {
  qualityIndex(quality);
  return Math.floor(checkedPrice(ordinaryPrice) * .2 * DRAFT_QUALITY_MULTIPLIERS[quality]);
}
export function draftEnhancementFee(ordinaryPrice: number, nextLevel: number) {
  draftEnhancementMultiplier(nextLevel);
  if (nextLevel === 0) throw new RangeError('No upgrade to +0');
  return Math.ceil(checkedPrice(ordinaryPrice) * .1 * nextLevel);
}
/** Recursive minimum gold cost from ordinary shop items; materials/time excluded. */
export function draftCraftCost(ordinaryPrice: number, target: DraftQuality) {
  const price = checkedPrice(ordinaryPrice), index = qualityIndex(target);
  let cost = price, ordinaryItems = 1;
  for (let step = 0; step < index; step++) {
    cost = cost * 3 + Math.ceil(price * DRAFT_FUSION_FEES[step]);
    ordinaryItems *= 3;
  }
  return { cost, ordinaryItems };
}
/** Diagnostic math, not a stochastic simulation or player-time estimate. */
export function expectedSpecificDropFights(dropChance: number, poolSize: number) {
  if (!Number.isFinite(dropChance) || dropChance <= 0 || dropChance > 1 || !Number.isSafeInteger(poolSize) || poolSize < 1) throw new RangeError('Invalid drop pool');
  const probability = dropChance / poolSize;
  return { mean: 1 / probability, p95: Math.ceil(Math.log(.05) / Math.log1p(-probability)) || 1 };
}
