import { readGameModules } from './game-module-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const inventorySource=readFileSync(new URL('../app/inventory-panel.tsx',import.meta.url),'utf8');
const caravanSource=readFileSync(new URL('../app/caravan-status.tsx',import.meta.url),'utf8');
const gameSource=readGameModules("game-squad-page.tsx", "game-city-page.tsx");

test('戰利品材料由遊戲狀態傳入無上限商隊背包',()=>{
  assert.match(gameSource,/materials=\{game\.materials\}/);
  assert.match(caravanSource,/materials=\{p\.materials\}/);
  assert.match(inventorySource,/戰利品材料/);
  assert.match(inventorySource,/sellAllMaterials/);
});

test('村莊交易所不再重複顯示材料出售清單',()=>{
  assert.doesNotMatch(gameSource,/className="exchange-materials"/);
  assert.match(gameSource,/材料請至商隊背包出售/);
});
