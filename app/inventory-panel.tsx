import {rarityPresentation} from './classic-presentation';
import {positionInventory} from './inventory-layout';
import {equipmentDetailLines,equipmentDescription,type TooltipGear} from './divine-equipment';
import {Tooltip,TooltipProvider,TooltipTrigger,TooltipContent} from '@/components/ui/tooltip';
import {EQUIPMENT_LABELS,type EquipmentKind} from './equipment-slots';
import {equipmentSellPrice} from './equipment-market';
export type BagItem=TooltipGear & {uid:string;name:string;slot:EquipmentKind;image:string;bagSlot?:number};
type InventoryPanelProps={
  inventory:BagItem[];
  materials:Record<string,number>;
  materialPrices:Record<string,number>;
  equip:(uid:string)=>void;
  sell:(uid:string)=>void;
  sellMaterial:(name:string)=>void;
  sellAllMaterials:()=>void;
  message:string;
};
export function InventoryPanel({inventory,materials,materialPrices,equip,sell,sellMaterial,sellAllMaterials,message}:InventoryPanelProps){
  const items=positionInventory(inventory);
  const materialEntries=Object.entries(materials).filter(([,count])=>count>0).sort(([a],[b])=>a.localeCompare(b,'zh-Hant'));
  const materialCount=materialEntries.reduce((sum,[,count])=>sum+count,0);
  return <section className="merchant-bag" aria-label="商隊背包"><h2>商隊背包 <small>裝備 {items.length}・材料 {materialCount}・無上限</small></h2>
    <section className="merchant-material-section" aria-label="戰利品材料">
      <div className="merchant-bag-subhead"><div><strong>戰利品材料</strong><small>怪物掉落會自動收入背包</small></div><button type="button" onClick={sellAllMaterials} disabled={!materialCount}>全部出售</button></div>
      <div className="merchant-material-list" role="list">{materialEntries.length?materialEntries.map(([name,count])=>{
        const price=materialPrices[name]||0;
        return <article className="merchant-material-row" role="listitem" key={name}><span className="merchant-material-icon" aria-hidden="true">材</span><div><strong>{name}</strong><small>持有 ×{count}・單價 {price.toLocaleString()} 兩</small></div><button type="button" onClick={()=>sellMaterial(name)} disabled={!price}>出售 1 件</button></article>;
      }):<p className="merchant-material-empty">尚無材料；在四國掛機地圖擊敗怪物後，戰利品會直接放入此處。</p>}</div>
    </section>
    <div className="merchant-bag-subhead merchant-equipment-subhead"><div><strong>裝備道具</strong><small>點擊穿戴，右側按鈕出售</small></div></div>
    <TooltipProvider><div className="merchant-bag-list" role="list">{items.length?items.map((item,index)=><div className="merchant-bag-entry" role="listitem" key={item.uid}><Tooltip><TooltipTrigger className={'merchant-bag-row '+rarityPresentation(item.rarity).className} onClick={()=>equip(item.uid)} aria-label={'背包第 '+(index+1)+' 件：'+item.name}>
      <span className="merchant-bag-icon">{item.image?<img src={item.image} alt=""/>:<strong>{({weapon:'杖',armor:'甲',helm:'兜',boots:'靴',ring:'戒',amulet:'符',gloves:'套',accessory:'符'} as const)[item.slot]}</strong>}</span><span className="merchant-bag-copy"><strong>{item.name}</strong><small>{rarityPresentation(item.rarity).label}・{EQUIPMENT_LABELS[item.slot]}</small></span><em>點擊穿戴</em>
    </TooltipTrigger><TooltipContent className={"hp-gear-tooltip "+rarityPresentation(item.rarity).className}><strong>{item.name}</strong><span className="rarity-caption">{rarityPresentation(item.rarity).label}</span>{equipmentDetailLines(item).map((line,i)=><span key={i}>{line}</span>)}<em>{equipmentDescription(item)}</em></TooltipContent></Tooltip><button className="merchant-bag-sell" type="button" onClick={()=>sell(item.uid)} aria-label={'出售'+item.name}>出售<strong>{equipmentSellPrice(item).toLocaleString()} 兩</strong></button></div>):<p className="merchant-bag-empty">行囊尚空，出發尋覓神裝。</p>}</div></TooltipProvider>
    <div className="rarity-legend" aria-label="裝備品階">{["普通","稀有","史詩","傳說"].map(rarity=><span key={rarity} className={rarityPresentation(rarity).className}>{rarity}</span>)}</div>
    <p>材料與裝備共用無上限行囊。穿戴中的裝備必須先卸下，因此不會被誤賣。</p>
    <div className="merchant-bag-message" role="status">{message||'行囊尚空，出發尋覓戰利品。'}</div>
  </section>;
}
