/** Offline-only resolved-stat proposal. Never mutates old equipment or changes live combat. */
export type DraftResolvedStats = { attack: number; defense: number; maxHp: number; maxMp: number };
// Limits apply after all flat gems/attributes, affixes and milestone effects are resolved.
export const DRAFT_SPECIAL_LIMITS = { attack: .35, defense: .35, maxHp: .3, maxMp: .25 } as const;
export const DRAFT_SHARED_SPECIAL_POOL = .8;
const keys = ['attack','defense','maxHp','maxMp'] as const;

/** Base = same character + paid attributes + same quality/enhanced core, without special effects. */
export function previewSpecialStatBudget(core: DraftResolvedStats, requested: DraftResolvedStats) {
  for (const stats of [core,requested]) for (const key of keys) {
    if (!Number.isSafeInteger(stats[key]) || stats[key] < 0) throw new RangeError('Invalid resolved stat baseline');
  }
  const fractions = Object.fromEntries(keys.map(key => [key,
    Math.min(DRAFT_SPECIAL_LIMITS[key], Math.max(0, requested[key]-core[key]) / Math.max(1,core[key])),
  ])) as DraftResolvedStats;
  const used = keys.reduce((sum,key)=>sum+fractions[key],0);
  const factor = used > DRAFT_SHARED_SPECIAL_POOL ? DRAFT_SHARED_SPECIAL_POOL/used : 1;
  const effective = Object.fromEntries(keys.map(key => [key,
    requested[key] <= core[key] ? requested[key] : core[key] + Math.floor(Math.max(1,core[key])*fractions[key]*factor),
  ])) as DraftResolvedStats;
  return { effective, requested: {...requested}, core: {...core}, scale:factor,
    clipped: keys.filter(key=>effective[key]!==requested[key]),
    // Resistances, attack speed/accuracy, procs, debuffs and XP require separate rules.
    scope:'attack/defense/maxHP/maxMP only; not a complete combat or item conversion' as const };
}

/** Candidate party XP uses average personal investment, not one bonus multiplied by roster size. */
export function draftPartyEquipmentXpMultiplier(personalPercents: readonly number[]) {
  if (!personalPercents.length || personalPercents.length > 12 || personalPercents.some(value=>!Number.isFinite(value)||value<0)) throw new RangeError('Invalid deployed XP bonuses');
  return 1 + personalPercents.reduce((sum,value)=>sum+Math.min(25,value),0)/personalPercents.length/100;
}
