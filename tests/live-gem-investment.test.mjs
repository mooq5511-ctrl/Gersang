import test from 'node:test';
import assert from 'node:assert/strict';
import {auditLiveGemInvestment} from '../scripts/audit-live-gem-investment.mjs';
import {createRequire} from 'node:module';
import {curveFixture} from '../scripts/measure-equipment-curve.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {officialGems}=require('../data/items/official-gems.ts');
const {gemSocketResult}=require('../app/gem-socket-quote.ts');
const {gemInvestmentPreview}=require('../app/gem-investment-preview.ts');
const {socketGemAction}=require('../app/game-inventory-actions.ts');
const {combatStats,vitalStats}=require('../app/vitals-engine.ts');
test('live gem audit charges exact recipe cost and evaluates current V1 caps',()=>{
  const row=auditLiveGemInvestment(1,'hero','obsidian',2,100);
  assert.equal(row.spent,52000*100*8);assert.equal(row.gemCount,800);
  assert.ok(row.effective.attack<=row.core.attack+Math.floor(row.core.attack*.35));
  assert.ok(row.effective.attack>row.core.attack);
  assert.equal(auditLiveGemInvestment(1,'hero','obsidian',2,0).spent,0);
});
test('audit distinguishes spear agility from hero agility instead of promising generic gains',()=>{
  const spear=auditLiveGemInvestment(12,'spear','placer',0,1);
  assert.deepEqual(spear.effective,spear.core);
  const hero=auditLiveGemInvestment(12,'hero','placer',0,1);
  assert.ok(hero.effective.attack>hero.core.attack);
});
test('investment preview equals the transaction across roles, recipes, grades and near-full slots',()=>{
  for(const level of [1,20,72,250])for(const role of ['hero','spear'])for(const gem of officialGems)for(const grade of [0,1,2]){
    const unit=structuredClone(curveFixture(level,'spear','live',level,'普通',0,null,true).units[role==='hero'?0:1]);
    let state={...freshGame('preview'),gold:100000000,...(role==='hero'?{hero:unit}:{mercs:[unit]})};
    state=socketGemAction(state,unit.uid,'weapon',gem.id,grade,98,(logs,msg)=>[msg,...logs],()=>{});
    const before=role==='hero'?state.hero:state.mercs[0],snapshot=structuredClone(state);
    const quote=gemSocketResult(before.equip.weapon,gem,grade,10);
    assert.equal(quote.ok,true);assert.equal(quote.amount,2);
    const preview=gemInvestmentPreview(before,'weapon',quote.item);
    assert.deepEqual(state,snapshot);
    const next=socketGemAction(state,unit.uid,'weapon',gem.id,grade,10,(logs,msg)=>[msg,...logs],()=>{});
    const after=role==='hero'?next.hero:next.mercs[0];
    for(const [key,value] of Object.entries(preview.delta)){
      const reader=['attack','defense','speed','accuracy'].includes(key)?combatStats:vitalStats;
      assert.equal(value,reader(after)[key]-reader(before)[key]);
    }
    assert.deepEqual(after.equip.weapon,quote.item);
    assert.equal(state.gold-next.gold,quote.cost);
  }
});
