import {cuteEquipmentArt} from './gersang-visuals.ts';

export type NationId = "korea" | "china" | "japan" | "taiwan";

export type Nation = {
  id: NationId;
  name: string;
  capital: string;
  color: string;
  description: string;
};

export type WorldCity = {
  id: string;
  nation: NationId;
  name: string;
  specialty: string;
  travelFee: number;
  priceFactor: number;
  mercenarySlots: number[];
  generalSlots: number[];
  stockIndex: number;
};

export type BaseMercenary = {
  id: string;
  nation: NationId;
  slot: number;
  name: string;
  tier1: string;
  tier2: string;
  role: string;
  skill: string;
  image: string;
  str: number;
  agi: number;
  intel: number;
  vit: number;
};

export type LegendRecipe = {
  id: string;
  nation: NationId;
  name: string;
  needs: [string, string];
  skill: string;
};

export const nations: Nation[] = [
  { id: "korea", name: "朝鮮", capital: "漢陽", color: "#69a8d4", description: "均衡堅韌，擅長長兵器與支援術。" },
  { id: "china", name: "中國", capital: "南京", color: "#df785f", description: "兵種完整，兼具武鬥、火器與道術。" },
  { id: "japan", name: "日本", capital: "江戶", color: "#c890d8", description: "速度與爆發出色，擅長劍術與奇襲。" },
  { id: "taiwan", name: "台灣", capital: "台北", color: "#8bc8a0", description: "靈活多變，結合山林、海商與咒術。" },
];

const cityNames: Record<NationId, Array<[string, string]>> = {
  taiwan: [["台北", "茶葉"]],
  china: [["南京", "絲綢"]],
  korea: [["漢陽", "高麗人參"]],
  japan: [["江戶", "刀具"]],
};

export const worldCities: WorldCity[] = nations.flatMap((nation, nationIndex) =>
  cityNames[nation.id].map(([name, specialty], cityIndex) => ({
    id: nation.id + "-city-" + (cityIndex + 1),
    nation: nation.id,
    name,
    specialty,
    travelFee: cityIndex === 0 ? 800 + nationIndex * 120 : 1200 + nationIndex * 180 + cityIndex * 320,
    priceFactor: 0.92 + cityIndex * 0.04 + nationIndex * 0.015,
    mercenarySlots: cityIndex < 4 ? [cityIndex * 2 + 1, cityIndex * 2 + 2] : [1, 4, 7, 8],
    generalSlots: cityIndex < 4 ? [cityIndex * 2 + 1, cityIndex * 2 + 2] : [2, 5, 6],
    stockIndex: cityIndex,
  })),
);

const nationRows: Record<NationId, Array<[string, string, string, string, string]>> = {
  korea: [
    ["刀手", "權慄", "宣武功臣", "近戰", "雙刀連擊"],
    ["醫術師", "許浚", "雷戰車", "治療", "恢復術"],
    ["儒生", "柳成龍", "美室", "輔助", "麻痺攻擊"],
    ["槍兵", "金時敏", "金庾信", "前衛", "刺擊術"],
    ["弓箭手", "李舜臣", "龜甲車", "遠程", "遠距射擊"],
    ["破戒僧", "四溟大師", "雷法師", "守護", "恢復術"],
    ["騎馬弓箭手", "申砬", "老黃忠臣", "遠程", "騎射"],
    ["朝鮮挑夫", "行商隊長", "大商團都房", "商戰", "負重提升"],
  ],
  china: [
    ["道術師", "舜飛燕", "投石車", "法術", "補給術"],
    ["長槍武士", "郭厚", "項羽", "前衛", "刺擊術"],
    ["大刀武士", "祖承訓", "憤怒羅漢", "近戰", "大刀斬"],
    ["武道家", "東方不敗", "東方銀兒", "格鬥", "連環拳"],
    ["冒險家", "祝融", "聖天象神", "斥候", "麻痺攻擊"],
    ["修道僧", "諸葛孔明", "劉邦", "輔助", "恢復術"],
    ["火砲手", "李寧", "佛郎機炮", "火器", "遠距砲擊"],
    ["中國挑夫", "運糧都尉", "絲路大都督", "商戰", "負重提升"],
  ],
  japan: [
    ["陰陽師", "晴明", "黑龍車", "法術", "咒術攻擊"],
    ["騎馬武士", "小西行長", "戰鳳丸", "前衛", "騎馬突進"],
    ["忍者", "朝子", "阿莫", "奇襲", "暗殺"],
    ["退魔師", "清祥", "本願寺", "守護", "退魔術"],
    ["騎狼浪人", "德川家康", "源氏將軍", "爆發", "狼牙突擊"],
    ["鐵砲浪人", "協阪安治", "地震車", "火器", "鐵砲射擊"],
    ["劍術浪人", "加藤清正", "梵天丸", "近戰", "劍術連斬"],
    ["日本挑夫", "商旅頭領", "御用商奉行", "商戰", "負重提升"],
  ],
  taiwan: [
    ["念力師", "張仙花", "鳳凰飛鳥", "控制", "混亂術"],
    ["野獸戰士", "孫維昌", "火龍車", "近戰", "快速突擊"],
    ["棒術家", "柳永福", "羅剎", "格鬥", "培修之陣"],
    ["斧頭巨漢", "王巨漢", "猛虎", "前衛", "旋轉斧頭"],
    ["西洋槍手", "帕羅爵士", "費爾南多", "火器", "一擊必殺"],
    ["咒術師", "林平厚", "雷公", "法術", "恢復術"],
    ["原住民戰士", "趙世琳", "吉祥天", "爆發", "風刃術"],
    ["台灣挑夫", "鏢隊總管", "南海商盟主", "商戰", "負重提升"],
  ],
};

const roleStats: Record<string, [number, number, number, number]> = {
  前衛: [66, 48, 30, 72],
  遠程: [46, 72, 36, 48],
  近戰: [72, 62, 28, 58],
  法術: [28, 42, 78, 48],
  治療: [30, 44, 72, 56],
  輔助: [36, 52, 68, 54],
  火器: [62, 48, 42, 54],
  格鬥: [70, 58, 30, 64],
  控制: [32, 46, 76, 50],
  斥候: [48, 76, 42, 46],
  奇襲: [60, 80, 28, 46],
  守護: [62, 40, 44, 78],
  爆發: [76, 68, 26, 48],
  商戰: [52, 58, 62, 58],
};

export const baseMercenaries: BaseMercenary[] = nations.flatMap((nation, nationIndex) =>
  nationRows[nation.id].map(([name, tier1, tier2, role, skill], index) => {
    const stats = roleStats[role] || [50, 50, 50, 50];
    return {
      id: nation.id + "-" + (index + 1),
      nation: nation.id,
      slot: index + 1,
      name,
      tier1,
      tier2,
      role,
      skill,
      image: "/assets/mercenary-portraits/" + nation.id + "_" + (index + 1) + ".gif",
      str: stats[0] + nationIndex * 2,
      agi: stats[1] + (nationIndex === 2 ? 4 : 0),
      intel: stats[2] + (nationIndex === 1 ? 3 : 0),
      vit: stats[3] + (nationIndex === 0 ? 4 : 0),
    };
  }),
);

const legendNames: Record<NationId, string[]> = {
  korea: ["傳說・白虎神將", "傳說・天雷軍神", "傳說・神農賢帥", "傳說・震天武聖"],
  china: ["傳說・青龍霸王", "傳說・太極天師", "傳說・神農天機", "傳說・雷火羅漢"],
  japan: ["傳說・赤備劍聖", "傳說・影舞星見", "傳說・天照不動", "傳說・國崩修羅"],
  taiwan: ["傳說・山王雲豹", "傳說・祖靈玄天", "傳說・百草鎮海", "傳說・雷霆齊天"],
};

export const legendRecipes: LegendRecipe[] = nations.flatMap((nation) =>
  legendNames[nation.id].map((name, index) => ({
    id: nation.id + "-legend-" + (index + 1),
    nation: nation.id,
    name,
    needs: [nation.id + "-" + (index * 2 + 1), nation.id + "-" + (index * 2 + 2)] as [string, string],
    skill: ["四象天威", "乾坤破軍", "神域庇護", "萬軍殲滅"][index],
  })),
);

export const magicAffixes = [
  { id: "flame", name: "烈火", text: "攻擊 +12%", color: "#f07b58", stat: "atk", value: 12 },
  { id: "frost", name: "寒霜", text: "防禦 +14%", color: "#6fb8df", stat: "def", value: 14 },
  { id: "thunder", name: "雷鳴", text: "敏捷 +10%", color: "#d6bc60", stat: "agi", value: 10 },
  { id: "spirit", name: "靈氣", text: "智力 +15%", color: "#b28cdb", stat: "intel", value: 15 },
  { id: "vital", name: "長生", text: "生命 +18%", color: "#75bf8b", stat: "hp", value: 18 },
  { id: "power", name: "巨力", text: "力量 +10%", color: "#dd8d70", stat: "str", value: 10 },
] as const;

export const equipmentBases = [
  { id: "blade", name: "精鐵長刀", slot: "weapon", atk: 46, def: 0, hp: 0, image: cuteEquipmentArt("精鐵長刀", "/assets/items/a003_Weapon01_I.png") },
  { id: "robe", name: "商旅錦衣", slot: "armor", atk: 0, def: 32, hp: 130, image: cuteEquipmentArt("商旅錦衣", "/assets/items/a000_Dress01_I.png") },
  { id: "armor", name: "玄鐵甲", slot: "armor", atk: 0, def: 52, hp: 190, image: cuteEquipmentArt("玄鐵甲", "/assets/items/a004_armor02_I.png") },
  { id: "wind", name: "風靈符", slot: "accessory", atk: 26, def: 8, hp: 80, image: cuteEquipmentArt("風靈符", "/assets/items/a001_ELEMENT04_I.png") },
  { id: "water", name: "水靈珠", slot: "accessory", atk: 20, def: 16, hp: 120, image: cuteEquipmentArt("水靈珠", "/assets/items/a002_ELEMENT05_I.png") },
] as const;

export type OfficialRoster = {
  region: string;
  mercenaries: string[];
  generals: string[];
};

export type EnemyEntry = {
  region: string;
  category: "怪物" | "轉職怪物" | "幻獸";
  name: string;
};

export const officialRosters: OfficialRoster[] = [
  { region: "朝鮮", mercenaries: ["刀手", "醫術師", "儒生", "槍兵", "弓箭手", "破戒僧", "騎馬弓箭手", "朝鮮挑夫"], generals: ["權慄", "許浚", "柳成龍", "金時敏", "李舜臣", "四溟大師", "申砬"] },
  { region: "日本", mercenaries: ["陰陽師", "騎馬武士", "忍者", "退魔師", "騎狼浪人", "鐵砲浪人", "劍術浪人", "日本挑夫"], generals: ["晴明", "小西行長", "朝子", "清祥", "德川家康", "協阪安治", "加藤清正"] },
  { region: "台灣", mercenaries: ["念力師", "野獸戰士", "棒術家", "斧頭巨漢", "西洋槍手", "咒術師", "原住民戰士", "台灣挑夫"], generals: ["張仙花", "孫維昌", "柳永福", "王巨漢", "帕羅爵士", "林平厚", "趙世琳"] },
  { region: "中國", mercenaries: ["道術師", "長槍武士", "大刀武士", "武道家", "冒險家", "修道僧", "火砲手", "中國挑夫"], generals: ["舜飛燕", "郭厚", "祖承訓", "東方不敗", "祝融", "諸葛孔明", "李寧"] },
  { region: "印度", mercenaries: ["踞喀族戰士", "暗殺者", "大刀兵", "治療師", "魔術師", "石弓手", "大砲兵", "蛇術士", "瑜珈僧"], generals: ["坤瓦哩", "拜以拉", "法治羅", "沙維特力", "菲菲莎娜", "金毗羅", "毗羯羅", "帕爾瓦蒂", "羅摩"] },
];

const enemyGroups: Array<[string, EnemyEntry["category"], string[]]> = [
  ["朝鮮", "怪物", ["小山賊", "海龜", "鹿", "四不像", "石爺爺", "九尾狐", "白虎", "弓手山賊", "海馬"]],
  ["朝鮮", "轉職怪物", ["巨山", "鐮刀者", "白龍"]],
  ["朝鮮", "幻獸", ["瘟神"]],
  ["日本", "怪物", ["毒蜈蚣", "鬼貓", "螳螂", "犬魔", "倭寇", "毛假面", "雪女"]],
  ["日本", "轉職怪物", ["毒鳥", "雙刀手", "雪姬"]],
  ["日本", "幻獸", ["虎鶴"]],
  ["台灣", "怪物", ["賊貓", "黃蛇", "狂牛", "食人鱷", "小仙人掌", "原住民巫師", "原住民", "惡商人", "馬面人"]],
  ["台灣", "轉職怪物", ["牛魔王", "原住民長老", "甲馬"]],
  ["台灣", "幻獸", ["雷獸"]],
  ["中國", "怪物", ["槍手馬賊", "雪蜥蜴", "海賊", "冰樹", "藤蔓花柱", "黃鼠狼", "半月熊", "鬼火"]],
  ["中國", "轉職怪物", ["獬豸", "冰魔", "羅漢銅人"]],
  ["中國", "幻獸", ["猿公"]],
  ["印度", "怪物", ["貓鼬", "斑紋狐狸", "雙刀盜賊", "陸龜", "雙頭蛇", "鍬形蟲", "大刀盜賊", "叢林山貓", "黃牛挑夫"]],
  ["印度", "轉職怪物", ["搜查兵", "提亞瑪特", "黃牛怪人"]],
];

export const enemyRoster: EnemyEntry[] = enemyGroups.flatMap(([region, category, names]) =>
  names.map((name) => ({ region, category, name })),
);

export function enemyForStage(stage: number, region?: string) {
  const bosses = enemyRoster.filter((enemy) => enemy.category !== "怪物");
  const regulars = enemyRoster.filter((enemy) => enemy.category === "怪物");
  const selected = stage % 10 === 0 ? bosses : regulars;
  const regional = region ? selected.filter((enemy) => enemy.region === region) : selected;
  const pool = regional.length ? regional : selected;
  return pool[(Math.max(1, stage) - 1) % pool.length];
}
