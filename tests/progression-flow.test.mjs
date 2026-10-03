import { readGameModules } from './game-module-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readGameModules("game-view-selector.ts", "game-quest-panel.tsx", "game-map-page.tsx", "game-relic-page.tsx");
const progression = readFileSync(new URL('../app/game-progression-view.ts', import.meta.url), 'utf8');
const roadmap = readFileSync(new URL('../app/progression-roadmap.tsx', import.meta.url), 'utf8');
const journal = readFileSync(new URL('../app/quest-journal.tsx', import.meta.url), 'utf8');

test('new player flow exposes the four first-session milestones', () => {
  for (const text of ['完成第一趟東海商路', '派遣傭兵探索沉沒遺跡', '討伐遺跡第一層 Boss', '討伐遺跡第二層 Boss']) assert.match(progression, new RegExp(text));
  assert.match(source, /getProgressionView\(game\)/);
});

test('growth roadmap and resource purpose guide are rendered from game state', () => {
  for (const text of ['漢陽郊外', '山賊首領', '遺跡第一層', '遺跡第二層', '區域 Boss']) assert.match(progression, new RegExp(text));
  assert.match(source, /QuestJournal/);
  assert.match(journal, /資源用途/);
  assert.match(journal, /遺跡鍛造/);
  assert.match(roadmap, /condition/);
  assert.match(roadmap, /reward/);
});

test('heavy map and relic surfaces are mounted only for their active tab', () => {
  assert.match(source, /activeTab === "map" && <IsometricWorldMap/);
  assert.match(source, /activeTab === "relic" && <RelicDispatchPanel/);
});
