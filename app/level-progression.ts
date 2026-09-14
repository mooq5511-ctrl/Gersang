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

// 前兩級固定為 100、500；稍放緩中期需求，並維持 Lv.300 累積 20 億。
const levels = Array.from({ length: LEVEL_CAP - 1 }, (_, index) => index);
const linearTotal = levels.reduce((sum, index) => sum + 100 + 400 * index, 0);
const exponent = 3.12;
const coefficient = (LEVEL_CAP_TOTAL_XP - linearTotal) / levels.reduce((sum, index) => sum + index ** exponent, 0);
const xpCosts = levels.map((index) => 100 + 400 * index + Math.floor(coefficient * index ** exponent));
let roundingRemainder = LEVEL_CAP_TOTAL_XP - xpCosts.reduce((sum, cost) => sum + cost, 0);
for (let index = xpCosts.length - 1; roundingRemainder > 0; index--, roundingRemainder--) xpCosts[index]++;

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
