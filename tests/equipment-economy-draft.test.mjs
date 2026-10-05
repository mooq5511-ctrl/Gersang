import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAFT_QUALITIES, draftCoreMultiplier, draftSellQuote, draftCraftCost, draftEnhancementFee, expectedSpecificDropFights } from '../app/equipment-economy-draft.ts';
import { auditEquipmentEconomy } from '../scripts/audit-equipment-economy.mjs';

test('candidate quality and enhancement stay bounded and monotonic together', () => {
  for (let level = 0; level <= 15; level++) {
    let previous = 0;
    for (const quality of DRAFT_QUALITIES) {
      const multiplier = draftCoreMultiplier(quality, level);
      assert.ok(multiplier > previous && multiplier <= 4);
      if (level) assert.ok(multiplier > draftCoreMultiplier(quality, level - 1));
      previous = multiplier;
    }
  }
});
test('candidate canonical recycling cannot fund buy/craft/enhance loops at rounding edges', () => {
  for (const price of [1, 2, 3, 7, 10, 999, 1000, 99999, 1000000000]) {
    for (const quality of DRAFT_QUALITIES) {
      const craft = draftCraftCost(price, quality), sale = draftSellQuote(price, quality);
      assert.ok(sale < price && sale < craft.cost);
      let spent = craft.cost;
      for (let next = 1; next <= 15; next++) {
        spent += draftEnhancementFee(price, next);
        assert.ok(sale < spent);
      }
    }
  }
  assert.deepEqual(draftCraftCost(1000, '金色'), { cost: 97250, ordinaryItems: 81 });
});
test('candidate rejects unknown quality and malformed pricing/enhancement/drop inputs', () => {
  for (const price of [0, -1, NaN, Infinity, 1.5, 1000000001]) assert.throws(() => draftSellQuote(price, '普通'), RangeError);
  for (const level of [-1, 16, NaN, Infinity, 1.5]) assert.throws(() => draftCoreMultiplier('普通', level), RangeError);
  assert.throws(() => draftSellQuote(1000, '不存在'), RangeError);
  assert.throws(() => draftEnhancementFee(1000, 0), RangeError);
  assert.throws(() => expectedSpecificDropFights(.04, 0), RangeError);
  assert.deepEqual(expectedSpecificDropFights(1, 1), { mean: 1, p95: 1 });
  assert.equal(expectedSpecificDropFights(.04, 7).mean, 175);
});
test('versioned shop audit rules out profitable recycling and uses actual guaranteed fusion inputs', () => {
  const audit = auditEquipmentEconomy();
  assert.deepEqual([...new Set(audit.rows.map(row => row.family))].sort(), ['guild', 'official', 'series']);
  assert.equal(audit.rows.filter(row => row.family === 'series').length, 70);
  assert.equal(audit.expectedPurchaseProfit.length, 0);
  assert.equal(audit.ordinaryArbitrage.length, 0);
  assert.equal(audit.profitableRolls.length,0);
  for (const row of audit.rows) assert.ok(row.candidateMaxSale < row.price);
  assert.equal(audit.fusion[3].meanOrdinaryInputs,3**4);
});
