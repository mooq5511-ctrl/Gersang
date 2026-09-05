/**
 * 《巨商》致敬版四國世界地圖資料。
 *
 * 注意：不同營運地區與版本的怪物數值／掉落表並不一致；`balanceSource`
 * 用來區分已能交叉核對的經典資料與本作採用的放置遊戲平衡值。
 */
export const gersangWorldMap = {
  korea: {
    id: "korea",
    name: "朝鮮",
    cities: [
      { id: "hanyang", name: "漢陽", type: "city" },
      { id: "pyongyang", name: "平壤", type: "city" },
    ],
    stages: [
      {
        id: "hanyang-outskirts",
        name: "漢陽近郊",
        type: "idle",
        nearCity: "hanyang",
        recommendedLevel: 1,
        monster: {
          id: "raccoon",
          name: "狸",
          hp: 100,
          drops: ["狸毛皮", "乾魚", "初級精髓"],
          balanceSource: "致敬版平衡值",
        },
      },
      {
        id: "qin-shi-huang-mausoleum",
        name: "秦始皇陵",
        type: "dungeon",
        nearCity: "hanyang",
        recommendedLevel: 35,
        monster: {
          id: "terracotta-warrior",
          name: "兵馬俑",
          hp: 2200,
          drops: ["石甲", "龍紋鐘", "直星義鳳圖", "厚重的咒術秘訣"],
          balanceSource: "經典掉落／致敬版 HP",
        },
      },
    ],
  },
  japan: {
    id: "japan",
    name: "日本",
    cities: [
      { id: "edo", name: "江戶", type: "city" },
      { id: "kyoto", name: "京都", type: "city" },
    ],
    stages: [
      {
        id: "iwami-silver-mine",
        name: "石見銀山",
        type: "idle",
        nearCity: "edo",
        recommendedLevel: 15,
        monster: {
          id: "mad-cow",
          name: "狂牛",
          hp: 520,
          drops: ["牛肉", "饅頭", "牛角護符"],
          balanceSource: "經典素材／致敬版 HP 與稀有掉落",
        },
      },
    ],
  },
  taiwan: {
    id: "taiwan",
    name: "台灣",
    cities: [
      { id: "taipei", name: "台北", type: "city" },
      { id: "tainan", name: "台南", type: "city" },
    ],
    stages: [
      {
        id: "datun-mountain",
        name: "大屯山",
        type: "idle",
        nearCity: "taipei",
        recommendedLevel: 25,
        monster: {
          id: "big-eye-monster",
          name: "大眼怪",
          hp: 1200,
          drops: ["大眼怪眼珠", "燃燒眼球", "中級精髓"],
          balanceSource: "致敬版平衡值",
        },
      },
    ],
  },
  china: {
    id: "china",
    name: "中國",
    cities: [
      { id: "nanjing", name: "南京", type: "city" },
      { id: "beijing", name: "北京", type: "city" },
    ],
    stages: [
      {
        id: "undersea-king-cave",
        name: "海底王窟",
        type: "dungeon",
        nearCity: "nanjing",
        recommendedLevel: 45,
        monster: {
          id: "sea-god",
          name: "海神",
          hp: 4400,
          drops: ["百色寶珠", "證明霸王的咒術秘訣", "高級月牙槍", "中級精髓"],
          balanceSource: "經典資料",
        },
      },
    ],
  },
} as const;

export type GersangNationId = keyof typeof gersangWorldMap;
export type GersangRegion = (typeof gersangWorldMap)[GersangNationId];

export const gersangStages = Object.values(gersangWorldMap).flatMap(
  (region) => region.stages.map((stage) => ({ ...stage, nationId: region.id, nationName: region.name })),
);

