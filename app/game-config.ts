import type { DungeonKey } from "./dungeon-engine";
import { gersangHeroArt } from "./gersang-visuals";
import type { Equipment } from "./game-state";
import type { NationId } from "./v15-data";

export const monsterDungeonKeys: Record<string, DungeonKey> = { '狸貓':'e_starter_raccoon','倭寇':'e_starter_wako','鐵炮倭寇':'e_starter_gunner','山賊':'e_starter_bandit','海賊':'e_starter_pirate','鐵鉤海賊':'e_starter_hook_pirate','海賊王':'e_starter_pirate_king','赤賊':'e_lake_red_thief','巫女':'e_lake_shamaness','司令武女':'e_lake_commander','詭異的小販':'e_lake_vendor','詭異的獨角鬼(火)':'e_lake_horn_fire','詭異的獨角鬼(水)':'e_lake_horn_water','詭異的獨角鬼(雷)':'e_lake_horn_lightning','詭異的獨角鬼(風)':'e_lake_horn_wind','阿魯塔':'e_lake_altur','死靈武女(強)':'e_lake_dead_shamaness','巫女(強)':'e_lake_shamaness_strong','神漢男巫':'e_lake_male_shaman','邪靈巫師':'e_lake_evil_shaman','赤賊頭目':'e_lake_red_thief_chief','狂風阿魯塔':'e_lake_gale_altur','河童':'e_japan_sea_kappa','蝙蝠':'e_japan_sea_bat','海蟹':'e_japan_sea_crab','王水蛭':'e_japan_sea_leech','海星':'e_japan_sea_starfish','海星(強)':'e_japan_sea_starfish_strong','黃金海星':'e_japan_sea_golden_starfish','食魂獸':'e_white_tiger_soul_eater','黑色商團飼育師':'e_white_tiger_trainer','人魂蜘蛛':'e_white_tiger_spider','狂虎':'e_white_tiger_fierce_tiger' };

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
};
