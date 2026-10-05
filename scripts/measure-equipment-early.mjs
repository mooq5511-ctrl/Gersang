// Isolated real-engine comparison. No save writes, shops, or persistent progression.
// The historical `current` variant intentionally uses pre-V1 series stats, not today's live factory.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, filename,
}).outputText, filename);
require.extensions['.tsx'] = require.extensions['.ts'];
const { freshGame } = require('../app/game-hero-factory.ts');
const { mercenarySpec } = require('../app/mercenary-roster.ts');
const { getMercenaryStats } = require('../app/mercenary-growth-v1.ts');
const { combatStats, vitalStats } = require('../app/vitals-engine.ts');
const { heroTotalAttributes } = require('../app/hero-rules.ts');
const { equipmentAtTier, makeLegacyTierEquipment: makeTierEquipment, EQUIPMENT_TIER_LEVELS } = require('../app/tier-equipment.ts');
const { draftEquipmentAtLevel } = require('../app/equipment-balance-draft.ts');
const { dungeonStep, freshDungeon, DUNGEONS } = require('../app/dungeon-engine.ts');
const slots = { weapon: 'weapon', helm: 'helm', armor: 'armor', gloves: 'gloves', waist: 'amulet', boots: 'boots', accessory: 'ring1' };

export function equipmentFixture(level, variant) {
  if (![1, 12, 24, 35].includes(level) || !['empty', 'current', 'candidate'].includes(variant)) throw new RangeError('Unsupported fixture');
  const game = freshGame('裝備比較');
  let equip = {};
  if (variant === 'current') {
    const tier = [...EQUIPMENT_TIER_LEVELS].reverse().find(value => value <= level);
    equip = Object.fromEntries(equipmentAtTier(tier).map(item => [item.slot === 'ring' ? 'ring1' : item.slot, makeTierEquipment(item, item.id, 'test-only')]));
  } else if (variant === 'candidate') {
    equip = Object.fromEntries(draftEquipmentAtLevel(level).map(item => [slots[item.part], { ...item, enhance: 0 }]));
  }
  const spec = mercenarySpec('merchant-spear'), stage = getMercenaryStats(level).stage;
  const units = [{ ...game.hero, level, maxHp: 100 + (level - 1) * 20, equip, position: '前排' },
    { uid: 'companion', templateId: 'merchant-spear', name: '測試槍兵', level, promotionStage: stage, tier: stage,
      str: spec.ratings[1], vit: spec.ratings[0], agi: spec.ratings[3], intel: 10, skill: spec.active, equip, position: '前排' }];
  const party = units.map(unit => {
    const vital = vitalStats(unit), combat = combatStats(unit);
    return { uid: unit.uid, templateId: unit.templateId, name: unit.name, skill: unit.skill,
      hp: vital.maxHp, maxHp: vital.maxHp, mp: vital.maxMp, maxMp: vital.maxMp, position: unit.position,
      attack: combat.attack, defense: combat.defense, physicalResist: vital.physicalResist, magicResist: vital.magicResist,
      accuracy: combat.accuracy, attackInterval: Math.max(.6, 2.2 - combat.speed / 100) };
  });
  return { units, party };
}

export function measureEquipment(level, key, variant, countRoll = 0, seed = 1, encounters = 1) {
  const fixture = equipmentFixture(level, variant);
  return { level, variant, ...measureEquipmentFixture(fixture, key, countRoll, seed, encounters) };
}
export function measureEquipmentFixture(fixture, key, countRoll = 0, seed = 1, encounters = 1) {
  if (!DUNGEONS[key]) throw new RangeError('Unknown real monster');
  // The live realtime engine seeds combat from its start timestamp, not drop rolls.
  let party = fixture.party.map(unit => ({ ...unit })), clock = 1000 + seed * 1000000, randomState = Math.imul(seed, 0x9e3779b1) >>> 0;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const fights = [];
  for (let i = 0; i < encounters; i++) {
    const starting = party.map(unit => unit.hp), hero = fixture.units[0], total = heroTotalAttributes(hero);
    const vital = { ...vitalStats(hero), ...fixture.vitalOverride, hp: party[0].hp, mp: party[0].mp, str: total.str, dex: total.agi,
      mercenaryIntelligence: fixture.units.reduce((sum, unit) => sum + heroTotalAttributes(unit).intel, 0),
      attack: party.filter(unit => unit.hp > 0).reduce((sum, unit) => sum + unit.attack * (unit.position === '前排' ? 1.2 : 1), 0), defense: party[0].defense,
      amaterasuGaze: fixture.amaterasuGaze === true };
    const passive = party.slice(1).reduce((sum, unit) => sum + Math.floor(unit.attack * .18), 0);
    const start = clock, encounterRoll = countRoll === null ? random() : countRoll;
    const transition = (state, action) => dungeonStep(state, vital, action, clock, key, random(), random(), 0, random(), party, passive, [1, 1, 1], fixture.autoSkill ?? true, encounterRoll);
    const seenEvents = new Set(); let gazeProcs = 0, maxHeroHit = 0;
    const observe = result => {
      for (const event of result.state.realtime?.events || []) {
        if (seenEvents.has(event.id)) continue;
        seenEvents.add(event.id);
        if (event.type === 'skill' && event.skillName === '天照大神的凝視') gazeProcs++;
        if (event.type === 'damage' && event.actorId === 'hero') maxHeroHit = Math.max(maxHeroHit,event.damage || 0);
      }
    };
    let result = transition(freshDungeon(), 'start'), won = !!result.reward;
    observe(result);
    party = result.party;
    while (!won && result.state.status === 'fighting' && clock - start < 180000) {
      clock += 50;
      vital.hp = result.hp; vital.mp = result.mp;
      result = transition(result.state, 'tick'); observe(result); party = result.party; won = !!result.reward;
    }
    fights.push({ won, status: result.state.status, timedOut: !won && result.state.status === 'fighting' && clock - start >= 180000,
      seconds: (clock - start) / 1000, enemyCount: result.state.enemyCount, gazeProcs, maxHeroHit,
      heroLost: starting[0] - party[0].hp, mercLost: starting.slice(1).reduce((sum, hp, index) => sum + hp - party[index + 1].hp, 0) });
    clock += 1000;
    if (!won) break;
  }
  return { key, countRoll, seed, monster: { name: DUNGEONS[key].name, level: DUNGEONS[key].level, hp: DUNGEONS[key].hp, atk: DUNGEONS[key].atk }, requestedEncounters: encounters, fights,
    victories: fights.filter(fight => fight.won).length, remaining: party.map(unit => ({ uid: unit.uid, hp: unit.hp, maxHp: unit.maxHp, mp: unit.mp })),
    stats: fixture.party.map(unit => ({ uid: unit.uid, atk: unit.attack, def: unit.defense, hp: unit.maxHp })) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const targets = { 1: ['e_starter_raccoon', 'e_starter_black_bandit'], 12: ['e_starter_pirate', 'e_starter_hook_pirate'],
    24: ['e_lake_red_thief', 'e_lake_horn_fire'], 35: ['e_lake_red_thief_chief', 'e_japan_sea_kappa'] };
  const results = [];
  for (const [level, keys] of Object.entries(targets)) for (const key of keys) for (const countRoll of [0, .75, null])
    for (let seed = 1; seed <= 30; seed++) for (const variant of ['empty', 'current', 'candidate'])
      results.push(measureEquipment(Number(level), key, variant, countRoll, seed, 10));
  console.log(JSON.stringify({ conditions: 'Hero + one spear; both same level, initial unallocated attributes, appropriate unlocked rank. Each wears one full seven-piece ordinary set, no enhancement/affixes. Skills ON; front/front. countRoll 0/.75 = fixed one/two enemies, null = seeded uniform encounter-count input per fight. Combat timestamps vary by seed. No healing, revival, XP, potion use or gear swapping between up to ten fights. Engine elapsed time, not wall-clock. Current gear = highest existing ordinary series <= level; candidate tiers are different. Not a natural save or acquisition-cost test.', results }, null, 2));
}
