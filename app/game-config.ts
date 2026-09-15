export { monsterDungeonKeys } from "./monster-ids";
import { gersangHeroArt } from "./gersang-visuals";
import type { Equipment } from "./game-state";
import type { NationId } from "./v15-data";

export const heroNationProfiles: Record<NationId, { title: string; skill: string; image: string; stats: [number, number, number, number] }> = {
  taiwan: { title: "南海商主", skill: "山海號令", image: gersangHeroArt.taiwan, stats: [68, 74, 72, 66] },
  china: { title: "絲路巨商", skill: "乾坤商陣", image: gersangHeroArt.china, stats: [72, 64, 78, 68] },
  korea: { title: "朝鮮大商", skill: "商團號令", image: gersangHeroArt.korea, stats: [70, 66, 68, 76] },
  japan: { title: "御用商人", skill: "疾風號令", image: gersangHeroArt.japan, stats: [68, 80, 64, 68] },
};

export const medicineCatalog = [
  { id: "healing", name: "金創藥", price: 600, effect: "主角與出戰傭兵恢復 50% 最大 HP（可救起倒下者）", heroXp: 0, mercXp: 0, hpRestore: 0.5, mpRestore: 0 },
  { id: "mana", name: "回靈散", price: 800, effect: "主角與出戰傭兵恢復 50% 最大 MP", heroXp: 0, mercXp: 0, hpRestore: 0, mpRestore: 0.5 },
  { id: "ginseng", name: "高麗人參", price: 900, effect: "主角獲得 400 經驗", heroXp: 400, mercXp: 0 },
  { id: "tonic", name: "十全大補湯", price: 1500, effect: "出戰傭兵各獲得 320 經驗", heroXp: 0, mercXp: 320 },
  { id: "vitality", name: "活力丸", price: 2400, effect: "主角與出戰傭兵各獲得 260 經驗", heroXp: 260, mercXp: 260 },
] as const;

export const SHOP_QUALITY: Record<Equipment["rarity"], { chance: number; multiplier: number }> = {
  "普通": { chance: 75, multiplier: 1 },
  "稀有": { chance: 10, multiplier: 1.5 },
  "史詩": { chance: 0.2, multiplier: 10 },
  "傳說": { chance: 0.05, multiplier: 150 },
  "金色": { chance: 0, multiplier: 1000 },
};
