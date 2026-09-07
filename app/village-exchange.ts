import { gersangStages } from './gersang-world-map.ts';

/** 地圖掉落物的村莊收購價，直接由同一份地圖資料推導，避免戰利品與商店價格脫節。 */
export const MATERIAL_PRICES: Record<string, number> = {
  ...Object.fromEntries(gersangStages.flatMap(stage => stage.monster.drops.map(drop => [drop.item, drop.price]))),
  '[隨便的]咒術秘訣': 1200,
  '藍色精氣石': 30,
  '舊斧頭': 5000,
  '下級精髓': 25,
  '古錢箱': 1,
  '舊木劍': 2500,
  '舊六面木棒': 2500,
  '舊金剛爪刀': 2500,
  '[訓練用]咒術秘訣': 1000,
  '舊摩呼羅迦佛珠': 2500,
  '桂皮': 3,
  '舊短弓': 33,
  '海鮮': 33,
  '牛黃': 33,
  '舊三叉戟': 2500,
  '熟地黃': 33,
  '舊貓娃娃': 2500,
  '舊蓮花佛鐘': 2500,
  '幽冥石': 1000,
};

/** 村莊販售價固定為收購價的兩倍，避免來回買賣產生無限套利。 */
export const MATERIAL_BUY_PRICES: Record<string, number> = Object.fromEntries(
  Object.entries(MATERIAL_PRICES).map(([name, sell]) => [name, sell * 2]),
);

export const VILLAGE_WEAPONS = [
  { id: 'refined-steel-sword', name: '精製鋼劍', baseCost: 500, atkBonus: 8 },
  { id: 'advanced-ring-bow', name: '高級環弓', baseCost: 2500, atkBonus: 25 },
  { id: 'general-square-blade', name: '大將軍四角刀', baseCost: 12000, atkBonus: 80 },
  { id: 'immortal-great-blade', name: '神仙大刀（神兵）', baseCost: 50000, atkBonus: 300 },
] as const;

export type VillageWeaponId = (typeof VILLAGE_WEAPONS)[number]['id'];
export type ExchangePurchases = Partial<Record<VillageWeaponId, number>>;

export function weaponCost(id: VillageWeaponId, purchases: ExchangePurchases) {
  const good = VILLAGE_WEAPONS.find(item => item.id === id)!;
  return Math.floor(good.baseCost * 1.3 ** Math.max(0, purchases[id] || 0));
}

/** 村莊武器屬於永久鍛造加成，不占裝備欄，可與穿戴裝備同時生效。 */
export function exchangeAttackBonus(purchases: ExchangePurchases) {
  return VILLAGE_WEAPONS.reduce((sum, good) => sum + Math.max(0, purchases[good.id] || 0) * good.atkBonus, 0);
}

export function sellMaterial(materials: Record<string, number>, gold: number, itemName: string, amount = 1) {
  const owned = Math.max(0, Math.floor(materials[itemName] || 0));
  const price = MATERIAL_PRICES[itemName];
  const quantity = Math.min(owned, Math.max(1, Math.floor(amount)));
  if (!price || quantity <= 0) return { materials, gold, earned: 0, error: '沒有可出售的「' + itemName + '」。' };
  const next = { ...materials };
  const remains = owned - quantity;
  if (remains > 0) next[itemName] = remains;
  else delete next[itemName];
  const earned = price * quantity;
  return { materials: next, gold: gold + earned, earned, error: null };
}

export function sellAllMaterials(materials: Record<string, number>, gold: number) {
  // 古錢箱保留給玩家自行確認，避免全部出售時誤失去開箱機會。
  const earned = Object.entries(materials).reduce((sum, [name, count]) => sum + (name === '古錢箱' ? 0 : (MATERIAL_PRICES[name] || 0) * Math.max(0, Math.floor(count))), 0);
  const unsellable = Object.fromEntries(Object.entries(materials).filter(([name]) => name === '古錢箱' || !MATERIAL_PRICES[name]));
  return { materials: unsellable, gold: gold + earned, earned };
}

export function buyMarketMaterial(materials: Record<string, number>, gold: number, itemName: string) {
  const price = MATERIAL_BUY_PRICES[itemName];
  if (!price) return { materials, gold, spent: 0, error: '交易所沒有販售「' + itemName + '」。' };
  if (gold < price) return { materials, gold, spent: 0, error: '買入「' + itemName + '」的資金不足。' };
  return { materials: { ...materials, [itemName]: Math.max(0, Math.floor(materials[itemName] || 0)) + 1 }, gold: gold - price, spent: price, error: null };
}

export function buyVillageWeapon(gold: number, purchases: ExchangePurchases, id: VillageWeaponId) {
  const good = VILLAGE_WEAPONS.find(item => item.id === id);
  if (!good) return { gold, purchases, cost: 0, error: '找不到此村莊武器。' };
  const cost = weaponCost(id, purchases);
  if (gold < cost) return { gold, purchases, cost, error: '購買「' + good.name + '」的資金不足。' };
  return { gold: gold - cost, purchases: { ...purchases, [id]: (purchases[id] || 0) + 1 }, cost, error: null };
}
