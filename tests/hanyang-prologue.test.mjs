import test from 'node:test';
import assert from 'node:assert/strict';
import { claimHanyangJourneyFund, completeHanyangPrologue, freshHanyangPrologueFlags, hanyangJourneyFund, markHanyangCaravanDelivered, markHanyangLootSold, markHanyangMysteryNpcSeen, markHanyangReturnReported, normalizeHanyangPrologueFlags, syncHanyangPrologue } from '../app/hanyang-prologue.ts';
import { isBossMonster } from '../app/dungeon-engine.ts';
import { sourceEnemies } from '../app/v17-content.ts';

const state = (overrides = {}) => ({ gold: 0, logs: [], hanyangPrologueStep: 'first-sale', hanyangPrologueFlags: freshHanyangPrologueFlags(), medicines: {}, mercs: [], restingMercs: [], active: [], ...overrides });

test('journey fund targets 125% of the current guild price and never grants twice', () => {
  assert.equal(hanyangJourneyFund(6000, 1000), 6500);
  const first = claimHanyangJourneyFund(markHanyangLootSold(state({ gold: 1000, hanyangPrologueFlags: { ...freshHanyangPrologueFlags(), equipmentEquipped: true } })), 6000);
  assert.equal(first.gold, 7500);
  assert.equal(first.hanyangPrologueFlags.journeyFundClaimed, true);
  assert.strictEqual(claimHanyangJourneyFund(first, 6000), first);
});

test('selling the wrong item or reloading cannot fabricate the flag', () => {
  const original = state({ hanyangPrologueStep: 'guild' });
  assert.strictEqual(markHanyangLootSold(original), original);
  assert.deepEqual(normalizeHanyangPrologueFlags({ journeyFundClaimed: true, lootSold: 'yes' }), { starterSupplyGranted: false, equipmentEquipped: false, medicinePurchased: false, lootSold: false, journeyFundClaimed: true, firstMercenaryContract: false, firstMercenaryDeployed: false, caravanRestored: false, caravanCargoDelivered: false, merchantPriceRevealed: false, mysteryNpcSeen: false, worldMapUnlocked: false, completionRewardClaimed: false });
});

test('recruitment keeps the formation teaching step for one explicit confirmation', () => {
  const unit = { uid: 'merchant-shield' };
  const recruited = state({ hanyangPrologueStep: 'guild', mercs: [unit], active: [unit.uid] });
  const formation = syncHanyangPrologue(recruited, 6000);
  assert.equal(formation.hanyangPrologueStep, 'formation');
  const deployed = syncHanyangPrologue({ ...formation, active: [unit.uid] }, 6000);
  assert.equal(deployed.hanyangPrologueStep, 'caravan-crisis');
  assert.equal(deployed.hanyangPrologueFlags.firstMercenaryDeployed, true);
});

test('black bandit is an elite encounter, while bandit chief remains the Hanyang boss', () => {
  const blackBandit = sourceEnemies.find((enemy) => enemy.id === 'e_starter_black_bandit');
  const pirateKing = sourceEnemies.find((enemy) => enemy.name === '山賊首領');
  assert.equal(blackBandit?.elite, true);
  assert.equal(blackBandit?.boss, undefined);
  assert.equal(isBossMonster('黑巾山賊'), false);
  assert.equal(pirateKing?.boss, true);
  assert.equal(isBossMonster('山賊首領'), true);
});

test('caravan delivery, departure and mystery encounter advance once and persist their flags', () => {
  const base = state({ hanyangPrologueStep: 'caravan-delivery', hanyangPrologueFlags: freshHanyangPrologueFlags(), gold: 100 });
  const delivered = markHanyangCaravanDelivered(base);
  assert.equal(delivered.hanyangPrologueStep, 'return');
  assert.equal(delivered.hanyangPrologueFlags.caravanCargoDelivered, true);
  assert.equal(delivered.hanyangPrologueFlags.merchantPriceRevealed, true);
  const departure = markHanyangReturnReported(delivered);
  assert.equal(departure.hanyangPrologueStep, 'departure');
  const complete = completeHanyangPrologue({ ...departure, medicines: {}, hanyangPrologueFlags: { ...departure.hanyangPrologueFlags } });
  assert.equal(complete.hanyangPrologueStep, 'completed');
  assert.equal(complete.hanyangPrologueFlags.worldMapUnlocked, true);
  assert.equal(markHanyangMysteryNpcSeen(complete).hanyangPrologueFlags.mysteryNpcSeen, true);
});
