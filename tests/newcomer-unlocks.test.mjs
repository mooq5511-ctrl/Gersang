import test from "node:test";
import assert from "node:assert/strict";
import { newcomerUnlocks } from "../app/newcomer-unlocks.ts";

const state = (overrides = {}) => ({
  hanyangPrologueStep: "completed",
  trade: { trips: 0, totalProfit: 0 },
  relicDungeon: { materialsFound: 0, equipmentFound: 0, relicShards: 0, clearedRuns: 0 },
  hero: { level: 1 },
  mercs: [{ uid: "shield" }],
  restingMercs: [],
  territory: { buildings: { waystation: 0 } },
  ...overrides,
});

test("new players see trade after the prologue but not the relic yet", () => {
  const unlocks = newcomerUnlocks(state());
  assert.equal(unlocks.trade, true);
  assert.equal(unlocks.relic, false);
  assert.equal(unlocks.collection, false);
});

test("a completed trade opens the relic expedition", () => {
  const unlocks = newcomerUnlocks(state({ trade: { trips: 1, totalProfit: 900 } }));
  assert.equal(unlocks.relic, true);
  assert.equal(unlocks.collection, false);
});

test("a relic reward opens collection and civic systems", () => {
  const unlocks = newcomerUnlocks(state({ trade: { trips: 1, totalProfit: 900 }, relicDungeon: { materialsFound: 1, equipmentFound: 0, relicShards: 0, clearedRuns: 0 } }));
  assert.equal(unlocks.collection, true);
  assert.equal(unlocks.contracts, true);
  assert.equal(unlocks.hall, true);
  assert.equal(unlocks.raid, false);
});

test("established caravans keep all existing systems", () => {
  const unlocks = newcomerUnlocks(state({ hero: { level: 20 } }));
  assert.equal(unlocks.trade, true);
  assert.equal(unlocks.relic, true);
  assert.equal(unlocks.collection, true);
  assert.equal(unlocks.contracts, true);
  assert.equal(unlocks.hall, true);
  assert.equal(unlocks.raid, true);
});
