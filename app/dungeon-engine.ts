/** 副本狀態機：純函式，不建立計時器、不改動傳入物件，方便驗證每次結算。 */
import {ECOLOGY_MONSTERS,pickZoneMonster} from './monster-ecology.ts';
export const DUNGEONS = {
 ...ECOLOGY_MONSTERS,
 thug:{name:'打手',level:1,hp:150,mp:0,atk:8,dex:8,xp:20,gold:15,drop:.05,loot:['boots']},
 pirate:{name:'海賊',level:15,hp:800,mp:40,atk:35,dex:20,xp:150,gold:120,drop:.25,loot:['boots']},
 snowWoman:{name:'雪女',level:40,hp:4000,mp:200,atk:120,dex:45,xp:800,gold:600,drop:.55,loot:['helmet','staff']},
 abyssKing:{name:'閻王',level:80,hp:25000,mp:500,atk:350,dex:70,xp:5000,gold:3000,drop:.8,loot:['armor']},
 wolf:{name:'幽冥狼',level:10,hp:300,mp:0,atk:15,dex:12,xp:100,gold:80,drop:.2,loot:['staff','armor','helmet','boots']},
 snake:{name:'冥界大蛇',level:40,hp:2500,mp:100,atk:65,dex:30,xp:500,gold:350,drop:.55,loot:['helmet','helmet','boots','boots','staff','armor']},
 king:{name:'閻王',level:80,hp:15000,mp:400,atk:220,dex:60,xp:2400,gold:2000,drop:.9,loot:['armor','armor','staff','staff','helmet','boots']}
} as const;
export type DungeonKey=keyof typeof DUNGEONS;
/** 地圖資料是畫面鎖定與實際傳送的唯一來源；等級、戰鬥力兩條件必須同時滿足。 */
export const WORLD_ZONES=[
 {id:'hanyang',name:'漢陽近郊',level:1,power:0,enemy:'thug',mood:'新手區 · 漢陽城外',loot:'極低機率：太皇鞋'},
 {id:'geoje',name:'巨濟海底洞窟',level:15,power:0,enemy:'pirate',mood:'中期區 · 潮聲暗湧',loot:'太皇鞋'},
 {id:'snow',name:'大雪山冰窟',level:40,power:500,enemy:'snowWoman',mood:'高階區 · 霜雪封山',loot:'飛虎兜、高級神仙棒'},
 {id:'abyss',name:'冥界深淵',level:70,power:2000,enemy:'abyssKing',mood:'終極 BOSS 區 · 冥府深處',loot:'海王戰甲'}
] as const;
export type ZoneId=typeof WORLD_ZONES[number]['id'];
export const zoneFor=(id?:string)=>WORLD_ZONES.find(zone=>zone.id===id)||WORLD_ZONES[0];
export const zoneUnlocked=(zone:typeof WORLD_ZONES[number],level:number,power:number)=>level>=zone.level&&power>=zone.power;
export const zoneRequirement=(zone:typeof WORLD_ZONES[number])=>zone.level===1?'Lv.1 · 無限制':'Lv.'+zone.level+(zone.power?' 且戰鬥力 ≥ '+zone.power:'');
export type BattleEvent={id:number;attacker:'hero'|'enemy';target:'hero'|'enemy';amount:number;skill:boolean};
export type DungeonState={events?:BattleEvent[];eventSerial?:number;spawnSerial?:number;status:'idle'|'fighting'|'respawning'|'recovering';zone?:ZoneId;key:DungeonKey;enemyHp:number;normalAt:number;skillAt:number;spawnAt:number;stamp:number;pauseAt?:number;logs:string[];serial:number};
export type DungeonHero={hp:number;mp:number;maxHp:number;maxMp:number;str:number;dex:number;int:number;attack:number;defense:number;staff:boolean};
export const freshDungeon=():DungeonState=>({status:'idle',zone:'hanyang',key:'e_cat',enemyHp:DUNGEONS.e_cat.hp,normalAt:0,skillAt:0,spawnAt:0,stamp:0,logs:[],serial:0,events:[],eventSerial:0,spawnSerial:0});
export const dungeonBusy=(state?:DungeonState)=>!!state&&state.status!=='idle';
/** 切圖只更換對手，不補血、不補魔、不發舊怪獎勵，也不清除技能冷卻。
 * 療傷期間禁止傳送，避免切圖繞過全滅懲罰；只使用原有回合計時器。 */
export function teleportDungeon(old:DungeonState,level:number,power:number,now:number,id:string,sample=0):DungeonState{
 const zone=WORLD_ZONES.find(entry=>entry.id===id);
 if(!zone||!zoneUnlocked(zone,level,power)||old.status==='recovering')return old;
 const monsterKey=pickZoneMonster(zone.id,sample);
 return {...old,events:[],spawnSerial:(old.spawnSerial||0)+1,zone:zone.id,key:monsterKey,enemyHp:DUNGEONS[monsterKey].hp,status:'fighting',stamp:now,
  pauseAt:dungeonBusy(old)?old.pauseAt:now,spawnAt:0,normalAt:Math.max(now,old.normalAt),
  logs:['已傳送至 '+zone.name+'！',...old.logs].slice(0,40)};
}
export function dungeonStep(old:DungeonState,hero:DungeonHero,action:'tick'|'start'|'normal'|'skill'|'retreat',now:number,key:DungeonKey=old.key,roll=.99,choice=0,spawnRoll=0):{state:DungeonState;hp:number;mp:number;reward:null|{xp:number;gold:number;loot:string|null}}{
 const state={...old,logs:[...old.logs]};let hp=hero.hp,mp=hero.mp;
 let reward:null|{xp:number;gold:number;loot:string|null}=null;
 const log=(message:string)=>{state.logs=[message,...state.logs].slice(0,40)};
 const enemy=()=>DUNGEONS[state.key];
 // 事件只記錄已發生的傷害，序號讓 React 重繪時不重播；緩衝最多十二筆。
 const event=(attacker:'hero'|'enemy',amount:number,skill=false)=>{const id=(state.eventSerial||0)+1;state.eventSerial=id;state.events=[...(state.events||[]),{id,attacker,target:attacker==='hero'?'enemy' as const:'hero' as const,amount,skill}].slice(-12)};
 const recover=()=>{state.status='recovering';state.zone='hanyang';state.key='e_cat';state.enemyHp=DUNGEONS.e_cat.hp;state.spawnAt=0;state.spawnSerial=(state.spawnSerial||0)+1;log('商隊不幸全滅，已被熱心商旅送回漢陽療傷...')};
 // 先切換狀態再產生獎勵，快速連點或同回合後攻都不會重複結算。
 const victory=()=>{state.status='respawning';state.spawnAt=now+500;state.serial++;const e=enemy();reward={xp:e.xp,gold:e.gold,loot:roll<e.drop?e.loot[Math.min(e.loot.length-1,Math.max(0,Math.floor(choice*e.loot.length)))]:null};log('成功擊敗 '+e.name+'！獲得 '+e.xp+' 經驗與 '+e.gold+' 兩。')};
 const hit=(skill=false)=>{
  if(state.status!=='fighting'||hp<=0)return;
  if(skill){if(mp<40||now<state.skillAt)return;mp-=40;state.skillAt=now+3000}
  else{if(now<state.normalAt)return;state.normalAt=now+1000}
  const damage=Math.max(1,Math.floor(skill?(hero.int*8+hero.attack*3)*(hero.staff?2:1):hero.str*2+hero.attack));
  state.enemyHp=Math.max(0,state.enemyHp-damage);event('hero',damage,skill);log((skill?'主角施放了 [蛇龍出水]':'主角普通攻擊')+'，造成 '+damage+' 點傷害！');
  if(!state.enemyHp)victory();
 };
 const counter=()=>{if(state.status!=='fighting')return;const damage=Math.max(1,enemy().atk-hero.defense);hp=Math.max(0,hp-damage);event('enemy',damage);log(enemy().name+' 攻擊，受到 '+damage+' 點傷害。');if(!hp)recover()};
 if(action==='start'&&state.status==='idle'){
  state.key=key;state.enemyHp=DUNGEONS[key].hp;state.stamp=now;state.pauseAt=now;state.normalAt=now;state.skillAt=now;state.status=hp>0?'fighting':'recovering';log('挑戰 '+DUNGEONS[key].name+'。');
 }else if(action==='retreat'&&(state.status==='fighting'||state.status==='respawning')){
  state.status='recovering';state.stamp=now;log('撤回漢陽療傷，恢復後再出發。');
 }else if(action==='normal')hit();
 else if(action==='skill')hit(true);
 else if(action==='tick'&&((state.status==='respawning'&&now>=state.spawnAt)||now-state.stamp>=1000)){
  // 每個前景秒只推進一次，不補發離線戰鬥與掉寶，避免背景頁突然連吃多次傷害。
  state.stamp=now;
  if(state.status==='recovering'){
   hp=Math.min(hero.maxHp,hp+Math.max(1,Math.ceil(hero.maxHp*.08)));mp=Math.min(hero.maxMp,mp+Math.max(1,Math.ceil(hero.maxMp*.08)));
   if(hp===hero.maxHp&&mp===hero.maxMp){state.status='idle';log('療傷完成，商隊可再次出發。')}
  }else if(state.status==='respawning'&&now>=state.spawnAt){
   state.key=pickZoneMonster(state.zone,spawnRoll);state.events=[];state.spawnSerial=(state.spawnSerial||0)+1;state.enemyHp=enemy().hp;state.status='fighting';state.normalAt=Math.max(now,state.normalAt);log(enemy().name+' 再次現身。');
  }else if(state.status==='fighting'){
   if(hp<=0)recover();
   else if(hero.dex>=enemy().dex){hit();counter()}else{counter();hit()}
  }
 }
 return {state,hp,mp,reward};
}
