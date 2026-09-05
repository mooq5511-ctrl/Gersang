/* 角色圖像包含資料網址與舊存檔路徑，無法交由框架圖片載入器安全轉換。 */
/* eslint-disable next/no-img-element */
import {useEffect,useRef} from 'react';
import {Progress} from '@/components/ui/progress';
import {DUNGEONS,type DungeonState} from './dungeon-engine';
import {vitalStats} from './vitals-engine';
import type {CaravanMember} from './caravan-status';
import {createBattleEffects} from './battle-effects';

/** 主角卡片讀取現有角色，沒有第二份 HP/MP；特效事件序號防止重繪重播。 */
export function BattleArena({state,hero}:{state:DungeonState;hero:CaravanMember & {nation?:string}}){
 const root=useRef<HTMLDivElement>(null),effects=useRef<ReturnType<typeof createBattleEffects>|null>(null);
 const seen=useRef(state.eventSerial||0),spawn=useRef(state.spawnSerial||0);
 useEffect(()=>{if(!root.current)return;effects.current=createBattleEffects(root.current);return()=>{effects.current?.clear();effects.current=null}},[]);
 useEffect(()=>{
  if(spawn.current!==(state.spawnSerial||0)){effects.current?.spawn();spawn.current=state.spawnSerial||0}
  for(const event of state.events||[])if(event.id>seen.current){effects.current?.triggerBattleAnimation({attacker:event.attacker,target:event.target,damage:event.amount,skill:event.skill,critical:event.critical});seen.current=event.id}
 },[state.events,state.spawnSerial]);
 const v=vitalStats(hero),monster=DUNGEONS[state.key];
 return <div className={'impact-stage'+(state.status==='fighting'?' impact-stage-fighting':'')} ref={root} aria-label="主角與怪物交鋒">
 <span className="impact-versus" aria-hidden="true">對決</span>
 <div className="impact-wrap"><div className="impact-card" data-hit="hero"><div data-motion="hero">
<div className="impact-portrait impact-sprite impact-sprite-hero" data-sprite="hero" data-nation={hero.nation||'korea'} role="img" aria-label={hero.name}><img src={hero.image} alt=""/></div><h3>{hero.name}</h3><p>Lv.{hero.level}</p>
 <label>HP {v.hp} / {v.maxHp}<Progress className="dungeon-hp" value={v.hp/v.maxHp*100} aria-label="主角生命值"/></label>
 <label>MP {v.mp} / {v.maxMp}<Progress className="dungeon-mp" value={v.mp/v.maxMp*100} aria-label="主角魔法值"/></label>
 </div><div className="impact-overlay" data-popup="hero"/></div></div>
 <div className={'impact-wrap'+(state.status==='respawning'?' impact-dead':'')} data-spawn="enemy"><div className="impact-card" data-hit="enemy"><div data-motion="enemy">
<span className="impact-seal impact-sprite impact-sprite-enemy" data-sprite="enemy" aria-hidden="true">{monster.name.slice(0,1)}</span><h3>{monster.name}</h3><p>Lv.{monster.level} · 攻擊 {monster.atk}</p>
 <label>HP {state.enemyHp} / {monster.hp}<Progress className="dungeon-hp" value={state.enemyHp/monster.hp*100} aria-label="怪物生命值"/></label>
 <label>MP {monster.mp} / {monster.mp}<Progress className="dungeon-mp" value={monster.mp?100:0} aria-label="怪物魔法值"/></label>
 </div><div className="impact-overlay" data-popup="enemy"/></div></div>
 </div>;
}
