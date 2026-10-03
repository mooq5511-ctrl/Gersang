'use client';
import { useEffect, useState } from 'react';
import { type EquipmentSlot } from './equipment-slots';
import { createCityController } from './game-city-controller';
import { createCommissionsController } from './game-commissions-controller';
import { createGuildController } from './game-guild-controller';
import { createInventoryController } from './game-inventory-controller';
import { createNavigationController } from './game-navigation-controller';
import { createNpcController } from './game-npc-controller';
import { createSquadController } from './game-squad-controller';
import { type CityService } from './game-state';
import { createTerritoryController } from './game-territory-controller';
import {
  BattlePanelVisibility,
  DEFAULT_BATTLE_PANEL_VISIBILITY,
} from './game-ui-config';
import { getGameView } from './game-view-selector';
import { type NpcId } from './npc-dialogue';
import { useCharacterSession } from './use-character-session';
import { useGameLoop } from './use-game-loop';
import { useGameMaintenance } from './use-game-maintenance';
import { useGamePreferences } from './use-game-preferences';
import { useGameState } from './use-game-state';
import {
  useHanyangFormationEffect,
  useHanyangKillEffect,
  useHanyangReturnEffects,
} from './use-hanyang-navigation';
import { useTradeController } from './use-trade-controller';

export function useGameController() {
  const { game, setGame } = useGameState();

  const [activeTab, setActiveTab] = useState('map');

  const [quickDialog, setQuickDialog] = useState<
    'treasure' | 'settings' | null
  >(null);

  const [treasureQuery, setTreasureQuery] = useState('');

  const [objectiveExpanded, setObjectiveExpanded] = useState(false);

  const [quickNavExpanded, setQuickNavExpanded] = useState(true);

  const [innPanelExpanded, setInnPanelExpanded] = useState(true);

  const [npcLabelsVisible, setNpcLabelsVisible] = useState(true);

  const [battlePanelVisibility, setBattlePanelVisibility] =
    useState<BattlePanelVisibility>(DEFAULT_BATTLE_PANEL_VISIBILITY);

  const [squadDestination, setSquadDestination] = useState<{
    key: number;
    window?: 'inventory' | 'territory';
  }>({ key: 0 });

  const [notice, setNotice] = useState('');
  const { uiSettings, setUiSettings, setSceneMode } = useGamePreferences({
    setNotice,
  });

  const [shopPurchaseFeedback, setShopPurchaseFeedback] = useState<
    string | null
  >(null);

  const [selectedUid, setSelectedUid] = useState('hero');

  const [equipmentPulseUid, setEquipmentPulseUid] = useState<string | null>(
    null,
  );

  const [enhanceFeedback, setEnhanceFeedback] = useState<{
    uid: string;
    name: string;
    success: boolean;
    level: number;
  } | null>(null);

  const [cityService, setCityService] = useState<CityService>('mercenary');

  const [medicineAmounts, setMedicineAmounts] = useState<
    Record<string, number>
  >({});

  const [gemSlot, setGemSlot] = useState<EquipmentSlot>('armor');

  const [gemAmount, setGemAmount] = useState(1);

  const [activeNpcId, setActiveNpcId] = useState<NpcId | null>(null);

  const [npcOpeningLine, setNpcOpeningLine] = useState('');

  function flashShopPurchase(key: string) {
    setShopPurchaseFeedback(key);
    window.setTimeout(
      () =>
        setShopPurchaseFeedback((current) =>
          current === key ? null : current,
        ),
      900,
    );
  }

  useEffect(() => {
    if (game.hero.status !== '客棧中') return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setInnPanelExpanded(true); });
    return () => { cancelled = true; };
  }, [game.hero.status]);
  useHanyangReturnEffects({ game, setGame, setNotice });

  const {
    ready,
    loginEntered,
    setLoginEntered,
    profiles,
    activeSlot,
    setActiveSlot,
    creatorSlot,
    setCreatorSlot,
    deleteCandidate,
    setDeleteCandidate,
    deleteConfirmName,
    setDeleteConfirmName,
    characterName,
    setCharacterName,
    characterGender,
    setCharacterGender,
    returnReport,
    setReturnReport,
    sharedWarehouse,
    setSharedWarehouse,
    enterCharacter,
    createCharacter,
    confirmDeleteCharacter,
    returnToCharacterSelect,
  } = useCharacterSession({
    game,
    setGame,
    setNotice,
    setSelectedUid,
    setCityService,
    setActiveTab,
  });
  useHanyangFormationEffect({ activeTab, game, setGame });
  const {
    selected,
    activeUnits,
    availableRestingMercs,
    azureSetPieces,
    chiyouSetPieces,
    amaterasuSetPieces,
    currentMap,
    currentWorldZone,
    currentCity,
    heroVital,
    activePartyHp,
    activePartyMaxHp,
    displayedPower,
    heroXpNeeded,
    quickHealCost,
    currentNation,
    displayCityName,
    mapLocationLabel,
    tutorialMapLocked,
    tutorialBattleLocked,
    tutorialTrialLocked,
    tutorialCityLocked,
    tutorialNpcIds,
    mysteryNpcVisible,
    progressiveUnlocks,
    visibleTabs,
    hanyangStep,
    hanyangLockedTab,
    trackedNpcQuests,
    firstCaravanBossReady,
    roadmapStages,
    mainObjective,
    cityArmors,
    cityWeapons,
    musicScene,
    mapGate,
    currentMapGate,
    currentMapEnemies,
    treasureMaterialNames,
    treasureMedicineEntries,
  } = getGameView({ activeTab, cityService, game, selectedUid, treasureQuery });

  useGameLoop({ ready, activeSlot, setGame });
  useGameMaintenance({ activeSlot, game, ready, setGame });
  useHanyangKillEffect({ game, setGame });
  const { sendCaravan, upgradeCaravan, upgradeTradePort } = useTradeController({
    activeSlot,
    ready,
    setGame,
  });

  const {
    recruitMerchant,
    toggleActive,
    storeMercenary,
    withdrawRestingMercenary,
    addStat,
    cycleUnitPosition,
    recruitGeneral,
  } = createSquadController({
    game,
    currentCity,
    setGame,
    setNotice,
    selectedUid,
  });

  const {
    equipItem,
    sellLoot,
    sellEveryLoot,
    buyLootMaterial,
    buyExchangeUpgrade,
    craftRelicEquipment,
    sellInventoryEquipment,
    sellEveryInventoryEquipment,
    smeltLowRarityEquipment,
    unequipItem,
    buyWearable,
    buyMagicEquipment,
    buyOfficialItem,
    depositToWarehouse,
    withdrawFromWarehouse,
    buyTierEquipment,
    enhanceTerritoryEquipment,
    fuseAllTerritoryEquipment,
    buyMedicine,
    openAncientCoinBox,
    consumeMedicine,
    socketGem,
  } = createInventoryController({
    selectedUid,
    game,
    setNotice,
    setEquipmentPulseUid,
    setGame,
    flashShopPurchase,
    currentCity,
    sharedWarehouse,
    setSharedWarehouse,
    setEnhanceFeedback,
    gemSlot,
  });

  const {
    acceptCityHallCommission,
    claimCityHallCommission,
    refreshCityHall,
    abandonCityHall,
    buyCityHallTicket,
  } = createCommissionsController({ setGame, setNotice });

  const { handleNpcAction, openNpcDialogue } = createNpcController({
    currentCity,
    game,
    setActiveNpcId,
    setActiveTab,
    setCityService,
    setGame,
    setNotice,
    setNpcOpeningLine,
  });

  const { selectBattleMap, travelToCity, restAtInn, claimContract } =
    createCityController({
      currentCity,
      game,
      setCityService,
      setGame,
      setNotice,
    });

  const {
    upgradeTerritoryBuilding,
    forgeThunderSet,
    redeemWandererSet,
    craftTerritoryRestaurantFood,
    redeemWandererGinsengChickenSoup,
    redeemWandererBlackBoneChickenSoup,
    redeemWandererChickenSoup,
  } = createTerritoryController({ setGame, setNotice });

  const { promoteGuildRank, upgradeGuildSkill } = createGuildController({
    setGame,
  });

  const { goToObjective } = createNavigationController({
    game,
    mainObjective,
    openNpcDialogue,
    setActiveNpcId,
    setActiveTab,
    setCityService,
    setGame,
    setNotice,
    setNpcOpeningLine,
    setSquadDestination,
  });
  return {
    abandonCityHall,
    acceptCityHallCommission,
    activeNpcId,
    activePartyHp,
    activePartyMaxHp,
    activeSlot,
    activeTab,
    activeUnits,
    addStat,
    amaterasuSetPieces,
    availableRestingMercs,
    azureSetPieces,
    battlePanelVisibility,
    buyCityHallTicket,
    buyExchangeUpgrade,
    buyLootMaterial,
    buyMagicEquipment,
    buyMedicine,
    buyOfficialItem,
    buyTierEquipment,
    buyWearable,
    characterGender,
    characterName,
    chiyouSetPieces,
    cityArmors,
    cityService,
    cityWeapons,
    claimCityHallCommission,
    claimContract,
    confirmDeleteCharacter,
    consumeMedicine,
    craftRelicEquipment,
    craftTerritoryRestaurantFood,
    createCharacter,
    creatorSlot,
    currentCity,
    currentMap,
    currentMapEnemies,
    currentMapGate,
    currentNation,
    currentWorldZone,
    cycleUnitPosition,
    deleteCandidate,
    deleteConfirmName,
    depositToWarehouse,
    displayCityName,
    displayedPower,
    enhanceFeedback,
    enhanceTerritoryEquipment,
    enterCharacter,
    equipItem,
    equipmentPulseUid,
    firstCaravanBossReady,
    forgeThunderSet,
    fuseAllTerritoryEquipment,
    game,
    gemAmount,
    gemSlot,
    goToObjective,
    handleNpcAction,
    hanyangLockedTab,
    hanyangStep,
    heroVital,
    heroXpNeeded,
    innPanelExpanded,
    loginEntered,
    mainObjective,
    mapGate,
    mapLocationLabel,
    medicineAmounts,
    musicScene,
    mysteryNpcVisible,
    notice,
    npcLabelsVisible,
    npcOpeningLine,
    objectiveExpanded,
    openAncientCoinBox,
    openNpcDialogue,
    profiles,
    progressiveUnlocks,
    promoteGuildRank,
    quickDialog,
    quickHealCost,
    quickNavExpanded,
    ready,
    recruitGeneral,
    recruitMerchant,
    redeemWandererBlackBoneChickenSoup,
    redeemWandererChickenSoup,
    redeemWandererGinsengChickenSoup,
    redeemWandererSet,
    refreshCityHall,
    restAtInn,
    returnReport,
    returnToCharacterSelect,
    roadmapStages,
    selectBattleMap,
    selected,
    sellEveryInventoryEquipment,
    sellEveryLoot,
    sellInventoryEquipment,
    sellLoot,
    sendCaravan,
    setActiveNpcId,
    setActiveSlot,
    setActiveTab,
    setBattlePanelVisibility,
    setCharacterGender,
    setCharacterName,
    setCityService,
    setCreatorSlot,
    setDeleteCandidate,
    setDeleteConfirmName,
    setGame,
    setGemAmount,
    setGemSlot,
    setInnPanelExpanded,
    setLoginEntered,
    setMedicineAmounts,
    setNotice,
    setNpcLabelsVisible,
    setObjectiveExpanded,
    setQuickDialog,
    setQuickNavExpanded,
    setReturnReport,
    setSceneMode,
    setSelectedUid,
    setSquadDestination,
    setTreasureQuery,
    setUiSettings,
    sharedWarehouse,
    shopPurchaseFeedback,
    smeltLowRarityEquipment,
    socketGem,
    squadDestination,
    storeMercenary,
    toggleActive,
    trackedNpcQuests,
    travelToCity,
    treasureMaterialNames,
    treasureMedicineEntries,
    treasureQuery,
    tutorialBattleLocked,
    tutorialCityLocked,
    tutorialMapLocked,
    tutorialNpcIds,
    tutorialTrialLocked,
    uiSettings,
    unequipItem,
    upgradeCaravan,
    upgradeGuildSkill,
    upgradeTerritoryBuilding,
    upgradeTradePort,
    visibleTabs,
    withdrawFromWarehouse,
    withdrawRestingMercenary,
  };
}

export type GameViewModel = ReturnType<typeof useGameController>;

export function selectGameView<K extends keyof GameViewModel>(
  view: GameViewModel,
  keys: readonly K[],
): Pick<GameViewModel, K> {
  const selected = {} as Pick<GameViewModel, K>;
  for (const key of keys) selected[key] = view[key];
  return selected;
}
