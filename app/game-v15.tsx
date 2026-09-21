"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { merchantMercenaries, type MercenarySpec } from './mercenary-roster';
import { CaravanStatus } from './caravan-status';
import {DungeonPanel,WorldMapNavigation} from './dungeon-panel';
import {DUNGEONS,dungeonBusy,freshDungeon,teleportDungeon,WORLD_ZONES} from './dungeon-engine';
import { heroPersonalPower, heroWeightLimit, heroTotalAttributes } from './hero-rules';
import {positionInventory,addInventoryItem} from './inventory-layout';
import { ACTIVE_MERCENARY_LIMIT, backupBeforeGuildMigration } from './guild-migration';
import { EQUIPMENT_SLOTS, EQUIPMENT_LABELS, itemKind, normalizeStoredItem, backupBeforeEquipmentMigration, type EquipmentSlot } from './equipment-slots';
import { wearableCatalog, type WearableBase } from './wearable-catalog';
import { MercenaryRecruitment, mercenaryPortrait } from './mercenary-recruitment';
import { GeneralRecruitment } from './general-recruitment';
import { cuteEquipmentArt, gersangBuildingArt, gersangItemArt } from './gersang-visuals';
import {
  BedDouble,
  BookOpen,
  Castle,
  Coins,
  Crown,
  Gem,
  HeartPulse,
  Map,
  PackageOpen,
  Pill,
  Play,
  ScrollText,
  Settings,
  Shield,
  Ship,
  ShoppingBag,
  Sparkles,
  Swords,
  Users,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formations, mercenaries, type MercenaryDef } from "./game-data";
import {
  nations,
  worldCities,
} from "./v15-data";
import { battleMaps } from "./reference-data";
import { gameplayContracts as legacyContracts, officialEquipment, officialGems, OfficialEquipment, sourceEnemies } from "./v17-content";
const gameplayContracts = legacyContracts.filter(contract => !['tier1','tier2','awakened'].includes(contract.metric));
import { TradePanel } from "./trade-panel";
import { IsometricWorldMap } from "./isometric-world-map";
import { NpcDialoguePanel } from "./npc-dialogue-panel";
import { activeNpcQuests, awardNpcAffinity, completeNpcQuest, npcById, npcGreeting, recordNpcLine, startNpcQuest, type NpcId, type NpcOption } from "./npc-dialogue";
import { ThunderAltarRaid } from "./thunder-altar-raid";
import { THUNDER_FORGE_ITEMS, mythicSetPieceCount, type MythicSet, type ThunderForgeId } from './mythic-forge';
import { LEVEL_CAP } from "./level-progression";
import { combatStats, normalizeVitals, vitalStats } from "./vitals-engine";
import { TRADE_ROUTES } from "./trade-engine";
import { normalizeBattlePosition } from './formation-position';
import { MATERIAL_BUY_PRICES, MATERIAL_PRICES, VILLAGE_WEAPONS, exchangeAttackBonus, weaponCost, type VillageWeaponId } from './village-exchange';
import { GersangArchive } from './gersang-archive';
import { MonsterCompendium } from './monster-compendium';
import { parseStoredArray, preserveCorruptStorage } from './storage-guards';
import { medicineCatalog, SHOP_QUALITY } from "./game-config";
import { createGameTickRolls, settleCurrentGame } from "./game-loop";
import { grantCreditXp, grantXp, grantTerritoryXp, unitPower, xpNeed } from "./game-progression";
import { restAtInnAction, travelCityAction } from "./game-city-actions";
import { claimContractAction, contractProgress } from "./game-contract-actions";
import { formatGameNumber as format } from "./game-display";
import { appendGameLog as addLog, enemyMaxForStage as enemyMax, enterGameInnAction as enterGameInn, leaveGameInnAction as leaveGameInn, payGameInnAction as payGameInn } from "./game-runtime-actions";
import { applyShopQuality, makeOfficialEquipment, makeUid as uid, rollEquipment } from "./game-equipment-factory";
import { emptyEquipment, freshGame, heroPortrait, isNationId, STARTER_NATION, STARTER_VILLAGE_NAME } from "./game-hero-factory";
import { applyGersangVisuals } from "./game-save-normalizers";
import { SceneMusic, type SceneMusicKind } from './scene-music';
import { runDungeonAction, selectBattleMapAction } from "./game-battle-actions";
import { dispatchTradeAction, upgradeCaravanAction } from "./game-trade-actions";
import { allocateAttributeAction, cyclePositionAction, promoteMercenary, recruitGeneralAction, recruitMerchantAction, storeMercenaryAction, toggleActiveAction, withdrawMercenaryAction } from "./game-squad-actions";
import { applyAutoMedicineAction, buyMaterialAction, buyMedicineAction, consumeMedicineAction, depositWarehouseItemAction, equipInventoryItemAction, forgeThunderItemAction, forgeVillageWeaponAction, fuseAllInventoryEquipmentAction, openAncientCoinBoxAction, purchaseEquipmentAction, purchaseTierEquipmentAction, sellAllInventoryEquipmentAction, sellAllMaterialsAction, sellInventoryEquipmentAction, sellMaterialAction, socketGemAction, unequipInventoryItemAction, withdrawWarehouseItemAction } from "./game-inventory-actions";
import { fusionItemKey, isFusionIngredient, type FusionSourceRarity } from "./equipment-fusion";
import { getStarterWeaponObjective } from "./starter-equipment-objective";
import { getFirstMercenaryObjective } from "./first-mercenary-objective";
import { TIER_EQUIPMENT_DROP_REGIONS, tierEquipmentPrice, tierEquipmentShopCatalog, type TierEquipment } from "./tier-equipment";
import { profileFromGame, readCharacterSave, restoreGame, saveCharacterProfile, writeCharacterSave, writeProfileIndex, writeSharedWarehouse } from "./game-profile-storage";
import {
  PROFILE_INDEX,
  SHARED_WAREHOUSE_SAVE,
  profileSaveKey,
  type CharacterProfile,
  type CityService,
  type Equipment,
  type GameState,
  type Hero,
  type Unit,
} from "./game-state";
import './gersang-archive.css';
import { enhanceEquipment, upgradeBuilding, warehouseLimit, type BuildingId } from './guild-territory';

const slots = EQUIPMENT_SLOTS;
const bossMonsterArt:Record<string,string> = {
  '海賊王': '/assets/archive/s32_0028.webp',
  '狂虎': '/assets/monsters/gale-tiger.jpg?v=20260910',
  '訓練的雷獸': '/assets/monsters/sumeru/training-monsters.jpg',
  '訓練的瘟神': '/assets/monsters/sumeru/training-monsters.jpg',
  '訓練的虎鶴': '/assets/monsters/sumeru/training-monsters.jpg',
  '青臉夜叉金剛': '/assets/monsters/sumeru/vaisravana-area.jpg',
  '神獸玄武': '/assets/monsters/sumeru/vaisravana-area.jpg',
  '多聞天王': '/assets/monsters/sumeru/vaisravana-area.jpg',
  '神獸白虎': '/assets/monsters/sumeru/virupaksa-area.jpg',
  '廣目天王': '/assets/monsters/sumeru/virupaksa-area.jpg',
  '辟寒金剛': '/assets/monsters/sumeru/virupaksa-area.jpg',
  '紫賢金剛': '/assets/monsters/sumeru/virupaksa-area.jpg',
  '強力棍兵': '/assets/monsters/sumeru/virupaksa-area.jpg',
};
const slotLabels = EQUIPMENT_LABELS;
const FIRST_CARAVAN_QUEST_ID = "npc-first-caravan-delivery";
const FIRST_CARAVAN_TARGET = 3;
const mapFeatureIcons: Record<string, string> = { field: "🌾", lake: "🌊", sea: "⚓", forest: "🌲", ice: "❄️", desert: "☀️", sumeru: "⛰️", shambhala: "🏯" };

function currentTimestamp() {
  return Date.now();
}

export default function GameV15() {
  const [game, rawSetGame] = useState<GameState>(freshGame);
  const [activeTab, setActiveTab] = useState("map");
  const [quickDialog, setQuickDialog] = useState<"treasure" | "settings" | null>(null);
  const [squadDestination, setSquadDestination] = useState<{ key: number; window?: 'inventory' | 'territory' }>({ key: 0 });
  // 所有存檔與取得路徑共用格位整理：保留已有位置與超額舊物，不截斷陣列。
  const setGame=useCallback((action:GameState|((previous:GameState)=>GameState))=>rawSetGame(previous=>{
    const next=typeof action==='function'?action(previous):action;
    return next===previous?previous:applyGersangVisuals({...next,inventory:positionInventory(next.inventory)});
  }),[]);
  const [ready, setReady] = useState(false);
  const [loginEntered, setLoginEntered] = useState(false);
  const [profiles, setProfiles] = useState<Array<CharacterProfile | null>>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [creatorSlot, setCreatorSlot] = useState<number | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [characterGender, setCharacterGender] = useState<"male"|"female">("male");
  const [notice, setNotice] = useState("");
  const [returnReport, setReturnReport] = useState<{ minutes: number; gold: number; credit: number } | null>(null);
  const [selectedUid, setSelectedUid] = useState("hero");
  const [cityService, setCityService] = useState<CityService>("mercenary");
  const [medicineAmounts, setMedicineAmounts] = useState<Record<string, number>>({});
  const [gemSlot, setGemSlot] = useState<EquipmentSlot>('armor');
  const [gemAmount, setGemAmount] = useState(1);
  const [sharedWarehouse, setSharedWarehouse] = useState<Equipment[]>([]);
  const [activeNpcId, setActiveNpcId] = useState<NpcId | null>(null);
  const [npcOpeningLine, setNpcOpeningLine] = useState("");
  const warehouseWritable = useRef(true);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const savedProfiles = localStorage.getItem(PROFILE_INDEX);
      const savedWarehouse = localStorage.getItem(SHARED_WAREHOUSE_SAVE);
      let nextProfiles: Array<CharacterProfile | null> = parseStoredArray<CharacterProfile | null>(savedProfiles);
      nextProfiles = [0, 1, 2].map((slot) => {
        const profile = nextProfiles[slot];
        return profile && isNationId(profile.nation) ? { ...profile, slot } : null;
      });
      let nextWarehouse: Equipment[] = [];
      let warehouseError = false;
      try {
        nextWarehouse = parseStoredArray<Equipment>(savedWarehouse).map(normalizeStoredItem).map((item) => ({...item,image:gersangItemArt(itemKind(item.slot))}));
      } catch {
        warehouseError = true;
        warehouseWritable.current = preserveCorruptStorage(localStorage, SHARED_WAREHOUSE_SAVE, savedWarehouse);
      }
      queueMicrotask(() => {
        setProfiles(nextProfiles);
        setSharedWarehouse(nextWarehouse);
        if (warehouseError) setNotice(warehouseWritable.current ? "共用倉庫資料異常，原始資料已備份並重建空倉庫。" : "共用倉庫資料異常且無法備份，已停止寫入以保護原始資料。");
        setReady(true);
      });
    } catch {
      queueMicrotask(() => {
        setProfiles([null, null, null]);
        setNotice("角色欄位資料異常，請重新建立角色。");
        setReady(true);
      });
    }
  }, []);

  useEffect(() => {
    if (!ready || activeSlot === null) return;
    writeCharacterSave(localStorage, activeSlot, game);
    const nextProfiles = [...profiles];
    nextProfiles[activeSlot] = profileFromGame(activeSlot, game);
    writeProfileIndex(localStorage, nextProfiles);
  }, [activeSlot, game, profiles, ready]);

  useEffect(() => {
    if (!ready) return;
    if (warehouseWritable.current) writeSharedWarehouse(localStorage, sharedWarehouse);
  }, [ready, sharedWarehouse]);

  function enterCharacter(slot: number) {
    const profile = profiles[slot];
    if (!profile) return;
    try {
      const raw = readCharacterSave(localStorage, slot);
      if (raw) backupBeforeGuildMigration(localStorage, profileSaveKey(slot), raw);
      if (raw) backupBeforeEquipmentMigration(localStorage, profileSaveKey(slot), raw);
      let next = raw ? restoreGame(JSON.parse(raw)) : freshGame(profile.name, profile.gender === 'female' ? 'female' : 'male');
      const now = currentTimestamp();
      const before = next.gold;
      const beforeCredit = next.credit;
      const awayMinutes = Math.max(0, Math.floor((now - next.lastSeen) / 60000));
      next = settleCurrentGame(next, { now, roll: .99, choice: 0, spawnRoll: 0, encounterCountRoll: createGameTickRolls().encounterCountRoll, retaliationRoll: 0, materialRolls: [1, 1, 1] });
      setReturnReport(awayMinutes >= 1 ? { minutes: awayMinutes, gold: next.gold - before, credit: next.credit - beforeCredit } : null);
      next.lastSeen = now;
      writeCharacterSave(localStorage, slot, next);
      setGame(next);
      setSelectedUid("hero");
      setCityService("mercenary");
      setActiveTab("map");
      setActiveSlot(slot);
    } catch {
      setNotice("此角色存檔讀取失敗。");
    }
  }

  function createCharacter() {
    if (creatorSlot === null) return;
    const name = characterName.trim().slice(0, 12);
    if (!name) {
      setNotice("請輸入角色名稱。");
      return;
    }
    const next = freshGame(name, characterGender);
    const nextProfiles = [...profiles];
    nextProfiles[creatorSlot] = profileFromGame(creatorSlot, next);
    localStorage.setItem(profileSaveKey(creatorSlot), JSON.stringify(next));
    localStorage.setItem(PROFILE_INDEX, JSON.stringify(nextProfiles));
    setProfiles(nextProfiles);
    setGame(next);
    setCityService("mercenary");
    setSelectedUid("hero");
    setActiveTab("map");
    setActiveSlot(creatorSlot);
    setCreatorSlot(null);
    setCharacterName("");
    setNotice("角色「" + name + "」建立完成。");
  }

  function returnToCharacterSelect() {
    if (activeSlot === null) return;
    const nextProfiles = saveCharacterProfile(localStorage, profiles, activeSlot, game, profileFromGame(activeSlot, game));
    setProfiles(nextProfiles);
    setActiveSlot(null);
    setReturnReport(null);
    setCreatorSlot(null);
    setNotice("");
  }

  const selected: Unit | Hero =
    selectedUid === "hero"
      ? game.hero
      : game.mercs.find((unit) => unit.uid === selectedUid) || game.hero;
  const activeUnits = game.active
    .map((unitUid) => game.mercs.find((unit) => unit.uid === unitUid))
    .filter(Boolean) as Unit[];
  const equippedMythicNames = [game.hero, ...activeUnits].flatMap((unit) => Object.values(unit.equip).filter((item): item is Equipment => !!item).map(item => item.name));
  const azureSetPieces = mythicSetPieceCount(equippedMythicNames,'azure');
  const chiyouSetPieces = mythicSetPieceCount(equippedMythicNames,'chiyou');
  const amaterasuSetPieces = mythicSetPieceCount(equippedMythicNames,'amaterasu');
  const currentMap = battleMaps.find((map) => map.id === game.battleMap) || battleMaps[0];
  const currentWorldZone=WORLD_ZONES.find(zone=>zone.id===(game.dungeon?.zone||'hanyang'))||WORLD_ZONES[0];
  const currentCity = worldCities.find((city) => city.id === game.city) || worldCities[0];
  const heroVital=vitalStats(game.hero);
  const heroXpNeeded=xpNeed(game.hero.level);
  const quickHealCost=Math.max(0,heroVital.maxHp-heroVital.hp)*2;
  const currentNation = nations.find((nation) => nation.id === currentCity.nation) || nations[0];
  const displayCityName = currentCity.id === "hanyang" ? STARTER_VILLAGE_NAME : currentCity.name;
  const mapLocationLabel = currentCity.id === "hanyang" ? "新村村郊" : displayCityName;
  const trackedNpcQuests = activeNpcQuests(game);
  const firstCaravanBossReady = game.npcProgress.completedQuests.includes(FIRST_CARAVAN_QUEST_ID) && game.hero.level >= 20 && game.territory.buildings.waystation >= 1 && (game.firstGreenEquipped || [game.hero, ...game.mercs, ...game.restingMercs].some(unit => Object.values(unit.equip).some(item => item && item.rarity !== '普通')));
  const cityArmors = officialEquipment.filter((item) => item.kind === "armor").filter((_, index) => index % 5 === currentCity.stockIndex).slice(0, 8);
  const cityWeapons = officialEquipment.filter((item) => item.kind === "weapon").filter((_, index) => index % 5 === currentCity.stockIndex).slice(0, 8);
  const musicScene:SceneMusicKind=activeTab==='battle'?'boss':game.hero.status==='客棧中'||(activeTab==='city'&&cityService==='inn')?'inn':activeTab==='city'||activeTab==='trade'?'merchant':'outskirts';
  const mapGate = (map: typeof battleMaps[number]) => {
    const stageReady = game.stage >= map.unlockStage;
    const bossReady = map.id !== 'millennium-lake' || game.newbieBossDefeated;
    const lakeReady = map.id !== 'japan-sea' || game.lakeBossDefeated;
    const seaReady = map.id !== 'miasma-forest' || game.goldenStarfishDefeated;
    const unlocked = stageReady && bossReady && lakeReady && seaReady;
    const requirement = !stageReady ? `關卡進度 ${game.stage} / ${map.unlockStage}`
      : !bossReady ? '擊敗海賊王'
      : !lakeReady ? '擊敗狂風阿魯塔'
      : !seaReady ? '擊敗黃金海星'
      : '已開放';
    return { unlocked, requirement };
  };
  const mainObjective = (() => {
    if (game.hero.status === '客棧中') return { title: '恢復商隊戰力', detail: `生命 ${heroVital.hp} / ${heroVital.maxHp}，療傷完成後可再度出發。`, tab: 'city' };
    const firstDeliveryCompleted = game.npcProgress.completedQuests.includes(FIRST_CARAVAN_QUEST_ID);
    const firstDeliveryActive = game.npcProgress.activeQuests.includes(FIRST_CARAVAN_QUEST_ID);
    if (!firstDeliveryCompleted) {
      if (!firstDeliveryActive) return { title: '在漢陽接下第一份商隊委託', detail: '向新手村村長金成浩接下送貨委託，清出通往港口的驛路。', tab: 'map', npcId: 'kim-seongho' as NpcId };
      if (game.starterDeliveryKills < FIRST_CARAVAN_TARGET) return { title: '清出送貨驛路', detail: `擊敗新手村郊外的狸貓 ${Math.min(game.starterDeliveryKills, FIRST_CARAVAN_TARGET)} / ${FIRST_CARAVAN_TARGET}。只計算委託期間的指定怪物。`, tab: 'battle', mapId: 'starter-outskirts', monsterName: '狸貓' };
      return { title: '回漢陽交付第一份商隊委託', detail: '貨物已能安全送達港口；向金成浩回報，領取白裝短劍與啟程資金。', tab: 'map', npcId: 'kim-seongho' as NpcId };
    }
    const starterWeaponObjective = getStarterWeaponObjective(game);
    if (starterWeaponObjective) return starterWeaponObjective;
    const firstMercenaryObjective = getFirstMercenaryObjective({
      level: game.hero.level,
      mercenaryCount: game.mercs.length + game.restingMercs.length,
      gold: game.gold,
      recruitmentCost: Math.floor(6000 * currentCity.priceFactor),
    });
    if (firstMercenaryObjective) return firstMercenaryObjective;
    if (game.hero.level < 20) return { title: '壯大商隊，建立第一座駐地', detail: `主角 Lv.${game.hero.level} / Lv.20，商團領地即將開放。`, tab: 'battle' };
    if (game.territory.buildings.waystation < 1) return { title: '建立驛站，提升放置收益', detail: `資金 ${Math.floor(game.gold).toLocaleString('zh-TW')} / 1,200 兩；建成後放置收益 +2%。`, tab: 'squad', window: 'territory' as const };
    const equippedGreen = game.firstGreenEquipped || [game.hero, ...game.mercs, ...game.restingMercs].some(unit => Object.values(unit.equip).some(item => item && item.rarity !== '普通'));
    if (!equippedGreen) {
      const green = game.inventory.find(item => item.rarity !== '普通' && (item.requiredLevel || 1) <= game.hero.level);
      if (green) return { title: `裝上「${green.name}」，感受成長`, detail: '打開背包穿戴裝備，查看實際能力提升。', tab: 'squad', window: 'inventory' as const };
      const groups = new globalThis.Map<string, Equipment[]>();
      for (const item of game.inventory) if (isFusionIngredient(item, '普通') && (item.requiredLevel || 1) <= game.hero.level) {
        const key = fusionItemKey(item); groups.set(key, [...(groups.get(key) || []), item]);
      }
      const group = [...groups.values()].sort((a, b) => b.length - a.length)[0];
      const count = Math.min(5, group?.length || 0);
      return { title: count === 5 ? '合成第一件綠裝' : '收集同名白裝，準備第一次合成', detail: `${group?.[0].name || '同名同部位白裝'} ${count} / 5；${count === 5 ? '材料齊全，白→綠成功率 100%。' : `還差 ${5 - count} 件。只計算背包內未強化、未鑲嵌的裝備。`}`, tab: 'squad', window: 'territory' as const };
    }
    if (!game.newbieBossDefeated) return { title: '討伐海賊王，開通千年湖', detail: '第一輪成長已完成；挑戰新手村郊外的海賊王，突破下一段商路。', tab: 'battle', mapId: 'starter-outskirts', monsterName: '海賊王' };
    if (!game.lakeBossDefeated) return { title: '前往千年湖，追擊狂風阿魯塔', detail: '千年湖已開通；擊敗首領後可前往日本海底洞。', tab: 'battle' };
    if (!game.goldenStarfishDefeated) return { title: '討伐黃金海星，開通白虎林', detail: '挑戰日本海底洞，取得前往白虎林的資格。', tab: 'battle' };
    return { title: '持續壯大商隊', detail: '提高等級、強化隊伍，朝下一個地圖與傳說裝備前進。', tab: 'battle' };
  })();
  function goToObjective() {
    if ('npcId' in mainObjective && mainObjective.npcId) {
      setActiveTab('map');
      openNpcDialogue(mainObjective.npcId);
      return;
    }
    if ('mapId' in mainObjective && mainObjective.mapId && 'monsterName' in mainObjective && mainObjective.monsterName) {
      const objectiveMapId = mainObjective.mapId;
      const objectiveMonsterName = mainObjective.monsterName;
      setGame(previous => {
        const moved = selectBattleMapAction(previous, objectiveMapId, { notify: setNotice, enemyMax, addLog });
        const target = sourceEnemies.find(enemy => enemy.mapId === objectiveMapId && enemy.name === objectiveMonsterName);
        const key = target?.dungeonId;
        if (!target || !key) return moved;
        return { ...moved, selectedMonster: target.name, enemyHp: target.hp || moved.enemyHp, dungeon: { ...freshDungeon(), key, lockedEnemyKey: key, enemyHp: DUNGEONS[key].hp }, logs: addLog(moved.logs, `主線目標已指向：${target.name}。`) };
      });
      setActiveTab('battle');
      return;
    }
    if (mainObjective.tab === 'city') setCityService('service' in mainObjective ? mainObjective.service : 'inn');
    if (mainObjective.tab === 'squad') setSquadDestination(previous => ({ key: previous.key + 1, window: mainObjective.window }));
    setActiveTab(mainObjective.tab);
  }


  function selectBattleMap(mapId: string) {
    setGame((previous) => selectBattleMapAction(previous, mapId, { notify: setNotice, enemyMax, addLog }));
  }

  useEffect(() => {
    if (!ready || activeSlot === null) return;
    const timer = window.setInterval(() => {
      // 在 React 更新函式外抽樣，同一次回合重跑不會改變掉寶結果。
      const rolls = createGameTickRolls();
      setGame(previous=>applyAutoMedicineAction(settleCurrentGame(previous,rolls),rolls.now,addLog,grantXp));
    }, 50);
    return () => window.clearInterval(timer);
  }, [ready, activeSlot, setGame]);

  const sendCaravan = useCallback((routeId: string) => {
    const now = Date.now();
    setGame((previous) => dispatchTradeAction(previous, routeId, now, addLog));
  }, [setGame]);

  function upgradeCaravan() {
    setGame((previous) => upgradeCaravanAction(previous, addLog));
  }

  useEffect(() => {
    if (!ready || activeSlot === null) return;
    type ModelContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: object; execute: (input: unknown) => unknown }, options: { signal: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "dispatch_trade_route", title: "派遣商隊", description: "送出商隊派遣請求。系統會依資金與解鎖條件執行，結果顯示於商團記事。",
      inputSchema: { type: "object", properties: { routeId: { type: "string", enum: TRADE_ROUTES.map((route) => route.id) } }, required: ["routeId"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const routeId = input && typeof input === "object" && "routeId" in input ? input.routeId : null;
        if (typeof routeId !== "string" || !TRADE_ROUTES.some((route) => route.id === routeId)) throw new Error("商路代號無效。");
        sendCaravan(routeId);
        return { status: "requested", routeId, resultLocation: "商團記事" };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [ready, activeSlot, sendCaravan]);


  function recruitMerchant(spec: MercenarySpec, index: number) {
    const cost = Math.floor(6000 * currentCity.priceFactor);
    setGame(previous => recruitMerchantAction(previous, spec, index, cost, (entry, portraitIndex) => normalizeVitals<Unit>({ uid: uid('merchant-'+entry.id), templateId: 'merchant-'+entry.id, nation: 'legacy', tier: 1, jobClass: entry.name, special: entry.id==='mazu', name: entry.name, role: entry.role, skill: entry.active, image: mercenaryPortrait(entry.id,portraitIndex), level: 1, xp: 0, points: 0, str: entry.ratings[1], agi: entry.ratings[3], vit: entry.ratings[0], intel: entry.intel ?? (entry.mp ? 20 : 10), position:normalizeBattlePosition(undefined,entry.name,entry.role), equip: emptyEquipment() }), addLog));
  }

  function toggleActive(unitUid: string) {
    setGame((previous) => toggleActiveAction(previous, unitUid, setNotice));
  }

  function storeMercenary(unitUid: string) {
    setGame(previous => storeMercenaryAction(previous, unitUid, addLog));
  }

  function withdrawRestingMercenary(unitUid: string) {
    setGame(previous => withdrawMercenaryAction(previous, unitUid, addLog));
  }


  function addStat(stat: "str" | "agi" | "intel" | "vit", amount = 1) {
    setGame(previous => allocateAttributeAction(previous, selectedUid, stat, amount));
  }

  function equipItem(itemUid: string, requestedSlot?: EquipmentSlot, targetUid=selectedUid) {
    const preview = equipInventoryItemAction(game, itemUid, requestedSlot, targetUid, addLog);
    const before = targetUid === 'hero' ? game.hero : game.mercs.find(unit => unit.uid === targetUid);
    const after = targetUid === 'hero' ? preview.hero : preview.mercs.find(unit => unit.uid === targetUid);
    if (before && after && before !== after) {
      const powerGain = unitPower(after) - unitPower(before);
      const beforeCombat = combatStats(before), afterCombat = combatStats(after);
      const attackGain = afterCombat.attack - beforeCombat.attack;
      const defenseGain = afterCombat.defense - beforeCombat.defense;
      const changes = [attackGain && `攻擊 ${attackGain > 0 ? '+' : ''}${format(attackGain)}`, defenseGain && `防禦 ${defenseGain > 0 ? '+' : ''}${format(defenseGain)}`, powerGain && `戰力 ${powerGain > 0 ? '+' : ''}${format(powerGain)}`].filter(Boolean);
      if (changes.length) setNotice(`裝備生效：${changes.join('・')}`);
    }
    setGame(previous => equipInventoryItemAction(previous, itemUid, requestedSlot, targetUid, addLog));
  }

  function cycleUnitPosition(unitUid:string){
    setGame(previous => cyclePositionAction(previous, unitUid, addLog));
  }

  function sellLoot(itemName:string){
    setGame(previous => sellMaterialAction(previous, itemName, addLog, format));
  }

  function sellEveryLoot(){
    setGame(previous => sellAllMaterialsAction(previous, addLog, format));
  }

  function buyLootMaterial(itemName:string){
    setGame(previous => buyMaterialAction(previous, itemName, addLog, format));
  }

  function buyExchangeUpgrade(id:VillageWeaponId){
    setGame(previous => forgeVillageWeaponAction(previous, id, addLog));
  }

  function sellInventoryEquipment(itemUid:string){
    setGame(previous => sellInventoryEquipmentAction(previous, itemUid, addLog, format));
  }


  function simulateHeroLoot() {
    if(dungeonBusy(game.dungeon)){setNotice('副本或療傷期間暫停此操作，請先完成療傷。');return;}
    setGame(previous=>{
      return {...previous,hero:grantTerritoryXp(previous, previous.hero, 10),logs:addLog(previous.logs,'模擬打怪：主角獲得 10 經驗（含領地加成）。')};
    });
  }

  function sellEveryInventoryEquipment(){
    setGame(previous => sellAllInventoryEquipmentAction(previous, addLog, format));
  }

  function unequipItem(slot:EquipmentSlot,targetUid=selectedUid) {
    setGame(previous => unequipInventoryItemAction(previous, slot, targetUid, addLog));
  }

  function buyWearable(base:WearableBase) {
    const price=Math.floor(base.price*currentCity.priceFactor);
    setGame(previous=>{
      const baseItem:Equipment={...base,uid:uid(base.id),enhance:0,rarity:'普通',magic:[],requiredLevel:1,bonus:{str:0,agi:0,intel:0,vit:0},resist:{physical:0,magic:0}};
      const item=applyShopQuality(baseItem);
      return purchaseEquipmentAction(previous,item,price,'購入「'+item.name+'」・品質倍率 x'+SHOP_QUALITY[item.rarity].multiplier+'。',addLog,setNotice);
    });
  }

  function buyMagicEquipment() {
    const cost = 12000;
    setGame((previous) => {
      const item = applyShopQuality(rollEquipment(previous.stage, true));
      return purchaseEquipmentAction(previous,item,cost,"購入附魔裝備「"+item.name+"」・品質倍率 x"+SHOP_QUALITY[item.rarity].multiplier+"。",addLog,setNotice);
    });
  }

  function buyOfficialItem(record: OfficialEquipment, price = record.price) {
    setGame((previous) => {
      const item = makeOfficialEquipment(record);
      return purchaseEquipmentAction(previous,item,price,"從"+currentCity.name+(record.kind === "weapon" ? "武器商店" : "防具商店")+"購入「"+item.name+"」・品質倍率 x"+SHOP_QUALITY[item.rarity].multiplier+"。",addLog,setNotice);
    });
  }

  function travelToCity(cityId: string) {
    setGame(previous => travelCityAction(previous, cityId, addLog, format, setNotice));
    setCityService("mercenary");
  }

  function depositToWarehouse(itemUid: string) {
    const result = depositWarehouseItemAction(game, sharedWarehouse, itemUid, warehouseLimit(game.territory), addLog);
    if (result.error) { setNotice(result.error); return; }
    if (result.game === game) return;
    setGame(result.game);
    setSharedWarehouse(result.warehouse);
  }

  function withdrawFromWarehouse(itemUid: string) {
    const result = withdrawWarehouseItemAction(game, sharedWarehouse, itemUid, addLog);
    if (result.game === game) return;
    setGame(result.game);
    setSharedWarehouse(result.warehouse);
  }

  function recruitGeneral(general: MercenaryDef) {
    setGame(previous => recruitGeneralAction(previous, general, entry => normalizeVitals<Unit>({ uid: uid('general-'+entry.id), templateId: 'general-'+entry.id, nation: 'legacy', tier: 1, jobClass: entry.job, special: false, name: entry.name, role: entry.job, skill: entry.skill, image: entry.idle, level: 1, xp: 0, points: 0, str: entry.str, agi: entry.agi, vit: entry.vit, intel: entry.intel, position: normalizeBattlePosition(undefined, entry.name, entry.job), equip: emptyEquipment() }), addLog));
  }

  function buyTierEquipment(spec: TierEquipment) {
    const itemUid = uid(spec.id);
    setGame(previous => purchaseTierEquipmentAction(previous, spec.id, currentCity.priceFactor, currentCity.name, itemUid, addLog, setNotice));
  }

  function upgradeTerritoryBuilding(id: BuildingId) {
    setGame(previous => { const result = upgradeBuilding(previous, id); if (result.error) setNotice(result.error); else if (id === 'waystation' && previous.territory.buildings.waystation === 0) setNotice('驛站建成！放置金錢與信用收益 +2%。下一步：準備第一件綠裝。'); return result.game; });
  }

  function enhanceTerritoryEquipment(itemUid: string) {
    const roll = Math.random();
    setGame(previous => { const result = enhanceEquipment(previous, itemUid, roll); if (result.error) setNotice(result.error); return result.game; });
  }
  function fuseAllTerritoryEquipment(sourceRarity: FusionSourceRarity) {
    setGame(previous => {
      const next = fuseAllInventoryEquipmentAction(previous, sourceRarity, Math.random, addLog, setNotice);
      const result = next.inventory.find(item => !previous.inventory.some(old => old.uid === item.uid));
      const base = result && previous.inventory.find(item => fusionItemKey(item) === fusionItemKey(result));
      if (sourceRarity === '普通' && result && base) setNotice(`白→綠合成成功：${result.name}｜基礎攻擊 ${base.atk} → ${result.atk}・防禦 ${base.def} → ${result.def}・生命 ${base.hp} → ${result.hp}。前往背包穿戴。`);
      return next;
    });
  }

  function restAtInn() {
    // 戰敗療傷中再次點擊客棧，直接走付費快速治療；不再被 dungeonBusy 擋住。
    if(game.hero.status==='客棧中'||game.dungeon?.status==='recovering'){setGame(payGameInn);return;}
    setGame(previous => restAtInnAction(previous, currentCity.priceFactor, currentCity.name, addLog, grantXp, setNotice));
  }

  function buyMedicine(medicineId: string, requestedAmount = 1) {
    setGame(previous => buyMedicineAction(previous, medicineId, requestedAmount, currentCity.priceFactor, currentCity.name, addLog, setNotice));
  }

  function openAncientCoinBox(amount=1){
    const requested=Math.max(1,Math.floor(amount));
    const rolls=Array.from({length:requested},()=>{
      const rareRoll=Math.random();
      return {coins:1+Math.floor(Math.random()*10),fusionCores:Math.random()<0.05?1:0,rareReward:rareRoll<0.0001?'大吉(帥)':rareRoll<0.0002?'大吉(好)':rareRoll<0.0003?'大吉(者)':rareRoll<0.0004?'大吉(作)':null};
    });
    setGame(previous => openAncientCoinBoxAction(previous, requested, rolls, addLog));
  }

  function consumeMedicine(medicineId: string) {
    setGame(previous => {
      const next=consumeMedicineAction(previous,medicineId,false,addLog,grantXp);
      if(next===previous){const medicine=medicineCatalog.find(entry=>entry.id===medicineId);if(medicine)setNotice("目前沒有「" + medicine.name + "」。");}
      return next;
    });
  }

  function socketGem(gemId: string, grade: number, requestedAmount = 1) {
    setGame(previous => socketGemAction(previous, selectedUid, gemSlot, gemId, grade, requestedAmount, addLog, setNotice));
  }

  function claimContract(contractId: string) {
    setGame(previous => claimContractAction(previous, gameplayContracts, contractId, addLog, setNotice));
  }

  if (!ready) return <div className="game-loading">正在整理四國角色欄位…</div>;

  if (!loginEntered) {
    return <main className="login-splash-screen">
      <button type="button" className="login-splash-enter" onClick={() => { setActiveSlot(null); setCreatorSlot(null); setLoginEntered(true); }} aria-label="進入角色選擇">
        <img src="/game-assets/login-splash.jpg" alt="巨商角色群像" />
        <span>點擊畫面進入</span>
      </button>
    </main>;
  }

  if (activeSlot === null) {
    return (
      <main className="character-select-screen">
        <section className="character-select-shell">
          <div className="character-select-heading">
            <div className="brand-seal">商</div>
            <div><small>放置 RPG × 東方商路</small><h1>放置你的巨商魂</h1></div>
          </div>
          {notice && <button className="notice" onClick={() => setNotice("")}><Sparkles />{notice}<span>點擊關閉</span></button>}
          <div className="character-slot-grid">
            {[0, 1, 2].map((slot) => {
              const profile = profiles[slot];
              return profile ? (
                <article className="character-slot occupied" key={slot} style={{ "--nation-color": '#b78a4e' } as React.CSSProperties}>
                  <span className="slot-number">角色欄位 {slot + 1}</span>
                  <img src={heroPortrait(STARTER_NATION, profile.gender)} alt={profile.name} />
                  <div><small>新手村商隊・{profile.gender === 'female' ? '女性主角' : '男性主角'}</small><h2>{profile.name}</h2><p>Lv.{profile.level}・世界地圖進度</p><em>出生地・{STARTER_VILLAGE_NAME}</em></div>
                  <Button onClick={() => enterCharacter(slot)}><Play />進入遊戲</Button>
                </article>
              ) : (
                <article className="character-slot empty" key={slot}>
                  <span className="slot-number">角色欄位 {slot + 1}</span>
                  <div className="empty-slot-mark"><Crown /></div>
                  <div><h2>尚未建立角色</h2><p>從新手村出發，建立新的商團主角。</p></div>
                  <Button variant="outline" onClick={() => { setCreatorSlot(slot); setCharacterName(""); setCharacterGender("male"); }}>建立角色</Button>
                </article>
              );
            })}
          </div>

          {creatorSlot !== null && (
            <section className="character-creator">
              <div className="panel-title"><Crown /><h2>建立角色・欄位 {creatorSlot + 1}</h2><span>出生地・{STARTER_VILLAGE_NAME}</span></div>
              <label className="character-name-field"><span>角色名稱</span><input maxLength={12} value={characterName} onChange={(event) => setCharacterName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createCharacter(); }} placeholder="輸入 1～12 個字" /></label>
              <div className="creator-genders" aria-label="選擇性別"><Button type="button" variant={characterGender === "male" ? "default" : "outline"} onClick={() => setCharacterGender("male")}>男性主角</Button><Button type="button" variant={characterGender === "female" ? "default" : "outline"} onClick={() => setCharacterGender("female")}>女性主角</Button></div>
              <div className="creator-origin"><img src={heroPortrait(STARTER_NATION, characterGender)} alt="" /><span><strong>{STARTER_VILLAGE_NAME}</strong><small>第一份商隊委託，從清出港口驛路開始。</small></span></div>
              <div className="creator-actions"><Button variant="outline" onClick={() => setCreatorSlot(null)}>取消</Button><Button onClick={createCharacter}><Sparkles />建立並開始</Button></div>
            </section>
          )}
        </section>
      </main>
    );
  }

  function forgeThunderSet(id: ThunderForgeId) {
    setGame(previous => forgeThunderItemAction(previous, id, uid, gersangItemArt, addLog, setNotice));
  }

  function handleNpcAction({ option, npc }: { option: NpcOption; npc: NonNullable<ReturnType<typeof npcById>> }) {
    setGame(previous => {
      let next = recordNpcLine(previous, npc.id, `${npc.name}：${option.reply}`);
      next = awardNpcAffinity(next, npc, option);
      if (option.quest === "start") {
        next = startNpcQuest(next, npc);
        if (next !== previous) next = { ...next, logs: addLog(next.logs, `接受村莊委託「${npc.quest?.name || ""}」。`) };
      }
      if (option.quest === "complete") {
        const beforeGold = next.gold;
        next = completeNpcQuest(next, npc);
        if (next.gold !== beforeGold) {
          let rewardLog = `完成村莊委託「${npc.quest?.name || ""}」，獲得 ${format(next.gold - beforeGold)} 兩。`;
          if (npc.quest?.id === FIRST_CARAVAN_QUEST_ID) {
            const whiteSword: Equipment = { uid: uid('first-caravan-sword'), name: '商路短劍', slot: 'weapon', atk: 18, def: 0, hp: 0, image: gersangItemArt('weapon'), enhance: 0, rarity: '普通', magic: [], bonus: { str: 0, agi: 0, intel: 0, vit: 0 }, resist: { physical: 0, magic: 0 }, requiredLevel: 1, source: '第一份商隊委託' };
            const pickup = addInventoryItem(next.inventory, whiteSword);
            next = { ...next, inventory: pickup.inventory };
            rewardLog += pickup.error ? '背包已滿，白裝短劍暫無法收下。' : '獲得白裝「商路短劍」。';
          }
          next = { ...next, logs: addLog(next.logs, rewardLog) };
        }
      }
      return next;
    });
    if (option.service) { setCityService(option.service); setActiveTab("city"); setActiveNpcId(null); }
    if (option.openContracts) { setActiveTab("contracts"); setActiveNpcId(null); }
    if (npc.id === "lee-taesan" && option.label === "前往世界地圖") { setActiveTab("battle"); setActiveNpcId(null); }
  }

  function openNpcDialogue(npcId: NpcId) {
    const npc = npcById(npcId);
    if (!npc) return;
    const greeting = npcGreeting(game, npc);
    setNpcOpeningLine(greeting);
    setGame(previous => recordNpcLine(previous, npc.id, `${npc.name}：${greeting}`));
    setActiveNpcId(npcId);
  }

  function redeemWandererSet(set: Extract<MythicSet,'azure'|'chiyou'|'amaterasu'>) {
    const pieces=Object.values(THUNDER_FORGE_ITEMS).filter(recipe=>recipe.set===set);
    const setName={azure:'青龍',chiyou:'蚩尤',amaterasu:'天照'}[set];
    setGame(previous=>{
      if(previous.newbieCoins<1000){setNotice('新手兌換銅錢不足，需要 1,000 枚。');return previous;}
      let inventory=previous.inventory;
      for(const recipe of pieces){
        const item:Equipment={uid:`wanderer-${recipe.id}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:recipe.name,slot:recipe.slot,atk:recipe.atk,def:recipe.def,hp:recipe.hp,image:recipe.image||gersangItemArt(recipe.slot),enhance:0,rarity:'傳說',magic:recipe.magic.map(affix=>({...affix})),bonus:{...recipe.bonus},skill:recipe.skill,requiredLevel:1,source:'平行世界流浪商團'};
        inventory=addInventoryItem(inventory,item).inventory;
      }
      setNotice(`已兌換完整 T10 ${setName}套裝。`);
      return {...previous,newbieCoins:previous.newbieCoins-1000,inventory,logs:addLog(previous.logs,`平行世界流浪商團：兌換完整「T10 ${setName}套裝」。`)};
    });
  }

  return (
    <main className="game-shell v15-shell classic-live-game">
      <header className="topbar">
        <div className="brand">
          <div className="brand-seal">合</div>
          <div><h1>放置你的巨商魂</h1><p>雷霆祭壇與等級曲線</p></div>
        </div>
        <div className="resource-strip v15-resources">
          <div><Coins /><span>{format(game.gold)}</span><small>兩</small></div>
          <div className="newbie-coin"><Coins /><span>{format(game.newbieCoins)}</span><small>新手兌換銅錢</small></div>
          <div className={game.hero.status==='客棧中'?'hp-status at-inn':'hp-status'}><HeartPulse /><span id="p-hp">{heroVital.hp} / {heroVital.maxHp}</span><small>血量 · {game.hero.status}</small></div>
          <div><Swords /><span>{format(unitPower(game.hero)+game.mercs.reduce((sum,unit)=>sum+unitPower(unit),0))}</span><small>總商隊戰力</small></div>
          <div><Users /><span>{game.active.length}/{ACTIVE_MERCENARY_LIMIT}</span><small>出戰傭兵</small></div>
          <Button className="character-switch" variant="outline" size="sm" onClick={returnToCharacterSelect}><Users />切換角色</Button>
        </div>
      </header>

      <nav className="classic-live-quicknav" aria-label="遊戲功能">
        <button type="button" className={activeTab === "raid" ? "active" : ""} aria-current={activeTab === "raid" ? "page" : undefined} onClick={() => setActiveTab("raid")}><span className="quick-nav-icon"><Crown aria-hidden="true" /></span><span className="quick-nav-label">雷霞祭壇</span></button>
        <button type="button" className={activeTab === "city" ? "active" : ""} aria-current={activeTab === "city" ? "page" : undefined} onClick={() => { setCityService("weapon"); setActiveTab("city"); }}><span className="quick-nav-icon"><ShoppingBag aria-hidden="true" /></span><span className="quick-nav-label">市集</span></button>
        <button type="button" className={activeTab === "trade" ? "active" : ""} aria-current={activeTab === "trade" ? "page" : undefined} onClick={() => setActiveTab("trade")}><span className="quick-nav-icon"><Ship aria-hidden="true" /></span><span className="quick-nav-label">港口</span></button>
        <button type="button" className={activeTab === "map" ? "active" : ""} aria-current={activeTab === "map" ? "page" : undefined} onClick={() => setActiveTab("map")}><span className="quick-nav-icon"><Castle aria-hidden="true" /></span><span className="quick-nav-label">城門</span></button>
        <button type="button" className={activeTab === "battle" ? "active" : ""} aria-current={activeTab === "battle" ? "page" : undefined} onClick={() => setActiveTab("battle")}><span className="quick-nav-icon"><Map aria-hidden="true" /></span><span className="quick-nav-label">世界地圖</span></button>
        <button type="button" className={activeTab === "squad" ? "active" : ""} aria-current={activeTab === "squad" ? "page" : undefined} onClick={() => setActiveTab("squad")}><span className="quick-nav-icon"><Users aria-hidden="true" /></span><span className="quick-nav-label">主角與隊伍</span></button>
        <button type="button" className={activeTab === "archive" ? "active" : ""} aria-current={activeTab === "archive" ? "page" : undefined} onClick={() => setActiveTab("archive")}><span className="quick-nav-icon"><BookOpen aria-hidden="true" /></span><span className="quick-nav-label">裝備圖鑑</span></button>
        <button type="button" className={activeTab === "contracts" ? "active" : ""} aria-current={activeTab === "contracts" ? "page" : undefined} onClick={() => setActiveTab("contracts")}><span className="quick-nav-icon"><ScrollText aria-hidden="true" /></span><span className="quick-nav-label">冒險委託</span></button>
        <button type="button" onClick={() => setQuickDialog("treasure")}><span className="quick-nav-icon"><Gem aria-hidden="true" /></span><span className="quick-nav-label">秘寶圖鑑</span></button>
        <button type="button" aria-pressed={quickDialog === "settings"} onClick={() => setQuickDialog("settings")}><span className="quick-nav-icon"><Settings aria-hidden="true" /></span><span className="quick-nav-label">設定</span></button>
      </nav>

      {notice && <button className="notice" onClick={() => setNotice("")}><Sparkles />{notice}<span>點擊關閉</span></button>}
      <SceneMusic scene={musicScene}/>
      <Dialog open={quickDialog !== null} onOpenChange={open => { if (!open) setQuickDialog(null); }}>
        <DialogContent className="quick-menu-dialog">
          <DialogTitle>{quickDialog === "settings" ? "行旅設定" : "秘寶圖鑑"}</DialogTitle>
          <DialogDescription>{quickDialog === "settings" ? "調整商隊自動技能；遊戲進度會自動保存在此瀏覽器。" : "查看已收集的材料與商隊珍藏。"}</DialogDescription>
          {quickDialog === "settings" ? <div className="quick-setting-row"><span><strong>滿 MP 自動施放技能</strong><small>每名出戰角色集滿魔力後自動施放。</small></span><button type="button" role="switch" aria-checked={game.autoSkill} className={game.autoSkill ? "enabled" : ""} onClick={() => setGame(previous => ({ ...previous, autoSkill: !previous.autoSkill, logs: addLog(previous.logs, previous.autoSkill ? "已關閉技能自動施放。" : "已開啟技能自動施放。") }))}>{game.autoSkill ? "開啟" : "關閉"}</button></div> : <div className="treasure-codex-list"><article className="treasure-entry"><span className="treasure-entry-icon"><Coins aria-hidden="true" /></span><span><strong>新手兌換銅錢</strong><small>特殊貨幣</small></span><b>×{format(game.newbieCoins)}</b></article>{Object.keys(MATERIAL_PRICES).sort((a,b)=>a.localeCompare(b,"zh-TW")).map(name => <article className="treasure-entry" key={name}><span className="treasure-entry-icon"><Gem aria-hidden="true" /></span><span><strong>{name}</strong><small>{game.materials[name] ? "已收集" : "尚未取得"}</small></span><b>×{format(game.materials[name] || 0)}</b></article>)}</div>}
        </DialogContent>
      </Dialog>
      <Dialog open={returnReport !== null} onOpenChange={open => { if (!open) setReturnReport(null); }}>
        <DialogContent className="caravan-return-report" showCloseButton={false}>
          <span className="return-report-seal" aria-hidden="true">商</span>
          <DialogTitle>商隊帶著收穫回來了</DialogTitle>
          <DialogDescription>你離開了 {Math.floor((returnReport?.minutes || 0) / 60)} 小時 {(returnReport?.minutes || 0) % 60} 分鐘</DialogDescription>
          <dl className="return-report-rewards">
            <div><dt>金錢淨變動</dt><dd>{(returnReport?.gold || 0) >= 0 ? '+' : ''}{(returnReport?.gold || 0).toLocaleString('zh-TW')} <small>兩</small></dd></div>
            <div><dt>信用增加</dt><dd>+{(returnReport?.credit || 0).toLocaleString('zh-TW')}</dd></div>
          </dl>
          <p>收益已自動入帳，放置累積上限為 8 小時。{(returnReport?.minutes || 0) > 480 ? '本次離開時間已超過累積上限。' : ''}</p>
          {returnReport?.gold === 0 && returnReport.credit === 0 && <p>本次沒有新增收益；戰敗療傷期間不累積放置收益。</p>}
          <div className="return-report-next"><small>接下來</small><strong>{mainObjective.title}</strong><p>{mainObjective.detail}</p></div>
          <Button onClick={() => { setReturnReport(null); goToObjective(); }}>繼續商隊旅程</Button>
          <Button variant="ghost" onClick={() => setReturnReport(null)}>先看看城鎮</Button>
        </DialogContent>
      </Dialog>

      <section className="main-objective" aria-label="目前主線目標">
        <div><small>目前主線目標</small><strong>{mainObjective.title}</strong><span>{mainObjective.detail}</span></div>
        <Button type="button" variant="outline" onClick={goToObjective}>前往</Button>
      </section>

      <section id="inn-zone" className="forced-inn" hidden={game.hero.status!=='客棧中'} aria-live="polite">
        <BedDouble aria-hidden="true"/><div><small>漢陽客棧</small><h2>戰敗療傷中</h2><p>戰鬥已停止。每 2 秒自動恢復 10 點 HP，生命值全滿後會自動離開客棧。</p><Progress value={heroVital.hp/heroVital.maxHp*100} aria-label="客棧療傷進度"/></div>
        <Button type="button" onClick={()=>setGame(payGameInn)}>💰 付費快速治療<small>{quickHealCost.toLocaleString('zh-TW')} 兩</small></Button>
      </section>

      <footer className="classic-live-footer">
        <section className="classic-live-identity">
          <img src={game.hero.image} alt="" />
          <div><small>LV {game.hero.level} · {game.hero.job}</small><strong>{game.hero.name}</strong><span>{displayCityName} · 世界地圖進度</span></div>
        </section>
        <section className="classic-live-resources">
          <div><Coins /><span>{format(game.gold)} 兩</span></div>
          <div><HeartPulse /><span>{heroVital.hp} / {heroVital.maxHp}</span></div>
          <div title="主角升級經驗"><Sparkles /><span>{game.hero.level>=LEVEL_CAP?'EXP 已滿級':`EXP ${format(game.hero.xp)} / ${format(heroXpNeeded)}`}</span></div>
          <div><Swords /><span>{format(unitPower(game.hero)+game.mercs.reduce((sum,unit)=>sum+unitPower(unit),0))}</span></div>
        </section>
        <section className="classic-live-log" aria-label="即時訊息">
          {game.logs.slice(0, 4).map((log, index) => <p key={index}>{log}</p>)}
        </section>
      </footer>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="game-tabs">
        <TabsList className="nav-list v15-nav">
          <TabsTrigger value="map"><Map />斜角城鎮</TabsTrigger>
          <TabsTrigger value="trade"><Ship />東海商路</TabsTrigger>
          <TabsTrigger value="battle"><Map />世界地圖</TabsTrigger>
          <TabsTrigger value="raid"><Crown />雷霆祭壇</TabsTrigger>
          <TabsTrigger value="squad"><Users />主角與隊伍</TabsTrigger>
          <TabsTrigger value="city"><Castle />四國城市</TabsTrigger>
          <TabsTrigger value="contracts"><BookOpen />冒險委託</TabsTrigger>
          <TabsTrigger value="archive"><BookOpen />裝備圖鑑</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="tab-panel isometric-map-tab">
          <IsometricWorldMap cityName={displayCityName} locationLabel={mapLocationLabel} heroImage={game.hero.image} onNpcTalk={openNpcDialogue} onEnter={(destination) => {
            if (destination === "city") { setCityService("mercenary"); setActiveTab("city"); }
            else if (destination === "trade") setActiveTab("trade");
            else if (destination === "raid") setActiveTab("raid");
            else if (destination === "battle") setActiveTab("battle");
            else setActiveTab("squad");
          }} />
          {activeNpcId && npcById(activeNpcId) && <NpcDialoguePanel npc={npcById(activeNpcId)!} game={game} initialLine={npcOpeningLine} onAction={handleNpcAction} onClose={() => setActiveNpcId(null)} />}
        </TabsContent>

        <TabsContent value="trade" className="tab-panel">
          <TradePanel trade={game.trade} gold={game.gold} stage={Math.max(game.stage, game.hero.level)} escorts={game.active.length} logs={game.logs} lastEncounter={game.lastEncounter}
            onDispatch={sendCaravan} onUpgrade={upgradeCaravan}
            onSelect={(selectedRouteId) => setGame((previous) => ({ ...previous, trade: { ...previous.trade, selectedRouteId } }))}
            onToggleAuto={() => setGame((previous) => ({ ...previous, trade: { ...previous.trade, auto: !previous.trade.auto } }))} />
        </TabsContent>

        <TabsContent value="battle" className="tab-panel">
          <section className="panel party-vitals">
            <div className="panel-title"><Users /><h2>出戰隊伍</h2><span>簡易數值</span></div>
            <div className="combat-stat-pair"><span>出戰人數 <b>{1 + activeUnits.length}</b></span><span>總戰力 <b>{format(unitPower(game.hero) + activeUnits.reduce((sum, unit) => sum + unitPower(unit), 0))}</b></span><span>總力量 <b>{format([game.hero,...activeUnits].reduce((sum,unit)=>sum+heroTotalAttributes(unit).str,0))}</b></span><span>總智力 <b>{format([game.hero,...activeUnits].reduce((sum,unit)=>sum+heroTotalAttributes(unit).intel,0))}</b></span></div>
          </section>
          <section className="panel battle-map-panel">
            {import.meta.env.DEV&&<button type="button" className="battle-map-test-unlock" onClick={()=>setGame(previous=>({...previous,stage:Math.max(previous.stage,...battleMaps.map(map=>map.unlockStage)),newbieBossDefeated:true,lakeBossDefeated:true,goldenStarfishDefeated:true,logs:addLog(previous.logs,'測試模式：已解鎖全部戰鬥地圖。')}))}>測試用・解鎖全部地圖</button>}
            <header className="battle-world-map-header"><div><small>東方商路</small><h2>世界地圖</h2><p>選擇已解鎖的區域後，即可指定怪物並持續戰鬥。</p></div><div className="battle-world-map-tools"><span>目前：{currentMap.name}</span><MonsterCompendium /></div></header>
            <nav className="battle-map-selector" aria-label="世界地圖清單">
              {battleMaps.map((map) => {
                const { unlocked, requirement } = mapGate(map);
                return <button type="button" key={map.id} className={'battle-map-card map-theme-'+map.theme+' '+(currentMap.id === map.id ? 'active ' : '')+(unlocked ? '' : 'locked')} disabled={!unlocked} onClick={() => selectBattleMap(map.id)}>
                  <span className="battle-map-card-icon" aria-hidden="true">{mapFeatureIcons[map.theme] || '✦'}</span>
                  <span className="battle-map-card-copy"><small>{map.region}</small><strong>{map.name}</strong><em>{currentMap.id === map.id ? '目前位置' : unlocked ? '選擇地圖' : requirement}</em></span>
                </button>;
              })}
            </nav>
            <div className="battle-world-map" aria-label="世界地圖戰鬥區域">
              <span className="world-route route-one"/><span className="world-route route-two"/><span className="world-route route-three"/>
              {battleMaps.map((map) => {
                const { unlocked, requirement } = mapGate(map);
                const positions:Record<string,[number,number]>={'starter-outskirts':[13,70],'millennium-lake':[28,50],'japan-sea':[55,36],'miasma-forest':[48,68],'ice-temple':[72,48],'taj-mahal':[78,72],'sumeru':[48,18],'shambhala':[92,24]};
                const [x,y]=positions[map.id]||[50,50];
                return <button key={map.id} aria-label={`${map.name}・${unlocked ? '前往' : '尚未解鎖'}`} style={{'--map-x':x+'%','--map-y':y+'%'} as React.CSSProperties} className={'battle-map-node map-theme-'+map.theme+' '+(currentMap.id === map.id ? "active " : "") + (unlocked ? "" : "locked")} disabled={!unlocked} onClick={() => selectBattleMap(map.id)}>
                  <span className="map-node-orb"/><span className="map-node-copy"><small>{map.region}</small><strong>{map.name}</strong><em>{currentMap.id === map.id ? "遠征中" : unlocked ? "前往" : requirement}</em></span>
                </button>;
              })}
            </div>
            <p className="battle-world-map-description">{currentMap.region}・{currentMap.description}　生命 ×{currentMap.hpMultiplier}・金錢 ×{currentMap.goldMultiplier}</p>
            {TIER_EQUIPMENT_DROP_REGIONS.filter(region => region.mapId === currentMap.id).map(region => <p key={region.id} className="battle-world-map-description">本區怪物掉落：Lv.{region.tiers.join('／Lv.')} 系列裝備（達到對應等級後可掉落；一般 4%、首領 12%）</p>)}
            {sourceEnemies.some(enemy => enemy.mapId === currentMap.id) && <section className="monster-choice-list" aria-label="選擇遭遇怪物"><header><div><small>本區域指定狩獵</small><strong>{game.selectedMonster ? `目前目標：${game.selectedMonster}` : "尚未指定・依關卡輪替"}</strong></div><span>點選卡片即可開始自動戰鬥</span></header><div className="monster-choice-grid">{sourceEnemies.filter(enemy => enemy.mapId === currentMap.id).map(enemy => { const bossLocked = enemy.name === '海賊王' && !firstCaravanBossReady; return <button type="button" key={enemy.name} disabled={bossLocked} className={(game.selectedMonster === enemy.name ? "active " : "")+(enemy.boss ? "boss-target" : "")} onClick={() => setGame(previous => { const key=enemy.dungeonId; const base={...previous,selectedMonster:enemy.name,enemyHp:enemy.hp||previous.enemyHp,dungeon:key?{...freshDungeon(),key,lockedEnemyKey:key,enemyHp:DUNGEONS[key].hp}:previous.dungeon,logs:addLog(previous.logs,`${enemy.boss?'首領挑戰：':'指定遭遇怪物：'}${enemy.name}，自動開始持續戰鬥。`)}; return key ? runDungeonAction(base,'start',Date.now(),key,{roll:Math.random(),choice:Math.random(),spawnRoll:0,encounterCountRoll:Math.random(),retaliationRoll:Math.random(),materialRolls:[Math.random(),Math.random(),Math.random()],fusionCoreRoll:Math.random()},{addLog,grantXp,enterInn:enterGameInn,leaveInn:leaveGameInn}) : base; })}>{bossMonsterArt[enemy.name]&&<img className="monster-choice-art" src={bossMonsterArt[enemy.name]} alt={`${enemy.name}插圖`}/>}<div><strong>{enemy.name}</strong><em>{bossLocked ? '完成第一輪成長後開放' : enemy.boss ? (game.newbieBossDefeated?"已討伐・可再戰":"首領挑戰") : game.selectedMonster === enemy.name ? "指定中" : "選擇目標"}</em></div><dl><span>HP <b>{enemy.hp ?? '—'}</b></span><span>MP <b>{enemy.mp ?? '—'}</b></span><span>ATK <b>{enemy.attack ?? '—'}</b></span><span>EXP <b>{enemy.xp}</b></span></dl><p>{bossLocked ? '條件：完成第一份委託、Lv.20、驛站與第一件綠裝。' : `掉落：${enemy.drops.join("、")}`}</p></button>; })}</div></section>}
            <DungeonPanel hero={game.hero} party={[game.hero,...game.mercs.filter(unit=>game.active.includes(unit.uid)).slice(0,11)]} state={game.dungeon||freshDungeon()} mp={vitalStats(game.hero).mp} autoSkill={game.autoSkill} toggleAutoSkill={()=>setGame(previous=>({...previous,autoSkill:!previous.autoSkill,logs:addLog(previous.logs,previous.autoSkill?'已關閉技能自動施放。':'已開啟技能自動施放。')}))} mapName={currentMap.name} mapRegion={currentMap.region} medicineQuickbar={<div className="battle-medicine-float" aria-label="隨身藥袋">{medicineCatalog.filter(medicine=>medicine.id==='healing'||medicine.id==='mana').map(medicine=>{const medicineKey=medicine.id as 'healing'|'mana'; const resource=medicineKey==='healing'?'HP':'MP'; return <div className="battle-medicine-item" key={medicine.id}><button type="button" disabled={!game.medicines[medicine.id]} onClick={()=>consumeMedicine(medicine.id)} title={`${medicine.name}：${medicine.effect}`}><Pill /><span>{medicine.name}</span><b>×{game.medicines[medicine.id]||0}</b></button><label title={`設定${medicine.name}自動使用門檻；0% 為關閉`}><small>{game.autoMedicine[medicineKey] ? `自動 ${resource} ≤` : '自動關閉'}</small><input aria-label={`${medicine.name}自動使用門檻`} type="number" min="0" max="99" value={game.autoMedicine[medicineKey]} onChange={event=>{const threshold=Math.min(99,Math.max(0,Math.floor(Number(event.target.value)||0)));setGame(previous=>({...previous,autoMedicine:{...previous.autoMedicine,[medicineKey]:threshold}}));}}/><span>%</span></label></div>;})}</div>} dps={game.mercs.reduce((sum,unit)=>sum+(game.active.includes(unit.uid)?Math.max(0,Math.floor(combatStats(unit).attack*0.18)):0),0)} act={(action,key)=>{const now=Date.now(),roll=Math.random(),choice=Math.random(),retaliationRoll=Math.random(),materialRolls=[Math.random(),Math.random(),Math.random()],gearDropRoll=Math.random(),gearChoiceRoll=Math.random();setGame(previous=>runDungeonAction(previous,action,now,key,{roll,choice,spawnRoll:0,encounterCountRoll:Math.random(),retaliationRoll,materialRolls,gearDropRoll,gearChoiceRoll},{addLog,grantXp,enterInn:enterGameInn,leaveInn:leaveGameInn}));}}/>
          </section>
          <div className="battle-grid">
            <section className="panel log-panel">
              <div className="panel-title"><BookOpen /><h2>商團與戰鬥紀錄</h2></div>
              <div className="log-list">{game.logs.map((log, index) => <p key={index}>{log}</p>)}</div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="raid" className="tab-panel">
          <ThunderAltarRaid
            credit={game.credit}
            power={Math.floor(unitPower(game.hero) + game.mercs.filter(unit => game.active.includes(unit.uid)).reduce((sum, unit) => sum + unitPower(unit), 0))}
            materials={game.materials}
            azureSetPieces={azureSetPieces} chiyouSetPieces={chiyouSetPieces} amaterasuSetPieces={amaterasuSetPieces}
            onEnter={() => setGame(previous => ({ ...previous, credit: previous.credit - 50_000, logs: addLog(previous.logs, "進入「神仙谷・雷霆祭壇」，支付 50,000 信用值。") }))}
            onRefund={() => setGame(previous => ({ ...previous, credit: previous.credit + 25_000, logs: addLog(previous.logs, "雷霆祭壇挑戰失敗，退回 25,000 信用值。") }))}
            onMaterials={(materials) => setGame(previous => ({ ...previous, materials, logs: addLog(previous.logs, "雷霆祭壇戰利品已加入背包。") }))}
            onForge={forgeThunderSet}
            onNotice={setNotice}
          />
        </TabsContent>


        <TabsContent value="squad" className="tab-panel">
          <CaravanStatus key={squadDestination.key} initialWindow={squadDestination.window} territory={game.territory} upgradeBuilding={upgradeTerritoryBuilding} enhanceEquipment={enhanceTerritoryEquipment} fuseAllEquipment={fuseAllTerritoryEquipment} busy={dungeonBusy(game.dungeon)} hero={game.hero} mercs={game.mercs} restingMercs={game.restingMercs} active={game.active} toggleActive={toggleActive} storeMercenary={storeMercenary} withdrawRestingMercenary={withdrawRestingMercenary} gold={game.gold} credit={game.credit} creditXp={game.creditXp} creditLevel={game.creditLevel} newbieCoins={game.newbieCoins} redeemWandererSet={redeemWandererSet}
            navigation={<WorldMapNavigation state={game.dungeon||freshDungeon()} level={game.hero.level} power={heroPersonalPower(game.hero)} travel={id=>{const now=Date.now(),spawnRoll=Math.random();setGame(previous=>{
              const old=previous.dungeon||freshDungeon();
              const deployed=[previous.hero,...previous.mercs.filter(unit=>previous.active.slice(0,ACTIVE_MERCENARY_LIMIT).includes(unit.uid))];
              if(deployed.every(unit=>vitalStats(unit).hp<=0))return enterGameInn(previous,now,'出戰隊伍生命值不足，已自動返回漢陽客棧。',{...freshDungeon(),pauseAt:old.pauseAt||now});
              const dungeon=teleportDungeon(old,previous.hero.level,heroPersonalPower(previous.hero),now,id,spawnRoll);
              return dungeon===old?previous:{...previous,dungeon,logs:addLog(previous.logs,dungeon.logs[0])};
            });}}/>}
            battle={null}
            inventory={game.inventory} materials={game.materials} materialPrices={MATERIAL_PRICES}
            equipSelected={(itemUid,targetUid)=>equipItem(itemUid,undefined,targetUid)} sellInventory={sellInventoryEquipment} sellAllInventory={sellEveryInventoryEquipment} sellMaterial={sellLoot} sellAllMaterials={sellEveryLoot} openAncientCoinBox={openAncientCoinBox} unequipHero={slot=>unequipItem(slot,'hero')} bagMessage={game.logs[0]||''}

            weight={[...game.inventory,...Object.values(game.hero.equip)].reduce((sum,item)=>sum+(item?({weapon:5,helm:3,armor:12,boots:3,ring:0.2,gloves:2,amulet:1,accessory:1}[itemKind(item.slot)]||1):0),0)}
            maxWeight={heroWeightLimit(game.hero)} cost={Math.floor(6000*currentCity.priceFactor)} power={unit=>unitPower(unit as Unit)} xpNeed={xpNeed} select={setSelectedUid}
            cyclePosition={cycleUnitPosition}
            trade={()=>setGame(previous=>dungeonBusy(previous.dungeon)?previous:grantCreditXp({...previous,gold:previous.gold+100,credit:previous.credit+1,logs:addLog(previous.logs,'模擬經商：獲得 100 兩與 1 信用經驗。')},1))}
            trainHero={simulateHeroLoot}
            promote={(uid,targetTier)=>setGame(previous=>promoteMercenary(previous,uid,targetTier))}
            promotionItems={{fusionCores:game.fusionCores,soulStones:game.soulStones,awakeningStones:game.awakeningStones}}
            hire={()=>{ const index=Math.floor(Math.random()*merchantMercenaries.length); recruitMerchant(merchantMercenaries[index],index); }}
            train={()=>setGame(previous=>dungeonBusy(previous.dungeon)?previous:({...previous,hero:grantTerritoryXp(previous, previous.hero,100),mercs:previous.mercs.map(unit=>grantTerritoryXp(previous,unit,100)),logs:addLog(previous.logs,'模擬打怪：主角與所有已僱用傭兵各獲得 100 經驗（含領地加成）。')}))}
            allocate={addStat} />
        </TabsContent>

        <TabsContent value="city" className="tab-panel">
          <section className="panel city-atlas">
            <div className="panel-title"><Map /><h2>四國主城</h2><span>朝鮮漢陽・中國南京・日本江戶・台灣台北</span></div>
            <div className="city-country-grid">{nations.map((nation) => <article key={nation.id} style={{ "--nation-color": nation.color } as React.CSSProperties}>
              <div><strong>{nation.name}</strong><small>{nation.description}</small></div>
              <div>{worldCities.filter((city) => city.nation === nation.id).map((city) => {
                const origin = worldCities.find((entry) => entry.id === game.city) || worldCities[0];
                const travelCost = origin.nation === city.nation ? Math.floor(city.travelFee * 0.45) : city.travelFee;
                return <button key={city.id} className={game.city === city.id ? "active" : ""} onClick={() => travelToCity(city.id)}><span>{city.name}</span><small>{game.city === city.id ? "所在地" : format(travelCost) + " 兩"}</small></button>;
              })}</div>
            </article>)}</div>
          </section>

          <section className="panel city-hall" style={{ "--nation-color": currentNation.color } as React.CSSProperties}>
            <div className="city-heading"><div><small>{currentNation.name}・特產 {currentCity.specialty}</small><h2>{currentCity.name}</h2><p>本城設施獨立營業，招募名單、將領與裝備庫存皆依城市不同。</p></div><img className="city-building-art" src={gersangBuildingArt(currentNation.id, cityService)} alt={`${currentCity.name}${cityService}`} /></div>
            <div className="city-service-tabs">
              <button className={cityService === "mercenary" ? "active" : ""} onClick={() => setCityService("mercenary")}><Users />中央傭兵公會</button>
              <button className={cityService === "weapon" ? "active" : ""} onClick={() => setCityService("weapon")}><Swords />武器商店</button>
              <button className={cityService === "armor" ? "active" : ""} onClick={() => setCityService("armor")}><Shield />防具商店</button>
              <button className={cityService === "warehouse" ? "active" : ""} onClick={() => setCityService("warehouse")}><Warehouse />倉庫</button>
              <button className={cityService === "inn" ? "active" : ""} onClick={() => setCityService("inn")}><BedDouble />客棧</button>
              <button className={cityService === "pharmacy" ? "active" : ""} onClick={() => setCityService("pharmacy")}><Pill />藥店</button>
              <button className={cityService === "exchange" ? "active" : ""} onClick={() => setCityService("exchange")}><PackageOpen />全東亞材料交易所</button>
            </div>


            {cityService === 'mercenary' && <><MercenaryRecruitment gold={game.gold} cost={Math.floor(6000 * currentCity.priceFactor)} recruit={recruitMerchant} /><GeneralRecruitment generals={mercenaries.filter(general => general.grade === 'general' && general.city === currentCity.name)} gold={game.gold} recruit={recruitGeneral} /></>}

            {(cityService === "weapon" || cityService === "armor") && <div className="city-service-body"><div className="panel-title">{cityService === "weapon" ? <Swords /> : <Shield />}<h2>{currentCity.name}{cityService === "weapon" ? "武器商店" : "防具商店"}</h2><span>本城獨立庫存</span></div><p className="shop-quality-notice">購入時隨機鑑定：普通 75%（×1）・稀有 10%（×1.5）・史詩 0.2%（×10）・傳說 0.05%（×150）；未命中高階品時以普通品質出貨。</p>
              <div className="official-item-grid">{(cityService === "weapon" ? cityWeapons : cityArmors).map((record) => {
                const price = Math.floor(record.price * currentCity.priceFactor);
                return <article key={record.id}><img src={cuteEquipmentArt(record.name,gersangItemArt(record.kind === "weapon" ? "weapon" : "armor"))} alt="" /><small>Lv.{record.level}・{record.kind === "weapon" ? "武器" : "防具"}</small><strong>{record.name}</strong><span>{record.atk ? "攻 " + record.atk : "防 " + record.def}{record.skill ? "・" + record.skill : ""}</span><em>{[record.str ? "力+" + record.str : "", record.agi ? "敏+" + record.agi : "", record.intel ? "智+" + record.intel : "", record.vit ? "體+" + record.vit : ""].filter(Boolean).join("・") || "基礎裝備"}</em><Button size="sm" onClick={() => buyOfficialItem(record, price)}>{format(price)} 兩</Button></article>;
              })}</div>
              <div className="official-item-grid">{wearableCatalog.filter(item=>cityService==='weapon'?['weapon','ring','amulet'].includes(item.slot):!['weapon','ring','amulet'].includes(item.slot)).map(item=><article key={item.id}><img src={gersangItemArt(item.slot)} alt="" /><small>{slotLabels[item.slot]}</small><strong>{item.name}</strong><span>攻 {item.atk} · 防 {item.def} · HP {item.hp}</span><Button onClick={()=>buyWearable(item)}>{format(Math.floor(item.price*currentCity.priceFactor))} 兩</Button></article>)}</div>
              <p className="shop-quality-notice">過渡供應：Lv.120／150／180／200 系列裝備，達到等級後可購買；後續地圖完成將調整取得來源。</p>
              <div className="official-item-grid">{tierEquipmentShopCatalog.filter(item=>cityService==='weapon'?item.part==='weapon':item.part!=='weapon').map(item=><article key={item.id}><img src={item.image} alt="" /><small>Lv.{item.requiredLevel}・{item.partLabel}</small><strong>{item.name}</strong><span>攻 {item.atk} · 防 {item.def} · HP {item.hp}</span><Button size="sm" disabled={game.hero.level<item.requiredLevel} onClick={()=>buyTierEquipment(item)}>{game.hero.level<item.requiredLevel?`Lv.${item.requiredLevel} 開放`:`${format(Math.floor(tierEquipmentPrice(item)*currentCity.priceFactor))} 兩`}</Button></article>)}</div>
              {cityService === "weapon" && <div className="enchant-counter"><div><strong>附魔裝備櫃</strong><p>購入與目前關卡相符、附帶 1～3 條魔法屬性的隨機裝備。</p></div><Button onClick={buyMagicEquipment}><ShoppingBag />12,000 兩</Button></div>}
            </div>}

            {cityService === "warehouse" && <div className="city-service-body warehouse-service"><div className="panel-title"><Warehouse /><h2>三角色共用倉庫</h2><span>{sharedWarehouse.length}/{warehouseLimit(game.territory)} 格</span></div><Progress value={sharedWarehouse.length / warehouseLimit(game.territory) * 100} />
              <div className="warehouse-columns"><section><h3>{game.hero.name} 的物品欄</h3>{game.inventory.length ? game.inventory.map((item) => <article key={item.uid}><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{item.rarity}・{slotLabels[item.slot]}</small></span><Button size="sm" disabled={sharedWarehouse.length >= warehouseLimit(game.territory)} onClick={() => depositToWarehouse(item.uid)}>存入</Button></article>) : <p>目前沒有可存入的裝備。</p>}</section>
              <section><h3>共用倉庫・三名角色皆可取用</h3>{sharedWarehouse.length ? sharedWarehouse.map((item) => <article key={item.uid}><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{item.rarity}・{slotLabels[item.slot]}</small></span><Button size="sm" variant="outline" onClick={() => withdrawFromWarehouse(item.uid)}>取出</Button></article>) : <p>倉庫目前是空的。</p>}</section></div>
            </div>}

            {cityService === "inn" && <div className="city-service-body inn-service"><BedDouble /><div><small>{currentCity.name}客棧</small><h2>商團歇腳與修練</h2><p>全員 HP / MP 恢復至上限；主角獲得 700 經驗，出戰傭兵各獲得 550 經驗。</p><Button type="button" onClick={restAtInn}>{game.hero.status==='客棧中'||game.dungeon?.status==='recovering'?'立即療傷・'+format(quickHealCost)+' 兩':'入住・'+format(Math.floor(1800 * currentCity.priceFactor))+' 兩'}</Button></div></div>}

            {cityService === "pharmacy" && <div className="city-service-body"><div className="panel-title"><Pill /><h2>{currentCity.name}藥店</h2><span>可設定每次購買數量</span></div><div className="medicine-grid">{medicineCatalog.map((medicine) => {const amount=medicineAmounts[medicine.id]||1;const unitPrice=Math.floor(medicine.price * currentCity.priceFactor);return <article key={medicine.id}><Pill /><div><strong>{medicine.name}</strong><small>{medicine.effect}</small><em>持有 {game.medicines[medicine.id] || 0} ・單價 {format(unitPrice)} 兩</em></div><div className="medicine-purchase"><label>數量<input aria-label={`${medicine.name}購買數量`} type="number" min="1" max="999" value={amount} onChange={event=>setMedicineAmounts(previous=>({...previous,[medicine.id]:Math.min(999,Math.max(1,Math.floor(Number(event.target.value)||1)))}))}/></label><Button size="sm" onClick={() => buyMedicine(medicine.id,amount)}>購買 {format(unitPrice*amount)} 兩</Button></div><Button size="sm" variant="outline" disabled={!game.medicines[medicine.id]} onClick={() => consumeMedicine(medicine.id)}>使用</Button></article>;})}</div></div>}

            {cityService === "exchange" && <div className="city-service-body village-exchange"><div className="panel-title"><PackageOpen /><h2>全東亞材料交易所</h2><span>永久攻擊 +{exchangeAttackBonus(game.exchangePurchases)}</span></div><div className="exchange-layout"><div className="exchange-weapons"><div className="exchange-subtitle"><strong>{currentCity.name}鍛造所</strong><small>可重複購買，每次漲價 30%</small></div><div className="weapon-upgrade-grid">{VILLAGE_WEAPONS.map(good=>{const cost=weaponCost(good.id,game.exchangePurchases),bought=game.exchangePurchases[good.id]||0;return <article key={good.id} className={good.id==='immortal-great-blade'?'divine':''}><div><strong>{good.name}</strong><small>主角永久攻擊 +{good.atkBonus}｜已鍛造 {bought} 次</small></div><button onClick={()=>buyExchangeUpgrade(good.id)} disabled={game.gold<cost}>🪙 {format(cost)} 兩</button></article>;})}</div></div><div className="exchange-market"><div className="exchange-subtitle"><strong>本地材料櫃檯</strong><small>{currentWorldZone.name}・可買回本地怪物材料</small><small>材料請至商隊背包出售。</small></div><div className="material-market-grid">{currentWorldZone.dropTable.map(item=>{const price=MATERIAL_BUY_PRICES[item.item]||0;return <article key={item.item}><div><strong>{item.item}</strong><small>持有 ×{game.materials[item.item]||0}・買價 {format(price)} 兩</small></div><button type="button" disabled={!price||game.gold<price} onClick={()=>buyLootMaterial(item.item)}>買入 1 件</button></article>;})}</div></div></div></div>}
          </section>

          <div className="city-auxiliary">
            <section className="panel gem-workshop"><div className="panel-title"><Gem /><h2>寶石鑲嵌工房</h2><span>目前對象・{selected.name}</span></div><Select value={gemSlot} onValueChange={value=>{if(value) setGemSlot(value as EquipmentSlot)}}><SelectTrigger aria-label="選擇鑲嵌欄位"><SelectValue>{slotLabels[gemSlot]}</SelectValue></SelectTrigger><SelectContent>{slots.map(slot=><SelectItem key={slot} value={slot}>{slotLabels[slot]}</SelectItem>)}</SelectContent></Select><label className="gem-amount">鑲嵌數量（1～100）<input aria-label="寶石鑲嵌數量" type="number" min="1" max="100" value={gemAmount} onChange={event=>setGemAmount(Math.min(100,Math.max(1,Math.floor(Number(event.target.value)||1))))}/></label><div className="gem-grid">{officialGems.map((gem) => <article key={gem.id}><strong>{gem.name}</strong><small>{gem.label}</small><div>{gem.values.map((value, grade) => <Button key={grade} size="sm" variant="outline" onClick={() => socketGem(gem.id, grade, gemAmount)}>+{value}・{format(gem.costs[grade])}兩</Button>)}</div></article>)}</div></section>
            <section className="panel"><div className="panel-title"><Shield /><h2>陣法</h2></div><div className="formation-list">{formations.map((item) => <button key={item.id} className={game.formation === item.id ? "formation-row active" : "formation-row"} onClick={() => setGame((prev) => ({ ...prev, formation: item.id }))}><span><strong>{item.name}</strong><small>{item.detail}</small></span><em>{game.formation === item.id ? "使用中" : "切換"}</em></button>)}</div></section>
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="tab-panel">
          <section className="panel contract-board">
            <div className="panel-title"><BookOpen /><h2>冒險委託所</h2><span>{game.claimedContracts.length}/{gameplayContracts.length} 已完成</span></div>
            <p className="section-copy">招募公會傭兵、討伐怪物與收集裝備，完成委託後領取商團資金。</p>
            <div className="contract-grid">{gameplayContracts.map((contract) => {
              const progress = contractProgress(game, contract.metric);
              const completed = progress >= contract.target;
              const claimed = game.claimedContracts.includes(contract.id);
              return <article className={claimed ? "claimed" : completed ? "complete" : ""} key={contract.id}>
                <div><small>{contract.category}</small><strong>{contract.name}</strong></div>
                <p>{contract.description}</p>
                <Progress value={Math.min(100, progress / contract.target * 100)} />
                <span>{Math.min(progress, contract.target)} / {contract.target}</span>
                <em>獎勵 {format(contract.reward.gold)} 兩</em>
                <Button size="sm" disabled={!completed || claimed} onClick={() => claimContract(contract.id)}>{claimed ? "已領取" : completed ? "領取獎勵" : "進行中"}</Button>
              </article>;
            })}</div>
          </section>
          <section className="panel contract-board">
            <div className="panel-title"><Users /><h2>漢陽村莊委託追蹤</h2><span>{trackedNpcQuests.length} 項進行中</span></div>
            <p className="section-copy">完成條件後返回委託人回報；進度會隨冒險自動更新。</p>
            {trackedNpcQuests.length ? <div className="contract-grid">{trackedNpcQuests.map(({npc,quest,progress})=>{const ready=progress>=quest.target;return <article className={ready?"complete":""} key={quest.id}>
              <div><small>{npc.role}・{npc.name}</small><strong>{quest.name}</strong></div>
              <p>{ready?"委託條件已達成，請回到委託人領取獎勵。":"依照委託要求持續冒險，達成後回報。"}</p>
              <Progress value={Math.min(100,progress/quest.target*100)} />
              <span>{Math.min(progress,quest.target)} / {quest.target}{ready?"・可回報":""}</span>
              <em>獎勵 {format(quest.reward.gold)} 兩・好感 +{quest.reward.affinity}</em>
              <Button size="sm" variant="outline" onClick={()=>{setActiveTab("map");openNpcDialogue(npc.id);}}>{ready?"返回回報":"前往委託人"}</Button>
            </article>})}</div> : <p className="empty-state">目前沒有進行中的村莊委託；與漢陽 NPC 交談即可接受任務。</p>}
          </section>
          <section className="panel implemented-systems">
            <div className="panel-title"><Sparkles /><h2>已融入玩法的資料</h2><span>不再使用參考圖鑑</span></div>
            <div>
              <article><Swords /><strong>怪物與地圖</strong><p>敵人名稱、抗性、技能、經驗和材料掉落直接控制戰鬥。</p></article>
              <article><Users /><strong>中央傭兵公會</strong><p>{merchantMercenaries.length} 種公會傭兵，搭配被動與主動技能，透過等級、能力點與裝備成長。</p></article>
              <article><Shield /><strong>物品與裝備</strong><p>刀劍、盔甲、等級限制、能力加成和裝備技能進入商店與裝備欄。</p></article>
              <article><Gem /><strong>匠人與寶石</strong><p>五種寶石可實際鑲嵌並提升角色能力。</p></article>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="archive" className="tab-panel">
          <GersangArchive />
        </TabsContent>
      </Tabs>

      <footer><span>放置你的巨商魂・東方商路</span><span>四國城市・傭兵養成・雷霆祭壇・裝備圖鑑</span></footer>
    </main>
  );
}
