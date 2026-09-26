import { emptyEquipmentSlots } from "./equipment-slots";
import { freshTrade } from "./trade-engine";
import { freshTerritory } from "./guild-territory";
import { worldCities, type NationId } from "./v15-data";
import { battleMaps } from "./reference-data";
import { gersangHeroArt, gersangHeroFemaleArt } from "./gersang-visuals";
import { HERO_INITIAL_ATTRIBUTES } from "./hero-rules";
import { normalizeVitals } from "./vitals-engine";
import { heroNationProfiles } from "./game-config";
import { enemyMaxForStage } from "./game-runtime-actions";
import { freshNpcProgress } from "./npc-dialogue";
import { freshHanyangPrologueFlags } from "./hanyang-prologue";
import { freshCityHallState } from "./city-hall-commissions";
import { AutoPotionManager } from "./auto-potion-manager";
import { BattleLogManager } from "./battle-log-manager";
import type { Equipment, EquipmentSet, GameState, Hero, Unit } from "./game-state";

export function isNationId(value: unknown): value is NationId { return value === "taiwan" || value === "china" || value === "korea" || value === "japan"; }
export function emptyEquipment(): EquipmentSet { return emptyEquipmentSlots<Equipment>(); }
export function heroPortrait(nation: NationId, gender: "male" | "female" = "male") { return gender === "female" ? gersangHeroFemaleArt[nation] : gersangHeroArt[nation]; }

export function makeHero(nation: NationId = "korea", name = "王天下", gender: "male" | "female" = "male"): Hero {
  const profile = heroNationProfiles[nation];
  return normalizeVitals<Hero>({ uid: "hero", templateId: "hero", nation, tier: 0, special: false, name, job: "新手商隊長", role: "主角", skill: profile.skill, image: heroPortrait(nation, gender), gender, level: 1, xp: 0, points: 0, hp: 100, maxHp: 100, status: "正常", position: "前排", ...HERO_INITIAL_ATTRIBUTES, equip: emptyEquipment() });
}

/** Nation remains a save-compatible internal field; new heroes always begin in Hanyang. */
export const STARTER_NATION: NationId = "korea";
export const STARTER_VILLAGE_NAME = "新手村・漢陽";

export function freshGame(heroName = "王天下", gender: "male" | "female" = "male"): GameState {
  const starters: Unit[] = [];
  return { version: 30, trade: { ...freshTrade(), rewardMultiplier: 3 }, territory: freshTerritory(), credit: 0, creditXp: 0, creditLevel: 1, idleStamp: Date.now(), gold: 0, stage: 1, kills: 0, starterDeliveryKills: 0, newbieBossDefeated: false, lakeBossDefeated: false, goldenStarfishDefeated: false, newbieCoins: 0, city: worldCities.find((city) => city.nation === STARTER_NATION)?.id || worldCities[0].id, battleMap: battleMaps[0].id, hero: makeHero(STARTER_NATION, heroName, gender), mercs: starters, restingMercs: [], active: starters.map((unit) => unit.uid), inventory: [], fusionCores: 0, soulStones: 0, awakeningStones: 0, materials: {}, exchangePurchases: {}, medicines: {}, autoSkill: true, autoMedicine: { healing: 0, mana: 0 }, autoMedicineAt: { healing: 0, mana: 0 }, autoPotion: AutoPotionManager.defaults(), autoPotionAt: 0, onboardingStep: "completed", hanyangPrologueStep: "arrival", hanyangPrologueFlags: freshHanyangPrologueFlags(), battleLogs: BattleLogManager.clear(), claimedContracts: [], cityHall: freshCityHallState(), npcProgress: freshNpcProgress(), lastEncounter: "老商人正在漢陽港口等你。", enemyHp: enemyMaxForStage(1, battleMaps[0].hpMultiplier), formation: "goose", logs: [`你初到漢陽；城門附近有位老商人似乎注意到了你。`], lastSeen: Date.now() };
}
