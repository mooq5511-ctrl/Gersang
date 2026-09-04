import {DUNGEONS,WORLD_ZONES,zoneFor,zoneUnlocked,zoneRequirement,type ZoneId,type DungeonState,type DungeonKey} from './dungeon-engine';
import {battleLogPresentation} from './classic-presentation';
import {Button} from '@/components/ui/button';
import type {CaravanMember} from './caravan-status';
import {BattleArena} from './battle-arena';
import {ECOLOGY_POOLS} from './monster-ecology';
/** 不另外快取解鎖布林值：升級、配點、穿脫裝備引發重繪時，立即用新數值判斷。 */
export function WorldMapNavigation({state,level,power,travel}:{state:DungeonState;level:number;power:number;travel:(id:ZoneId)=>void}){
 return <nav className="world-zone-nav" aria-label="大商帝國地域傳送（地圖選擇）">
 <header><h2>大商帝國地域傳送 <small>地圖選擇</small></h2><span>主角 Lv.{level} · 戰鬥力 {power.toLocaleString()}</span></header>
 <div className="world-zone-buttons">{WORLD_ZONES.map(zone=>{
  const locked=!zoneUnlocked(zone,level,power),selected=zone.id===zoneFor(state.zone).id;
  return <Button key={zone.id} className="world-zone-button" aria-pressed={selected} disabled={locked||state.status==='recovering'} onClick={()=>travel(zone.id)}>
   <strong>{locked?'鎖定 · ':selected?'目前 · ':''}{zone.name}</strong><span>{zoneRequirement(zone)}</span><small>{zone.mood}</small>
  </Button>;
 })}</div><p>{state.status==='recovering'?'漢陽客棧療傷中，HP 回滿後可再次傳送。':'點選已解鎖地域立即傳送並開戰；原戰鬥中止，HP / MP 與技能冷卻保留。'}</p>
 </nav>;
}
export function DungeonPanel({state,mp,hero,act}:{state:DungeonState;mp:number;hero:CaravanMember;act:(action:'start'|'normal'|'skill'|'retreat',key?:DungeonKey)=>void}){
 const monster=DUNGEONS[state.key],zone=zoneFor(state.zone),active=state.status==='fighting',cooldown=Math.max(0,Math.ceil((state.skillAt-state.stamp)/1000));
 const ecology=ECOLOGY_POOLS[zone.id].map(key=>DUNGEONS[key].name+' Lv.'+DUNGEONS[key].level).join(' ／ ');
 return <section className="dungeon-panel" aria-label="動態戰鬥">
 <header><small>{zone.mood}</small><h2>{zone.name}</h2><span>{{idle:'整裝待發',fighting:'交鋒中',respawning:'等待下一隻',recovering:'漢陽療傷中'}[state.status]}</span></header>
 <p className="dungeon-help">地域掉寶 {monster.drop*100}% · {zone.loot}</p>
 <p className="impact-ecology">本地怪物：{ecology}</p>
 <BattleArena state={state} hero={hero}/>
 <output className="dungeon-flash" key={state.logs[0]}>{state.logs[0]||'選擇對手，開始自動戰鬥。'}</output>
 <div className="dungeon-actions"><button disabled={!active||state.normalAt>state.stamp} onClick={()=>act('normal')}>普通攻擊<small>無消耗 · 共用自動攻擊冷卻</small></button><button disabled={!active||mp<40||cooldown>0} onClick={()=>act('skill')}>蛇龍出水<small>{mp<40?'MP 不足':cooldown?'冷卻 '+cooldown+' 秒':'40 MP · 冷卻 3 秒'}</small></button><button disabled={!active&&state.status!=='respawning'} onClick={()=>act('retreat')}>{state.status==='recovering'?'客棧療傷中':'撤退至客棧'}</button></div>
 <p className="dungeon-help">每秒交鋒，敏捷高者先攻。神仙棒使蛇龍出水傷害加倍。副本期間航程暫停；勝利後 0.5 秒隨機刷新本地怪物，療傷停止收益。</p>
 <details open><summary>戰鬥日誌 · 最近 30 則</summary><ol className="dungeon-log">{state.logs.slice(0,30).map((line,i)=><li key={i} className={battleLogPresentation(line).className}><span className="classic-log-label">{battleLogPresentation(line).label}</span>{line}</li>)}</ol></details>
 </section>;
}
