import {DUNGEONS,WORLD_ZONES,isBossMonster,zoneFor,zoneUnlocked,zoneRequirement,type ZoneId,type DungeonState,type DungeonKey} from './dungeon-engine';
import type {ReactNode} from 'react';
import {battleLogPresentation} from './classic-presentation';
import {Button} from '@/components/ui/button';
import type {CaravanMember} from './caravan-status';
import {BattleArena} from './battle-arena';
import {gersangWorldMap,type GersangNationId} from './gersang-world-map';
/** 不另外快取解鎖布林值：升級、配點、穿脫裝備引發重繪時，立即用新數值判斷。 */
export function WorldMapNavigation({state,level,power,travel}:{state:DungeonState;level:number;power:number;travel:(id:ZoneId)=>void}){
 return <nav className="world-zone-nav" aria-label="大商帝國地域傳送（地圖選擇）">
 <header><h2>大商帝國地域傳送 <small>地圖選擇</small></h2><span>主角 Lv.{level} · 戰鬥力 {power.toLocaleString()}</span></header>
 <div className="gersang-region-grid">{Object.values(gersangWorldMap).map(region=><section key={region.id} className={'gersang-region region-'+region.id}>
  <div className="gersang-region-heading"><strong>{region.name}</strong><span>核心城市：{region.cities.map(city=>city.name).join('・')}</span></div>
  <div className="world-zone-buttons">{region.stages.map(stage=>{
   const zone=WORLD_ZONES.find(entry=>entry.name===stage.name&&entry.nation===region.id as GersangNationId);
   if(!zone)return null;
   const locked=!zoneUnlocked(zone,level,power),selected=zone.id===zoneFor(state.zone).id;
   return <Button key={zone.id} className="world-zone-button" aria-pressed={selected} disabled={locked||state.status==='recovering'} onClick={()=>travel(zone.id)}>
    <strong>{locked?'鎖定 · ':selected?'目前 · ':''}{zone.name}</strong><span>{zoneRequirement(zone)}</span><small>{stage.type==='dungeon'?'迷宮':'掛機點'} · {stage.monster.name} HP {stage.monster.hp.toLocaleString()}</small><small>掉落：{stage.monster.drops.map(drop=>drop.item+' '+drop.rate+'%').join('、')}</small>
   </Button>;
  })}</div>
 </section>)}</div><p>{state.status==='recovering'?'漢陽客棧療傷中，HP 回滿後可再次傳送。':'點選已解鎖關卡立即傳送並開戰；可在戰鬥區停止狩獵以保留當前狀態，之後再按「開始狩獵」繼續。'}</p>
 </nav>;
}
export function DungeonPanel({state,hero,party,dps=0,act,autoSkill,toggleAutoSkill,mapName,mapRegion,medicineQuickbar}:{state:DungeonState;mp:number;hero:CaravanMember;party:CaravanMember[];dps?:number;act:(action:'start'|'normal'|'skill'|'retreat'|'stop',key?:DungeonKey)=>void;autoSkill:boolean;toggleAutoSkill:()=>void;mapName?:string;mapRegion?:string;medicineQuickbar?:ReactNode}){
 const monster=DUNGEONS[state.key],boss=isBossMonster(monster.name),enemyCount=state.realtime?.enemies.length??state.enemyCount??0,zone=zoneFor(state.zone),active=state.status==='fighting'&&state.phase==='交戰';
 const enemyMaxHp=state.realtime?.enemies.reduce((sum,unit)=>sum+unit.maxHp,0)??monster.hp*enemyCount;
 const liveLogs=state.logs.filter(line=>/施放|造成|受到|攻擊|技能|暴擊/.test(line)).slice(0,4);
 return <section className="dungeon-panel" aria-label="動態戰鬥">
 <header className="dungeon-command-header"><div><small>{mapRegion ? mapRegion+' · 戰鬥地圖同步' : zone.mood}</small><h2>{mapName || zone.name}</h2></div><span className={'dungeon-status dungeon-status-'+state.status}>{{idle:'整裝待發',fighting:'交鋒中',respawning:'等待下一隻',recovering:'漢陽療傷中'}[state.status]}</span></header>
 <div className="dungeon-summary" aria-label="戰鬥摘要"><span><small>目前目標</small><strong>{monster.name}</strong></span><span><small>商隊 DPS</small><strong>{dps.toLocaleString()}</strong></span><span><small>掉落加成</small><strong>{monster.drop*100}%</strong></span></div>
 <div className="battle-phase" aria-live="polite"><span><small>我方・{party.length} 名</small><strong>{state.realtime?.players.filter(unit=>unit.hp>0).length??party.filter(unit=>(unit.hp||0)>0).length} 名存活</strong></span><span><small>敵方・{enemyCount?`${boss?'首領・':''}${enemyCount} 隻${monster.name}`:'等待遭遇'}</small><strong>{enemyCount?`HP ${Math.max(0,state.enemyHp).toLocaleString()} / ${enemyMaxHp.toLocaleString()}`:'尚未交戰'}</strong></span><span><small>戰況</small><strong>{state.status==='fighting'?(boss?'首領單體即時交戰':`${party.length} 對 ${enemyCount} 即時交戰`):state.status==='respawning'?(boss?'首領重新出現中':'敵方整隊重生中'):state.status==='recovering'?'返回療傷':'待命'}</strong></span><div><i style={{width:(100-(state.distance??100))+'%'}}/></div></div>
 <div className="battle-live-feed" aria-label="即時戰鬥資訊" aria-live="polite"><strong>即時戰鬥資訊</strong>{liveLogs.length?liveLogs.map((line,index)=><span key={state.serial+'-'+index+'-'+line}>{line}</span>):<span>等待敵我行動……</span>}</div>
 {state.key==='e_white_tiger_fierce_tiger'&&<div className="boss-skill-hud" aria-label="狂虎技能"><strong>狂虎技能</strong><span><b>暴君風吼嘯</b><small>{state.status==='fighting' ? `MP ${Math.max(0,state.tigerMp||0).toLocaleString()}・${Math.max(0,Math.ceil(((state.tigerHowlAt||state.stamp)-state.stamp)/1000))} 秒後可用` : '等待狂虎重生'}</small></span><span className={state.tigerRageActive?'active':''}><b>白虎凶煞</b><small>{state.tigerRageActive?'已啟動・攻速與移速 +300%':'HP ≤ 40% 時啟動'}</small></span></div>}
 <BattleArena state={state} hero={hero} party={party}/>
 {medicineQuickbar}
 <output className={'dungeon-flash'+(state.logs[0]?.startsWith('🎁')?' dungeon-loot-flash':'')} key={state.serial+'-'+state.logs[0]}>{state.logs[0]||'選擇對手，開始自動戰鬥。'}</output>
 <div className="dungeon-auto-skill"><span><strong>滿 MP 自動技能</strong><small>每次普攻 +20 MP；達到 100 MP 後於下次個人攻擊時施放</small></span><button type="button" role="switch" aria-checked={autoSkill} className={autoSkill?'enabled':''} onClick={toggleAutoSkill}>{autoSkill?'開啟':'關閉'}</button></div>
 <div className="dungeon-actions realtime-actions"><span>{state.status==='idle'?'狩獵停止時不會推進戰鬥；開始後會自動連續狩獵。':'每名角色依自己的攻速冷卻自動鎖敵；停止狩獵會保留目前血量。'}</span><button type="button" disabled={state.status==='recovering'} onClick={()=>act(state.status==='fighting'||state.status==='respawning'?'stop':'start',state.key)}>{state.status==='recovering'?'客棧療傷中':state.status==='idle'?'開始狩獵':'停止狩獵'}</button><button type="button" disabled={!active&&state.status!=='respawning'} onClick={()=>act('retreat')}>{state.status==='recovering'?'客棧療傷中':'撤退至客棧'}</button></div>
 <details className="dungeon-notes" open><summary>戰鬥規則</summary><p>前排輸出 +20%，後排受擊有 50% 閃避；全員倒下才會撤回客棧。</p>{state.key==='e_white_tiger_fierce_tiger'&&<><p><strong>狂虎・暴君風吼嘯：</strong>消耗 5,000 MP，冷卻 12 秒；造成自身攻擊力 320% 的風屬性物理傷害，擊退並吸取 15% 當前 MP，移速 -40% 持續 5 秒。</p><p><strong>白虎凶煞：</strong>常駐打擊／魔法抗性 +15%；生命低於 40% 時攻速／移速 +300%，近身攻擊 25% 機率附加 3 秒撕裂。</p></>}{state.key.startsWith('e_white_tiger_')&&<p>野獸的領地：攜帶超過 5 隻傭兵時，全體怪物 HP、MP、ATK、物防、魔防與技能傷害 ×2。</p>}</details>
 <details className="dungeon-journal"><summary>戰鬥日誌 · 最近 30 則</summary><ol className="dungeon-log">{state.logs.slice(0,30).map((line,i)=><li key={i} className={battleLogPresentation(line).className}><span className="classic-log-label">{battleLogPresentation(line).label}</span>{line}</li>)}</ol></details>
 </section>;
}
