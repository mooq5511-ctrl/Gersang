import test from 'node:test';
import assert from 'node:assert/strict';
import {specialCombatFixture,measureSpecialCombat} from '../scripts/measure-equipment-special-combat.mjs';

test('resolved-stat combat preview reaches the actual engine without rebuilding raw percent/gem bonuses',()=>{
  const core=specialCombatFixture(72,'core'),bounded=specialCombatFixture(72,'bounded'),raw=specialCombatFixture(72,'raw');
  assert.deepEqual(bounded.units,core.units);
  assert.equal(bounded.vitalOverride.maxHp,bounded.party[0].maxHp);
  assert.ok(bounded.party[0].attack<raw.party[0].attack);
  assert.ok(bounded.party[0].attack>core.party[0].attack);
  assert.deepEqual(bounded.party.map(unit=>unit.attackInterval),core.party.map(unit=>unit.attackInterval));
  const result=measureSpecialCombat(72,'e_white_tiger_soul_eater','bounded',1);
  assert.equal(result.stats[0].atk,bounded.party[0].attack);
  assert.equal(result.stats[0].hp,bounded.party[0].maxHp);
  assert.deepEqual(result,measureSpecialCombat(72,'e_white_tiger_soul_eater','bounded',1));
  assert.equal(result.fights[0].gazeProcs,0);
});

test('set proc isolation is explicit, remains probabilistic and produces real realtime skill events',()=>{
  assert.equal(specialCombatFixture(112,'bounded-gaze',false).amaterasuGaze,true);
  const samples=Array.from({length:30},(_,i)=>measureSpecialCombat(112,'e_taj_scarab','bounded-gaze',i+1,false));
  assert.ok(samples.some(row=>row.fights[0].gazeProcs>0));
  assert.ok(samples.some(row=>row.fights[0].gazeProcs===0));
  assert.ok(samples.every(row=>row.fights[0].maxHeroHit>0));
});
