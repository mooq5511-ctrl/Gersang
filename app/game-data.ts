export type Grade = "merc" | "general" | "special";
export type EquipmentSlot = "weapon" | "armor" | "helm" | "boots" | "accessory";

export type MercenaryDef = {
  id: string;
  name: string;
  job: string;
  grade: Grade;
  city: string;
  str: number;
  agi: number;
  intel: number;
  vit: number;
  cost: number;
  idle: string;
  attack: string;
  sprites: string[];
  skill: string;
};

const char = (name: string) => `/assets/characters/${name}`;

export const mercenaries: MercenaryDef[] = [
  { id: "mulan", name: "穆蘭", job: "武將", grade: "general", city: "漢陽", str: 62, agi: 75, intel: 48, vit: 58, cost: 24000, idle: char("char_003_MULAN_N.png"), attack: char("char_000_MULAN_A1.png"), sprites: ["char_000_MULAN_A1.png", "char_001_MULAN_A2.png", "char_002_MULAN_D.png", "char_003_MULAN_N.png", "char_004_MULAN_R.png"].map(char), skill: "月華斬" },
  { id: "musun", name: "穆善", job: "武神", grade: "general", city: "漢陽", str: 82, agi: 56, intel: 36, vit: 78, cost: 24000, idle: char("char_008_MUSUN_N.png"), attack: char("char_005_MUSUN_A1.png"), sprites: ["char_005_MUSUN_A1.png", "char_006_MUSUN_A2.png", "char_007_MUSUN_D.png", "char_008_MUSUN_N.png", "char_009_MUSUN_R.png"].map(char), skill: "裂地擊" },
  { id: "nobu", name: "信夫", job: "刀客", grade: "general", city: "京都", str: 74, agi: 82, intel: 34, vit: 61, cost: 24000, idle: char("char_016_Nobu_N.png"), attack: char("char_011_Nobu_A1.png"), sprites: ["char_010_Nobu_A.png", "char_011_Nobu_A1.png", "char_012_Nobu_A1_EFFECT.png", "char_013_Nobu_A_EFFECT.png", "char_014_Nobu_D.png", "char_015_Nobu_D_EFFECT.png", "char_016_Nobu_N.png", "char_017_Nobu_N_EFFECT.png", "char_018_Nobu_R.png", "char_019_Nobu_R_EFFECT.png"].map(char), skill: "鬼切" },
  { id: "poong", name: "風龍", job: "陰陽師", grade: "merc", city: "漢陽", str: 32, agi: 44, intel: 92, vit: 48, cost: 7000, idle: char("char_022_PoongRyong_N.png"), attack: char("char_020_PoongRyong_A1.png"), sprites: ["char_020_PoongRyong_A1.png", "char_021_PoongRyong_D.png", "char_022_PoongRyong_N.png", "char_023_PoongRyong_R.png"].map(char), skill: "風刃術" },
  { id: "su", name: "水龍", job: "巫女", grade: "merc", city: "南京", str: 36, agi: 52, intel: 88, vit: 55, cost: 7000, idle: char("char_026_SuRyong_N.png"), attack: char("char_024_SuRyong_A1.png"), sprites: ["char_024_SuRyong_A1.png", "char_025_SuRyong_D.png", "char_026_SuRyong_N.png", "char_027_SuRyong_R.png"].map(char), skill: "水鏡術" },
  { id: "youngf", name: "英娘", job: "巫女", grade: "merc", city: "南京", str: 40, agi: 67, intel: 79, vit: 52, cost: 7000, idle: char("char_030_YoungRang_F_N.png"), attack: char("char_028_YoungRang_F_A1.png"), sprites: ["char_028_YoungRang_F_A1.png", "char_029_YoungRang_F_D.png", "char_030_YoungRang_F_N.png", "char_031_YoungRang_F_R.png"].map(char), skill: "靈火" },
  { id: "youngt", name: "英娘・天", job: "術士", grade: "general", city: "北京", str: 34, agi: 62, intel: 86, vit: 49, cost: 24000, idle: char("char_034_YoungRang_T_N.png"), attack: char("char_032_YoungRang_T_A1.png"), sprites: ["char_032_YoungRang_T_A1.png", "char_033_YoungRang_T_D.png", "char_034_YoungRang_T_N.png", "char_035_YoungRang_T_R.png"].map(char), skill: "天火輪" },
  { id: "zinf", name: "真妙手", job: "陰陽師", grade: "merc", city: "京都", str: 30, agi: 46, intel: 95, vit: 50, cost: 7000, idle: char("char_039_Zinmyosu_F_N.png"), attack: char("char_036_Zinmyosu_F_A1.png"), sprites: ["char_036_Zinmyosu_F_A1.png", "char_037_Zinmyosu_F_A2.png", "char_038_Zinmyosu_F_D.png", "char_039_Zinmyosu_F_N.png", "char_040_Zinmyosu_F_R.png"].map(char), skill: "式神召喚" },
  { id: "zint", name: "真妙手・天", job: "法師", grade: "general", city: "北京", str: 28, agi: 43, intel: 99, vit: 48, cost: 24000, idle: char("char_044_Zinmyosu_T_N.png"), attack: char("char_041_Zinmyosu_T_A1.png"), sprites: ["char_041_Zinmyosu_T_A1.png", "char_042_Zinmyosu_T_A2.png", "char_043_Zinmyosu_T_D.png", "char_044_Zinmyosu_T_N.png", "char_045_Zinmyosu_T_R.png"].map(char), skill: "星落" },
  { id: "skbow", name: "海盜骷髏弓手", job: "特殊弓手", grade: "special", city: "釜山", str: 51, agi: 71, intel: 28, vit: 46, cost: 18000, idle: char("char_048_pirate_skeleton_bow_N.png"), attack: char("char_046_pirate_skeleton_bow_A.png"), sprites: ["char_046_pirate_skeleton_bow_A.png", "char_047_pirate_skeleton_bow_D.png", "char_048_pirate_skeleton_bow_N.png", "char_049_pirate_skeleton_bow_R.png"].map(char), skill: "亡靈箭雨" },
  { id: "skcannon", name: "海盜骷髏砲手", job: "特殊砲手", grade: "special", city: "釜山", str: 68, agi: 42, intel: 39, vit: 58, cost: 18000, idle: char("char_052_pirate_skeleton_cannon_N.png"), attack: char("char_050_pirate_skeleton_cannon_A.png"), sprites: ["char_050_pirate_skeleton_cannon_A.png", "char_051_pirate_skeleton_cannon_D.png", "char_052_pirate_skeleton_cannon_N.png", "char_053_pirate_skeleton_cannon_R.png"].map(char), skill: "幽靈砲擊" },
  { id: "skcaptain", name: "海盜骷髏船長", job: "特殊將領", grade: "special", city: "釜山", str: 77, agi: 51, intel: 33, vit: 71, cost: 18000, idle: char("char_056_pirate_skeleton_captain_N.png"), attack: char("char_054_pirate_skeleton_captain_A.png"), sprites: ["char_054_pirate_skeleton_captain_A.png", "char_055_pirate_skeleton_captain_D.png", "char_056_pirate_skeleton_captain_N.png", "char_057_pirate_skeleton_captain_R.png"].map(char), skill: "船長號令" },
];

export const cities = [
  { id: "seoul", name: "漢陽", fee: 0, good: "高麗人參", base: 820, accent: "#d7ad59" },
  { id: "nanjing", name: "南京", fee: 1500, good: "絲綢", base: 1050, accent: "#df785f" },
  { id: "kyoto", name: "京都", fee: 2200, good: "漆器", base: 1380, accent: "#c890d8" },
  { id: "beijing", name: "北京", fee: 2600, good: "藥材", base: 1210, accent: "#8bc8a0" },
  { id: "busan", name: "釜山", fee: 1900, good: "海產", base: 900, accent: "#69a8d4" },
] as const;

export const formations = [
  { id: "goose", name: "雁行陣", detail: "全隊攻擊 +12%", atk: 1.12, def: 1 },
  { id: "crane", name: "鶴翼陣", detail: "技能威力 +18%", atk: 1.08, def: 1.04 },
  { id: "turtle", name: "玄武陣", detail: "生命與防禦 +20%", atk: 0.95, def: 1.2 },
] as const;

export const shopItems = [
  { id: "iron-blade", name: "精鐵長刀", slot: "weapon" as const, atk: 42, def: 0, hp: 0, price: 6800, asset: "/assets/items/a003_Weapon01_I.png" },
  { id: "merchant-robe", name: "商旅錦衣", slot: "armor" as const, atk: 0, def: 30, hp: 120, price: 6200, asset: "/assets/items/a000_Dress01_I.png" },
  { id: "scale-armor", name: "玄鐵甲", slot: "armor" as const, atk: 0, def: 48, hp: 180, price: 9800, asset: "/assets/items/a004_armor02_I.png" },
  { id: "wind-charm", name: "風靈符", slot: "accessory" as const, atk: 24, def: 8, hp: 70, price: 7600, asset: "/assets/items/a001_ELEMENT04_I.png" },
  { id: "water-charm", name: "水靈珠", slot: "accessory" as const, atk: 18, def: 14, hp: 110, price: 7600, asset: "/assets/items/a002_ELEMENT05_I.png" },
];

export const slotNames: Record<EquipmentSlot, string> = {
  weapon: "武器",
  armor: "防具",
  helm: "頭盔",
  boots: "鞋子",
  accessory: "飾品",
};
