import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { gameplayContracts } from '../data/contracts/gameplay-contracts.ts';

// Load the pure catalog builder from the TSX module without a browser.
const path = new URL('../app/quest-journal.tsx', import.meta.url);
const compiled = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const resolved = compiled.replace(/from "([^"]+)"/g, (_, specifier) => `from "${specifier.startsWith('.') ? new URL(`${specifier}.ts`, path).href : import.meta.resolve(specifier)}"`);
const { buildQuestJournal, QuestJournal } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);
const state = (overrides = {}) => ({
  hanyangPrologueStep: 'arrival', trade: { trips: 0, totalProfit: 0 },
  relicDungeon: { materialsFound: 0, equipmentFound: 0, relicShards: 0, clearedRuns: 0 },
  hero: { level: 1, equip: {} }, mercs: [], restingMercs: [], territory: { buildings: { waystation: 0 } },
  npcProgress: { activeQuests: [], completedQuests: [] }, claimedContracts: [],
  cityHall: { availableIds: ['hall-clear-raccoon'], active: [], completedIds: [], lifetime: { materials: 0, equipment: 0 } },
  stage: 1, kills: 0, starterDeliveryKills: 0, inventory: [], materials: {}, ...overrides,
});
const catalog = (game) => buildQuestJournal(game, { title: '目前目標', detail: '任務描述' }, [], gameplayContracts.filter(item => !['tier1', 'tier2', 'awakened'].includes(item.metric)));

test('future chapters and all existing commission templates remain visible without bypassing locks', () => {
  const entries = catalog(state());
  assert.equal(entries.filter(item => item.category === '市政廳').length, 8);
  const future = entries.find(item => item.id === 'story:departure');
  assert.equal(future.status, '未解鎖');
  assert.equal(future.destination, undefined);
  assert.equal(entries.find(item => item.id === 'contract:field-10').destination, undefined);
  assert.ok(entries.findIndex(item => item.id === 'story:bandit-trial') < entries.findIndex(item => item.id === 'story:caravan-delivery'));
});

test('active civic progress uses the acceptance baseline and distinguishes unposted quests', () => {
  const game = state({ hanyangPrologueStep: 'completed', hero: { level: 20, equip: {} }, kills: 12 });
  game.cityHall.active = [{ id: 'hall-clear-raccoon', startValue: 8 }];
  const entries = catalog(game);
  assert.equal(entries.find(item => item.id === 'hall:hall-clear-raccoon').progress, '4 / 5');
  assert.equal(entries.find(item => item.id === 'hall:hall-clear-raccoon').status, '進行中');
  assert.equal(entries.find(item => item.id === 'hall:hall-prepare-supplies').status, '尚未公告');
  assert.equal(entries.find(item => item.id === 'hall:hall-prepare-supplies').destination, undefined);
});

test('ready and claimed contracts match the real claim action without legacy reward promises', () => {
  const game = state({ hanyangPrologueStep: 'completed', hero: { level: 20, equip: {} }, stage: 10 });
  let entry = catalog(game).find(item => item.id === 'contract:field-10');
  assert.equal(entry.status, '可領取');
  assert.equal(entry.reward, '18,000 兩');
  game.claimedContracts = ['field-10'];
  entry = catalog(game).find(item => item.id === 'contract:field-10');
  assert.equal(entry.status, '已完成');
  assert.equal(entry.destination, undefined);
});

test('opening the catalog is read-only and civic rewards include quality scaling', () => {
  const game = state();
  const before = structuredClone(game);
  const entry = catalog(game).find(item => item.id === 'hall:hall-prepare-supplies');
  assert.match(entry.reward, /120,000 兩/);
  assert.match(entry.reward, /肉類 ×200/);
  assert.deepEqual(game, before);
});

test('all 25 level bands render readable journal controls and current chapter objectives', () => {
  for (let band = 1; band <= 25; band++) {
    const game = state({ hero: { level: band * 10, equip: {} } });
    const html = renderToStaticMarkup(createElement(QuestJournal, { game, current: { title: '目前目標', detail: '任務描述' }, stages: [], contracts: gameplayContracts, onNavigate() {}, onClaim() {}, onClose() {} }));
    assert.match(html, /完整旅程（Lv.1–250）/);
    assert.match(html, /每日任務/);
    assert.match(html, /隱藏已完成/);
    assert.match(html, new RegExp(`抵達 Lv\\.${band * 10}`));
    assert.match(html, /收合任務面板/);
  }
});

test('future chapter data includes requirements, live progress, rewards and no bypass action', () => {
  const entries = buildQuestJournal(state(), { title: '目前目標', detail: '任務描述' }, [], gameplayContracts);
  const last = entries.find(item => item.id === 'journey-250-chapter');
  assert.equal(last.status, '未解鎖');
  assert.equal(last.destination, undefined);
  assert.equal(last.claimId, undefined);
  assert.match(last.requirement, /Lv.241/);
  assert.match(last.reward, /合成核心 ×5/);
  assert.match(last.progress, /250/);
});

test('collapsed journal keeps its toggle away from the guide and expanded journal sits above it', () => {
  const css = readFileSync(new URL('../app/quest-journal.css', import.meta.url), 'utf8');
  assert.match(css, /\.main-objective\.is-collapsed\s*\{\s*width:\s*min\(380px,/);
  assert.match(css, /\.main-objective:not\(\.is-collapsed\)\s*\{[^}]*z-index:\s*85/);
  assert.match(css, /@media\s*\(max-width:\s*639px\)[\s\S]*width:\s*calc\(100vw - 16px\)/);
});

test('sky journal uses a real background asset without intercepting task controls', () => {
  const css = readFileSync(new URL('../app/quest-journal.css', import.meta.url), 'utf8');
  assert.ok(existsSync(new URL('../public/assets/backgrounds/quest-journal-sky-v1.png', import.meta.url)));
  assert.match(css, /background-image:\s*url\("\/assets\/backgrounds\/quest-journal-sky-v1\.png"\)/);
  assert.match(css, /background-size:\s*100% 100%/);
  assert.match(css, /\.quest-journal-detail\s*\{\s*background:\s*#fffdf04d/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
