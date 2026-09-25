import test from 'node:test';
import assert from 'node:assert/strict';
import { ItemTooltipManager } from '../app/item-tooltip-manager.ts';

test('equipment tooltip is data-driven and includes every requested combat field', () => {
  const tooltip = ItemTooltipManager.equipment(
    {
      name: '測試劍',
      rarity: '稀有',
      atk: 25,
      def: 8,
      bonus: { str: 4, agi: 2, intel: 1, vit: 3 },
      requiredLevel: 12,
      source: '森林狼',
    },
    { kind: '武器', description: '測試說明', sellPrice: 500, owned: 2 },
  );
  assert.equal(tooltip.source, '森林狼');
  assert.deepEqual(
    tooltip.sections[1].fields.map((field) => field.label),
    ['攻擊', '防禦', '生命', '力量', '敏捷', '智力', '體質', '需求等級', '需求職業'],
  );
});

test('equipment tooltip includes enhancement, resistance, sockets, and magic affixes', () => {
  const tooltip = ItemTooltipManager.equipment(
    {
      name: '紫色・測試甲',
      rarity: '傳說',
      hp: 120,
      enhance: 5,
      resist: { physical: 8, magic: 4 },
      socketGem: { name: '紅寶石', count: 2, totalValue: 16 },
      magic: [{ id: 'crit', name: '會心', text: '暴擊率 +12%', value: 12 }],
      source: '市政廳委託',
    },
    { kind: '盔甲', description: '測試說明', sellPrice: 900, owned: 1 },
  );
  assert.ok(tooltip.sections.some(section => section.title === '強化與鑲嵌'));
  assert.ok(tooltip.sections.some(section => section.title === '魔法詞條'));
  assert.equal(tooltip.sections[1].fields.find(field => field.label === '生命')?.value, '+241');
});

test('materials and consumables use metadata plus their existing quantities', () => {
  const material = ItemTooltipManager.material('狼皮', 3, 25, [
    { name: '森林狼', drops: ['狼皮'] },
  ]);
  const potion = ItemTooltipManager.consumable(
    {
      id: 'healing',
      name: '金創藥',
      price: 600,
      effect: '恢復 HP',
      hpRestore: 0.5,
    },
    4,
  );
  assert.equal(material.source, '森林狼');
  assert.equal(
    potion.sections[1].fields.find((field) => field.label === '回血量')?.value,
    '50% 最大 HP',
  );
});

test('tooltip placement stays within the viewport', () => {
  assert.deepEqual(
    ItemTooltipManager.position(
      { x: 990, y: 790 },
      { width: 1000, height: 800 },
    ),
    { left: 672, top: 402 },
  );
});
