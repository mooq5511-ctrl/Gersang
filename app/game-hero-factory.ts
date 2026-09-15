import { emptyEquipmentSlots } from "./equipment-slots";
import { freshTrade } from "./trade-engine";
import { freshTerritory } from "./guild-territory";
import { worldCities, type NationId } from "./v15-data";
import { battleMaps } from "./reference-data";
import { gersangHeroArt, gersangHeroFemaleArt } from "./gersang-visuals";
import { HERO_INITIAL_ATTRIBUTES } from "./hero-rules";
import { normalizeVitals } from "./vitals-engine";
import { heroNationProfiles } from "./game-config";
import { rollEquipment } from "./game-equipment-factory";
import { enemyMaxForStage } from "./game-runtime-actions";
import { freshNpcProgress } from "./npc-dialogue";
import type { Equipment, EquipmentSet, GameState, Hero, Unit } from "./game-state";

export function isNationId(value: unknown): value is NationId { return value === "taiwan" || value === "china" || value === "korea" || value === "japan"; }
export function emptyEquipment(): EquipmentSet { return emptyEquipmentSlots<Equipment>(); }
export function heroPortrait(nation: NationId, gender: "male" | "female" = "male") { return gender === "female" ? gersangHeroFemaleArt[nation] : gersangHeroArt[nation]; }

export function makeHero(nation: NationId = "korea", name = "王天下", gender: "male" | "female" = "male"): Hero {
  const profile = heroNationProfiles[nation];
  return normalizeVitals<Hero>({ uid: "hero", templateId: "hero", nation, tier: 0, special: false, name, job: nation === "korea" ? "朝鮮商客" : profile.title, role: "主角", skill: profile.skill, image: heroPortrait(nation, gender), gender, level: 1, xp: 0, points: 0, hp: 100, maxHp: 100, status: "正常", position: "前排", ...HERO_INITIAL_ATTRIBUTES, equip: emptyEquipment() });
}

export function starterEquipment(): Equipment[] { return [rollEquipment(3), rollEquipment(8, true)]; }

export function freshGame(nation: NationId = "korea", heroName = "王天下", gender: "male" | "female" = "male"): GameState {
  const starters: Unit[] = [];
  return { version: 30, trade: freshTrade(), territory: freshTerritory(), credit: 0, creditXp: 0, creditLevel: 1, idleStamp: Date.now(), gold: 0, stage: 1, kills: 0, newbieBossDefeated: false, lakeBossDefeated: false, goldenStarfishDefeated: false, newbieCoins: 0, city: worldCities.find((city) => city.nation === nation)?.id || worldCities[0].id, battleMap: battleMaps[0].id, hero: makeHero(nation, heroName, gender), mercs: starters, restingMercs: [], active: starters.map((unit) => unit.uid), inventory: starterEquipment(), fusionCores: 0, soulStones: 0, awakeningStones: 0, materials: {}, exchangePurchases: {}, medicines: {}, autoSkill: true, autoMedicine: { healing: 0, mana: 0 }, autoMedicineAt: { healing: 0, mana: 0 }, claimedContracts: [], npcProgress: freshNpcProgress(), lastEncounter: "尚未遭遇敵人。商隊出航後才可能觸發戰鬥。", enemyHp: enemyMaxForStage(1, battleMaps[0].hpMultiplier), formation: "goose", logs: ["主角、傭兵與信用等級已套用 Lv.1～300 共用經驗成長曲線。"], lastSeen: Date.now() };
}
