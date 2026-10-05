/** Shared base allocation policy. Versioned items opt in; old item stats are never rewritten. */
export const EARLY_EQUIPMENT_DRAFT = [
  { level: 1, atk: 6, def: 6, hp: 60, purpose: '新手協戰與補給' },
  { level: 12, atk: 18, def: 16, hp: 150, purpose: '首次轉職' },
  { level: 24, atk: 44, def: 80, hp: 450, purpose: '千年湖中段' },
  { level: 35, atk: 64, def: 100, hp: 540, purpose: '三階轉職前整備' },
] as const;
// Allocate a WHOLE seven-piece budget, not a per-item budget.
const allocation = [
  { part: 'weapon', atk: .7, def: 0, hp: 0 },
  { part: 'helm', atk: 0, def: .2, hp: .15 },
  { part: 'armor', atk: 0, def: .45, hp: .4 },
  { part: 'gloves', atk: .15, def: .1, hp: .05 },
  { part: 'waist', atk: 0, def: .1, hp: .2 },
  { part: 'boots', atk: 0, def: .15, hp: .1 },
  { part: 'accessory', atk: .15, def: 0, hp: .1 },
] as const;
// Weighted repeating schedules prevent a higher budget from reducing any single part.
const schedules = Object.fromEntries((['atk', 'def', 'hp'] as const).map(stat => {
  const weights = allocation.map(row => Math.round(row[stat] * 100)), assigned = weights.map(() => 0);
  const schedule = Array.from({ length: 100 }, (_, step) => {
    let target = -1, best = -Infinity;
    weights.forEach((weight, index) => {
      const deficit = weight * (step + 1) - assigned[index] * 100;
      if (weight > 0 && deficit > best) { best = deficit; target = index; }
    });
    assigned[target]++;
    return target;
  });
  return [stat, { weights, schedule }];
})) as Record<'atk' | 'def' | 'hp', { weights: number[]; schedule: number[] }>;
export function draftEquipmentAtLevel(level: number) {
  const budget = EARLY_EQUIPMENT_DRAFT.find(tier => tier.level === level);
  if (!budget) throw new RangeError('Unsupported candidate equipment level');
  return allocateDraftEquipment(level, budget);
}
export function allocateDraftEquipment(level: number, budget: { atk: number; def: number; hp: number }) {
  const items = allocation.map(row => ({ part: row.part, requiredLevel: level, atk: 0, def: 0, hp: 0 }));
  for (const stat of ['atk', 'def', 'hp'] as const) {
    if (!Number.isSafeInteger(budget[stat]) || budget[stat] < 0) throw new RangeError('Invalid whole-set budget');
    const { weights, schedule } = schedules[stat], cycles = Math.floor(budget[stat] / 100);
    items.forEach((item, index) => { item[stat] = cycles * weights[index]; });
    for (let remainder = 0; remainder < budget[stat] % 100; remainder++) items[schedule[remainder]][stat]++;
  }
  return items;
}
