import type { EquipmentKind } from "./equipment-slots";
import type { Equipment } from "./game-state";

/** Stable content IDs: series-{requiredLevel}-{part}. Display names can change safely. */
export const EQUIPMENT_TIER_LEVELS = [1, 20, 40, 50, 70, 90, 120, 150, 180, 200] as const;
export type EquipmentTierLevel = typeof EQUIPMENT_TIER_LEVELS[number];
export type SeriesPart = "weapon" | "helm" | "armor" | "gloves" | "waist" | "boots" | "accessory";

const parts = [
  { id: "weapon", label: "武器", slot: "weapon", image: "/game-assets/item-weapon-0.png" },
  { id: "helm", label: "頭", slot: "helm", image: "/game-assets/item-helm-0.png" },
  { id: "armor", label: "身體", slot: "armor", image: "/game-assets/item-armor-0.png" },
  { id: "gloves", label: "手", slot: "gloves", image: "/game-assets/item-gloves-0.png" },
  { id: "waist", label: "腰（護身符欄）", slot: "amulet", image: "/game-assets/item-amulet-0.png" },
  { id: "boots", label: "腳", slot: "boots", image: "/game-assets/item-boots-0.png" },
  { id: "accessory", label: "飾品（戒指欄）", slot: "ring", image: "/game-assets/item-ring-0.png" },
] as const;

const series = [
  { level: 1, name: "初行商旅", items: ["護路短刀", "布旅帽", "商旅布衣", "粗布護手", "布革腰帶", "草編行鞋", "行商銅戒"] },
  { level: 20, name: "驛路青銅", items: ["驛路長劍", "青銅護盔", "驛路皮甲", "青銅護手", "驛站革帶", "驛路長靴", "驛符銅戒"] },
  { level: 40, name: "山海道旅", items: ["山海彎刀", "山海斗笠", "山海戰衣", "山海護腕", "山海腰封", "山海短靴", "山海玉戒"] },
  { level: 50, name: "玄鐵護商", items: ["玄鐵護商劍", "玄鐵戰盔", "玄鐵重甲", "玄鐵手甲", "玄鐵腰帶", "玄鐵戰靴", "玄鐵印戒"] },
  { level: 70, name: "赤焰遠征", items: ["赤焰遠征刀", "赤焰頭冠", "赤焰戰袍", "赤焰護手", "赤焰腰封", "赤焰行軍靴", "赤焰紋戒"] },
  { level: 90, name: "蒼風疾行", items: ["蒼風疾行劍", "蒼風輕盔", "蒼風羽衣", "蒼風臂甲", "蒼風束帶", "蒼風飛靴", "蒼風靈戒"] },
  { level: 120, name: "星紋守御", items: ["星紋守御槍", "星紋戰冠", "星紋守御甲", "星紋鐵手", "星紋護腰", "星紋戰靴", "星紋寶戒"] },
  { level: 150, name: "雷霆先鋒", items: ["雷霆先鋒刃", "雷霆角盔", "雷霆先鋒甲", "雷霆腕甲", "雷霆戰帶", "雷霆疾靴", "雷霆銘戒"] },
  { level: 180, name: "雲海龍紋", items: ["雲海龍紋劍", "雲海龍冠", "雲海龍袍", "雲海龍爪", "雲海龍帶", "雲海龍靴", "雲海龍戒"] },
  { level: 200, name: "天衡聖商", items: ["天衡聖商劍", "天衡聖冠", "天衡聖甲", "天衡聖手", "天衡聖帶", "天衡聖靴", "天衡聖戒"] },
] as const;

function stats(level: number, part: SeriesPart) {
  const n = Math.round;
  switch (part) {
    case "weapon": return { atk: n(8 + level * 0.85), def: 0, hp: 0 };
    case "helm": return { atk: 0, def: n(4 + level * 0.55), hp: n(20 + level * 3) };
    case "armor": return { atk: 0, def: n(10 + level * 2.1), hp: n(40 + level * 6) };
    case "gloves": return { atk: n(2 + level * 0.22), def: n(3 + level * 0.22), hp: n(10 + level * 1.5) };
    case "waist": return { atk: 0, def: n(3 + level * 0.35), hp: n(20 + level * 3) };
    case "boots": return { atk: n(1 + level * 0.12), def: n(3 + level * 0.3), hp: n(10 + level * 2) };
    case "accessory": return { atk: n(2 + level * 0.28), def: n(1 + level * 0.12), hp: n(10 + level * 1.5) };
  }
}

export type TierEquipment = { id: string; name: string; slot: EquipmentKind; atk: number; def: number; hp: number; image: string; requiredLevel: EquipmentTierLevel; series: string; part: SeriesPart; partLabel: string };

export const tierEquipmentCatalog: TierEquipment[] = series.flatMap((tier) => parts.map((part, index) => ({
  id: `series-${tier.level}-${part.id}`,
  name: tier.items[index],
  slot: part.slot,
  ...stats(tier.level, part.id),
  image: part.image,
  requiredLevel: tier.level,
  series: tier.name,
  part: part.id,
  partLabel: part.label,
}))) as TierEquipment[];

export function equipmentAtTier(level: EquipmentTierLevel): TierEquipment[] {
  return tierEquipmentCatalog.filter((item) => item.requiredLevel === level);
}

/** Independent acquisition entries; later maps can replace shop sources without changing item IDs. */
export const TIER_EQUIPMENT_DROP_REGIONS = [
  { id: "gear-region-starter", mapId: "starter-outskirts", tiers: [1, 20] },
  { id: "gear-region-lake", mapId: "millennium-lake", tiers: [40, 50] },
  { id: "gear-region-sea", mapId: "japan-sea", tiers: [70, 90] },
] as const;

export const TIER_EQUIPMENT_SHOP_ID = "gear-shop-future-regions";
export const TIER_EQUIPMENT_SHOP_LEVELS = [120, 150, 180, 200] as const;
export const tierEquipmentShopCatalog = tierEquipmentCatalog.filter((item) =>
  TIER_EQUIPMENT_SHOP_LEVELS.some((level) => level === item.requiredLevel));

export function tierEquipmentPrice(spec: TierEquipment): number {
  return Math.round((1000 + spec.requiredLevel ** 2 * 2) * (spec.part === "weapon" ? 1.3 : spec.part === "armor" ? 1.15 : 1));
}

export const TIER_EQUIPMENT_NORMAL_DROP_RATE = 0.04;
export const TIER_EQUIPMENT_BOSS_DROP_RATE = 0.12;

export function pickTierEquipmentDrop(mapId: string | undefined, heroLevel: number, boss: boolean, dropRoll: number, itemRoll: number): TierEquipment | null {
  const region = TIER_EQUIPMENT_DROP_REGIONS.find((entry) => entry.mapId === mapId);
  if (!region || dropRoll >= (boss ? TIER_EQUIPMENT_BOSS_DROP_RATE : TIER_EQUIPMENT_NORMAL_DROP_RATE)) return null;
  const pool = region.tiers.filter((tier) => heroLevel >= tier).flatMap((tier) => equipmentAtTier(tier));
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(itemRoll * pool.length)))];
}

export function makeTierEquipment(spec: TierEquipment, uid: string, source: string): Equipment {
  return {
    uid, name: spec.name, slot: spec.slot, atk: spec.atk, def: spec.def, hp: spec.hp,
    image: spec.image, enhance: 0, rarity: "普通", magic: [], requiredLevel: spec.requiredLevel,
    source, bonus: { str: 0, agi: 0, intel: 0, vit: 0 }, resist: { physical: 0, magic: 0 },
  };
}

export function makeTierEquipmentDrop(spec: TierEquipment, uid: string, monsterName: string): Equipment {
  return makeTierEquipment(spec, uid, `怪物掉落・${monsterName}`);
}
