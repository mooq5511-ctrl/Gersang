import test from 'node:test';
import assert from 'node:assert/strict';
import { equipmentCorePower, effectiveEquipmentStats } from '../app/equipment-stats.ts';
import { heroPersonalPower, HERO_INITIAL_ATTRIBUTES } from '../app/hero-rules.ts';
import { EARLY_EQUIPMENT_DRAFT, draftEquipmentAtLevel } from '../app/equipment-balance-draft.ts';

test('power uses the same rounded core stats as combat at +0/+2/+10', () => {
  for (const enhance of [0, 2, 10]) {
    const gear = { atk: 31, def: 17, hp: 93, enhance };
    const before = JSON.stringify(gear), stats = effectiveEquipmentStats(gear);
    assert.equal(equipmentCorePower(gear), stats.atk * 2.2 + stats.def * 1.6 + stats.hp * .22);
    const hero = { ...HERO_INITIAL_ATTRIBUTES, level: 1, equip: { weapon: gear } };
    // Empty hero resolves attack27/defense22/HP100; every loadout uses these weights.
    assert.equal(heroPersonalPower(hero), Math.floor(27*2.2+22*1.6+100*.22+equipmentCorePower(gear)));
    assert.equal(JSON.stringify(gear), before);
  }
});
test('irrelevant display affixes and resistance do not add fictitious attack/defense/HP power', () => {
  const gear = { atk: 0, def: 0, hp: 0, enhance: 10, magic: [{ value: 10 }], resist: { physical: 5, magic: 5 } };
  assert.equal(heroPersonalPower({ ...HERO_INITIAL_ATTRIBUTES, level: 1, equip: { ring: gear } }), 116);
});
test('draft allocations preserve exact whole-set budgets and are monotonic', () => {
  let previous;
  for (const tier of EARLY_EQUIPMENT_DRAFT) {
    const items = draftEquipmentAtLevel(tier.level);
    assert.equal(items.length, 7);
    for (const stat of ['atk', 'def', 'hp']) {
      assert.equal(items.reduce((sum, item) => sum + item[stat], 0), tier[stat]);
      if (previous) items.forEach((item, index) => assert.ok(item[stat] >= previous[index][stat]));
    }
    previous = items;
  }
  assert.throws(() => draftEquipmentAtLevel(250), RangeError);
});
