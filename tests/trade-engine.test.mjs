import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceTrade, dispatchTrade, freshTrade, OFFLINE_LIMIT, restoreTrade } from '../app/trade-engine.ts';

const now = 1_000_000;
const initialGold = 120000;
const launch = () => dispatchTrade(freshTrade(), initialGold, 'hanji', 1, 4, now);

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
