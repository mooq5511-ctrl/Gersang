/**
 * 四國掛機地圖資料。
 *
 * 數值與掉落率依使用者提供的「元老級地圖復刻」表實裝；這些資料可能與
 * 不同營運地區、年代的官方版本有差異，因此以 source 明確標示來源。
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
        id: "hanyang-outskirts", name: "漢陽近郊", type: "idle", nearCity: "hanyang", recommendedLevel: 1,
        monster: { id: "raccoon", name: "狸貓", hp: 60, drops: [{ item: "舊斧頭", rate: 12, price: 150 }, { item: "肉類", rate: 45, price: 25 }], source: "使用者提供資料" },
      },
      {
        id: "daegwallyeong", name: "大關嶺", type: "idle", nearCity: "hanyang", recommendedLevel: 12,
        monster: { id: "mad-cow", name: "狂牛", hp: 160, drops: [{ item: "老舊的月牙槍", rate: 5, price: 1200 }, { item: "藍鐵頭盔", rate: 10, price: 400 }, { item: "牛肉", rate: 35, price: 60 }], source: "使用者提供資料" },
      },
      {
        id: "hallasan", name: "漢拏山", type: "dungeon", nearCity: "pyongyang", recommendedLevel: 32,
        monster: { id: "yellow-dragon", name: "黃龍", hp: 1200, drops: [{ item: "高級環弓", rate: .5, price: 2500 }, { item: "黃龍鱗", rate: 8, price: 900 }], source: "使用者提供資料" },
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
        id: "datun-mountain", name: "大屯山", type: "idle", nearCity: "taipei", recommendedLevel: 8,
        monster: { id: "big-eye-monster", name: "大眼怪", hp: 70, drops: [{ item: "彩色寶珠", rate: 10, price: 800 }, { item: "大眼怪眼球", rate: 40, price: 45 }], source: "使用者提供資料" },
      },
      {
        id: "alishan", name: "阿里山", type: "idle", nearCity: "tainan", recommendedLevel: 15,
        monster: { id: "boar", name: "山豬", hp: 150, drops: [{ item: "老舊的子母槍", rate: 6, price: 1500 }, { item: "山豬牙", rate: 30, price: 100 }], source: "使用者提供資料" },
      },
      {
        id: "qin-taiwan", name: "秦始皇陵(台)", type: "dungeon", nearCity: "tainan", recommendedLevel: 24,
        monster: { id: "tomb-raider", name: "盜墓者", hp: 450, drops: [{ item: "老舊的銀火繩槍", rate: 1.2, price: 2000 }, { item: "老舊的狐狸娃娃", rate: 2, price: 1600 }], source: "使用者提供資料" },
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
        id: "japan-netherworld", name: "冥界", type: "idle", nearCity: "edo", recommendedLevel: 10,
        monster: { id: "ghost-cat", name: "鬼貓", hp: 110, drops: [{ item: "老舊的梧葉扇", rate: 8, price: 2000 }, { item: "貓眼石", rate: 25, price: 150 }], source: "使用者提供資料" },
      },
      {
        id: "iwami-silver-mine", name: "石見銀山", type: "idle", nearCity: "edo", recommendedLevel: 8,
        monster: { id: "kappa", name: "河童", hp: 90, drops: [{ item: "老舊的短劍", rate: 5, price: 700 }, { item: "黃瓜", rate: 40, price: 10 }], source: "使用者提供資料" },
      },
      {
        id: "black-forest", name: "黑森林", type: "dungeon", nearCity: "kyoto", recommendedLevel: 40,
        monster: { id: "amakusa-shiro", name: "天草時貞", hp: 2000, drops: [{ item: "老舊的蛇矛", rate: .8, price: 3000 }, { item: "黃金碎片", rate: 5, price: 500 }], source: "使用者提供資料" },
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
        id: "nanjing-outskirts", name: "南京近郊", type: "idle", nearCity: "nanjing", recommendedLevel: 5,
        monster: { id: "poison-moth", name: "毒蛾", hp: 65, drops: [{ item: "老舊的投石索", rate: 5.5, price: 600 }, { item: "毒液結晶", rate: 22, price: 100 }], source: "使用者提供資料" },
      },
      {
        id: "great-wall", name: "萬里長城", type: "idle", nearCity: "beijing", recommendedLevel: 22,
        monster: { id: "xiongnu-cavalry", name: "匈奴騎兵", hp: 350, drops: [{ item: "老舊的双月斧", rate: 5, price: 2500 }, { item: "馬肉", rate: 35, price: 50 }], source: "使用者提供資料" },
      },
      {
        id: "yellow-emperor-mausoleum", name: "黃帝陵", type: "dungeon", nearCity: "beijing", recommendedLevel: 36,
        monster: { id: "undersea-king", name: "海底王", hp: 1200, drops: [{ item: "高級旗槍", rate: 2, price: 8000 }, { item: "深海珍珠", rate: 10, price: 500 }], source: "使用者提供資料" },
      },
    ],
  },
} as const;

export type GersangNationId = keyof typeof gersangWorldMap;
export type GersangRegion = (typeof gersangWorldMap)[GersangNationId];
export const gersangStages = Object.values(gersangWorldMap).flatMap(
  region => region.stages.map(stage => ({ ...stage, nationId: region.id, nationName: region.name })),
);
