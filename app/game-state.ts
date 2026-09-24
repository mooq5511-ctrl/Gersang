import type { DungeonState } from "./dungeon-engine";
import type { EquipmentKind, EquipmentSlot } from "./equipment-slots";
import type { BattlePosition } from "./formation-position";
import type { PlayerStatus } from "./inn-engine";
import type { TradeState } from "./trade-engine";
import type { NationId } from "./v15-data";
import type { ExchangePurchases } from "./village-exchange";
import type { GuildTerritory } from "./guild-territory";
import type { NpcProgress } from "./npc-dialogue";
import type { AutoPotionSettings } from "./auto-potion-manager";
import type { BattleLogEntry } from "./battle-log-manager";
import type { HanyangPrologueFlags, HanyangPrologueStep } from "./hanyang-prologue";

/** Persistent save keys. These names are compatibility contracts with existing players. */
export const PROFILE_INDEX = "bt52_v19_character_profiles";
export const PROFILE_SAVE_PREFIX = "bt52_v19_character_slot_";
export const SHARED_WAREHOUSE_SAVE = "bt52_v20_shared_warehouse";
export const WAREHOUSE_LIMIT = 30;

export function profileSaveKey(slot: number) {
  return PROFILE_SAVE_PREFIX + slot;
}

export type MagicAffix = {
  id: string;
  name: string;
  text: string;
  color: string;
  stat: string;
  value: number;
};
export type EnhancementBonus = { id: "attackPercent" | "defensePercent" | "xpPercent" | "critRate" | "damageReduction" | "allStats"; name: string; text: string; stat: "attackPercent" | "defensePercent" | "xpPercent" | "critRate" | "damageReduction" | "allStats"; value: number };

export type Equipment = {
  bagSlot?: number;
  uid: string;
  name: string;
  slot: EquipmentKind;
  atk: number;
  def: number;
  hp: number;
  image: string;
  enhance: number;
  /** 強化失敗累積的保底值；達 100 時下次必定成功。 */
  luckyValue?: number;
  /** +5、+10、+15 里程碑取得的全域百分比屬性。 */
  enhanceBonuses?: EnhancementBonus[];
  rarity: "普通" | "稀有" | "史詩" | "傳說" | "金色";
  magic: MagicAffix[];
  requiredLevel?: number;
  source?: string;
  skill?: string;
  bonus?: { str: number; agi: number; intel: number; vit: number };
  resist?: { physical: number; magic: number };
  socketGem?: { id: string; name: string; count: number; totalValue: number; baseName: string };
};

export type EquipmentSet = Record<EquipmentSlot, Equipment | null>;

export type Unit = {
  uid: string;
  templateId: string;
  nation: NationId | "legacy";
  tier: 0 | 1 | 2 | 3;
  /** Current mercenary class name; omitted on legacy saves and filled during migration. */
  jobClass?: string;
  growthMultipliers?: { str: number; agi: number; intel: number; vit: number };
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
  maxHp?: number;
  flatAttackBonus?: number;
  position: BattlePosition;
  equip: EquipmentSet;
};

export type Hero = Omit<Unit, "nation" | "tier" | "special" | "templateId"> & {
  templateId: "hero";
  nation: NationId;
  tier: 0;
  special: false;
  job: string;
  maxHp: number;
  status: PlayerStatus;
  gender: "male" | "female";
};

export type CharacterProfile = {
  slot: number;
  name: string;
  nation: NationId;
  level: number;
  stage: number;
  updatedAt: number;
  gender?: "male" | "female";
};
export type OnboardingStep = "welcome" | "find-village-chief" | "travel-to-outskirts" | "first-battle" | "return-village-chief" | "mercenary-trial" | "hire-first-merc" | "completed";

export type CityService = "mercenary" | "weapon" | "armor" | "warehouse" | "inn" | "pharmacy" | "exchange";

export type GameState = {
  dungeon?: DungeonState;
  version: 30;
  firstGreenEquipped?: boolean;
  trade: TradeState;
  territory: GuildTerritory;
  credit: number;
  creditXp: number;
  creditLevel: number;
  idleStamp: number;
  gold: number;
  stage: number;
  kills: number;
  /** Progress for the first caravan commission; only 新手村郊外的狸貓 counts. */
  starterDeliveryKills: number;
  newbieBossDefeated: boolean;
  lakeBossDefeated: boolean;
  goldenStarfishDefeated: boolean;
  newbieCoins: number;
  city: string;
  battleMap: string;
  selectedMonster?: string;
  hero: Hero;
  mercs: Unit[];
  restingMercs: Unit[];
  active: string[];
  inventory: Equipment[];
  fusionCores: number;
  soulStones: number;
  awakeningStones: number;
  materials: Record<string, number>;
  exchangePurchases: ExchangePurchases;
  medicines: Record<string, number>;
  autoSkill: boolean;
  autoMedicine: { healing: number; mana: number };
  autoMedicineAt: { healing: number; mana: number };
  /** Battle-only automatic HP restoration; saved with the character profile. */
  autoPotion: AutoPotionSettings;
  /** 上次 Auto Potion 使用時間，避免戰鬥 tick 連續消耗藥品。 */
  autoPotionAt: number;
  /** 新手引導進度，避免新角色建立後沒有明確下一步。 */
  onboardingStep: OnboardingStep;
  /** Story wrapper for the existing onboarding systems; safe to omit in old saves. */
  hanyangPrologueStep: HanyangPrologueStep;
  hanyangPrologueFlags: HanyangPrologueFlags;
  /** Persisted newest-first battle and reward history, capped by BattleLogManager. */
  battleLogs: BattleLogEntry[];
  claimedContracts: string[];
  /** Village NPC dialogue, affinity, and quest state; persisted with the character. */
  npcProgress: NpcProgress;
  lastEncounter: string;
  enemyHp: number;
  formation: string;
  logs: string[];
  lastSeen: number;
};

/** Realtime events are display-only and must never be persisted in localStorage. */
export function serializeGameForStorage(game: GameState) {
  return JSON.stringify({
    ...game,
    dungeon: game.dungeon ? { ...game.dungeon, events: undefined } : undefined,
    lastSeen: Date.now(),
  });
}
