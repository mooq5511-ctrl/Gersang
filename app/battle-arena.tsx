/* eslint-disable next/no-img-element */
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {DUNGEONS,isBossMonster,type DungeonState,type RealtimeBattleEventState,type RealtimeBattleUnitState} from './dungeon-engine';
import {vitalStats} from './vitals-engine';
import type {CaravanMember} from './caravan-status';
import {Flame,Frown,Shield,Skull} from 'lucide-react';
import {BATTLE_MONSTER_CROP,battleMonsterImage} from './battle-visual-data';
import {BATTLE_SCENE_HEIGHT,BATTLE_SCENE_WIDTH,calculateBattleScale} from './battle-viewport';

/** 3 × 4 邏輯陣型轉換成 900 × 500 戰場座標。 */
export function gridToPixel(side:'player'|'enemy',row:number,col:number){return{x:side==='player'?75+col*88:561+col*88,y:120+row*145}}
function findUnit(root:HTMLElement,id?:string){return id?Array.from(root.querySelectorAll<HTMLElement>('[data-unit-id]')).find(node=>node.dataset.unitId===id)||null:null}
function restartAnimation(node:HTMLElement|null,className:string){if(!node)return;node.classList.remove(className);void node.offsetWidth;node.classList.add(className);const finish=()=>node.classList.remove(className);node.addEventListener('animationend',finish,{once:true});setTimeout(finish,650)}
function effectUntil(unit:RealtimeBattleUnitState|undefined,key:string){const effects=unit?.mercenaryState?.effects;if(!effects||typeof effects!=='object')return 0;const effect=(effects as Record<string,unknown>)[key];return effect&&typeof effect==='object'&&'until' in effect&&typeof effect.until==='number'?effect.until:0}
type UnitStatus={kind:'shield'|'fear'|'curse'|'burn'|'poison'|'control';label:string;title:string}
/** Converts serialized realtime effects into compact, always-visible battle-stage badges. */
export function battleUnitStatuses(unit:RealtimeBattleUnitState,timeMs:number):UnitStatus[]{
 const state=unit.mercenaryState||{},effects=state.effects&&typeof state.effects==='object'?state.effects as Record<string,unknown>:{},active=(key:string)=>effectUntil(unit,key)>timeMs;
 const shield=typeof state.shield==='number'?state.shield:0,shieldUntil=typeof state.shieldUntil==='number'?state.shieldUntil:0;
 const statuses:UnitStatus[]=[];
 if(shield>0&&shieldUntil>timeMs)statuses.push({kind:'shield',label:'盾',title:`護盾・吸收 ${Math.floor(shield)} 傷害`});
 if(active('bossShield'))statuses.push({kind:'shield',label:'甲',title:'首領護甲・防禦提升'});
 if(active('amaterasuFearDefense'))statuses.push({kind:'fear',label:'懼',title:'恐懼・防禦降低'});
 if(active('bossCurseAttack')||active('bossCurseDefense')||active('bossCurseVulnerability'))statuses.push({kind:'curse',label:'咒',title:'詛咒・攻擊、防禦或承傷受影響'});
 if(active('bossBurn')){const entry=effects.bossBurn as {value?:unknown};const stacks=typeof entry?.value==='number'?Math.max(1,Math.floor(entry.value)):1;statuses.push({kind:'burn',label:`燒${stacks}`,title:`灼燒・${stacks} 層`})}
 if(active('poison'))statuses.push({kind:'poison',label:'毒',title:'中毒・行動時持續扣血'});
 if(active('stun')||active('root')||active('blind')||active('slow'))statuses.push({kind:'control',label:'控',title:active('stun')?'暈眩':active('root')?'定身':active('blind')?'致盲':'減速'});
 return statuses;
}
function playEventLog(root:HTMLElement,event:RealtimeBattleEventState){
 if(event.type==='attack')restartAnimation(findUnit(root,event.actorId),'realtime-unit-attacking');
 if(event.type==='damage')restartAnimation(findUnit(root,event.targetId),'realtime-unit-hit');
 if(event.type==='death')findUnit(root,event.targetId)?.classList.add('realtime-unit-dead');
}

function UnitSprite({unit,name,level,image,timeMs,boss=false,tiger=false,theater=false,formationPosition}:{unit:RealtimeBattleUnitState;name:string;level:number;image:string;timeMs:number;boss?:boolean;tiger?:boolean;theater?:boolean;formationPosition?:CaravanMember['position']}){
 const resolvedImage=tiger?battleMonsterImage('狂虎')+'?v=20260910':image,crop=BATTLE_MONSTER_CROP[name];
 const point=theater?null:gridToPixel(unit.side,unit.position.row,unit.position.col),hp=Math.max(0,unit.hp),hpRate=Math.max(0,Math.min(100,hp/unit.maxHp*100)),statuses=battleUnitStatuses(unit,timeMs),formationClass=formationPosition==='前排'?'front':formationPosition==='中排'?'middle':formationPosition==='後排'?'rear':'';
 const [tailHpRate,setTailHpRate]=useState(hpRate),[damagePopups,setDamagePopups]=useState<{id:number;amount:number;type:'damage'|'heal'}[]>([]),previousHp=useRef(hp),previousHpRate=useRef(hpRate),tailTimer=useRef<ReturnType<typeof setTimeout>|null>(null),popupId=useRef(0);
 useEffect(()=>{const delta=hp-previousHp.current;if(delta!==0)setDamagePopups(previous=>[...previous.slice(-5),{id:++popupId.current,amount:Math.abs(delta),type:delta>0?'heal':'damage'}]);previousHp.current=hp},[hp]);
 useEffect(()=>{if(tailTimer.current)clearTimeout(tailTimer.current);if(hpRate>=previousHpRate.current)setTailHpRate(hpRate);else tailTimer.current=setTimeout(()=>setTailHpRate(hpRate),380);previousHpRate.current=hpRate;return()=>{if(tailTimer.current)clearTimeout(tailTimer.current)}},[hpRate]);
 return <article className={'realtime-unit '+unit.side+(boss?' realtime-unit-boss':'')+(theater?' realtime-unit-theater':'')+(hp<=0?' realtime-unit-dead':'')} data-unit-id={unit.id} style={point?{left:point.x,top:point.y}:undefined} aria-label={`${boss?'首領 ':''}${name}${formationPosition?`，${formationPosition}`:''}，生命 ${hp} / ${unit.maxHp}`}>
  <div className="realtime-unit-bars"><span className="realtime-hp"><i className="realtime-hp-tail" style={{width:tailHpRate+'%'}}/><i className="realtime-hp-now" style={{width:hpRate+'%'}}/></span><span className="realtime-mp"><i style={{width:Math.max(0,Math.min(100,unit.mp))+'%'}}/></span></div>
  {damagePopups.map(popup=><b key={popup.id} className={popup.type==='heal'?'realtime-floating-damage realtime-floating-heal':'realtime-floating-damage '+(unit.side==='enemy'?'enemy-damage':'player-damage')} onAnimationEnd={()=>setDamagePopups(previous=>previous.filter(item=>item.id!==popup.id))}>{popup.type==='heal'?'+':'-'}{popup.amount.toLocaleString()}</b>)}
  <span className="realtime-portrait" style={{backgroundImage:`url(${resolvedImage})`,backgroundSize:crop?.size||'contain',backgroundRepeat:'no-repeat',backgroundPosition:crop?.position||'center'}}>{!crop&&<img key={resolvedImage} src={resolvedImage} alt={tiger?'狂虎':''} onError={event=>{event.currentTarget.style.display='none'}}/>}</span>
  {formationPosition&&<em className={'realtime-formation-position '+formationClass} title={`隊伍編制：${formationPosition}`}>{formationPosition[0]}</em>}
  {statuses.length>0&&<span className="realtime-statuses" aria-label={statuses.map(status=>status.title).join('，')}>{statuses.map(status=><i key={status.kind} className={'realtime-status '+status.kind} title={status.title}>{status.kind==='shield'?<Shield size={10}/>:status.kind==='fear'?<Frown size={10}/>:status.kind==='burn'?<Flame size={10}/>:<Skull size={10}/>}<b>{status.label}</b></i>)}</span>}
  <strong>{name}</strong><small>Lv.{level}・[{unit.position.row},{unit.position.col}]</small>
 </article>;
}

export function BattleArena({state,hero,party}:{state:DungeonState;hero:CaravanMember & {nation?:string};party:CaravanMember[]}){
 const root=useRef<HTMLDivElement>(null),viewport=useRef<HTMLDivElement>(null),seen=useRef(0),spawn=useRef(state.spawnSerial||0),[scale,setScale]=useState(0);
 useEffect(()=>{
  const element=viewport.current;
  if(!element)return;
  const updateScale=()=>{
   const surface=element.querySelector<HTMLElement>('.realtime-stage-scroll');
   if(!surface)return;
   const width=surface.clientWidth,height=surface.clientHeight;
   const next=calculateBattleScale(width,height);
   setScale(previous=>Math.abs(previous-next)<0.001?previous:next);
  };
  updateScale();
  if(typeof ResizeObserver==='undefined'){
   window.addEventListener('resize',updateScale);
   return()=>window.removeEventListener('resize',updateScale);
  }
  const observer=new ResizeObserver(updateScale);
  observer.observe(element);
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{if(!root.current)return;if(spawn.current!==(state.spawnSerial||0)){seen.current=0;spawn.current=state.spawnSerial||0;restartAnimation(root.current,'realtime-stage-spawn')}const events=state.realtime?.events||[];for(const event of events)if(event.id>seen.current)playEventLog(root.current,event);if(events.length)seen.current=Math.max(seen.current,...events.map(event=>event.id))},[state.realtime?.eventId,state.realtime?.events,state.spawnSerial]);
 const monster=DUNGEONS[state.key],boss=state.key==='e_white_tiger_fierce_tiger'||isBossMonster(monster.name),v=vitalStats(hero),players=state.realtime?.players||[],enemies=state.realtime?.enemies||[],memberById=new Map(party.map(member=>[member.uid,member]));
 const enemyCount=state.realtime?.enemies.length??state.enemyCount??0;
 const enemySlots=Array.from({length:enemyCount},(_,index)=>enemies[index]||({id:`enemy-${index+1}`,side:'enemy',hp:state.status==='fighting'?monster.hp:0,maxHp:monster.hp,atk:monster.atk,def:0,attackInterval:1.5,cooldown:0,mp:0,position:boss?{row:1,col:1}:{row:Math.floor(index/4),col:index%4}} as RealtimeBattleUnitState));
 const timeMs=state.realtime?.timeMs||0;
 const stageStyle={'--battle-scale':scale,'--battle-design-width':`${BATTLE_SCENE_WIDTH}px`,'--battle-design-height':`${BATTLE_SCENE_HEIGHT}px`} as CSSProperties;
 return <div className="battle-viewport" ref={viewport} aria-label="完整戰鬥畫面"><div className="realtime-stage-scroll" aria-label={enemyCount?`${enemyCount} 名敵軍在上、${players.length||party.length} 名我方傭兵在下的即時自動戰鬥`:'即時自動戰鬥場景，等待遭遇'}><div className={'realtime-battle-stage realtime-battle-theater'+(state.status==='fighting'?' realtime-stage-fighting':'')} style={stageStyle} ref={root}>
  <section className="battle-theater-camp battle-theater-enemy"><header className="realtime-camp-label enemy"><strong>{boss?'首領・':''}{monster.name}</strong><span>{enemySlots.filter(unit=>unit.hp>0).length}／{enemyCount} 存活</span></header><div className={'battle-theater-enemy-units'+(boss?' battle-theater-boss':'')}>
   {enemySlots.map(unit=><UnitSprite key={unit.id} unit={unit} name={monster.name} level={monster.level} image={battleMonsterImage(monster.name,state.key)} timeMs={timeMs} boss={boss} tiger={state.key==='e_white_tiger_fierce_tiger'} theater/>)}</div></section>
  <div className="realtime-stage-divider"><b>VS</b></div>
  <section className="battle-theater-camp battle-theater-player"><header className="realtime-camp-label player"><strong>我方商隊</strong><span>{players.filter(unit=>unit.hp>0).length||party.filter(unit=>(unit.hp||0)>0).length}／{party.length} 存活</span></header><div className="battle-theater-player-units">
   {players.length?players.map((unit,index)=>{const member=memberById.get(unit.id)||party[index];return member?<UnitSprite key={unit.id} unit={unit} name={member.name} level={member.level} image={member.image} timeMs={timeMs} theater formationPosition={member.position}/>:null}):party.slice(0,12).map((member,index)=><UnitSprite key={member.uid} unit={{id:member.uid,side:'player',hp:member.hp||0,maxHp:member.maxHp||1,atk:1,def:0,attackInterval:1.5,cooldown:0,mp:index===0?v.mp:member.mp||0,position:{row:Math.floor(index/4),col:index%4}}} name={member.name} level={member.level} image={member.image} timeMs={timeMs} theater formationPosition={member.position}/>)}</div></section>
 </div></div></div>;
}
