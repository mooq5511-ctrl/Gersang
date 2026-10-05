import test from 'node:test';
import assert from 'node:assert/strict';
import {chapterSourceAudit} from '../scripts/audit-first-chapter-sources.mjs';
import {chapterParty} from '../scripts/audit-first-chapter-parties.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {freshGame}=require('../app/game-hero-factory.ts');
const {selectBattleMapAction}=require('../app/game-battle-actions.ts');

test('chapter source audit distinguishes real ordinary shop alternatives from supplied series gear',()=>{
  const report=chapterSourceAudit();
  assert.equal(report.cheapestEightSlotShopLoadout.length,8);
  assert.equal(report.cheapestEightSlotShopLoadout.filter(item=>item.slot==='ring').length,2);
  assert.ok(report.cheapestEightSlotShopLoadout.every(item=>item.level<=12));
  assert.equal(report.grossThreeMercenaryFourLoadoutCost,report.equipmentPerPerson*4+report.recruitmentPerMercenary*3);
  assert.ok(report.xpTo20>report.xpTo12);
  const fixture=chapterParty({branch:'spear',gear:'full',gearLevel:20});
  for(const unit of fixture.units){
    const expected=unit.level>=20?20:1;
    assert.ok(Object.values(unit.equip).every(item=>item.requiredLevel===expected));
  }
  // The report must not call catalog price or synthetic XP a natural-play success.
});

test('lake series drops are not a pre-bandit-boss acquisition path',()=>{
  const state={...freshGame('取得來源測試'),stage:300};
  let notice='';
  const next=selectBattleMapAction(state,'millennium-lake',{
    notify:message=>{notice=message;},enemyMax:()=>100,addLog:(logs,message)=>[...logs,message],
  });
  assert.equal(next,state);
  assert.match(notice,/山賊首領/);
  assert.ok(chapterSourceAudit().level20SeriesDropRegions.includes('millennium-lake'));
  // Other existing random shop / relic forge routes remain to be verified, not declared unavailable.
});
