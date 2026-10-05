import test from 'node:test';
import assert from 'node:assert/strict';
import { auditAutoPotion } from '../scripts/audit-equipment-auto-potion.mjs';
test('real flow audit purchases and consumes actual stock, records combat and keeps deterministic outcomes', () => {
  const result = auditAutoPotion(72,'e_white_tiger_soul_eater','candidate',70,1,30,20);
  assert.equal(result.potionPurchaseCost,12000);
  assert.equal(result.potionsUsed + result.potionsLeft,20);
  assert.ok(result.kills > 0);
  assert.ok(result.battleLogCategories.includes('reward'));
  assert.deepEqual(result.observedTargets,['e_white_tiger_soul_eater']);
  assert.deepEqual(result,auditAutoPotion(72,'e_white_tiger_soul_eater','candidate',70,1,30,20));
});
test('real shortage disables Auto Potion instead of inventing free healing or resupply', () => {
  const result = auditAutoPotion(72,'e_white_tiger_soul_eater','candidate',70,1,10,0);
  assert.equal(result.autoPotion,false);
  assert.equal(result.potionsUsed,0);
  assert.equal(result.potionPurchaseCost,0);
  assert.ok(result.battleLogCategories.includes('warning'));
});
