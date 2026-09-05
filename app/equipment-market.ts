export type SellableEquipment = {
  uid:string; name:string; atk?:number; def?:number; hp?:number; enhance?:number; requiredLevel?:number; rarity?:string;
  magic?:Array<{value?:number}>;
  bonus?:{str?:number;agi?:number;intel?:number;vit?:number};
  resist?:{physical?:number;magic?:number};
};

const RARITY_MULTIPLIER:Record<string,number>={普通:1,稀有:1.35,史詩:1.8,傳說:2.6};

/** 裝備回收價只取決於裝備本身，確保所有背包入口顯示與實際入帳完全一致。 */
export function equipmentSellPrice(item:SellableEquipment){
  const magic=(item.magic||[]).reduce((sum,affix)=>sum+Math.max(0,Number(affix.value)||0),0);
  const bonus=Object.values(item.bonus||{}).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
  const resist=Object.values(item.resist||{}).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
  const base=40+Math.max(0,item.atk||0)*18+Math.max(0,item.def||0)*14+Math.max(0,item.hp||0)*1.5+
    magic*22+bonus*30+resist*18+Math.max(1,item.requiredLevel||1)*12;
  const enhanced=base*(1+Math.max(0,item.enhance||0)*.18);
  return Math.max(10,Math.floor(enhanced*(RARITY_MULTIPLIER[item.rarity||'普通']||1)));
}

/** 僅能出售仍在背包中的物品；穿戴中裝備不在此陣列，因此不可能被誤賣。 */
export function sellEquipmentFromInventory<T extends SellableEquipment>(inventory:T[],gold:number,uid:string){
  const item=inventory.find(entry=>entry.uid===uid);
  if(!item)return {inventory,gold,earned:0,item:null,error:'此裝備不在背包中，可能已經穿戴。'};
  const earned=equipmentSellPrice(item);
  return {inventory:inventory.filter(entry=>entry.uid!==uid),gold:gold+earned,earned,item,error:null};
}
