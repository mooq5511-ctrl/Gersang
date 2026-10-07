// Supplied combat fixtures, NOT earned resources, natural pacing or a player save.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import {curveFixture} from './measure-equipment-curve.mjs';
const require=createRequire(import.meta.url);
const {unitPower}=require('../app/game-progression.ts');
const {vitalStats}=require('../app/vitals-engine.ts');
const {relicEquipmentScore}=require('../app/relic-party.ts');
const {RELIC_BOSS_IDS,RELIC_DUNGEON_MONSTERS}=require('../data/monsters/relic-dungeon-monsters.ts');
const source=readFileSync(new URL('../app/relic-dungeon.tsx',import.meta.url),'utf8');
const pure=source.slice(source.indexOf('const RELIC_ROOMS'),source.indexOf('export function RelicDungeonPanel'));
export const RELIC_BRIDGE_CANDIDATES=[
  {level:24,hp:14000,atk:120},
  {level:40,hp:42000,atk:420},
  {level:56,hp:120000,atk:1100},
  {level:72,hp:300000,atk:2600},
];

export function measureRelicBridge({floor=0,level=24,count=2,branch='spear',gear='live',rank, candidate=false}={}) {
  const boss={...RELIC_DUNGEON_MONSTERS[RELIC_BOSS_IDS[floor]],...(candidate?RELIC_BRIDGE_CANDIDATES[floor]:{})};
  const unit={...curveFixture(level,branch,gear,level,'普通',0,null,true).units[1]};
  if(rank!==undefined)unit.promotionStage=rank;
  const units=Array.from({length:count},(_,index)=>({...unit,uid:`audit-${index}`}));
  const power=units.reduce((sum,member)=>sum+unitPower(member),0);
  const hp=units.reduce((sum,member)=>sum+vitalStats(member).maxHp,0);
  const quality=units.reduce((sum,member)=>sum+relicEquipmentScore(member),0);
  const context=vm.createContext({Math,RELIC_DUNGEON_MONSTERS:{...RELIC_DUNGEON_MONSTERS,[boss.id]:boss},relicBossForRun:()=>boss,relicMonsterForProgress:()=>RELIC_DUNGEON_MONSTERS.relic_moss_warden});
  vm.runInContext(ts.transpileModule(pure.replace(/^export /gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  let state=context.relicDungeonAction(context.freshRelicDungeon(hp),'challenge-boss',power,{partyReady:true,partyNames:units.map(()=>unit.name),partyUids:units.map(member=>member.uid),maxHp:hp,currentHp:hp,partyPower:power,partyEquipmentScore:quality});
  for(let turn=0;state.status==='boss'&&turn<200;turn++)state=context.relicDungeonAction(state,'attack-boss',power);
  return {floor:floor+1,level,count,branch,gear,rank:unit.promotionStage,candidate,power,hp,quality,bossHp:state.bossMaxHp,bossAttack:boss.atk,status:state.status,turns:state.bossTurn,remainingHp:state.hp,hpFraction:state.hp/hp};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const rows=[];
  for(const candidate of [false,true])for(const floor of [0,1,2,3]){
    const level=RELIC_BRIDGE_CANDIDATES[floor].level;
    for(const branch of ['spear','bow'])for(const count of [1,2,3])rows.push(measureRelicBridge({candidate,floor,level,count,branch}));
  }
  rows.push(...[12,20,24].flatMap(level=>['empty','live'].map(gear=>measureRelicBridge({candidate:true,level,count:2,gear}))));
  console.log(JSON.stringify({conditions:'Actual V1 stats and ordinary full gear; supplied ranks/gear, unallocated points, no potions or healing, resting mercenaries only (no hero). Same deterministic production round formula. Candidate bosses stay VM-local; no live data/save edits.',rows},null,2));
}
