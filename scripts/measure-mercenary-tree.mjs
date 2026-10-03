// Read-only playtest harness: isolated fixtures, real engines, no production save writes.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},fileName:f}).outputText,f);
require.extensions['.tsx']=require.extensions['.ts'];
const {freshGame}=require('../app/game-hero-factory.ts');
const {promoteMercenaryV1}=require('../app/mercenary-promotion-v1.ts');
const {ALL_WAR_SEALS}=require('../app/war-seals.ts');
const {MERCENARY_STAGES}=require('../app/mercenary-growth-v1.ts');
const {merchantMercenaries}=require('../app/mercenary-roster.ts');
const {combatStats,vitalStats,normalizeVitals}=require('../app/vitals-engine.ts');
const {unitPower,grantXp}=require('../app/game-progression.ts');
const {runDungeonAction}=require('../app/game-battle-actions.ts');
const {freshDungeon}=require('../app/dungeon-engine.ts');
const {freshRelicDungeon,relicDungeonAction}=require('../app/relic-dungeon.tsx');
const deps={addLog:(logs,msg)=>[...logs,msg],grantXp,enterInn:s=>s,leaveInn:s=>s};
function fixture(branch,level,count=6){
 let s=freshGame('比較');s.hanyangPrologueStep='completed';s.autoSkill=true;s.hero=normalizeVitals({...s.hero,level,maxHp:100+(level-1)*20,hp:undefined,mp:undefined});s.materials=Object.fromEntries(ALL_WAR_SEALS.map(x=>[x.name,100]));
 const spec=merchantMercenaries[0];s.mercs=Array.from({length:count},(_,i)=>({uid:'m'+i,templateId:'merchant-spear',nation:'legacy',tier:1,promotionStage:1,name:'槍兵',level,xp:0,points:(level-1)*3,str:spec.ratings[1],agi:spec.ratings[3],vit:spec.ratings[0],intel:10,equip:{},role:spec.role,skill:spec.active,position:'前排'}));s.active=s.mercs.map(x=>x.uid);
 for(const stage of MERCENARY_STAGES.slice(1).filter(x=>x.minLevel<=level))for(const u of s.mercs)s=promoteMercenaryV1(s,u.uid,stage.stage,branch);
 s.mercs=s.mercs.map(u=>normalizeVitals({...u,hp:undefined,mp:undefined}));s.dungeon=freshDungeon();return s;
}
function world(branch,level,key,seed,count=6,encounterCountRoll=.25){
 let s=fixture(branch,level,count),randomState=seed;const rand=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296};
 const rolls=()=>({roll:rand(),choice:rand(),spawnRoll:rand(),encounterCountRoll,retaliationRoll:rand(),materialRolls:[1,1,1],gearDropRoll:1,sealDropRoll:1});
 const hpStart=vitalStats(s.hero).hp+s.mercs.reduce((n,u)=>n+vitalStats(u).hp,0);s=runDungeonAction(s,'start',1000,key,rolls(),deps);let now=1000;
 for(;now<181000&&s.dungeon.status==='fighting';now+=100)s=runDungeonAction(s,'tick',now,undefined,rolls(),deps);
 const events=s.dungeon.realtime?.events||[];return{branch,level,key,seed,count,encounterCountRoll,win:s.kills>0&&(s.dungeon.status==='respawning'||s.dungeon.status==='idle'),kills:s.kills,status:s.dungeon.status,seconds:Math.round((now-1000)/100)/10,hpLost:hpStart-vitalStats(s.hero).hp-s.mercs.reduce((n,u)=>n+vitalStats(u).hp,0),alive:s.mercs.filter(u=>vitalStats(u).hp>0).length,skills:[...new Set(events.filter(e=>e.type==='skill').map(e=>e.skillName))]};
}
function boss(branch,level){const s=fixture(branch,level),party=[s.hero,...s.mercs],maxHp=party.reduce((n,u)=>n+vitalStats(u).maxHp,0),power=party.reduce((n,u)=>n+unitPower(u),0),ctx={maxHp,currentHp:maxHp,partyPower:power,partyEquipmentScore:0,partyNames:party.map(x=>x.name),partyReady:true};let r={...freshRelicDungeon(maxHp),status:'ready',progress:100,bossUnlocked:true,partyPower:power,partyCount:party.length,partyNames:ctx.partyNames};r=relicDungeonAction(r,'challenge-boss',power,ctx);for(let n=0;n<200&&r.status==='boss';n++)r=relicDungeonAction(r,'attack-boss',power,ctx);return{branch,level,power,maxHp,status:r.status,turns:r.bossTurn,hp:r.hp,bossHp:r.bossHp};}
const output={conditions:'Hero + 6 mercenaries, same levels and unspent attribute points, no equipment, full HP/MP; branches differ only in promotion effects and initial position. Same supplied seed per pair. World encounters count roll=.25; actual elapsed engine time, not wall-clock play.',world:[],boss:[]};
if(process.argv.includes('--black-bandit')){
 output.conditions='Read-only actual-engine diagnostic; hero + one spear, both Lv.1/3/6, full HP/MP, no equipment or allocated points; autoSkill on; fixed one or two black bandits. Not a natural player save.';
 for(const level of [1,3,6])for(const roll of [0,.75])for(let seed=1;seed<=30;seed++)output.world.push(world('spear',level,'e_starter_black_bandit',seed,1,roll));
}else{
for(const level of [12,36])for(const key of ['e_starter_raccoon','e_starter_black_bandit','e_starter_hook_pirate'])for(const seed of [1,2,3,4,5])for(const branch of ['spear','bow'])output.world.push(world(branch,level,key,seed));
for(const level of [36,72])for(const key of ['e_lake_red_thief_chief','e_lake_gale_altur'])for(const seed of [1,2,3,4,5])for(const branch of ['spear','bow'])output.world.push(world(branch,level,key,seed));
for(const level of [12,36,72,112])for(const branch of ['spear','bow'])output.boss.push(boss(branch,level));
}
console.log(JSON.stringify(output,null,2));
