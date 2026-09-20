export const BATTLE_SCENE_WIDTH = 900;
export const BATTLE_SCENE_HEIGHT = 700;

/** Fit the fixed-coordinate battlefield into its visible viewport without enlarging it. */
export function calculateBattleScale(availableWidth: number, availableHeight: number): number {
  if (!Number.isFinite(availableWidth) || !Number.isFinite(availableHeight)) return 0;
  return Math.max(0, Math.min(
    availableWidth / BATTLE_SCENE_WIDTH,
    availableHeight / BATTLE_SCENE_HEIGHT,
    1,
  ));
}
