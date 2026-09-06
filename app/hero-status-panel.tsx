/* eslint-disable next/no-img-element */
import {rarityPresentation} from './classic-presentation';
import type { CaravanMember } from './caravan-status';
import { vitalStats,combatStats } from './vitals-engine';
import { heroPersonalPower,heroWeightLimit,heroTotalAttributes } from './hero-rules';
import {DIVINE_EQUIPMENT,HERO_DISPLAY_SLOTS,equipmentDescription,equipmentDetailLines,type TooltipGear} from './divine-equipment';
import {EQUIPMENT_LABELS} from './equipment-slots';
import type {EquipmentSlot} from './equipment-slots';
import {LEVEL_CAP,progressForLevel} from './level-progression';
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip';

/** 無獨立計時器或第二份角色資料：所有操作交回遊戲主狀態，再即時重算畫面。 */
export function HeroStatusPanel({busy=false,compact=false,hero,gold,credit,weight,xpNeed,allocate,trade,train,select,unequip}:{
  busy?:boolean;compact?:boolean;hero:CaravanMember;gold:number;credit:number;weight:number;xpNeed:(level:number)=>number;
  allocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void;trade:()=>void;train:()=>void;select:()=>void;

  unequip:(slot:EquipmentSlot)=>void;
}) {
  const vital=vitalStats(hero);
  const total=heroTotalAttributes(hero);
  const levelData=progressForLevel(hero.level);
  return <aside className={'hero-personal iron-character'+(compact?' compact':'')} aria-label="主角個人面板">
    {!compact&&<header className="hp-title"><span>人物誌</span><strong>角色狀態</strong><span>商</span></header>}
    {!compact&&<button className="hp-identity" onClick={select} title="查看主角八格裝備"><img src={hero.image} alt="主角頭像"/><span><strong>{hero.name}</strong><span>{hero.job||hero.role}</span><small>Lv. {hero.level}</small></span></button>}
    {!compact&&<section className="hp-equipment" aria-label="六格個人裝備"><h3>隨身裝備</h3><TooltipProvider><div className="hp-six-slots">{HERO_DISPLAY_SLOTS.map(slot=>{
      const item=hero.equip[slot] as (TooltipGear & {image?:string})|null;
      const label=slot==='armor'?'衣服':EQUIPMENT_LABELS[slot];
      return <div className="hp-slot-wrap" key={slot}><Tooltip><TooltipTrigger onClick={()=>{if(item)unequip(slot)}} className={'hp-gear-slot'+(item?' filled '+rarityPresentation(item.rarity).className:'')} aria-label={label+'：'+(item?.name||'未裝備')}><span>{item?(item.image?<img src={item.image} alt=""/>:item.name===DIVINE_EQUIPMENT.staff.name?'杖':{weapon:'兵',helm:'盔',armor:'甲',ring1:'戒',ring2:'戒',boots:'靴'}[slot]):label}</span></TooltipTrigger>{item&&<TooltipContent className={"hp-gear-tooltip "+rarityPresentation(item.rarity).className}><strong>{item.name}</strong><span className="rarity-caption">{rarityPresentation(item.rarity).label}</span>{equipmentDetailLines(item).map((line,index)=><span key={index}>{line}</span>)}<em>{equipmentDescription(item)}</em></TooltipContent>}</Tooltip><small>{label}</small></div>;
    })}</div></TooltipProvider><small>懸停或鍵盤聚焦查看加成；手套、護身符保留於下方完整裝備區。</small></section>}
    <section className="hp-indicators">
      <div className="hp-power"><span>總戰鬥力 <small>（主角）</small></span><strong>{heroPersonalPower(hero).toLocaleString()}</strong></div>
      <label className="hp-meter">信用 Lv. {Math.floor(credit/100)+1}<span>{credit%100} / 100</span><progress className="jade" max={100} value={credit%100}/></label>
      <p className="hp-gold">持有金：{Math.floor(gold).toLocaleString()} 兩</p>
      <p className="hp-weight">負重能力 <span>{weight.toFixed(1)} / {heroWeightLimit(hero)} 斤{weight>heroWeightLimit(hero)?' · 超重':''}</span></p>
    </section>
    {!compact&&<section className="hp-allocation"><p>剩餘屬性點 <strong>{hero.points}</strong></p>
      {([['str','力量','Str'],['agi','敏捷','Dex'],['vit','體質','Vit'],['intel','智力','Int']] as const).map(([key,name,en])=><div className="hp-stat" key={key}><span>{name} <small>{en}</small></span><small>{hero[key]} ＋ {total[key]-hero[key]}</small><strong>{total[key]}</strong><button aria-label={'增加'+name} disabled={hero.points<=0} onClick={()=>allocate(key)}>＋</button><button aria-label={'增加100點'+name} disabled={hero.points<100} onClick={()=>allocate(key,100)}>＋100</button></div>)}
      <p className="hp-defense">防禦力 <strong>{combatStats(hero).defense}</strong><small>四圍顯示：基礎＋裝備＝總值</small></p>
      <div className="hp-vitals">{(['hp','mp'] as const).map(key=>{const max=key==='hp'?vital.maxHp:vital.maxMp;return <label className="hp-meter" key={key}>{key==='hp'?'生命值 HP':'魔法值 MP'}<span>{vital[key]} / {max}</span><progress className={key} max={max} value={vital[key]}/></label>})}</div>
      <label className="hp-meter hp-exp">EXP<span>{hero.level>=LEVEL_CAP?'已達 Lv.260':`${hero.xp.toLocaleString()} / ${xpNeed(hero.level).toLocaleString()}`}</span>{hero.level<LEVEL_CAP&&<progress max={xpNeed(hero.level)} value={hero.xp}/>}</label>
      <p className="hp-defense">巨商信用度 <strong>{levelData.totalCredit.toLocaleString()}</strong><small>本級 +{levelData.credit}｜累積經驗 {levelData.totalXp.toLocaleString()}</small></p>
    </section>}
    <footer className="hp-actions"><button disabled={busy} onClick={trade} title="獲得 100 兩與 25 信用">模擬經商（賺錢／加信用）</button><button disabled={busy} onClick={train} title="100 經驗與 50% 神裝掉落">模擬打怪（經驗／50% 掉寶）</button><small>掛機每秒 +10 兩 · +5 信用（療傷期間暫停）</small></footer>
  </aside>;
}
