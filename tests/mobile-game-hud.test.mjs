import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../app/game-v15.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../app/classic-map-interface.css', import.meta.url), 'utf8');

test('classic game HUD exposes the full resource strip and all ten requested features', () => {
  for (const label of ['切換角色', '雷霞祭壇', '市集', '港口', '城門', '世界地圖', '主角與隊伍', '裝備圖鑑', '冒險委託', '秘寶圖鑑', '設定']) {
    assert.ok(ui.includes(label), `missing HUD label: ${label}`);
  }
  assert.match(ui, /format\(game\.gold\)/);
  assert.match(ui, /format\(game\.newbieCoins\)/);
  assert.match(ui, /heroVital\.hp\s*\/\s*heroVital\.maxHp/);
  assert.match(ui, /unitPower\(game\.hero\)/);
  assert.ok(ui.includes('game.active.length'));
  assert.ok(ui.includes('ACTIVE_MERCENARY_LIMIT'));
});

test('mobile HUD preserves touch-sized controls and keeps music/map shortcuts out of the HUD', () => {
  assert.match(styles, /@media\s*\(max-width:\s*639px\)[\s\S]*?classic-live-game\s*>\s*\.classic-live-quicknav[\s\S]*?width:76px/);
  assert.match(styles, /\.classic-live-quicknav button \{[^}]*min-height:48px/);
  assert.match(styles, /\.classic-live-game \.isometric-destinations \{ display:none; \}/);
  assert.match(styles, /\.classic-live-game\s*>\s*\.scene-music-toggle\s*\{\s*position:fixed!important/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
