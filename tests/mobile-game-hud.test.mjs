import { readGameModules } from './game-module-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const ui = readGameModules("game-v15.tsx", "game-header.tsx", "game-navigation.tsx", "game-quest-panel.tsx", "game-inn-panel.tsx", "game-live-footer.tsx", "game-map-page.tsx", "game-dialogs.tsx", "game-ui-config.ts", "game-view-selector.ts", "use-game-preferences.ts", "game-battle-page.tsx");
const styles = readFileSync(new URL('../app/classic-map-interface.css', import.meta.url), 'utf8');
const mapConfig = readFileSync(new URL('../app/town-map-config.ts', import.meta.url), 'utf8');
const townMapWidth = Number(mapConfig.match(/width:\s*(\d+)/)?.[1]);
const townMapHeight = Number(mapConfig.match(/height:\s*(\d+)/)?.[1]);
const townMap = readFileSync(new URL('../app/isometric-world-map.tsx', import.meta.url), 'utf8');
const questPanel = readFileSync(new URL('../app/game-quest-panel.tsx', import.meta.url), 'utf8');
const mapPage = readFileSync(new URL('../app/game-map-page.tsx', import.meta.url), 'utf8');
const music = readFileSync(new URL('../app/scene-music.tsx', import.meta.url), 'utf8');
const journal = readFileSync(new URL('../app/quest-journal.tsx', import.meta.url), 'utf8');

function loadTsxComponent(source, name, dependencies = {}) {
  const parsed = ts.createSourceFile(`${name}.tsx`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = parsed.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(declaration, `missing component ${name}`);
  const code = ts.transpileModule(declaration.getText(parsed).replace(/^export\s+/, ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, jsx: ts.JsxEmit.React },
  }).outputText;
  const React = {
    Fragment: 'fragment',
    createElement(type, props, ...children) {
      const nextProps = { ...(props || {}) };
      if (children.length === 1) nextProps.children = children[0];
      else if (children.length > 1) nextProps.children = children;
      return { type, props: nextProps };
    },
  };
  const context = vm.createContext({ ...dependencies, React });
  vm.runInContext(`${code}\nglobalThis.component = ${name};`, context);
  return context.component;
}

function findElement(root, predicate) {
  if (!root || typeof root !== 'object') return undefined;
  if (predicate(root)) return root;
  const children = root.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
  return undefined;
}

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

test('quick navigation is grouped by player intent with stable onboarding keys', () => {
  for (const group of ['探索', '角色', '城鎮', '系統']) assert.ok(ui.includes(`quick-nav-group-label">${group}`));
  for (const key of ['battle', 'map', 'trade', 'squad', 'archive', 'treasure', 'contracts', 'hall', 'city', 'raid', 'settings']) {
    assert.match(ui, new RegExp(`data-nav-key="${key}"`));
  }
  assert.match(styles, /data-onboarding-locked="map"\][\s\S]*data-nav-key="map"/);
  assert.match(styles, /\.quick-nav-group-label::before/);
});

test('mobile HUD preserves touch-sized controls and keeps music/map shortcuts out of the HUD', () => {
  assert.match(styles, /@media\s*\(max-width:\s*639px\)[\s\S]*?classic-live-game\s*>\s*\.classic-live-quicknav[\s\S]*?width:88px/);
  assert.match(styles, /\.classic-live-quicknav button \{[^}]*min-height:48px/);
  assert.match(styles, /\.classic-live-game \.isometric-destinations \{ display:none; \}/);
  assert.match(styles, /\.classic-live-game\s*>\s*\.scene-music-toggle\s*\{\s*position:fixed!important/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('the configured town artwork exists and Phaser scales it uniformly to cover the map', () => {
  const src = mapConfig.match(/src:\s*"([^"]+)"/)?.[1];
  assert.ok(src?.startsWith('/assets/'), 'town background must use a public asset path');
  assert.ok(Number.isFinite(townMapWidth) && townMapWidth > 0 && Number.isFinite(townMapHeight) && townMapHeight > 0);
  const asset = new URL(`../public${src}`, import.meta.url);
  assert.equal(existsSync(asset), true, `configured town background is missing: ${src}`);
  const image = readFileSync(asset);
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
  assert.match(townMap, /this\.load\.image\("town-background",\s*TOWN_MAP_BACKGROUND\.src\)/);
  assert.match(townMap, /const backgroundScale = Math\.max\(this\.scale\.width \/ TOWN_MAP_BACKGROUND\.width, this\.scale\.height \/ TOWN_MAP_BACKGROUND\.height\)/);
  assert.match(townMap, /\.setDisplaySize\(TOWN_MAP_BACKGROUND\.width \* backgroundScale, TOWN_MAP_BACKGROUND\.height \* backgroundScale\)/);

  for (const [viewportWidth, viewportHeight] of [[916, 600], [390, 844]]) {
    const scale = Math.max(viewportWidth / townMapWidth, viewportHeight / townMapHeight);
    const displayedWidth = townMapWidth * scale;
    const displayedHeight = townMapHeight * scale;
    assert.ok(displayedWidth >= viewportWidth && displayedHeight >= viewportHeight);
    assert.equal(displayedWidth / displayedHeight, townMapWidth / townMapHeight, 'background scaling must preserve its aspect ratio');
  }
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

test('split Quest Panel and map controls update their state and expose accessible status', () => {
  assert.match(ui, /data-objective-collapsed=\{true\}/);
  assert.match(ui, /aria-expanded=\{quickNavExpanded\}/);
  assert.match(ui, /data-quicknav-collapsed=\{!view\.quickNavExpanded\}/);
  assert.match(ui, /id="mobile-game-nav" className="classic-live-quicknav"[^>]*hidden=\{!quickNavExpanded\}/);
  assert.match(ui, /className="forced-inn" hidden=\{game\.hero\.status!==['"]客棧中['"] \|\| !innPanelExpanded\}/);
  assert.match(ui, /className="forced-inn-reopen" aria-controls="inn-zone"/);
  assert.match(styles, /classic-live-quicknav\[hidden\]\s*\{\s*display:none!important;\s*\}/);
  assert.match(styles, /forced-inn\[hidden\] \{ display:none!important; \}/);

  let objectiveExpanded = false;
  const renderQuestPanel = loadTsxComponent(questPanel, 'GameQuestPanel', {
    ChevronDown: 'ChevronDown',
    Dialog: 'Dialog',
    DialogClose: 'DialogClose',
    DialogContent: 'DialogContent',
    DialogDescription: 'DialogDescription',
    DialogTitle: 'DialogTitle',
    QuestJournal: 'QuestJournal',
    claimAdventureQuest: () => {},
    gameplayContracts: [],
    grantXp: () => {},
  });
  const questProps = {
    game: {}, goToObjective: () => {}, mainObjective: { title: '測試目標' },
    objectiveExpanded, openNpcDialogue: () => {}, roadmapStages: [], setActiveTab: () => {},
    setGame: () => {}, setObjectiveExpanded: value => { objectiveExpanded = value; },
  };
  let questTree = renderQuestPanel(questProps);
  const openDetails = findElement(questTree, element => element.type === 'button' && element.props.className === 'objective-collapse-toggle');
  assert.ok(openDetails);
  assert.equal(openDetails.props['aria-expanded'], false);
  assert.equal(openDetails.props['aria-label'], '查看任務詳情');
  openDetails.props.onClick();
  assert.equal(objectiveExpanded, true);

  questTree = renderQuestPanel({ ...questProps, objectiveExpanded });
  const dialog = findElement(questTree, element => element.type === 'Dialog');
  assert.ok(dialog);
  assert.equal(dialog.props.open, true);
  assert.equal(dialog.props.onOpenChange, questProps.setObjectiveExpanded);
  const journalEntry = findElement(questTree, element => element.type === 'QuestJournal');
  assert.ok(journalEntry);
  journalEntry.props.onClose();
  assert.equal(objectiveExpanded, false);

  let npcLabelsVisible = true;
  let activeTab = 'map';
  const renderedMap = loadTsxComponent(mapPage, 'GameMapPage', {
    TabsContent: 'TabsContent',
    IsometricWorldMap: 'IsometricWorldMap',
    NpcDialoguePanel: 'NpcDialoguePanel',
    npcById: () => null,
  })({
    activeNpcId: null, activeTab, displayCityName: '漢陽', game: {}, handleNpcAction: () => {},
    mapLocationLabel: '新村村郊', mysteryNpcVisible: false, npcLabelsVisible,
    npcOpeningLine: '', openNpcDialogue: () => {}, progressiveUnlocks: { trade: true, hall: true, raid: true },
    setActiveNpcId: () => {}, setActiveTab: tab => { activeTab = tab; }, setCityService: () => {},
    setNpcLabelsVisible: visible => { npcLabelsVisible = visible; },
    tutorialCityLocked: false, tutorialMapLocked: false, tutorialNpcIds: [], tutorialTrialLocked: false,
  });
  const mapProps = findElement(renderedMap, element => element.type === 'IsometricWorldMap')?.props;
  assert.ok(mapProps);
  assert.equal(mapProps.npcLabelsVisible, true);
  const renderIsometricMap = loadTsxComponent(townMap, 'IsometricWorldMap', {
    useEffect: () => {},
    useRef: current => ({ current }),
    TOWN_MAP_BACKGROUND: { src: '/assets/merchant-theme/v1/residence.webp', width: townMapWidth, height: townMapHeight },
    VILLAGE_NPCS: [],
    HANYANG_MYSTERY_NPC: { id: 'mysterious-traveler', name: '旅人', role: '旅人', map: { x: 50, y: 50 } },
  });
  let mapTree = renderIsometricMap(mapProps);
  const labelToggle = findElement(mapTree, element => element.type === 'button' && element.props.className === 'map-label-toggle');
  assert.ok(labelToggle);
  assert.equal(labelToggle.props['aria-pressed'], true);
  assert.equal(labelToggle.props.disabled, false);
  labelToggle.props.onClick();
  assert.equal(npcLabelsVisible, false);
  mapTree = renderIsometricMap({ ...mapProps, npcLabelsVisible });
  const hiddenToggle = findElement(mapTree, element => element.type === 'button' && element.props.className === 'map-label-toggle');
  assert.equal(hiddenToggle.props['aria-pressed'], false);
  assert.equal(hiddenToggle.props['aria-label'], '顯示 NPC 名牌');
  const tutorialLockedMap = renderIsometricMap({ ...mapProps, tutorialLocked: true });
  const lockedToggle = findElement(tutorialLockedMap, element => element.type === 'button' && element.props.className === 'map-label-toggle');
  assert.equal(lockedToggle.props.disabled, true);

  assert.match(townMap, /data-npc-labels=\{npcLabelsVisible \? "shown" : "hidden"\}/);
  assert.match(styles, /data-npc-labels="hidden"\] \.village-npc-pin>b/);
  assert.match(styles, /isometric-world\[data-objective-expanded="true"\] \.village-npc-layer \{ inset:clamp\(112px,27%,132px\) 0 0; \}/);
  assert.match(styles, /data-quicknav-collapsed="true"\] \.tab-panel \{ right:0; \}/);
});

test('settings expose a persistent live music-volume control', () => {
  assert.match(ui, /GAME_UI_SETTINGS_KEY = "gersang-ui-settings-v1"/);
  assert.match(ui, /aria-label="遊戲音樂音量" type="range" min="0" max="100"/);
  assert.match(ui, /SceneMusic\s+scene=\{view\.musicScene\}\s+volume=\{view\.uiSettings\.musicVolume \/ 100\}/);
  assert.match(ui, /localStorage\.setItem\(GAME_UI_SETTINGS_KEY, JSON\.stringify\(uiSettings\)\)/);
  assert.match(music, /audio\.volume=Math\.max\(0,Math\.min\(1,volumeRef\.current\)\)/);
  assert.match(music, /audioRef\.current\.volume=Math\.max\(0,Math\.min\(1,volume\)\)/);
});

test('Thunder Altar selects the dedicated BOSS track', () => {
  assert.equal(existsSync(new URL('../public/assets/music/BOSS.mp3', import.meta.url)), true);
  assert.match(music, /raid:\{src:'\/assets\/music\/BOSS\.mp3',label:'雷霆祭壇'\}/);
  assert.match(ui, /activeTab==='raid'\?'raid'/);
});

test('scene settings expose auto, mobile, desktop and browser-fullscreen layouts', () => {
  assert.match(ui, /sceneMode: "auto"/);
  for (const mode of ['auto', 'mobile-916', 'pc-169', 'fullscreen']) assert.ok(ui.includes(`setSceneMode("${mode}")`));
  assert.match(ui, /data-scene-mode=\{view\.uiSettings\.sceneMode\}/);
  assert.match(ui, /document\.documentElement\.requestFullscreen\(\)/);
  assert.match(styles, /data-scene-mode="mobile-916"/);
  assert.match(styles, /data-scene-mode="pc-169"/);
  assert.match(styles, /data-scene-mode="fullscreen"/);
});
