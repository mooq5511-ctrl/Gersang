/** 副本狀態機：純函式，不建立計時器、不改動傳入物件，方便驗證每次結算。 */
import {ECOLOGY_MONSTERS,LEGACY_DUNGEON_MONSTERS,pickZoneMonster} from './monster-ecology.ts';
import {goToInn,recoverAtInn} from './inn-engine.ts';
import {type BattlePosition} from './formation-position.ts';
import {gersangWorldMap} from './gersang-world-map.ts';
import {MercenaryRealtimeBattleSystem} from './mercenary-realtime-battle.js';
import {mitigatedDamage} from './combat-damage.js';
import {newlyDefeatedExperience} from './dungeon-kill-xp.ts';
import {mercenarySpec} from './mercenary-roster.ts';
import {bossAbilitiesFor} from '../data/skills/boss-abilities.ts';
export const DUNGEONS = {
 ...ECOLOGY_MONSTERS,
 ...LEGACY_DUNGEON_MONSTERS,
} as const;
export type DungeonKey=keyof typeof DUNGEONS;
/** 劇情首領以單體戰鬥呈現，其餘遭遇維持 12 格部隊。 */
export const isBossMonster=(name?:string)=>name==='海賊王'||name==='狂風阿魯塔'||name==='黃金海星'||name==='狂虎'||name==='多聞天王'||name==='廣目天王';
/** One uniform roll per normal encounter; bosses always spawn alone. */
export const normalEncounterCount=(roll:number,partySize=12)=>{const limit=Math.min(12,Math.max(1,Math.floor(Number.isFinite(partySize)?partySize:12))),sample=Math.max(0,Math.min(.999999999,Number.isFinite(roll)?roll:0));return 1+Math.min(limit-1,Math.floor(sample*limit))};
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
export type RealtimeBattleUnitState={id:string;side:'player'|'enemy';hp:number;maxHp:number;atk:number;def:number;magicDef?:number;physicalResist?:number;magicResist?:number;attackInterval:number;cooldown:number;mp:number;skillPower?:number;position:{row:number;col:number};templateId?:string;maxMp?:number;accuracy?:number;ranged?:boolean;kind?:string;boss?:boolean;poisonAttack?:boolean;magicAttack?:boolean;generalSkillName?:string;mercenaryState?:Record<string,unknown>};
export type RealtimeBattleEventState={id:number;timeMs:number;type:string;actorId?:string;targetId?:string;sourcePosition?:{row:number;col:number};targetPosition?:{row:number;col:number};ability?:string;damage?:number;amount?:number;skillName?:string;hpAfter?:number;winner?:string};
export type RealtimeBattleSnapshot={players:RealtimeBattleUnitState[];enemies:RealtimeBattleUnitState[];skillMultiplier:number;autoSkill:boolean;timeMs:number;running:boolean;winner:'player'|'enemy'|'draw'|null;eventId:number;events:RealtimeBattleEventState[];seed?:number;aidApplied?:boolean;terrain?:string};
export type DungeonState={realtime?:RealtimeBattleSnapshot;realtimeCursor?:number;enemyCount?:number;creditedKills?:number;events?:BattleEvent[];eventSerial?:number;spawnSerial?:number;innHealAt?:number;enemyShieldAt?:number;enemyShatterAt?:number;enemyShieldUntil?:number;enemyRegenUntil?:number;enemyFlameAt?:number;enemyCurseAt?:number;burnUntil?:number;burnStacks?:number;cursedUid?:string;curseUntil?:number;fearUntil?:number;tigerMp?:number;tigerHowlAt?:number;tigerRageActive?:boolean;tigerSlowUntil?:number;tigerBleeds?:Record<string,{until:number;next:number}>;/** 指定狩獵時鎖定下一次重生的目標。 */lockedEnemyKey?:DungeonKey;status:'idle'|'fighting'|'respawning'|'recovering';phase?:'接敵'|'交戰';distance?:number;damageCursor?:number;zone?:ZoneId;key:DungeonKey;enemyHp:number;normalAt:number;skillAt:number;spawnAt:number;stamp:number;pauseAt?:number;logs:string[];serial:number};
export type DungeonHero={hp:number;mp:number;maxHp:number;maxMp:number;str:number;dex:number;mercenaryIntelligence:number;attack:number;defense:number;staff:boolean;amaterasuGaze?:boolean};
export type DungeonPartyMember={uid:string;name:string;templateId?:string;skill?:string;hp:number;maxHp:number;mp?:number;maxMp?:number;position:BattlePosition;defense?:number;physicalResist?:number;magicResist?:number;attack?:number;accuracy?:number;attackInterval?:number};
/** 依攻擊力與防禦力計算實際傷害，並加入 90%～110% 的自然浮動。 */
export function calculateDamage(attacker:{atk:number},defender:{def:number},random=Math.random){
 const randomFactor=0.9+random()*0.2;
 return mitigatedDamage(attacker.atk,defender.def,randomFactor);
}
export const freshDungeon=():DungeonState=>({status:'idle',phase:'接敵',distance:100,damageCursor:0,zone:'hanyang',key:'e_raccoon',enemyHp:DUNGEONS.e_raccoon.hp,normalAt:0,skillAt:0,spawnAt:0,innHealAt:0,enemyShieldAt:0,enemyShatterAt:0,enemyShieldUntil:0,stamp:0,logs:[],serial:0,events:[],eventSerial:0,spawnSerial:0});
export const dungeonBusy=(state?:DungeonState)=>!!state&&state.status!=='idle';
/** 切圖只更換對手，不補血、不補魔、不發舊怪獎勵，也不清除技能冷卻。
 * 療傷期間禁止傳送，避免切圖繞過全滅懲罰；只使用原有回合計時器。 */
export function teleportDungeon(old:DungeonState,level:number,power:number,now:number,id:string,sample=0):DungeonState{
 const zone=WORLD_ZONES.find(entry=>entry.id===id);
 if(!zone||!zoneUnlocked(zone,level,power)||old.status==='recovering')return old;
 const monsterKey=pickZoneMonster(zone.id,sample);
 return {...old,realtime:undefined,realtimeCursor:0,events:[],lockedEnemyKey:undefined,spawnSerial:(old.spawnSerial||0)+1,zone:zone.id,key:monsterKey,enemyHp:DUNGEONS[monsterKey].hp,status:'fighting',phase:'接敵',distance:100,damageCursor:0,stamp:now,
  pauseAt:dungeonBusy(old)?old.pauseAt:now,spawnAt:0,normalAt:Math.max(now,old.normalAt),
  logs:['已傳送至 '+zone.name+'！',...old.logs].slice(0,40)};
}
export function dungeonStep(old:DungeonState,hero:DungeonHero,action:'tick'|'start'|'normal'|'skill'|'retreat',now:number,key:DungeonKey=old.key,roll=.99,choice=0,spawnRoll=0,retaliationRoll=0,party:DungeonPartyMember[]=[],passiveDamage=0,materialRolls:number[]=[1,1,1],autoSkill=false,encounterCountRoll=.999999,healInterval=2000):{state:DungeonState;hp:number;mp:number;party:DungeonPartyMember[];xpEarned:number;killsEarned:number;reward:null|{xp:number;gold:number;loot:string|null;materials:string[]}}{
 const state={...old,logs:[...old.logs]};let hp=hero.hp,mp=hero.mp;
 const members=(party.length?party:[{uid:'hero',name:'主角',hp,maxHp:hero.maxHp,position:'前排' as const}]).map(member=>({...member}));
 const heroMember=()=>members.find(member=>member.uid==='hero');
 const syncHero=()=>{hp=heroMember()?.hp??hp};
 const allDown=()=>members.every(member=>member.hp<=0);
 let reward:null|{xp:number;gold:number;loot:string|null;materials:string[]}=null;
 let xpEarned=0,killsEarned=0;
 const log=(message:string)=>{state.logs=[message,...state.logs].slice(0,40)};
 const enemyCombatMultiplier=()=>(String(state.zone)==='miasma-forest'||String(state.key||'').startsWith('e_white_tiger_'))&&members.filter(member=>member.uid!=='hero').length>5?2:1;
 const enemy=()=>{const base=DUNGEONS[state.key],multiplier=enemyCombatMultiplier(),scaled=multiplier===1?base:{...base,hp:base.hp*multiplier,mp:base.mp*multiplier,atk:base.atk*multiplier,dex:base.dex*multiplier,physicalDefense:'physicalDefense' in base&&typeof base.physicalDefense==='number'?base.physicalDefense*multiplier:undefined,magicDefense:'magicDefense' in base&&typeof base.magicDefense==='number'?base.magicDefense*multiplier:undefined};return scaled.name==='狂虎'?{...scaled,physicalDefense:('physicalDefense' in scaled&&typeof scaled.physicalDefense==='number'?scaled.physicalDefense*1.15:0),magicDefense:('magicDefense' in scaled&&typeof scaled.magicDefense==='number'?scaled.magicDefense*1.15:0)}:scaled};
 // 事件只記錄已發生的傷害，序號讓 React 重繪時不重播；緩衝最多十二筆。
 const event=(attacker:'hero'|'enemy',amount:number,skill=false,critical=false)=>{const id=(state.eventSerial||0)+1;state.eventSerial=id;state.events=[...(state.events||[]),{id,attacker,target:attacker==='hero'?'enemy' as const:'hero' as const,amount,skill,...(critical?{critical:true}: {})}].slice(-12)};
 const syncRealtime=(combat:MercenaryRealtimeBattleSystem)=>{
  const snapshot=combat.snapshot() as RealtimeBattleSnapshot;
  const freshEvents=snapshot.events.filter(entry=>entry.id>(state.realtimeCursor||0));
  state.realtime=snapshot;state.realtimeCursor=snapshot.eventId;
  const playerById=new Map(snapshot.players.map(unit=>[unit.id,unit]));
  for(const member of members){const fighter=playerById.get(member.uid);if(fighter){member.hp=fighter.hp;member.mp=fighter.mp}}
  const realtimeHero=playerById.get('hero');if(realtimeHero){hp=realtimeHero.hp;mp=realtimeHero.mp}
  state.enemyHp=snapshot.enemies.reduce((sum,unit)=>sum+unit.hp,0);
  const earned=newlyDefeatedExperience(state.creditedKills||0,snapshot.enemies.map(unit=>unit.hp),enemy().xp);
  state.creditedKills=earned.creditedKills;xpEarned+=earned.xp;killsEarned+=earned.kills;
  if(earned.kills)log(`擊敗 ${earned.kills} 隻${enemy().name}，獲得 ${earned.xp} 經驗。`);
  for(const entry of freshEvents){
   if(entry.type==='damage'&&entry.actorId&&entry.targetId){const actor=entry.actorId.startsWith('enemy-')?'敵方':members.find(unit=>unit.uid===entry.actorId)?.name||'我方';const target=entry.targetId.startsWith('enemy-')?enemy().name:members.find(unit=>unit.uid===entry.targetId)?.name||'我方角色';if(entry.ability==='poison'){log(`☠️ ${target}中毒，受到 ${entry.damage||0} 點傷害。`);event(entry.targetId.startsWith('enemy-')?'hero':'enemy',entry.damage||0,true)}else{log(`⚔️ ${actor}${entry.ability==='skill'?'施放技能':'攻擊'} ${target}，造成 ${entry.damage||0} 點傷害。`);event(entry.actorId.startsWith('enemy-')?'enemy':'hero',entry.damage||0,entry.ability==='skill')}}
   else if((entry.type==='skill'||entry.type==='heal'||entry.type==='restore-mp')&&entry.actorId){const actor=members.find(unit=>unit.uid===entry.actorId)?.name||'我方';const target=members.find(unit=>unit.uid===entry.targetId)?.name;log(`${actor}・${entry.skillName||'技能'}${target?' → '+target:''}${entry.amount!==undefined?' '+entry.amount:''}。`)}
   else if(entry.type==='status'&&entry.actorId)log(`${entry.actorId.startsWith('enemy-')?enemy().name:members.find(unit=>unit.uid===entry.actorId)?.name||'角色'}受到${entry.skillName||'狀態'}影響，暫停行動。`);
   else if(entry.type==='death'&&entry.targetId)log(`💀 ${entry.targetId.startsWith('enemy-')?enemy().name:members.find(unit=>unit.uid===entry.targetId)?.name||'角色'} 已倒下。`);
  }
 };
 const beginRealtime=()=>{
  // 隊伍編制會優先把前／中／後排放入對應欄位，再以三條 row 戰線填滿空格。
  const occupied=new Set<string>();
  const formationPoint=(member:DungeonPartyMember,index:number)=>{const columns=member.position==='前排'?[3,2,1,0]:member.position==='後排'?[0,1,2,3]:[2,1,3,0],firstRow=index%3,rows=[firstRow,...[0,1,2].filter(row=>row!==firstRow)];for(const col of columns)for(const row of rows){const key=row+':'+col;if(!occupied.has(key)){occupied.add(key);return{row,col}}}return{row:Math.floor(index/4),col:index%4}};
 const playerUnits=members.slice(0,12).map((member,index)=>({id:member.uid,side:'player',templateId:member.templateId||'',hp:member.hp,maxHp:member.maxHp,atk:Math.max(1,member.attack||hero.attack),def:Math.max(0,member.defense||0),magicDef:Math.max(0,member.defense||0),physicalResist:member.physicalResist||0,magicResist:member.magicResist||0,attackInterval:member.attackInterval||1.5,cooldown:0,mp:member.uid==='hero'?mp:member.mp||0,maxMp:member.maxMp||100,accuracy:member.accuracy??1,ranged:mercenarySpec(member.templateId)?.ranged??true,formationPosition:member.position,amaterasuGaze:member.uid==='hero'&&hero.amaterasuGaze===true,generalSkillName:member.templateId?.startsWith('general-')?member.skill:undefined,skillPower:member.uid==='hero'?5000+hero.mercenaryIntelligence*10:Math.max(1,(member.attack||hero.attack)*2),position:formationPoint(member,index)}));
  const e=enemy();const boss=isBossMonster(e.name);const enemyCount=boss?1:normalEncounterCount(encounterCountRoll,Math.min(12,members.length));state.enemyCount=enemyCount;state.creditedKills=0;
  const physicalDefense='physicalDefense' in e&&typeof e.physicalDefense==='number'?e.physicalDefense:0;
  const magicDefense='magicDefense' in e&&typeof e.magicDefense==='number'?e.magicDefense:physicalDefense;
  const enemyUnits=Array.from({length:enemyCount},(_,index)=>({id:`enemy-${index+1}`,side:'enemy',hp:e.hp,maxHp:e.hp,atk:e.atk,def:Math.max(0,physicalDefense),magicDef:Math.max(0,magicDefense),attackInterval:Math.max(.6,2.2-e.dex/100),cooldown:0,mp:index===0?Math.min(100,e.mp):0,boss,kind:/騎/.test(e.name)?'cavalry':/虎|狼|熊|鹿|獸|龜|蛇|狐|馬/.test(e.name)?'beast':'human',poisonAttack:/毒|蛇|蠍/.test(e.name),magicAttack:/術|巫|法/.test(e.name),ranged:/弓|砲|槍|法|術|巫/.test(e.name),position:boss?{row:1,col:1}:{row:Math.floor(index/4),col:index%4}}));
  const combat=new MercenaryRealtimeBattleSystem(playerUnits,enemyUnits,{autoSkill,terrain:state.key.startsWith('e_white_tiger_')?'forest':state.zone,seed:(now+state.serial+1)>>>0});combat.startBattle();state.realtimeCursor=0;syncRealtime(combat);log(`即時戰鬥開始：${playerUnits.length} 名商隊成員對抗 ${boss?'首領 ':''}${enemyCount} 隻${e.name}。`);
 };
 const recover=()=>{syncHero();const inn=goToInn({hp,maxHp:hero.maxHp,status:'正常'},now,healInterval),returnKey=state.lockedEnemyKey||'e_raccoon';state.status='recovering';state.phase='接敵';state.distance=100;state.zone='hanyang';state.key=returnKey;state.enemyHp=DUNGEONS[returnKey].hp;state.realtime=undefined;state.realtimeCursor=0;state.spawnAt=0;state.innHealAt=inn.nextHealAt;state.spawnSerial=(state.spawnSerial||0)+1;log('商隊全員倒下，已撤回漢陽客棧。');log('戰鬥失敗，已自動返回漢陽客棧療傷。')};
 // 先切換狀態再產生獎勵，快速連點或同回合後攻都不會重複結算。
 const victory=()=>{state.status='respawning';state.spawnAt=now+500;state.serial++;const e=enemy(),zone=zoneFor(state.zone);
  // 每個品項使用獨立亂數；同一隻怪物可以同時噴出多項素材。
  const materials=(zone.enemy===state.key?zone.dropTable:[]).filter((drop,index)=>(materialRolls[index]??1)*100<=drop.rate).map(drop=>drop.item);
  // 神裝採固定個別機率：怪物掉落池內的每一件裝備均為 0.01%，且單次最多掉一件。
  const uniqueLoot=[...new Set(e.loot)],rareRate=.0001,rareIndex=Math.floor(roll/rareRate);
  const defeatedCount=isBossMonster(e.name)?1:(state.realtime?.enemies.length??state.enemyCount??1);
  const totalXp=e.xp*defeatedCount;
  reward={xp:totalXp,gold:0,loot:rareIndex<uniqueLoot.length?uniqueLoot[rareIndex]:null,materials};
  log('成功擊敗 '+defeatedCount+' 隻'+e.name+'！獲得 '+totalXp+' 經驗。');if(materials.length)log('🎁 噴寶：獲得【'+materials.join('】、【')+'】！')};
 const settleRealtimeOutcome=()=>{if(state.status!=='fighting')return;const outcome=(state as unknown as {realtime?:RealtimeBattleSnapshot}).realtime?.winner;if(outcome==='player')victory();else if(outcome==='enemy'||outcome==='draw')recover()};
 const runBossAbilities=(combat:MercenaryRealtimeBattleSystem)=>{const abilities=bossAbilitiesFor(state.key),boss=combat.enemies[0];if(!abilities||state.status!=='fighting'||!boss?.alive||combat.winner)return;
  type BurnState={stacks:number;until:number;next:number};type BossRuntime={cooldowns?:Record<string,number>;burns?:Record<string,BurnState>;eventCursor?:number};const bossWithState=boss as typeof boss&{state:{bossRuntime?:BossRuntime}};
  const runtime=bossWithState.state.bossRuntime||(bossWithState.state.bossRuntime={}),cooldowns=runtime.cooldowns||(runtime.cooldowns={}),burns=runtime.burns||(runtime.burns={}),time=combat.timeMs;
  const due=(id:string,initialDelayMs:number,cooldownMs:number)=>{const next=cooldowns[id]??initialDelayMs;if(time<next)return false;cooldowns[id]=next+cooldownMs;return true};
  const cast=(name:string,targetId?:string)=>combat.log('skill',{actorId:boss.id,targetId,skillName:name});
  const damage=(target:typeof boss,amount:number,name:string)=>{if(!target.alive)return;const dealt=Math.min(target.hp,Math.max(1,Math.floor(amount)));target.hp=Math.max(0,target.hp-dealt);combat.log('damage',{actorId:boss.id,targetId:target.id,ability:'skill',skillName:name,damage:dealt,hpAfter:target.hp});if(!target.alive)combat.log('death',{actorId:boss.id,targetId:target.id})};
  if(abilities.shield&&due('shield',abilities.shield.initialDelayMs,abilities.shield.cooldownMs)){combat.setTimedEffect(boss,'bossShield',abilities.shield.defenseBonus,abilities.shield.durationMs);cast(abilities.shield.name);combat.log('status',{actorId:boss.id,skillName:`${abilities.shield.name}・防禦 +${Math.round(abilities.shield.defenseBonus*100)}%`})}
  if(abilities.trueDamage&&due('trueDamage',abilities.trueDamage.initialDelayMs,abilities.trueDamage.cooldownMs)){cast(abilities.trueDamage.name);for(const target of combat.living('player'))damage(target,abilities.trueDamage.damage,abilities.trueDamage.name)}
  if(abilities.regeneration&&due('regeneration',abilities.regeneration.initialDelayMs,abilities.regeneration.cooldownMs)){const amount=boss.atk*abilities.regeneration.attackMultiplier+boss.maxHp*abilities.regeneration.maxHpPerSecond*(abilities.regeneration.durationMs/1000);cast(abilities.regeneration.name,boss.id);combat.heal(boss,boss,amount,abilities.regeneration.name)}
  if(abilities.flame){const firstEvent=runtime.eventCursor||0;for(const entry of combat.events.filter(item=>item.id>firstEvent&&item.type==='attack'&&item.actorId===boss.id)){if(combat.roll()>=abilities.flame.procChance)continue;cast(abilities.flame.name);for(const target of combat.living('player')){damage(target,boss.atk*abilities.flame.attackMultiplier,abilities.flame.name);const burn=burns[target.id]||{stacks:0,until:0,next:time+1000};burn.stacks=Math.min(abilities.flame.maxStacks,burn.stacks+1);burn.until=Math.max(burn.until,time+abilities.flame.burnDurationMs);burns[target.id]=burn;combat.setTimedEffect(target,'bossBurn',burn.stacks,Math.max(0,burn.until-time));combat.log('status',{actorId:boss.id,targetId:target.id,skillName:`灼燒・${burn.stacks} 層`})}}runtime.eventCursor=combat.eventId;for(const [targetId,burn] of Object.entries(burns)){const target=combat.players.find(unit=>unit.id===targetId),targetWithState=target as typeof target&{state?:{effects?:Record<string,unknown>}};if(!target?.alive||time>=burn.until){if(targetWithState?.state?.effects)delete targetWithState.state.effects.bossBurn;delete burns[targetId];continue}while(time>=burn.next){damage(target,boss.atk*abilities.flame.burnAttackRatio*burn.stacks,'灼燒');burn.next+=1000}}}
  if(abilities.curse&&due('curse',abilities.curse.initialDelayMs,abilities.curse.cooldownMs)){const target=[...combat.living('player')].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id.localeCompare(b.id))[0];if(target){cast(abilities.curse.name,target.id);combat.setTimedEffect(target,'bossCurseAttack',abilities.curse.attackReduction,abilities.curse.durationMs);combat.setTimedEffect(target,'bossCurseDefense',abilities.curse.defenseReduction,abilities.curse.durationMs);combat.setTimedEffect(target,'bossCurseVulnerability',abilities.curse.damageTakenIncrease,abilities.curse.durationMs);combat.log('status',{actorId:boss.id,targetId:target.id,skillName:`${abilities.curse.name}・攻擊 -${Math.round(abilities.curse.attackReduction*100)}%／防禦 -${Math.round(abilities.curse.defenseReduction*100)}%`})}}
  combat.finishIfNeeded();
 };
 const castTigerSkills=(combat:MercenaryRealtimeBattleSystem)=>{if(state.key!=='e_white_tiger_fierce_tiger'||state.status!=='fighting')return;const e=enemy(),tiger=combat.enemies[0];if(!tiger||!tiger.alive||combat.winner)return;state.tigerMp=state.tigerMp??e.mp;state.tigerBleeds=state.tigerBleeds||{};
  // 白虎凶煞：生命低於 40% 後永久進入凶煞，攻速 4 倍並啟用撕裂機率。
  if(!state.tigerRageActive&&tiger.hp<=tiger.maxHp*.4){state.tigerRageActive=true;tiger.attackInterval=Math.max(.05,tiger.attackInterval/4);log('🐯【白虎凶煞】狂虎生命低於 40%，攻擊速度與移動速度提升 300%，近身攻擊有機率撕裂。')}
  // 暴君風吼嘯：12 秒冷卻、5000 MP，對所有存活目標造成 320% 風屬性物理傷害。
  if(state.tigerSlowUntil&&now>=state.tigerSlowUntil){for(const target of combat.players)target.attackInterval=Math.max(.05,target.attackInterval/1.4);state.tigerSlowUntil=0}
  if((state.tigerMp||0)>=5000&&now>=(state.tigerHowlAt||0)){state.tigerMp=(state.tigerMp||0)-5000;state.tigerHowlAt=now+12000;state.tigerSlowUntil=now+5000;state.distance=100;let total=0;for(const target of combat.players.filter(unit=>unit.alive)){const damage=calculateDamage({atk:Math.floor(e.atk*3.2)},{def:target.def},()=>retaliationRoll);target.hp=Math.max(0,target.hp-damage);target.mp=Math.max(0,target.mp*.85);target.attackInterval=Math.max(.05,target.attackInterval*1.4);target.cooldown+=1500;total+=damage;event('enemy',damage,true)}log('🌪️【暴君風吼嘯】狂虎發出震撼山林的長嘯，造成 '+total+' 點風屬性傷害；全隊被擊退、移速降低 40%，持續 5 秒，並吸取 15% 當前魔力。')}
  // 撕裂：凶煞狀態下，狂虎每次近身普攻有 25% 機率附加 3 秒流血。
  const cursor=state.realtimeCursor||0;for(const entry of combat.events.filter(item=>item.id>cursor&&item.type==='attack'&&item.actorId?.startsWith('enemy-')&&item.targetId)){if(state.tigerRageActive&&retaliationRoll<.25){state.tigerBleeds[entry.targetId]={until:now+3000,next:now};log('🩸【撕裂】'+(members.find(member=>member.uid===entry.targetId)?.name||'角色')+' 持續流血 3 秒。')}}
  for(const [uid,bleed] of Object.entries(state.tigerBleeds)){const target=combat.players.find(unit=>unit.id===uid);if(!target||!target.alive||now>=bleed.until){delete state.tigerBleeds[uid];continue}if(now>=bleed.next){const damage=Math.max(1,Math.floor(e.atk*.15));target.hp=Math.max(0,target.hp-damage);bleed.next=now+1000;event('enemy',damage);}}
 };
 if(action==='start'&&state.status==='idle'){
  // 白虎林在超過 5 名傭兵出戰時，敵方能力值由 enemy() 統一套用 2 倍倍率。
  state.key=key;state.enemyHp=DUNGEONS[key].hp;state.stamp=now;state.pauseAt=now;state.normalAt=now;state.skillAt=now;state.enemyShieldAt=now+60000;state.enemyShatterAt=now+30000;state.enemyShieldUntil=0;state.tigerMp=key==='e_white_tiger_fierce_tiger'?enemy().mp:0;state.tigerHowlAt=now+3000;state.tigerRageActive=false;state.tigerSlowUntil=0;state.tigerBleeds={};state.phase='交戰';state.distance=0;state.damageCursor=0;state.status=!allDown()?'fighting':'recovering';log('部隊向前推進，遭遇敵方【'+DUNGEONS[key].name+'大軍】！');
  state.enemyHp=enemy().hp;
  if(enemyCombatMultiplier()===2)log('⚡ 白虎林規則：出戰傭兵超過 5 名，敵方戰鬥能力提升為 2 倍！');
  if(state.status==='fighting'){beginRealtime();settleRealtimeOutcome()}
 }else if(action==='retreat'&&(state.status==='fighting'||state.status==='respawning')){
  state.status='recovering';state.stamp=now;log('撤回漢陽療傷，恢復後再出發。');
 }else if(action==='normal'||action==='skill'){log('即時自動戰鬥中，每名角色會依自己的攻速與 MP 自動行動。')}
 else if(action==='tick'&&((state.status==='respawning'&&now>=state.spawnAt)||(state.status==='recovering'&&now>=(state.innHealAt||state.stamp+2000))||now-state.stamp>=50)){
  // 50ms 遊戲時脈；實際攻擊時間由每名角色自己的 attackInterval 決定。
  const elapsedMs=Math.max(0,now-state.stamp);state.stamp=now;
  if(state.status==='recovering'){
   const inn=recoverAtInn({hp,maxHp:hero.maxHp,status:'客棧中'},state.innHealAt||now,now,healInterval);hp=inn.player.hp;const recoveringHero=heroMember();if(recoveringHero)recoveringHero.hp=hp;state.innHealAt=inn.nextHealAt;
   if(inn.player.status==='正常'){state.status='idle';log('生命值已全滿，離開客棧，商隊可再次出發。')}
 }else if(state.status==='respawning'&&now>=state.spawnAt){
   state.key=state.lockedEnemyKey||pickZoneMonster(state.zone,spawnRoll);state.events=[];state.spawnSerial=(state.spawnSerial||0)+1;state.enemyHp=enemy().hp;state.enemyShieldAt=state.key==='e_lake_gale_altur'?now+60000:0;state.enemyShatterAt=state.key==='e_lake_gale_altur'?now+30000:0;state.enemyShieldUntil=0;state.tigerMp=state.key==='e_white_tiger_fierce_tiger'?enemy().mp:0;state.tigerHowlAt=now+3000;state.tigerRageActive=false;state.tigerSlowUntil=0;state.tigerBleeds={};state.status='fighting';state.phase='交戰';state.distance=0;state.normalAt=Math.max(now,state.normalAt);beginRealtime();log(isBossMonster(enemy().name)?'首領重新出現，商隊立即重新鎖敵。':`下一支 ${state.enemyCount} 隻怪物部隊出現，商隊立即重新鎖敵。`);settleRealtimeOutcome();
  }else if(state.status==='fighting'){
   if(allDown())recover();
   else {if(!state.realtime){beginRealtime();settleRealtimeOutcome()}else{
    // 舊存檔的即時戰鬥沒有傭兵 ID；從仍在隊伍中的角色補回，不重開戰局。
   const restored={...state.realtime,terrain:state.realtime.terrain|| (state.key.startsWith('e_white_tiger_')?'forest':state.zone),players:state.realtime.players.map(unit=>{const member=members.find(item=>item.uid===unit.id),spec=mercenarySpec(member?.templateId);return{...unit,templateId:unit.templateId||member?.templateId,maxMp:unit.maxMp??member?.maxMp,accuracy:unit.accuracy??member?.accuracy,ranged:unit.ranged??spec?.ranged}})};
    const combat=MercenaryRealtimeBattleSystem.fromSnapshot(restored);combat.autoSkill=autoSkill;combat.update(elapsedMs/1000);runBossAbilities(combat);castTigerSkills(combat);syncRealtime(combat);if(combat.winner==='player')victory();else if(combat.winner==='enemy'||combat.winner==='draw')recover()}}
  }
 }
 syncHero();return {state,hp,mp,party:members,xpEarned,killsEarned,reward};
}
