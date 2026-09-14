import test from 'node:test';
import assert from 'node:assert/strict';
import { settleCaravanIdle } from '../app/caravan-idle.ts';

test('small permanent territory bonuses accumulate across one-second idle ticks', () => {
  const start = 1_700_000_000_000;
  let stamp = start;
  let gold = 0;
  let credit = 0;
  for (let second = 1; second <= 10; second++) {
    const result = settleCaravanIdle(stamp, start + second * 1000, 1, 0.01);
    stamp = result.stamp;
    gold += result.gold;
    credit += result.credit;
  }
  assert.equal(gold, 101);
  assert.equal(credit, 50);
  const single = settleCaravanIdle(start, start + 10_000, 1, 0.01);
  assert.equal(gold, single.gold);
  assert.equal(credit, single.credit);
});
