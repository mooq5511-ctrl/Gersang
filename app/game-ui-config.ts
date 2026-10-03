import { EQUIPMENT_LABELS,EQUIPMENT_SLOTS } from './equipment-slots';

export const slots = EQUIPMENT_SLOTS;

export const bossMonsterArt:Record<string,string> = {
  '山賊首領': '/assets/monsters/bandit-chief-normal.png',
  '海賊王': '/assets/monsters/bandit-chief-normal.png',
  '狂虎': '/assets/monsters/gale-tiger.jpg?v=20260910',
  '多聞天王': '/assets/monsters/sumeru/vaisravana-area.jpg',
  '廣目天王': '/assets/monsters/sumeru/virupaksa-area.jpg',
};

export const slotLabels = EQUIPMENT_LABELS;

export const GAME_UI_SETTINGS_KEY = "gersang-ui-settings-v1";

export type SceneDisplayMode = "auto" | "mobile-916" | "pc-169" | "fullscreen";

export type GameUiSettings = { musicVolume: number; sceneMode: SceneDisplayMode };

export const DEFAULT_GAME_UI_SETTINGS: GameUiSettings = { musicVolume: 42, sceneMode: "auto" };

export const mapFeatureIcons: Record<string, string> = { field: "🌾", lake: "🌊", sea: "⚓", forest: "🌲", ice: "❄️", desert: "☀️", sumeru: "⛰️", shambhala: "🏯" };

export const DEFAULT_BATTLE_PANEL_VISIBILITY = { partyVitals: true, mapNavigation: true, monsterSelection: true, battleLogs: true };

export type BattlePanelVisibility = typeof DEFAULT_BATTLE_PANEL_VISIBILITY;

export const WORLD_MAP_NODE_POSITIONS: Record<string, [number, number]> = {
  "starter-outskirts": [15, 58],
  "millennium-lake": [28, 41],
  "japan-sea": [50, 31],
  "miasma-forest": [53, 51],
  "ice-temple": [74, 35],
  "taj-mahal": [79, 63],
  sumeru: [60, 14],
  shambhala: [91, 19],
};

export const BATTLE_PANEL_LABELS: Array<[keyof BattlePanelVisibility, string]> = [
  ["partyVitals", "出戰隊伍"],
  ["mapNavigation", "地圖瀏覽"],
  ["monsterSelection", "怪物選擇"],
  ["battleLogs", "戰鬥紀錄"],
];

export function readGameUiSettings(): GameUiSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(GAME_UI_SETTINGS_KEY) || "null") as Partial<GameUiSettings> | null;
    const sceneMode = saved?.sceneMode;
    return {
      musicVolume: typeof saved?.musicVolume === "number" && Number.isFinite(saved.musicVolume) ? Math.max(0, Math.min(100, Math.round(saved.musicVolume))) : DEFAULT_GAME_UI_SETTINGS.musicVolume,
      sceneMode: sceneMode === "mobile-916" || sceneMode === "pc-169" || sceneMode === "fullscreen"
        ? sceneMode
        : "auto",
    };
  } catch {
    return DEFAULT_GAME_UI_SETTINGS;
  }
}
