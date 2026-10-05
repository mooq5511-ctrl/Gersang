// Resolved-stat isolation: core spell intelligence, speed, accuracy/resistance remain unchanged.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {curveFixture,CURVE_TARGETS} from './measure-equipment-curve.mjs';
import {measureEquipmentFixture} from './measure-equipment-early.mjs';
import {resolvedSpecialStats} from './audit-equipment-special-effects.mjs';
import {WORLD_BOSS_CASES} from './audit-equipment-bosses.mjs';
const require=createRequire(import.meta.url);
const {previewSpecialStatBudget}=require('../app/equipment-special-budget-draft.ts');
const selectedBossIds=['e_starter_pirate_king','e_lake_gale_altur','e_japan_sea_golden_starfish','e_white_tiger_fierce_tiger','e_sumeru_vaisravana','e_sumeru_virupaksa'];
export const SPECIAL_BOSS_TARGETS=WORLD_BOSS_CASES.filter(row=>selectedBossIds.includes(row.key)).map(row=>[row.partyLevel,row.key]);
if(SPECIAL_BOSS_TARGETS.length!==selectedBossIds.length)throw new Error('Special combat audit is missing an actual registered boss');

export function specialCombatFixture(level,mode,autoSkill=true){
  if(!['core','raw','bounded','bounded-gaze'].includes(mode))throw new RangeError('Invalid special combat mode');
  const core=curveFixture(level,'mixed','candidate',level,'普通',0,null,true),stacked=structuredClone(core.units);
  for(const unit of stacked)for(const item of Object.values(unit.equip)){
    item.bonus={str:6000,agi:6000,vit:6000,intel:6000};
    item.magic=[{id:'atk',stat:'atk',value:1000},{id:'hp',stat:'hp',value:1000}];
    item.enhanceBonuses=[{stat:'allStats',value:50},{stat:'attackPercent',value:50},{stat:'defensePercent',value:50}];
  }
  const outcomes=core.units.map((unit,index)=>{
    const baseline=resolvedSpecialStats(unit),raw=resolvedSpecialStats(stacked[index]);
    return mode==='core'?baseline:mode==='raw'?raw:previewSpecialStatBudget(baseline,raw).effective;
  });
  return {...core,autoSkill,amaterasuGaze:mode==='bounded-gaze',vitalOverride:{maxHp:outcomes[0].maxHp,maxMp:outcomes[0].maxMp},
    party:core.party.map((member,index)=>({...member,attack:outcomes[index].attack,defense:outcomes[index].defense,hp:outcomes[index].maxHp,maxHp:outcomes[index].maxHp,mp:outcomes[index].maxMp,maxMp:outcomes[index].maxMp})),
    isolation:'Only resolved ATK/DEF/HP/MP change. Gaze flag forced to isolate current proc; not an actual set acquisition.'};
}
export function measureSpecialCombat(level,key,mode,seed=1,autoSkill=true,encounters=1){
  return {level,mode,autoSkill,...measureEquipmentFixture(specialCombatFixture(level,mode,autoSkill),key,.999999,seed,encounters)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const rows=[];
  const sustain=process.argv.includes('--sustain');
  const targets=sustain?CURVE_TARGETS.filter(([level])=>[72,162,250].includes(level)):[...CURVE_TARGETS,...SPECIAL_BOSS_TARGETS];
  for(const [level,key]of targets)for(const mode of sustain||selectedBossIds.includes(key)?['core','bounded','bounded-gaze']:['core','raw','bounded','bounded-gaze']){
    const samples=Array.from({length:30},(_,i)=>measureSpecialCombat(level,key,mode,i+1,true,sustain?10:1));
    rows.push({level,key,mode,wins:samples.filter(row=>row.victories===1).length,allAlive:samples.filter(row=>row.remaining.every(unit=>unit.hp>0)).length,
      meanWins:samples.reduce((sum,row)=>sum+row.victories,0)/samples.length,tenWins:samples.filter(row=>row.victories===10).length,
      heroAlive:samples.filter(row=>row.remaining[0].hp>0).length,timeouts:samples.filter(row=>row.fights.some(fight=>fight.timedOut)).length,
      seconds:samples.reduce((sum,row)=>sum+row.fights.reduce((total,fight)=>total+fight.seconds,0),0)/samples.length,gazeProcs:samples.reduce((sum,row)=>sum+row.fights.reduce((total,fight)=>total+fight.gazeProcs,0),0),
      maxHeroHit:Math.max(...samples.map(row=>row.fights[0].maxHeroHit))});
  }
  console.log(JSON.stringify({sequences:rows.length*30,requestedEncounters:sustain?10:1,conditions:'Synthetic unlocked mixed party; 8 ordinary core slots. Extreme raw requested attributes/affixes are stress input, not a legally rolled loadout. Skills ON, no healing/XP. Only resolved ATK/DEF/HP/MP change; intelligence/tempo/resistance remain core baseline. Current hero/general engine MP is fixed 100-point skill charge, so computed maxMP is NOT fully respected. Gaze mechanically forced, not a real equipped set or new bounded proc. Boss party levels are diagnostics, not unlocks; 180-second timeout is not defeat.',rows},null,2));
}
