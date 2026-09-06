import {DUNGEONS,WORLD_ZONES,zoneFor,zoneUnlocked,zoneRequirement,type ZoneId,type DungeonState,type DungeonKey} from './dungeon-engine';
import {battleLogPresentation} from './classic-presentation';
import {Button} from '@/components/ui/button';
import type {CaravanMember} from './caravan-status';
import {BattleArena} from './battle-arena';
import {ECOLOGY_POOLS} from './monster-ecology';
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
 </section>)}</div><p>{state.status==='recovering'?'漢陽客棧療傷中，HP 回滿後可再次傳送。':'點選已解鎖關卡立即傳送並開戰；原戰鬥中止，HP / MP 與技能冷卻保留。'}</p>
 </nav>;
}
export function DungeonPanel({state,mp,hero,dps=0,act,mapName,mapRegion}:{state:DungeonState;mp:number;hero:CaravanMember;dps?:number;act:(action:'start'|'normal'|'skill'|'retreat',key?:DungeonKey)=>void;mapName?:string;mapRegion?:string}){
 const monster=DUNGEONS[state.key],zone=zoneFor(state.zone),active=state.status==='fighting'&&state.phase==='交戰',cooldown=Math.max(0,Math.ceil((state.skillAt-state.stamp)/1000));
 const ecology=ECOLOGY_POOLS[zone.id].map(key=>DUNGEONS[key].name+' Lv.'+DUNGEONS[key].level).join(' ／ ');
 return <section className="dungeon-panel" aria-label="動態戰鬥">
 <header><small>{mapRegion ? mapRegion+' · 戰鬥地圖同步' : zone.mood}</small><h2>{mapName || zone.name}</h2><span>{{idle:'整裝待發',fighting:'交鋒中',respawning:'等待下一隻',recovering:'漢陽療傷中'}[state.status]}</span></header>
 <p className="dungeon-help">地域掉寶 {monster.drop*100}% · {zone.loot} · 商隊自動 DPS {dps}</p>
 <p className="impact-ecology">本地怪物：{ecology}</p>
 <div className="battle-phase" aria-live="polite"><span>戰鬥階段：<strong>{state.status==='fighting'?(state.phase||'接敵'):state.status==='respawning'?'整隊':'待命'}</strong></span><span>敵我距離 {state.distance??100} / 100</span><div><i style={{width:(100-(state.distance??100))+'%'}}/></div></div>
 <BattleArena state={state} hero={hero}/>
 <output className={'dungeon-flash'+(state.logs[0]?.startsWith('🎁')?' dungeon-loot-flash':'')} key={state.serial+'-'+state.logs[0]}>{state.logs[0]||'選擇對手，開始自動戰鬥。'}</output>
 <div className="dungeon-actions"><button disabled={!active||state.normalAt>state.stamp} onClick={()=>act('normal')}>普通攻擊<small>無消耗 · 共用自動攻擊冷卻</small></button><button disabled={!active||mp<40||cooldown>0} onClick={()=>act('skill')}>蛇龍出水<small>{mp<40?'MP 不足':cooldown?'冷卻 '+cooldown+' 秒':'40 MP · 冷卻 3 秒'}</small></button><button disabled={!active&&state.status!=='respawning'} onClick={()=>act('retreat')}>{state.status==='recovering'?'客棧療傷中':'撤退至客棧'}</button></div>
 <p className="dungeon-help">部隊先推進接敵，再按前排 → 中排 → 後排承傷；前排輸出 +20%，後排受擊有 50% 閃避。全員倒下才會撤回客棧。勝利後 0.5 秒刷新本地怪物。</p>
 <details open><summary>戰鬥日誌 · 最近 30 則</summary><ol className="dungeon-log">{state.logs.slice(0,30).map((line,i)=><li key={i} className={battleLogPresentation(line).className}><span className="classic-log-label">{battleLogPresentation(line).label}</span>{line}</li>)}</ol></details>
 </section>;
}
