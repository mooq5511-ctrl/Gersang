"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { bandit, isBanditEncounter } from "./bandit";
import { merchantMercenaries, mercenarySpec, type MercenarySpec } from './mercenary-roster';
import { CaravanStatus } from './caravan-status';
import { settleCaravanIdle } from './caravan-idle';
import { backupBeforeGuildMigration, retainGuildRoster } from './guild-migration';
import { EQUIPMENT_SLOTS, EQUIPMENT_LABELS, emptyEquipmentSlots, itemKind, compatibleSlots, normalizeStoredItem, equipFromInventory, unequipToInventory, migrateSevenSlotSave, backupBeforeEquipmentMigration, type EquipmentSlot, type EquipmentKind } from './equipment-slots';
import { wearableCatalog, type WearableBase } from './wearable-catalog';
import { MercenaryRecruitment, mercenaryPortrait } from './mercenary-recruitment';
import { resolveMercenaryBattle, type TacticalEnemy } from './mercenary-battle';
import {
  BedDouble,
  BookOpen,
  Castle,
  Coins,
  Crown,
  Gem,
  Map,
  PackageOpen,
  Pause,
  Pill,
  Play,
  Shield,
  Ship,
  ShoppingBag,
  Sparkles,
  Swords,
  Users,
  Warehouse,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formations, mercenaries as legacyMercenaries } from "./game-data";
import {
  enemyForStage,
  equipmentBases,
  magicAffixes,
  nations,
  NationId,
  worldCities,
} from "./v15-data";
import { battleMaps } from "./reference-data";
import { gameplayContracts as legacyContracts, officialEquipment, officialGems, OfficialEquipment, sourceEnemyForMap } from "./v17-content";
const gameplayContracts = legacyContracts.filter(contract => !['tier1','tier2','awakened'].includes(contract.metric));
import { TradePanel } from "./trade-panel";
import { VitalBars } from "./vital-bars";
import { combatStats, enemyCombatStats, normalizeVitals, recoverVitals, resolveVitalBattle, spellCost, vitalStats } from "./vitals-engine";
import { advanceTrade, dispatchTrade, freshTrade, MAX_CARGO_LEVEL, restoreTrade, TRADE_ROUTES, upgradeCost, type TradeState } from "./trade-engine";


type MagicAffix = {
  id: string;
  name: string;
  text: string;
  color: string;
  stat: string;
  value: number;
};

type Equipment = {
  uid: string;
  name: string;
  slot: EquipmentKind;
  atk: number;
  def: number;
  hp: number;
  image: string;
  enhance: number;
  rarity: "普通" | "稀有" | "史詩" | "傳說";
  magic: MagicAffix[];
  requiredLevel?: number;
  source?: string;
  skill?: string;
  bonus?: { str: number; agi: number; intel: number; vit: number };
  resist?: { physical: number; magic: number };
};

type EquipmentSet = Record<EquipmentSlot, Equipment | null>;

type Unit = {
  uid: string;
  templateId: string;
  nation: NationId | "legacy";
  tier: 0 | 1 | 2 | 3;
  special: boolean;
  awakened?: boolean;
  physicalResist?: number;
  magicResist?: number;
  legendId?: string;
  name: string;
  role: string;
  skill: string;
  image: string;
  level: number;
  xp: number;
  points: number;
  str: number;
  agi: number;
  intel: number;
  vit: number;
  hp?: number;
  mp?: number;
  equip: EquipmentSet;
};

type Hero = Omit<Unit, "nation" | "tier" | "special" | "templateId"> & {
  templateId: "hero";
  nation: NationId;
  tier: 0;
  special: false;
  job: string;
};

type CharacterProfile = {
  slot: number;
  name: string;
  nation: NationId;
  level: number;
  stage: number;
  updatedAt: number;
};

type CityService = "mercenary" | "weapon" | "armor" | "warehouse" | "inn" | "pharmacy";

type GameState = {
  version: 21;
  trade: TradeState;
  credit: number;
  idleStamp: number;
  gold: number;
  stage: number;
  kills: number;
  city: string;
  battleMap: string;
  hero: Hero;
  mercs: Unit[];
  active: string[];
  inventory: Equipment[];
  fusionCores: number;
  soulStones: number;
  awakeningStones: number;
  materials: Record<string, number>;
  medicines: Record<string, number>;
  claimedContracts: string[];
  lastEncounter: string;
  enemyHp: number;
  formation: string;
  logs: string[];
  lastSeen: number;
};

const PROFILE_INDEX = "bt52_v19_character_profiles";
const PROFILE_SAVE_PREFIX = "bt52_v19_character_slot_";
const SHARED_WAREHOUSE_SAVE = "bt52_v20_shared_warehouse";
const WAREHOUSE_LIMIT = 30;
const V18_SAVE = "bt52_v18_playable_database";
const V17_SAVE = "bt52_v17_actual_content";
const V16_SAVE = "bt52_v16_52jushang_reference";
const V15_SAVE = "bt52_v15_four_nations";
const V14_SAVE = "bt52_v14_strategy";
const slots = EQUIPMENT_SLOTS;
const slotLabels = EQUIPMENT_LABELS;

const heroNationProfiles: Record<NationId, { title: string; skill: string; image: string; stats: [number, number, number, number] }> = {
  taiwan: { title: "南海商主", skill: "山海號令", image: legacyMercenaries[5].idle, stats: [68, 74, 72, 66] },
  china: { title: "絲路巨商", skill: "乾坤商陣", image: legacyMercenaries[4].idle, stats: [72, 64, 78, 68] },
  korea: { title: "朝鮮大商", skill: "商團號令", image: legacyMercenaries[0].idle, stats: [70, 66, 68, 76] },
  japan: { title: "御用商人", skill: "疾風號令", image: legacyMercenaries[2].idle, stats: [68, 80, 64, 68] },
};

const medicineCatalog = [
  { id: "healing", name: "金創藥", price: 600, effect: "主角與出戰傭兵恢復 50% 最大 HP（可救起倒下者）", heroXp: 0, mercXp: 0, hpRestore: 0.5, mpRestore: 0 },
  { id: "mana", name: "回靈散", price: 800, effect: "主角與出戰傭兵恢復 50% 最大 MP", heroXp: 0, mercXp: 0, hpRestore: 0, mpRestore: 0.5 },
  { id: "ginseng", name: "高麗人參", price: 900, effect: "主角獲得 400 經驗", heroXp: 400, mercXp: 0 },
  { id: "tonic", name: "十全大補湯", price: 1500, effect: "出戰傭兵各獲得 320 經驗", heroXp: 0, mercXp: 320 },
  { id: "vitality", name: "活力丸", price: 2400, effect: "主角與出戰傭兵各獲得 260 經驗", heroXp: 260, mercXp: 260 },
] as const;

function isNationId(value: unknown): value is NationId {
  return value === "taiwan" || value === "china" || value === "korea" || value === "japan";
}

function profileSaveKey(slot: number) {
  return PROFILE_SAVE_PREFIX + slot;
}

function currentTimestamp() {
  return Date.now();
}

function uid(prefix: string) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function emptyEquipment(): EquipmentSet {
  return emptyEquipmentSlots<Equipment>();
}


function makeHero(nation: NationId = "korea", name = "行商者"): Hero {
  const profile = heroNationProfiles[nation];
  return normalizeVitals<Hero>({
    uid: "hero",
    templateId: "hero",
    nation,
    tier: 0,
    special: false,
    name,
    job: profile.title,
    role: "主角",
    skill: profile.skill,
    image: profile.image,
    level: 1,
    xp: 0,
    points: 6,
    str: profile.stats[0],
    agi: profile.stats[1],
    intel: profile.stats[2],
    vit: profile.stats[3],
    equip: emptyEquipment(),
  });
}

function rollEquipment(stage: number, guaranteed = false): Equipment {
  const base = wearableCatalog[Math.floor(Math.random() * wearableCatalog.length)];
  const magicCount = guaranteed ? Math.min(3, 1 + Math.floor(stage / 20)) : Math.min(3, Math.max(1, Math.floor(stage / 15)));
  const shuffled = [...magicAffixes].sort(() => Math.random() - 0.5).slice(0, magicCount);
  const rarity: Equipment["rarity"] =
    magicCount >= 3 ? "傳說" : magicCount === 2 ? "史詩" : stage >= 10 ? "稀有" : "普通";
  return {
    uid: uid(base.id),
    name: (rarity === "普通" ? "" : rarity + "・") + base.name,
    slot: base.slot,
    atk: base.atk + stage * 2,
    def: base.def + Math.floor(stage * 1.4),
    hp: base.hp + stage * 6,
    image: base.image,
    enhance: 0,
    rarity,
    magic: shuffled.map((affix) => ({ ...affix })),
    bonus: { str: 0, agi: 0, intel: 0, vit: 0 },
    resist: { physical: 0, magic: 0 },
  };
}

function makeOfficialEquipment(record: OfficialEquipment): Equipment {
  const base = equipmentBases.find((item) => item.slot === record.kind) || equipmentBases[0];
  const magic = [...magicAffixes].sort(() => Math.random() - 0.5).slice(0, record.level >= 130 ? 3 : record.level >= 50 ? 2 : 1);
  return {
    uid: uid(record.id),
    name: record.name,
    slot: record.kind,
    atk: record.atk || 0,
    def: record.def || 0,
    hp: 0,
    image: base.image,
    enhance: 0,
    rarity: record.level >= 170 ? "傳說" : record.level >= 80 ? "史詩" : record.level >= 35 ? "稀有" : "普通",
    magic: magic.map((affix) => ({ ...affix })),
    requiredLevel: record.level,
    source: "52巨商物品資料",
    skill: record.skill,
    bonus: { str: record.str || 0, agi: record.agi || 0, intel: record.intel || 0, vit: record.vit || 0 },
    resist: { physical: record.physical || 0, magic: record.magic || 0 },
  };
}

function starterEquipment(): Equipment[] {
  return [rollEquipment(3), rollEquipment(8, true)];
}

function freshGame(nation: NationId = "korea", heroName = "行商者"): GameState {
  const starters: Unit[] = [];
  return {
    version: 21,
    trade: freshTrade(),
    credit: 0,
    idleStamp: Date.now(),
    gold: 120000,
    stage: 1,
    kills: 0,
    city: worldCities.find((city) => city.nation === nation)?.id || worldCities[0].id,
    battleMap: battleMaps[0].id,
    hero: makeHero(nation, heroName),
    mercs: starters,
    active: starters.map((unit) => unit.uid),
    inventory: starterEquipment(),
    fusionCores: 0,
    soulStones: 0,
    awakeningStones: 0,
    materials: {},
    medicines: {},
    claimedContracts: [],
    lastEncounter: "尚未遭遇敵人。商隊出航後才可能觸發戰鬥。",
    enemyHp: enemyMax(1, battleMaps[0].hpMultiplier),
    formation: "goose",
    logs: ["V21・商途與四國二十城已融合。出航經商，培養你的十人商團。"],
    lastSeen: Date.now(),
  };
}

function sanitizeEquip(value: unknown): EquipmentSet {
  const equip = emptyEquipment();
  if (!value || typeof value !== "object") return equip;
  for (const slot of slots) {
    const candidate = (value as Record<string, unknown>)[slot];
    if (candidate && typeof candidate === "object" && "name" in candidate) {
      const item = candidate as Partial<Equipment>;
      equip[slot] = {
        uid: item.uid || uid("migrated"),
        name: item.name || "傳承裝備",
        slot: itemKind(item.slot || slot),
        atk: Number(item.atk) || 0,
        def: Number(item.def) || 0,
        hp: Number(item.hp) || 0,
        image: typeof item.image === "string" ? item.image : (candidate as { asset?: string }).asset || equipmentBases[0].image,
        enhance: Number(item.enhance) || 0,
        rarity: item.rarity || "普通",
        magic: Array.isArray(item.magic) ? item.magic as MagicAffix[] : [],
        requiredLevel: Number(item.requiredLevel) || 0,
        source: item.source,
        skill: item.skill,
        bonus: item.bonus || { str: 0, agi: 0, intel: 0, vit: 0 },
        resist: item.resist || { physical: 0, magic: 0 },
      };
    }
  }
  return equip;
}

function migrateV14(raw: unknown): GameState {
  const base = freshGame();
  if (!raw || typeof raw !== "object") return base;
  const old = raw as Record<string, unknown>;
  const oldHero = old.hero && typeof old.hero === "object" ? old.hero as Record<string, unknown> : {};
  const oldMercs = Array.isArray(old.mercs) ? old.mercs as Array<Record<string, unknown>> : [];
  const legacyUnits = oldMercs.map((item, index) => {
    const legacy = legacyMercenaries.find((entry) => entry.id === item.id) || legacyMercenaries[index % legacyMercenaries.length];
    return {
      uid: uid("legacy"),
      templateId: "legacy-" + String(item.id || index),
      nation: "legacy" as const,
      tier: 2 as const,
      special: true,
      name: "傳承・" + String(item.name || legacy.name),
      role: String(item.job || legacy.job),
      skill: legacy.skill,
      image: legacy.idle,
      level: Number(item.level) || 1,
      xp: Number(item.xp) || 0,
      points: Number(item.points) || 0,
      str: Number(item.str) || legacy.str,
      agi: Number(item.agi) || legacy.agi,
      intel: Number(item.intel) || legacy.intel,
      vit: Number(item.vit) || legacy.vit,
      equip: sanitizeEquip(item.equip),
    };
  });
  const oldInventory = Array.isArray(old.inventory)
    ? (old.inventory as Array<Record<string, unknown>>).map((item) => ({
        uid: String(item.uid || uid("migrated")),
        name: String(item.name || "傳承裝備"),
        slot: itemKind(item.slot),
        atk: Number(item.atk) || 0,
        def: Number(item.def) || 0,
        hp: Number(item.hp) || 0,
        image: String(item.image || item.asset || equipmentBases[0].image),
        enhance: Number(item.enhance) || 0,
        rarity: "稀有" as const,
        magic: [magicAffixes[indexHash(String(item.name || "")) % magicAffixes.length] as MagicAffix],
      }))
    : base.inventory;
  const cityMap: Record<string, string> = {
    seoul: "korea-city-1",
    nanjing: "china-city-1",
    beijing: "china-city-2",
    kyoto: "japan-city-1",
    busan: "korea-city-3",
  };
  const mercs = legacyUnits.length ? legacyUnits : base.mercs;
  const migratedCity = cityMap[String(old.city)] || (isNationId(old.city) ? worldCities.find((city) => city.nation === old.city)?.id : null) || worldCities[0].id;
  const migratedCityData = worldCities.find((city) => city.id === migratedCity) || worldCities[0];
  const heroNation = isNationId(oldHero.nation) ? oldHero.nation : migratedCityData.nation;
  const heroBase = makeHero(heroNation, String(oldHero.name || base.hero.name));
  return {
    ...base,
    gold: Number(old.gold) || base.gold,
    stage: Number(old.stage) || base.stage,
    kills: Number(old.kills) || 0,
    city: migratedCity,
    hero: {
      ...heroBase,
      job: String(oldHero.job || oldHero.path || heroBase.job),
      level: Number(oldHero.level) || heroBase.level,
      xp: Number(oldHero.xp) || 0,
      points: Number(oldHero.points) || 0,
      str: Number(oldHero.str) || heroBase.str,
      agi: Number(oldHero.agi) || heroBase.agi,
      intel: Number(oldHero.intel) || heroBase.intel,
      vit: Number(oldHero.vit) || heroBase.vit,
      equip: sanitizeEquip(oldHero.equip),
    },
    mercs,
    active: mercs.slice(0, 9).map((unit) => unit.uid),
    inventory: oldInventory,
    formation: typeof old.formation === "string" ? old.formation : base.formation,
    logs: Array.isArray(old.logs) ? (old.logs as string[]).slice(0, 40) : base.logs,
    lastSeen: Number(old.lastSeen) || Date.now(),
    enemyHp: enemyMax(Number(old.stage) || 1),
  };
}

function restoreGame(raw: unknown): GameState {
  raw = migrateSevenSlotSave(raw);
  const next = migrateV14(raw);
  if (!raw || typeof raw !== "object") return next;
  const parsed = raw as Partial<GameState> & { version?: number; hero?: Partial<Hero> };
  const heroNation = isNationId(parsed.hero?.nation) ? parsed.hero.nation : next.hero.nation;
  const heroDefaults = makeHero(heroNation, String(parsed.hero?.name || next.hero.name));
  const restoredCity = typeof parsed.city === "string" && worldCities.some((city) => city.id === parsed.city)
    ? parsed.city
    : isNationId(parsed.city) ? worldCities.find((city) => city.nation === parsed.city)?.id || next.city : next.city;
  Object.assign(next, parsed, {
    version: 21,
    trade: restoreTrade(parsed.trade),
    credit: Number.isFinite(parsed.credit) ? Math.max(0, Math.floor(parsed.credit!)) : 0,
    idleStamp: Number.isFinite(parsed.idleStamp) && parsed.idleStamp! > 0 ? parsed.idleStamp : Date.now(),
    city: restoredCity,
    hero: {
      ...heroDefaults,
      ...parsed.hero,
      nation: heroNation,
      job: Number(parsed.version) >= 19 && parsed.hero?.job ? parsed.hero.job : heroDefaults.job,
      skill: Number(parsed.version) >= 19 && parsed.hero?.skill ? parsed.hero.skill : heroDefaults.skill,
      image: Number(parsed.version) >= 19 && parsed.hero?.image ? parsed.hero.image : heroDefaults.image,
      equip: sanitizeEquip(parsed.hero?.equip),
    },
    mercs: Array.isArray(parsed.mercs)
      ? parsed.mercs.map((unit) => ({ ...unit, equip: sanitizeEquip(unit.equip) } as Unit))
      : next.mercs,
    inventory: Array.isArray(parsed.inventory)
      ? parsed.inventory.map((item) => ({ ...normalizeStoredItem(item), bonus: item.bonus || { str: 0, agi: 0, intel: 0, vit: 0 }, resist: item.resist || { physical: 0, magic: 0 } }))
      : next.inventory,
    soulStones: Number.isFinite(parsed.soulStones) ? Math.max(0, Number(parsed.soulStones)) : next.soulStones,
    awakeningStones: Number.isFinite(parsed.awakeningStones) ? Math.max(0, Number(parsed.awakeningStones)) : next.awakeningStones,
    materials: parsed.materials && typeof parsed.materials === "object" ? parsed.materials : {},
    medicines: parsed.medicines && typeof parsed.medicines === "object" ? parsed.medicines : {},
    claimedContracts: Array.isArray(parsed.claimedContracts) ? parsed.claimedContracts : [],
    lastSeen: Number(parsed.lastSeen) || Date.now(),
  });
  next.hero = normalizeVitals(next.hero);
  next.mercs = next.mercs.map(normalizeVitals);
  return retainGuildRoster<Equipment, Unit, GameState>(next);
}

function profileFromGame(slot: number, game: GameState): CharacterProfile {
  return { slot, name: game.hero.name, nation: game.hero.nation, level: game.hero.level, stage: game.stage, updatedAt: Date.now() };
}

function settleMerchantGame(previous: GameState, now: number): GameState {
  // 與跑商共用一個每秒計時器，獨立時間戳避免重複領取離線收益。
  const idle = settleCaravanIdle(previous.idleStamp, now);
  if (idle.stamp !== previous.idleStamp) previous = { ...previous, idleStamp: idle.stamp, gold: previous.gold + idle.gold, credit: previous.credit + idle.credit };
  const result = advanceTrade(previous.trade, previous.gold, now);
  if (!result.trips && !result.encounters) return previous;
  let next = {
    ...previous, trade: result.trade, gold: result.gold,
    hero: grantXp(previous.hero, result.xp),
    mercs: previous.mercs.map((unit) => previous.active.includes(unit.uid) ? grantXp(unit, Math.floor(result.xp * 0.8)) : unit),
    logs: result.trips ? addLog(previous.logs, "商隊完成 " + result.trips + " 趟交易，淨利 " + format(result.profit) + " 兩；主角與出戰傭兵獲得經驗。") : previous.logs,
  };
  for (let index = 0; index < result.encounters; index++) next = resolveRoadEncounter(next);
  return next;
}

function inheritMerchantPrototype(raw: string): GameState {
  const old = JSON.parse(raw);
  const next = freshGame("taiwan", "東海商主");
  const number = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;
  next.gold = number(old.gold, next.gold);
  next.stage = Math.max(1, Math.floor(number(old.stage, 1)));
  next.kills = Math.floor(number(old.battlesWon, 0));
  next.enemyHp = enemyMax(next.stage);
  next.trade = restoreTrade({ reputation: number(old.reputation, 0), cargoLevel: number(old.cargoLevel, 1), totalProfit: number(old.totalEarned, 0), selectedRouteId: old.selectedRouteId });
  // The old prototype prepaid its cargo; return that principal when migrating a pending voyage.
  if (old.caravan && typeof old.caravan === "object") {
    const prices: Record<string, number> = { hanji: 36, tea: 54, silk: 82 };
    next.gold += (prices[String(old.caravan.routeId)] || 0) * number(old.caravan.cargo, 0);
  }
  next.logs = ["原商途進度已融合：保留資金、商譽、貨艙與關卡。舊航程貨款已退回，請至中央傭兵公會招募。"];
  return next;
}

function indexHash(text: string) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

function enemyMax(stage: number, mapMultiplier = 1) {
  return Math.floor(250 * Math.pow(1.145, stage - 1) * (stage % 10 === 0 ? 4.5 : 1) * mapMultiplier);
}

function xpNeed(level: number) {
  return 80 + level * 22;
}

function grantXp<T extends Unit | Hero>(unit: T, amount: number): T {
  let xp = unit.xp + amount;
  let level = unit.level;
  let points = unit.points;
  while (level < 250 && xp >= xpNeed(level)) {
    xp -= xpNeed(level);
    level += 1;
    points += unit.uid === "hero" ? 5 : 3;
  }
  return { ...unit, xp, level, points };
}

function affixMultiplier(unit: Unit | Hero, stat: string) {
  return slots.reduce((sum, slot) => {
    const item = unit.equip[slot];
    if (!item) return sum;
    return sum + item.magic.filter((affix) => affix.stat === stat).reduce((value, affix) => value + affix.value, 0);
  }, 0);
}

function equipmentPower(item: Equipment | null) {
  if (!item) return 0;
  const magic = item.magic.reduce((sum, affix) => sum + affix.value * 3.2, 0);
  const bonus = item.bonus ? item.bonus.str * 2.2 + item.bonus.agi * 1.8 + item.bonus.intel * 2 + item.bonus.vit * 2.1 : 0;
  const resist = item.resist ? (item.resist.physical + item.resist.magic) * 2.4 : 0;
  return (item.atk * 2.2 + item.def * 1.6 + item.hp * 0.22 + magic + bonus + resist) * (1 + item.enhance * 0.12);
}

function unitPower(unit: Unit | Hero) {
  const flat = slots.reduce((sum, slot) => {
    const bonus = unit.equip[slot]?.bonus;
    return { str: sum.str + (bonus?.str || 0), agi: sum.agi + (bonus?.agi || 0), intel: sum.intel + (bonus?.intel || 0), vit: sum.vit + (bonus?.vit || 0) };
  }, { str: 0, agi: 0, intel: 0, vit: 0 });
  const str = (unit.str + flat.str) * (1 + affixMultiplier(unit, "str") / 100);
  const agi = (unit.agi + flat.agi) * (1 + affixMultiplier(unit, "agi") / 100);
  const intel = (unit.intel + flat.intel) * (1 + affixMultiplier(unit, "intel") / 100);
  const vit = (unit.vit + flat.vit) * (1 + affixMultiplier(unit, "vit") / 100);
  const base = str * 2.2 + agi * 1.8 + intel * 2 + vit * 2.1;
  const equipment = slots.reduce((sum, slot) => sum + equipmentPower(unit.equip[slot]), 0);
  const tier = "tier" in unit ? unit.tier : 0;
  const special = "special" in unit && unit.special ? 1.3 : 1;
  const awakened = "awakened" in unit && unit.awakened ? 1.38 : 1;
  return Math.floor((base + equipment) * (1 + (unit.level - 1) * 0.075) * (1 + tier * 0.25) * special * awakened);
}

function tierName(unit: Unit) {
  return mercenarySpec(unit.templateId) ? '公會傭兵' : '主角';
}

function addLog(logs: string[], message: string) {
  return [message, ...logs].slice(0, 40);
}

function contractProgress(state: GameState, metric: (typeof gameplayContracts)[number]["metric"]) {
  if (metric === "stage") return state.stage;
  if (metric === "kills") return state.kills;
  if (metric === "mercs") return state.mercs.length;
  if (metric === "tier1") return state.mercs.filter((unit) => unit.tier >= 1).length;
  if (metric === "tier2") return state.mercs.filter((unit) => unit.tier >= 2).length;
  if (metric === "materials") return Object.values(state.materials).reduce((sum, value) => sum + value, 0);
  if (metric === "awakened") return state.mercs.filter((unit) => unit.awakened).length;
  return state.inventory.length + slots.filter((slot) => state.hero.equip[slot]).length + state.mercs.reduce((sum, unit) => sum + slots.filter((slot) => unit.equip[slot]).length, 0);
}

function format(value: number) {
  return Math.floor(value).toLocaleString("zh-TW");
}

function bonusText(item: Equipment) {
  const bonus = item.bonus || { str: 0, agi: 0, intel: 0, vit: 0 };
  return [["力", bonus.str], ["敏", bonus.agi], ["智", bonus.intel], ["體", bonus.vit]]
    .filter((entry) => Number(entry[1]) > 0)
    .map(([label, value]) => label + "+" + value)
    .join("・");
}



function resolveRoadEncounter(previous: GameState): GameState {
      const active = previous.active
        .map((unitUid) => previous.mercs.find((unit) => unit.uid === unitUid))
        .filter(Boolean) as Unit[];
      const form = formations.find((item) => item.id === previous.formation) || formations[0];
      const banditEncounter = isBanditEncounter(previous.battleMap, previous.stage);
      const sourceTarget = banditEncounter ? bandit : sourceEnemyForMap(previous.battleMap, previous.stage, previous.stage % 10 === 0);
      const map = battleMaps.find((entry) => entry.id === previous.battleMap) || battleMaps[0];
      const health = banditEncounter ? bandit.hp : enemyMax(previous.stage, map.hpMultiplier);
      const party = [previous.hero, ...active].map((unit) => ({ uid: unit.uid, templateId: unit.templateId, name: unit.name, skill: unit.skill, ...vitalStats(unit), ...combatStats(unit), attack: Math.floor(combatStats(unit).attack * form.atk), cost: spellCost(unit) }));
      const targetName = sourceTarget?.name || enemyForStage(previous.stage, map.enemyRegion).name;
      const tactical = active.some(unit => !!mercenarySpec(unit.templateId));
      const enemy: TacticalEnemy = { name: targetName, hp: health, ...(banditEncounter ? { attack: bandit.attack, defense: bandit.defense, speed: tactical ? bandit.speed * 5 : bandit.speed } : enemyCombatStats(previous.stage, health, previous.stage % 10 === 0)), physical: sourceTarget?.physical || 0, magic: sourceTarget?.magic || 0, bandit: banditEncounter, boss: previous.stage % 10 === 0, kind: /騎/.test(targetName) ? 'cavalry' : /虎|狼|熊|鹿|獸|龜|蛇|狐|馬/.test(targetName) ? 'beast' : 'human', ranged: /弓|砲|術|巫|法/.test(targetName), magicAttack: /術|巫|法/.test(targetName), poison: /蛇|蠍/.test(targetName) };
      const squad = enemy.boss ? [enemy] : Array.from({length:3},(_,index) => ({ ...enemy, name: targetName+'・'+(index+1), hp: Math.floor(health/3)+(index < health%3 ? 1 : 0), attack: Math.max(1,Math.floor(enemy.attack*0.55)), back: index===2, ranged: index===2 || enemy.ranged }));
      const combat = tactical ? resolveMercenaryBattle(party, squad, banditEncounter ? 'mountain' : map.theme) : resolveVitalBattle(party.map(unit=>({...unit,speed:5})), { ...enemy, terrain: banditEncounter ? 'mountain' : map.theme });
      const remaining = new globalThis.Map(combat.fighters.map((unit) => [unit.uid, unit]));
      const applyRemaining = <T extends Unit | Hero,>(unit: T): T => {
        const fighter = remaining.get(unit.uid);
        return fighter ? { ...unit, hp: fighter.hp, mp: fighter.mp } : unit;
      };
      previous = { ...previous, hero: applyRemaining(previous.hero), mercs: previous.mercs.map(applyRemaining) };
      const rounds = combat.rounds;
      const resourceReport = " 主動技能 " + combat.casts + " 次，消耗 MP " + combat.spentMp + "；普攻 " + combat.attacks + " 次，承受傷害 " + combat.receivedDamage + "。" + (tactical ? ' 敵軍 '+squad.length+' 名；落空 '+combat.misses+' 次。'+combat.spells.slice(0,10).join('；') : '') + (combat.enemySkills.length ? " " + combat.enemySkills.join(" ") : "");
      if (!combat.won) {
        const report = "途中遭遇第 " + previous.stage + " 關「" + (sourceTarget?.name || "敵軍") + "」，" + rounds + " 回合後撤離。" + resourceReport + " 請到客棧或藥店恢復 HP / MP。";
        return { ...previous, enemyHp: health, lastEncounter: report, logs: addLog(previous.logs, report) };
      }
      const isBoss = previous.stage % 10 === 0;
      const selectedMap = battleMaps.find((map) => map.id === previous.battleMap) || battleMaps[0];
      const reward = Math.floor((260 + previous.stage * 60) * (isBoss ? 9 : 1) * selectedMap.goldMultiplier);
      const nextStage = previous.stage + 1;
      const nextKills = previous.kills + 1;
      let inventory = previous.inventory;
      let cores = previous.fusionCores;
      const sourceDefeated = sourceTarget;
      const defeated = sourceDefeated || enemyForStage(previous.stage, selectedMap.enemyRegion);
      const defeatedRegion = sourceDefeated ? selectedMap.name : (defeated as ReturnType<typeof enemyForStage>).region;
      const materials = { ...previous.materials };
      let soulStones = previous.soulStones;
      let awakeningStones = previous.awakeningStones;
      let xpReward = isBoss ? 180 : 42;
      const report = "途中遭遇「" + defeatedRegion + "・" + defeated.name + "」，" + rounds + " 回合獲勝，獲得 " + format(reward) + " 兩。" + resourceReport;
      let logs = addLog(previous.logs, report);
      if (combat.spells.length) logs = addLog(logs, combat.spells.join("；"));
      if (sourceDefeated) {
        const material = sourceDefeated.drops[Math.floor(Math.random() * sourceDefeated.drops.length)];
        materials[material] = (materials[material] || 0) + 1;
        xpReward = Math.max(42, Math.min(1800, Math.floor(sourceDefeated.xp / 5) + 35));
        logs = addLog(logs, (banditEncounter ? "山賊掉落「" : "52怪物掉落「") + material + "」；經驗資料 " + format(sourceDefeated.xp) + "。");
      }
      if (nextKills % 4 === 0 || isBoss) {
        const drop = rollEquipment(previous.stage, isBoss);
        inventory = [drop, ...inventory];
        logs = addLog(logs, "獲得 " + drop.rarity + "裝備「" + drop.name + "」，附帶 " + drop.magic.length + " 條魔法屬性。");
      }
      return {
        ...previous,
        gold: previous.gold + reward,
        stage: nextStage,
        kills: nextKills,
        lastEncounter: report,
        enemyHp: enemyMax(nextStage, selectedMap.hpMultiplier),
        inventory,
        fusionCores: cores,
        soulStones,
        awakeningStones,
        materials,
        hero: grantXp(previous.hero, xpReward),
        mercs: previous.mercs.map((unit) =>
          previous.active.includes(unit.uid) ? grantXp(unit, Math.floor(xpReward * 0.8)) : unit,
        ),
        logs,
      };
}

export default function GameV15() {
  const [game, setGame] = useState<GameState>(freshGame);
  const [ready, setReady] = useState(false);
  const [profiles, setProfiles] = useState<Array<CharacterProfile | null>>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [creatorSlot, setCreatorSlot] = useState<number | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [characterNation, setCharacterNation] = useState<NationId>("taiwan");
  const [notice, setNotice] = useState("");
  const [selectedUid, setSelectedUid] = useState("hero");
  const [cityService, setCityService] = useState<CityService>("mercenary");
  const [gemSlot, setGemSlot] = useState<EquipmentSlot>('armor');
  const [sharedWarehouse, setSharedWarehouse] = useState<Equipment[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const savedProfiles = localStorage.getItem(PROFILE_INDEX);
      const savedWarehouse = localStorage.getItem(SHARED_WAREHOUSE_SAVE);
      let nextProfiles: Array<CharacterProfile | null> = savedProfiles ? JSON.parse(savedProfiles) : [null, null, null];
      nextProfiles = [0, 1, 2].map((slot) => {
        const profile = nextProfiles[slot];
        return profile && isNationId(profile.nation) ? { ...profile, slot } : null;
      });
      if (!nextProfiles.some(Boolean)) {
        const legacy = localStorage.getItem(V18_SAVE) || localStorage.getItem(V17_SAVE) || localStorage.getItem(V16_SAVE) || localStorage.getItem(V15_SAVE) || localStorage.getItem(V14_SAVE);
        if (legacy) {
          const inherited = restoreGame(JSON.parse(legacy));
          inherited.logs = addLog(inherited.logs, "舊版進度已轉入第一角色欄位。");
          localStorage.setItem(profileSaveKey(0), JSON.stringify(inherited));
          nextProfiles[0] = profileFromGame(0, inherited);
          localStorage.setItem(PROFILE_INDEX, JSON.stringify(nextProfiles));
        }
        if (!nextProfiles.some(Boolean)) {
          const merchantSave = localStorage.getItem("east-sea-merchant-save-v1");
          if (merchantSave) {
            const inherited = inheritMerchantPrototype(merchantSave);
            localStorage.setItem(profileSaveKey(0), JSON.stringify(inherited));
            nextProfiles[0] = profileFromGame(0, inherited);
            localStorage.setItem(PROFILE_INDEX, JSON.stringify(nextProfiles));
          }
        }
      }
      queueMicrotask(() => {
        setProfiles(nextProfiles);
        setSharedWarehouse(savedWarehouse ? JSON.parse(savedWarehouse).map(normalizeStoredItem) : []);
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
    localStorage.setItem(profileSaveKey(activeSlot), JSON.stringify({ ...game, lastSeen: Date.now() }));
    const nextProfiles = [...profiles];
    nextProfiles[activeSlot] = profileFromGame(activeSlot, game);
    localStorage.setItem(PROFILE_INDEX, JSON.stringify(nextProfiles));
  }, [activeSlot, game, profiles, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(SHARED_WAREHOUSE_SAVE, JSON.stringify(sharedWarehouse.slice(0, WAREHOUSE_LIMIT)));
  }, [ready, sharedWarehouse]);

  function enterCharacter(slot: number) {
    const profile = profiles[slot];
    if (!profile) return;
    try {
      const raw = localStorage.getItem(profileSaveKey(slot));
      if (raw) backupBeforeGuildMigration(localStorage, profileSaveKey(slot), raw);
      if (raw) backupBeforeEquipmentMigration(localStorage, profileSaveKey(slot), raw);
      let next = raw ? restoreGame(JSON.parse(raw)) : freshGame(profile.nation, profile.name);
      const now = currentTimestamp();
      const before = next.gold;
      next = settleMerchantGame(next, now);
      if (now - next.lastSeen >= 60000) setNotice("離線跑商與途中遭遇已結算，資金增加 " + format(next.gold - before) + " 兩（最多 8 小時）。");
      next.lastSeen = now;
      setGame(next);
      setSelectedUid("hero");
      setCityService("mercenary");
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
    const next = freshGame(characterNation, name);
    const nextProfiles = [...profiles];
    nextProfiles[creatorSlot] = profileFromGame(creatorSlot, next);
    localStorage.setItem(profileSaveKey(creatorSlot), JSON.stringify(next));
    localStorage.setItem(PROFILE_INDEX, JSON.stringify(nextProfiles));
    setProfiles(nextProfiles);
    setGame(next);
    setCityService("mercenary");
    setSelectedUid("hero");
    setActiveSlot(creatorSlot);
    setCreatorSlot(null);
    setCharacterName("");
    setNotice("角色「" + name + "」建立完成。");
  }

  function returnToCharacterSelect() {
    if (activeSlot === null) return;
    const nextProfiles = [...profiles];
    nextProfiles[activeSlot] = profileFromGame(activeSlot, game);
    localStorage.setItem(profileSaveKey(activeSlot), JSON.stringify({ ...game, lastSeen: Date.now() }));
    localStorage.setItem(PROFILE_INDEX, JSON.stringify(nextProfiles));
    setProfiles(nextProfiles);
    setActiveSlot(null);
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
  const formation = formations.find((item) => item.id === game.formation) || formations[0];
  const teamPower = Math.floor(
    (unitPower(game.hero) + activeUnits.reduce((sum, unit) => sum + unitPower(unit), 0)) * formation.atk,
  );
  const currentMap = battleMaps.find((map) => map.id === game.battleMap) || battleMaps[0];
  const banditEncounter = isBanditEncounter(currentMap.id, game.stage);
  const maxEnemyHp = banditEncounter ? bandit.hp : enemyMax(game.stage, currentMap.hpMultiplier);
  const boss = game.stage % 10 === 0;
  const monsterStats = banditEncounter ? bandit : enemyCombatStats(game.stage, maxEnemyHp, boss);
  const enemyArt = legacyMercenaries[9 + (game.stage % 3)];
  const sourcedEnemy = banditEncounter ? bandit : sourceEnemyForMap(currentMap.id, game.stage, boss);
  const fallbackEnemy = enemyForStage(game.stage, currentMap.enemyRegion);
  const enemy = sourcedEnemy || fallbackEnemy;
  const enemyRegion = sourcedEnemy ? currentMap.name : fallbackEnemy.region;
  const enemyCategory = sourcedEnemy ? (sourcedEnemy.boss ? "首領" : "怪物") : fallbackEnemy.category;
  const currentCity = worldCities.find((city) => city.id === game.city) || worldCities[0];
  const currentNation = nations.find((nation) => nation.id === currentCity.nation) || nations[0];
  const heroNation = nations.find((nation) => nation.id === game.hero.nation) || nations[0];
  const cityArmors = officialEquipment.filter((item) => item.kind === "armor").filter((_, index) => index % 5 === currentCity.stockIndex).slice(0, 8);
  const cityWeapons = officialEquipment.filter((item) => item.kind === "weapon").filter((_, index) => index % 5 === currentCity.stockIndex).slice(0, 8);


  function selectBattleMap(mapId: string) {
    const map = battleMaps.find((entry) => entry.id === mapId);
    if (!map) return;
    setGame((previous) => {
      if (previous.stage < map.unlockStage) {
        setNotice("需要通過第 " + map.unlockStage + " 關才能進入「" + map.name + "」。");
        return previous;
      }
      return {
        ...previous,
        battleMap: map.id,
        enemyHp: enemyMax(previous.stage, map.hpMultiplier),
        logs: addLog(previous.logs, "商團遠征轉移至「" + map.name + "」。"),
      };
    });
  }

  useEffect(() => {
    if (!ready || activeSlot === null) return;
    const timer = window.setInterval(() => setGame((previous) => settleMerchantGame(previous, Date.now())), 1000);
    return () => window.clearInterval(timer);
  }, [ready, activeSlot]);

  function sendCaravan(routeId: string) {
    const now = Date.now();
    setGame((previous) => {
      const result = dispatchTrade(previous.trade, previous.gold, routeId, previous.stage, previous.active.length, now);
      if (result.error) return { ...previous, logs: addLog(previous.logs, result.error) };
      const route = TRADE_ROUTES.find((item) => item.id === routeId)!;
      return { ...previous, gold: result.gold, trade: result.trade, logs: addLog(previous.logs, route.from + " → " + route.to + "：商隊裝載「" + route.good + "」啟航。") };
    });
  }

  function upgradeCaravan() {
    setGame((previous) => {
      const cost = upgradeCost(previous.trade.cargoLevel);
      if (previous.trade.caravan || previous.trade.cargoLevel >= MAX_CARGO_LEVEL || previous.gold < cost) return previous;
      return { ...previous, gold: previous.gold - cost, trade: { ...previous.trade, cargoLevel: previous.trade.cargoLevel + 1 }, logs: addLog(previous.logs, "貨艙升級成功，增加 5 箱載貨量。") };
    });
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
  }, [ready, activeSlot]);


  function recruitMerchant(spec: MercenarySpec, index: number) {
    const cost = Math.floor(6000 * currentCity.priceFactor);
    setGame(previous => {
      if (previous.gold < cost || previous.mercs.length >= 9) return { ...previous, logs: addLog(previous.logs, previous.mercs.length >= 9 ? '商隊已滿九席，無法再僱用。' : '僱用資金不足。') };
      const unit = normalizeVitals<Unit>({ uid: uid('merchant-'+spec.id), templateId: 'merchant-'+spec.id, nation: 'legacy', tier: 0, special: false, name: spec.name, role: spec.role, skill: spec.active, image: mercenaryPortrait(index), level: 1, xp: 0, points: 0, str: spec.ratings[1], agi: spec.ratings[3], vit: spec.ratings[0], intel: spec.mp ? 20 : 10, equip: emptyEquipment() });
      return { ...previous, gold: previous.gold-cost, mercs: [...previous.mercs,unit], active: [...previous.active, unit.uid].slice(0,9), logs: addLog(previous.logs,'招募 '+spec.name+'，已加入護商隊。') };
    });
  }

  function toggleActive(unitUid: string) {
    setGame((previous) => {
      if (previous.active.includes(unitUid)) {
        return { ...previous, active: previous.active.filter((id) => id !== unitUid) };
      }
      if (previous.active.length >= 9) {
        setNotice("出戰傭兵最多 9 人，主角不佔欄位。");
        return previous;
      }
      return { ...previous, active: [...previous.active, unitUid] };
    });
  }


  function trainSelected() {
    if (selectedUid === "hero") return;
    setGame((previous) => {
      if (previous.gold < 5000) {
        setNotice("集訓需要 5,000 兩。");
        return previous;
      }
      return {
        ...previous,
        gold: previous.gold - 5000,
        mercs: previous.mercs.map((unit) => (unit.uid === selectedUid ? grantXp(unit, 1500) : unit)),
      };
    });
  }

  function addStat(stat: "str" | "agi" | "intel" | "vit") {
    setGame((previous) => {
      if (selectedUid === "hero") {
        if (previous.hero.points <= 0) return previous;
        return {
          ...previous,
          hero: { ...previous.hero, [stat]: previous.hero[stat] + 1, points: previous.hero.points - 1 },
        };
      }
      return {
        ...previous,
        mercs: previous.mercs.map((unit) =>
          unit.uid === selectedUid && unit.points > 0
            ? { ...unit, [stat]: unit[stat] + 1, points: unit.points - 1 }
            : unit,
        ),
      };
    });
  }

  function equipItem(itemUid: string, requestedSlot?: EquipmentSlot) {
    setGame((previous) => {
      const target = selectedUid === "hero" ? previous.hero : previous.mercs.find((unit) => unit.uid === selectedUid);
      if (!target) return previous;
      const result = equipFromInventory<Equipment,Unit|Hero>(target,previous.inventory,itemUid,requestedSlot);
      if(result.error) { setNotice(result.error); return previous; }
      const unit=normalizeVitals(result.unit);
      return selectedUid==='hero' ? {...previous,inventory:result.inventory,hero:unit as Hero} : {...previous,inventory:result.inventory,mercs:previous.mercs.map(old=>old.uid===selectedUid ? unit : old)};
    });
  }

  function unequipItem(slot:EquipmentSlot) {
    setGame(previous=>{
      const target=selectedUid==='hero'?previous.hero:previous.mercs.find(unit=>unit.uid===selectedUid);
      if(!target) return previous;
      const result=unequipToInventory<Equipment,Unit|Hero>(target,previous.inventory,slot);
      const unit=normalizeVitals(result.unit);
      return selectedUid==='hero'?{...previous,inventory:result.inventory,hero:unit as Hero}:{...previous,inventory:result.inventory,mercs:previous.mercs.map(old=>old.uid===selectedUid?unit:old)};
    });
  }

  function buyWearable(base:WearableBase) {
    const price=Math.floor(base.price*currentCity.priceFactor);
    setGame(previous=>{
      if(previous.gold<price) { setNotice('裝備商店資金不足。'); return previous; }
      const item:Equipment={...base,uid:uid(base.id),enhance:0,rarity:'普通',magic:[],requiredLevel:1};
      return {...previous,gold:previous.gold-price,inventory:[item,...previous.inventory],logs:addLog(previous.logs,'購入「'+item.name+'」。')};
    });
  }

  function buyMagicEquipment() {
    const cost = 12000;
    setGame((previous) => {
      if (previous.gold < cost) {
        setNotice("裝備商店資金不足。");
        return previous;
      }
      const item = rollEquipment(previous.stage, true);
      return {
        ...previous,
        gold: previous.gold - cost,
        inventory: [item, ...previous.inventory],
        logs: addLog(previous.logs, "購入附魔裝備「" + item.name + "」。"),
      };
    });
  }

  function buyOfficialItem(record: OfficialEquipment, price = record.price) {
    setGame((previous) => {
      if (previous.gold < price) {
        setNotice("購買「" + record.name + "」的資金不足。");
        return previous;
      }
      const item = makeOfficialEquipment(record);
      return { ...previous, gold: previous.gold - price, inventory: [item, ...previous.inventory], logs: addLog(previous.logs, "從" + currentCity.name + (record.kind === "weapon" ? "武器商店" : "防具商店") + "購入「" + record.name + "」。") };
    });
  }

  function travelToCity(cityId: string) {
    const destination = worldCities.find((city) => city.id === cityId);
    if (!destination || destination.id === game.city) return;
    setGame((previous) => {
      const origin = worldCities.find((city) => city.id === previous.city) || worldCities[0];
      const sameNation = origin.nation === destination.nation;
      const cost = sameNation ? Math.floor(destination.travelFee * 0.45) : destination.travelFee;
      if (previous.gold < cost) {
        setNotice("前往「" + destination.name + "」需要 " + format(cost) + " 兩旅費。");
        return previous;
      }
      return { ...previous, city: destination.id, gold: previous.gold - cost, logs: addLog(previous.logs, "商團抵達「" + destination.name + "」。") };
    });
    setCityService("mercenary");
  }

  function depositToWarehouse(itemUid: string) {
    if (sharedWarehouse.length >= WAREHOUSE_LIMIT) {
      setNotice("共用倉庫已達 30 格上限。");
      return;
    }
    const item = game.inventory.find((entry) => entry.uid === itemUid);
    if (!item) return;
    setGame((previous) => ({ ...previous, inventory: previous.inventory.filter((entry) => entry.uid !== itemUid), logs: addLog(previous.logs, "將「" + item.name + "」存入三角色共用倉庫。") }));
    setSharedWarehouse((previous) => [...previous, item].slice(0, WAREHOUSE_LIMIT));
  }

  function withdrawFromWarehouse(itemUid: string) {
    const item = sharedWarehouse.find((entry) => entry.uid === itemUid);
    if (!item) return;
    setSharedWarehouse((previous) => previous.filter((entry) => entry.uid !== itemUid));
    setGame((previous) => ({ ...previous, inventory: [item, ...previous.inventory], logs: addLog(previous.logs, "從共用倉庫取出「" + item.name + "」。") }));
  }

  function restAtInn() {
    const cost = Math.floor(1800 * currentCity.priceFactor);
    setGame((previous) => {
      if (previous.gold < cost) {
        setNotice("入住客棧需要 " + format(cost) + " 兩。");
        return previous;
      }
      return {
        ...previous,
        gold: previous.gold - cost,
        hero: recoverVitals(grantXp(previous.hero, 700)),
        mercs: previous.mercs.map((unit) => recoverVitals(previous.active.includes(unit.uid) ? grantXp(unit, 550) : unit)),
        logs: addLog(previous.logs, "在" + currentCity.name + "客棧休息，全員 HP / MP 恢復至上限，主角與出戰傭兵獲得修練經驗。"),
      };
    });
  }

  function buyMedicine(medicineId: string) {
    const medicine = medicineCatalog.find((entry) => entry.id === medicineId);
    if (!medicine) return;
    const price = Math.floor(medicine.price * currentCity.priceFactor);
    setGame((previous) => {
      if (previous.gold < price) {
        setNotice("購買「" + medicine.name + "」的資金不足。");
        return previous;
      }
      return { ...previous, gold: previous.gold - price, medicines: { ...previous.medicines, [medicine.id]: (previous.medicines[medicine.id] || 0) + 1 }, logs: addLog(previous.logs, "在" + currentCity.name + "藥店購入「" + medicine.name + "」。") };
    });
  }

  function consumeMedicine(medicineId: string) {
    const medicine = medicineCatalog.find((entry) => entry.id === medicineId);
    if (!medicine) return;
    setGame((previous) => {
      if ((previous.medicines[medicine.id] || 0) <= 0) {
        setNotice("目前沒有「" + medicine.name + "」。");
        return previous;
      }
      return {
        ...previous,
        medicines: { ...previous.medicines, [medicine.id]: previous.medicines[medicine.id] - 1 },
        hero: recoverVitals(grantXp(previous.hero, medicine.heroXp), "hpRestore" in medicine ? medicine.hpRestore : 0, "mpRestore" in medicine ? medicine.mpRestore : 0),
        mercs: previous.mercs.map((unit) => previous.active.includes(unit.uid) ? recoverVitals(grantXp(unit, medicine.mercXp), "hpRestore" in medicine ? medicine.hpRestore : 0, "mpRestore" in medicine ? medicine.mpRestore : 0) : unit),
        logs: addLog(previous.logs, "使用「" + medicine.name + "」：" + medicine.effect + "。"),
      };
    });
  }

  function socketGem(gemId: string, grade: number) {
    const gem = officialGems.find((entry) => entry.id === gemId);
    if (!gem) return;
    setGame((previous) => {
      const target = selectedUid === "hero" ? previous.hero : previous.mercs.find((unit) => unit.uid === selectedUid);
      if (!target) return previous;
      const slot = gemSlot;
      if (!target.equip[slot]) {
        setNotice('請先在'+slotLabels[slot]+'欄穿戴裝備。');
        return previous;
      }
      const cost = gem.costs[grade];
      if (previous.gold < cost) {
        setNotice("寶石加工資金不足。");
        return previous;
      }
      const equip = { ...target.equip };
      const item = equip[slot]!;
      const bonus = { ...(item.bonus || { str: 0, agi: 0, intel: 0, vit: 0 }) };
      if (gem.stat === "all") {
        bonus.str += gem.values[grade]; bonus.agi += gem.values[grade]; bonus.intel += gem.values[grade]; bonus.vit += gem.values[grade];
      } else bonus[gem.stat] += gem.values[grade];
      equip[slot] = { ...item, name: item.name + "・" + gem.name, bonus };
      const common = { ...previous, gold: previous.gold - cost, logs: addLog(previous.logs, gem.name + "已鑲嵌至「" + item.name + "」。") };
      return selectedUid === "hero"
        ? { ...common, hero: { ...previous.hero, equip } }
        : { ...common, mercs: previous.mercs.map((unit) => unit.uid === selectedUid ? { ...unit, equip } : unit) };
    });
  }

  function claimContract(contractId: string) {
    setGame((previous) => {
      const contract = gameplayContracts.find((entry) => entry.id === contractId);
      if (!contract || previous.claimedContracts.includes(contractId)) return previous;
      if (contractProgress(previous, contract.metric) < contract.target) {
        setNotice("委託條件尚未完成。");
        return previous;
      }
      return {
        ...previous,
        gold: previous.gold + contract.reward.gold,
        claimedContracts: [...previous.claimedContracts, contractId],
        logs: addLog(previous.logs, "完成委託「" + contract.name + "」，領取商團獎勵。"),
      };
    });
  }

  const selectedUnit = selected as Unit;

  if (!ready) return <div className="game-loading">正在整理四國角色欄位…</div>;

  if (activeSlot === null) {
    return (
      <main className="character-select-screen">
        <section className="character-select-shell">
          <div className="character-select-heading">
            <div className="brand-seal">商</div>
            <div><small>商途 × BT52Gersang・融合版 V21</small><h1>從一支商隊，走向四海。</h1><p>四國二十城 × 九人傭兵 × 放置貿易。三個角色各自保存進度，共用 30 格裝備倉庫。</p><span className="shared-warehouse-badge"><Warehouse />共用倉庫 {sharedWarehouse.length}/{WAREHOUSE_LIMIT}</span></div>
          </div>
          {notice && <button className="notice" onClick={() => setNotice("")}><Sparkles />{notice}<span>點擊關閉</span></button>}
          <div className="character-slot-grid">
            {[0, 1, 2].map((slot) => {
              const profile = profiles[slot];
              const nation = profile ? nations.find((entry) => entry.id === profile.nation) : null;
              return profile && nation ? (
                <article className="character-slot occupied" key={slot} style={{ "--nation-color": nation.color } as React.CSSProperties}>
                  <span className="slot-number">角色欄位 {slot + 1}</span>
                  <img src={heroNationProfiles[profile.nation].image} alt={profile.name} />
                  <div><small>{nation.name}・{heroNationProfiles[profile.nation].title}</small><h2>{profile.name}</h2><p>Lv.{profile.level}・第 {profile.stage} 關</p><em>起始城市・{nation.capital}</em></div>
                  <Button onClick={() => enterCharacter(slot)}><Play />進入遊戲</Button>
                </article>
              ) : (
                <article className="character-slot empty" key={slot}>
                  <span className="slot-number">角色欄位 {slot + 1}</span>
                  <div className="empty-slot-mark"><Crown /></div>
                  <div><h2>尚未建立角色</h2><p>選擇國家並建立新的商團主角。</p></div>
                  <Button variant="outline" onClick={() => { setCreatorSlot(slot); setCharacterName(""); setCharacterNation("taiwan"); }}>建立角色</Button>
                </article>
              );
            })}
          </div>

          {creatorSlot !== null && (
            <section className="character-creator">
              <div className="panel-title"><Crown /><h2>建立角色・欄位 {creatorSlot + 1}</h2><span>選定後仍可遊歷四國</span></div>
              <label className="character-name-field"><span>角色名稱</span><input autoFocus maxLength={12} value={characterName} onChange={(event) => setCharacterName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createCharacter(); }} placeholder="輸入 1～12 個字" /></label>
              <div className="creator-nations">
                {nations.map((nation) => {
                  const profile = heroNationProfiles[nation.id];
                  return <button type="button" key={nation.id} className={characterNation === nation.id ? "active" : ""} style={{ "--nation-color": nation.color } as React.CSSProperties} onClick={() => setCharacterNation(nation.id)}>
                    <img src={profile.image} alt="" /><span><strong>{nation.name}</strong><small>{profile.title}・{nation.capital}</small><em>{profile.skill}</em></span>
                  </button>;
                })}
              </div>
              <div className="creator-actions"><Button variant="outline" onClick={() => setCreatorSlot(null)}>取消</Button><Button onClick={createCharacter}><Sparkles />建立並開始</Button></div>
            </section>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell v15-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-seal">合</div>
          <div><h1>商途・巨商放置錄</h1><p>V21・東海商路 × 四國二十城</p></div>
        </div>
        <div className="resource-strip v15-resources">
          <div><Coins /><span>{format(game.gold)}</span><small>兩</small></div>
          <div><Swords /><span>{format(unitPower(game.hero)+game.mercs.reduce((sum,unit)=>sum+unitPower(unit),0))}</span><small>總商隊戰力</small></div>
          <div><Users /><span>{game.active.length}/9</span><small>出戰傭兵</small></div>
          <Button className="character-switch" variant="outline" size="sm" onClick={returnToCharacterSelect}><Users />切換角色</Button>
        </div>
      </header>

      {notice && <button className="notice" onClick={() => setNotice("")}><Sparkles />{notice}<span>點擊關閉</span></button>}

      <Tabs defaultValue="trade" className="game-tabs">
        <TabsList className="nav-list v15-nav">
          <TabsTrigger value="trade"><Ship />東海商路</TabsTrigger>
          <TabsTrigger value="battle"><Swords />遭遇戰報</TabsTrigger>
          <TabsTrigger value="squad"><Users />主角與隊伍</TabsTrigger>
          <TabsTrigger value="city"><Castle />四國城市</TabsTrigger>
          <TabsTrigger value="contracts"><BookOpen />冒險委託</TabsTrigger>
        </TabsList>

        <TabsContent value="trade" className="tab-panel">
          <TradePanel trade={game.trade} gold={game.gold} stage={game.stage} escorts={game.active.length} logs={game.logs} lastEncounter={game.lastEncounter}
            onDispatch={sendCaravan} onUpgrade={upgradeCaravan}
            onSelect={(selectedRouteId) => setGame((previous) => ({ ...previous, trade: { ...previous.trade, selectedRouteId } }))}
            onToggleAuto={() => setGame((previous) => ({ ...previous, trade: { ...previous.trade, auto: !previous.trade.auto } }))} />
        </TabsContent>

        <TabsContent value="battle" className="tab-panel">
          <section className={"battlefield map-theme-" + currentMap.theme}>
            <div className="battle-sky v15-battle">
              <div className="stage-mark"><small>{currentMap.name}・{boss ? "世界首領" : "區域遠征"}</small><strong>第 {game.stage} 關</strong></div>
              <div className="squad-sprites">
                <figure className="sprite hero-sprite"><img src={game.hero.image} alt={game.hero.name} /><figcaption>{game.hero.name}</figcaption></figure>
                {activeUnits.map((unit) => <figure className="sprite" key={unit.uid}><img src={unit.image} alt={unit.name} /><figcaption>{unit.name}</figcaption></figure>)}
              </div>
              <div className="versus">VS</div>
              <figure className={"enemy-sprite " + (boss ? "boss" : "")}><img src={enemyArt.idle} alt={enemy.name} /><figcaption><small>下一次遭遇目標・{enemyRegion}・{enemyCategory}</small>{enemy.name}</figcaption></figure>
            </div>
            <div className="battle-console">
              <div className="enemy-health">
                <div className="combat-stat-pair"><span>怪物 ATK 攻擊力 <b>{format(monsterStats.attack)}</b></span><span>怪物 DEF 防禦力 <b>{format(monsterStats.defense)}</b></span></div>
                <div><strong>{boss ? "首領" : "敵軍"}生命</strong><span>{format(banditEncounter ? maxEnemyHp : game.enemyHp)} / {format(maxEnemyHp)}</span></div>
                <Progress value={banditEncounter ? 100 : Math.max(0, Math.min(100, game.enemyHp / maxEnemyHp * 100))} className="hp-progress" />
              </div>
              {sourcedEnemy && <div className="enemy-source-line"><span>經驗資料 {format(sourcedEnemy.xp)}</span><span>物抗 {sourcedEnemy.physical}%</span><span>法抗 {sourcedEnemy.magic}%</span>{sourcedEnemy.skill && <span>技能・{sourcedEnemy.skill}</span>}<span>掉落・{sourcedEnemy.drops.join("、")}</span></div>}
              {banditEncounter && <div className="enemy-source-line"><span>低階山賊・朝鮮山道</span><span>相對強度（1–10）：生命 3／攻擊 3／防禦 2／移速 5</span><span>移速 {bandit.speed}・較快者先行動；同速時我方先手</span><span>山寨地利：山道、森林、山寨前 2 回合減傷 15%。</span><span>攔路劈砍：第 2 回合起，冷卻 3 回合；130% 傷害，移速 −1 至下回合結束。</span><span>揚沙偷襲：HP 低於 50% 時優先施放，每戰一次；60% 傷害，目標下次攻擊命中率由 100% 降為 80%。武技不耗 MP。</span></div>}
              <div className="battle-actions">
                {activeUnits.some(unit => !!mercenarySpec(unit.templateId)) && <p>戰術遭遇：{boss ? '首領 1 名' : '敵軍 3 名（前排 2、後排 1）'}。上方生命為敵軍合計，單名攻擊為 {format(boss ? monsterStats.attack : Math.max(1,Math.floor(monsterStats.attack*0.55)))}。技能會自動選擇目標。</p>}
                <p role="status">{game.trade.caravan ? "跑商途中機率遭遇，每趟 0～10 場，隊伍自動迎戰。" : "商隊尚未出航，不會發生戰鬥。請至東海商路派遣商隊。"}<br />最近戰報：{game.lastEncounter}</p>
              </div>
            </div>
          </section>
          <section className="panel party-vitals">
            <div className="panel-title"><Users /><h2>出戰隊伍狀態</h2><span>HP / MP 跨場保留</span></div>
            <p>HP 歸零暫停參戰；MP 不足改用普通攻擊。客棧恢復全員，藥店可購買金創藥與回靈散。</p>
            <div className="party-vitals-grid">{[game.hero, ...activeUnits].map((unit) => <article key={unit.uid}><strong>{unit.name} · Lv.{unit.level}</strong><VitalBars unit={unit} /><small>{unit.skill} · {spellCost(unit)} MP / 次</small></article>)}</div>
          </section>
          <section className="panel battle-map-panel">
            <div className="panel-title"><Map /><h2>戰鬥地圖</h2><span>8 個區域・關卡解鎖</span></div>
            <div className="battle-map-grid">
              {battleMaps.map((map) => {
                const unlocked = game.stage >= map.unlockStage;
                return <button key={map.id} className={(currentMap.id === map.id ? "active " : "") + (unlocked ? "" : "locked")} onClick={() => selectBattleMap(map.id)}>
                  <span className={"map-swatch map-theme-" + map.theme}></span>
                  <div><small>{map.region}・第 {map.unlockStage} 關</small><strong>{map.name}</strong><p>{map.description}</p><em>生命 ×{map.hpMultiplier}・金錢 ×{map.goldMultiplier}</em></div>
                  <b>{currentMap.id === map.id ? "遠征中" : unlocked ? "前往" : "未解鎖"}</b>
                </button>;
              })}
            </div>
          </section>
          <div className="battle-grid">
            <section className="panel">
              <div className="panel-title"><Crown /><h2>獨立主角欄位</h2><span>不佔傭兵上限</span></div>
              <div className="hero-independent">
                <img src={game.hero.image} alt="" />
                <div><small>{heroNation.name}主角・{game.hero.job}</small><strong>{game.hero.name}</strong><span>Lv.{game.hero.level}｜{game.hero.skill}｜戰力 {format(unitPower(game.hero))}</span></div>
                <em>固定出戰</em>
              </div>
            </section>
            <section className="panel log-panel">
              <div className="panel-title"><BookOpen /><h2>商團與戰鬥紀錄</h2></div>
              <div className="log-list">{game.logs.map((log, index) => <p key={index}>{log}</p>)}</div>
            </section>
            <section className="panel loot-panel">
              <div className="panel-title"><PackageOpen /><h2>52 怪物戰利品</h2><span>{Object.values(game.materials).reduce((sum, value) => sum + value, 0)} 件</span></div>
              <div className="loot-tags">{Object.entries(game.materials).length ? Object.entries(game.materials).map(([name, count]) => <span key={name}>{name}<strong>×{count}</strong></span>) : <p>在朝鮮地面或千年湖擊敗怪物後取得資料頁對應掉落。</p>}</div>
            </section>
          </div>
        </TabsContent>


        <TabsContent value="squad" className="tab-panel">
          <CaravanStatus hero={game.hero} mercs={game.mercs} gold={game.gold} credit={game.credit}
            weight={[...game.inventory,...Object.values(game.hero.equip)].reduce((sum,item)=>sum+(item?({weapon:5,helm:3,armor:12,boots:3,ring:0.2,gloves:2,amulet:1,accessory:1}[itemKind(item.slot)]||1):0),0)}
            maxWeight={40+game.hero.str*5} cost={Math.floor(6000*currentCity.priceFactor)} power={unit=>unitPower(unit as Unit)} xpNeed={xpNeed} select={setSelectedUid}
            hire={()=>{ const index=Math.floor(Math.random()*merchantMercenaries.length); recruitMerchant(merchantMercenaries[index],index); }}
            train={()=>setGame(previous=>({...previous,hero:grantXp(previous.hero,100),mercs:previous.mercs.map(unit=>grantXp(unit,100)),logs:addLog(previous.logs,'模擬打怪：主角與所有已僱用傭兵各獲得 100 經驗。')}))}
            allocate={stat=>setGame(previous=>previous.hero.points>0?({...previous,hero:{...previous.hero,[stat]:previous.hero[stat]+1,points:previous.hero.points-1}}):previous)} />
          <div className="caravan-detail-layout">
            <section className="panel unit-detail">
              <div className="unit-heading">
                <img src={selected.image} alt={selected.name} />
                <div><small>{selectedUid === "hero" ? heroNation.name + "主角" : tierName(selectedUnit)}</small><h2>{selected.name}</h2><p>Lv.{selected.level} {selected.role}｜{selected.skill}｜戰力 {format(unitPower(selected))}</p></div>
                {selectedUid !== "hero" && <Button variant={game.active.includes(selectedUid) ? "secondary" : "default"} onClick={() => toggleActive(selectedUid)}>{game.active.includes(selectedUid) ? "撤下" : "出戰"}</Button>}
              </div>
              <div className="xp-line"><span>經驗 {selected.xp} / {xpNeed(selected.level)}</span><Progress value={selected.xp / xpNeed(selected.level) * 100} /></div>
              {selectedUid !== 'hero' && <Button variant="outline" onClick={trainSelected}>集訓 +1,500 經驗・5,000 兩</Button>}
              <VitalBars unit={selected} />
              <p className="points">攻防已包含能力、等級與裝備加成；陣法另影響實戰攻擊。主動技能・{selected.skill}｜每次消耗 <strong>{spellCost(selected)} MP</strong>。公會傭兵依條件與冷卻施放；武技不耗 MP。魔力不足改用普攻，HP 歸零停止參戰。</p>
              <div className="stat-grid">
                {(["str", "agi", "intel", "vit"] as const).map((stat) => (
                  <div key={stat}><small>{stat === "str" ? "力量" : stat === "agi" ? "敏捷" : stat === "intel" ? "智力" : "體質"}</small><strong>{selected[stat]}</strong><Button size="icon-xs" variant="outline" disabled={selected.points <= 0} onClick={() => addStat(stat)}>＋</Button></div>
                ))}
              </div>
              <p className="points">可分配能力點：<strong>{selected.points}</strong></p>
              <div className="equipment-title"><Shield /><h3>八格裝備與額外魔法屬性</h3></div>
              <div className="equipment-grid">
                {slots.map((slot) => {
                  const item = selected.equip[slot];
                  return (
                    <article className="equipment-slot magic-slot" key={slot}>
                      {item?.image ? <img src={item.image} alt="" /> : <Shield />}
                      <div><small>{slotLabels[slot]}</small><strong>{item?.name || "未裝備"}</strong>{item && <><span>攻 {item.atk}・防 {item.def}・生命 {item.hp}{bonusText(item) ? "・" + bonusText(item) : ""}</span>{item.skill && <span>裝備技能・{item.skill}</span>}<div className="affix-inline">{item.magic.map((affix) => <em key={affix.id} style={{ color: affix.color }}>{affix.name}：{affix.text}</em>)}</div></>}</div>
                      {item && <Button size="sm" variant="outline" onClick={()=>unequipItem(slot)}>卸下</Button>}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
          <section className="panel inventory-panel">
            <div className="panel-title"><PackageOpen /><h2>附魔裝備物品欄</h2><span>{game.inventory.length} 件</span></div>
            <div className="magic-inventory">
              {game.inventory.map((item) => (
                <article className={"magic-item rarity-" + item.rarity} key={item.uid}>
                  {item.image ? <img src={item.image} alt="" /> : <Shield />}
                  <div><small>{item.rarity}・{slotLabels[item.slot]}・需求 Lv.{item.requiredLevel || 1}</small><strong>{item.name}</strong><span>攻 {item.atk}　防 {item.def}　生命 {item.hp}{bonusText(item) ? "　" + bonusText(item) : ""}</span>{item.skill && <span>裝備技能・{item.skill}</span>}<div>{item.magic.map((affix) => <em key={affix.id} style={{ color: affix.color }}>{affix.name}｜{affix.text}</em>)}</div></div>
                  {compatibleSlots(item.slot).map(slot=><Button key={slot} size="sm" onClick={()=>equipItem(item.uid,slot)}>{slotLabels[slot]}・裝給{selected.name}</Button>)}
                </article>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="city" className="tab-panel">
          <section className="panel city-atlas">
            <div className="panel-title"><Map /><h2>四國二十城</h2><span>每國 5 座城市</span></div>
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
            <div className="city-heading"><div><small>{currentNation.name}・特產 {currentCity.specialty}</small><h2>{currentCity.name}</h2><p>本城設施獨立營業，招募名單、將領與裝備庫存皆依城市不同。</p></div><Castle /></div>
            <div className="city-service-tabs">
              <button className={cityService === "mercenary" ? "active" : ""} onClick={() => setCityService("mercenary")}><Users />中央傭兵公會</button>
              <button className={cityService === "weapon" ? "active" : ""} onClick={() => setCityService("weapon")}><Swords />武器商店</button>
              <button className={cityService === "armor" ? "active" : ""} onClick={() => setCityService("armor")}><Shield />防具商店</button>
              <button className={cityService === "warehouse" ? "active" : ""} onClick={() => setCityService("warehouse")}><Warehouse />倉庫</button>
              <button className={cityService === "inn" ? "active" : ""} onClick={() => setCityService("inn")}><BedDouble />客棧</button>
              <button className={cityService === "pharmacy" ? "active" : ""} onClick={() => setCityService("pharmacy")}><Pill />藥店</button>
            </div>


            {cityService === 'mercenary' && <MercenaryRecruitment gold={game.gold} cost={Math.floor(6000 * currentCity.priceFactor)} recruit={recruitMerchant} />}

            {(cityService === "weapon" || cityService === "armor") && <div className="city-service-body"><div className="panel-title">{cityService === "weapon" ? <Swords /> : <Shield />}<h2>{currentCity.name}{cityService === "weapon" ? "武器商店" : "防具商店"}</h2><span>本城獨立庫存</span></div>
              <div className="official-item-grid">{(cityService === "weapon" ? cityWeapons : cityArmors).map((record) => {
                const price = Math.floor(record.price * currentCity.priceFactor);
                return <article key={record.id}><small>Lv.{record.level}・{record.kind === "weapon" ? "武器" : "防具"}</small><strong>{record.name}</strong><span>{record.atk ? "攻 " + record.atk : "防 " + record.def}{record.skill ? "・" + record.skill : ""}</span><em>{[record.str ? "力+" + record.str : "", record.agi ? "敏+" + record.agi : "", record.intel ? "智+" + record.intel : "", record.vit ? "體+" + record.vit : ""].filter(Boolean).join("・") || "基礎裝備"}</em><Button size="sm" onClick={() => buyOfficialItem(record, price)}>{format(price)} 兩</Button></article>;
              })}</div>
              <div className="official-item-grid">{wearableCatalog.filter(item=>cityService==='weapon'?['weapon','ring','amulet'].includes(item.slot):!['weapon','ring','amulet'].includes(item.slot)).map(item=><article key={item.id}><small>{slotLabels[item.slot]}</small><strong>{item.name}</strong><span>攻 {item.atk} · 防 {item.def} · HP {item.hp}</span><Button onClick={()=>buyWearable(item)}>{format(Math.floor(item.price*currentCity.priceFactor))} 兩</Button></article>)}</div>
              {cityService === "weapon" && <div className="enchant-counter"><div><strong>附魔裝備櫃</strong><p>購入與目前關卡相符、附帶 1～3 條魔法屬性的隨機裝備。</p></div><Button onClick={buyMagicEquipment}><ShoppingBag />12,000 兩</Button></div>}
            </div>}

            {cityService === "warehouse" && <div className="city-service-body warehouse-service"><div className="panel-title"><Warehouse /><h2>三角色共用倉庫</h2><span>{sharedWarehouse.length}/{WAREHOUSE_LIMIT} 格</span></div><Progress value={sharedWarehouse.length / WAREHOUSE_LIMIT * 100} />
              <div className="warehouse-columns"><section><h3>{game.hero.name} 的物品欄</h3>{game.inventory.length ? game.inventory.map((item) => <article key={item.uid}><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{item.rarity}・{slotLabels[item.slot]}</small></span><Button size="sm" disabled={sharedWarehouse.length >= WAREHOUSE_LIMIT} onClick={() => depositToWarehouse(item.uid)}>存入</Button></article>) : <p>目前沒有可存入的裝備。</p>}</section>
              <section><h3>共用倉庫・三名角色皆可取用</h3>{sharedWarehouse.length ? sharedWarehouse.map((item) => <article key={item.uid}><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{item.rarity}・{slotLabels[item.slot]}</small></span><Button size="sm" variant="outline" onClick={() => withdrawFromWarehouse(item.uid)}>取出</Button></article>) : <p>倉庫目前是空的。</p>}</section></div>
            </div>}

            {cityService === "inn" && <div className="city-service-body inn-service"><BedDouble /><div><small>{currentCity.name}客棧</small><h2>商團歇腳與修練</h2><p>全員 HP / MP 恢復至上限；主角獲得 700 經驗，出戰傭兵各獲得 550 經驗。</p><Button onClick={restAtInn}>入住・{format(Math.floor(1800 * currentCity.priceFactor))} 兩</Button></div></div>}

            {cityService === "pharmacy" && <div className="city-service-body"><div className="panel-title"><Pill /><h2>{currentCity.name}藥店</h2><span>購買後可立即使用</span></div><div className="medicine-grid">{medicineCatalog.map((medicine) => <article key={medicine.id}><Pill /><div><strong>{medicine.name}</strong><small>{medicine.effect}</small><em>持有 {game.medicines[medicine.id] || 0}</em></div><Button size="sm" onClick={() => buyMedicine(medicine.id)}>購買 {format(Math.floor(medicine.price * currentCity.priceFactor))} 兩</Button><Button size="sm" variant="outline" disabled={!game.medicines[medicine.id]} onClick={() => consumeMedicine(medicine.id)}>使用</Button></article>)}</div></div>}
          </section>

          <div className="city-auxiliary">
            <section className="panel gem-workshop"><div className="panel-title"><Gem /><h2>寶石鑲嵌工房</h2><span>目前對象・{selected.name}</span></div><Select value={gemSlot} onValueChange={value=>{if(value) setGemSlot(value as EquipmentSlot)}}><SelectTrigger aria-label="選擇鑲嵌欄位"><SelectValue>{slotLabels[gemSlot]}</SelectValue></SelectTrigger><SelectContent>{slots.map(slot=><SelectItem key={slot} value={slot}>{slotLabels[slot]}</SelectItem>)}</SelectContent></Select><div className="gem-grid">{officialGems.map((gem) => <article key={gem.id}><strong>{gem.name}</strong><small>{gem.label}</small><div>{gem.values.map((value, grade) => <Button key={grade} size="sm" variant="outline" onClick={() => socketGem(gem.id, grade)}>+{value}・{format(gem.costs[grade])}兩</Button>)}</div></article>)}</div></section>
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
          <section className="panel implemented-systems">
            <div className="panel-title"><Sparkles /><h2>已融入玩法的資料</h2><span>不再使用參考圖鑑</span></div>
            <div>
              <article><Swords /><strong>怪物與地圖</strong><p>敵人名稱、抗性、技能、經驗和材料掉落直接控制戰鬥。</p></article>
              <article><Users /><strong>中央傭兵公會</strong><p>16 種公會傭兵，搭配被動與主動技能，透過等級、能力點與裝備成長。</p></article>
              <article><Shield /><strong>物品與裝備</strong><p>刀劍、盔甲、等級限制、能力加成和裝備技能進入商店與裝備欄。</p></article>
              <article><Gem /><strong>匠人與寶石</strong><p>五種寶石可實際鑲嵌並提升角色能力。</p></article>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <footer><span>融合版 V21・商途 × BT52Gersang</span><span>4 條放置商路・20 座城市・9 人傭兵隊伍・離線上限 8 小時</span></footer>
    </main>
  );
}
