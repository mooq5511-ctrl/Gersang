export type SourceEnemy = {
  name: string;
  mapId: "starter-outskirts" | "korea-field" | "millennium-lake" | "japan-sea";
  xp: number;
  hp?: number;
  mp?: number;
  attack?: number;
  grade?: number;
  element?: string;
  physical: number;
  magic: number;
  drops: string[];
  boss?: boolean;
  skill?: string;
};

export const sourceEnemies: SourceEnemy[] = [
  { name: "狸貓", mapId: "starter-outskirts", hp: 16, attack: 6, xp: 7, physical: 0, magic: 0, drops: ["[隨便的]咒術秘訣", "藍色精氣石", "舊斧頭", "下級精髓"] },
  { name: "倭寇", mapId: "starter-outskirts", hp: 16, attack: 10, xp: 7, physical: 0, magic: 0, drops: ["舊木劍", "舊六面木棒", "舊金剛爪刀", "下級精髓"] },
  { name: "鐵炮倭寇", mapId: "starter-outskirts", hp: 20, attack: 10, xp: 10, physical: 0, magic: 0, drops: ["[訓練用]咒術秘訣", "舊摩呼羅迦佛珠", "藍色精氣石", "下級精髓"] },
  { name: "山賊", mapId: "starter-outskirts", hp: 20, attack: 8, xp: 8, physical: 0, magic: 0, drops: ["下級精髓", "桂皮", "[訓練用]咒術秘訣", "舊短弓"] },
  { name: "海賊", mapId: "starter-outskirts", hp: 140, attack: 49, xp: 40, physical: 0, magic: 0, drops: ["海鮮", "牛黃", "舊三叉戟", "下級精髓"] },
  { name: "鐵鉤海賊", mapId: "starter-outskirts", hp: 180, attack: 50, xp: 55, physical: 0, magic: 0, drops: ["熟地黃", "舊貓娃娃", "舊蓮花佛鐘", "下級精髓"] },
  { name: "海賊王", mapId: "starter-outskirts", grade: 9, hp: 8000, mp: 400, attack: 190, xp: 30000, physical: 290, magic: 290, drops: ["古錢箱", "幽冥石", "[新手]兌換銅錢"], boss: true },
  { name: "鹿", mapId: "korea-field", xp: 6, physical: 0, magic: 0, drops: ["甘草", "鹿茸", "下級精髓"] },
  { name: "小山賊", mapId: "korea-field", xp: 7, physical: 0, magic: 0, drops: ["乾馬肉", "舊念珠", "下級精髓"] },
  { name: "弓手山賊", mapId: "korea-field", xp: 8, physical: 0, magic: 0, drops: ["藍色精氣石", "白銀咒術秘訣", "下級精髓"] },
  { name: "毒蛾", mapId: "korea-field", xp: 20, physical: 0, magic: 0, drops: ["毒蛾翅", "甘草"] },
  { name: "鐵鎚山賊", mapId: "korea-field", xp: 15, physical: 0, magic: 0, drops: ["鐵塊", "下級精髓"] },
  { name: "老虎", mapId: "korea-field", xp: 18, physical: 0, magic: 0, drops: ["虎皮", "虎骨"] },
  { name: "夜叉", mapId: "korea-field", xp: 45, physical: 10, magic: 10, drops: ["夜叉角", "青色精氣石"] },
  { name: "飛虎", mapId: "korea-field", xp: 9500, physical: 70, magic: 70, drops: ["高級方天戟", "見月劍", "上級精髓"], boss: true },
  { name: "赤賊", mapId: "millennium-lake", grade: 1, hp: 80, mp: 100, attack: 8, xp: 25, physical: 0, magic: 0, drops: ["大黃", "骨針", "青色精氣石", "下級精髓"] },
  { name: "巫女", mapId: "millennium-lake", grade: 2, hp: 800, mp: 800, attack: 130, xp: 375, physical: 30, magic: 80, drops: ["千年石", "銀松草", "舊堅固密號符", "中級精髓"] },
  { name: "司令武女", mapId: "millennium-lake", grade: 2, hp: 1400, mp: 1200, attack: 135, xp: 550, physical: 50, magic: 80, drops: ["赤色精氣石", "紫雲妃玉", "舊白虎投石索", "中級精髓"], skill: "煉獄術" },
  { name: "詭異的小販", mapId: "millennium-lake", grade: 10, hp: 1200000, mp: 20000, attack: 30, xp: 0, physical: 280, magic: 280, drops: [] },
  { name: "詭異的獨角鬼(火)", mapId: "millennium-lake", grade: 10, element: "火(20)", hp: 2800000, mp: 40000, attack: 30, xp: 0, physical: 380, magic: 380, drops: ["獨角鬼的紅色袋子", "文若寶劍", "火之印章", "獨角鬼的黃玉戒指"] },
  { name: "詭異的獨角鬼(水)", mapId: "millennium-lake", grade: 10, element: "水(20)", hp: 2800000, mp: 40000, attack: 30, xp: 0, physical: 380, magic: 380, drops: ["獨角鬼的藍色袋子", "龍頭火繩槍", "水之印章", "獨角鬼的黃玉戒指"] },
  { name: "詭異的獨角鬼(雷)", mapId: "millennium-lake", grade: 10, element: "雷(20)", hp: 2800000, mp: 40000, attack: 30, xp: 0, physical: 380, magic: 380, drops: ["獨角鬼的黃色袋子", "笞刑斧", "雷之印章", "獨角鬼的黃玉戒指"] },
  { name: "詭異的獨角鬼(風)", mapId: "millennium-lake", grade: 10, element: "風(20)", hp: 2800000, mp: 40000, attack: 30, xp: 0, physical: 380, magic: 380, drops: ["獨角鬼的綠色袋子", "大將弓", "風之印章", "獨角鬼的黃玉戒指"] },
  { name: "阿魯塔", mapId: "millennium-lake", grade: 4, hp: 6000, mp: 2000, attack: 280, xp: 3300, physical: 170, magic: 180, drops: ["神木種子", "舊龍頭火繩槍", "[龍麟做成的]咒術秘訣", "赤色精氣石", "中級精髓"], skill: "風刃術" },
  { name: "死靈武女(強)", mapId: "millennium-lake", grade: 9, hp: 50000, mp: 10000, attack: 1100, xp: 100000, physical: 280, magic: 280, drops: ["雙刃弓", "古代神獸之精髓", "小型憤怒精髓"] },
  { name: "巫女(強)", mapId: "millennium-lake", grade: 9, hp: 40000, mp: 10000, attack: 500, xp: 90000, physical: 275, magic: 280, drops: ["鈴鐺刀", "古代神獸之精髓", "小型憤怒精髓"] },
  { name: "神漢男巫", mapId: "millennium-lake", grade: 9, element: "風(20)", hp: 200000, mp: 10000, attack: 150, xp: 50000, physical: 265, magic: 260, drops: ["楓葉石", "神漢男巫的帽子", "被封印的力量碎片", "紅摺扇", "[天璣]咒術秘訣"] },
  { name: "邪靈巫師", mapId: "millennium-lake", grade: 9, element: "風(20)", hp: 480000, mp: 20000, attack: 300, xp: 100000, physical: 275, magic: 280, drops: ["楓葉石", "邪靈巫師的頭巾", "深淵的精髓", "雙刃弓", "[天璣]咒術秘訣"] },
  { name: "赤賊頭目", mapId: "millennium-lake", grade: 10, element: "風(20)", hp: 560000, mp: 10000, attack: 800, xp: 120000, physical: 285, magic: 285, drops: ["楓葉石", "赤賊頭目的矛", "小型風之屬性石", "蛇矛", "[天璣]咒術秘訣"] },
  { name: "狂風阿魯塔", mapId: "millennium-lake", grade: 10, element: "風(20)", hp: 1200000, mp: 20000, xp: 250000, physical: 295, magic: 300, drops: ["天照的手套", "狂風花", "楓葉石", "古代神獸之精髓", "小型風之屬性石", "[天璣]咒術秘訣", "[新手]兌換銅錢"], skill: "狂風刃術", boss: true },
  { name: "河童", mapId: "japan-sea", grade: 1, hp: 80, mp: 0, attack: 10, xp: 40, physical: 0, magic: 0, drops: ["硬殼", "鹽醃鯖魚", "舊短劍", "下級精髓"] },
  { name: "蝙蝠", mapId: "japan-sea", grade: 1, hp: 80, mp: 0, attack: 7, xp: 55, physical: 0, magic: 30, drops: ["雜肉", "舊長銃砲", "舊白羽扇", "下級精髓"] },
  { name: "海蟹", mapId: "japan-sea", grade: 1, hp: 320, mp: 40, attack: 20, xp: 95, physical: 20, magic: 0, drops: ["蟹醬", "藍色精氣石", "[龍麟做成的]咒術秘訣", "下級精髓"] },
  { name: "王水蛭", mapId: "japan-sea", grade: 1, hp: 230, mp: 0, attack: 19, xp: 100, physical: 20, magic: 20, drops: ["正宗清酒", "舊銀製投石索", "舊青刃斧", "下級精髓"] },
  { name: "海星", mapId: "japan-sea", grade: 10, hp: 65000, mp: 8000, attack: 600, xp: 18000, physical: 240, magic: 230, drops: ["飛摺扇", "華麗的珊瑚", "破裂的令牌", "海星碎片", "生命的精髓"] },
  { name: "海星(強)", mapId: "japan-sea", grade: 9, hp: 260000, mp: 10000, attack: 800, xp: 55000, physical: 275, magic: 270, drops: ["飛摺扇", "華麗的珊瑚", "破裂的令牌", "海星碎片", "生命的精髓"] },
  { name: "黃金海星", mapId: "japan-sea", grade: 10, element: "水(20)", hp: 1000000, mp: 20000, attack: 2000, xp: 200000, physical: 300, magic: 295, drops: ["黃帝的腰帶", "結冰石", "黃金海星的殼", "海星碎片", "[天璇]咒術秘訣", "小型憤怒精髓"] },
];

export function sourceEnemyForMap(mapId: string, stage: number, isBoss: boolean, preferredName?: string) {
  const candidates = sourceEnemies.filter((enemy) => enemy.mapId === mapId && Boolean(enemy.boss) === isBoss);
  if (!candidates.length) return null;
  const preferred = candidates.find((enemy) => enemy.name === preferredName);
  if (preferred) return preferred;
  return candidates[(Math.max(1, stage) - 1) % candidates.length];
}

export type OfficialEquipment = {
  id: string;
  name: string;
  kind: "weapon" | "armor";
  level: number;
  atk?: number;
  def?: number;
  str?: number;
  agi?: number;
  intel?: number;
  vit?: number;
  physical?: number;
  magic?: number;
  skill?: string;
  price: number;
};

export const officialEquipment: OfficialEquipment[] = [
  { id: "wood-blade", name: "木刀", kind: "weapon", level: 8, atk: 6, price: 1800 },
  { id: "iron-sword", name: "鐵劍", kind: "weapon", level: 34, atk: 26, price: 9000 },
  { id: "seven-star-sword", name: "七星劍", kind: "weapon", level: 52, atk: 39, price: 18000 },
  { id: "kusanagi", name: "草雉劍", kind: "weapon", level: 80, atk: 69, str: 25, intel: 10, price: 52000 },
  { id: "yitian", name: "倚天劍", kind: "weapon", level: 130, atk: 106, str: 45, vit: 30, price: 130000 },
  { id: "hot-sword", name: "火熱劍", kind: "weapon", level: 170, atk: 135, str: 100, vit: 20, intel: 50, skill: "煉獄術", price: 260000 },
  { id: "ice-sword", name: "寒冰劍", kind: "weapon", level: 185, atk: 158, str: 120, vit: 50, intel: 50, skill: "冰爆", price: 340000 },
  { id: "thunder-sword", name: "雷劍", kind: "weapon", level: 200, atk: 183, str: 150, vit: 50, intel: 50, skill: "雲雷", price: 480000 },
  { id: "leather", name: "牛皮盔甲", kind: "armor", level: 3, def: 5, price: 1200 },
  { id: "tiger-hide", name: "虎皮盔甲", kind: "armor", level: 10, def: 14, price: 3200 },
  { id: "copper-armor", name: "銅製盔甲", kind: "armor", level: 35, def: 38, price: 11000 },
  { id: "black-iron", name: "黑鐵盔甲", kind: "armor", level: 50, def: 54, price: 22000 },
  { id: "flying-tiger", name: "飛虎盔甲", kind: "armor", level: 70, def: 62, agi: 10, price: 41000 },
  { id: "white-tiger", name: "白虎盔甲", kind: "armor", level: 80, def: 90, str: 40, price: 65000 },
  { id: "water-dragon", name: "水龍盔甲", kind: "armor", level: 80, def: 81, intel: 20, physical: 30, magic: 30, price: 72000 },
  { id: "silver-armor", name: "白銀盔甲", kind: "armor", level: 120, def: 300, str: 30, vit: 30, price: 150000 },
  { id: "supreme-armor", name: "太皇盔甲", kind: "armor", level: 200, def: 500, str: 100, agi: 50, vit: 100, intel: 50, physical: 50, magic: 50, price: 620000 },
];

export const officialGems = [
  { id: "white-crystal", name: "白水晶", stat: "vit" as const, label: "體質", values: [15, 30, 60], costs: [6000, 18000, 52000] },
  { id: "placer", name: "沙金石", stat: "agi" as const, label: "敏捷", values: [15, 30, 60], costs: [6000, 18000, 52000] },
  { id: "moonstone", name: "月藏石", stat: "intel" as const, label: "智力", values: [15, 30, 60], costs: [6000, 18000, 52000] },
  { id: "obsidian", name: "黑曜石", stat: "str" as const, label: "力量", values: [15, 30, 60], costs: [6000, 18000, 52000] },
  { id: "bloodstone", name: "赤血石", stat: "all" as const, label: "全能力", values: [5, 10, 20], costs: [10000, 30000, 90000] },
];

export const awakeningProfiles: Record<string, { name: string; skill: string; stats: [number, number, number, number]; physical: number; magic: number }> = {
  "korea-1": { name: "覺醒・宣武功臣", skill: "爆流鐵壁", stats: [600, 25, 100, 200], physical: 65, magic: 65 },
  "korea-3": { name: "覺醒・源花美室", skill: "魅惑・淨化", stats: [100, 25, 275, 200], physical: 30, magic: 70 },
  "korea-4": { name: "覺醒・金庾信", skill: "火焰刺擊術", stats: [300, 45, 50, 225], physical: 70, magic: 30 },
  "korea-6": { name: "覺醒・雷法師", skill: "連雷擊・恢復術", stats: [100, 50, 300, 200], physical: 40, magic: 60 },
  "korea-7": { name: "覺醒・老黃忠臣", skill: "雷箭・雷電矢", stats: [100, 300, 100, 150], physical: 50, magic: 50 },
};

export type GameplayContract = {
  id: string;
  name: string;
  category: string;
  description: string;
  metric: "stage" | "kills" | "mercs" | "tier1" | "tier2" | "materials" | "equipment" | "awakened";
  target: number;
  reward: { gold: number; cores?: number; soul?: number; awakening?: number };
};

export const gameplayContracts: GameplayContract[] = [
  { id: "field-10", name: "朝鮮地面巡查", category: "怪物地圖", description: "推進至第 10 關，完成第一輪地面怪物討伐。", metric: "stage", target: 10, reward: { gold: 18000, cores: 1 } },
  { id: "hunt-20", name: "千年湖討伐令", category: "任務", description: "累計擊敗 20 隻怪物。", metric: "kills", target: 20, reward: { gold: 30000, soul: 5 } },
  { id: "roster-8", name: "八人商團", category: "傭兵", description: "商團名冊擁有 8 名傭兵。", metric: "mercs", target: 8, reward: { gold: 24000, cores: 2 } },
  { id: "tier1-2", name: "將帥初成", category: "轉職", description: "培養 2 名一階以上將帥。", metric: "tier1", target: 2, reward: { gold: 36000, soul: 5 } },
  { id: "tier2-2", name: "二階雙將", category: "轉職", description: "培養 2 名二階以上將帥。", metric: "tier2", target: 2, reward: { gold: 60000, cores: 3, soul: 10 } },
  { id: "loot-12", name: "材料收集令", category: "物品", description: "從怪物身上取得 12 件掉落材料。", metric: "materials", target: 12, reward: { gold: 28000, cores: 2 } },
  { id: "gear-6", name: "全副武裝", category: "裝備", description: "背包與全隊合計持有 6 件裝備。", metric: "equipment", target: 6, reward: { gold: 42000, soul: 5 } },
  { id: "awaken-1", name: "覺醒之路", category: "覺醒", description: "完成 1 名二階將帥覺醒。", metric: "awakened", target: 1, reward: { gold: 120000, cores: 5, awakening: 1 } },
];
