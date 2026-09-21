import { ECOLOGY_MONSTERS } from "./dungeon-monsters.ts";

export type WorldMapId = "starter-outskirts" | "korea-field" | "millennium-lake" | "japan-sea" | "miasma-forest" | "sumeru";

export type SourceEnemyDefinition = {
  id: string;
  name: string;
  mapId: WorldMapId;
  xp?: number;
  grade?: number;
  element?: string;
  physicalResistance: number;
  magicResistance: number;
  drops: string[];
  boss?: boolean;
  skill?: string;
};

export const sourceEnemyDefinitions: SourceEnemyDefinition[] = [
  { name: "狸貓", id: "e_starter_raccoon", mapId: "starter-outskirts", physicalResistance: 0, magicResistance: 0, drops: ["[隨便的]咒術秘訣", "藍色精氣石", "舊斧頭", "下級精髓", "古錢箱"] },
  { name: "倭寇", id: "e_starter_wako", mapId: "starter-outskirts", physicalResistance: 0, magicResistance: 0, drops: ["舊木劍", "舊六面木棒", "舊金剛爪刀", "下級精髓", "古錢箱"] },
  { name: "鐵炮倭寇", id: "e_starter_gunner", mapId: "starter-outskirts", physicalResistance: 0, magicResistance: 0, drops: ["[訓練用]咒術秘訣", "舊摩呼羅迦佛珠", "藍色精氣石", "下級精髓", "古錢箱"] },
  { name: "山賊", id: "e_starter_bandit", mapId: "starter-outskirts", physicalResistance: 0, magicResistance: 0, drops: ["下級精髓", "桂皮", "[訓練用]咒術秘訣", "舊短弓", "古錢箱"] },
  { name: "海賊", id: "e_starter_pirate", mapId: "starter-outskirts", physicalResistance: 0, magicResistance: 0, drops: ["海鮮", "牛黃", "舊三叉戟", "下級精髓", "古錢箱"] },
  { name: "鐵鉤海賊", id: "e_starter_hook_pirate", mapId: "starter-outskirts", physicalResistance: 0, magicResistance: 0, drops: ["熟地黃", "舊貓娃娃", "舊蓮花佛鐘", "下級精髓", "古錢箱"] },
  { name: "海賊王", id: "e_starter_pirate_king", mapId: "starter-outskirts", grade: 9, physicalResistance: 290, magicResistance: 290, drops: ["古錢箱", "幽冥石", "[新手]兌換銅錢"], boss: true },
  { name: "鹿", id: "e_korea_field_deer", mapId: "korea-field", xp: 6, physicalResistance: 0, magicResistance: 0, drops: ["甘草", "鹿茸", "下級精髓"] },
  { name: "小山賊", id: "e_korea_field_small_bandit", mapId: "korea-field", xp: 7, physicalResistance: 0, magicResistance: 0, drops: ["乾馬肉", "舊念珠", "下級精髓"] },
  { name: "弓手山賊", id: "e_korea_field_archer_bandit", mapId: "korea-field", xp: 8, physicalResistance: 0, magicResistance: 0, drops: ["藍色精氣石", "白銀咒術秘訣", "下級精髓"] },
  { name: "毒蛾", id: "e_korea_field_poison_moth", mapId: "korea-field", xp: 20, physicalResistance: 0, magicResistance: 0, drops: ["毒蛾翅", "甘草"] },
  { name: "鐵鎚山賊", id: "e_korea_field_hammer_bandit", mapId: "korea-field", xp: 15, physicalResistance: 0, magicResistance: 0, drops: ["鐵塊", "下級精髓"] },
  { name: "老虎", id: "e_korea_field_tiger", mapId: "korea-field", xp: 18, physicalResistance: 0, magicResistance: 0, drops: ["虎皮", "虎骨"] },
  { name: "夜叉", id: "e_korea_field_yaksha", mapId: "korea-field", xp: 45, physicalResistance: 10, magicResistance: 10, drops: ["夜叉角", "青色精氣石"] },
  { name: "飛虎", id: "e_korea_field_flying_tiger", mapId: "korea-field", xp: 9500, physicalResistance: 70, magicResistance: 70, drops: ["高級方天戟", "見月劍", "上級精髓"], boss: true },
  { name: "赤賊", id: "e_lake_red_thief", mapId: "millennium-lake", grade: 1, physicalResistance: 0, magicResistance: 0, drops: ["大黃", "骨針", "青色精氣石", "下級精髓"] },
  { name: "巫女", id: "e_lake_shamaness", mapId: "millennium-lake", grade: 2, physicalResistance: 30, magicResistance: 80, drops: ["千年石", "銀松草", "舊堅固密號符", "中級精髓"] },
  { name: "司令武女", id: "e_lake_commander", mapId: "millennium-lake", grade: 2, physicalResistance: 50, magicResistance: 80, drops: ["赤色精氣石", "紫雲妃玉", "舊白虎投石索", "中級精髓"], skill: "煉獄術" },
  { name: "詭異的小販", id: "e_lake_vendor", mapId: "millennium-lake", grade: 10, physicalResistance: 280, magicResistance: 280, drops: [] },
  { name: "詭異的獨角鬼(火)", id: "e_lake_horn_fire", mapId: "millennium-lake", grade: 10, element: "火(20)", physicalResistance: 380, magicResistance: 380, drops: ["獨角鬼的紅色袋子", "文若寶劍", "火之印章", "獨角鬼的黃玉戒指"] },
  { name: "詭異的獨角鬼(水)", id: "e_lake_horn_water", mapId: "millennium-lake", grade: 10, element: "水(20)", physicalResistance: 380, magicResistance: 380, drops: ["獨角鬼的藍色袋子", "龍頭火繩槍", "水之印章", "獨角鬼的黃玉戒指"] },
  { name: "詭異的獨角鬼(雷)", id: "e_lake_horn_lightning", mapId: "millennium-lake", grade: 10, element: "雷(20)", physicalResistance: 380, magicResistance: 380, drops: ["獨角鬼的黃色袋子", "笞刑斧", "雷之印章", "獨角鬼的黃玉戒指"] },
  { name: "詭異的獨角鬼(風)", id: "e_lake_horn_wind", mapId: "millennium-lake", grade: 10, element: "風(20)", physicalResistance: 380, magicResistance: 380, drops: ["獨角鬼的綠色袋子", "大將弓", "風之印章", "獨角鬼的黃玉戒指"] },
  { name: "阿魯塔", id: "e_lake_altur", mapId: "millennium-lake", grade: 4, physicalResistance: 170, magicResistance: 180, drops: ["神木種子", "舊龍頭火繩槍", "[龍麟做成的]咒術秘訣", "赤色精氣石", "中級精髓"], skill: "風刃術" },
  { name: "死靈武女(強)", id: "e_lake_dead_shamaness", mapId: "millennium-lake", grade: 9, physicalResistance: 280, magicResistance: 280, drops: ["雙刃弓", "古代神獸之精髓", "小型憤怒精髓"] },
  { name: "巫女(強)", id: "e_lake_shamaness_strong", mapId: "millennium-lake", grade: 9, physicalResistance: 275, magicResistance: 280, drops: ["鈴鐺刀", "古代神獸之精髓", "小型憤怒精髓"] },
  { name: "神漢男巫", id: "e_lake_male_shaman", mapId: "millennium-lake", grade: 9, element: "風(20)", physicalResistance: 265, magicResistance: 260, drops: ["楓葉石", "神漢男巫的帽子", "被封印的力量碎片", "紅摺扇", "[天璣]咒術秘訣"] },
  { name: "邪靈巫師", id: "e_lake_evil_shaman", mapId: "millennium-lake", grade: 9, element: "風(20)", physicalResistance: 275, magicResistance: 280, drops: ["楓葉石", "邪靈巫師的頭巾", "深淵的精髓", "雙刃弓", "[天璣]咒術秘訣"] },
  { name: "赤賊頭目", id: "e_lake_red_thief_chief", mapId: "millennium-lake", grade: 10, element: "風(20)", physicalResistance: 285, magicResistance: 285, drops: ["楓葉石", "赤賊頭目的矛", "小型風之屬性石", "蛇矛", "[天璣]咒術秘訣"] },
  { name: "狂風阿魯塔", id: "e_lake_gale_altur", mapId: "millennium-lake", grade: 10, element: "風(20)", physicalResistance: 295, magicResistance: 300, drops: ["天照的手套", "狂風花", "楓葉石", "古代神獸之精髓", "小型風之屬性石", "[天璣]咒術秘訣", "[新手]兌換銅錢"], skill: "白虎盾／風碎", boss: true },
  { name: "河童", id: "e_japan_sea_kappa", mapId: "japan-sea", grade: 1, physicalResistance: 0, magicResistance: 0, drops: ["硬殼", "鹽醃鯖魚", "舊短劍", "下級精髓"] },
  { name: "蝙蝠", id: "e_japan_sea_bat", mapId: "japan-sea", grade: 1, physicalResistance: 0, magicResistance: 30, drops: ["雜肉", "舊長銃砲", "舊白羽扇", "下級精髓"] },
  { name: "海蟹", id: "e_japan_sea_crab", mapId: "japan-sea", grade: 1, physicalResistance: 20, magicResistance: 0, drops: ["蟹醬", "藍色精氣石", "[龍麟做成的]咒術秘訣", "下級精髓"] },
  { name: "王水蛭", id: "e_japan_sea_leech", mapId: "japan-sea", grade: 1, physicalResistance: 20, magicResistance: 20, drops: ["正宗清酒", "舊銀製投石索", "舊青刃斧", "下級精髓"] },
  { name: "海星", id: "e_japan_sea_starfish", mapId: "japan-sea", grade: 10, physicalResistance: 240, magicResistance: 230, drops: ["飛摺扇", "華麗的珊瑚", "破裂的令牌", "海星碎片", "生命的精髓"] },
  { name: "海星(強)", id: "e_japan_sea_starfish_strong", mapId: "japan-sea", grade: 9, physicalResistance: 275, magicResistance: 270, drops: ["飛摺扇", "華麗的珊瑚", "破裂的令牌", "海星碎片", "生命的精髓"] },
  { name: "黃金海星", id: "e_japan_sea_golden_starfish", mapId: "japan-sea", grade: 10, element: "水(20)", physicalResistance: 300, magicResistance: 295, drops: ["黃帝的腰帶", "結冰石", "黃金海星的殼", "海星碎片", "[天璇]咒術秘訣", "小型憤怒精髓"], skill: "恢復術／火焰燎原／詛咒" },
  { name: "食魂獸", id: "e_white_tiger_soul_eater", mapId: "miasma-forest", grade: 8, physicalResistance: 230, magicResistance: 210, drops: ["[風雲的]咒術秘訣", "食魂獸門牙", "上級精髓", "結晶碎片(風)", "小型憤怒精髓"] },
  { name: "黑色商團飼育師", id: "e_white_tiger_trainer", mapId: "miasma-forest", grade: 7, physicalResistance: 220, magicResistance: 240, drops: ["飛虎頭盔", "撕裂的書信", "生命的精髓", "結晶碎片(風)", "小型憤怒精髓"] },
  { name: "人魂蜘蛛", id: "e_white_tiger_spider", mapId: "miasma-forest", grade: 8, physicalResistance: 230, magicResistance: 220, drops: ["金剛石指環", "粗糙的頭髮", "生命的精髓", "結晶碎片(風)", "小型憤怒精髓"] },
  { name: "狂虎", id: "e_white_tiger_fierce_tiger", mapId: "miasma-forest", grade: 10, physicalResistance: 240, magicResistance: 250, drops: ["神獸之根源(白虎)", "狂虎之爪", "狂虎鬍鬚", "白虎的罈子", "小型憤怒精髓"], boss: true },
  { name: "訓練的雷獸", id: "e_sumeru_training_thunder_beast", mapId: "sumeru", grade: 7, physicalResistance: 220, magicResistance: 220, drops: ["幻獸之魂", "赤色精氣石", "上級精髓", "小型憤怒精髓"] },
  { name: "訓練的瘟神", id: "e_sumeru_training_plague_god", mapId: "sumeru", grade: 7, physicalResistance: 220, magicResistance: 225, drops: ["幻獸之魂", "赤色精氣石", "上級精髓", "小型憤怒精髓"] },
  { name: "訓練的虎鶴", id: "e_sumeru_training_tiger_crane", mapId: "sumeru", grade: 7, physicalResistance: 225, magicResistance: 220, drops: ["幻獸之魂", "赤色精氣石", "上級精髓", "小型憤怒精髓"] },
  { name: "青臉夜叉金剛", id: "e_sumeru_blue_yaksha_vajra", mapId: "sumeru", grade: 9, physicalResistance: 250, magicResistance: 265, drops: ["須彌石", "夜叉金剛之角", "上級精髓", "小型憤怒精髓"] },
  { name: "辟寒金剛", id: "e_sumeru_bihan_vajra", mapId: "sumeru", grade: 9, physicalResistance: 270, magicResistance: 270, drops: ["須彌石", "金剛碎片", "上級精髓", "小型憤怒精髓"] },
  { name: "紫賢金剛", id: "e_sumeru_zixian_vajra", mapId: "sumeru", grade: 9, physicalResistance: 280, magicResistance: 280, drops: ["須彌石", "紫賢寶珠", "上級精髓", "小型憤怒精髓"] },
  { name: "強力棍兵", id: "e_sumeru_mighty_staff_guard", mapId: "sumeru", grade: 9, physicalResistance: 285, magicResistance: 285, drops: ["須彌石", "鬼煞之棍", "上級精髓", "小型憤怒精髓"] },
  { name: "神獸玄武", id: "e_sumeru_black_tortoise", mapId: "sumeru", grade: 10, physicalResistance: 265, magicResistance: 275, drops: ["神獸之魂(玄武)", "玄武甲片", "須彌石", "小型憤怒精髓"] },
  { name: "神獸白虎", id: "e_sumeru_white_tiger", mapId: "sumeru", grade: 10, physicalResistance: 280, magicResistance: 285, drops: ["神獸之魂(白虎)", "白虎之牙", "須彌石", "小型憤怒精髓"] },
  { name: "多聞天王", id: "e_sumeru_vaisravana", mapId: "sumeru", grade: 10, physicalResistance: 298, magicResistance: 295, drops: ["多聞天王的冠飾", "神獸之魂(玄武)", "須彌石", "小型憤怒精髓"], boss: true },
  { name: "廣目天王", id: "e_sumeru_virupaksa", mapId: "sumeru", grade: 10, physicalResistance: 295, magicResistance: 299, drops: ["廣目天王的寶珠", "神獸之魂(白虎)", "須彌石", "小型憤怒精髓"], boss: true },
];

export const monsterDungeonKeys = sourceEnemyDefinitions.reduce<Record<string, keyof typeof ECOLOGY_MONSTERS>>((keys, enemy) => {
  if (enemy.id in ECOLOGY_MONSTERS) keys[enemy.name] = enemy.id as keyof typeof ECOLOGY_MONSTERS;
  return keys;
}, {});
