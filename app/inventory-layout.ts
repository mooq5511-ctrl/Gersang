export const INVENTORY_CAPACITY=20;
export type PositionedItem={uid:string;bagSlot?:number};
/** 固定格號存於物品，陣列仍相容舊版背包；移走物品後不讓其餘圖示整排位移。 */
export function positionInventory<E extends PositionedItem>(inventory:E[]):E[]{
  const used=new Set<number>();
  const result=inventory.map(item=>{
    const slot=item.bagSlot;
    if(Number.isInteger(slot)&&slot!>=0&&slot!<20&&!used.has(slot!)){used.add(slot!);return item;}
    return {...item,bagSlot:undefined};
  });
  return result.map(item=>{
    if(item.bagSlot!==undefined)return item;
    const slot=Array.from({length:20},(_,i)=>i).find(i=>!used.has(i));
    if(slot===undefined)return item; // 舊版超額物品保留，絕不截斷或刪除。
    used.add(slot);return {...item,bagSlot:slot};
  });
}
export function inventoryGrid<E extends PositionedItem>(inventory:E[]){
  const positioned=positionInventory(inventory),slots:Array<E|null>=Array(20).fill(null);
  const overflow:E[]=[];
  for(const item of positioned){if(item.bagSlot===undefined)overflow.push(item);else slots[item.bagSlot]=item;}
  return {slots,overflow};
}
/** 新掉落與購買只能進入空位；滿格時不扣款、不覆蓋物品。 */
export function addInventoryItem<E extends PositionedItem>(inventory:E[],item:E){
  if(inventory.length>=INVENTORY_CAPACITY)return {inventory,error:'背包已滿'};
  return {inventory:positionInventory([...positionInventory(inventory),{...item,bagSlot:undefined}]),error:undefined};
}
