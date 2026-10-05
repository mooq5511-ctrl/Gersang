// Synthetic unlocked-rank parties. NOT a save, natural playthrough, or proof of seal availability.
// `current` means the frozen pre-V1 baseline; the active series factory now uses versioned V1.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { measureEquipmentFixture } from './measure-equipment-early.mjs';
const require = createRequire(import.meta.url);
const { freshGame } = require('../app/game-hero-factory.ts');
const { mercenarySpec } = require('../app/mercenary-roster.ts');
const { getMercenaryStats, BOW_TEMPLATE } = require('../app/mercenary-growth-v1.ts');
const { combatStats, vitalStats } = require('../app/vitals-engine.ts');
const { curveDraftEquipment, curveDraftFullEquipment } = require('../app/equipment-curve-draft.ts');
const { equipmentAtTier, makeLegacyTierEquipment: makeTierEquipment, EQUIPMENT_TIER_LEVELS } = require('../app/tier-equipment.ts');
const {makeTierEquipment:makeLiveTierEquipment} = require('../app/tier-equipment.ts');
const {advanceEquipmentQuality} = require('../app/game-equipment-factory.ts');
const {V1_QUALITIES} = require('../app/equipment-v1-policy.ts');
const slots = { weapon: 'weapon', helm: 'helm', armor: 'armor', gloves: 'gloves', waist: 'amulet', boots: 'boots', accessory: 'ring1', accessory2: 'ring2' };
const teams = { spear: ['spear'], bow: ['bow'], mixed: ['spear', 'spear', 'bow'] };

export function curveFixture(level, team, variant, gearLevel = level, quality = '普通', enhance = 0, parts = null, fullSlots = false) {
  if (!Number.isInteger(level) || level < 1 || level > 250 || !teams[team] || !['empty', 'current', 'candidate', 'live'].includes(variant) || !Number.isInteger(gearLevel) || gearLevel < 1 || gearLevel > level) throw new RangeError('Invalid curve fixture');
  if (team !== 'spear' && level < 12) throw new RangeError('Bow requires promotion');
  let equip = {};
  if (variant === 'candidate') equip = Object.fromEntries((fullSlots ? curveDraftFullEquipment : curveDraftEquipment)(gearLevel, quality, enhance).map(item => [slots[item.part], item]));
  if (variant === 'current') {
    const tier = [...EQUIPMENT_TIER_LEVELS].reverse().find(value => value <= gearLevel);
    equip = Object.fromEntries(equipmentAtTier(tier).map(item => [item.slot === 'ring' ? 'ring1' : item.slot, makeTierEquipment(item, item.id, 'isolated test')]));
    if (fullSlots && equip.ring1) equip.ring2 = {...equip.ring1,uid:`${equip.ring1.uid}-ring2`};
  }
  if (variant === 'live') {
    if (!V1_QUALITIES.includes(quality) || !Number.isInteger(enhance) || enhance < 0 || enhance > 15) throw new RangeError('Invalid live equipment investment');
    const tier = [...EQUIPMENT_TIER_LEVELS].reverse().find(value => value <= gearLevel);
    equip = Object.fromEntries(equipmentAtTier(tier).map(spec=>[spec.slot === 'ring' ? 'ring1' : spec.slot, {...advanceEquipmentQuality(makeLiveTierEquipment(spec,spec.id,'live series audit'),quality),enhance}]));
    if (fullSlots && equip.ring1) equip.ring2 = {...equip.ring1,uid:`${equip.ring1.uid}-ring2`};
  }
  if (parts !== null) {
    if (!Array.isArray(parts) || parts.some(part => !Object.values(slots).includes(part))) throw new RangeError('Invalid equipment slots');
    equip = Object.fromEntries(Object.entries(equip).filter(([slot]) => parts.includes(slot)));
  }
  const game = freshGame('八階裝備比較'), rank = getMercenaryStats(level).stage;
  const units = [{ ...game.hero, level, maxHp: 100 + (level - 1) * 20, equip, position: '後排' }, ...teams[team].map((branch, index) => {
    const templateId = branch === 'bow' ? BOW_TEMPLATE : 'merchant-spear', spec = mercenarySpec(templateId);
    return { uid: `companion-${index}`, templateId, name: branch, level, promotionStage: rank, tier: rank,
      str: spec.ratings[1], vit: spec.ratings[0], agi: spec.ratings[3], intel: 10, skill: spec.active, equip, position: branch === 'bow' ? '後排' : '前排' };
  })];
  const party = units.map(unit => {
    const vital = vitalStats(unit), combat = combatStats(unit);
    return { uid: unit.uid, templateId: unit.templateId, name: unit.name, skill: unit.skill,
      hp: vital.maxHp, maxHp: vital.maxHp, mp: vital.maxMp, maxMp: vital.maxMp, position: unit.position,
      attack: combat.attack, defense: combat.defense, physicalResist: vital.physicalResist, magicResist: vital.magicResist,
      accuracy: combat.accuracy, attackInterval: Math.max(.6, 2.2 - combat.speed / 100) };
  });
  return { units, party };
}
export const CURVE_TARGETS = [
  [36, 'e_japan_sea_bat'], [56, 'e_white_tiger_spider'], [72, 'e_white_tiger_soul_eater'],
  [112, 'e_taj_scarab'], [162, 'e_sumeru_blue_yaksha_vajra'], [212, 'e_snake'], [250, 'e_shambhala_scribe'],
];
export function measureCurve(level, key, team, variant, seed, gearLevel = level, quality = '普通', enhance = 0, parts = null) {
  return { level, team, variant, gearLevel, quality, enhance,
    ...measureEquipmentFixture(curveFixture(level, team, variant, gearLevel, quality, enhance, parts), key, .999999, seed, 1) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = [];
  const scenarios = [
    { variant: 'empty', label: 'empty' }, { variant: 'current', label: 'current' },
    { variant: 'candidate', label: 'candidate' },
    { variant: 'candidate', label: 'weapon-only', parts: ['weapon'] },
    { variant: 'candidate', label: 'armor-first', parts: ['armor', 'helm', 'amulet'] },
    { variant: 'candidate', label: 'gold+15', quality: '金色', enhance: 15 },
  ];
  for (const [level, key] of CURVE_TARGETS) for (const team of Object.keys(teams)) for (const scenario of scenarios) {
    const samples = Array.from({ length: 30 }, (_, index) => measureCurve(level, key, team, scenario.variant, index + 1, level, scenario.quality, scenario.enhance, scenario.parts));
    rows.push({ level, key, team, variant: scenario.label, monster: samples[0].monster, stats: samples[0].stats,
      enemies: samples[0].fights[0].enemyCount, wins: samples.filter(row => row.victories === 1).length,
      heroAlive: samples.filter(row => row.remaining[0].hp > 0).length,
      allAlive: samples.filter(row => row.remaining.every(unit => unit.hp > 0)).length,
      averageSeconds: samples.reduce((sum, row) => sum + row.fights[0].seconds, 0) / samples.length,
      averageHpLoss: samples.reduce((sum, row) => sum + row.fights[0].heroLost + row.fights[0].mercLost, 0) / samples.length,
      averageHpLossFraction: samples.reduce((sum, row) => sum + (row.fights[0].heroLost + row.fights[0].mercLost) / row.stats.reduce((total, unit) => total + unit.hp, 0), 0) / samples.length });
  }
  console.log(JSON.stringify({ conditions: 'Hero rear + 1 spear / 1 bow / 2 spears+1 bow. Same character level; ranks manually unlocked (seven/eight ranks not naturally farmable). Initial unallocated attributes; full gear; no affixes/potions/guild healing/XP changes. Skills on; maximum normal encounter count for actual party size. Thirty paired combat seeds; one fight only. Candidate quality/enhance baked into core once, runtime enhance zero. No claim of offline automation or acquisition validation.', rows }, null, 2));
}
