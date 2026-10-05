import {v1EffectiveCore,v1Definition,v1EnhancementMultiplier} from './equipment-v1-policy.ts';
export type EquipmentStatSource = {
  definitionId?: string;
  balanceVersion?: string;
  rarity?: string;
  atk?: number;
  def?: number;
  hp?: number;
  enhance?: number;
};

/** 強化後的裝備核心倍率；所有顯示與戰鬥計算共用。 */
export function enhancementMultiplier(level: number) {
  return 1.15 ** Math.max(0, Math.floor(Number(level) || 0));
}
export function equipmentEnhancementMultiplier(item:EquipmentStatSource){return v1Definition(item)?v1EnhancementMultiplier(item.enhance||0):enhancementMultiplier(item.enhance||0);}

export function effectiveEquipmentStats(item: EquipmentStatSource) {
  const versioned=v1EffectiveCore(item);
  if(versioned)return versioned;
  const multiplier = enhancementMultiplier(item.enhance || 0);
  return {
    atk: Math.floor((Number(item.atk) || 0) * multiplier),
    def: Math.floor((Number(item.def) || 0) * multiplier),
    hp: Math.floor((Number(item.hp) || 0) * multiplier),
  };
}

/** Score the same rounded core values used by tooltips and combat; affixes are separate. */
export function equipmentCorePower(item: EquipmentStatSource) {
  const stats = effectiveEquipmentStats(item);
  return stats.atk * 2.2 + stats.def * 1.6 + stats.hp * .22;
}
