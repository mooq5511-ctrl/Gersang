import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const game = readFileSync(new URL("../app/game-v15.tsx", import.meta.url), "utf8");
const map = readFileSync(new URL("../app/isometric-world-map.tsx", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("Phaser isometric map is the default live game scene", () => {
  assert.equal(pkg.dependencies.phaser, "3.90.0");
  assert.match(game, /useState\("map"\)/);
  assert.match(game, /<IsometricWorldMap/);
  assert.match(game, /TabsTrigger value="map"/);
});

test("map connects its destinations to existing game tabs and the Thunder Altar raid", () => {
  assert.match(map, /city: \{ col: 3, row: 4, label: "市集" \}/);
  assert.match(map, /trade: \{ col: 7, row: 3, label: "港口" \}/);
  assert.match(map, /battle: \{ col: 7, row: 9, label: "城門" \}/);
  assert.match(map, /raid: \{ col: 3, row: 7, label: "雷霆祭壇" \}/);
  assert.match(game, /destination === "city"/);
  assert.match(game, /destination === "trade"/);
  assert.match(game, /destination === "raid"/);
  assert.match(game, /setActiveTab\("raid"\)/);
  assert.match(game, /else setActiveTab\("squad"\)/);
});

test("village map is a static interaction hub without protagonist movement", () => {
  assert.doesNotMatch(map, /function findPath/);
  assert.doesNotMatch(map, /pointerdown/);
  assert.doesNotMatch(map, /map-hero/);
  assert.doesNotMatch(map, /點擊地面移動/);
  assert.match(map, /className="village-city-hall-pin"/);
  assert.match(map, /onClick=\{\(\) => navigate\("hall"\)\}/);
  assert.match(map, /選擇設施互動/);
});
