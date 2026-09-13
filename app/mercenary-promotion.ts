import type { MercenaryId } from './mercenary-roster';
import type { GameState, Unit } from './game-state';

export type PromotionTier = Unit['tier'];
export type PromotionItem = 'fusionCores' | 'soulStones' | 'awakeningStones';
export type PromotionFlag = 'newbieBossDefeated' | 'lakeBossDefeated' | 'goldenStarfishDefeated';

/** A class is identified by the existing roster template and the save-compatible tier. */
export interface JobClass {
  templateId: `merchant-${MercenaryId}`;
  tier: PromotionTier;
}

/** Requirements and per-attribute growth for entering this tier. Multipliers are design data, not applied by this module. */
export interface Tier {
  value: PromotionTier;
  requiredLevel: number;
  unlock: { minimumStage: number; flags: readonly PromotionFlag[] };
  requiredItems: readonly { item: PromotionItem; quantity: number }[];
  growthMultipliers: Readonly<Record<'str' | 'agi' | 'intel' | 'vit', number>>;
}

export interface PromotionRule {
  from: JobClass;
  to: JobClass;
  requirements: Tier;
}

/** Initial proposed values for the two existing Samurai class variants. No save or combat behavior changes until a promotion action consumes this table. */
export const MERCENARY_PROMOTIONS = {
  'merchant-samurai': [{
    from: { templateId: 'merchant-samurai', tier: 0 },
    to: { templateId: 'merchant-swordmaster', tier: 2 },
    requirements: {
      value: 2,
      requiredLevel: 40,
      unlock: { minimumStage: 10, flags: ['newbieBossDefeated'] },
      requiredItems: [{ item: 'fusionCores', quantity: 2 }],
      growthMultipliers: { str: 1.3, agi: 1.2, intel: 1.0, vit: 1.15 },
    },
  }],
  'merchant-swordmaster': [{
    from: { templateId: 'merchant-swordmaster', tier: 2 },
    to: { templateId: 'merchant-sanada', tier: 3 },
    requirements: {
      value: 3,
      requiredLevel: 80,
      unlock: { minimumStage: 20, flags: ['lakeBossDefeated'] },
      requiredItems: [{ item: 'soulStones', quantity: 10 }, { item: 'awakeningStones', quantity: 1 }],
      growthMultipliers: { str: 1.35, agi: 1.2, intel: 1.1, vit: 1.3 },
    },
  }],
} as const satisfies Readonly<Partial<Record<JobClass['templateId'], readonly PromotionRule[]>>>;

export type PromotionCandidate = Pick<Unit, 'templateId' | 'tier' | 'level'>;
export type PromotionProgress = Pick<GameState, 'stage' | PromotionFlag | PromotionItem>;

/** Checks one transition without mutating the mercenary, progress, or inventory. */
export function canPromoteMercenary(
  mercenary: PromotionCandidate,
  rule: PromotionRule,
  progress: PromotionProgress,
): boolean {
  const { requirements } = rule;
  return mercenary.templateId === rule.from.templateId
    && mercenary.tier === rule.from.tier
    && rule.to.tier === requirements.value
    && mercenary.level >= requirements.requiredLevel
    && progress.stage >= requirements.unlock.minimumStage
    && requirements.unlock.flags.every(flag => progress[flag])
    && requirements.requiredItems.every(({ item, quantity }) => progress[item] >= quantity);
}
