import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT_TIER_LEVELS, TIER_EQUIPMENT_DROP_REGIONS, TIER_EQUIPMENT_SHOP_LEVELS,
  equipmentAtTier, makeTierEquipmentDrop, pickTierEquipmentDrop,
  tierEquipmentCatalog, tierEquipmentPrice, tierEquipmentShopCatalog,
} from '../app/tier-equipment.ts';

test('ten equipment tiers each have seven unique wearable pieces', () => {
  assert.equal(tierEquipmentCatalog.length, 70);
  assert.equal(new Set(tierEquipmentCatalog.map(item => item.id)).size, 70);
  for (const level of EQUIPMENT_TIER_LEVELS) {
    const items = equipmentAtTier(level);
    assert.equal(items.length, 7);
    assert.deepEqual(new Set(items.map(item => item.part)), new Set(['weapon', 'helm', 'armor', 'gloves', 'waist', 'boots', 'accessory']));
    assert.ok(items.every(item => item.requiredLevel === level));
  }
  assert.equal(equipmentAtTier(20).find(item => item.part === 'waist').slot, 'amulet');
  assert.equal(equipmentAtTier(20).find(item => item.part === 'accessory').slot, 'ring');
});

test('only the first six tiers drop in their assigned regions', () => {
  assert.deepEqual(TIER_EQUIPMENT_DROP_REGIONS.map(region => [...region.tiers]), [[1, 20], [40, 50], [70, 90]]);
  const maps = ['starter-outskirts', 'millennium-lake', 'japan-sea'];
  for (let index = 0; index < maps.length; index++) {
    const [lower, upper] = TIER_EQUIPMENT_DROP_REGIONS[index].tiers;
    assert.equal(pickTierEquipmentDrop(maps[index], lower, false, 0, 0)?.requiredLevel, lower);
    assert.equal(pickTierEquipmentDrop(maps[index], upper, false, 0, .99)?.requiredLevel, upper);
    assert.equal(pickTierEquipmentDrop(maps[index], upper, false, 0, 0)?.requiredLevel, lower);
    assert.equal(pickTierEquipmentDrop(maps[index], lower - 1, false, 0, 0), null);
  }
  assert.equal(pickTierEquipmentDrop('miasma-forest', 200, true, 0, 0), null);
  assert.equal(pickTierEquipmentDrop('sumeru', 200, true, 0, 0), null);
  assert.equal(pickTierEquipmentDrop('starter-outskirts', 200, false, .04, 0), null);
  assert.ok(pickTierEquipmentDrop('starter-outskirts', 200, true, .119, 0));
});

test('remaining four tiers belong only to the level-gated temporary shop', () => {
  assert.deepEqual([...TIER_EQUIPMENT_SHOP_LEVELS], [120, 150, 180, 200]);
  assert.equal(tierEquipmentShopCatalog.length, 28);
  assert.ok(tierEquipmentShopCatalog.every(item => item.requiredLevel >= 120 && tierEquipmentPrice(item) > 0));
  const spec = equipmentAtTier(90)[0];
  const item = makeTierEquipmentDrop(spec, 'test-drop', '海底怪');
  assert.equal(item.requiredLevel, 90);
  assert.match(item.source, /海底怪/);
});
