// Repeated battles retaining HP/MP. Not AutoHunt lifecycle, XP, natural gear acquisition, or offline settlement.
import { pathToFileURL } from 'node:url';
import { curveFixture, CURVE_TARGETS } from './measure-equipment-curve.mjs';
import { measureEquipmentFixture } from './measure-equipment-early.mjs';
export function measureSustain(level, key, variant, seed, encounters = 10, observationMs = 180000) {
  return measureEquipmentFixture(curveFixture(level, 'mixed', variant), key, .999999, seed, encounters, observationMs);
}
export function auditSustain(seeds = 30) {
  const rows = [];
  for (const [level, key] of CURVE_TARGETS) for (const variant of ['empty', 'current', 'candidate']) {
    const samples = Array.from({ length: seeds }, (_, index) => measureSustain(level, key, variant, index + 1));
    rows.push({ level, key, monster: samples[0].monster.name, variant, samples: seeds,
      tenWins: samples.filter(row => row.victories === 10).length,
      heroAliveAtEnd: samples.filter(row => row.remaining[0].hp > 0).length,
      averageWins: samples.reduce((sum, row) => sum + row.victories, 0) / seeds,
      meanBattleSeconds: samples.reduce((sum, row) => sum + row.fights.reduce((total, fight) => total + fight.seconds, 0), 0) / seeds });
  }
  return rows;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify({
  conditions: 'Four-member mixed fixture, max four normal enemies, 30 combat seeds per gear/level, at most ten successive battles, HP/MP retained. Stop at first non-victory or 180-second observation cap. No healing/XP/fresh loot/potions/AutoHunt/offline; engine fighting time only.', rows: auditSustain(),
}, null, 2));
