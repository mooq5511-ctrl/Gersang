import {equipFromInventory,unequipToInventory,type EquipmentSlot,type EquipmentKind} from './equipment-slots.ts';
export const HERO_DISPLAY_SLOTS=['weapon','helm','armor','ring1','ring2','boots'] as const;
export const DIVINE_EQUIPMENT={
  staff:{name:'高級神仙棒',slot:'weapon' as const,description:'仙人遺世之杖，凝聚天地靈氣。',bonus:{str:10,agi:0,vit:0,intel:50},def:0},
  armor:{name:'海王戰甲',slot:'armor' as const,description:'蘊含深海龍王神力的傳奇戰甲',bonus:{str:0,agi:0,vit:80,intel:0},def:100},
};
export type DivineKey=keyof typeof DIVINE_EQUIPMENT;
type Gear={uid:string;slot:EquipmentKind;requiredLevel?:number};
/** 有穿則卸下；沒有穿則從背包取用。替換原裝備時退回背包，不會銷毀。 */
export function toggleDivineEquipment<E extends Gear,U extends {level:number;equip:Record<EquipmentSlot,E|null>}>(hero:U,inventory:E[],item:E){
  const slot=item.slot as EquipmentSlot;
  if(hero.equip[slot]?.uid===item.uid)return {...unequipToInventory(hero,inventory,slot),error:undefined};
  const available=inventory.some(entry=>entry.uid===item.uid)?inventory:[...inventory,item];
  return equipFromInventory(hero,available,item.uid,slot);
}
export type TooltipGear={name?:string;source?:string;atk?:number;def?:number;hp?:number;enhance?:number;requiredLevel?:number;skill?:string;bonus?:{str?:number;agi?:number;vit?:number;intel?:number};resist?:{physical:number;magic:number};magic?:{name?:string;text?:string;stat:string;value:number}[]};
/** 所有欄位皆列出，包含非神裝的既有裝備加成與附魔。 */
export function equipmentDetailLines(item:TooltipGear){
  const lines:string[]=[];
  for(const [key,label] of [['str','力量'],['agi','敏捷'],['vit','體質'],['intel','智力']] as const) if(item.bonus?.[key])lines.push(label+' +'+item.bonus[key]);
  for(const [key,label] of [['atk','攻擊力'],['def','防禦力'],['hp','生命值']] as const)if(item[key])lines.push(label+' +'+item[key]);
  if(item.enhance)lines.push('強化 +'+item.enhance);
  if(item.requiredLevel)lines.push('需求等級 '+item.requiredLevel);
  if(item.resist?.physical)lines.push('物理抗性 +'+item.resist.physical);
  if(item.resist?.magic)lines.push('魔法抗性 +'+item.resist.magic);
  if(item.skill)lines.push('裝備技能：'+item.skill);
  for(const affix of item.magic||[])lines.push((affix.name||affix.stat)+'：'+(affix.text||'+'+affix.value));
  return lines.length?lines:['無額外屬性'];
}
export const equipmentDescription=(item:TooltipGear)=>Object.values(DIVINE_EQUIPMENT).find(spec=>spec.name===item.name)?.description||'匠心淬鍊，伴行商踏遍山河。';
