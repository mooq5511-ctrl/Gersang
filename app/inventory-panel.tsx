import {inventoryGrid} from './inventory-layout';
import {equipmentDetailLines,equipmentDescription,type TooltipGear} from './divine-equipment';
import {Tooltip,TooltipProvider,TooltipTrigger,TooltipContent} from '@/components/ui/tooltip';
import {EQUIPMENT_LABELS,type EquipmentKind} from './equipment-slots';
export type BagItem=TooltipGear & {uid:string;name:string;slot:EquipmentKind;image:string;bagSlot?:number};
export function InventoryPanel({inventory,equip,message}:{inventory:BagItem[];equip:(uid:string)=>void;message:string}){
  const {slots,overflow}=inventoryGrid(inventory);
  return <section className="merchant-bag" aria-label="商隊背包"><h2>商隊背包 <small>{slots.filter(Boolean).length} / 20 格</small></h2>
    <TooltipProvider><div className="merchant-bag-grid">{slots.map((item,index)=><Tooltip key={index}><TooltipTrigger className={'merchant-bag-slot'+(item?' occupied':'')} onClick={()=>{if(item)equip(item.uid)}} aria-label={'背包第 '+(index+1)+' 格：'+(item?.name||'空')}>
      {item?(item.image?<img src={item.image} alt=""/>:<strong>{({weapon:'杖',armor:'甲',helm:'兜',boots:'靴',ring:'戒',amulet:'符',gloves:'套',accessory:'符'} as const)[item.slot]}</strong>):null}<small>{item?EQUIPMENT_LABELS[item.slot]:''}</small>
    </TooltipTrigger>{item&&<TooltipContent className="hp-gear-tooltip"><strong>{item.name}</strong>{equipmentDetailLines(item).map((line,i)=><span key={i}>{line}</span>)}<em>{equipmentDescription(item)}</em></TooltipContent>}</Tooltip>)}</div></TooltipProvider>
    <p>左鍵點擊穿戴給主角；已有裝備時交換回原格。點擊主角裝備格可卸下。</p><p>模擬打怪：+100 經驗，50% 機率掉落四種神裝之一。滿格可交換，但不能卸裝或拾取。</p>
    <div className="merchant-bag-message" role="status">{message||'行囊尚空，出發尋覓神裝。'}</div>
    {overflow.length>0&&<details open><summary>舊物保留區・{overflow.length} 件</summary><p>舊存檔物品完整保留。整理至 20 件以下後才能再拾取。</p>{overflow.map(item=><button key={item.uid} onClick={()=>equip(item.uid)}>{item.name}・穿戴</button>)}</details>}
  </section>;
}
