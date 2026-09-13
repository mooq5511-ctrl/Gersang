import type { MercenaryId } from './mercenary-roster';

export type JobTier = 1 | 2 | 3;
export type PromotionItemId = 'fusionCores' | 'soulStones' | 'awakeningStones';
export type AttributeGrowth = Readonly<Record<'str' | 'agi' | 'intel' | 'vit', number>>;

export interface PromotionItemCost {
  itemId: PromotionItemId;
  quantity: number;
}

export interface PromotionStage<T extends JobTier = JobTier> {
  tier: T;
  name: string;
  requiredLevel: number;
  requiredItems: readonly PromotionItemCost[];
  growthMultipliers: AttributeGrowth;
  attributePointBonus?: number;
}

export interface LevelAttributeMilestone {
  level: number;
  points: number;
}

export const LEVEL_ATTRIBUTE_MILESTONES: readonly LevelAttributeMilestone[] = [
  { level: 40, points: 100 }, { level: 60, points: 547 }, { level: 80, points: 995 },
  { level: 100, points: 1442 }, { level: 120, points: 1890 }, { level: 150, points: 2561 },
  { level: 180, points: 3233 }, { level: 200, points: 3680 }, { level: 220, points: 4128 },
  { level: 250, points: 10000 },
] as const;

/** Returns the cumulative attribute-point reward for a promotion at a given level. */
export function calculateLevelBasedBonus(level: number): number {
  const value = Number.isFinite(level) ? Math.floor(level) : 0;
  if (value < LEVEL_ATTRIBUTE_MILESTONES[0].level) return 0;
  const last = LEVEL_ATTRIBUTE_MILESTONES[LEVEL_ATTRIBUTE_MILESTONES.length - 1];
  if (value >= last.level) return last.points;
  for (let index = 1; index < LEVEL_ATTRIBUTE_MILESTONES.length; index++) {
    const upper = LEVEL_ATTRIBUTE_MILESTONES[index];
    const lower = LEVEL_ATTRIBUTE_MILESTONES[index - 1];
    if (value <= upper.level) {
      const ratio = (value - lower.level) / (upper.level - lower.level);
      return Math.round(lower.points + (upper.points - lower.points) * ratio);
    }
  }
  return last.points;
}

export interface MercenaryPromotionTree {
  tier1: { tier: 1; name: string };
  tier2: PromotionStage<2>;
  tier3: PromotionStage<3>;
}

const PROMOTABLE_IDS = [
  'spear', 'shield', 'archer', 'shaman', 'ninja', 'gunner', 'onmyoji',
  'blade', 'monk', 'healer', 'cannon', 'escort', 'hunter', 'elephant', 'priest',
] as const satisfies readonly MercenaryId[];
export type PromotableMercenaryId = `merchant-${typeof PROMOTABLE_IDS[number]}`;

// Shared initial balance values; individual stages can override them later.
const TIER_2_REQUIREMENTS = {
  requiredLevel: 40,
  requiredItems: [{ itemId: 'fusionCores', quantity: 2 }],
} as const;
const TIER_3_REQUIREMENTS = {
  requiredLevel: 80,
  requiredItems: [{ itemId: 'soulStones', quantity: 10 }, { itemId: 'awakeningStones', quantity: 1 }],
} as const;

export const MERCENARY_PROMOTION_TREES = {
  'merchant-spear': {
    tier1: { tier: 1, name: '朝鮮槍兵' },
    tier2: { tier: 2, name: '御林旗手', ...TIER_2_REQUIREMENTS, attributePointBonus: 0, growthMultipliers: { str: 1.25, agi: 1.1, intel: 1, vit: 1.2 } },
    tier3: { tier: 3, name: '金庚信', ...TIER_3_REQUIREMENTS, attributePointBonus: 0, growthMultipliers: { str: 1.45, agi: 1.2, intel: 1.05, vit: 1.35 } },
  },
  'merchant-shield': {
    tier1: { tier: 1, name: '山城盾衛' },
    tier2: { tier: 2, name: '鐵壁隊長', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1.1, agi: 1.05, intel: 1, vit: 1.4 } },
    tier3: { tier: 3, name: '權栗將軍', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.25, agi: 1.1, intel: 1.05, vit: 1.6 } },
  },
  'merchant-archer': {
    tier1: { tier: 1, name: '虎獵弓手' },
    tier2: { tier: 2, name: '神射狙擊手', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1.2, agi: 1.35, intel: 1, vit: 1.05 } },
    tier3: { tier: 3, name: '李舜臣', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.35, agi: 1.55, intel: 1.1, vit: 1.15 } },
  },
  'merchant-shaman': {
    tier1: { tier: 1, name: '朝鮮巫女' },
    tier2: { tier: 2, name: '祀仙使者', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1, agi: 1.1, intel: 1.4, vit: 1.1 } },
    tier3: { tier: 3, name: '張仙花', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.05, agi: 1.2, intel: 1.65, vit: 1.2 } },
  },
  'merchant-ninja': {
    tier1: { tier: 1, name: '伊賀忍者' },
    tier2: { tier: 2, name: '暗影上忍', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1.2, agi: 1.4, intel: 1, vit: 1.05 } },
    tier3: { tier: 3, name: '服部半藏', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.4, agi: 1.65, intel: 1.05, vit: 1.15 } },
  },
  'merchant-gunner': {
    tier1: { tier: 1, name: '鐵砲足輕' },
    tier2: { tier: 2, name: '火繩精銳隊', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1.35, agi: 1.15, intel: 1, vit: 1.1 } },
    tier3: { tier: 3, name: '協版安治', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.6, agi: 1.3, intel: 1.05, vit: 1.2 } },
  },
  'merchant-onmyoji': {
    tier1: { tier: 1, name: '陰陽術士' },
    tier2: { tier: 2, name: '大陰陽師', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1, agi: 1.1, intel: 1.45, vit: 1.05 } },
    tier3: { tier: 3, name: '安倍晴明', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.05, agi: 1.2, intel: 1.7, vit: 1.15 } },
  },
  'merchant-blade': {
    tier1: { tier: 1, name: '中原刀客' },
    tier2: { tier: 2, name: '禁軍隊長', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1.35, agi: 1.15, intel: 1, vit: 1.15 } },
    tier3: { tier: 3, name: '破天血影林沖', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.6, agi: 1.3, intel: 1.05, vit: 1.3 } },
  },
  'merchant-monk': {
    tier1: { tier: 1, name: '少林武僧' },
    tier2: { tier: 2, name: '羅漢金剛僧', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1.2, agi: 1.1, intel: 1.05, vit: 1.35 } },
    tier3: { tier: 3, name: '降魔伏虎大尊者', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.4, agi: 1.2, intel: 1.1, vit: 1.55 } },
  },
  'merchant-healer': {
    tier1: { tier: 1, name: '行腳郎中' },
    tier2: { tier: 2, name: '妙手神醫', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1, agi: 1.1, intel: 1.4, vit: 1.15 } },
    tier3: { tier: 3, name: '華佗', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.05, agi: 1.2, intel: 1.65, vit: 1.3 } },
  },
  'merchant-cannon': {
    tier1: { tier: 1, name: '火器砲手' },
    tier2: { tier: 2, name: '重型轟炸隊長', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1.4, agi: 1, intel: 1.05, vit: 1.15 } },
    tier3: { tier: 3, name: '龍炮君王', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.7, agi: 1.1, intel: 1.1, vit: 1.3 } },
  },
  'merchant-escort': {
    tier1: { tier: 1, name: '東海鏢師' },
    tier2: { tier: 2, name: '威遠總鏢頭', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1.2, agi: 1.15, intel: 1.05, vit: 1.25 } },
    tier3: { tier: 3, name: '護國軍主', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.4, agi: 1.3, intel: 1.1, vit: 1.45 } },
  },
  'merchant-hunter': {
    tier1: { tier: 1, name: '山林獵手' },
    tier2: { tier: 2, name: '密林追蹤者', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1.2, agi: 1.35, intel: 1, vit: 1.1 } },
    tier3: { tier: 3, name: '羅賓漢', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.4, agi: 1.55, intel: 1.05, vit: 1.2 } },
  },
  'merchant-elephant': {
    tier1: { tier: 1, name: '天竺戰象兵' },
    tier2: { tier: 2, name: '皇家巨象統帥', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1.25, agi: 1, intel: 1, vit: 1.4 } },
    tier3: { tier: 3, name: '梵天巨象霸主', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.5, agi: 1.05, intel: 1.05, vit: 1.7 } },
  },
  'merchant-priest': {
    tier1: { tier: 1, name: '天竺梵僧' },
    tier2: { tier: 2, name: '淨台大師', ...TIER_2_REQUIREMENTS, growthMultipliers: { str: 1, agi: 1.05, intel: 1.4, vit: 1.2 } },
    tier3: { tier: 3, name: '涅槃佛主', ...TIER_3_REQUIREMENTS, growthMultipliers: { str: 1.05, agi: 1.15, intel: 1.65, vit: 1.4 } },
  },
} as const satisfies Record<PromotableMercenaryId, MercenaryPromotionTree>;

export interface PromotionCandidate {
  templateId: string;
  jobTier: JobTier;
  level: number;
  items: Readonly<Partial<Record<PromotionItemId, number>>>;
}

/** Tier 1 is the base class; promotion requires the immediately preceding tier. */
export function canPromoteMercenary(mercenary: PromotionCandidate, targetTier: JobTier): boolean {
  if (targetTier === 1 || mercenary.jobTier !== targetTier - 1) return false;
  const tree = (MERCENARY_PROMOTION_TREES as Partial<Record<string, MercenaryPromotionTree>>)[mercenary.templateId];
  if (!tree) return false;
  const target = targetTier === 2 ? tree.tier2 : tree.tier3;
  return mercenary.level >= target.requiredLevel
    && target.requiredItems.every(({ itemId, quantity }) => (mercenary.items[itemId] ?? 0) >= quantity);
}
