'use client';
import { Tabs } from '@/components/ui/tabs';
import { Sparkles } from 'lucide-react';
import { GameArchivePage } from './game-archive-page';
import { GameBattlePage } from './game-battle-page';
import { GameCharacterGateway } from './game-character-gateway';
import { GameCityPage } from './game-city-page';
import { GameContractsPage } from './game-contracts-page';
import { GameDialogs } from './game-dialogs';
import { GameHallPage } from './game-hall-page';
import { GameHeader } from './game-header';
import { GameInnPanel } from './game-inn-panel';
import { GameLiveFooter } from './game-live-footer';
import { GameMapPage } from './game-map-page';
import { GameNavigation } from './game-navigation';
import { GameWorldBattlePanel } from './game-world-battle-panel';
import { GameQuestPanel } from './game-quest-panel';
import { GameRaidPage } from './game-raid-page';
import { GameRelicPage } from './game-relic-page';
import { GameSquadPage } from './game-squad-page';
import { GameTabNavigation } from './game-tab-navigation';
import { GameTradePage } from './game-trade-page';
import './gersang-archive.css';
import './quest-journal.css';
import './relic-dungeon.css';
import { SceneMusic } from './scene-music';
import { selectGameView, useGameController } from './use-game-controller';

export default function GameV15() {
  const view = useGameController();
  if (!view.ready || !view.loginEntered || view.activeSlot === null)
    return (
      <GameCharacterGateway
        {...selectGameView(view, [
          'activeSlot',
          'characterGender',
          'characterName',
          'confirmDeleteCharacter',
          'createCharacter',
          'creatorSlot',
          'deleteCandidate',
          'deleteConfirmName',
          'enterCharacter',
          'loginEntered',
          'notice',
          'profiles',
          'ready',
          'setActiveSlot',
          'setCharacterGender',
          'setCharacterName',
          'setCreatorSlot',
          'setDeleteCandidate',
          'setDeleteConfirmName',
          'setLoginEntered',
          'setNotice',
        ])}
      />
    );
  return (
    <main
      className="game-shell v15-shell classic-live-game"
      data-scene-mode={view.uiSettings.sceneMode}
      data-objective-collapsed={true}
      data-quicknav-collapsed={!view.quickNavExpanded}
      data-onboarding-locked={
        view.tutorialMapLocked
          ? 'map'
          : view.tutorialBattleLocked || view.tutorialTrialLocked
            ? 'battle'
            : view.tutorialCityLocked
              ? 'city'
              : view.hanyangLockedTab
      }
    >
      <GameHeader
        {...selectGameView(view, [
          'activePartyHp',
          'activePartyMaxHp',
          'displayedPower',
          'game',
          'returnToCharacterSelect',
        ])}
      />

      <GameNavigation
        {...selectGameView(view, [
          'activeTab',
          'progressiveUnlocks',
          'quickDialog',
          'quickNavExpanded',
          'setActiveTab',
          'setCityService',
          'setQuickDialog',
          'setQuickNavExpanded',
        ])}
      />

      {view.notice && (
        <button className="notice" onClick={() => view.setNotice('')}>
          <Sparkles />
          {view.notice}
          <span>點擊關閉</span>
        </button>
      )}
      <SceneMusic
        scene={view.musicScene}
        volume={view.uiSettings.musicVolume / 100}
      />
      <GameDialogs
        {...selectGameView(view, [
          'game',
          'goToObjective',
          'mainObjective',
          'quickDialog',
          'returnReport',
          'setGame',
          'setQuickDialog',
          'setReturnReport',
          'setSceneMode',
          'setTreasureQuery',
          'setUiSettings',
          'treasureMaterialNames',
          'treasureMedicineEntries',
          'treasureQuery',
          'uiSettings',
        ])}
      />

      <GameQuestPanel
        {...selectGameView(view, [
          'game',
          'goToObjective',
          'mainObjective',
          'objectiveExpanded',
          'openNpcDialogue',
          'roadmapStages',
          'setActiveTab',
          'setGame',
          'setObjectiveExpanded',
        ])}
      />

      <GameWorldBattlePanel {...selectGameView(view, ['game', 'ready', 'activeSlot', 'battleWindowRequest', 'currentMap', 'consumeMedicine', 'setGame'])} />

      <GameInnPanel
        {...selectGameView(view, [
          'game',
          'heroVital',
          'innPanelExpanded',
          'quickHealCost',
          'setGame',
          'setInnPanelExpanded',
        ])}
      />

      <GameLiveFooter
        {...selectGameView(view, [
          'displayCityName',
          'displayedPower',
          'game',
          'heroVital',
          'heroXpNeeded',
        ])}
      />

      <Tabs
        value={view.activeTab}
        onValueChange={(value) => {
          if (!view.visibleTabs.includes(value)) return;
          if (view.tutorialMapLocked && value !== 'map') return;
          if (
            (view.tutorialBattleLocked || view.tutorialTrialLocked) &&
            value !== 'battle'
          )
            return;
          if (view.tutorialCityLocked && value !== 'city') return;
          if (view.hanyangLockedTab && value !== view.hanyangLockedTab) return;
          view.setActiveTab(value);
        }}
        className="game-tabs"
      >
        <GameTabNavigation {...selectGameView(view, ['progressiveUnlocks'])} />

        <GameMapPage
          {...selectGameView(view, [
            'activeNpcId',
            'activeTab',
            'displayCityName',
            'game',
            'handleNpcAction',
            'mapLocationLabel',
            'mysteryNpcVisible',
            'npcLabelsVisible',
            'npcOpeningLine',
            'openNpcDialogue',
            'progressiveUnlocks',
            'setActiveNpcId',
            'setActiveTab',
            'setCityService',
            'setNpcLabelsVisible',
            'tutorialCityLocked',
            'tutorialMapLocked',
            'tutorialNpcIds',
            'tutorialTrialLocked',
          ])}
        />

        <GameTradePage
          {...selectGameView(view, [
            'availableRestingMercs',
            'displayedPower',
            'game',
            'sendCaravan',
            'setGame',
            'upgradeCaravan',
            'upgradeTradePort',
          ])}
        />

        <GameBattlePage
          {...selectGameView(view, [
            'setBattleWindowRequest',
            'activeUnits',
            'battlePanelVisibility',
            'consumeMedicine',
            'currentMap',
            'currentMapEnemies',
            'currentMapGate',
            'firstCaravanBossReady',
            'game',
            'mapGate',
            'selectBattleMap',
            'setBattlePanelVisibility',
            'setGame',
            'tutorialBattleLocked',
          ])}
        />

        <GameRaidPage
          {...selectGameView(view, [
            'amaterasuSetPieces',
            'azureSetPieces',
            'chiyouSetPieces',
            'displayedPower',
            'forgeThunderSet',
            'game',
            'setGame',
            'setNotice',
          ])}
        />

        <GameSquadPage
          {...selectGameView(view, [
            'addStat',
            'availableRestingMercs',
            'craftTerritoryRestaurantFood',
            'currentCity',
            'cycleUnitPosition',
            'displayedPower',
            'enhanceFeedback',
            'enhanceTerritoryEquipment',
            'equipItem',
            'equipmentPulseUid',
            'fuseAllTerritoryEquipment',
            'game',
            'openAncientCoinBox',
            'promoteGuildRank',
            'recruitMerchant',
            'redeemWandererBlackBoneChickenSoup',
            'redeemWandererChickenSoup',
            'redeemWandererGinsengChickenSoup',
            'redeemWandererSet',
            'sellEveryInventoryEquipment',
            'sellEveryLoot',
            'sellInventoryEquipment',
            'sellLoot',
            'setGame',
            'setSelectedUid',
            'smeltLowRarityEquipment',
            'squadDestination',
            'storeMercenary',
            'toggleActive',
            'unequipItem',
            'upgradeGuildSkill',
            'upgradeTerritoryBuilding',
            'withdrawRestingMercenary',
          ])}
        />

        <GameCityPage
          {...selectGameView(view, [
            'buyExchangeUpgrade',
            'buyLootMaterial',
            'buyMagicEquipment',
            'buyMedicine',
            'buyOfficialItem',
            'buyTierEquipment',
            'buyWearable',
            'cityArmors',
            'cityService',
            'cityWeapons',
            'consumeMedicine',
            'craftRelicEquipment',
            'currentCity',
            'currentNation',
            'currentWorldZone',
            'depositToWarehouse',
            'game',
            'gemAmount',
            'gemSlot',
            'medicineAmounts',
            'quickHealCost',
            'recruitGeneral',
            'recruitMerchant',
            'restAtInn',
            'selected',
            'setCityService',
            'setGame',
            'setGemAmount',
            'setGemSlot',
            'setMedicineAmounts',
            'sharedWarehouse',
            'shopPurchaseFeedback',
            'socketGem',
            'travelToCity',
            'withdrawFromWarehouse',
          ])}
        />

        <GameContractsPage
          {...selectGameView(view, [
            'claimContract',
            'game',
            'openNpcDialogue',
            'setActiveTab',
            'trackedNpcQuests',
          ])}
        />

        <GameHallPage
          {...selectGameView(view, [
            'abandonCityHall',
            'acceptCityHallCommission',
            'buyCityHallTicket',
            'claimCityHallCommission',
            'game',
            'refreshCityHall',
          ])}
        />

        <GameRelicPage
          {...selectGameView(view, [
            'activeTab',
            'displayedPower',
            'game',
            'setActiveTab',
            'setCityService',
            'setGame',
            'setSquadDestination',
          ])}
        />

        <GameArchivePage />
      </Tabs>

      <footer>
        <span>放置你的巨商魂・東方商路</span>
        <span>四國城市・傭兵養成・雷霆祭壇・裝備圖鑑</span>
      </footer>
    </main>
  );
}
