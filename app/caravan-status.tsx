import { vitalStats, type VitalUnit } from './vitals-engine';

// 此面板只呈現真實遊戲資料；金錢與成長由遊戲唯一計時器結算。
export type CaravanMember = VitalUnit & { uid:string; name:string; role:string; job?:string; image:string; xp:number; points:number; str:number; agi:number };
type Props = {
  hero:CaravanMember; mercs:CaravanMember[]; gold:number; credit:number; weight:number; maxWeight:number;
  cost:number; power:(unit:CaravanMember)=>number; xpNeed:(level:number)=>number;
  select:(uid:string)=>void; hire:()=>void; train:()=>void; allocate:(stat:'str'|'agi'|'vit'|'intel')=>void;
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
    <aside className="caravan-wood">
      <header><small>商途 · 人物誌</small><h2>主角狀態</h2><span>行商天下，信義為本</span></header>
      <button className="caravan-identity" onClick={()=>p.select(p.hero.uid)}><img src={p.hero.image} alt="主角肖像"/><span><strong>{p.hero.name}</strong><small>Lv.{p.hero.level} · {p.hero.job||p.hero.role}</small><em>查看八格裝備 ↓</em></span></button>
      <Bars unit={p.hero}/>
      <label className="caravan-xp">經驗 {p.hero.xp} / {p.xpNeed(p.hero.level)}<progress max={p.xpNeed(p.hero.level)} value={p.hero.xp}/></label>
      <div className="caravan-attributes">{([['str','力量'],['agi','敏捷'],['vit','體質'],['intel','智力']] as const).map(([key,label])=><div key={key}><span>{label}</span><strong>{p.hero[key]}</strong><button aria-label={'增加'+label} disabled={p.hero.points<1} onClick={()=>p.allocate(key)}>＋</button></div>)}</div>
      <p>可分配 {p.hero.points} 點 · 主角每升一級獲得 5 點</p>
      <dl><div><dt>主角戰鬥力</dt><dd>{p.power(p.hero).toLocaleString()}</dd></div><div className="caravan-total"><dt>總商隊戰鬥力</dt><dd>{total.toLocaleString()}</dd></div><div><dt>持有金</dt><dd>{Math.floor(p.gold).toLocaleString()} 兩</dd></div><div><dt>負重</dt><dd>{p.weight.toFixed(1)} / {p.maxWeight} 斤 {p.weight>p.maxWeight?'（超重）':''}</dd></div></dl>
      <label className="caravan-xp">信用 Lv.{Math.floor(p.credit/100)+1} · {p.credit%100} / 100<progress max={100} value={p.credit%100}/></label>
      <small>每秒 +5 兩、+2 信用；離線最多 8 小時。負重為背包與主角裝備，容量＝40＋力量×5。</small>
      <details><summary>能力與戰力說明</summary><p>力量影響攻擊與負重；敏捷影響攻擊；體質增加生命及防禦；智力增加魔力。戰力沿用現有能力、等級、技能與裝備綜合評分，總商隊戰力包含所有已僱用成員（含候補），出戰战力另依出戰名單計算。此為致敬版自訂平衡，非官方公式。</p></details>
    </aside>
    <section className="caravan-wood caravan-team"><header><small>中央傭兵公會 · 商隊名冊</small><h2>九席護商隊</h2><span>{Math.min(9,p.mercs.length)} / 9 席 · 隨機僱用 {p.cost.toLocaleString()} 兩</span></header>
      <div className="caravan-nine">{Array.from({length:9},(_,index)=>{const unit=p.mercs[index];return unit?<button className="caravan-member" key={unit.uid} onClick={()=>p.select(unit.uid)}><small>第 {index+1} 席</small><img src={unit.image} alt=""/><strong>{unit.name}</strong><span>Lv.{unit.level} · {unit.role}</span><Bars unit={unit}/><em>戰力 {p.power(unit).toLocaleString()}</em></button>:<button className="caravan-empty" key={'empty-'+index} disabled={p.gold<p.cost} onClick={p.hire}><b>＋</b><strong>點擊僱用傭兵</strong><small>{p.gold<p.cost?'資金不足':p.cost.toLocaleString()+' 兩 · 隨機初始傭兵'}</small></button>})}</div>
      <button className="caravan-train" onClick={p.train}>模擬打怪 · 全員獲得 100 經驗</button><p>點選成員查看能力與裝備。經驗按鈕為測試玩法，不扣金錢；跑商途中戰鬥機制保持不變。</p>
      {p.mercs.length>9&&<div>舊存檔候補（保留角色，不再新增）：{p.mercs.slice(9).map(unit=><button key={unit.uid} onClick={()=>p.select(unit.uid)}>{unit.name} Lv.{unit.level}</button>)}</div>}
    </section>
  </section>;
}
