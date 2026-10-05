import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
}).outputText, filename);
const { purchaseEquipmentBatchAction, purchaseTierEquipmentAction } = require('../app/game-inventory-actions.ts');
const { tierEquipmentShopCatalog, tierEquipmentPrice } = require('../app/tier-equipment.ts');
const { makeOfficialEquipment } = require('../app/game-equipment-factory.ts');
const {effectiveEquipmentStats} = require('../app/equipment-stats.ts');
const {officialEquipment} = require('../data/items/official-equipment.ts');
const addLog = (logs, message) => [...logs, message];
const state = (gold = 1000) => ({ gold, inventory: [{ uid: 'existing' }], logs: [], hero: { level: 200 } });

test('one batch charges exactly once and preserves each separately identified quality', () => {
  const original = state(300);
  const notices = [];
  const result = purchaseEquipmentBatchAction(original, 3, 100, '木刀', index => ({ uid: `new-${index}`, rarity: ['普通', '稀有', '傳說'][index] }), addLog, message => notices.push(message));
  assert.equal(result.gold, 0);
  assert.equal(result.inventory.length, 4);
  assert.equal(new Set(result.inventory.map(item => item.uid)).size, 4);
  assert.equal(notices.length, 1);
  assert.match(notices[0], /木刀.*×3/);
  assert.match(notices[0], /普通 1 件・稀有 1 件・傳說 1 件/);
  assert.equal(result.logs.length, 1);
  assert.equal(original.gold, 300);
  assert.equal(original.inventory.length, 1);
});

test('insufficient funds rejects the entire batch without generating items', () => {
  const original = state(299);
  let generated = 0;
  const notices = [];
  const result = purchaseEquipmentBatchAction(original, 3, 100, '木刀', () => { generated++; }, addLog, message => notices.push(message));
  assert.strictEqual(result, original);
  assert.equal(generated, 0);
  assert.match(notices[0], /還差 1 兩/);
});

test('invalid quantities never charge or generate equipment', () => {
  for (const quantity of [0, -1, 1.5, 101, NaN, Infinity]) {
    const original = state();
    assert.strictEqual(purchaseEquipmentBatchAction(original, quantity, 1, '木刀', () => { assert.fail('generated invalid order'); }, addLog, () => {}), original);
  }
  assert.equal(purchaseEquipmentBatchAction(state(), 100, 1, '木刀', index => ({ uid: `new-${index}`, rarity: '普通' }), addLog, () => {}).inventory.length, 101);
});

test('high-tier weapons roll quality independently using the weapon shop odds', () => {
  const spec = tierEquipmentShopCatalog.find(item => item.part === 'weapon' && item.requiredLevel >= 120);
  const total = tierEquipmentPrice(spec) * 3;
  const originalRandom = Math.random;
  const rolls = [0.003, 0.03, 0.2];
  try {
    Math.random = () => rolls.shift();
    const result = purchaseTierEquipmentAction(state(total), spec.id, 1, '漢陽', 'batch', addLog, () => {}, 3);
    assert.equal(result.gold, 0);
    assert.deepEqual(result.inventory.slice(0, 3).map(item => item.rarity), ['傳說', '史詩', '稀有']);
    assert.deepEqual(result.inventory.slice(0, 3).map(item => item.atk), [spec.atk, spec.atk, spec.atk]);
    assert.deepEqual(result.inventory.slice(0, 3).map(item => effectiveEquipmentStats(item).atk), [2, 1.5, 1.2].map(multiplier => Math.floor(spec.atk * multiplier)));
    assert.equal(new Set(result.inventory.map(item => item.uid)).size, 4);
  } finally { Math.random = originalRandom; }
});

test('batch purchases keep high-tier level restrictions', () => {
  const spec = tierEquipmentShopCatalog.find(item => item.part === 'weapon' && item.requiredLevel >= 120);
  const original = { ...state(1e9), hero: { level: spec.requiredLevel - 1 } };
  const notices = [];
  assert.strictEqual(purchaseTierEquipmentAction(original, spec.id, 1, '漢陽', 'batch', addLog, message => notices.push(message), 10), original);
  assert.match(notices[0], /需要 Lv/);
});

test('armor appraisal matches the new quality intervals and defense multipliers', () => {
  const originalRandom = Math.random;
  const record = officialEquipment.find(item=>item.id==='leather');
  try {
    for (const [roll, rarity, multiplier] of [[0.003, '傳說', 2], [0.005, '史詩', 1.5], [0.055, '稀有', 1.2], [0.355, '普通', 1]]) {
      Math.random = () => roll;
      const item = makeOfficialEquipment(record);
      assert.equal(item.rarity, rarity);
      assert.equal(item.def,record.def);
      assert.equal(effectiveEquipmentStats(item).def, Math.floor(record.def * multiplier));
    }
  } finally { Math.random = originalRandom; }
});

test('high-tier armor batch independently identifies every piece and charges the displayed total', () => {
  const spec = tierEquipmentShopCatalog.find(item => item.part === 'armor' && item.requiredLevel >= 120);
  const total = Math.floor(tierEquipmentPrice(spec) * 1.2) * 3;
  const originalRandom = Math.random;
  const rolls = [0.003, 0.03, 0.2];
  try {
    Math.random = () => rolls.shift();
    const result = purchaseTierEquipmentAction(state(total), spec.id, 1.2, '漢陽', 'armor-batch', addLog, () => {}, 3);
    assert.equal(result.gold, 0);
    assert.deepEqual(result.inventory.slice(0, 3).map(item => item.rarity), ['傳說', '史詩', '稀有']);
    assert.deepEqual(result.inventory.slice(0, 3).map(item => item.def), [spec.def, spec.def, spec.def]);
    assert.deepEqual(result.inventory.slice(0, 3).map(item => effectiveEquipmentStats(item).def), [2, 1.5, 1.2].map(multiplier => Math.floor(spec.def * multiplier)));
    assert.equal(new Set(result.inventory.map(item => item.uid)).size, 4);
  } finally { Math.random = originalRandom; }
});
