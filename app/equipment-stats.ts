export type EquipmentStatSource = {
  atk?: number;
  def?: number;
  hp?: number;
  enhance?: number;
};

/** 強化後的裝備核心倍率；所有顯示與戰鬥計算共用。 */
export function enhancementMultiplier(level: number) {
  return 1.15 ** Math.max(0, Math.floor(Number(level) || 0));
}

export function effectiveEquipmentStats(item: EquipmentStatSource) {
  const multiplier = enhancementMultiplier(item.enhance || 0);
  return {
    atk: Math.floor((Number(item.atk) || 0) * multiplier),
    def: Math.floor((Number(item.def) || 0) * multiplier),
    hp: Math.floor((Number(item.hp) || 0) * multiplier),
  };
}
