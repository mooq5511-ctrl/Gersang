import type { Equipment } from "./game-state";

export const formatGameNumber = (value: number) => Math.floor(value).toLocaleString("zh-TW");

export function equipmentBonusText(item: Equipment) {
  const bonus = item.bonus || { str: 0, agi: 0, intel: 0, vit: 0 };
  return [["力", bonus.str], ["敏", bonus.agi], ["智", bonus.intel], ["體", bonus.vit]].filter((entry) => Number(entry[1]) > 0).map(([label, value]) => `${label}+${value}`).join("・");
}
