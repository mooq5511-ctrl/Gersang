/* 角色圖像包含資料網址與舊存檔路徑，無法交由框架圖片載入器安全轉換。 */
/* eslint-disable next/no-img-element */
import {useEffect,useRef} from 'react';
import {Progress} from '@/components/ui/progress';
import {DUNGEONS,type DungeonState} from './dungeon-engine';
import {vitalStats} from './vitals-engine';
import type {CaravanMember} from './caravan-status';
import {createBattleEffects} from './battle-effects';
import {Shield} from 'lucide-react';

/** 主角卡片讀取現有角色，沒有第二份 HP/MP；特效事件序號防止重繪重播。 */
export function BattleArena({state,hero}:{state:DungeonState;hero:CaravanMember & {nation?:string}}){
 const root=useRef<HTMLDivElement>(null),effects=useRef<ReturnType<typeof createBattleEffects>|null>(null);
 const seen=useRef(state.eventSerial||0),spawn=useRef(state.spawnSerial||0);
 useEffect(()=>{if(!root.current)return;effects.current=createBattleEffects(root.current);return()=>{effects.current?.clear();effects.current=null}},[]);
 useEffect(()=>{
  if(spawn.current!==(state.spawnSerial||0)){effects.current?.spawn();spawn.current=state.spawnSerial||0}
  for(const event of state.events||[])if(event.id>seen.current){effects.current?.triggerBattleAnimation({attacker:event.attacker,target:event.target,damage:event.amount,skill:event.skill,critical:event.critical});seen.current=event.id}
 },[state.events,state.spawnSerial]);
 const v=vitalStats(hero),monster=DUNGEONS[state.key],shieldActive=monster.name==='狂風阿魯塔'&&(state.enemyShieldUntil||0)>Date.now(),shieldSeconds=shieldActive?Math.max(1,Math.ceil(((state.enemyShieldUntil||0)-Date.now())/1000)):0,skillInfo=monster.name==='狂風阿魯塔'?'白虎盾：消耗 500 MP，防禦 +30%，持續 3 秒，冷卻 60 秒。\n風碎：消耗 500 MP，無視防禦造成 2000 傷害，冷卻 30 秒。':monster.name==='黃金海星'?'恢復術：恢復自身 150% ATK 生命，並獲得每秒 0.5% 最大生命值的持續療癒，持續 3 秒，冷卻 60 秒。\n火焰燎原（被動）：每次攻擊有 30% 機率觸發，全體造成 180% 火屬性魔法傷害並施加灼燒 6 秒（每秒 15% ATK，可疊 3 層）；灼燒目標暴擊率 +15%。\n詛咒：攻擊力最高目標 ATK -25%、DEF -30%，持續 8 秒；受詛咒目標承傷 +15%，冷卻 60 秒。':('skill' in monster&&monster.skill?monster.skill:'');
 const monsterArt:Record<string,string>={狸貓:'/assets/sprites/newbie-raccoon-v1.png',倭寇:'/assets/characters/char_049_pirate_skeleton_bow_R.png',鐵炮倭寇:'/assets/characters/char_053_pirate_skeleton_cannon_R.png',山賊:'/assets/characters/char_056_pirate_skeleton_captain_N.png',海賊:'/assets/characters/char_057_pirate_skeleton_captain_R.png',鐵鉤海賊:'/assets/characters/char_055_pirate_skeleton_captain_D.png',赤賊:'/assets/characters/char_054_pirate_skeleton_captain_A.png',巫女:'/assets/characters/char_052_pirate_skeleton_cannon_N.png',司令武女:'/assets/characters/char_052_pirate_skeleton_cannon_N.png','詭異的小販':'/assets/characters/char_054_pirate_skeleton_captain_A.png','詭異的獨角鬼(火)':'/assets/characters/char_057_pirate_skeleton_captain_R.png','詭異的獨角鬼(水)':'/assets/characters/char_049_pirate_skeleton_bow_R.png','詭異的獨角鬼(雷)':'/assets/characters/char_053_pirate_skeleton_cannon_R.png','詭異的獨角鬼(風)':'/assets/characters/char_056_pirate_skeleton_captain_N.png',阿魯塔:'/assets/characters/char_055_pirate_skeleton_captain_D.png','死靈武女(強)':'/assets/characters/char_052_pirate_skeleton_cannon_N.png','巫女(強)':'/assets/characters/char_052_pirate_skeleton_cannon_N.png',神漢男巫:'/assets/characters/char_049_pirate_skeleton_bow_R.png',邪靈巫師:'/assets/characters/char_053_pirate_skeleton_cannon_N.png',赤賊頭目:'/assets/characters/char_054_pirate_skeleton_captain_A.png',狂風阿魯塔:'/assets/monsters/gale-altur.gif',黃金海星:'/assets/monsters/golden-starfish.gif'};
 return <div className={'impact-stage'+(state.status==='fighting'?' impact-stage-fighting':'')} ref={root} aria-label="主角與怪物交鋒">
 <span className="impact-versus" aria-hidden="true">對決</span>
 <div className="impact-wrap"><div className="impact-card" data-hit="hero"><div data-motion="hero">
<div className="impact-portrait impact-sprite impact-sprite-hero" data-sprite="hero" data-nation={hero.nation||'korea'}><img src={hero.image} alt={hero.name}/></div><h3>{hero.name}</h3><p>Lv.{hero.level}</p>
 <label>HP {v.hp} / {v.maxHp}<Progress className="dungeon-hp" value={v.hp/v.maxHp*100} aria-label="主角生命值"/></label>
 <label>MP {v.mp} / {v.maxMp}<Progress className="dungeon-mp" value={v.mp/v.maxMp*100} aria-label="主角魔法值"/></label>
 </div><div className="impact-overlay" data-popup="hero"/></div></div>
 <div className={'impact-wrap'+(state.status==='respawning'?' impact-dead':'')} data-spawn="enemy"><div className="impact-card" data-hit="enemy"><div data-motion="enemy">
<span className="impact-seal impact-sprite impact-sprite-enemy" data-sprite="enemy" data-monster={monster.name}><img src={monsterArt[monster.name]||'/assets/sprites/enemy-idle.png'} alt=""/>{shieldActive&&<span className="enemy-status-icon enemy-status-shield" title={`白虎盾・防禦 +30%・剩餘 ${shieldSeconds} 秒`} aria-label={`白虎盾，防禦提升 30%，剩餘 ${shieldSeconds} 秒`}><Shield size={16}/><small>{shieldSeconds}s</small></span>}</span><h3>{monster.name}</h3><p>Lv.{monster.level} · 攻擊 {monster.atk}</p>{skillInfo&&<><p className="enemy-skill-label" title={skillInfo}>技能：{skillInfo.split('：')[0]} ⓘ</p><details className="enemy-skill-details"><summary>技能資訊</summary>{skillInfo.split('\n').map((line,index)=><span key={index}>{line}</span>)}</details></>}
 {(state.zone==='miasma-forest'||String(state.key||'').startsWith('e_white_tiger_'))&&<p className="zone-rule">野獸的領地：超過 5 隻傭兵出戰時，怪物 HP、MP、ATK、防禦與技能傷害 ×2</p>}
 <label>HP {state.enemyHp} / {monster.hp}<Progress className="dungeon-hp" value={state.enemyHp/monster.hp*100} aria-label="怪物生命值"/></label>
 <label>MP {monster.mp} / {monster.mp}<Progress className="dungeon-mp" value={monster.mp?100:0} aria-label="怪物魔法值"/></label>
 </div><div className="impact-overlay" data-popup="enemy"/></div></div>
 </div>;
}
