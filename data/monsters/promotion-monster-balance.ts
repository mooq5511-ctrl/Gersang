import { getMercenaryStats } from '../../app/mercenary-growth-v1.ts';
import type { EncounterTier } from './world-progression.ts';

/** Use the SAME progression curve as live promoted mercenaries, never a duplicate level polynomial. */
export function promotedMonsterCombat(level: number, tier: EncounterTier, attackFactor: number) {
  const reference = getMercenaryStats(level);
  const threat = tier === '入口怪' ? .6 : tier === '菁英' ? 1.25 : .9;
  return {
    atk: Math.round(reference.atk * attackFactor * threat),
    // High-rank armor reaches 183k: flat damage alone becomes negligible against a 4M-HP tank.
    // This extra pressure is defense/resistance mitigated, not unbounded true damage.
    pressureRatio: level < 72 ? 0 : tier === '入口怪' ? .012 : tier === '菁英' ? .06 : .03,
    pressureDefense: reference.def,
  };
}
