import {rarityPresentation} from './classic-presentation';
import {positionInventory} from './inventory-layout';
import {equipmentDetailLines,equipmentDescription,type TooltipGear} from './divine-equipment';
import {Tooltip,TooltipProvider,TooltipTrigger,TooltipContent} from '@/components/ui/tooltip';
import {EQUIPMENT_LABELS,type EquipmentKind} from './equipment-slots';
export type BagItem=TooltipGear & {uid:string;name:string;slot:EquipmentKind;image:string;bagSlot?:number};
export function InventoryPanel({inventory,equip,message}:{inventory:BagItem[];equip:(uid:string)=>void;message:string}){
  const items=positionInventory(inventory);
  return <section className="merchant-bag" aria-label="商隊背包"><h2>商隊背包 <small>{items.length} 件・無上限</small></h2>
    <TooltipProvider><div className="merchant-bag-list" role="list">{items.length?items.map((item,index)=><Tooltip key={item.uid}><TooltipTrigger className={'merchant-bag-row '+rarityPresentation(item.rarity).className} onClick={()=>equip(item.uid)} aria-label={'背包第 '+(index+1)+' 件：'+item.name}>
      <span className="merchant-bag-icon">{item.image?<img src={item.image} alt=""/>:<strong>{({weapon:'杖',armor:'甲',helm:'兜',boots:'靴',ring:'戒',amulet:'符',gloves:'套',accessory:'符'} as const)[item.slot]}</strong>}</span><span className="merchant-bag-copy"><strong>{item.name}</strong><small>{rarityPresentation(item.rarity).label}・{EQUIPMENT_LABELS[item.slot]}</small></span><em>點擊穿戴</em>
    </TooltipTrigger><TooltipContent className={"hp-gear-tooltip "+rarityPresentation(item.rarity).className}><strong>{item.name}</strong><span className="rarity-caption">{rarityPresentation(item.rarity).label}</span>{equipmentDetailLines(item).map((line,i)=><span key={i}>{line}</span>)}<em>{equipmentDescription(item)}</em></TooltipContent></Tooltip>):<p className="merchant-bag-empty">行囊尚空，出發尋覓神裝。</p>}</div></TooltipProvider>
    <div className="rarity-legend" aria-label="裝備品階">{["普通","稀有","史詩","傳說"].map(rarity=><span key={rarity} className={rarityPresentation(rarity).className}>{rarity}</span>)}</div>
    <p>左鍵點擊清單裝備即可穿戴給主角；已有裝備會自動退回清單。背包容量無上限，掉落、購買與卸裝都不會因空間不足失敗。</p>
    <div className="merchant-bag-message" role="status">{message||'行囊尚空，出發尋覓神裝。'}</div>
  </section>;
}
