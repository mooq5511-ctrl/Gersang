import {v1Definition} from './equipment-v1-policy.ts';
export const EQUIPMENT_SPECIAL_LIMITS={attack:.35,defense:.35,maxHp:.3,maxMp:.25} as const;
export const EQUIPMENT_SHARED_SPECIAL_POOL=.8;
export const EQUIPMENT_RESIST_LIMIT=25;
export const EQUIPMENT_SHARED_RESIST_POOL=40;
type Stats={attack:number;defense:number;maxHp:number;maxMp:number};
const keys=['attack','defense','maxHp','maxMp'] as const;
export function resolveSpecialStatBudget(core:Stats,requested:Stats) {
  for(const stats of [core,requested])for(const key of keys)if(!Number.isSafeInteger(stats[key])||stats[key]<0)throw new RangeError('Invalid resolved equipment stats');
  const fractions=Object.fromEntries(keys.map(key=>[key,Math.min(EQUIPMENT_SPECIAL_LIMITS[key],Math.max(0,requested[key]-core[key])/Math.max(1,core[key]))])) as Stats;
  const used=keys.reduce((sum,key)=>sum+fractions[key],0),scale=used>EQUIPMENT_SHARED_SPECIAL_POOL?EQUIPMENT_SHARED_SPECIAL_POOL/used:1;
  const effective=Object.fromEntries(keys.map(key=>[key,requested[key]<=core[key]?requested[key]:core[key]+Math.floor(Math.max(1,core[key])*fractions[key]*scale)])) as Stats;
  return {effective,core:{...core},requested:{...requested},scale,clipped:keys.filter(key=>effective[key]!==requested[key])};
}
type Gear={definitionId?:string;balanceVersion?:string;bonus?:{str?:number;agi?:number;vit?:number;intel?:number};magic?:{value?:number}[];enhanceBonuses?:{value?:number}[];resist?:{physical?:number;magic?:number}};
export function hasV1Equipment(unit:{equip?:Record<string,Gear|null>}) {return Object.values(unit.equip||{}).some(item=>item&&v1Definition(item));}
/** Preserve character investment and quality/enhanced core. Only V1 extra effects are removed. */
export function coreEquipmentUnit<T extends {equip:Record<string,Gear|null>}>(unit:T):T {
  return {...unit,equip:Object.fromEntries(Object.entries(unit.equip).map(([slot,item])=>[slot,item&&v1Definition(item)?{...item,bonus:{str:0,agi:0,vit:0,intel:0},magic:[],enhanceBonuses:[],resist:{physical:0,magic:0}}:item]))} as T;
}
/** Equipment resistance is additive points, not a multiplier of innate resistance. */
export function resolveEquipmentResistance(core:{physicalResist:number;magicResist:number},requested:{physicalResist:number;magicResist:number}) {
  const physical=Math.min(EQUIPMENT_RESIST_LIMIT,Math.max(0,requested.physicalResist-core.physicalResist));
  const magic=Math.min(EQUIPMENT_RESIST_LIMIT,Math.max(0,requested.magicResist-core.magicResist));
  const scale=physical+magic>EQUIPMENT_SHARED_RESIST_POOL?EQUIPMENT_SHARED_RESIST_POOL/(physical+magic):1;
  return {physicalResist:requested.physicalResist<=core.physicalResist?requested.physicalResist:core.physicalResist+Math.floor(physical*scale),magicResist:requested.magicResist<=core.magicResist?requested.magicResist:core.magicResist+Math.floor(magic*scale)};
}
