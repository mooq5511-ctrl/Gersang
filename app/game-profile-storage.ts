import { profileSaveKey, serializeGameForStorage, type CharacterProfile, type Equipment, type GameState, SHARED_WAREHOUSE_SAVE } from "./game-state";
import { restoreTrade } from "./trade-engine";
import { DUNGEONS, dungeonBusy, freshDungeon } from "./dungeon-engine";
import { migrateSevenSlotSave, normalizeStoredItem } from "./equipment-slots";
import { retainGuildRoster } from "./guild-migration";
import { LEVEL_CAP } from "./level-progression";
import { normalizeBattlePosition } from "./formation-position";
import { gersangUnitArt } from "./gersang-visuals";
import { exchangeAttackBonus } from "./village-exchange";
import { normalizeVitals, vitalStats } from "./vitals-engine";
import { applyGersangVisuals, sanitizeEquip } from "./game-save-normalizers";
import { freshGame, heroPortrait, isNationId, makeHero } from "./game-hero-factory";
import { normalizeNpcProgress } from "./npc-dialogue";
import { normalizeCityHallState } from "./city-hall-commissions";
import { normalizeHanyangPrologueFlags, normalizeHanyangPrologueStep, type HanyangPrologueStep } from "./hanyang-prologue";
import { worldCities } from "./v15-data";
import { restoreTerritory } from "./guild-territory";
import { AutoPotionManager } from "./auto-potion-manager";
import { BattleLogManager } from "./battle-log-manager";
import { territoryHealInterval } from "./guild-territory";
import type { Hero, Unit } from "./game-state";

export function writeProfileIndex(storage: Storage, profiles: Array<CharacterProfile | null>) {
  storage.setItem("bt52_v19_character_profiles", JSON.stringify(profiles));
}

export function writeCharacterSave(storage: Storage, slot: number, game: GameState) {
  storage.setItem(profileSaveKey(slot), serializeGameForStorage(game));
}

export function writeSharedWarehouse(storage: Storage, warehouse: Equipment[]) {
  storage.setItem(SHARED_WAREHOUSE_SAVE, JSON.stringify(warehouse));
}

export function saveCharacterProfile(storage: Storage, profiles: Array<CharacterProfile | null>, slot: number, game: GameState, profile: CharacterProfile) {
  const nextProfiles = [...profiles];
  nextProfiles[slot] = profile;
  writeCharacterSave(storage, slot, game);
  writeProfileIndex(storage, nextProfiles);
  return nextProfiles;
}

export function profileFromGame(slot: number, game: GameState): CharacterProfile {
  return { slot, name: game.hero.name, nation: game.hero.nation, level: game.hero.level, stage: game.stage, updatedAt: Date.now(), gender: game.hero.gender };
}

export function readCharacterSave(storage: Storage, slot: number) {
  return storage.getItem(profileSaveKey(slot));
}

function restoreHanyangStep(parsed: Partial<GameState> & { onboardingStep?: string }): HanyangPrologueStep {
  if (parsed.hanyangPrologueStep !== undefined) return normalizeHanyangPrologueStep(parsed.hanyangPrologueStep);
  // Existing saves already completed the old onboarding; never send those players
  // back to the beginning of the story. The two interrupted old gates map to the
  // corresponding story beats and remain recoverable from actual game state.
  if (parsed.onboardingStep === "welcome" || parsed.onboardingStep === "find-village-chief") return "arrival";
  if (parsed.onboardingStep === "travel-to-outskirts" || parsed.onboardingStep === "first-battle") return "outskirts";
  if (parsed.onboardingStep === "return-village-chief") return "first-sale";
  if (parsed.onboardingStep === "mercenary-trial") return "bandit-trial";
  if (parsed.onboardingStep === "hire-first-merc") return "guild";
  return "completed";
}

function normalizeStoredMercenary(unit: Unit, index: number): Unit {
  const isMazu = unit.templateId === "merchant-mazu";
  // Tier 0 was the old representation of an unpromoted mercenary. Migrate it
  // (and missing/invalid values) to the current Tier 1 base class.
  const rawTier = Number(unit.tier);
  const tier: Unit["tier"] = rawTier === 2 || rawTier === 3 ? rawTier : 1;
  return {
    ...unit,
    tier,
    jobClass: typeof unit.jobClass === "string" && unit.jobClass.trim() ? unit.jobClass : unit.name,
    level: Math.min(LEVEL_CAP, Math.max(1, Number(unit.level) || 1)),
    ...(isMazu ? { str: 5000, agi: 5000, vit: 5000, intel: 5000, hp: Number.isFinite(Number(unit.hp)) ? Math.max(0,Math.min(Number(unit.hp),50000)) : 50000, mp: Number.isFinite(Number(unit.mp)) ? Math.max(0,Math.min(Number(unit.mp),5000)) : 5000 } : {}),
    image: gersangUnitArt(unit.templateId, unit.name, index),
    position: normalizeBattlePosition(unit.position, unit.name, unit.role),
    equip: sanitizeEquip(unit.equip),
  };
}

/** Restores only the current character-save schema; legacy V14-V18 imports are intentionally unsupported. */
export function restoreGame(raw: unknown): GameState {
  raw = migrateSevenSlotSave(raw);
  const next = freshGame();
  if (!raw || typeof raw !== "object") return next;
  const parsed = raw as Partial<GameState> & { version?: number; hero?: Partial<Hero> };
  const heroNation = isNationId(parsed.hero?.nation) ? parsed.hero.nation : next.hero.nation;
  const heroDefaults = makeHero(heroNation, String(parsed.hero?.name || next.hero.name));
  const restoredCity = typeof parsed.city === "string" && worldCities.some((city) => city.id === parsed.city)
    ? parsed.city
    : isNationId(parsed.city) ? worldCities.find((city) => city.nation === parsed.city)?.id || next.city : next.city;
  Object.assign(next, parsed, {
    version: 30,
    firstGreenEquipped: parsed.firstGreenEquipped === true || [parsed.hero, ...(parsed.mercs || []), ...(parsed.restingMercs || [])].some(unit => unit?.equip && Object.values(unit.equip).some(item => item && item.rarity !== '普通')),
    trade: restoreTrade(parsed.trade),
    territory: restoreTerritory(parsed.territory),
    credit: Number.isFinite(parsed.credit) ? Math.max(0, Math.floor(parsed.credit!)) : 0,
    creditXp: Number.isFinite(parsed.creditXp) ? Math.max(0, Math.floor(parsed.creditXp!)) : 0,
    creditLevel: Math.max(1, Math.min(LEVEL_CAP, Math.floor(parsed.creditLevel || 1))),
    starterDeliveryKills: Number.isFinite(parsed.starterDeliveryKills) ? Math.max(0, Math.floor(parsed.starterDeliveryKills!)) : 0,
    newbieBossDefeated: parsed.newbieBossDefeated === true,
    lakeBossDefeated: parsed.lakeBossDefeated === true,
    goldenStarfishDefeated: parsed.goldenStarfishDefeated === true,
    newbieCoins: Number.isFinite(parsed.newbieCoins) ? Math.max(0, Math.floor(parsed.newbieCoins!)) : 0,
    idleStamp: Number.isFinite(parsed.idleStamp) && parsed.idleStamp! > 0 ? parsed.idleStamp : Date.now(),
    city: restoredCity,
    hero: { ...heroDefaults, ...parsed.hero, level: Math.min(LEVEL_CAP, Math.max(1, Number(parsed.hero?.level) || heroDefaults.level)), nation: heroNation, job: parsed.hero?.job || heroDefaults.job, skill: parsed.hero?.skill || heroDefaults.skill, image: heroPortrait(heroNation, parsed.hero?.gender === "female" ? "female" : "male"), gender: parsed.hero?.gender === "female" ? "female" : "male", maxHp: Number.isFinite(parsed.hero?.maxHp) && Number(parsed.hero?.maxHp) > 0 ? Math.max(100, Number(parsed.hero?.maxHp)) : 100 + (Math.max(1, Number(parsed.hero?.level) || heroDefaults.level) - 1) * 20, status: parsed.hero?.status === "客棧中" ? "客棧中" : "正常", position: normalizeBattlePosition(parsed.hero?.position, String(parsed.hero?.name || heroDefaults.name), String(parsed.hero?.role || heroDefaults.role), true), equip: sanitizeEquip(parsed.hero?.equip) },
    mercs: Array.isArray(parsed.mercs) ? parsed.mercs.map((unit, index) => normalizeStoredMercenary(unit as Unit,index)) : next.mercs,
    restingMercs: Array.isArray(parsed.restingMercs) ? parsed.restingMercs.slice(0, 10).map((unit, index) => normalizeStoredMercenary(unit as Unit,index)) : next.restingMercs,
    inventory: Array.isArray(parsed.inventory) ? parsed.inventory.map((item) => ({ ...normalizeStoredItem(item), bonus: item.bonus || { str: 0, agi: 0, intel: 0, vit: 0 }, resist: item.resist || { physical: 0, magic: 0 } })) : next.inventory,
    fusionCores: Number.isFinite(parsed.fusionCores) ? Math.max(0, Math.floor(parsed.fusionCores!)) : next.fusionCores,
    soulStones: Number.isFinite(parsed.soulStones) ? Math.max(0, Number(parsed.soulStones)) : next.soulStones,
    awakeningStones: Number.isFinite(parsed.awakeningStones) ? Math.max(0, Number(parsed.awakeningStones)) : next.awakeningStones,
    materials: parsed.materials && typeof parsed.materials === "object" ? parsed.materials : {},
    exchangePurchases: parsed.exchangePurchases && typeof parsed.exchangePurchases === "object" ? parsed.exchangePurchases : {},
    medicines: parsed.medicines && typeof parsed.medicines === "object" ? parsed.medicines : {},
    autoSkill: parsed.autoSkill !== false,
    autoMedicine: { healing: Math.min(99, Math.max(0, Math.floor(Number(parsed.autoMedicine?.healing) || 0))), mana: Math.min(99, Math.max(0, Math.floor(Number(parsed.autoMedicine?.mana) || 0))) },
    autoMedicineAt: { healing: 0, mana: 0 },
    autoPotion: AutoPotionManager.normalize(parsed.autoPotion),
    autoPotionAt: 0,
    onboardingStep: "completed",
    hanyangPrologueStep: restoreHanyangStep(parsed),
    hanyangPrologueFlags: normalizeHanyangPrologueFlags((parsed as Partial<GameState>).hanyangPrologueFlags),
    battleLogs: BattleLogManager.getLogs(Array.isArray(parsed.battleLogs) ? parsed.battleLogs : []),
    claimedContracts: Array.isArray(parsed.claimedContracts) ? parsed.claimedContracts : [],
    cityHall: normalizeCityHallState((parsed as Partial<GameState>).cityHall),
    npcProgress: normalizeNpcProgress(parsed.npcProgress),
    lastSeen: Number(parsed.lastSeen) || Date.now(),
  });
  if (dungeonBusy(parsed.dungeon)) {
    const now = Date.now(), pause = Math.max(0, now - (Number(parsed.lastSeen) || now)), healInterval = territoryHealInterval(next.territory), savedDungeon = parsed.dungeon as { autoHunt?: boolean; resumeAutoHuntAfterRecovery?: boolean; key?: string; lockedEnemyKey?: string };
    const maxHp = Math.max(1, next.hero.maxHp ?? vitalStats(next.hero).maxHp), hpBefore = Math.max(0, Math.min(maxHp, next.hero.hp ?? maxHp)), healSteps = Math.min(Math.ceil(Math.max(0, maxHp - hpBefore) / 10), Math.floor(pause / healInterval)), healedHp = Math.min(maxHp, hpBefore + healSteps * 10), healElapsed = healSteps * healInterval, recovered = healedHp >= maxHp, remainingPause = Math.max(0, pause - healElapsed), resumeAutoHunt = savedDungeon.autoHunt === true || savedDungeon.resumeAutoHuntAfterRecovery === true;
    const baseDungeon = freshDungeon(), savedKey = savedDungeon.key && savedDungeon.key in DUNGEONS ? savedDungeon.key as keyof typeof DUNGEONS : baseDungeon.key;
    next.dungeon = { ...baseDungeon, key: savedKey, lockedEnemyKey: savedDungeon.lockedEnemyKey as typeof baseDungeon.lockedEnemyKey, autoHunt: resumeAutoHunt, status: recovered ? (resumeAutoHunt ? "respawning" : "idle") : "recovering", stamp: now, spawnAt: recovered && resumeAutoHunt ? now + 500 : 0, innHealAt: recovered ? 0 : now + healInterval, logs: [recovered && resumeAutoHunt ? "離線療傷完成，自動狩獵已恢復。" : "返回漢陽客棧療傷；療傷完成前不結算掛機收益。"] };
    next.hero = { ...next.hero, hp: healedHp, status: recovered ? "正常" : "客棧中" };
    next.idleStamp = recovered ? now - remainingPause : now;
    if (next.trade.caravan) next.trade = { ...next.trade, caravan: { ...next.trade.caravan, startedAt: next.trade.caravan.startedAt + pause } };
  } else {
    next.dungeon = freshDungeon();
    next.hero = { ...next.hero, status: "正常" };
  }
  next.hero = normalizeVitals({ ...next.hero, flatAttackBonus: exchangeAttackBonus(next.exchangePurchases) });
  next.mercs = next.mercs.map(normalizeVitals);
  next.restingMercs = next.restingMercs.map(normalizeVitals);
  return retainGuildRoster<Equipment, Unit, GameState>(applyGersangVisuals(next));
}
