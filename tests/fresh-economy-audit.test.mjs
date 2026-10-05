import test from 'node:test';
import assert from 'node:assert/strict';
import {auditFreshEconomy} from '../scripts/audit-fresh-economy.mjs';

test('fresh idle income does not silently grant experience, recruits or tutorial completion',()=>{
  const result=auditFreshEconomy();
  assert.equal(result.initialGold,0);
  assert.equal(result.gold,18000);
  assert.equal(result.heroLevel,1);
  assert.equal(result.heroXp,0);
  assert.equal(result.trips,0);
  assert.equal(result.kills,0);
  assert.equal(result.mercenaries,0);
  assert.equal(result.items,0);
  assert.equal(result.prologueStep,'arrival');
  assert.equal(result.equipmentAndRecruitmentGrossTarget,44544);
  assert.ok(result.gold<result.equipmentAndRecruitmentGrossTarget);
});

test('trade income audit is reproducible, uses earned cargo funds and restores global RNG',()=>{
  const original=Math.random;
  const options={mode:'trade',seed:7};
  const first=auditFreshEconomy(options);
  assert.equal(Math.random,original);
  assert.deepEqual(first,auditFreshEconomy(options));
  assert.equal(Math.random,original);
  assert.equal(first.firstDispatchSeconds,180);
  assert.equal(first.trips,90);
  // One explicit departure; advanceTrade handles the existing automatic repeats.
  assert.equal(first.dispatches,1);
  assert.ok(first.tradeProfit>0);
  assert.ok(first.gold>first.equipmentAndRecruitmentGrossTarget);
  assert.ok(first.heroLevel>1&&first.heroLevel<20);
  assert.equal(first.prologueStep,'arrival');
  assert.equal(first.mercenaries,0);
  assert.equal(first.items,0);
  assert.match(first.caveat,/NOT verified/);
  assert.throws(()=>auditFreshEconomy({mode:'invalid'}),RangeError);
  assert.throws(()=>auditFreshEconomy({seconds:1801}),RangeError);
  assert.equal(Math.random,original);
});
