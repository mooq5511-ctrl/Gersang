/* eslint-disable next/no-img-element */
import {enhancementPresentation,rarityPresentation} from './classic-presentation';
import {positionInventory} from './inventory-layout';
import {equipmentDescription,equipmentDetailLines,type TooltipGear} from './divine-equipment';
import {equipmentSellPrice} from './equipment-market';
import {medicineCatalog} from './game-config';
import {ItemTooltipManager,type ItemTooltipData} from './item-tooltip-manager';
import {EQUIPMENT_LABELS,itemKind,type EquipmentKind} from './equipment-slots';
import {sourceEnemies} from './v17-content';
import {useState} from 'react';
export type BagItem=TooltipGear & {uid:string;name:string;slot:EquipmentKind;image:string;bagSlot?:number};
const materialArtKind=(name:string)=>/草|黃|藥|花|種子|牛黃|桂皮|甘草|熟地黃/.test(name)?'herb':/精氣石|屬性石|千年石|玉|石$/.test(name)?'crystal':/咒術秘訣|密號符|力量碎片/.test(name)?'scroll':/劍|斧|弓|槍|刀|投石索|佛珠|木棒|三叉戟/.test(name)?'weapon':/精髓/.test(name)?'essence':'rare';
type InventoryPanelProps={
  inventory:BagItem[];
  materials:Record<string,number>;
  materialPrices:Record<string,number>;
  medicines?:Record<string,number>;
  equip:(uid:string)=>void;
  sell:(uid:string)=>void;
  sellAllEquipment:()=>void;
  sellMaterial:(name:string)=>void;
  sellAllMaterials:()=>void;
  openAncientCoinBox:(amount:number)=>void;
  message:string;weight:number;maxWeight:number;targetName:string;
};
export function InventoryPanel({inventory,materials,materialPrices,medicines={},equip,sell,sellAllEquipment,sellMaterial,sellAllMaterials,openAncientCoinBox,message,weight,maxWeight,targetName}:InventoryPanelProps){
  const [equipmentFilter,setEquipmentFilter]=useState<'all'|'weapon'|'helm'|'armor'|'gloves'|'boots'|'accessories'>('all');
  const [equipmentQuery,setEquipmentQuery]=useState('');
  const [equipmentSort,setEquipmentSort]=useState<'rarity'|'level'|'name'>('rarity');
  const [coinBoxAmount,setCoinBoxAmount]=useState(1);
  const [materialsOpen,setMaterialsOpen]=useState(true);
  const [materialQuery,setMaterialQuery]=useState('');
  const [tooltip,setTooltip]=useState<{data:ItemTooltipData;left:number;top:number}|null>(null);
  const items=positionInventory(inventory);
  const normalizedEquipmentQuery=equipmentQuery.trim().toLocaleLowerCase();
  const rarityRank=(rarity?:string)=>({普通:0,優良:1,稀有:2,史詩:3,傳說:4,金色:5}[rarity||'普通']??0);
  const filteredItems=items.filter(item=>{
    const kind=itemKind(item.slot);
    const matchesFilter=equipmentFilter==='all'||equipmentFilter===kind||(equipmentFilter==='accessories'&&(kind==='ring'||kind==='amulet'));
    const searchable=[item.name,rarityPresentation(item.rarity).label,EQUIPMENT_LABELS[item.slot],...equipmentDetailLines(item)].join(' ').toLocaleLowerCase();
    return matchesFilter&&(!normalizedEquipmentQuery||searchable.includes(normalizedEquipmentQuery));
  }).sort((a,b)=>{
    if(equipmentSort==='rarity') return rarityRank(b.rarity)-rarityRank(a.rarity)||((b.requiredLevel||1)-(a.requiredLevel||1))||a.name.localeCompare(b.name,'zh-Hant');
    if(equipmentSort==='level') return (b.requiredLevel||1)-(a.requiredLevel||1)||rarityRank(b.rarity)-rarityRank(a.rarity)||a.name.localeCompare(b.name,'zh-Hant');
    return a.name.localeCompare(b.name,'zh-Hant')||rarityRank(b.rarity)-rarityRank(a.rarity);
  });
  const materialEntries=Object.entries(materials).filter(([,count])=>count>0).sort(([a],[b])=>a.localeCompare(b,'zh-Hant'));
  const materialCount=materialEntries.reduce((sum,[,count])=>sum+count,0);
  const medicineEntries=medicineCatalog.filter(medicine=>(medicines[medicine.id]||0)>0);
  const showTooltip=(data:ItemTooltipData,event:{clientX:number;clientY:number})=>setTooltip({...ItemTooltipManager.position({x:event.clientX,y:event.clientY},{width:window.innerWidth,height:window.innerHeight}),data});
  const hideTooltip=()=>setTooltip(null);
  const normalizedMaterialQuery=materialQuery.trim().toLocaleLowerCase();
  const filteredMaterialEntries=materialEntries.filter(([name])=>name.toLocaleLowerCase().includes(normalizedMaterialQuery));
  const materialSources=new Map<string,{maps:string[];enemies:string[]}>();
  for(const enemy of sourceEnemies)for(const material of enemy.drops){
    const current=materialSources.get(material)||{maps:[],enemies:[]};
    const mapName=enemy.mapId==='starter-outskirts'?'新手村郊外':enemy.mapId==='millennium-lake'?'千年湖':'朝鮮地面';
    if(!current.maps.includes(mapName))current.maps.push(mapName);
    if(!current.enemies.includes(enemy.name))current.enemies.push(enemy.name);
    materialSources.set(material,current);
  }
  return <section className="merchant-bag iron-inventory" aria-label="商隊背包"><h2>行囊 <small>裝備 {items.length}・材料 {materialCount}</small></h2>
    <section className="merchant-material-section" aria-label="戰利品材料">
      <div className="merchant-bag-subhead"><div><strong>戰利品材料</strong><small>怪物掉落會自動收入背包・顯示 {filteredMaterialEntries.length}/{materialEntries.length} 種</small></div><span className="merchant-material-header-actions"><button type="button" aria-expanded={materialsOpen} onClick={()=>setMaterialsOpen(open=>!open)}>{materialsOpen?'關閉':'開啟'}材料</button><button type="button" onClick={sellAllMaterials} disabled={!materialCount}>全部出售</button></span></div>
      {materialsOpen&&<><label className="merchant-material-search">搜尋材料<input type="search" value={materialQuery} onChange={event=>setMaterialQuery(event.target.value)} placeholder="輸入材料名稱" aria-label="搜尋戰利品材料"/></label><ul className="merchant-material-list merchant-material-detailed-list">{materialEntries.length?filteredMaterialEntries.map(([name,count])=>{
        const price=materialPrices[name]||0;
        const detail=materialSources.get(name);
        const sourceLabel=detail?.enemies.length?detail.enemies.slice(0,3).join('、')+(detail.enemies.length>3?` 等 ${detail.enemies.length} 種`:""):'其他戰利品';
        const artKind=materialArtKind(name);
        const isAncientCoinBox=name==='古錢箱';
        const openAmount=Math.min(count,Math.max(1,Math.floor(coinBoxAmount)||1));
       return <li className="merchant-material-row merchant-material-detailed-row" key={name}><span className={'merchant-material-icon material-art material-art-'+artKind} aria-label={`${name}圖示`}><img src={`/assets/sprites/loot-${artKind}-cute-v1.png`} alt=""/></span><div className="merchant-material-copy"><strong>{name}</strong><small>持有 ×{count}・{isAncientCoinBox?'開啟可獲得 1–10 枚新手兌換銅錢・售價 1 兩':`單價 ${price.toLocaleString()} 兩`}</small><small>來源：{sourceLabel}</small><small>地區：{detail?.maps.join('、')||'—'}・用途：{isAncientCoinBox?'開啟寶箱（大吉(作／者／好／帥) 各 0.01%）':'鍛造／交易'}</small></div>{isAncientCoinBox?<span className="merchant-material-actions"><label>開啟數量<input aria-label="古錢箱開啟數量" type="number" min="1" max={count} value={openAmount} onChange={event=>setCoinBoxAmount(Math.min(count,Math.max(1,Math.floor(Number(event.target.value)||1))) )}/></label><button type="button" onClick={()=>openAncientCoinBox(openAmount)}>開啟 ×{openAmount}</button><button type="button" onClick={()=>{if(window.confirm('確定以 1 兩出售「古錢箱」？此操作不會開啟寶箱。'))sellMaterial(name)}}>出售 1 兩</button></span>:<button type="button" onClick={()=>sellMaterial(name)} disabled={price===undefined}>出售 1 件</button>}</li>;
     }):<li className="merchant-material-empty">尚無材料；在四國掛機地圖擊敗怪物後，戰利品會直接放入此處。</li>}{materialEntries.length>0&&!filteredMaterialEntries.length&&<li className="merchant-material-empty">找不到符合「{materialQuery}」的材料。</li>}</ul></>}
    </section>
    <section className="merchant-bag-details" aria-label="背包詳細清單"><div className="merchant-bag-subhead"><div><strong>背包詳細清單</strong><small>裝給目前角色・{targetName}・顯示 {filteredItems.length}/{items.length}</small></div><button type="button" onClick={sellAllEquipment} disabled={!items.length}>全部出售</button></div><div className="merchant-equipment-tools"><label>搜尋裝備<input type="search" value={equipmentQuery} onChange={event=>setEquipmentQuery(event.target.value)} placeholder="輸入名稱、品質或部位" aria-label="搜尋背包装備"/></label><label>排列條件<select value={equipmentSort} onChange={event=>setEquipmentSort(event.target.value as typeof equipmentSort)} aria-label="裝備排列條件"><option value="rarity">品質高→低</option><option value="level">等級高→低</option><option value="name">名稱排序</option></select></label></div><div className="merchant-equipment-filters" aria-label="裝備分類篩選">{([['all','全部'],['weapon','武器'],['helm','頭盔'],['armor','盔甲'],['gloves','手套'],['boots','鞋子'],['accessories','飾品']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={equipmentFilter===id} onClick={()=>setEquipmentFilter(id)}>{label}</button>)}</div>{items.length?(filteredItems.length?<ul>{filteredItems.map(item=>{const enhance=enhancementPresentation(item.enhance);return <li key={item.uid} className={'merchant-detail-entry '+rarityPresentation(item.rarity).className}><span className="merchant-bag-icon">{item.image?<img src={item.image} alt=""/>:<strong>裝</strong>}</span><div><strong className="equipment-name-line">{item.name}{enhance.label&&<b className={'enhancement-badge '+enhance.className} aria-label={`強化 ${enhance.label}`}>{enhance.label}</b>}</strong><small>{rarityPresentation(item.rarity).label}・Lv.{item.requiredLevel||1}・{EQUIPMENT_LABELS[item.slot]}</small>{equipmentDetailLines(item).filter(line=>!line.startsWith('強化 +')).slice(0,2).map(line=><em key={line}>{line}</em>)}</div><button type="button" onClick={()=>equip(item.uid)}>裝給{targetName}</button><button type="button" onClick={()=>sell(item.uid)}>出售</button></li>})}</ul>:<p>找不到符合目前搜尋或篩選條件的裝備。</p>):<p>尚無可穿戴裝備。</p>}</section>
    {medicineEntries.length>0&&<section className="merchant-bag-details merchant-consumables" aria-label="背包消耗品"><div className="merchant-bag-subhead"><div><strong>隨身消耗品</strong><small>持有中的藥品</small></div></div><ul>{medicineEntries.map(medicine=>{const count=medicines[medicine.id]||0;return <li key={medicine.id} className="merchant-detail-entry merchant-consumable-entry" onPointerEnter={event=>showTooltip(ItemTooltipManager.consumable(medicine,count),event)} onPointerLeave={hideTooltip}><span className="merchant-bag-icon"><strong>藥</strong></span><div><strong>{medicine.name}</strong><small>持有 ×{count}</small><em>{medicine.effect}</em></div></li>;})}</ul></section>}
    <div className="rarity-legend" aria-label="裝備品階">{["普通","稀有","史詩","傳說","金色"].map(rarity=><span key={rarity} className={rarityPresentation(rarity).className}>{rarity}</span>)}</div>
    <p>材料與裝備共用無上限行囊。穿戴中的裝備必須先卸下，因此不會被誤賣。</p>
    <output className="merchant-bag-message">{message||'行囊尚空，出發尋覓戰利品。'}</output><footer className="merchant-bag-bottom"><span>負重</span><strong>{weight.toFixed(1)} / {maxWeight}</strong></footer>{tooltip&&<aside className="item-tooltip" role="tooltip" style={{left:tooltip.left,top:tooltip.top}}><header>{tooltip.data.image?<img src={tooltip.data.image} alt=""/>:<span>物</span>}<div><strong>{tooltip.data.name}</strong><small>{tooltip.data.quality}・{tooltip.data.kind}</small></div></header>{tooltip.data.sections.map(section=><section key={section.title}><b>{section.title}</b><dl>{section.fields.map(field=><div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></section>)}</aside>}
  </section>;
}
