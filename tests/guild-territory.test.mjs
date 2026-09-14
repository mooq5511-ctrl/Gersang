import test from 'node:test';
import assert from 'node:assert/strict';
import {
  freshTerritory, restoreTerritory, territoryBonus, warehouseLimit,
  upgradeBuilding, enhanceEquipment,
} from '../app/guild-territory.ts';

test('old and malformed saves restore independent building levels safely', () => {
  assert.deepEqual(restoreTerritory(undefined), freshTerritory());
  const restored = restoreTerritory({ buildings: { flag: 2.9, training: 999, smithy: -4, unknown: 50 } });
  assert.equal(restored.buildings.flag, 2);
  assert.equal(restored.buildings.training, 10);
  assert.equal(restored.buildings.smithy, 0);
  assert.equal(Object.hasOwn(restored.buildings, 'unknown'), false);
});

test('building upgrades spend once and bonuses add without multiplying', () => {
  const base = { hero: { level: 20 }, gold: 10_000, territory: freshTerritory(), logs: [], inventory: [] };
  const station = upgradeBuilding(base, 'waystation');
  assert.equal(station.game.gold, 8_800);
  assert.equal(base.territory.buildings.waystation, 0);
  const flag = upgradeBuilding(station.game, 'flag');
  assert.equal(territoryBonus(flag.game.territory, 'idle'), 0.03);
  assert.equal(territoryBonus(flag.game.territory, 'xp'), 0.01);
  assert.equal(warehouseLimit(flag.game.territory), 30);
  assert.equal(upgradeBuilding(base, 'smithy').error, '鐵匠鋪需要主角 Lv.50。');
  const poor = { ...base, gold: 0 };
  assert.equal(upgradeBuilding(poor, 'waystation').game, poor);
});

test('smithy failure only spends gold and success increases enhancement', () => {
  const item = { uid: 'blade', name: '試作刀', enhance: 1 };
  const territory = freshTerritory();
  territory.buildings.smithy = 1;
  const state = { hero: { level: 50 }, gold: 20_000, territory, logs: [], inventory: [item] };
  const failed = enhanceEquipment(state, 'blade', 1);
  assert.equal(failed.game.gold, 16_000);
  assert.equal(failed.game.inventory[0].enhance, 1);
  const success = enhanceEquipment(state, 'blade', 0);
  assert.equal(success.game.inventory[0].enhance, 2);
  assert.equal(state.inventory[0].enhance, 1);
});
