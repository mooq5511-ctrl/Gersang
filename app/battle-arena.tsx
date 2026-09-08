/* eslint-disable next/no-img-element */
import {useEffect,useRef} from 'react';
import {DUNGEONS,type DungeonState,type RealtimeBattleEventState,type RealtimeBattleUnitState} from './dungeon-engine';
import {vitalStats} from './vitals-engine';
import type {CaravanMember} from './caravan-status';
import {Shield,Frown} from 'lucide-react';

const monsterArt:Record<string,string>={狸貓:'/assets/sprites/newbie-raccoon-v1.png',倭寇:'/assets/characters/char_049_pirate_skeleton_bow_R.png',鐵炮倭寇:'/assets/characters/char_053_pirate_skeleton_cannon_R.png',山賊:'/assets/characters/char_056_pirate_skeleton_captain_N.png',海賊:'/assets/characters/char_057_pirate_skeleton_captain_R.png',鐵鉤海賊:'/assets/characters/char_055_pirate_skeleton_captain_D.png',赤賊:'/assets/characters/char_054_pirate_skeleton_captain_A.png',巫女:'/assets/characters/char_052_pirate_skeleton_cannon_N.png',司令武女:'/assets/characters/char_052_pirate_skeleton_cannon_N.png','詭異的小販':'/assets/characters/char_054_pirate_skeleton_captain_A.png','詭異的獨角鬼(火)':'/assets/characters/char_057_pirate_skeleton_captain_R.png','詭異的獨角鬼(水)':'/assets/characters/char_049_pirate_skeleton_bow_R.png','詭異的獨角鬼(雷)':'/assets/characters/char_053_pirate_skeleton_cannon_R.png','詭異的獨角鬼(風)':'/assets/characters/char_056_pirate_skeleton_captain_N.png',阿魯塔:'/assets/characters/char_055_pirate_skeleton_captain_D.png','死靈武女(強)':'/assets/characters/char_052_pirate_skeleton_cannon_N.png','巫女(強)':'/assets/characters/char_052_pirate_skeleton_cannon_N.png',神漢男巫:'/assets/characters/char_049_pirate_skeleton_bow_R.png',邪靈巫師:'/assets/characters/char_053_pirate_skeleton_cannon_N.png',赤賊頭目:'/assets/characters/char_054_pirate_skeleton_captain_A.png',狂風阿魯塔:'/assets/monsters/gale-altur.gif',黃金海星:'/assets/monsters/golden-starfish.gif'};

/** 3 × 4 邏輯陣型轉換成 900 × 500 戰場座標。 */
export function gridToPixel(side:'player'|'enemy',row:number,col:number){return{x:side==='player'?75+col*88:561+col*88,y:120+row*145}}
function findUnit(root:HTMLElement,id?:string){return id?Array.from(root.querySelectorAll<HTMLElement>('[data-unit-id]')).find(node=>node.dataset.unitId===id)||null:null}
function restartAnimation(node:HTMLElement|null,className:string){if(!node)return;node.classList.remove(className);void node.offsetWidth;node.classList.add(className);const finish=()=>node.classList.remove(className);node.addEventListener('animationend',finish,{once:true});setTimeout(finish,650)}
function playEventLog(root:HTMLElement,event:RealtimeBattleEventState){
 if(event.type==='attack')restartAnimation(findUnit(root,event.actorId),'realtime-unit-attacking');
 if(event.type==='damage'){const target=findUnit(root,event.targetId);restartAnimation(target,'realtime-unit-hit');if(target){const text=document.createElement('b');text.className='realtime-floating-damage';text.textContent='-'+Math.max(0,event.damage||0).toLocaleString();target.appendChild(text);const remove=()=>text.remove();text.addEventListener('animationend',remove,{once:true});setTimeout(remove,1000)}}
 if(event.type==='death')findUnit(root,event.targetId)?.classList.add('realtime-unit-dead');
}

function UnitSprite({unit,name,level,image,status}:{unit:RealtimeBattleUnitState;name:string;level:number;image:string;status?:'shield'|'fear'}){
 const point=gridToPixel(unit.side,unit.position.row,unit.position.col),hp=Math.max(0,unit.hp),hpRate=Math.max(0,Math.min(100,hp/unit.maxHp*100));
 return <article className={'realtime-unit '+unit.side+(hp<=0?' realtime-unit-dead':'')} data-unit-id={unit.id} style={{left:point.x,top:point.y}} aria-label={`${name}，生命 ${hp} / ${unit.maxHp}`}>
  <div className="realtime-unit-bars"><span className="realtime-hp"><i style={{width:hpRate+'%'}}/></span><span className="realtime-mp"><i style={{width:Math.max(0,Math.min(100,unit.mp))+'%'}}/></span></div>
  <span className="realtime-portrait"><img src={image} alt=""/>{status==='shield'&&<i title="白虎盾・防禦 +30%"><Shield size={12}/></i>}{status==='fear'&&<i title="恐懼・防禦 -20%"><Frown size={12}/></i>}</span>
  <strong>{name}</strong><small>Lv.{level}・[{unit.position.row},{unit.position.col}]</small>
 </article>;
}

export function BattleArena({state,hero,party}:{state:DungeonState;hero:CaravanMember & {nation?:string};party:CaravanMember[]}){
 const root=useRef<HTMLDivElement>(null),seen=useRef(0),spawn=useRef(state.spawnSerial||0);
 useEffect(()=>{if(!root.current)return;if(spawn.current!==(state.spawnSerial||0)){seen.current=0;spawn.current=state.spawnSerial||0;restartAnimation(root.current,'realtime-stage-spawn')}const events=state.realtime?.events||[];for(const event of events)if(event.id>seen.current)playEventLog(root.current,event);if(events.length)seen.current=Math.max(seen.current,...events.map(event=>event.id))},[state.realtime?.eventId,state.spawnSerial]);
 const monster=DUNGEONS[state.key],v=vitalStats(hero),players=state.realtime?.players||[],enemies=state.realtime?.enemies||[],memberById=new Map(party.map(member=>[member.uid,member]));
 const enemySlots=Array.from({length:12},(_,index)=>enemies[index]||({id:`enemy-${index+1}`,side:'enemy',hp:state.status==='fighting'?monster.hp:0,maxHp:monster.hp,atk:monster.atk,def:0,attackInterval:1.5,cooldown:0,mp:0,position:{row:Math.floor(index/4),col:index%4}} as RealtimeBattleUnitState));
 const shieldActive=monster.name==='狂風阿魯塔'&&(state.enemyShieldUntil||0)>Date.now(),fearActive=(state.fearUntil||0)>Date.now();
 return <div className="realtime-stage-scroll" aria-label="12 對 12 左右對峙即時自動戰鬥"><div className={'realtime-battle-stage'+(state.status==='fighting'?' realtime-stage-fighting':'')} ref={root}>
  <header className="realtime-camp-label player"><strong>我方商隊</strong><span>{players.filter(unit=>unit.hp>0).length||party.filter(unit=>(unit.hp||0)>0).length}／{party.length} 存活</span></header><header className="realtime-camp-label enemy"><strong>{monster.name}部隊</strong><span>{enemySlots.filter(unit=>unit.hp>0).length}／12 存活</span></header><div className="realtime-stage-divider"><b>VS</b></div>
  {players.map((unit,index)=>{const member=memberById.get(unit.id)||party[index];return member?<UnitSprite key={unit.id} unit={unit} name={member.name} level={member.level} image={member.image}/>:null})}
  {!players.length&&party.slice(0,12).map((member,index)=><UnitSprite key={member.uid} unit={{id:member.uid,side:'player',hp:member.hp||0,maxHp:member.maxHp||1,atk:1,def:0,attackInterval:1.5,cooldown:0,mp:index===0?v.mp:member.mp||0,position:{row:Math.floor(index/4),col:index%4}}} name={member.name} level={member.level} image={member.image}/>)}
  {enemySlots.map(unit=><UnitSprite key={unit.id} unit={unit} name={monster.name} level={monster.level} image={monsterArt[monster.name]||'/assets/sprites/enemy-idle.png'} status={shieldActive?'shield':fearActive?'fear':undefined}/>)}
 </div></div>;
}
