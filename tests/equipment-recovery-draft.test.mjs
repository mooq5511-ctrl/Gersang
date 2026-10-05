import test from 'node:test';
import assert from 'node:assert/strict';
import { draftRecoveryQuote, draftPartyRecoveryQuote } from '../app/equipment-recovery-draft.ts';
import { auditEquipmentRecovery } from '../scripts/audit-equipment-recovery.mjs';
test('candidate preserves early recovery but bounds recovery at scale without free instant healing', () => {
  assert.deepEqual(draftRecoveryQuote(100, 0, 2000, 600), { perTick: 10, ticks: 10, durationMs: 20000, instantFee: 200 });
  for (const hp of [1, 100, 500, 1000, 1000000, 5000000]) {
    const quote = draftRecoveryQuote(hp, 0, 2000, 600);
    assert.ok(quote.ticks <= 50);
    assert.equal(quote.instantFee, Math.min(hp * 2, 1200));
    assert.ok(quote.perTick * quote.ticks >= hp);
    assert.ok(quote.perTick * (quote.ticks - 1) < hp);
    assert.equal(draftRecoveryQuote(hp, hp, 2000, 600).instantFee, 0);
  }
});
test('live-engine recovery audit exposes fixed HP recovery and fee divergence', () => {
  const result = auditEquipmentRecovery(250, 'candidate');
  assert.equal(result.currentFirstTickHp, 10);
  assert.equal(result.currentInstantFee, result.maxHp * 2);
  assert.ok(result.currentFullDurationMs > 2 * 24 * 3600 * 1000);
  assert.ok(result.candidate.durationMs <= 100000);
  assert.equal(result.candidate.instantFee, result.potionFullHealCost);
  assert.equal(auditEquipmentRecovery(250, 'candidate', 1).candidate.ticks, 0);
});
test('recovery draft rejects invalid HP, interval, and prices', () => {
  for (const args of [[0,0,2000,600], [100,-1,2000,600], [100,101,2000,600], [100,0,0,600], [100,0,2000,0], [NaN,0,2000,600]])
    assert.throws(() => draftRecoveryQuote(...args), RangeError);
});
test('party quote prices wounded companions even when the hero is full, without changing input', () => {
  const members = [{ hp: 500, maxHp: 500 }, { hp: 0, maxHp: 1000000 }], before = JSON.stringify(members);
  const quote = draftPartyRecoveryQuote(members, 2000, 600);
  assert.equal(quote.instantFee, 1200);
  assert.equal(quote.durationMs, 100000);
  assert.equal(quote.perMember[0].ticks, 0);
  assert.equal(JSON.stringify(members), before);
  assert.equal(draftPartyRecoveryQuote([{ hp: 500, maxHp: 500 }], 2000, 600).instantFee, 0);
  assert.throws(() => draftPartyRecoveryQuote([], 2000, 600), RangeError);
});
