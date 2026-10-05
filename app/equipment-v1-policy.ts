import {getMercenaryStats} from './mercenary-growth-v1.ts';
import {EARLY_EQUIPMENT_DRAFT,allocateDraftEquipment} from './equipment-budget-policy.ts';
import {EQUIPMENT_TIER_LEVELS} from './equipment-series-levels.ts';
import {legacyOfficialEquipment} from '../data/items/official-equipment-legacy.ts';
import {legacyWearableCatalog} from './wearable-catalog-legacy.ts';
import {MYTHIC_EQUIPMENT_IDENTITIES} from './mythic-equipment-identities.ts';
import {DIVINE_EQUIPMENT_IDENTITIES} from './divine-equipment-identities.ts';
import {v1EquipmentPrice} from './equipment-price-policy.ts';
export const EQUIPMENT_BALANCE_V1='equipment-v1-20261004';
export const V1_QUALITIES=['普通','稀有','史詩','傳說','金色'] as const;
export const V1_QUALITY_MULTIPLIER={普通:1,稀有:1.2,史詩:1.5,傳說:2,金色:2.5} as const;
const slots={weapon:'weapon',helm:'helm',armor:'armor',gloves:'gloves',waist:'amulet',boots:'boots',accessory:'ring'} as const;
export type V1Part=keyof typeof slots;
type V1Source={definitionId?:string;balanceVersion?:string;rarity?:string;enhance?:number};
export function v1WholeSetBudget(level:number){
  if(!Number.isInteger(level)||level<1||level>250)throw new RangeError('Invalid equipment level');
  if(level<=35){
    const upper=EARLY_EQUIPMENT_DRAFT.find(row=>row.level>=level)!;
    const lower=[...EARLY_EQUIPMENT_DRAFT].reverse().find(row=>row.level<=level)!;
    const t=upper.level===lower.level?0:(level-lower.level)/(upper.level-lower.level);
    return {atk:Math.floor(lower.atk+(upper.atk-lower.atk)*t),def:Math.floor(lower.def+(upper.def-lower.def)*t),hp:Math.floor(lower.hp+(upper.hp-lower.hp)*t)};
  }
  const current=getMercenaryStats(level),base=getMercenaryStats(35),anchor=EARLY_EQUIPMENT_DRAFT[3];
  return {atk:Math.floor(anchor.atk+(current.atk-base.atk)*.2),def:Math.floor(anchor.def+(current.def-base.def)*.3),hp:Math.floor(anchor.hp+(current.hp-base.hp)*.25)};
}
export function v1PartCore(level:number,part:V1Part){
  const item=allocateDraftEquipment(level,v1WholeSetBudget(level)).find(row=>row.part===part);
  if(!item)throw new RangeError('Unknown equipment part');
  return {atk:part==='accessory'?Math.floor(item.atk/2):item.atk,def:item.def,hp:part==='accessory'?Math.floor(item.hp/2):item.hp};
}
const seriesDefinitions=EQUIPMENT_TIER_LEVELS.flatMap(level=>(Object.keys(slots) as V1Part[]).map(part=>{
  const id=`series-${level}-${part}`;
  return [id,Object.freeze({id,level,part,slot:slots[part],...v1PartCore(level,part),price:v1EquipmentPrice(level,part)})];
}));
const officialDefinitions=legacyOfficialEquipment.map(record=>{
  const id=`official-${record.id}`,part:V1Part=record.kind;
  return [id,Object.freeze({id,level:record.level,part,slot:record.kind,...v1PartCore(record.level,part),price:record.level<20?v1EquipmentPrice(record.level,part):record.price})];
});
const wearableDefinitions=legacyWearableCatalog.map(record=>{
  const id=`wearable-${record.id}`;
  const part:V1Part=record.slot==='ring'?'accessory':record.slot==='amulet'?'waist':record.slot;
  return [id,Object.freeze({id,level:1,part,slot:record.slot,...v1PartCore(1,part),price:v1EquipmentPrice(1,part)})];
});
const mythicDefinitions=Object.entries(MYTHIC_EQUIPMENT_IDENTITIES).map(([key,{level,part}])=>{
  const id=`mythic-${key}`;
  return [id,Object.freeze({id,level,part,slot:slots[part],...v1PartCore(level,part),price:Math.round((1000+level**2*2)*(part==='weapon'?1.3:part==='armor'?1.15:1))})];
});
const divineDefinitions=Object.entries(DIVINE_EQUIPMENT_IDENTITIES).map(([key,part])=>{
  const id=`divine-${key}`,level=1;
  return [id,Object.freeze({id,level,part,slot:slots[part],...v1PartCore(level,part),price:Math.round((1000+level**2*2)*(part==='weapon'?1.3:part==='armor'?1.15:1))})];
});
const questDefinitions=[['quest-first-caravan-sword',Object.freeze({id:'quest-first-caravan-sword',level:1,part:'weapon',slot:'weapon',...v1PartCore(1,'weapon'),price:v1EquipmentPrice(1,'weapon')})]];
export const V1_EQUIPMENT_DEFINITIONS=Object.freeze(Object.fromEntries([...seriesDefinitions,...officialDefinitions,...wearableDefinitions,...mythicDefinitions,...divineDefinitions,...questDefinitions]) as Record<string,Readonly<{id:string;level:number;part:V1Part;slot:typeof slots[V1Part];atk:number;def:number;hp:number;price:number}>>);
export function v1Definition(item:V1Source){
  return item.balanceVersion===EQUIPMENT_BALANCE_V1 && item.definitionId && Object.hasOwn(V1_EQUIPMENT_DEFINITIONS,item.definitionId)?V1_EQUIPMENT_DEFINITIONS[item.definitionId]:null;
}
export function v1EnhancementMultiplier(level:number){return 1+.04*Math.min(15,Math.max(0,Math.floor(Number(level)||0)));}
export function v1QualityMultiplier(quality:string|undefined){return V1_QUALITY_MULTIPLIER[V1_QUALITIES.find(value=>value===quality)||'普通'];}
export function v1SellPrice(item:V1Source){const definition=v1Definition(item);return definition?Math.floor(definition.price*.2*v1QualityMultiplier(item.rarity)):null;}
export function v1EnhancementCost(item:V1Source){const definition=v1Definition(item);return definition?Math.ceil(definition.price*.1*(Math.max(0,Math.floor(item.enhance||0))+1)):null;}
export function v1EffectiveCore(item:V1Source){
  const definition=v1Definition(item);
  if(!definition)return null;
  const multiplier=v1QualityMultiplier(item.rarity)*v1EnhancementMultiplier(item.enhance||0);
  return {atk:Math.floor(definition.atk*multiplier),def:Math.floor(definition.def*multiplier),hp:Math.floor(definition.hp*multiplier)};
}

/** Random offers use actual existing series tiers, never invent a tier from map progress. */
export function v1RandomEquipmentTier(level:number) {
  const safe=Math.min(250,Math.max(1,Math.floor(Number(level)||1)));
  return [...EQUIPMENT_TIER_LEVELS].reverse().find(tier=>tier<=safe)!;
}
/** One advertised offer price covers every possible slot and quality without resale arbitrage. */
export function v1MagicEquipmentPrice(level:number) {
  const tier=v1RandomEquipmentTier(level);
  const prices=(Object.keys(slots) as V1Part[]).map(part=>V1_EQUIPMENT_DEFINITIONS[`series-${tier}-${part}`].price);
  return Math.ceil(Math.max(...prices)*1.2);
}
