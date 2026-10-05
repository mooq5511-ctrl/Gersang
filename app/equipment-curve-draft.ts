/** Read-only design model. No runtime shop, combat, or save imports this module. */
import { EARLY_EQUIPMENT_DRAFT, allocateDraftEquipment } from './equipment-balance-draft.ts';
import { getMercenaryStats } from './mercenary-growth-v1.ts';
import { draftCoreMultiplier, type DraftQuality } from './equipment-economy-draft.ts';

export const DRAFT_GEAR_LEVELS = [1, 12, 20, 24, 35, 36, 40, 50, 56, 70, 72, 90, 112, 120, 150, 162, 180, 200, 212, 230, 250] as const;
const baseline = getMercenaryStats(35);
const growthShare = { atk: .2, def: .3, hp: .25 } as const;
/** Fixed item values at its REQUIRED level; never scale with wearer level or paid attributes. */
export function draftWholeSetBudget(level: number) {
  if (!Number.isInteger(level) || level < 1 || level > 250) throw new RangeError('Invalid gear level');
  if (level <= 35) {
    const upper = EARLY_EQUIPMENT_DRAFT.find(tier => tier.level >= level)!;
    const lower = [...EARLY_EQUIPMENT_DRAFT].reverse().find(tier => tier.level <= level)!;
    const fraction = upper.level === lower.level ? 0 : (level - lower.level) / (upper.level - lower.level);
    return Object.fromEntries((['atk', 'def', 'hp'] as const).map(stat => [stat, Math.floor(lower[stat] + (upper[stat] - lower[stat]) * fraction)])) as { atk: number; def: number; hp: number };
  }
  const reference = getMercenaryStats(level);
  const anchor = EARLY_EQUIPMENT_DRAFT[3];
  return {
    atk: Math.floor(anchor.atk + (reference.atk - baseline.atk) * growthShare.atk),
    def: Math.floor(anchor.def + (reference.def - baseline.def) * growthShare.def),
    hp: Math.floor(anchor.hp + (reference.hp - baseline.hp) * growthShare.hp),
  };
}
/** Quality/enhancement baked once for isolated live-engine trials; runtime enhance remains zero. */
export function curveDraftEquipment(level: number, quality: DraftQuality = '普通', enhance = 0) {
  const multiplier = draftCoreMultiplier(quality, enhance);
  return allocateDraftEquipment(level, draftWholeSetBudget(level)).map(item => ({
    ...item, atk: Math.floor(item.atk * multiplier), def: Math.floor(item.def * multiplier), hp: Math.floor(item.hp * multiplier),
    slot: item.part === 'waist' ? 'amulet' : item.part === 'accessory' ? 'ring' : item.part,
    uid: `draft-${level}-${item.part}`, rarity: quality, enhance: 0,
    source: `離線候選：${quality} +${enhance}（非正式裝備）`,
  }));
}

/** Eight worn slots share the same budget; ring2 is not a second free accessory budget. */
export function curveDraftFullEquipment(level: number, quality: DraftQuality = '普通', enhance = 0) {
  const multiplier = draftCoreMultiplier(quality, enhance);
  const base = curveDraftEquipment(level).flatMap(item => item.part !== 'accessory' ? [item] : [
    { ...item, atk: Math.floor(item.atk / 2), hp: Math.floor(item.hp / 2) },
    { ...item, part: 'accessory2' as const, uid: `draft-${level}-accessory2`, atk: Math.floor(item.atk / 2), hp: Math.floor(item.hp / 2) },
  ]);
  return base.map(item => ({ ...item,
    atk: Math.floor(item.atk * multiplier), def: Math.floor(item.def * multiplier), hp: Math.floor(item.hp * multiplier),
    rarity: quality, source: `八欄離線候選：${quality} +${enhance}（非正式裝備）`,
  }));
}
