/* eslint-disable next/no-img-element */
import { combatStats, vitalStats, type VitalUnit } from './vitals-engine';
import { HeroStatusPanel } from './hero-status-panel';
import type {ReactNode} from 'react';
import {useState} from 'react';

import {EQUIPMENT_SLOTS,EQUIPMENT_LABELS,type EquipmentSlot} from './equipment-slots';
import {InventoryPanel,type BagItem} from './inventory-panel';
import {type BattlePosition} from './formation-position';
import { AbilityPanel } from './ability-panel';
import { LEVEL_CAP, progressForLevel } from './level-progression';

// 此面板只呈現真實遊戲資料；金錢與成長由遊戲唯一計時器結算。
export type CaravanMember = VitalUnit & { uid:string; name:string; role:string; job?:string; image:string; xp:number; points:number; str:number; agi:number; position:BattlePosition };
type Props = {
  battle:ReactNode;navigation:ReactNode;busy:boolean;
  hero:CaravanMember; mercs:CaravanMember[]; restingMercs:CaravanMember[]; active:string[]; toggleActive:(uid:string)=>void; storeMercenary:(uid:string)=>void; withdrawRestingMercenary:(uid:string)=>void; gold:number; credit:number; creditXp:number; creditLevel:number; newbieCoins:number; redeemWandererSet:(set:'azure'|'chiyou'|'amaterasu')=>void; weight:number; maxWeight:number;
  cost:number; power:(unit:CaravanMember)=>number; xpNeed:(level:number)=>number;
  select:(uid:string)=>void; cyclePosition:(uid:string)=>void; hire:()=>void; train:()=>void; allocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void;
  trade:()=>void; trainHero:()=>void;

  inventory:BagItem[];materials:Record<string,number>;materialPrices:Record<string,number>;
  equipSelected:(uid:string,targetUid:string)=>void;sellInventory:(uid:string)=>void;sellAllInventory:()=>void;sellMaterial:(name:string)=>void;sellAllMaterials:()=>void;openAncientCoinBox:(amount:number)=>void;
  unequipHero:(slot:EquipmentSlot)=>void;bagMessage:string;
};
export function CaravanStatus(p:Props) {
  // 戰力使用既有引擎，包含穿戴裝備。
  const [selectedRosterUid,setSelectedRosterUid]=useState(p.hero.uid);
  const [activeWindow,setActiveWindow]=useState<'stats'|'inventory'|'wanderer'|'rest'|'formation'|null>(null);
  const selectedRoster=[p.hero,...p.mercs].find(unit=>unit.uid===selectedRosterUid)||p.hero;
  const deployed=[p.hero,...p.mercs.filter(unit=>p.active.includes(unit.uid))].slice(0,12);
  const chooseRoster=(unit:CaravanMember)=>{setSelectedRosterUid(unit.uid);setActiveWindow(null);p.select(unit.uid);};
  return <section className="caravan-status" aria-label="主角與商隊狀態">
    <aside className="party-window-roster" aria-label="主角與傭兵"><strong>隊伍 {Math.min(12,1+p.mercs.length)}／12</strong>{[p.hero,...p.mercs].slice(0,12).map(unit=><button type="button" className={selectedRoster.uid===unit.uid?'selected':''} key={unit.uid} onClick={()=>chooseRoster(unit)} aria-label={'選擇'+unit.name}><img src={unit.image} alt=""/><span>{unit.uid==='hero'?'主':'傭'}</span></button>)}</aside>
    <nav className="party-context-menu" aria-label="角色功能"><strong>{selectedRoster.name}</strong>{selectedRoster.uid!=='hero'&&<button type="button" onClick={()=>p.toggleActive(selectedRoster.uid)}>{p.active.includes(selectedRoster.uid)?'撤下':'上陣'}</button>}<button type="button" disabled={selectedRoster.uid==='hero'||p.active.includes(selectedRoster.uid)} onClick={()=>p.storeMercenary(selectedRoster.uid)}>休息</button><button type="button" aria-pressed={activeWindow==='stats'} onClick={()=>setActiveWindow('stats')}>能力值</button><button type="button" aria-pressed={activeWindow==='inventory'} onClick={()=>setActiveWindow('inventory')}>背包</button></nav>
    <button type="button" className="wandering-caravan-button" aria-pressed={activeWindow==='wanderer'} onClick={()=>setActiveWindow('wanderer')}><span>平行世界</span><strong>流浪商團</strong><small>神獸套裝兌換</small></button>
    <button type="button" className="mercenary-rest-button" aria-pressed={activeWindow==='rest'} onClick={()=>setActiveWindow('rest')}><span>商團駐地</span><strong>傭兵休息處</strong><small>{p.restingMercs.length}／10 格</small></button>
    <button type="button" className="party-formation-button" aria-pressed={activeWindow==='formation'} onClick={()=>setActiveWindow('formation')}><span>商團駐地</span><strong>隊伍編制</strong><small>調整 3 × 4 站位</small></button>
    {p.battle && <div className="hero-inventory-layout battle-only">{p.battle}</div>}
    {activeWindow==='stats'&&<section className="floating-game-window floating-character" aria-label="角色能力值"><header><strong>{selectedRoster.name}・能力值</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉能力值">×</button></header>{selectedRoster.uid==='hero'?<><HeroStatusPanel compact busy={p.busy} hero={p.hero} gold={p.gold} credit={p.credit} creditXp={p.creditXp} creditLevel={p.creditLevel} weight={p.weight} xpNeed={p.xpNeed} allocate={p.allocate} trade={p.trade} train={p.trainHero} select={()=>p.select(p.hero.uid)} unequip={p.unequipHero}/><AbilityPanel hero={p.hero} allocate={p.allocate}/></>:<MercenaryStatusWindow unit={selectedRoster} power={p.power} allocate={p.allocate}/>}<EquipmentSummary unit={selectedRoster}/></section>}
    {activeWindow==='inventory'&&<section className="floating-game-window floating-inventory" aria-label="行囊窗"><header><strong>{selectedRoster.name}・背包</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉背包">×</button></header><InventoryPanel inventory={p.inventory} materials={p.materials} materialPrices={p.materialPrices} equip={itemUid=>p.equipSelected(itemUid,selectedRoster.uid)} sell={p.sellInventory} sellAllEquipment={p.sellAllInventory} sellMaterial={p.sellMaterial} sellAllMaterials={p.sellAllMaterials} openAncientCoinBox={p.openAncientCoinBox} message={p.bagMessage} weight={p.weight} maxWeight={p.maxWeight} targetName={selectedRoster.name}/></section>}
    {activeWindow==='wanderer'&&<section className="floating-game-window floating-wanderer" aria-label="平行世界流浪商團"><header><strong>平行世界流浪商團</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉流浪商團">×</button></header><div className="wanderer-exchange"><small>商團駐地・異界旅人限定兌換</small><strong>新手兌換銅錢 {p.newbieCoins.toLocaleString()} 枚</strong><p>每次花費 1,000 枚，直接兌換一套完整 T10 神獸裝備（五件）。</p>{([['azure','青龍套裝','防禦・生命'],['chiyou','蚩尤套裝','力量・戰意'],['amaterasu','天照套裝','智力・法術']] as const).map(([set,name,focus])=><button key={set} type="button" disabled={p.newbieCoins<1000} onClick={()=>p.redeemWandererSet(set)}><span><b>{name}</b><small>{focus}・五件套</small></span><em>1,000 枚兌換</em></button>)}</div></section>}
    {activeWindow==='rest'&&<section className="floating-game-window floating-rest" aria-label="傭兵休息處"><header><strong>傭兵休息處・{p.restingMercs.length}／10</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉傭兵休息處">×</button></header><div className="mercenary-rest-grid">{Array.from({length:10},(_,index)=>{const unit=p.restingMercs[index];return unit?<article key={unit.uid}><img src={unit.image} alt=""/><span><strong>{unit.name}</strong><small>Lv. {unit.level}・{unit.role}</small></span><button type="button" disabled={p.mercs.length>=11} onClick={()=>p.withdrawRestingMercenary(unit.uid)}>取回</button></article>:<div className="mercenary-rest-empty" key={'empty-'+index}><b>＋</b><small>空位</small></div>;})}</div><p className="mercenary-rest-note">休息中的傭兵不會參與戰鬥；請先將上陣傭兵撤下，再點選「休息」存放。</p></section>}
    {activeWindow==='formation'&&<section className="floating-game-window floating-formation" aria-label="隊伍編制"><header><strong>隊伍編制・3 × 4 左右戰場</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉隊伍編制">×</button></header><p className="formation-guide">點擊角色即可依序切換前排、中排、後排。戰鬥中不可換位；系統會在各排內自動分配三條戰線。</p><div className="formation-lanes">{(['後排','中排','前排'] as const).map(position=><section key={position}><header><strong>{position}</strong><small>{position==='前排'?'靠近敵軍・col 3':position==='後排'?'遠離敵軍・col 0':'中央支援・col 1～2'}</small></header><div>{deployed.filter(unit=>unit.position===position).map(unit=><button type="button" key={unit.uid} disabled={p.busy} onClick={()=>p.cyclePosition(unit.uid)} title={p.busy?'戰鬥進行中不可換位':'點擊切換下一個站位'}><img src={unit.image} alt=""/><span><b>{unit.name}</b><small>{unit.uid==='hero'?'主角':'傭兵'}・點擊換位</small></span></button>)}{!deployed.some(unit=>unit.position===position)&&<em>此排尚未配置角色</em>}</div></section>)}</div></section>}
  </section>;
}

function MercenaryStatusWindow({unit,power,allocate}:{unit:CaravanMember;power:(unit:CaravanMember)=>number;allocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void}){
  const vital=vitalStats(unit);
  const combat=combatStats(unit),levelData=progressForLevel(unit.level);
  return <section className="hero-personal iron-character compact mercenary-status"><div className="mercenary-status-identity"><img src={unit.image} alt={unit.name}/><span><strong>{unit.name}</strong><small>{unit.role} · Lv. {unit.level}</small></span></div>
    <section className="hp-indicators"><div className="hp-power"><span>總戰鬥力</span><strong>{power(unit).toLocaleString()}</strong></div><p className="hp-gold">定位：{unit.role}</p></section>
    <section className="hp-allocation"><p>剩餘屬性點 <strong>{unit.points}</strong><small>＋100 會在點數不足時投入全部剩餘點數。</small></p>{([['str','力量','Str',unit.str],['agi','敏捷','Dex',unit.agi],['vit','體質','Vit',unit.vit],['intel','智力','Int',unit.intel]] as const).map(([stat,label,short,value])=><div className="hp-stat" key={stat}><span>{label} <small>{short}</small></span><small>基礎能力</small><strong>{value}</strong><button aria-label={`增加${label}`} disabled={unit.points<=0} onClick={()=>allocate(stat)}>＋</button><button aria-label={`增加100點${label}`} disabled={unit.points<=0} onClick={()=>allocate(stat,100)}>＋100</button></div>)}<p className="hp-defense">防禦力 <strong>{combat.defense}</strong><small>已包含等級與裝備加成</small></p><div className="hp-vitals"><label className="hp-meter">生命值 HP<span>{vital.hp} / {vital.maxHp}</span><progress className="hp" max={vital.maxHp} value={vital.hp}/></label><label className="hp-meter">魔法值 MP<span>{vital.mp} / {vital.maxMp}</span><progress className="mp" max={vital.maxMp} value={vital.mp}/></label></div><label className="hp-meter hp-exp">EXP<span>{unit.level>=LEVEL_CAP?'已達 Lv.300':`${unit.xp.toLocaleString()} / ${levelData.xpToNext.toLocaleString()}`}</span>{unit.level<LEVEL_CAP&&<progress max={levelData.xpToNext} value={unit.xp}/>}</label></section>
  </section>;
}

type WindowEquipment={image?:string;name:string;atk?:number;def?:number;hp?:number;magic?:{id:string;name:string;text:string;color:string}[];socketGem?:{name:string;count:number;totalValue:number}};
function EquipmentSummary({unit}:{unit:CaravanMember}){
  return <section className="window-equipment" aria-label="八格裝備與額外魔法屬性"><h3>八格裝備與額外魔法屬性</h3><div>{EQUIPMENT_SLOTS.map(slot=>{const item=unit.equip[slot] as WindowEquipment|null;return <article key={slot}><span className="window-equipment-icon">{item?.image?<img src={item.image} alt=""/>:EQUIPMENT_LABELS[slot].slice(0,1)}</span><p><small>{EQUIPMENT_LABELS[slot]}</small><strong>{item?.name||'未裝備'}</strong>{item&&<><em>攻 {item.atk||0}・防 {item.def||0}・生命 {item.hp||0}</em>{item.socketGem&&<i style={{color:'#8ee7ff'}}>鑲嵌：{item.socketGem.name} ×{item.socketGem.count}（加成 {item.socketGem.totalValue}）</i>}{item.magic?.filter(affix=>!affix.id.startsWith('socket-')).map(affix=><i key={affix.id} style={{color:affix.color}}>{affix.name}：{affix.text}</i>)}</>}</p></article>;})}</div></section>;
}
