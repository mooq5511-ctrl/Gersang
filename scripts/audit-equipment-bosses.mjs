// Live engines, synthetic parties, no save/UI mutation. Relic dispatch uses mercenaries only.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { curveFixture, measureCurve } from './measure-equipment-curve.mjs';
const require = createRequire(import.meta.url);
const { DUNGEONS, isBossMonster } = require('../app/dungeon-engine.ts');
const { unitPower } = require('../app/game-progression.ts');
const { freshRelicDungeon, relicDungeonAction, relicBossReadiness } = require('../app/relic-dungeon.tsx');
const { relicEquipmentScore } = require('../app/game-progression-view.ts');
const { RELIC_BOSS_IDS, RELIC_DUNGEON_MONSTERS } = require('../data/monsters/relic-dungeon-monsters.ts');
// Explicit diagnostic party levels, NOT new unlocks or assumed monster levels.
const overrides = { e_starter_pirate_king: 12, e_lake_gale_altur: 56, e_japan_sea_golden_starfish: 72,
  e_white_tiger_fierce_tiger: 112, e_sumeru_vaisravana: 190, e_sumeru_virupaksa: 212, e_korea_field_flying_tiger: 36 };
export const WORLD_BOSS_CASES = Object.entries(DUNGEONS).filter(([, monster]) => isBossMonster(monster.name))
  .map(([key, monster]) => ({ key, partyLevel: overrides[key] ?? monster.level, monsterLevel: monster.level, name: monster.name }));

export function measureRelicBoss(level, variant, clearedRuns, count = 3) {
  if (!Number.isInteger(clearedRuns) || clearedRuns < 0 || clearedRuns >= RELIC_BOSS_IDS.length || !Number.isInteger(count) || count < 1 || count > 11) throw new RangeError('Invalid relic fixture');
  const base = curveFixture(level, 'mixed', variant).units.slice(1);
  const mercs = Array.from({ length: count }, (_, index) => ({ ...base[index % base.length], uid: `resting-${index}` }));
  const power = Math.floor(mercs.reduce((sum, unit) => sum + unitPower(unit), 0));
  const { vitalStats } = require('../app/vitals-engine.ts');
  const maxHp = mercs.reduce((sum, unit) => sum + vitalStats(unit).maxHp, 0);
  const score = mercs.reduce((sum, unit) => sum + relicEquipmentScore(unit), 0);
  const context = { maxHp, currentHp: maxHp, partyPower: power, partyEquipmentScore: score,
    partyNames: mercs.map(unit => unit.name), partyUids: mercs.map(unit => unit.uid), partyReady: true, now: 1000 };
  const initial = { ...freshRelicDungeon(maxHp), clearedRuns };
  let state = relicDungeonAction(initial, 'challenge-boss', power, context);
  const initialBossHp = state.bossMaxHp;
  while (state.status === 'boss' && state.bossTurn < 200) state = relicDungeonAction(state, 'attack-boss', power, context);
  const id = RELIC_BOSS_IDS[clearedRuns];
  return { level, variant, count, boss: RELIC_DUNGEON_MONSTERS[id].name, bossId: id, power, maxHp, equipmentScore: score,
    initialBossHp, status: state.status, turns: state.bossTurn, remainingHp: state.hp, remainingBossHp: state.bossHp,
    preview: relicBossReadiness(power, maxHp, count, score, clearedRuns), reward: state.lastReward };
}

export function auditWorldBosses(seeds = 30) {
  const rows = [];
  for (const entry of WORLD_BOSS_CASES) for (const variant of ['empty', 'current', 'candidate']) {
    const results = Array.from({ length: seeds }, (_, index) => measureCurve(entry.partyLevel, entry.key, 'mixed', variant, index + 1));
    rows.push({ ...entry, variant, samples: seeds, wins: results.filter(row => row.victories === 1).length,
      timedOut: results.filter(row => row.fights[0].timedOut).length,
      allAlive: results.filter(row => row.remaining.every(unit => unit.hp > 0)).length,
      averageSeconds: results.reduce((sum, row) => sum + row.fights[0].seconds, 0) / seeds,
      enemyCount: results[0].fights[0].enemyCount });
  }
  return rows;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const relic = [];
  for (const level of [72, 90, 112, 162]) for (const count of [1, 3, 6]) for (let boss = 0; boss < RELIC_BOSS_IDS.length; boss++)
    for (const variant of ['empty', 'current', 'candidate']) relic.push(measureRelicBoss(level, variant, boss, count));
  console.log(JSON.stringify({ conditions: 'World: hero+2 spears+1 bow, explicit diagnostic levels, 30 paired combat seeds, one full-HP battle, no paid points/affixes/healing. Boss always single. Relic: ONLY resting mercenaries, manually unlocked appropriate rank, zero guild bonuses, full HP, deterministic real aggregate action and readiness; count=1/3/6. Not natural acquisition, offline automation, or a recommended unlock table.', world: auditWorldBosses(), relic }, null, 2));
}
