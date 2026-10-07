import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: filename,
}).outputText, filename);
require.extensions['.tsx'] = require.extensions['.ts'];
const { MONSTER_REDESIGN, MONSTER_REGION_LABELS, rollRedesignedMaterials } = require('../data/monsters/monster-redesign.ts');
const { DUNGEONS, isBossMonster, dungeonStep, freshDungeon, WORLD_ZONES } = require('../app/dungeon-engine.ts');
const { ORIGINAL_ECOLOGY_MONSTERS, ORIGINAL_LEGACY_DUNGEON_MONSTERS } = require('../data/monsters/dungeon-monsters.ts');
const { ORIGINAL_RELIC_DUNGEON_MONSTERS } = require('../data/monsters/relic-dungeon-monsters.ts');
const {RELIC_BOSS_BALANCE_V1} = require('../data/monsters/relic-boss-balance.ts');
const { sourceEnemies } = require('../app/v17-content.ts');
const { MATERIAL_PRICES, MATERIAL_BUY_PRICES, sellMaterial } = require('../app/village-exchange.ts');
const { monsterCatalogEntries: monsterCompendiumEntries, monsterCompendiumEntries: worldCompendiumEntries, COMPENDIUM_MAP_IDS } = require('../app/monster-compendium-data.ts');
const { relicMaterialLoot } = require('../app/relic-material-loot.ts');
const { battleMaps } = require('../app/reference-data.ts');

test('world-map codex destinations and encounters match the visible world map exactly', () => {
  assert.deepEqual(COMPENDIUM_MAP_IDS, battleMaps.map(map => map.id));
  for (const map of battleMaps) {
    const entries = worldCompendiumEntries.filter(entry => entry.mapId === map.id);
    const encounters = sourceEnemies.filter(enemy => enemy.mapId === map.id && enemy.dungeonId);
    assert.deepEqual(entries.map(entry => entry.id), encounters.map(enemy => enemy.dungeonId), map.id);
    assert.deepEqual(entries.map(entry => entry.name), encounters.map(enemy => enemy.name), map.id);
    assert.ok(entries.every(entry => entry.region === map.name));
  }
  assert.ok(worldCompendiumEntries.every(entry => COMPENDIUM_MAP_IDS.includes(entry.mapId)));
  assert.ok(!worldCompendiumEntries.some(entry => ['legacy-dungeon', 'korea-field', 'sunken-relic', 'hanyang'].includes(entry.mapId)));
});

test('all current non-boss IDs are redesigned and every region has complete entries', () => {
  for (const [id, monster] of Object.entries(DUNGEONS)) {
    if (isBossMonster(monster.name)) continue;
    const design = MONSTER_REDESIGN[id];
    assert.ok(design, id);
    assert.equal(monster.name, design.name, id);
    for (const field of ['hp','atk','level','xp','gold']) assert.ok(Number.isFinite(monster[field]) && monster[field] > 0, `${id}:${field}`);
    assert.equal(design.materialDrops.length, 2, id);
    assert.ok(MONSTER_REGION_LABELS[design.region], id);
  }
  for (const region of Object.keys(MONSTER_REGION_LABELS)) assert.ok(monsterCompendiumEntries.some(entry => entry.mapId === region), region);
  assert.equal(monsterCompendiumEntries.length, Object.keys(DUNGEONS).length);
  assert.equal(new Set(monsterCompendiumEntries.map(entry => entry.id)).size, monsterCompendiumEntries.length);
  assert.ok(monsterCompendiumEntries.every(entry => entry.dropDetails.length || entry.equipmentDrops.length));
  assert.ok(sourceEnemies.every(enemy => enemy.dungeonId && enemy.hp > 0 && enemy.attack > 0));
  for (const map of battleMaps) assert.ok(sourceEnemies.some(enemy => enemy.mapId === map.id), `playable map: ${map.id}`);
});

test('world bosses retain values; real relic bosses use the explicit V1 growth calibration', () => {
  const old = { ...ORIGINAL_ECOLOGY_MONSTERS, ...ORIGINAL_LEGACY_DUNGEON_MONSTERS, ...ORIGINAL_RELIC_DUNGEON_MONSTERS };
  for (const [id, monster] of Object.entries(DUNGEONS)) if (isBossMonster(monster.name)) {
    const expected={...old[id],...RELIC_BOSS_BALANCE_V1[id]};
    for (const field of ['name','level','hp','mp','atk','dex','xp','gold']) assert.equal(monster[field], expected[field], `${id}:${field}`);
    assert.equal(MONSTER_REDESIGN[id], undefined, id);
  }
});

test('all advertised materials have executable prices and no buy/sell arbitrage', () => {
  for (const entry of monsterCompendiumEntries) for (const drop of entry.dropDetails) {
    if (drop.item === '[新手]兌換銅錢') continue;
    assert.ok(drop.price > 0, `${entry.id}:${drop.item}`);
    assert.equal(drop.price, MATERIAL_PRICES[drop.item]);
    assert.ok(MATERIAL_BUY_PRICES[drop.item] >= drop.price * 2);
    const sale = sellMaterial({ [drop.item]: 1 }, 0, drop.item);
    assert.equal(sale.gold, drop.price);
    assert.equal(sale.materials[drop.item], undefined);
  }
});

test('each redesigned monster uses real combat stats and its actual loot table', () => {
  const hero = { hp: 1e12, maxHp: 1e12, mp: 100, maxMp: 100, str: 1, dex: 1, mercenaryIntelligence: 1, attack: 1, defense: 0, staff: false };
  for (const [id, design] of Object.entries(MONSTER_REDESIGN)) {
    assert.ok(DUNGEONS[id], id);
    const initial = dungeonStep(freshDungeon(), hero, 'start', 1000, id, .99, 0, 0, 0);
    const enemy = initial.state.realtime.enemies[0];
    assert.equal(enemy.maxHp, design.hp, id);
    assert.equal(enemy.atk, design.atk, id);
    assert.equal(enemy.ranged, design.ranged, id);
    assert.equal(enemy.magicAttack, design.magicAttack, id);
    const won = dungeonStep({ ...initial.state, realtime: { ...initial.state.realtime, winner: 'player' } }, hero, 'tick', 1100, id, .99, 0, 0, 0, initial.party, 0, [0, 0]);
    assert.deepEqual(won.reward.materials, design.materialDrops.map(drop => drop.item), id);
    assert.equal(won.reward.gold, design.gold, id);
    assert.deepEqual(rollRedesignedMaterials(id, [.45, .08]), [], id);
    assert.deepEqual(rollRedesignedMaterials(id, [1, 1]), [], id);
  }
  for (const zone of WORLD_ZONES) assert.deepEqual(zone.dropTable, MONSTER_REDESIGN[zone.enemy].materialDrops);
});

test('relic loot is available in dispatch settlement, not only listed in the codex', () => {
  for (const id of Object.keys(ORIGINAL_RELIC_DUNGEON_MONSTERS)) {
    const drops = relicMaterialLoot(id, [0, 0]);
    assert.ok(drops.length > 0, id);
    assert.ok(drops.every(item => MATERIAL_PRICES[item] > 0), id);
    assert.deepEqual(relicMaterialLoot(id, [1, 1]), [], id);
  }
});

test('the published full catalog stays in sync with live numerical and price definitions', () => {
  const report = readFileSync(new URL('../docs/monster-redesign-catalog.md', import.meta.url), 'utf8');
  for (const entry of monsterCompendiumEntries) {
    assert.ok(report.includes(`${entry.name}／${entry.id}`), entry.id);
    assert.ok(report.includes(`${entry.hp}／${entry.mp}`), entry.id);
    for (const drop of entry.dropDetails) assert.ok(report.includes(`${drop.item}（${Number(drop.rate.toFixed(2))}%；${drop.price} 兩）`), `${entry.id}:${drop.item}`);
  }
});
