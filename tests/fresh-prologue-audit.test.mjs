import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {auditFreshPrologue} from '../scripts/audit-fresh-prologue.mjs';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {freshDungeon}=require('../app/dungeon-engine.ts');
const {syncHanyangDeliveryKills,syncHanyangReturnProgress}=require('../app/hanyang-story-transitions.ts');

test('shared delivery transition respects actual kills and stops changing unrelated story steps',()=>{
  const original=freshGame('交付條件');
  assert.equal(syncHanyangDeliveryKills(original,3),original);
  const below={...original,hanyangPrologueStep:'outskirts',starterDeliveryKills:2};
  assert.equal(syncHanyangDeliveryKills(below,3),below);
  const ready=syncHanyangDeliveryKills({...below,starterDeliveryKills:3},3);
  assert.equal(ready.hanyangPrologueStep,'first-sale');
  assert.equal(syncHanyangDeliveryKills(ready,3),ready);
  const stale={...ready,starterDeliveryKills:2};
  assert.equal(syncHanyangDeliveryKills(stale,3).hanyangPrologueStep,'outskirts');
  const complete={...ready,hanyangPrologueStep:'completed'};
  assert.equal(syncHanyangDeliveryKills(complete,3),complete);
});

test('shared return transition requires victory evidence and preserves cargo handoff gates',()=>{
  const base={...freshGame('回報條件'),hanyangPrologueStep:'bandit-trial',dungeon:freshDungeon()};
  assert.equal(syncHanyangReturnProgress(base),base);
  const victory={...base,dungeon:{...base.dungeon,status:'respawning',autoHunt:true,logs:['成功擊敗黑巾斥候']}};
  const fighting={...victory,dungeon:{...victory.dungeon,status:'fighting'}};
  assert.equal(syncHanyangReturnProgress(fighting),fighting);
  const next=syncHanyangReturnProgress(victory);
  assert.equal(next.hanyangPrologueStep,'caravan-delivery');
  assert.equal(next.hanyangPrologueFlags.caravanRestored,true);
  assert.equal(next.hanyangPrologueFlags.caravanCargoDelivered,false);
  assert.equal(next.dungeon.autoHunt,false);
  assert.equal(next.dungeon.status,'idle');
  assert.equal(syncHanyangReturnProgress(next),next);
  const undelivered={...next,hanyangPrologueStep:'return'};
  assert.equal(syncHanyangReturnProgress(undelivered).hanyangPrologueStep,'caravan-delivery');
  const delivered={...undelivered,hanyangPrologueFlags:{...undelivered.hanyangPrologueFlags,caravanCargoDelivered:true}};
  assert.equal(syncHanyangReturnProgress(delivered),delivered);
});

test('zero-funded formal prologue completes across 30 seeds with a real paid starter recruit',()=>{
  const expected=['arrival','outskirts','first-sale','journey-fund','medicine','guild','formation','caravan-crisis','bandit-trial','caravan-delivery','return','departure','completed'];
  const randomOriginal=Math.random,dateOriginal=Date.now;
  for(let seed=1;seed<=30;seed++){
    const result=auditFreshPrologue({seed,seconds:180});
    assert.equal(result.completed,true,`seed ${seed}`);
    assert.equal(result.worldMapUnlocked,true);
    assert.deepEqual(result.completedQuests,['npc-first-caravan-delivery']);
    assert.deepEqual(result.milestones.map(row=>row.step),expected);
    assert.equal(result.recoveries,0);
    assert.equal(result.members.length,2);
    assert.equal(result.members[0].weapon,'商路短劍');
    assert.equal(result.members[1].weapon,null);
    assert.equal(result.members[1].name,'朝鮮槍兵');
    assert.equal(result.members[1].position,'中排');
    assert.ok(result.members.every(unit=>unit.level===2&&unit.hp>0));
    assert.ok(result.deliveryKills>=3);
    const fund=result.milestones.find(row=>row.step==='medicine');
    assert.equal(fund.gold,6900);
    const recruitment=result.milestones.find(row=>row.step==='formation');
    assert.ok(recruitment.gold<1000);
    assert.ok(result.gold>=2000&&result.gold<2500);
    assert.equal(Math.random,randomOriginal);
    assert.equal(Date.now,dateOriginal);
  }
  assert.throws(()=>auditFreshPrologue({seconds:1801}),RangeError);
  assert.equal(Math.random,randomOriginal);
  assert.equal(Date.now,dateOriginal);
});
