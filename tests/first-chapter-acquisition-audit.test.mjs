import test from 'node:test';
import assert from 'node:assert/strict';
import {atLeastSeals,firstChapterSealAudit} from '../scripts/audit-first-chapter-acquisition.mjs';

test('chapter acquisition audit uses actual starter seal routing and reports uncertainty',()=>{
  const report=firstChapterSealAudit();
  assert.equal(report.counts['長槍兵符'],30);
  assert.equal(report.counts['長弓兵符'],30);
  assert.equal(report.probability,.015);
  assert.equal(report.expectedWins,200);
  assert.ok(report.chances.find(row=>row.wins===100).chance<.2);
  for(const {target,wins} of report.confidence){
    assert.ok(atLeastSeals(wins,3,.015)>=target);
    assert.ok(atLeastSeals(wins-1,3,.015)<target);
  }
});

test('binomial acquisition calculation handles impossible cases and independent known result',()=>{
  assert.equal(atLeastSeals(2,3,.015),0);
  assert.equal(atLeastSeals(3,3,.5),.125);
  assert.equal(atLeastSeals(1,1,.5),.5);
  assert.throws(()=>atLeastSeals(-1,3,.015),RangeError);
});
