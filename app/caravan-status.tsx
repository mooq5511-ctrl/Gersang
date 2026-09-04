import { vitalStats, type VitalUnit } from './vitals-engine';
import { HeroStatusPanel } from './hero-status-panel';

import type {EquipmentSlot} from './equipment-slots';
import {InventoryPanel,type BagItem} from './inventory-panel';

// 此面板只呈現真實遊戲資料；金錢與成長由遊戲唯一計時器結算。
export type CaravanMember = VitalUnit & { uid:string; name:string; role:string; job?:string; image:string; xp:number; points:number; str:number; agi:number };
type Props = {
  hero:CaravanMember; mercs:CaravanMember[]; gold:number; credit:number; weight:number; maxWeight:number;
  cost:number; power:(unit:CaravanMember)=>number; xpNeed:(level:number)=>number;
  select:(uid:string)=>void; hire:()=>void; train:()=>void; allocate:(stat:'str'|'agi'|'vit'|'intel')=>void;
  trade:()=>void; trainHero:()=>void;

  inventory:BagItem[];equipHero:(uid:string)=>void;unequipHero:(slot:EquipmentSlot)=>void;bagMessage:string;
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
  return <section className="caravan-status" aria-label="主角與商隊狀態">
    <div className="hero-inventory-layout"><HeroStatusPanel hero={p.hero} gold={p.gold} credit={p.credit} weight={p.weight} xpNeed={p.xpNeed} allocate={p.allocate} trade={p.trade} train={p.trainHero} select={()=>p.select(p.hero.uid)} unequip={p.unequipHero}/><InventoryPanel inventory={p.inventory} equip={p.equipHero} message={p.bagMessage}/></div>
    <section className="caravan-wood caravan-team"><header><small>中央傭兵公會 · 商隊名冊</small><h2>九席護商隊</h2><span>{Math.min(9,p.mercs.length)} / 9 席 · 隨機僱用 {p.cost.toLocaleString()} 兩</span></header>
      <p className="hero-team-total">總商隊戰力 {total.toLocaleString()}</p>
      <div className="caravan-nine">{Array.from({length:9},(_,index)=>{const unit=p.mercs[index];return unit?<button className="caravan-member" key={unit.uid} onClick={()=>p.select(unit.uid)}><small>第 {index+1} 席</small><img src={unit.image} alt=""/><strong>{unit.name}</strong><span>Lv.{unit.level} · {unit.role}</span><Bars unit={unit}/><em>戰力 {p.power(unit).toLocaleString()}</em></button>:<button className="caravan-empty" key={'empty-'+index} disabled={p.gold<p.cost} onClick={p.hire}><b>＋</b><strong>點擊僱用傭兵</strong><small>{p.gold<p.cost?'資金不足':p.cost.toLocaleString()+' 兩 · 隨機初始傭兵'}</small></button>})}</div>
      <p>主角基礎 HP＝體質×4、MP＝智力×4，裝備加成另計。主角個人戰力依四圍與等級公式；總商隊戰力另加全部已僱用傭兵。離線收益最多 8 小時。</p>
      <button className="caravan-train" onClick={p.train}>全隊訓練 · 全員獲得 100 經驗</button><p>點選成員查看能力與裝備。經驗按鈕為測試玩法，不扣金錢；跑商途中戰鬥機制保持不變。</p>
      {p.mercs.length>9&&<div>舊存檔候補（保留角色，不再新增）：{p.mercs.slice(9).map(unit=><button key={unit.uid} onClick={()=>p.select(unit.uid)}>{unit.name} Lv.{unit.level}</button>)}</div>}
    </section>
  </section>;
}
