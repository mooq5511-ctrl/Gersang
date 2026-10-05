// Actual gem actions and stat resolvers; candidate outcome limits are PREVIEW ONLY.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {curveFixture} from './measure-equipment-curve.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {officialGems}=require('../app/v17-content.ts');
const {socketGemAction}=require('../app/game-inventory-actions.ts');
const {combatStats,vitalStats}=require('../app/vitals-engine.ts');
const {previewSpecialStatBudget,draftPartyEquipmentXpMultiplier}=require('../app/equipment-special-budget-draft.ts');
const {equipmentExperienceMultiplier}=require('../app/dungeon-kill-xp.ts');
const {rollEnhancementMilestoneBonus}=require('../app/guild-territory.ts');
export const resolvedSpecialStats=unit=>{
  const combat=combatStats(unit),vital=vitalStats(unit);
  return {attack:combat.attack,defense:combat.defense,maxHp:vital.maxHp,maxMp:vital.maxMp};
};
export function auditFullGemLoadout(level,gemId,grade=2){
  const gem=officialGems.find(item=>item.id===gemId);
  if(!gem||!Number.isInteger(grade)||grade<0||grade>2)throw new RangeError('Unknown gem/grade');
  let game=freshGame('特殊裝備審計');
  const fixture=curveFixture(level,'spear','candidate',level,'普通',0,null,true);
  game.hero={...game.hero,...fixture.units[0],equip:Object.fromEntries(Object.entries(fixture.units[0].equip).map(([slot,item])=>[slot,{...item,name:`測試 ${item.part}`,image:'',magic:[],bonus:{str:0,agi:0,vit:0,intel:0},resist:{physical:0,magic:0}}]))};
  const core=resolvedSpecialStats(game.hero),cost=gem.costs[grade]*100*8;
  game.gold=cost;
  for(const slot of Object.keys(game.hero.equip))game=socketGemAction(game,'hero',slot,gem.id,grade,100,(logs,msg)=>[msg,...logs],()=>{});
  const raw=resolvedSpecialStats(game.hero),preview=previewSpecialStatBudget(core,raw);
  return {level,gemId,grade,spent:cost-game.gold,gemCount:Object.values(game.hero.equip).reduce((sum,item)=>sum+(item.socketGem?.count||0),0),core,raw,preview};
}
export function auditEquipmentXpStack(){
  const bonus=rollEnhancementMilestoneBonus(15,()=>.999999);
  const units=Array.from({length:12},()=>({equip:Object.fromEntries(Array.from({length:8},(_,i)=>[String(i),{enhanceBonuses:[bonus]}]))}));
  return [1,4,12].map(members=>({members,perMemberPercent:8*bonus.value,current:equipmentExperienceMultiplier(units.slice(0,members)),candidate:draftPartyEquipmentXpMultiplier(Array(members).fill(8*bonus.value))}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  console.log(JSON.stringify({conditions:'Synthetic hero, ordinary eight-slot candidate core. Real inlay action: 100 highest-grade gems per slot, gold supplied solely for auditing. No save writes, natural acquisition, combat or proc validation. Outcome budget is offline, not applied to character or item stats.',rows:[1,12,72,162,250].flatMap(level=>officialGems.map(gem=>auditFullGemLoadout(level,gem.id))),xp:auditEquipmentXpStack()},null,2));
}
