import { WORLD_ZONES } from './dungeon-engine';
import { medicineCatalog } from "./game-config";
import { STARTER_VILLAGE_NAME } from "./game-hero-factory";
import { unitPower,xpNeed } from "./game-progression";
import { getProgressionView } from "./game-progression-view";
import { type CityService,type Equipment,type GameState,type Hero,type Unit } from "./game-state";
import { guildSkillTradeBonuses } from "./guild-skills";
import { HANYANG_PROLOGUE_STEPS } from "./hanyang-prologue";
import {hanyangTutorialNpcIds} from './hanyang-town-visibility';
import { mythicSetPieceCount } from './mythic-forge';
import { equipmentBaseName } from './equipment-affix-semantics';
import { newcomerUnlocks } from "./newcomer-unlocks";
import { activeNpcQuests } from "./npc-dialogue";
import { battleMaps } from "./reference-data";
import { type SceneMusicKind } from './scene-music';
import { nations,worldCities } from "./v15-data";
import { officialEquipment,sourceEnemies } from "./v17-content";
import { MATERIAL_PRICES } from './village-exchange';
import { vitalStats } from "./vitals-engine";

type getGameViewContext = {
activeTab: string;
cityService: CityService;
game: GameState;
selectedUid: string;
treasureQuery: string;
};

export function getGameView({ activeTab, cityService, game, selectedUid, treasureQuery }: getGameViewContext) {
const selected: Unit | Hero =
    selectedUid === "hero"
      ? game.hero
      : game.mercs.find((unit) => unit.uid === selectedUid) || game.hero;

const activeUnits = game.active
    .map((unitUid) => game.mercs.find((unit) => unit.uid === unitUid))
    .filter(Boolean) as Unit[];

const relicReservationActive = game.relicDungeon?.status === "dispatching" || game.relicDungeon?.status === "ready" || game.relicDungeon?.status === "boss";

const relicReservedUids = relicReservationActive ? game.relicDungeon?.dispatchPartyUids || [] : [];

const availableRestingMercs = game.restingMercs.filter(unit => !relicReservedUids.includes(unit.uid));

const equippedMythicNames = [game.hero, ...activeUnits].flatMap((unit) => Object.values(unit.equip).filter((item): item is Equipment => !!item).map(equipmentBaseName));

const azureSetPieces = mythicSetPieceCount(equippedMythicNames,'azure');

const chiyouSetPieces = mythicSetPieceCount(equippedMythicNames,'chiyou');

const amaterasuSetPieces = mythicSetPieceCount(equippedMythicNames,'amaterasu');

const currentMap = battleMaps.find((map) => map.id === game.battleMap) || battleMaps[0];

const currentWorldZone=WORLD_ZONES.find(zone=>zone.id===(game.dungeon?.zone||'hanyang'))||WORLD_ZONES[0];

const currentCity = worldCities.find((city) => city.id === game.city) || worldCities[0];

const heroVital=vitalStats(game.hero);

const activePartyVitals=[game.hero,...activeUnits].map(unit=>vitalStats(unit));

const activePartyHp=activePartyVitals.reduce((sum,unit)=>sum+Math.max(0,unit.hp),0);

const activePartyMaxHp=activePartyVitals.reduce((sum,unit)=>sum+Math.max(1,unit.maxHp),0);

const guildSkillBonus=guildSkillTradeBonuses(game.guildSkills);

const displayedPower=(unit:Unit|Hero)=>Math.floor(unitPower(unit)*(1+(unit.uid==='hero'?guildSkillBonus.heroPowerBonus:guildSkillBonus.mercenaryPowerBonus)));

const heroXpNeeded=xpNeed(game.hero.level);

const quickHealCost=Math.max(0,heroVital.maxHp-heroVital.hp)*2;

const currentNation = nations.find((nation) => nation.id === currentCity.nation) || nations[0];

const displayCityName = currentCity.id === "hanyang" ? STARTER_VILLAGE_NAME : currentCity.name;

const mapLocationLabel = currentCity.id === "hanyang" ? "新村村郊" : displayCityName;

const tutorialMapLocked = game.hanyangPrologueStep === "arrival" || game.hanyangPrologueStep === "journey-fund" || game.hanyangPrologueStep === "caravan-crisis" || game.hanyangPrologueStep === "caravan-delivery" || game.hanyangPrologueStep === "return" || game.hanyangPrologueStep === "departure";

const tutorialBattleLocked = game.hanyangPrologueStep === "outskirts";

const tutorialTrialLocked = false;

const tutorialCityLocked = game.hanyangPrologueStep === "guild";

const tutorialNpcIds = hanyangTutorialNpcIds(game.hanyangPrologueStep);

const mysteryNpcVisible = game.hanyangPrologueStep === "completed" && !game.hanyangPrologueFlags.mysteryNpcSeen;

const progressiveUnlocks = newcomerUnlocks(game);

const visibleTabs = [
    "map",
    "battle",
    "squad",
    "city",
    ...(progressiveUnlocks.trade ? ["trade"] : []),
    ...(progressiveUnlocks.relic ? ["relic"] : []),
    ...(progressiveUnlocks.collection ? ["archive"] : []),
    ...(progressiveUnlocks.contracts ? ["contracts"] : []),
    ...(progressiveUnlocks.hall ? ["hall"] : []),
    ...(progressiveUnlocks.raid ? ["raid"] : []),
  ];

const hanyangStep = HANYANG_PROLOGUE_STEPS.find(({ step }) => step === game.hanyangPrologueStep) || HANYANG_PROLOGUE_STEPS[0];

const hanyangLockedTab = game.hanyangPrologueStep === "arrival" || game.hanyangPrologueStep === "journey-fund" || game.hanyangPrologueStep === "caravan-crisis" || game.hanyangPrologueStep === "caravan-delivery" || game.hanyangPrologueStep === "return" || game.hanyangPrologueStep === "departure" ? "map" : game.hanyangPrologueStep === "outskirts" || game.hanyangPrologueStep === "bandit-trial" ? "battle" : game.hanyangPrologueStep === "first-sale" || game.hanyangPrologueStep === "formation" ? "squad" : game.hanyangPrologueStep === "guild" || game.hanyangPrologueStep === "medicine" ? "city" : undefined;

const trackedNpcQuests = activeNpcQuests(game);

const { firstCaravanBossReady, roadmapStages, mainObjective } = getProgressionView(game);

const cityArmors = officialEquipment.filter((item) => item.kind === "armor").filter((_, index) => index % 5 === currentCity.stockIndex).slice(0, 8);

const cityWeapons = officialEquipment.filter((item) => item.kind === "weapon").filter((_, index) => index % 5 === currentCity.stockIndex).slice(0, 8);

const musicScene:SceneMusicKind=activeTab==='relic'?'relic':activeTab==='raid'?'raid':activeTab==='battle'?'boss':game.hero.status==='客棧中'||(activeTab==='city'&&cityService==='inn')?'inn':activeTab==='city'||activeTab==='trade'?'merchant':'outskirts';

const mapGate = (map: typeof battleMaps[number]) => {
    const stageReady = game.stage >= map.unlockStage;
    const bossReady = map.id !== 'millennium-lake' || game.newbieBossDefeated;
    const lakeReady = map.id !== 'japan-sea' || game.lakeBossDefeated;
    const seaReady = map.id !== 'miasma-forest' || game.goldenStarfishDefeated;
    const unlocked = stageReady && bossReady && lakeReady && seaReady;
    const requirement = !stageReady ? `關卡進度 ${game.stage} / ${map.unlockStage}`
      : !bossReady ? '擊敗山賊首領'
      : !lakeReady ? '擊敗狂風阿魯塔'
      : !seaReady ? '擊敗黃金海星'
      : '已開放';
    return { unlocked, requirement };
  };

const currentMapGate = mapGate(currentMap);

const currentMapEnemies = sourceEnemies.filter(enemy => enemy.mapId === currentMap.id);

const treasureTerm = treasureQuery.trim();

const relicTreasureNames = ["遺跡材料", "古代裝備", "遺跡碎片"];

const treasureMaterialNames = Array.from(new Set([...Object.keys(MATERIAL_PRICES), ...relicTreasureNames])).sort((a, b) => a.localeCompare(b, "zh-TW")).filter(name => !treasureTerm || name.includes(treasureTerm));

const treasureMedicineEntries = medicineCatalog.filter(medicine => !treasureTerm || medicine.name.includes(treasureTerm) || medicine.effect.includes(treasureTerm));
return { selected, activeUnits, availableRestingMercs, azureSetPieces, chiyouSetPieces, amaterasuSetPieces, currentMap, currentWorldZone, currentCity, heroVital, activePartyHp, activePartyMaxHp, displayedPower, heroXpNeeded, quickHealCost, currentNation, displayCityName, mapLocationLabel, tutorialMapLocked, tutorialBattleLocked, tutorialTrialLocked, tutorialCityLocked, tutorialNpcIds, mysteryNpcVisible, progressiveUnlocks, visibleTabs, hanyangStep, hanyangLockedTab, trackedNpcQuests, firstCaravanBossReady, roadmapStages, mainObjective, cityArmors, cityWeapons, musicScene, mapGate, currentMapGate, currentMapEnemies, treasureMaterialNames, treasureMedicineEntries };
}
