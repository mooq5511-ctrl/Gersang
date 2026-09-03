import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceTrade, dispatchTrade, encounterCount, encounterTimes, freshTrade, OFFLINE_LIMIT, restoreTrade } from '../app/trade-engine.ts';

const now = 1_000_000;
const initialGold = 120000;
const launch = () => dispatchTrade(freshTrade(), initialGold, 'hanji', 1, 4, now);

test('each possible encounter count from zero through ten is supported', () => {
  for (let seed = 0; seed <= 10; seed++) {
    const launched = dispatchTrade({ ...freshTrade(), auto: false }, initialGold, 'hanji', 1, 4, now, seed);
    const paid = advanceTrade(launched.trade, launched.gold, now + 18000);
    assert.equal(paid.encounters, seed);
    assert.equal(paid.trips, 1);
    assert.equal(paid.trade.caravan, null);
  }
});
test('encounters trigger during transit, never twice after reload', () => {
  const launched = dispatchTrade(freshTrade(), initialGold, 'hanji', 1, 4, now, 10);
  const offsets = encounterTimes(launched.trade.caravan);
  assert.equal(offsets.length, 10);
  assert.ok(offsets.every((offset, index) => offset > 0 && offset < 18000 && (!index || offset > offsets[index - 1])));
  const first = advanceTrade(launched.trade, launched.gold, now + offsets[0]);
  assert.equal(first.encounters, 1);
  assert.equal(first.trips, 0);
  const reloaded = advanceTrade(restoreTrade(first.trade), first.gold, now + offsets[0]);
  assert.equal(reloaded.encounters, 0);
  const remaining = advanceTrade({ ...reloaded.trade, auto: false }, reloaded.gold, now + 18000);
  assert.equal(remaining.encounters, 9);
});
test('repeat voyages get a fresh schedule and offline totals stay bounded', () => {
  const launched = dispatchTrade(freshTrade(), initialGold, 'hanji', 1, 4, now, 10);
  const next = advanceTrade(launched.trade, launched.gold, now + 18000);
  assert.notEqual(next.trade.caravan.encounterSeed, 10);
  assert.equal(next.trade.caravan.encountersResolved, 0);
  assert.ok(encounterCount(next.trade.caravan.encounterSeed) <= 10);
  const offline = advanceTrade(launched.trade, launched.gold, now + OFFLINE_LIMIT * 3);
  assert.ok(offline.encounters <= 16000);
  assert.equal(advanceTrade(restoreTrade(offline.trade), offline.gold, now + OFFLINE_LIMIT * 3).encounters, 0);
  assert.equal(advanceTrade(freshTrade(), initialGold, now + OFFLINE_LIMIT).encounters, 0);
});
test('old in-flight saves do not spawn retroactive encounters', () => {
  const launched = launch();
  const old = structuredClone(launched.trade);
  delete old.caravan.encounterSeed;
  delete old.caravan.encountersResolved;
  const migrated = restoreTrade(old);
  const paid = advanceTrade({ ...migrated, auto: false }, launched.gold, now + 18000);
  assert.equal(paid.encounters, 0);
  assert.equal(paid.trips, 1);
});

test('dispatch deducts principal and rejects a duplicate voyage', () => {
  const result = launch();
  assert.equal(result.gold, 118200);
  assert.equal(result.trade.caravan.revenue, 3074);
  assert.ok(dispatchTrade(result.trade, result.gold, 'hanji', 1, 4, now).error);
});
test('locked routes and insufficient funds leave state unchanged', () => {
  assert.ok(dispatchTrade(freshTrade(), initialGold, 'silk', 1, 4, now).error);
  const result = dispatchTrade(freshTrade(), 10, 'hanji', 1, 4, now);
  assert.equal(result.gold, 10);
  assert.equal(result.trade.caravan, null);
});
test('early ticks do not pay, completed voyage pays profit and restocks', () => {
  const launched = launch();
  assert.equal(advanceTrade(launched.trade, launched.gold, now + 17999).trips, 0);
  const paid = advanceTrade(launched.trade, launched.gold, now + 18000);
  assert.equal(paid.trips, 1);
  assert.equal(paid.profit, 1274);
  assert.equal(paid.gold, initialGold + 1274 - 1800);
  assert.equal(paid.trade.reputation, 8);
  assert.equal(paid.xp, 64);
  assert.equal(advanceTrade(paid.trade, paid.gold, now + 18000).trips, 0);
});
test('turning auto off completes the voyage without deducting another principal', () => {
  const launched = launch();
  const paid = advanceTrade({ ...launched.trade, auto: false }, launched.gold, now + 18000);
  assert.equal(paid.gold, initialGold + 1274);
  assert.equal(paid.trade.caravan, null);
  assert.equal(paid.trips, 1);
});
test('offline settlement is capped at eight hours and cannot be claimed twice', () => {
  const launched = launch();
  const later = now + OFFLINE_LIMIT * 4;
  const paid = advanceTrade(launched.trade, launched.gold, later);
  assert.equal(paid.trips, 1600);
  assert.equal(paid.gold, initialGold + 1274 * 1600 - 1800);
  const reloaded = advanceTrade(restoreTrade(paid.trade), paid.gold, later);
  assert.equal(reloaded.trips, 0);
  assert.equal(reloaded.gold, paid.gold);
});
test('restoring legacy or malformed trade state is safe', () => {
  assert.deepEqual(restoreTrade(undefined), freshTrade());
  const restored = restoreTrade({ cargoLevel: Infinity, reputation: -3, caravan: { routeId: 'invalid' } });
  assert.equal(restored.cargoLevel, 1);
  assert.equal(restored.reputation, 0);
  assert.equal(restored.caravan, null);
});
test('foreground ticks and one offline batch have the same economy', () => {
  const launched = launch();
  let sequential = { trade: launched.trade, gold: launched.gold };
  for (let step = 1; step <= 100; step++) sequential = advanceTrade(sequential.trade, sequential.gold, now + step * 18000);
  const batch = advanceTrade(launched.trade, launched.gold, now + 100 * 18000);
  assert.deepEqual(sequential.trade, batch.trade);
  assert.equal(sequential.gold, batch.gold);
});
