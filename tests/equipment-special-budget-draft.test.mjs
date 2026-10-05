import test from 'node:test';
import assert from 'node:assert/strict';
import {previewSpecialStatBudget,draftPartyEquipmentXpMultiplier,DRAFT_SPECIAL_LIMITS,DRAFT_SHARED_SPECIAL_POOL} from '../app/equipment-special-budget-draft.ts';
import {curveFixture} from '../scripts/measure-equipment-curve.mjs';
import {createRequire} from 'node:module';
import {auditFullGemLoadout,auditEquipmentXpStack} from '../scripts/audit-equipment-special-effects.mjs';
const require=createRequire(import.meta.url);
const {combatStats,vitalStats}=require('../app/vitals-engine.ts');
const resolved=unit=>{
  const combat=combatStats(unit),vital=vitalStats(unit);
  return {attack:combat.attack,defense:combat.defense,maxHp:vital.maxHp,maxMp:vital.maxMp};
};

test('all four channels share one resolved budget instead of four independent caps',()=>{
  const core={attack:1000,defense:1000,maxHp:1000,maxMp:1000},raw={attack:100000,defense:100000,maxHp:100000,maxMp:100000};
  const result=previewSpecialStatBudget(core,raw);
  assert.ok(result.scale<1);
  let used=0;
  for(const key of Object.keys(core)){
    const fraction=(result.effective[key]-core[key])/core[key];
    assert.ok(fraction<=DRAFT_SPECIAL_LIMITS[key]);
    used+=fraction;
  }
  assert.ok(used<=DRAFT_SHARED_SPECIAL_POOL);
  assert.equal(raw.attack,100000);
  assert.equal(core.attack,1000);
  assert.equal(previewSpecialStatBudget(core,core).scale,1);
});

test('real eight-slot stacked gems/affixes/milestones are bounded for hero, spear and bow across promotions',()=>{
  for(const level of [12,36,56,72,112,162,212,250]){
    const {units}=curveFixture(level,'mixed','candidate',level,'金色',15,null,true);
    for(const unit of units){
      const stacked=structuredClone(unit);
      for(const item of Object.values(stacked.equip)){
        item.bonus={str:6000,agi:6000,vit:6000,intel:6000};
        item.magic=[{id:'atk',stat:'atk',value:1000},{id:'hp',stat:'hp',value:1000}];
        item.enhanceBonuses=[{stat:'allStats',value:50},{stat:'attackPercent',value:50},{stat:'defensePercent',value:50}];
      }
      const core=resolved(unit),raw=resolved(stacked),before=JSON.stringify(stacked);
      const result=previewSpecialStatBudget(core,raw);
      for(const key of Object.keys(core)) assert.ok(result.effective[key]<=core[key]+Math.floor(Math.max(1,core[key])*DRAFT_SPECIAL_LIMITS[key]));
      assert.ok(result.clipped.length>0);
      assert.equal(JSON.stringify(stacked),before);
      assert.deepEqual(result,previewSpecialStatBudget(core,raw));
    }
  }
});

test('weaker stats are never healed/upgraded by the preview and malformed inputs cannot enter it',()=>{
  const core={attack:100,defense:0,maxHp:100,maxMp:40},raw={attack:90,defense:100,maxHp:80,maxMp:0};
  const result=previewSpecialStatBudget(core,raw);
  assert.equal(result.effective.attack,90);
  assert.equal(result.effective.maxHp,80);
  assert.equal(result.effective.maxMp,0);
  assert.equal(result.effective.defense,0);
  for(const value of [NaN,Infinity,-1,1.5]) assert.throws(()=>previewSpecialStatBudget({...core,attack:value},raw),RangeError);
});

test('candidate XP bonus stays bounded and does not grow merely by duplicating equipped members',()=>{
  assert.equal(draftPartyEquipmentXpMultiplier([25]),1.25);
  assert.equal(draftPartyEquipmentXpMultiplier(Array(12).fill(400)),1.25);
  assert.equal(draftPartyEquipmentXpMultiplier([25,0]),1.125);
  assert.equal(draftPartyEquipmentXpMultiplier([0]),1);
  for(const values of [[],Array(13).fill(0),[-1],[NaN]]) assert.throws(()=>draftPartyEquipmentXpMultiplier(values),RangeError);
});

test('real 800-gem action audit spends actual costs; current XP stack and preview stay distinct',()=>{
  const result=auditFullGemLoadout(12,'obsidian');
  assert.equal(result.gemCount,800);
  assert.equal(result.spent,52000*800);
  assert.ok(result.raw.attack>result.preview.effective.attack);
  assert.deepEqual(result,auditFullGemLoadout(12,'obsidian'));
  assert.deepEqual(auditEquipmentXpStack(),[
    {members:1,perMemberPercent:400,current:5,candidate:1.25},
    {members:4,perMemberPercent:400,current:17,candidate:1.25},
    {members:12,perMemberPercent:400,current:49,candidate:1.25},
  ]);
});
