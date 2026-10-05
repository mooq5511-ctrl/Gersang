// Actual 200ms game loop and inventory actions, seeded synthetic starts. No browser/save writes.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { curveFixture } from './measure-equipment-curve.mjs';
const require = createRequire(import.meta.url);
const { freshGame } = require('../app/game-hero-factory.ts');
const { freshDungeon } = require('../app/dungeon-engine.ts');
const { emptyEquipmentSlots } = require('../app/equipment-slots.ts');
const { runDungeonAction } = require('../app/game-battle-actions.ts');
const { settleCurrentGame } = require('../app/game-loop.ts');
const { grantXp } = require('../app/game-progression.ts');
const { enterGameInnAction, leaveGameInnAction, appendGameLog } = require('../app/game-runtime-actions.ts');
const { buyMedicineAction, configureAutoPotionAction, applyAutoPotionAction } = require('../app/game-inventory-actions.ts');
const { vitalStats } = require('../app/vitals-engine.ts');
const { medicineCatalog } = require('../app/game-config.ts');
const deps = { addLog: appendGameLog, grantXp, enterInn: enterGameInnAction, leaveInn: leaveGameInnAction };

function materializeUnit(unit) {
  const equip = { ...emptyEquipmentSlots() };
  for (const [slot, item] of Object.entries(unit.equip)) equip[slot] = { ...item, uid: `${item.uid}-${unit.uid}`, name: item.name || `候選 ${item.requiredLevel} ${item.part}`,
    slot: item.slot || (slot === 'ring1' ? 'ring' : slot), image: item.image || '', magic: item.magic || [], bonus: item.bonus || {str:0,agi:0,intel:0,vit:0}, resist: item.resist || {physical:0,magic:0} };
  const complete = { nation:'korea', special:false, xp:0, points:0, image:'', role:unit.position, ...unit, tier:Math.min(unit.tier,3), equip };
  const vital = vitalStats(complete);
  return { ...complete, hp:vital.maxHp, mp:vital.maxMp };
}
export function auditAutoPotion(level, key, variant, threshold = 30, seed = 1, durationSeconds = 600, initialStock = 100, fullSlots = false) {
  if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 1800 || !Number.isInteger(initialStock) || initialStock < 0 || initialStock > 1000) throw new RangeError('Invalid flow audit limits');
  const fixture = curveFixture(level, 'mixed', variant, level, '普通', 0, null, fullSlots), units = fixture.units.map(materializeUnit);
  const start = 1000000 + seed * 1000000;
  let game = { ...freshGame('補給實測'), gold:600000, idleStamp:start, lastSeen:start, hanyangPrologueStep:'completed',
    hero:units[0], mercs:units.slice(1), restingMercs:[], active:units.slice(1).map(unit=>unit.uid),
    medicines:{healing:0,mana:0}, autoSkill:true, dungeon:{...freshDungeon(),key,lockedEnemyKey:key}, autoPotionAt:0 };
  const startingGold = game.gold;
  if (initialStock) game = buyMedicineAction(game, 'healing', initialStock, 1, '漢陽', appendGameLog, () => {});
  const purchaseCost = startingGold - game.gold, startingAfterPurchase = game.gold;
  const potionPrice = medicineCatalog.find(item => item.id === 'healing').price;
  game = configureAutoPotionAction(game, { enabled:true, medicineId:'healing', threshold }, appendGameLog);
  const rolls = now => ({ now, roll:.99, choice:.5, spawnRoll:.5, encounterCountRoll:.999999, retaliationRoll:.5,
    materialRolls:[1,1,1], fusionCoreRoll:1, gearDropRoll:1, gearChoiceRoll:0, sealDropRoll:1, sealChoiceRoll:0 });
  game = runDungeonAction(game, 'start-auto-hunt', start, key, rolls(start), deps);
  const observedTargets = new Set([game.dungeon.key]);
  let now = start, firstRecoveringAt = null, potionsUsed = 0, heroDeathTicks = 0;
  for (let tick = 0; tick < durationSeconds * 5; tick++) {
    now += 200;
    const oldStock = game.medicines.healing || 0;
    // Same ordering as useGameLoop: settle first, then apply Auto Potion.
    game = applyAutoPotionAction(settleCurrentGame(game, rolls(now)), now, appendGameLog, grantXp);
    observedTargets.add(game.dungeon.key);
    if (game.dungeon.key !== key) throw new Error('Audit target drifted; do not report a different monster as the requested hunt');
    potionsUsed += oldStock - (game.medicines.healing || 0);
    if (vitalStats(game.hero).hp === 0) heroDeathTicks++;
    if (game.dungeon?.status === 'recovering') { firstRecoveringAt = (now - start) / 1000; break; }
  }
  return { level, key, variant, threshold, seed, fullSlots, elapsedSeconds:(now-start)/1000, firstRecoveringAt,
    kills:game.kills, potionsUsed, potionsLeft:game.medicines.healing || 0, potionPurchaseCost:purchaseCost,
    goldGained:game.gold-startingAfterPurchase, consumedPotionCost:potionsUsed*potionPrice,
    netGoldAfterConsumedPotions:game.gold-startingAfterPurchase-potionsUsed*potionPrice,
    autoHunt:game.dungeon?.autoHunt, autoPotion:game.autoPotion.enabled, battleStatus:game.dungeon?.status,
    observedTargets:[...observedTargets],
    heroDeathSeconds:heroDeathTicks*.2, endingLevels:[game.hero,...game.mercs].map(unit=>unit.level),
    hp:[game.hero,...game.mercs].map(unit=>({hp:unit.hp,maxHp:vitalStats(unit).maxHp})),
    battleLogCategories:[...new Set(game.battleLogs.map(entry=>entry.category))] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = [];
  for (const [level,key] of [[12,'e_starter_pirate'],[72,'e_white_tiger_soul_eater'],[162,'e_sumeru_blue_yaksha_vajra'],[250,'e_shambhala_scribe']])
    for (const variant of ['current','candidate']) for (const threshold of [30,70]) for (let seed=1;seed<=5;seed++) rows.push(auditAutoPotion(level,key,variant,threshold,seed));
  console.log(JSON.stringify({ conditions:'Actual 200ms settleCurrentGame->applyAutoPotionAction ordering; actual purchased 100 potions at factor1, large unearned starting treasury600000 for comparability. No resupply/MP potions, no gear/seal/random material drops; max enemy count; XP/level gains and idle money remain ON. Synthetic same-level four-person start, manually unlocked ranks/tutorial completed/travel bypassed; ten minutes or first recovering. Not a fresh-character journey, browser timing, random natural encounters, or offline simulation.', rows },null,2));
}
