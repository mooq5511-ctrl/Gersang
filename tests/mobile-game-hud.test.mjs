import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../app/game-v15.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../app/classic-map-interface.css', import.meta.url), 'utf8');
const mapConfig = readFileSync(new URL('../app/town-map-config.ts', import.meta.url), 'utf8');
const townMap = readFileSync(new URL('../app/isometric-world-map.tsx', import.meta.url), 'utf8');
const music = readFileSync(new URL('../app/scene-music.tsx', import.meta.url), 'utf8');

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

test('the high-resolution castle ruins artwork is wired as a proportion-preserving town backdrop', () => {
  assert.equal(existsSync(new URL('../public/assets/backgrounds/castle-ruins-v2.png', import.meta.url)), true);
  assert.match(mapConfig, /src:\s*"\/assets\/backgrounds\/castle-ruins-v2\.png"/);
  assert.match(styles, /background-image:url\("\/assets\/backgrounds\/castle-ruins-v2\.png"\)/);
});

test('current-location sign sits below the objective and names the starter outskirts', () => {
  assert.match(ui, /mapLocationLabel\s*=\s*currentCity\.id\s*===\s*"hanyang"\s*\?\s*"新村村郊"/);
  assert.match(ui, /locationLabel=\{mapLocationLabel\}/);
  assert.match(townMap, /<strong>\{locationLabel\}<\/strong>/);
  assert.match(styles, /\.classic-live-game \.isometric-world-heading \{ top:clamp\(104px,17vh,122px\)/);
  assert.match(styles, /\.classic-live-game \.isometric-world-heading \{ top:94px;left:9px/);
});

test('floating NPC markers and sidebar buttons use clear metal states and touch targets', () => {
  assert.match(styles, /\.classic-live-game \.classic-live-quicknav button \{ border:1px solid #746347/);
  assert.match(styles, /\.classic-live-game \.classic-live-quicknav button\.active/);
  assert.match(styles, /\.classic-live-game \.village-npc-pin \{ min-width:76px;min-height:44px/);
  assert.match(styles, /\.classic-live-game \.village-npc-pin:hover/);
  assert.match(styles, /\.classic-live-game \.isometric-status \{ min-width:154px/);
});

test('overlapping HUD regions can be collapsed and map NPC nameplates can be hidden', () => {
  assert.match(ui, /data-objective-collapsed=\{!objectiveExpanded\}/);
  assert.match(ui, /aria-expanded=\{objectiveExpanded\}/);
  assert.match(ui, /objective-collapsed-label" title=\{mainObjective\.title\}>主線・\{mainObjective\.title\}/);
  assert.match(ui, /aria-expanded=\{quickNavExpanded\}/);
  assert.match(ui, /data-quicknav-collapsed=\{!quickNavExpanded\}/);
  assert.match(ui, /id="mobile-game-nav" className="classic-live-quicknav"[^>]*hidden=\{!quickNavExpanded\}/);
  assert.match(ui, /className="forced-inn" hidden=\{game\.hero\.status!==['"]客棧中['"] \|\| !innPanelExpanded\}/);
  assert.match(ui, /className="forced-inn-reopen" aria-controls="inn-zone"/);
  assert.match(ui, /目前所在・\{mapLocationLabel\}/);
  assert.match(townMap, /data-npc-labels=\{npcLabelsVisible \? "shown" : "hidden"\}/);
  assert.match(townMap, /data-objective-expanded=\{objectiveExpanded\}/);
  assert.match(townMap, /aria-pressed=\{npcLabelsVisible\}/);
  assert.match(styles, /isometric-world\[data-objective-expanded="true"\] \.village-npc-layer \{ inset:clamp\(112px,27%,132px\) 0 0; \}/);
  assert.match(styles, /data-quicknav-collapsed="true"\] \.tab-panel \{ right:0; \}/);
  assert.match(styles, /classic-live-quicknav\[hidden\]\s*\{\s*display:none!important;\s*\}/);
  assert.match(styles, /forced-inn\[hidden\] \{ display:none!important; \}/);
  assert.match(styles, /data-npc-labels="hidden"\] \.village-npc-pin>b/);
});

test('settings expose a persistent live music-volume control', () => {
  assert.match(ui, /GAME_UI_SETTINGS_KEY = "gersang-ui-settings-v1"/);
  assert.match(ui, /aria-label="遊戲音樂音量" type="range" min="0" max="100"/);
  assert.match(ui, /SceneMusic scene=\{musicScene\} volume=\{uiSettings\.musicVolume \/ 100\}/);
  assert.match(ui, /localStorage\.setItem\(GAME_UI_SETTINGS_KEY, JSON\.stringify\(uiSettings\)\)/);
  assert.match(music, /audio\.volume=Math\.max\(0,Math\.min\(1,volumeRef\.current\)\)/);
  assert.match(music, /audioRef\.current\.volume=Math\.max\(0,Math\.min\(1,volume\)\)/);
});

test('screen-fit settings default to responsive full-bleed and can preserve the complete scene', () => {
  assert.match(ui, /sceneFit: "cover"/);
  assert.match(ui, /<legend>畫面比例與場景顯示<\/legend>/);
  assert.match(ui, /name="game-scene-fit" value="cover"/);
  assert.match(ui, /name="game-scene-fit" value="contain"/);
  assert.match(ui, /data-scene-fit=\{uiSettings\.sceneFit\}/);
  assert.match(styles, /\.classic-live-game\[data-scene-fit="contain"\] \.isometric-world \{ background-size:contain/);
});
