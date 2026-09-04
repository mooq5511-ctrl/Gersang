/** 副本狀態機：純函式，不建立計時器、不改動傳入物件，方便驗證每次結算。 */
export const DUNGEONS = {
 wolf:{name:'幽冥狼',level:10,hp:300,mp:0,atk:15,dex:12,xp:100,gold:80,drop:.2,loot:['staff','armor','helmet','boots']},
 snake:{name:'冥界大蛇',level:40,hp:2500,mp:100,atk:65,dex:30,xp:500,gold:350,drop:.55,loot:['helmet','helmet','boots','boots','staff','armor']},
 king:{name:'閻王',level:80,hp:15000,mp:400,atk:220,dex:60,xp:2400,gold:2000,drop:.9,loot:['armor','armor','staff','staff','helmet','boots']}
} as const;
export type DungeonKey=keyof typeof DUNGEONS;
export type DungeonState={status:'idle'|'fighting'|'respawning'|'recovering';key:DungeonKey;enemyHp:number;normalAt:number;skillAt:number;spawnAt:number;stamp:number;pauseAt?:number;logs:string[];serial:number};
export type DungeonHero={hp:number;mp:number;maxHp:number;maxMp:number;str:number;dex:number;int:number;attack:number;defense:number;staff:boolean};
export const freshDungeon=():DungeonState=>({status:'idle',key:'wolf',enemyHp:300,normalAt:0,skillAt:0,spawnAt:0,stamp:0,logs:[],serial:0});
export const dungeonBusy=(state?:DungeonState)=>!!state&&state.status!=='idle';
export function dungeonStep(old:DungeonState,hero:DungeonHero,action:'tick'|'start'|'normal'|'skill'|'retreat',now:number,key:DungeonKey=old.key,roll=.99,choice=0):{state:DungeonState;hp:number;mp:number;reward:null|{xp:number;gold:number;loot:string|null}}{
 const state={...old,logs:[...old.logs]};let hp=hero.hp,mp=hero.mp;
 let reward:null|{xp:number;gold:number;loot:string|null}=null;
 const log=(message:string)=>{state.logs=[message,...state.logs].slice(0,40)};
 const enemy=()=>DUNGEONS[state.key];
 const recover=()=>{state.status='recovering';log('商隊全滅，撤回漢陽療傷！療傷期間無收益。')};
 // 先切換狀態再產生獎勵，快速連點或同回合後攻都不會重複結算。
 const victory=()=>{state.status='respawning';state.spawnAt=now+1000;state.serial++;const e=enemy();reward={xp:e.xp,gold:e.gold,loot:roll<e.drop?e.loot[Math.min(e.loot.length-1,Math.max(0,Math.floor(choice*e.loot.length)))]:null};log('成功擊敗 '+e.name+'！獲得 '+e.xp+' 經驗與 '+e.gold+' 兩。')};
 const hit=(skill=false)=>{
  if(state.status!=='fighting')return;
  if(skill){if(mp<40||now<state.skillAt)return;mp-=40;state.skillAt=now+3000}
  else{if(now<state.normalAt)return;state.normalAt=now+1000}
  const damage=Math.max(1,Math.floor(skill?(hero.int*8+hero.attack*3)*(hero.staff?2:1):hero.str*2+hero.attack));
  state.enemyHp=Math.max(0,state.enemyHp-damage);log((skill?'主角施放了 [蛇龍出水]':'主角普通攻擊')+'，造成 '+damage+' 點傷害！');
  if(!state.enemyHp)victory();
 };
 const counter=()=>{if(state.status!=='fighting')return;const damage=Math.max(1,enemy().atk-hero.defense);hp=Math.max(0,hp-damage);log(enemy().name+' 攻擊，受到 '+damage+' 點傷害。');if(!hp)recover()};
 if(action==='start'&&state.status==='idle'){
  state.key=key;state.enemyHp=DUNGEONS[key].hp;state.stamp=now;state.pauseAt=now;state.normalAt=now;state.skillAt=now;state.status=hp>0?'fighting':'recovering';log('挑戰 '+DUNGEONS[key].name+'。');
 }else if(action==='retreat'&&(state.status==='fighting'||state.status==='respawning')){
  state.status='recovering';state.stamp=now;log('撤回漢陽療傷，恢復後再出發。');
 }else if(action==='normal')hit();
 else if(action==='skill')hit(true);
 else if(action==='tick'&&now-state.stamp>=1000){
  // 每個前景秒只推進一次，不補發離線戰鬥與掉寶，避免背景頁突然連吃多次傷害。
  state.stamp=now;
  if(state.status==='recovering'){
   hp=Math.min(hero.maxHp,hp+Math.max(1,Math.ceil(hero.maxHp*.08)));mp=Math.min(hero.maxMp,mp+Math.max(1,Math.ceil(hero.maxMp*.08)));
   if(hp===hero.maxHp&&mp===hero.maxMp){state.status='idle';log('療傷完成，商隊可再次出發。')}
  }else if(state.status==='respawning'&&now>=state.spawnAt){
   state.enemyHp=enemy().hp;state.status='fighting';state.normalAt=now;log(enemy().name+' 再次現身。');
  }else if(state.status==='fighting'){
   if(hp<=0)recover();
   else if(hero.dex>=enemy().dex){hit();counter()}else{counter();hit()}
  }
 }
 return {state,hp,mp,reward};
}
