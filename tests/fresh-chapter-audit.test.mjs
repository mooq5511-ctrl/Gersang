import test from 'node:test';
import assert from 'node:assert/strict';
import {auditFreshChapter} from '../scripts/audit-fresh-chapter.mjs';

test('earned chapter continuation balances all actual money changes without injected resources',()=>{
  const originalRandom=Math.random,originalDate=Date.now;
  for(const tradeSeconds of [0,240])for(const branch of ['spear','bow']){
    const result=auditFreshChapter({seed:1,tradeSeconds,branch,starterGear:'core'});
    assert.ok(result.elapsedSeconds>result.prologueSeconds&&result.elapsedSeconds<=1800);
    assert.equal(result.gold,result.ledger.calculatedEndingGold);
    assert.ok(result.ledger.initialGold>=2000&&result.ledger.initialGold<2500);
    assert.ok(result.gearSpent>0);
    assert.ok(result.potionSpent>0);
    assert.ok(result.potionsUsed>0);
    assert.ok(result.members.length>=2&&result.members.length<=4);
    assert.ok(result.snapshots.length>0&&result.snapshots.length<=30);
    assert.ok(result.snapshots.at(-1).seconds<=result.elapsedSeconds);
    if(result.bossDefeated){assert.equal(result.bossAttempted,true);assert.ok(result.level20At!==null);}
    if(result.level20At===null)assert.ok(result.members[0].level<20);
    assert.equal(result.recruitSpent,(result.members.length-2)*5520);
    if(tradeSeconds)assert.ok(result.trips>0);
    else assert.equal(result.trips,0);
    assert.equal(Math.random,originalRandom);
    assert.equal(Date.now,originalDate);
    assert.match(result.caveat,/NOT human\/browser measurements/);
  }
});

test('invalid scenario inputs do not alter time or random sources',()=>{
  const random=Math.random,date=Date.now;
  for(const options of [{tradeSeconds:601},{branch:'invalid'},{starterGear:'invalid'},{seconds:1801}])assert.throws(()=>auditFreshChapter(options),RangeError);
  assert.equal(Math.random,random);assert.equal(Date.now,date);
});
