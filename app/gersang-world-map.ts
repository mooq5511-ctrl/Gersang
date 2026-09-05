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
          name: "小狸貓",
          hp: 60,
          drops: [{ item: "舊斧頭", rate: 15 }, { item: "銅錢", rate: 80 }],
          balanceSource: "附件設定",
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
          hp: 300,
          drops: [{ item: "黑珍珠", rate: 3 }, { item: "古代鑰匙", rate: 10 }],
          balanceSource: "附件設定",
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
          hp: 120,
          drops: [{ item: "藍鐵頭盔", rate: 8 }, { item: "舊月牙槍", rate: 12 }],
          balanceSource: "附件設定",
        },
      },
      {
        id: "fuji-foothills",
        name: "富士山腳",
        type: "idle",
        nearCity: "edo",
        recommendedLevel: 25,
        monster: {
          id: "ghost-miko",
          name: "幽靈巫女",
          hp: 250,
          drops: [{ item: "舊梧葉扇", rate: 7 }, { item: "巫女和服", rate: 2 }],
          balanceSource: "附件設定",
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
          hp: 80,
          drops: [{ item: "彩色寶珠", rate: 20 }, { item: "銅錢", rate: 75 }],
          balanceSource: "附件設定",
        },
      },
      {
        id: "alishan",
        name: "阿里山",
        type: "idle",
        nearCity: "tainan",
        recommendedLevel: 20,
        monster: {
          id: "frenzied-boar",
          name: "狂暴山豬",
          hp: 200,
          drops: [{ item: "高級大刀", rate: 5 }, { item: "山豬牙", rate: 30 }],
          balanceSource: "附件設定",
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
          drops: [{ item: "百色寶珠", rate: 15 }, { item: "證明霸王的咒術秘訣", rate: 4 }, { item: "高級月牙槍", rate: 8 }, { item: "中級精髓", rate: 20 }],
          balanceSource: "經典品項／致敬版掉落率",
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
