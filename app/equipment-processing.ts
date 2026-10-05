/** Bulk processing must not silently destroy an item's paid upgrade investment. */
export function hasEquipmentInvestment(item:{enhance?:number;luckyValue?:number;socketGem?:unknown;enhanceBonuses?:unknown[]}) {
  return Number(item.enhance)>0 || Number(item.luckyValue)>0 || !!item.socketGem || !!item.enhanceBonuses?.length;
}
