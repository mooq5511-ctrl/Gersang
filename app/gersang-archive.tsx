"use client";
/* eslint-disable next/no-img-element */

import {useMemo,useState} from 'react';
import {BookOpen,Search,Shield} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {equipmentBases} from './v15-data';
import {officialEquipment,officialGems} from './v17-content';
import {THUNDER_FORGE_RECIPES} from './mythic-forge';
import {MATERIAL_PRICES} from './village-exchange';
import {gersangItemArt} from './gersang-visuals';
import {TIER_EQUIPMENT_DROP_REGIONS,tierEquipmentCatalog,tierEquipmentShopCatalog} from './tier-equipment';
import {battleMaps} from './reference-data';
import {enhancementMilestoneOptions} from './guild-territory';

type Category='全部'|'裝備'|'道具'|'材料';
type Entry={id:string;name:string;category:Exclude<Category,'全部'>;image:string;detailImage?:string;detail:string[]};
const slotLabel:Record<string,string>={weapon:'武器',armor:'盔甲',helm:'頭盔',boots:'鞋子',gloves:'手套',amulet:'腰帶／護身符',accessory:'飾品',ring:'戒指'};
const format=(value:number)=>value.toLocaleString('zh-TW');

export function GersangArchive(){
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState<Category>('全部');
 const [enhancementGuideOpen,setEnhancementGuideOpen]=useState(false);
 const [selectedEntryId,setSelectedEntryId]=useState('');
 const entries=useMemo<Entry[]>(()=>{
   const base=equipmentBases.map(item=>({id:'base-'+item.id,name:item.name,category:'裝備' as const,image:gersangItemArt(item.slot),detail:[slotLabel[item.slot]||'裝備',`攻擊 ${item.atk}・防禦 ${item.def}・生命 ${item.hp}`]}));
   const official=officialEquipment.map(item=>({id:'official-'+item.id,name:item.name,category:'裝備' as const,image:gersangItemArt(item.kind),detail:[`Lv.${item.level}・${slotLabel[item.kind]||'裝備'}`,`攻擊 ${item.atk||0}・防禦 ${item.def||0}`,`力量 ${item.str||0}・敏捷 ${item.agi||0}・體質 ${item.vit||0}・智力 ${item.intel||0}`,item.skill?`裝備技能：${item.skill}`:`商店售價 ${format(item.price)} 兩`]}));
   const tiers=tierEquipmentCatalog.map(item=>{const region=TIER_EQUIPMENT_DROP_REGIONS.find(entry=>entry.tiers.some(level=>level===item.requiredLevel));return {id:item.id,name:item.name,category:'裝備' as const,image:gersangItemArt(item.slot),detail:[`Lv.${item.requiredLevel}・${item.partLabel}・${item.series}`,`攻擊 ${item.atk}・防禦 ${item.def}・生命 ${item.hp}`,region?`來源：${battleMaps.find(map=>map.id===region.mapId)?.name||region.mapId}怪物掉落`:tierEquipmentShopCatalog.some(shop=>shop.id===item.id)?'來源：城市商店（依等級開放，後續地圖將調整）':'來源待開放']};});
   const mythic=THUNDER_FORGE_RECIPES.map(item=>({id:'mythic-'+item.id,name:item.name,category:'裝備' as const,image:item.image||gersangItemArt(item.slot),detailImage:item.name==='T10 蚩尤戰甲'?'/assets/equipment/chiyou/chiyou-armor-hd.png':undefined,detail:[`T10・${slotLabel[item.slot]||'裝備'}・無等級限制`, `攻擊 ${item.atk}・防禦 ${item.def}・生命 ${item.hp}`,`力量 ${item.bonus.str}・敏捷 ${item.bonus.agi}・體質 ${item.bonus.vit}・智力 ${item.bonus.intel}`,item.skill||item.magic.map(affix=>`${affix.name}：${affix.text}`).join('・')] }));
   const gems=officialGems.map(gem=>({id:'gem-'+gem.id,name:gem.name,category:'道具' as const,image:'/assets/items/a001_ELEMENT04_I.png',detail:[`寶石・${gem.label}`,`鑲嵌加成 +${gem.values.join('／+')}`,`工房費用 ${gem.costs.map(format).join('／')} 兩`]}));
   const materials=Object.entries(MATERIAL_PRICES).map(([name,price])=>({id:'material-'+name,name,category:'材料' as const,image:'/assets/sprites/loot-rare-cute-v1.png',detail:['怪物掉落／鍛造材料',`收購單價 ${format(price)} 兩`,name==='古錢箱'?'可選擇數量開啟，獲得新手兌換銅錢。':'可用於交易、鍛造或兌換。']}));
   return [...base,...official,...tiers,...mythic,...gems,...materials].filter((entry,index,all)=>all.findIndex(other=>other.category===entry.category&&other.name===entry.name)===index);
 },[]);
 const filtered=entries.filter(entry=>(category==='全部'||entry.category===category)&&(!query.trim()||`${entry.name} ${entry.detail.join(' ')}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
 const selectedEntry=filtered.find(entry=>entry.id===selectedEntryId)||filtered[0];
 return <section className="panel equipment-codex" aria-label="裝備圖鑑">
   <header className="equipment-codex-header"><div><small>商團資料庫</small><h2><BookOpen/>裝備圖鑑</h2><p>收錄目前可穿戴的武器、防具、神獸套裝、道具與材料資訊。</p></div><span><Shield/> {filtered.length} 筆</span></header>
   <div className="equipment-codex-toolbar"><label htmlFor="equipment-codex-search"><Search/><Input id="equipment-codex-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜尋名稱、部位、屬性或效果" aria-label="搜尋裝備圖鑑"/></label><fieldset className="equipment-codex-categories" aria-label="圖鑑分類">{(['全部','裝備','道具','材料'] as Category[]).map(item=><button type="button" key={item} aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}<button type="button" className="enhancement-guide-toggle" aria-expanded={enhancementGuideOpen} aria-controls="equipment-enhancement-guide" onClick={()=>setEnhancementGuideOpen(open=>!open)}>強化契印 {enhancementGuideOpen?'▲':'▼'}</button></fieldset></div>
   {enhancementGuideOpen&&<section id="equipment-enhancement-guide" className="equipment-enhancement-guide" aria-label="裝備強化里程碑規則"><header><strong>強化里程碑契印</strong><small>每次突破隨機抽取一種契印，三種契印均等機率。</small></header>{([5,10,15] as const).map(level=><div key={level}><b>+{level}</b>{enhancementMilestoneOptions(level).map(option=><span key={option.id}>{option.name}・{option.text} +{option.min}%～{option.max}%・{(option.chance*100).toFixed(1)}%</span>)}</div>)}<p>強化失敗不退級；每次失敗幸運值 +10，累積至 100 後下次必定成功。</p></section>}
   {filtered.length?<div className="equipment-codex-browser"><div className="equipment-codex-list" aria-label="裝備圖鑑清單">{filtered.map(entry=><button type="button" aria-label={`選擇${entry.name}`} aria-pressed={selectedEntry?.id===entry.id} className={selectedEntry?.id===entry.id?'selected':''} key={entry.id} onClick={()=>setSelectedEntryId(entry.id)}><img src={entry.image} alt=""/><span><small>{entry.category}</small><strong>{entry.name}</strong><em>{entry.detail[0]}</em></span></button>)}</div>{selectedEntry&&<article className="equipment-codex-detail"><div className="equipment-codex-detail-hero"><img src={selectedEntry.detailImage||selectedEntry.image} alt=""/></div><div className="equipment-codex-detail-copy"><small>{selectedEntry.category}</small><h3>{selectedEntry.name}</h3>{selectedEntry.detail.map((detail,index)=><p key={index}>{detail}</p>)}<div className="equipment-codex-detail-hint">點選左側清單可切換裝備</div></div></article>}</div>:<p className="equipment-codex-empty">找不到符合條件的裝備、道具或材料。</p>}
 </section>;
}
