/** 遺跡地下城專用怪物池。數值可直接供派遣報告與即時戰鬥使用。 */
import { MONSTER_REDESIGN, redesignMonsterTable } from './monster-redesign.ts';
export type RelicMonsterKind = "普通" | "菁英" | "Boss";

export type RelicMonsterDefinition = {
  id: string;
  name: string;
  kind: RelicMonsterKind;
  level: number;
  hp: number;
  mp: number;
  atk: number;
  dex: number;
  xp: number;
  gold: number;
  drop: number;
  loot: string[];
  skill: string;
  description: string;
  physicalDefense?: number;
  magicDefense?: number;
};

export const ORIGINAL_RELIC_DUNGEON_MONSTERS = {
  relic_moss_warden: { id: "relic_moss_warden", name: "苔甲守衛", kind: "普通", level: 38, hp: 1800, mp: 60, atk: 92, dex: 24, xp: 520, gold: 420, drop: 0.3, loot: ["王朝苔甲", "遺跡鐵屑"], skill: "石甲", description: "吸收潮氣凝成護甲，第一層最常見的遺跡守衛。", physicalDefense: 90, magicDefense: 55 },
  relic_royal_skeleton: { id: "relic_royal_skeleton", name: "王陵骸骨兵", kind: "普通", level: 42, hp: 2200, mp: 90, atk: 108, dex: 28, xp: 640, gold: 480, drop: 0.32, loot: ["王陵骨片", "斷裂古劍"], skill: "骨刃", description: "千年王陵的守墓者，倒下後仍會握緊斷劍。" },
  relic_ash_wisp: { id: "relic_ash_wisp", name: "灰燼鬼火", kind: "普通", level: 45, hp: 1500, mp: 260, atk: 125, dex: 36, xp: 720, gold: 560, drop: 0.35, loot: ["王朝灰燼", "微光晶核"], skill: "灼燒", description: "盤旋在祭壇上方的殘火，會留下短暫灼燒。", magicDefense: 105 },
  relic_tide_leech: { id: "relic_tide_leech", name: "潮汐水蛭", kind: "普通", level: 48, hp: 2600, mp: 80, atk: 118, dex: 32, xp: 780, gold: 610, drop: 0.36, loot: ["潮汐腺體", "深水黏液"], skill: "吸血", description: "依附在水道石壁上的寄生怪，會從傷口抽走生命。" },
  relic_salt_raider: { id: "relic_salt_raider", name: "鹽霧掠奪者", kind: "普通", level: 52, hp: 3100, mp: 130, atk: 145, dex: 39, xp: 900, gold: 720, drop: 0.38, loot: ["鹽霧披風", "沉船銅扣"], skill: "突襲", description: "被王朝遺骸吸引而來的海盜亡魂，專挑後排下手。" },
  relic_crystal_beetle: { id: "relic_crystal_beetle", name: "晶化甲蟲", kind: "普通", level: 56, hp: 3800, mp: 110, atk: 164, dex: 30, xp: 1060, gold: 850, drop: 0.4, loot: ["晶化甲殼", "遺跡碎晶"], skill: "反光甲", description: "背甲長滿古代晶簇，物理攻擊會被部分折返。", physicalDefense: 145, magicDefense: 80 },
  relic_venom_cerberus: { id: "relic_venom_cerberus", name: "毒沼三首蜥", kind: "菁英", level: 62, hp: 9800, mp: 520, atk: 310, dex: 45, xp: 4200, gold: 3600, drop: 0.5, loot: ["三首毒牙", "濃縮毒核", "古代裝備胚"], skill: "三重毒噬", description: "三個頭顱各自鎖定一名目標，毒傷會逐回合累積。", physicalDefense: 210, magicDefense: 160 },
  relic_golden_scarab: { id: "relic_golden_scarab", name: "黃金聖甲蟲", kind: "菁英", level: 68, hp: 12600, mp: 600, atk: 360, dex: 52, xp: 5600, gold: 4800, drop: 0.56, loot: ["聖甲金片", "太陽琥珀", "古代裝備胚"], skill: "日蝕護甲", description: "黃金前廳的守門者，護甲展開時會大幅降低承受傷害。", physicalDefense: 280, magicDefense: 220 },
  relic_silent_oracle: { id: "relic_silent_oracle", name: "失語神諭者", kind: "菁英", level: 74, hp: 15400, mp: 1200, atk: 430, dex: 58, xp: 7000, gold: 6200, drop: 0.62, loot: ["失語面紗", "神諭殘頁", "古代裝備胚"], skill: "無聲詛咒", description: "守著王座預言的祭司，會降低隊伍輸出並施放持續傷害。", physicalDefense: 220, magicDefense: 330 },
  relic_sunken_king: { id: "relic_sunken_king", name: "沉沒王・阿斯塔洛斯", kind: "Boss", level: 82, hp: 884760, mp: 28000, atk: 1680, dex: 68, xp: 120000, gold: 120000, drop: 0.75, loot: ["沉沒王冠", "王朝核心", "古代Boss裝備"], skill: "王座反擊／王朝殘火", description: "以遺跡核心重塑王座的古王，生命低於 50% 後進入狂暴。", physicalDefense: 520, magicDefense: 460 },
  relic_abyssal_dragon: { id: "relic_abyssal_dragon", name: "深淵遺跡海龍", kind: "Boss", level: 88, hp: 1120000, mp: 36000, atk: 2140, dex: 72, xp: 160000, gold: 160000, drop: 0.8, loot: ["海龍逆鱗", "深淵龍心", "古代Boss裝備"], skill: "深淵吐息／潮汐反噬", description: "沉睡在王朝最深水脈的古代海龍，會以潮汐反噬整支遠征隊。", physicalDefense: 570, magicDefense: 510 },
  relic_void_colossus: { id: "relic_void_colossus", name: "虛空鎮墓巨像", kind: "Boss", level: 96, hp: 1480000, mp: 42000, atk: 2680, dex: 76, xp: 230000, gold: 220000, drop: 0.84, loot: ["鎮墓核心", "虛空巨鎧", "古代Boss裝備"], skill: "鎮墓重擊／虛空護壁", description: "以王陵萬骨鑄成的守門巨像，會在護壁破碎後發動沉重反擊。", physicalDefense: 690, magicDefense: 580 },
  relic_tide_empress: { id: "relic_tide_empress", name: "潮汐女皇・奈芙拉", kind: "Boss", level: 106, hp: 1920000, mp: 56000, atk: 3260, dex: 82, xp: 320000, gold: 320000, drop: 0.88, loot: ["女皇潮冠", "深海王印", "古代Boss裝備"], skill: "海嘯審判／潮汐輪迴", description: "統御地下海脈的王朝女皇，會以潮汐輪迴讓隊伍逐回合承受更強反噬。", physicalDefense: 760, magicDefense: 720 },
} as const satisfies Record<string, RelicMonsterDefinition>;

export const RELIC_DUNGEON_MONSTERS = redesignMonsterTable(Object.fromEntries(
  Object.entries(ORIGINAL_RELIC_DUNGEON_MONSTERS).map(([id, monster]) => [id, {
    ...monster, ...(MONSTER_REDESIGN[id] ? { loot: MONSTER_REDESIGN[id].materialDrops.map(drop => drop.item) } : {}),
  }]),
) as { [K in keyof typeof ORIGINAL_RELIC_DUNGEON_MONSTERS]: RelicMonsterDefinition & { id: K } });

export type RelicMonsterId = keyof typeof RELIC_DUNGEON_MONSTERS;
export const RELIC_MONSTER_LIST = Object.values(RELIC_DUNGEON_MONSTERS);
export const RELIC_BOSS_IDS: RelicMonsterId[] = ["relic_sunken_king", "relic_abyssal_dragon", "relic_void_colossus", "relic_tide_empress"];
export const RELIC_NORMAL_IDS: RelicMonsterId[] = ["relic_moss_warden", "relic_royal_skeleton", "relic_ash_wisp", "relic_tide_leech", "relic_salt_raider", "relic_crystal_beetle"];
export const RELIC_ELITE_IDS: RelicMonsterId[] = ["relic_venom_cerberus", "relic_golden_scarab", "relic_silent_oracle"];

export function relicMonsterForProgress(progress: number, clearedRuns = 0) {
  const safeProgress = Math.max(0, Math.min(100, Math.floor(progress)));
  const pool = safeProgress >= 75 ? RELIC_ELITE_IDS : RELIC_NORMAL_IDS;
  return RELIC_DUNGEON_MONSTERS[pool[(Math.max(0, safeProgress - 1) + Math.max(0, clearedRuns)) % pool.length]];
}

export function relicBossForRun(clearedRuns = 0) {
  return RELIC_DUNGEON_MONSTERS[RELIC_BOSS_IDS[Math.max(0, clearedRuns) % RELIC_BOSS_IDS.length]];
}
