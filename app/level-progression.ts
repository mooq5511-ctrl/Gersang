/** 主角與信用等級共用的 Lv.1～300 成長曲線。Lv.300 累積經驗固定為 20 億。 */
export type LevelProgress = {
  level: number;
  totalXp: number;
  xpToNext: number;
  credit: number;
  totalCredit: number;
};

export const LEVEL_CAP = 300;
export const LEVEL_CAP_TOTAL_XP = 2_000_000_000;

// 前兩級固定為 100、500；後續以平滑三次曲線逐級增加。
const xpCosts = Array.from({ length: LEVEL_CAP - 1 }, (_, index) =>
  100 + 400 * index + Math.floor(0.9987 * index ** 3),
);
xpCosts[xpCosts.length - 1] += LEVEL_CAP_TOTAL_XP - xpCosts.reduce((sum, cost) => sum + cost, 0);

let accumulatedXp = 0;
export const LEVEL_PROGRESSION: readonly LevelProgress[] = Array.from({ length: LEVEL_CAP }, (_, index) => {
  const level = index + 1;
  const xpToNext = xpCosts[index] || 0;
  const progress: LevelProgress = {
    level,
    totalXp: accumulatedXp,
    xpToNext,
    credit: level < LEVEL_CAP ? 1 : 0,
    totalCredit: level - 1,
  };
  accumulatedXp += xpToNext;
  return progress;
});

export function progressForLevel(level: number): LevelProgress {
  const safeLevel = Math.max(1, Math.min(LEVEL_CAP, Math.floor(level)));
  return LEVEL_PROGRESSION[safeLevel - 1];
}

export function xpForNextLevel(level: number): number {
  return level >= LEVEL_CAP ? 0 : progressForLevel(level).xpToNext;
}
