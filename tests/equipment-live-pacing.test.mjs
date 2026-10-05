import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {curveFixture} from '../scripts/measure-equipment-curve.mjs';
import {auditLiveSeriesPacing} from '../scripts/audit-equipment-live-pacing.mjs';
const require=createRequire(import.meta.url);
const {v1Definition}=require('../app/equipment-v1-policy.ts');
const {equipmentAtTier}=require('../app/tier-equipment.ts');

test('live benchmark uses the real existing series tier and canonical investment, not candidate levels',()=>{
  for(const level of [12,36,56,72,112,162,212,250]) {
    const fixture=curveFixture(level,'mixed','live',level,'金色',15,null,true);
    const tier=fixture.units[0].equip.weapon.requiredLevel;
    assert.ok(tier<=level);assert.equal(Object.values(fixture.units[0].equip).length,8);
    assert.ok(equipmentAtTier(tier).length);
    for(const item of Object.values(fixture.units[0].equip)) {
      assert.ok(v1Definition(item));assert.equal(item.enhance,15);assert.equal(item.rarity,'金色');
      assert.equal(item.atk,v1Definition(item).atk);
    }
    assert.notEqual(fixture.units[0].equip.ring1.uid,fixture.units[0].equip.ring2.uid);
  }
  assert.throws(()=>curveFixture(120,'mixed','live',120,'unknown'));
  assert.throws(()=>curveFixture(120,'mixed','live',120,'金色',16));
});

test('calibrated targets remain beatable across paired seeds and actual quality investment',()=>{
  const rows=auditLiveSeriesPacing(5);
  assert.equal(rows.length,20);
  for(const row of rows) {
    assert.equal(row.victories,5,JSON.stringify(row));
    assert.equal(row.timeouts,0,JSON.stringify(row));
    assert.ok(row.meanSeconds>0);
  }
  for(const ordinary of rows.filter(row=>row.scenario==='live-ordinary')) {
    const invested=rows.find(row=>row.key===ordinary.key&&row.scenario==='live-gold+15');
    assert.ok(invested.meanSeconds<ordinary.meanSeconds,JSON.stringify({ordinary,invested}));
  }
  assert.throws(()=>auditLiveSeriesPacing(0));
});
