import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},fileName:filename}).outputText,filename);
require.extensions['.tsx']=require.extensions['.ts'];
const {MERCENARY_STAGES,getMercenaryStats}=require('../app/mercenary-growth-v1.ts');
const {promoteMercenaryV1,normalizePromotionV1,backupBeforePromotionMigration}=require('../app/mercenary-promotion-v1.ts');
const {WAR_SEALS,rollWarSeal,awardWarSeal,claimPendingWarSeals,settleRelicWarSeal}=require('../app/war-seals.ts');
const {grantXp,xpNeed,unitPower}=require('../app/game-progression.ts');
const {combatStats,vitalStats}=require('../app/vitals-engine.ts');
const {merchantMercenaries}=require('../app/mercenary-roster.ts');
const {sellAllMaterials}=require('../app/village-exchange.ts');
const {ItemTooltipManager}=require('../app/item-tooltip-manager.ts');
const {freshTerritory}=require('../app/guild-territory.ts');
const {freshDungeon}=require('../app/dungeon-engine.ts');
const {runDungeonAction}=require('../app/game-battle-actions.ts');
const {settleCurrentGame}=require('../app/game-loop.ts');
const spear=merchantMercenaries.find(s=>s.id==='spear');
const unit=(level=1,promotionStage=1)=>({uid:'spear-test',templateId:'merchant-spear',name:'朝鮮槍兵',tier:1,promotionStage,level,xp:0,points:0,str:spear.ratings[1],vit:spear.ratings[0],agi:spear.ratings[3],intel:10,equip:{},hp:100,mp:40,role:'近戰',skill:spear.active});
const state=(member=unit())=>({hero:{uid:'hero',name:'隊長'},mercs:[member],restingMercs:[],active:[member.uid],materials:Object.fromEntries(WAR_SEALS.map(s=>[s.name,2])),logs:[],battleLogs:[],trade:{},gold:123});
function reference(level){let atk=10,def=5,hp=100;for(let n=2;n<=level;n++){const s=MERCENARY_STAGES.find(s=>n>=s.minLevel&&n<=s.maxLevel);if(n===s.minLevel){atk*=s.multiplier;def*=s.multiplier;hp*=s.multiplier;}else if(s.stage===8){atk*=1.025;def*=1.025;hp*=1.025;}else{atk+=s.growth.atk;def+=s.growth.def;hp+=s.growth.hp;}}return{atk:Math.floor(atk),def:Math.floor(def),hp:Math.floor(hp)};}
test('all 250 levels match supplied formula with final-only rounding and bounded inputs',()=>{
 assert.deepEqual(MERCENARY_STAGES.map(s=>[s.minLevel,s.maxLevel,s.multiplier]),[[1,11,1],[12,35,1.5],[36,55,1.8],[56,71,2.2],[72,111,1.6],[112,161,1.8],[162,211,2],[212,250,2.2]]);
 assert.deepEqual(MERCENARY_STAGES.slice(0,7).map(s=>[s.growth.atk,s.growth.def,s.growth.hp]),[[2,1,20],[5,2,40],[12,5,110],[32,14,300],[70,30,650],[200,84,1900],[800,330,7500]]);
 for(let level=1;level<=250;level++){const actual=getMercenaryStats(level);for(const key of ['atk','def','hp'])assert.equal(actual[key],reference(level)[key],`Lv.${level} ${key}`);}
 assert.equal(getMercenaryStats(0).level,1);assert.equal(getMercenaryStats(NaN).level,1);assert.equal(getMercenaryStats(999).level,250);
 assert.deepEqual(MERCENARY_STAGES.map(s=>s.leadership),[5,10,20,30,45,60,80,100]);
});
for(const [index,next] of MERCENARY_STAGES.entries()){if(index===0)continue;test(`Lv.${next.minLevel-1} → ${next.minLevel}: XP gate, exact stats and single paid promotion`,()=>{
 const original=unit(next.minLevel-1,index),atGate=grantXp(original,xpNeed(original.level)+777);
 assert.equal(atGate.level,next.minLevel);assert.equal(atGate.promotionStage,index);assert.equal(atGate.xp,777);
 assert.equal(grantXp(atGate,999999999999).level,next.minLevel);
 assert.equal(combatStats(atGate).attack,getMercenaryStats(next.minLevel-1).atk);
 const before=state(atGate),snapshot=JSON.stringify(before),seal=WAR_SEALS[index-1],promoted=promoteMercenaryV1(before,atGate.uid,next.stage);
 assert.equal(JSON.stringify(before),snapshot);assert.equal(promoted.materials[seal.name],1);assert.equal(promoted.mercs[0].promotionStage,next.stage);
 assert.equal(promoted.mercs[0].level,next.minLevel);assert.equal(promoted.mercs[0].xp,777);assert.equal(promoted.mercs[0].equip,atGate.equip);assert.equal(promoted.gold,123);assert.equal(promoted.hero,before.hero);
 assert.equal(combatStats(promoted.mercs[0]).attack,getMercenaryStats(next.minLevel).atk);assert.equal(combatStats(promoted.mercs[0]).defense,getMercenaryStats(next.minLevel).def);assert.equal(vitalStats(promoted.mercs[0]).maxHp,getMercenaryStats(next.minLevel).hp);
 assert.ok(promoted.battleLogs.some(log=>log.message.includes('傭兵轉職')));
 assert.deepEqual(promoteMercenaryV1(promoted,atGate.uid,next.stage).materials,promoted.materials);
 const remaining=grantXp({...promoted.mercs[0],xp:xpNeed(next.minLevel)},0);assert.equal(remaining.level,next.minLevel+1);
});}
test('failed promotions never consume seals or skip ranks, including busy and retired units',()=>{
 for(const change of [s=>{s.mercs[0].level=11},s=>{s.materials['長槍兵符']=0},s=>{s.dungeon={status:'fighting'}},s=>{s.relicDungeon={status:'boss'}},s=>{s.trade={caravan:{escortIds:['spear-test']}}},s=>{s.relicDungeon={status:'dispatching',dispatchPartyUids:['spear-test']}}]){const s=state(unit(12));change(s);const n=promoteMercenaryV1(s,'spear-test',2);assert.deepEqual(n.materials,s.materials);assert.equal(n.mercs,s.mercs);}
 for(const level of [NaN,Infinity,-1]){const bad=state(unit(level));assert.deepEqual(promoteMercenaryV1(bad,'spear-test',2).materials,bad.materials);}
 const s=state(unit(250));assert.deepEqual(promoteMercenaryV1(s,'spear-test',8).materials,s.materials);
 const idle=state(unit(12));idle.restingMercs=idle.mercs;idle.mercs=[];assert.equal(promoteMercenaryV1(idle,'spear-test',2).restingMercs[0].promotionStage,2);
 assert.equal(promoteMercenaryV1(state(unit(250,8)),'spear-test',8).mercs[0].promotionStage,8);
});
test('sources award only complete seals, preserve full-bag overflow and retain unsellable tokens',()=>{
 assert.equal(rollWarSeal('e_starter_raccoon',0).stage,2);assert.equal(rollWarSeal('e_lake_red_thief',0).stage,3);
 assert.equal(rollWarSeal('e_starter_black_bandit',0).stage,4);assert.equal(rollWarSeal('e_lake_gale_altur',0).stage,5);
 assert.equal(rollWarSeal('relic_sunken_king',.03,'relic').stage,6);
 assert.equal(rollWarSeal('relic_sunken_king',.05,'relic'),undefined);assert.equal(rollWarSeal('e_starter_raccoon',NaN),undefined);
 const s={materials:{皮革:2},logs:[],battleLogs:[]},full=awardWarSeal(s,'長槍兵符',1);assert.deepEqual(full.materials,s.materials);assert.equal(full.pendingWarSeals['長槍兵符'],1);
 assert.ok(full.battleLogs.some(log=>log.message.includes('稀有掉落')));assert.equal(claimPendingWarSeals(full,1),full);
 const claimed=claimPendingWarSeals(full,2);assert.equal(claimed.materials['長槍兵符'],1);assert.equal(claimPendingWarSeals(claimed,2),claimed);
 const stack=awardWarSeal(claimed,'長槍兵符',2);assert.equal(stack.materials['長槍兵符'],2);
 assert.equal(sellAllMaterials(stack.materials,0).materials['長槍兵符'],2);
});
test('relic clearance awards one seal; idle/repeated settlement awards none',()=>{
 const s={materials:{},logs:[]},won=settleRelicWarSeal(s,{clearedRuns:0},{clearedRuns:1},0,.99);assert.equal(won.materials['修羅兵符'],1);
 assert.equal(settleRelicWarSeal(won,{clearedRuns:1},{clearedRuns:1},0,0),won);
});
test('direct rates and boundaries match the approved table without a second conditional lottery',()=>{
 const cases=[['e_starter_raccoon',2,.03],['e_raccoon',2,.03],['e_mad_cow',2,.03],['e_amakusa',3,.02],['e_undersea_king',3,.02],['e_lake_red_thief',3,.02],['e_japan_sea_kappa',3,.02],['e_white_tiger_soul_eater',4,.01],['e_sumeru_training_thunder_beast',4,.01],['e_starter_black_bandit',4,.01],['e_lake_gale_altur',5,.03]];
 for(const [id,rank,rate]of cases){assert.equal(rollWarSeal(id,rate-.000001)?.stage,rank,id);assert.equal(rollWarSeal(id,rate),undefined,id);const count=Array.from({length:10000},(_,n)=>rollWarSeal(id,(n+.5)/10000)).filter(Boolean).length;assert.equal(count,rate*10000,id);}
 const {RELIC_BOSS_IDS}=require('../data/monsters/relic-dungeon-monsters.ts');
 for(const id of RELIC_BOSS_IDS){const counts={};for(let n=0;n<10000;n++){const seal=rollWarSeal(id,(n+.5)/10000,'relic');if(seal)counts[seal.stage]=(counts[seal.stage]||0)+1;}assert.deepEqual(counts,{5:300,6:200},id);assert.equal(rollWarSeal(id,.029999,'relic').stage,5);assert.equal(rollWarSeal(id,.03,'relic').stage,6);assert.equal(rollWarSeal(id,.049999,'relic').stage,6);assert.equal(rollWarSeal(id,.05,'relic'),undefined);}
});
test('unknown sources, early Bosses and unopened ranks cannot leak into the new drop pools',()=>{
 const {sourceEnemyDefinitions}=require('../data/monsters/world-map-enemies.ts'),{RELIC_MONSTER_LIST}=require('../data/monsters/relic-dungeon-monsters.ts');
 for(const id of ['normal','boss','relic-boss','future-final-boss','e_starter_pirate_king','e_korea_field_flying_tiger'])assert.equal(rollWarSeal(id,0),undefined,id);
 assert.equal(rollWarSeal('e_korea_field_deer',0).stage,2,'newly playable low-level field monsters use the existing early seal pool');
 for(const roll of [NaN,Infinity,-.01,1])assert.equal(rollWarSeal('e_starter_raccoon',roll),undefined);
 for(const enemy of sourceEnemyDefinitions){const seal=rollWarSeal(enemy.id,0);assert.ok(!seal||seal.stage<=5);assert.equal(rollWarSeal(enemy.id,0,'relic'),undefined);}
 for(const enemy of RELIC_MONSTER_LIST){assert.equal(rollWarSeal(enemy.id,0),undefined);if(enemy.kind!=='Boss')assert.equal(rollWarSeal(enemy.id,0,'relic'),undefined);}
 for(const seal of WAR_SEALS.filter(s=>s.stage>=7)){assert.equal(seal.available,false);assert.match(seal.source,/來源尚未開放/);}
 assert.deepEqual(WAR_SEALS.map(s=>s.rate),[.03,.02,.01,.03,.02,.01,.005]);
 const s={materials:{},logs:[]};assert.equal(settleRelicWarSeal(s,{clearedRuns:0,bossMonsterId:'future-final-boss'},{clearedRuns:1},0,0),s);
});
test('unopened sources do not wipe already owned or pending high-rank seals',()=>{
 const s={materials:{'天魔兵符':2},logs:[],pendingWarSeals:{'軒轅將神兵符':3}},claimed=claimPendingWarSeals(s);
 assert.equal(claimed.materials['天魔兵符'],2);assert.equal(claimed.materials['軒轅將神兵符'],3);
 const ready={...state(unit(212,7)),materials:claimed.materials},promoted=promoteMercenaryV1(ready,'spear-test',8);
 assert.equal(promoted.mercs[0].promotionStage,8);assert.equal(promoted.materials['軒轅將神兵符'],2);
});
test('all existing relic bosses hook their real clearance into V1 high-rank seals exactly once',()=>{
 const {freshRelicDungeon,relicDungeonAction}=require('../app/relic-dungeon.tsx'),{RELIC_BOSS_IDS}=require('../data/monsters/relic-dungeon-monsters.ts');
 for(const [index,id]of RELIC_BOSS_IDS.entries()){
  const before={...freshRelicDungeon(1000000),status:'boss',bossMonsterId:id,bossHp:1,bossMaxHp:1000,hp:1000000,maxHp:1000000,partyCount:2,partyPower:1000000,clearedRuns:index};
  const after=relicDungeonAction(before,'attack-boss',1000000,{maxHp:1000000,currentHp:1000000,partyPower:1000000,partyNames:['隊長','槍兵'],partyReady:true});
  assert.equal(after.status,'cleared',id);assert.equal(after.clearedRuns,before.clearedRuns+1);
  const awarded=settleRelicWarSeal({materials:{},logs:[]},before,after,.03,.7);assert.equal(awarded.materials['御皇兵符'],1);
  const replay=relicDungeonAction(after,'attack-boss',1000000);assert.equal(settleRelicWarSeal(awarded,after,replay,0,.7),awarded);
 }
});
for(const key of ['e_starter_black_bandit','e_starter_pirate_king','e_lake_gale_altur','e_japan_sea_golden_starfish'])test(`actual ${key} victory uses its source-specific seal pool`,()=>{
 const hero={uid:'hero',templateId:'hero',name:'隊長',level:1,xp:0,points:0,str:500000,agi:20,vit:500000,intel:20,maxHp:1000000,hp:1000000,equip:{},status:'正常',position:'前排'};
 let s={hero,mercs:[],active:[],territory:freshTerritory(),kills:0,starterDeliveryKills:0,logs:[],battleLogs:[],gold:0,inventory:[],materials:{},npcProgress:{activeQuests:[]},dungeon:freshDungeon(),trade:{}};
 if(key==='e_starter_pirate_king'){s.hero.level=20;s.restingMercs=[];s.npcProgress.completedQuests=['npc-first-caravan-delivery'];s.territory.buildings.waystation=1;s.firstGreenEquipped=true;}
 const rolls={roll:.99,choice:0,spawnRoll:0,encounterCountRoll:0,retaliationRoll:.99,materialRolls:[1,1,1],gearDropRoll:1,sealDropRoll:0,sealChoiceRoll:0},deps={addLog:(logs,text)=>[text,...logs],grantXp,enterInn:s=>s,leaveInn:s=>s};
 s=runDungeonAction(s,'start',1000,key,rolls,deps);for(let now=1200;now<20000&&!s.kills;now+=200)s=runDungeonAction(s,'tick',now,undefined,rolls,deps);
 assert.equal(s.kills,1);assert.equal(s.materials['精銳兵符'],key==='e_starter_black_bandit'?1:undefined);assert.equal(s.materials['修羅兵符'],['e_lake_gale_altur','e_japan_sea_golden_starfish'].includes(key)?1:undefined);assert.equal(s.materials['長槍兵符'],undefined);
});
test('old spear saves get a safe unpaid stage, preserve other units and backup exactly once',()=>{
 const old={...unit(40),promotionStage:undefined,tier:3,xp:777,points:4},n=normalizePromotionV1(old);assert.equal(n.promotionStage,1);assert.equal(n.tier,3);assert.equal(n.level,40);assert.equal(n.xp,777);assert.equal(n.equip,old.equip);
 assert.deepEqual(normalizePromotionV1(n),n);const archived={...old,templateId:'merchant-shaman'};assert.equal(normalizePromotionV1(archived),archived);
 assert.equal(normalizePromotionV1({...old,level:300}).level,250);
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},raw=JSON.stringify(state(old));backupBeforePromotionMigration(storage,'slot',raw);assert.equal(data.get('slot:before-mercenary-promotion-v1'),raw);backupBeforePromotionMigration(storage,'slot','{}');assert.equal(data.get('slot:before-mercenary-promotion-v1'),raw);
 assert.throws(()=>backupBeforePromotionMigration({getItem:()=>null,setItem:()=>{throw Error('full')}},'slot',raw),/full/);
});
test('real restore defaults absent tokens and persists promotion data without deleting archived mercenaries',()=>{
 const {freshGame}=require('../app/game-hero-factory.ts'),{restoreGame}=require('../app/game-profile-storage.ts'),{serializeGameForStorage}=require('../app/game-state.ts');
 const original=freshGame('存檔測試'),old=unit(40);delete old.promotionStage;
 const other={...unit(20),uid:'archived',templateId:'merchant-shaman'};
 original.mercs=[old,other];original.active=['spear-test','archived'];original.materials={皮革:3,'長槍兵符':-1};
 const snapshot=JSON.stringify(original),restored=restoreGame(JSON.parse(snapshot));
 assert.deepEqual(restored.mercs.map(u=>u.uid),['spear-test','archived']);assert.equal(restored.mercs[0].promotionStage,1);assert.equal(restored.mercs[0].level,40);assert.equal(restored.hero.name,'存檔測試');assert.equal(restored.materials['長槍兵符'],0);assert.equal(restored.materials.皮革,3);assert.equal(JSON.stringify(original),snapshot);
 restored.mercs[0].promotionStage=2;restored.materials['長槍兵符']=4;restored.pendingWarSeals={'修羅兵符':2};
 const reload=restoreGame(JSON.parse(serializeGameForStorage(restored)));assert.equal(reload.mercs[0].promotionStage,2);assert.equal(reload.materials['長槍兵符'],4);assert.equal(reload.materials['修羅兵符'],2);
});
test('tooltip exposes use, level, real source and owned quantity for all seven seals',()=>{
 for(const seal of WAR_SEALS){const tip=ItemTooltipManager.material(seal.name,3,0,[]);assert.equal(tip.owned,3);assert.equal(tip.kind,'完整兵符');assert.equal(tip.source,seal.source);assert.ok(JSON.stringify(tip).includes(`Lv.${seal.level}`));assert.match(tip.description,/消耗 1 枚/);}
});
test('rendered seal tooltip actually shows its required level, purpose, source and quantity',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{EquipmentTooltipCard}=require('../app/equipment-tooltip-card.tsx');
 for(const seal of WAR_SEALS){const html=renderToStaticMarkup(React.createElement(EquipmentTooltipCard,{data:ItemTooltipManager.material(seal.name,3,0,[]),left:0,top:0,rarityClass:'rare'}));assert.ok(html.includes(`Lv.${seal.level}`));assert.ok(html.includes('目前持有'));assert.ok(html.includes('×3'));assert.ok(html.includes(seal.source));assert.ok(html.includes('消耗 1 枚'));}
 const inventory=readFileSync(new URL('../app/inventory-panel.tsx',import.meta.url),'utf8');assert.match(inventory,/typeof document!=='undefined'&&createPortal/);assert.match(inventory,/,document\.body\)/);
});
test('V1 actual combat/power use growth stats, equipment and existing allocated attributes',()=>{
 const base=unit(72,5),equipped={...base,equip:{weapon:{atk:30,def:20,hp:50}}};assert.ok(unitPower(equipped)>unitPower(base));assert.equal(combatStats(equipped).attack-combatStats(base).attack,30);assert.equal(vitalStats(equipped).maxHp-vitalStats(base).maxHp,50);
 assert.ok(combatStats({...base,str:base.str+20}).attack>combatStats(base).attack);
 assert.equal(grantXp(unit(250,8),100000).level,250);
});
test('real Auto Hunt respawn and tick deliver one rare seal per victory without replay duplication',()=>{
 const hero={uid:'hero',templateId:'hero',name:'隊長',level:1,xp:0,points:0,str:500,agi:20,vit:500,intel:20,maxHp:5000,hp:5000,equip:{},status:'正常',position:'前排'};
 const {freshGame}=require('../app/game-hero-factory.ts');
 let s={...freshGame('Auto Hunt'),hero,hanyangPrologueStep:'completed',idleStamp:1000,dungeon:{...freshDungeon(),autoHunt:true}};
 const rolls={now:1000,roll:.99,choice:0,spawnRoll:0,encounterCountRoll:0,retaliationRoll:.99,materialRolls:[1,1,1],gearDropRoll:1,sealDropRoll:0,sealChoiceRoll:0},deps={addLog:(logs,text)=>[text,...logs],grantXp,enterInn:s=>s,leaveInn:s=>s};
 s=runDungeonAction(s,'start',1000,'e_starter_raccoon',rolls,deps);
 for(let now=1200;now<20000&&s.kills<2;now+=200)s=settleCurrentGame(s,{...rolls,now});
 assert.equal(s.kills,2);assert.equal(s.materials['長槍兵符'],2);assert.equal(s.dungeon.autoHunt,true);assert.equal(s.battleLogs.filter(log=>log.message.includes('稀有掉落：長槍兵符')).length,2);
 const next=runDungeonAction(s,'tick',s.dungeon.stamp+1,undefined,rolls,deps);assert.equal(next.materials['長槍兵符'],2);
});
