/** 清單背包沒有容量上限；保留常數供舊模組相容。 */
export const INVENTORY_CAPACITY=Number.POSITIVE_INFINITY;
export type PositionedItem={uid:string;bagSlot?:number};
/** 舊格位資料轉為清單順序；不截斷任何舊存檔物品。 */
export function positionInventory<E extends PositionedItem>(inventory:E[]):E[]{
  return inventory.map((item,index)=>item.bagSlot===index?item:{...item,bagSlot:index});
}
export function inventoryGrid<E extends PositionedItem>(inventory:E[]){
  return {slots:positionInventory(inventory),overflow:[] as E[]};
}
/** 新掉落與購買永遠附加到清單，不再有滿格失敗。 */
export function addInventoryItem<E extends PositionedItem>(inventory:E[],item:E){
  return {inventory:positionInventory([...positionInventory(inventory),{...item,bagSlot:undefined}]),error:undefined};
}
