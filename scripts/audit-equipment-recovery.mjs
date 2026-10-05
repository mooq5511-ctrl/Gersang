import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { curveFixture } from './measure-equipment-curve.mjs';
const require = createRequire(import.meta.url);
const { payInn, recoverAtInn, INN_HEAL_AMOUNT, INN_HEAL_INTERVAL } = require('../app/inn-engine.ts');
const { medicineCatalog } = require('../app/game-config.ts');
const { draftRecoveryQuote } = require('../app/equipment-recovery-draft.ts');

export function auditEquipmentRecovery(level, variant, fraction = 0) {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) throw new RangeError('Invalid HP fraction');
  const maxHp = curveFixture(level, 'spear', variant).party[0].maxHp;
  const hp = Math.floor(maxHp * fraction), player = { hp, maxHp, status: '客棧中' };
  const healingPrice = medicineCatalog.find(item => item.id === 'healing').price;
  const liveFirstTick = recoverAtInn(player, INN_HEAL_INTERVAL, INN_HEAL_INTERVAL);
  const liveFee = payInn(player, Number.MAX_SAFE_INTEGER).cost;
  return { level, variant, hp, maxHp, currentFirstTickHp: liveFirstTick.player.hp,
    currentFullDurationMs: Math.ceil((maxHp - hp) / INN_HEAL_AMOUNT) * INN_HEAL_INTERVAL,
    currentInstantFee: liveFee, potionFullHealCost: healingPrice * 2,
    candidate: draftRecoveryQuote(maxHp, hp, INN_HEAL_INTERVAL, healingPrice) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify({
  conditions: 'Hero maxHP from real vitals; synthetic fixed gear, zero HP. Current free duration is exact tick-count diagnostic assuming on-time calls every live interval, not observed offline behavior. Candidate affects ONLY proposed inn HP recovery/pricing, not battle regen, MP, party revival, medicine use, or travel automation.',
  rows: [1, 12, 36, 72, 112, 162, 212, 250].flatMap(level => ['current', 'candidate'].map(variant => auditEquipmentRecovery(level, variant))),
}, null, 2));
