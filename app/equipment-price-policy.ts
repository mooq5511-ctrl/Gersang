export type PricedEquipmentPart = 'weapon'|'helm'|'armor'|'gloves'|'waist'|'boots'|'accessory';
const partMultipliers:Record<PricedEquipmentPart,number>={weapon:1.3,helm:1,armor:1.15,gloves:1,waist:1,boots:1,accessory:1};

/** Starter gear should be an affordable first investment, not a near-Lv.20 expense. */
export function v1EquipmentPrice(level:number,part:PricedEquipmentPart):number {
  if(!Number.isInteger(level)||level<1||level>250||!Object.hasOwn(partMultipliers,part))throw new RangeError('Invalid equipment price input');
  // Connect the 200 starter anchor to the existing 1,800 Lv.20 anchor.
  // All existing level-20-and-up prices remain exactly unchanged.
  const base=level<20?200+(level-1)*1600/19:1000+level**2*2;
  return Math.round(base*partMultipliers[part]);
}
