import test from 'node:test';
import assert from 'node:assert/strict';
import { getStarterWeaponObjective } from '../app/starter-equipment-objective.ts';

function game({ level = 1, weapon = null, inventory = [] } = {}) {
  return { hero: { level, equip: { weapon } }, inventory };
}

const starterSword = {
  name: '商路短劍',
  source: '第一份商隊委託',
  slot: 'weapon',
  requiredLevel: 1,
};

test('first delivery reward guides the unequipped hero to the inventory', () => {
  assert.deepEqual(getStarterWeaponObjective(game({ inventory: [starterSword] })), {
    title: '裝備商路短劍',
    detail: '打開主角背包，穿上村長贈送的白裝短劍，提升攻擊力後再繼續狩獵。',
    tab: 'squad',
    window: 'inventory',
  });
});

test('does not nag after a weapon is equipped or when the reward is absent', () => {
  assert.equal(getStarterWeaponObjective(game({ weapon: { name: '護路短刀' }, inventory: [starterSword] })), null);
  assert.equal(getStarterWeaponObjective(game()), null);
});

test('only recognizes the eligible sword from the first delivery', () => {
  assert.equal(getStarterWeaponObjective(game({ inventory: [{ ...starterSword, source: '怪物掉落' }] })), null);
  assert.equal(getStarterWeaponObjective(game({ inventory: [{ ...starterSword, slot: 'offhand' }] })), null);
  assert.equal(getStarterWeaponObjective(game({ level: 1, inventory: [{ ...starterSword, requiredLevel: 2 }] })), null);
});
