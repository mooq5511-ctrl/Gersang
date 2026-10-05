// Real versioned series constructors + real dungeon engine. Synthetic, fully promoted parties;
// no storage writes, natural progression, healing, resupply, gem stats, or offline claims.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {curveFixture} from './measure-equipment-curve.mjs';
import {measureEquipmentFixture} from './measure-equipment-early.mjs';
const require=createRequire(import.meta.url);
const {MONSTER_REDESIGN}=require('../data/monsters/monster-redesign.ts');
export const LIVE_PACING_TARGETS=['e_yeti','e_taj_scarab','e_sumeru_training_thunder_beast','e_ghost','e_snake'];
const scenarios=[
  {variant:'current',quality:'普通',enhance:0,label:'frozen-legacy'},
  {variant:'live',quality:'普通',enhance:0,label:'live-ordinary'},
  {variant:'live',quality:'史詩',enhance:0,label:'live-epic'},
  {variant:'live',quality:'金色',enhance:15,label:'live-gold+15'},
];
export function auditLiveSeriesPacing(seeds=30) {
  if(!Number.isInteger(seeds)||seeds<1||seeds>100)throw new RangeError('Invalid sample count');
  return LIVE_PACING_TARGETS.flatMap(key=>scenarios.map(scenario=>{
    const level=MONSTER_REDESIGN[key].level;
    const results=Array.from({length:seeds},(_,seed)=>measureEquipmentFixture(
      curveFixture(level,'mixed',scenario.variant,level,scenario.quality,scenario.enhance,null,true),key,.999999,seed+1,1));
    const seconds=results.map(row=>row.fights[0].seconds);
    return {key,level,scenario:scenario.label,samples:seeds,
      victories:results.filter(row=>row.victories===1).length,
      timeouts:results.filter(row=>row.fights[0].timedOut).length,
      allAlive:results.filter(row=>row.remaining.every(unit=>unit.hp>0)).length,
      meanSeconds:seconds.reduce((a,b)=>a+b,0)/seeds,
      minSeconds:Math.min(...seconds),maxSeconds:Math.max(...seconds),
      enemyCount:results[0].fights[0].enemyCount};
  }));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify({conditions:'Actual V1 series at the highest existing tier no higher than wearer level; eight slots with unique second ring. Hero + two fully promoted spears + one bow, paired 30 seeds, maximum ordinary encounter count, one full-HP encounter. Legacy comparison uses frozen pre-V1 gear against the same current fixed monster HP. Not a natural playthrough or proof of sustainable farming.',rows:auditLiveSeriesPacing()},null,2));
}
