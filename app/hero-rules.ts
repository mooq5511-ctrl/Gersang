/** 主角個人面板專用公式；敏捷在遊戲資料中稱為 agi，智力稱為 intel。 */
import {combatStats,vitalStats,type VitalUnit} from './vitals-engine.ts';
type AttributeGear={
  definitionId?:string;
  balanceVersion?:string;
  atk?:number;
  def?:number;
  hp?:number;
  enhance?:number;
  magic?:{id?:string;value?:number}[];
  socketGem?:{id:string};
  resist?:{physical?:number;magic?:number};
  bonus?:{str?:number;agi?:number;vit?:number;intel?:number}
};
export type HeroAttributes = {str:number;agi:number;vit:number;intel:number;level:number;templateId?:string;equip?:Record<string,AttributeGear|null>};
/** 從基礎值與目前穿戴重算，不直接修改基礎值，避免反覆穿脫造成永久疊加。 */
export function heroTotalAttributes(hero:HeroAttributes){
  const total={str:hero.str,agi:hero.agi,vit:hero.vit,intel:hero.intel};
  for(const item of Object.values(hero.equip||{})) for(const key of ['str','agi','vit','intel'] as const) total[key]+=item?.bonus?.[key]||0;
  return total;
}
/** One resolved combat scale before and after equipping, including empty and legacy loadouts. */
export const heroPersonalPower=(hero:HeroAttributes)=>{
  const unit={...hero,templateId:hero.templateId||'hero',equip:(hero.equip||{}) as VitalUnit['equip']};
  const combat=combatStats(unit),vital=vitalStats(unit);
  return Math.floor(combat.attack*2.2+combat.defense*1.6+vital.maxHp*.22);
};
export const heroWeightLimit=(hero:Pick<HeroAttributes,'str'|'equip'>)=>200+(hero.str+Object.values(hero.equip||{}).reduce((sum,item)=>sum+(item?.bonus?.str||0),0))*5;
export const HERO_INITIAL_ATTRIBUTES={str:20,agi:15,vit:20,intel:10};
