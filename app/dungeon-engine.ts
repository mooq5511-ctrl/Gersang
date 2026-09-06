/** 副本狀態機：純函式，不建立計時器、不改動傳入物件，方便驗證每次結算。 */
import {ECOLOGY_MONSTERS,pickZoneMonster} from './monster-ecology.ts';
import {goToInn,recoverAtInn} from './inn-engine.ts';
import {formationTarget,rearDodge,type BattlePosition} from './formation-position.ts';
import {gersangWorldMap} from './gersang-world-map.ts';
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
 {id:'hanyang',nation:'korea',name:gersangWorldMap.korea.stages[0].name,level:1,power:0,enemy:'e_raccoon',mood:'朝鮮 · 漢陽城外',loot:gersangWorldMap.korea.stages[0].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.korea.stages[0].monster.drops},
 {id:'daegwallyeong',nation:'korea',name:gersangWorldMap.korea.stages[1].name,level:12,power:110,enemy:'e_mad_cow',mood:'朝鮮 · 高原牧道',loot:gersangWorldMap.korea.stages[1].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.korea.stages[1].monster.drops},
 {id:'hallasan',nation:'korea',name:gersangWorldMap.korea.stages[2].name,level:32,power:420,enemy:'e_yellow_dragon',mood:'朝鮮 · 黃龍棲地',loot:gersangWorldMap.korea.stages[2].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.korea.stages[2].monster.drops},
 {id:'datun-mountain',nation:'taiwan',name:gersangWorldMap.taiwan.stages[0].name,level:8,power:60,enemy:'e_big_eye',mood:'台灣 · 火山山徑',loot:gersangWorldMap.taiwan.stages[0].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.taiwan.stages[0].monster.drops},
 {id:'alishan',nation:'taiwan',name:gersangWorldMap.taiwan.stages[1].name,level:15,power:150,enemy:'e_boar',mood:'台灣 · 雲霧山林',loot:gersangWorldMap.taiwan.stages[1].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.taiwan.stages[1].monster.drops},
 {id:'qin-taiwan',nation:'taiwan',name:gersangWorldMap.taiwan.stages[2].name,level:24,power:260,enemy:'e_tomb_raider',mood:'台灣 · 地宮盜影',loot:gersangWorldMap.taiwan.stages[2].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.taiwan.stages[2].monster.drops},
 {id:'japan-netherworld',nation:'japan',name:gersangWorldMap.japan.stages[0].name,level:10,power:90,enemy:'e_ghost_cat',mood:'日本 · 幽冥鬼域',loot:gersangWorldMap.japan.stages[0].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.japan.stages[0].monster.drops},
 {id:'iwami-silver-mine',nation:'japan',name:gersangWorldMap.japan.stages[1].name,level:8,power:70,enemy:'e_kappa',mood:'日本 · 銀山礦道',loot:gersangWorldMap.japan.stages[1].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.japan.stages[1].monster.drops},
 {id:'black-forest',nation:'japan',name:gersangWorldMap.japan.stages[2].name,level:40,power:600,enemy:'e_amakusa',mood:'日本 · 妖氣密林',loot:gersangWorldMap.japan.stages[2].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.japan.stages[2].monster.drops},
 {id:'nanjing-outskirts',nation:'china',name:gersangWorldMap.china.stages[0].name,level:5,power:40,enemy:'e_poison_moth',mood:'中國 · 南京城外',loot:gersangWorldMap.china.stages[0].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.china.stages[0].monster.drops},
 {id:'great-wall',nation:'china',name:gersangWorldMap.china.stages[1].name,level:22,power:240,enemy:'e_xiongnu',mood:'中國 · 塞外烽煙',loot:gersangWorldMap.china.stages[1].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.china.stages[1].monster.drops},
 {id:'yellow-emperor-mausoleum',nation:'china',name:gersangWorldMap.china.stages[2].name,level:36,power:500,enemy:'e_undersea_king',mood:'中國 · 帝陵深處',loot:gersangWorldMap.china.stages[2].monster.drops.map(drop=>drop.item).join('、'),dropTable:gersangWorldMap.china.stages[2].monster.drops}
] as const;
export type ZoneId=typeof WORLD_ZONES[number]['id'];
export const zoneFor=(id?:string)=>WORLD_ZONES.find(zone=>zone.id===id)||WORLD_ZONES[0];
export const zoneUnlocked=(zone:typeof WORLD_ZONES[number],level:number,power:number)=>level>=zone.level&&power>=zone.power;
export const zoneRequirement=(zone:typeof WORLD_ZONES[number])=>zone.level===1?'Lv.1 · 無限制':'Lv.'+zone.level+(zone.power?' 且戰鬥力 ≥ '+zone.power:'');
export type BattleEvent={id:number;attacker:'hero'|'enemy';target:'hero'|'enemy';amount:number;skill:boolean;critical?:boolean};
export type DungeonState={events?:BattleEvent[];eventSerial?:number;spawnSerial?:number;innHealAt?:number;/** 指定狩獵時鎖定下一次重生的目標。 */lockedEnemyKey?:DungeonKey;status:'idle'|'fighting'|'respawning'|'recovering';phase?:'接敵'|'交戰';distance?:number;damageCursor?:number;zone?:ZoneId;key:DungeonKey;enemyHp:number;normalAt:number;skillAt:number;spawnAt:number;stamp:number;pauseAt?:number;logs:string[];serial:number};
export type DungeonHero={hp:number;mp:number;maxHp:number;maxMp:number;str:number;dex:number;int:number;attack:number;defense:number;staff:boolean};
export type DungeonPartyMember={uid:string;name:string;hp:number;maxHp:number;position:BattlePosition};
export const freshDungeon=():DungeonState=>({status:'idle',phase:'接敵',distance:100,damageCursor:0,zone:'hanyang',key:'e_raccoon',enemyHp:DUNGEONS.e_raccoon.hp,normalAt:0,skillAt:0,spawnAt:0,innHealAt:0,stamp:0,logs:[],serial:0,events:[],eventSerial:0,spawnSerial:0});
export const dungeonBusy=(state?:DungeonState)=>!!state&&state.status!=='idle';
/** 切圖只更換對手，不補血、不補魔、不發舊怪獎勵，也不清除技能冷卻。
 * 療傷期間禁止傳送，避免切圖繞過全滅懲罰；只使用原有回合計時器。 */
export function teleportDungeon(old:DungeonState,level:number,power:number,now:number,id:string,sample=0):DungeonState{
 const zone=WORLD_ZONES.find(entry=>entry.id===id);
 if(!zone||!zoneUnlocked(zone,level,power)||old.status==='recovering')return old;
 const monsterKey=pickZoneMonster(zone.id,sample);
 return {...old,events:[],lockedEnemyKey:undefined,spawnSerial:(old.spawnSerial||0)+1,zone:zone.id,key:monsterKey,enemyHp:DUNGEONS[monsterKey].hp,status:'fighting',phase:'接敵',distance:100,damageCursor:0,stamp:now,
  pauseAt:dungeonBusy(old)?old.pauseAt:now,spawnAt:0,normalAt:Math.max(now,old.normalAt),
  logs:['已傳送至 '+zone.name+'！',...old.logs].slice(0,40)};
}
export function dungeonStep(old:DungeonState,hero:DungeonHero,action:'tick'|'start'|'normal'|'skill'|'retreat',now:number,key:DungeonKey=old.key,roll=.99,choice=0,spawnRoll=0,retaliationRoll=0,party:DungeonPartyMember[]=[],passiveDamage=0,materialRolls:number[]=[1,1,1]):{state:DungeonState;hp:number;mp:number;party:DungeonPartyMember[];reward:null|{xp:number;gold:number;loot:string|null;materials:string[]}}{
 const state={...old,logs:[...old.logs]};let hp=hero.hp,mp=hero.mp;
 const members=(party.length?party:[{uid:'hero',name:'主角',hp,maxHp:hero.maxHp,position:'前排' as const}]).map(member=>({...member}));
 const heroMember=()=>members.find(member=>member.uid==='hero');
 const syncHero=()=>{hp=heroMember()?.hp??hp};
 const allDown=()=>members.every(member=>member.hp<=0);
 let reward:null|{xp:number;gold:number;loot:string|null;materials:string[]}=null;
 const log=(message:string)=>{state.logs=[message,...state.logs].slice(0,40)};
 const enemy=()=>DUNGEONS[state.key];
 // 事件只記錄已發生的傷害，序號讓 React 重繪時不重播；緩衝最多十二筆。
 const event=(attacker:'hero'|'enemy',amount:number,skill=false,critical=false)=>{const id=(state.eventSerial||0)+1;state.eventSerial=id;state.events=[...(state.events||[]),{id,attacker,target:attacker==='hero'?'enemy' as const:'hero' as const,amount,skill,...(critical?{critical:true}: {})}].slice(-12)};
 const recover=()=>{syncHero();const inn=goToInn({hp,maxHp:hero.maxHp,status:'正常'},now),returnKey=state.lockedEnemyKey||'e_raccoon';state.status='recovering';state.phase='接敵';state.distance=100;state.zone='hanyang';state.key=returnKey;state.enemyHp=DUNGEONS[returnKey].hp;state.spawnAt=0;state.innHealAt=inn.nextHealAt;state.spawnSerial=(state.spawnSerial||0)+1;log('商隊全員倒下，已撤回漢陽客棧。');log('戰鬥失敗，已自動返回漢陽客棧療傷。')};
 // 先切換狀態再產生獎勵，快速連點或同回合後攻都不會重複結算。
 const victory=()=>{state.status='respawning';state.spawnAt=now+500;state.serial++;const e=enemy(),zone=zoneFor(state.zone);
  // 每個品項使用獨立亂數；同一隻怪物可以同時噴出多項素材。
  const materials=(zone.enemy===state.key?zone.dropTable:[]).filter((drop,index)=>(materialRolls[index]??1)*100<=drop.rate).map(drop=>drop.item);
  reward={xp:e.xp,gold:e.gold,loot:roll<e.drop?e.loot[Math.min(e.loot.length-1,Math.max(0,Math.floor(choice*e.loot.length)))]:null,materials};
  log('成功擊敗 '+e.name+'！獲得 '+e.xp+' 經驗與 '+e.gold+' 兩。');if(materials.length)log('🎁 噴寶：獲得【'+materials.join('】、【')+'】！')};
 const hit=(skill=false)=>{
  if(state.status!=='fighting'||allDown())return;
  if(state.phase!=='交戰'){state.phase='交戰';state.distance=0;log('部隊向前推進，遭遇敵方【'+enemy().name+'大軍】！')}
  if(skill){if(mp<40||now<state.skillAt)return;mp-=40;state.skillAt=now+3000}
  else{if(now<state.normalAt)return;state.normalAt=now+1000}
  const damage=Math.max(1,Math.floor(skill?(hero.int*8+hero.attack*3)*(hero.staff?2:1):hero.str*2+hero.attack));
  const critical=skill||(!skill&&choice<.2);state.enemyHp=Math.max(0,state.enemyHp-damage);event('hero',damage,skill,!skill&&critical);const front=members.find(member=>member.hp>0&&member.position==='前排'),rear=members.find(member=>member.hp>0&&member.position==='後排');log((critical?'💥 暴擊！ ':'')+(skill?'主角施放了 [蛇龍出水]':'商隊協同攻擊')+'，造成 '+damage+' 點傷害！');if(front)log('⚔️ [前排] '+front.name+' 突入敵陣，輸出加成 20%！');else if(rear)log('🏹 [後排] '+rear.name+' 在安全後方持續輸出！');
  if(!state.enemyHp)victory();
 };
 const counter=()=>{if(state.status!=='fighting'||state.phase!=='交戰')return;const target=formationTarget(members,state.damageCursor||0);if(!target)return recover();state.damageCursor=(state.damageCursor||0)+1;if(rearDodge(target.position,retaliationRoll)){log('🏹 [後排] '+target.name+' 閃過 '+enemy().name+' 的攻擊！');return}const damage=10+Math.min(15,Math.max(0,Math.floor(retaliationRoll*16)));target.hp=Math.max(0,target.hp-damage);syncHero();event('enemy',damage);log('⚔️ ['+target.position+'] '+target.name+' 正在抵擋傷害，受到 '+damage+' 點傷害！');if(allDown())recover()};
 if(action==='start'&&state.status==='idle'){
  state.key=key;state.enemyHp=DUNGEONS[key].hp;state.stamp=now;state.pauseAt=now;state.normalAt=now;state.skillAt=now;state.phase='交戰';state.distance=0;state.damageCursor=0;state.status=!allDown()?'fighting':'recovering';log('部隊向前推進，遭遇敵方【'+DUNGEONS[key].name+'大軍】！');
 }else if(action==='retreat'&&(state.status==='fighting'||state.status==='respawning')){
  state.status='recovering';state.stamp=now;log('撤回漢陽療傷，恢復後再出發。');
 }else if(action==='normal')hit();
 else if(action==='skill')hit(true);
 else if(action==='tick'&&((state.status==='respawning'&&now>=state.spawnAt)||(state.status==='recovering'&&now>=(state.innHealAt||state.stamp+2000))||now-state.stamp>=1000)){
  // 每個前景秒只推進一次，不補發離線戰鬥與掉寶，避免背景頁突然連吃多次傷害。
  state.stamp=now;
  if(state.status==='recovering'){
   const inn=recoverAtInn({hp,maxHp:hero.maxHp,status:'客棧中'},state.innHealAt||now,now);hp=inn.player.hp;const recoveringHero=heroMember();if(recoveringHero)recoveringHero.hp=hp;state.innHealAt=inn.nextHealAt;
   if(inn.player.status==='正常'){state.status='idle';log('生命值已全滿，離開客棧，商隊可再次出發。')}
  }else if(state.status==='respawning'&&now>=state.spawnAt){
   state.key=state.lockedEnemyKey||pickZoneMonster(state.zone,spawnRoll);state.events=[];state.spawnSerial=(state.spawnSerial||0)+1;state.enemyHp=enemy().hp;state.status='fighting';state.phase='接敵';state.distance=100;state.normalAt=Math.max(now,state.normalAt);log('下一支部隊出現，商隊開始推進。');
  }else if(state.status==='fighting'){
   if(allDown())recover();
   else {if(state.phase!=='交戰'){state.phase='交戰';state.distance=0;log('部隊向前推進，遭遇敵方【'+enemy().name+'大軍】！')}if(passiveDamage>0&&state.enemyHp>0){const d=Math.max(1,Math.floor(passiveDamage));state.enemyHp=Math.max(0,state.enemyHp-d);event('hero',d);log('🏹 商隊被動火力造成 '+d+' 點傷害（每秒 DPS）。');if(!state.enemyHp)victory()}if(state.status==='fighting'&&state.enemyHp>0){if(hero.dex>=enemy().dex){hit();counter()}else{counter();hit()}}}
  }
 }
 syncHero();return {state,hp,mp,party:members,reward};
}
