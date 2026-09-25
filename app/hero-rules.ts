/** 主角個人面板專用公式；敏捷在遊戲資料中稱為 agi，智力稱為 intel。 */
type AttributeGear={
  atk?:number;
  def?:number;
  hp?:number;
  enhance?:number;
  magic?:{value?:number}[];
  resist?:{physical?:number;magic?:number};
  bonus?:{str?:number;agi?:number;vit?:number;intel?:number}
};
export type HeroAttributes = {str:number;agi:number;vit:number;intel:number;level:number;equip?:Record<string,AttributeGear|null>};
/** 從基礎值與目前穿戴重算，不直接修改基礎值，避免反覆穿脫造成永久疊加。 */
export function heroTotalAttributes(hero:HeroAttributes){
  const total={str:hero.str,agi:hero.agi,vit:hero.vit,intel:hero.intel};
  for(const item of Object.values(hero.equip||{})) for(const key of ['str','agi','vit','intel'] as const) total[key]+=item?.bonus?.[key]||0;
  return total;
}
/**
 * Equipment contribution shared by the hero power display and the travel/combat power inputs.
 * Attribute bonuses are already included by heroTotalAttributes, so this helper only handles
 * the item's direct combat values and avoids counting those bonuses twice.
 */
function heroEquipmentPower(item:AttributeGear|null|undefined){
  if(!item)return 0;
  const magic=(item.magic||[]).reduce((sum,affix)=>sum+(affix.value||0)*3.2,0);
  const resist=((item.resist?.physical||0)+(item.resist?.magic||0))*2.4;
  return ((item.atk||0)*2.2+(item.def||0)*1.6+(item.hp||0)*.22+magic+resist)*(1+(item.enhance||0)*.12);
}
export const heroPersonalPower=(hero:HeroAttributes)=>{
  const t=heroTotalAttributes(hero);
  const equipment=Object.values(hero.equip||{}).reduce((sum,item)=>sum+heroEquipmentPower(item),0);
  return t.str*2+t.agi*3+t.vit*1.5+t.intel*2+hero.level*10+equipment;
};
export const heroWeightLimit=(hero:Pick<HeroAttributes,'str'|'equip'>)=>200+(hero.str+Object.values(hero.equip||{}).reduce((sum,item)=>sum+(item?.bonus?.str||0),0))*5;
export const HERO_INITIAL_ATTRIBUTES={str:20,agi:15,vit:20,intel:10};
