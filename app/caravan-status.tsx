/* eslint-disable next/no-img-element */
import { vitalStats, type VitalUnit } from './vitals-engine';
import { HeroStatusPanel } from './hero-status-panel';
import type {ReactNode} from 'react';
import {useState} from 'react';

import type {EquipmentSlot} from './equipment-slots';
import {InventoryPanel,type BagItem} from './inventory-panel';
import {BATTLE_POSITIONS,type BattlePosition} from './formation-position';
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
  equipHero:(uid:string)=>void;sellInventory:(uid:string)=>void;sellMaterial:(name:string)=>void;sellAllMaterials:()=>void;
  unequipHero:(slot:EquipmentSlot)=>void;bagMessage:string;
};
function Bars({unit}:{unit:CaravanMember}) {
  const v=vitalStats(unit);
  return <div className="caravan-bars">{(['hp','mp'] as const).map(key=>{
    const max=key==='hp'?v.maxHp:v.maxMp;
    return <label key={key}>{key.toUpperCase()} <span>{v[key]} / {max}</span><progress className={key} max={max} value={v[key]} /></label>;
  })}</div>;
}
export function CaravanStatus(p:Props) {
  // 信用等級採每級 100 點；戰力使用既有引擎，包含穿戴裝備。
  const total=p.power(p.hero)+p.mercs.reduce((sum,unit)=>sum+p.power(unit),0);
  const [characterOpen,setCharacterOpen]=useState(true);
  const [inventoryOpen,setInventoryOpen]=useState(true);
  return <section className="caravan-status" aria-label="主角與商隊狀態">
    {p.navigation}
    <div className="caravan-window-controls" aria-label="視窗控制"><button type="button" aria-pressed={characterOpen} onClick={()=>setCharacterOpen(open=>!open)}>人物</button><button type="button" aria-pressed={inventoryOpen} onClick={()=>setInventoryOpen(open=>!open)}>行囊</button></div>
    <div className="hero-inventory-layout battle-only">{p.battle}</div>
    {characterOpen&&<section className="floating-game-window floating-character" aria-label="角色資訊窗"><header><strong>角色狀態</strong><button type="button" onClick={()=>setCharacterOpen(false)} aria-label="關閉角色資訊窗">×</button></header><HeroStatusPanel busy={p.busy} hero={p.hero} gold={p.gold} credit={p.credit} weight={p.weight} xpNeed={p.xpNeed} allocate={p.allocate} trade={p.trade} train={p.trainHero} select={()=>p.select(p.hero.uid)} unequip={p.unequipHero}/></section>}
    {inventoryOpen&&<section className="floating-game-window floating-inventory" aria-label="行囊窗"><header><strong>行囊</strong><button type="button" onClick={()=>setInventoryOpen(false)} aria-label="關閉行囊窗">×</button></header><InventoryPanel inventory={p.inventory} materials={p.materials} materialPrices={p.materialPrices} equip={p.equipHero} sell={p.sellInventory} sellMaterial={p.sellMaterial} sellAllMaterials={p.sellAllMaterials} message={p.bagMessage} weight={p.weight} maxWeight={p.maxWeight}/></section>}
    <AbilityPanel hero={p.hero} allocate={p.allocate}/>
    <section className="caravan-wood caravan-team"><header><small>中央傭兵公會 · 商隊名冊</small><h2>九席護商隊</h2><span>{Math.min(9,p.mercs.length)} / 9 席 · 隨機僱用 {p.cost.toLocaleString()} 兩</span></header>
      <p className="hero-team-total">總商隊戰力 {total.toLocaleString()}</p>
      <div className="tactical-formation" aria-label="前中後排戰術位置">{BATTLE_POSITIONS.map(position=>{
        const members=[p.hero,...p.mercs].filter(unit=>unit.position===position);
        return <section className={'formation-row formation-'+position} key={position}><header><strong>{position==='前排'?'🛡️':position==='中排'?'⚔️':'🏹'} {position}</strong><span>{position==='前排'?'輸出 +20% · 優先承傷':position==='中排'?'前排倒下後接戰':'最後承傷 · 50% 閃避'}</span></header><div>{members.length?members.map(unit=><article className="formation-member" key={unit.uid}><button className="formation-member-main" aria-label={'查看'+unit.name+'的狀態'} onClick={()=>p.select(unit.uid)}><img src={unit.image} alt=""/><span><small>{unit.uid==='hero'?'主角':'公會傭兵'} · Lv.{unit.level}</small><strong>{unit.name}</strong><em>{unit.role}</em></span></button><Bars unit={unit}/><footer><b>戰力 {p.power(unit).toLocaleString()}</b><button className="formation-cycle" onClick={()=>p.cyclePosition(unit.uid)} aria-label={'切換'+unit.name+'的位置'}>🔄 切換位置</button></footer></article>):<p className="formation-vacant">此排目前無人駐守</p>}</div></section>;
      })}</div>
      {p.mercs.length<9&&<div className="caravan-hire-row">{Array.from({length:9-p.mercs.length},(_,index)=><button className="caravan-empty" key={'empty-'+index} disabled={p.gold<p.cost} onClick={p.hire}><b>＋</b><strong>點擊僱用傭兵</strong><small>{p.gold<p.cost?'資金不足':p.cost.toLocaleString()+' 兩 · 隨機初始傭兵'}</small></button>)}</div>}
      <p>敵軍會由前排開始逐排推進；同排多人會輪流承傷。前排輸出提高 20%，後排遭到攻擊時有 50% 機率閃避。主角與五名出戰傭兵全數倒下才算商隊全滅。</p>
      <button className="caravan-train" disabled={p.busy} onClick={p.train}>全隊訓練 · 全員獲得 100 經驗</button><p>點選成員查看能力與裝備。經驗按鈕為測試玩法，不扣金錢；跑商途中戰鬥機制保持不變。</p>
      {p.mercs.length>9&&<div>舊存檔候補（保留角色，不再新增）：{p.mercs.slice(9).map(unit=><button key={unit.uid} onClick={()=>p.select(unit.uid)}>{unit.name} Lv.{unit.level}</button>)}</div>}
    </section>
  </section>;
}
