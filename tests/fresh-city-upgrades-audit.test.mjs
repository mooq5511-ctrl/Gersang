import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {auditFreshChapter} from '../scripts/audit-fresh-chapter.mjs';
const require=createRequire(import.meta.url);
const {getGameView}=require('../app/game-view-selector.ts');
const {freshGame}=require('../app/game-hero-factory.ts');

test('earned city upgrades buy only actual UI stock at usable levels with charged money and no rerolls',()=>{
  const random=Math.random,date=Date.now;
  const view=getGameView({activeTab:'city',cityService:'weapon',game:freshGame('stock-check'),selectedUid:'hero',treasureQuery:''});
  const stock=[...view.cityWeapons,...view.cityArmors];
  assert.ok(stock.some(record=>record.id==='wood-blade'));
  assert.ok(stock.some(record=>record.id==='leather'));
  assert.ok(!stock.some(record=>record.id==='tiger-hide'));
  for(const tradeSeconds of [0,240]){
    const report=auditFreshChapter({seed:1,tradeSeconds,cityUpgrades:true});
    assert.ok(report.cityPurchases.length>0);
    assert.equal(report.gold,report.ledger.calculatedEndingGold);
    const seen=new Set();
    for(const receipt of report.cityPurchases){
      const record=stock.find(record=>record.id===receipt.id);
      assert.ok(record);
      assert.equal(receipt.cityId,view.currentCity.id);
      assert.equal(receipt.requiredLevel,record.level);
      assert.ok(receipt.unitLevel>=record.level);
      assert.equal(receipt.price,Math.floor(record.price*view.currentCity.priceFactor));
      assert.ok(receipt.remainingGold>=1000);
      assert.ok(receipt.seconds<=report.elapsedSeconds);
      const key=`${receipt.unitUid}:${receipt.id}`;
      assert.ok(!seen.has(key));seen.add(key);
    }
    assert.ok(report.gearSpent>=report.cityPurchases.reduce((sum,receipt)=>sum+receipt.price,0));
  }
  assert.equal(Math.random,random);assert.equal(Date.now,date);
});

test('city diagnostic remains opt-in and rejects non-boolean policies',()=>{
  assert.equal(auditFreshChapter({seconds:180}).cityPurchases.length,0);
  assert.throws(()=>auditFreshChapter({cityUpgrades:'true'}),RangeError);
});
