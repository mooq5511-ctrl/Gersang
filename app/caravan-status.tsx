/* eslint-disable next/no-img-element */
import { vitalStats, type VitalUnit } from './vitals-engine';
import { HeroStatusPanel } from './hero-status-panel';
import type {ReactNode} from 'react';
import {useState} from 'react';

import {EQUIPMENT_SLOTS,EQUIPMENT_LABELS,type EquipmentSlot} from './equipment-slots';
import {InventoryPanel,type BagItem} from './inventory-panel';
import {type BattlePosition} from './formation-position';
import { AbilityPanel } from './ability-panel';

// 此面板只呈現真實遊戲資料；金錢與成長由遊戲唯一計時器結算。
export type CaravanMember = VitalUnit & { uid:string; name:string; role:string; job?:string; image:string; xp:number; points:number; str:number; agi:number; position:BattlePosition };
type Props = {
  battle:ReactNode;navigation:ReactNode;busy:boolean;
  hero:CaravanMember; mercs:CaravanMember[]; gold:number; credit:number; weight:number; maxWeight:number;
  cost:number; power:(unit:CaravanMember)=>number; xpNeed:(level:number)=>number;
  select:(uid:string)=>void; cyclePosition:(uid:string)=>void; hire:()=>void; train:()=>void; allocate:(stat:'str'|'agi'|'vit'|'intel')=>void;
  trade:()=>void; trainHero:()=>void;

  inventory:BagItem[];materials:Record<string,number>;materialPrices:Record<string,number>;
  equipSelected:(uid:string,targetUid:string)=>void;sellInventory:(uid:string)=>void;sellMaterial:(name:string)=>void;sellAllMaterials:()=>void;
  unequipHero:(slot:EquipmentSlot)=>void;bagMessage:string;
};
export function CaravanStatus(p:Props) {
  // 信用等級採每級 100 點；戰力使用既有引擎，包含穿戴裝備。
  const [selectedRosterUid,setSelectedRosterUid]=useState(p.hero.uid);
  const [activeWindow,setActiveWindow]=useState<'stats'|'inventory'|null>(null);
  const selectedRoster=[p.hero,...p.mercs].find(unit=>unit.uid===selectedRosterUid)||p.hero;
  const chooseRoster=(unit:CaravanMember)=>{setSelectedRosterUid(unit.uid);setActiveWindow(null);p.select(unit.uid);};
  return <section className="caravan-status" aria-label="主角與商隊狀態">
    <aside className="party-window-roster" aria-label="主角與傭兵"><strong>隊伍</strong>{[p.hero,...p.mercs].slice(0,9).map(unit=><button type="button" className={selectedRoster.uid===unit.uid?'selected':''} key={unit.uid} onClick={()=>chooseRoster(unit)} aria-label={'選擇'+unit.name}><img src={unit.image} alt=""/><span>{unit.uid==='hero'?'主':'傭'}</span></button>)}</aside>
    <nav className="party-context-menu" aria-label="角色功能"><strong>{selectedRoster.name}</strong><button type="button" aria-pressed={activeWindow==='stats'} onClick={()=>setActiveWindow('stats')}>能力值</button><button type="button" aria-pressed={activeWindow==='inventory'} onClick={()=>setActiveWindow('inventory')}>背包</button></nav>
    <div className="hero-inventory-layout battle-only">{p.battle}</div>
    {activeWindow==='stats'&&<section className="floating-game-window floating-character" aria-label="角色能力值"><header><strong>{selectedRoster.name}・能力值</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉能力值">×</button></header>{selectedRoster.uid==='hero'?<><HeroStatusPanel compact busy={p.busy} hero={p.hero} gold={p.gold} credit={p.credit} weight={p.weight} xpNeed={p.xpNeed} allocate={p.allocate} trade={p.trade} train={p.trainHero} select={()=>p.select(p.hero.uid)} unequip={p.unequipHero}/><AbilityPanel hero={p.hero} allocate={p.allocate}/></>:<MercenaryStatusWindow unit={selectedRoster} power={p.power}/>}<EquipmentSummary unit={selectedRoster}/></section>}
    {activeWindow==='inventory'&&<section className="floating-game-window floating-inventory" aria-label="行囊窗"><header><strong>{selectedRoster.name}・背包</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉背包">×</button></header><InventoryPanel inventory={p.inventory} materials={p.materials} materialPrices={p.materialPrices} equip={itemUid=>p.equipSelected(itemUid,selectedRoster.uid)} sell={p.sellInventory} sellMaterial={p.sellMaterial} sellAllMaterials={p.sellAllMaterials} message={p.bagMessage} weight={p.weight} maxWeight={p.maxWeight} targetName={selectedRoster.name}/></section>}
  </section>;
}

function MercenaryStatusWindow({unit,power}:{unit:CaravanMember;power:(unit:CaravanMember)=>number}){
  const vital=vitalStats(unit);
  return <section className="mercenary-status"><div className="mercenary-status-identity"><img src={unit.image} alt={unit.name}/><span><strong>{unit.name}</strong><small>{unit.role} · Lv. {unit.level}</small></span></div><dl><div><dt>生命力</dt><dd>{vital.hp} / {vital.maxHp}</dd></div><div><dt>魔法力</dt><dd>{vital.mp} / {vital.maxMp}</dd></div><div><dt>力量</dt><dd>{unit.str}</dd></div><div><dt>敏捷</dt><dd>{unit.agi}</dd></div><div><dt>體力</dt><dd>{unit.vit}</dd></div><div><dt>智力</dt><dd>{unit.intel}</dd></div><div><dt>戰鬥力</dt><dd>{power(unit).toLocaleString()}</dd></div></dl><p>傭兵能力值會隨等級、裝備與戰鬥狀態即時更新。</p></section>;
}

type WindowEquipment={image?:string;name:string;atk?:number;def?:number;hp?:number;magic?:{id:string;name:string;text:string;color:string}[]};
function EquipmentSummary({unit}:{unit:CaravanMember}){
  return <section className="window-equipment" aria-label="八格裝備與額外魔法屬性"><h3>八格裝備與額外魔法屬性</h3><div>{EQUIPMENT_SLOTS.map(slot=>{const item=unit.equip[slot] as WindowEquipment|null;return <article key={slot}><span className="window-equipment-icon">{item?.image?<img src={item.image} alt=""/>:EQUIPMENT_LABELS[slot].slice(0,1)}</span><p><small>{EQUIPMENT_LABELS[slot]}</small><strong>{item?.name||'未裝備'}</strong>{item&&<><em>攻 {item.atk||0}・防 {item.def||0}・生命 {item.hp||0}</em>{item.magic?.slice(0,1).map(affix=><i key={affix.id} style={{color:affix.color}}>{affix.name}：{affix.text}</i>)}</>}</p></article>;})}</div></section>;
}
