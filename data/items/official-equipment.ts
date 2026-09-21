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
