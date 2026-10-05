// Read-only synthetic investment audit. No saves, natural income or acquisition claims.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {curveFixture} from './measure-equipment-curve.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {officialGems}=require('../data/items/official-gems.ts');
const {socketGemAction}=require('../app/game-inventory-actions.ts');
const {combatStats,vitalStats}=require('../app/vitals-engine.ts');
const {v1Definition}=require('../app/equipment-v1-policy.ts');
const stats=unit=>{const c=combatStats(unit),v=vitalStats(unit);return {attack:c.attack,defense:c.defense,maxHp:v.maxHp,maxMp:v.maxMp,intelligence:v.intelligence,speed:c.speed,accuracy:c.accuracy};};
export function auditLiveGemInvestment(level,role,gemId,grade,amount){
  if(!['hero','spear'].includes(role)||!Number.isInteger(grade)||grade<0||grade>2||!Number.isInteger(amount)||amount<0||amount>100)throw new RangeError('Invalid audit request');
  const gem=officialGems.find(item=>item.id===gemId);
  if(!gem)throw new RangeError('Unknown gem');
  const fixture=curveFixture(level,'spear','live',level,'普通',0,null,true);
  const unit=structuredClone(fixture.units[role==='hero'?0:1]);
  if(Object.values(unit.equip).some(item=>!v1Definition(item)))throw new Error('Non-live equipment in audit');
  const core=stats(unit),slots=Object.keys(unit.equip),budget=gem.costs[grade]*amount*slots.length;
  let game=freshGame('寶石投資審計');
  game={...game,gold:budget,...(role==='hero'?{hero:unit}:{mercs:[unit]})};
  for(const slot of slots)if(amount)game=socketGemAction(game,unit.uid,slot,gem.id,grade,amount,(logs,message)=>[message,...logs],()=>{});
  const result=role==='hero'?game.hero:game.mercs[0];
  return {level,role,gemId,grade,amount,slots:slots.length,spent:budget-game.gold,gemCount:Object.values(result.equip).reduce((sum,item)=>sum+(item.socketGem?.count||0),0),core,effective:stats(result)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const rows=[1,12,20,72,162,250].flatMap(level=>['hero','spear'].flatMap(role=>officialGems.flatMap(gem=>[0,1,2].flatMap(grade=>[0,1,3,5,10,25,50,100].map(amount=>auditLiveGemInvestment(level,role,gem.id,grade,amount))))));
  console.log(JSON.stringify({conditions:'Actual V1 factory equipment and real socket action, ordinary eight-slot gear. Synthetic unlocked spear rank and supplied gold. Not natural progression, a save, or battle outcome. Both core and effective stats use current runtime readers.',rows},null,2));
}
