import type { GameState } from "./game-state";
import { advanceEquipmentQuality, rollEquipment } from "./game-equipment-factory.ts";
import { addInventoryItem } from "./inventory-layout.ts";
import type { Equipment } from "./game-state";

export type CityHallCommissionMetric = "kills" | "materials" | "stage" | "mercs" | "equipment";
export type CityHallCommissionTerm = "short" | "long";
export type CityHallCommissionQuality = "白色" | "綠色" | "藍色" | "紫色" | "金色";
export type CityHallEquipmentRewardRarity = Extract<Equipment["rarity"], "傳說" | "金色">;
export type CityHallActiveCommission = { id: string; startValue: number };
export type CityHallLifetimeStats = { materials: number; equipment: number };
export type CityHallState = {
  availableIds: string[];
  active: CityHallActiveCommission[];
  completedIds: string[];
  refreshTickets: number;
  refreshCount: number;
  lifetime: CityHallLifetimeStats;
};

export type CityHallCommission = {
  id: string;
  category: "戰鬥" | "採集" | "探索" | "招募" | "裝備";
  term: CityHallCommissionTerm;
  quality: CityHallCommissionQuality;
  name: string;
  description: string;
  metric: CityHallCommissionMetric;
  target: number;
  objectiveLabel: string;
  locationLabel: string;
  actionHint: string;
  rewardGold: number;
  rewardCreditXp: number;
  rewardMaterials?: Record<string, number>;
  /** 紫色／金色委託的保證裝備品質；傳說在畫面上顯示為紫色。 */
  rewardEquipmentRarity?: CityHallEquipmentRewardRarity;
};

export const CITY_HALL_REFRESH_TICKET_PRICE = 2_000;
export const CITY_HALL_BOARD_SIZE = 5;

export function cityHallRewardMultiplier(quality: CityHallCommissionQuality) {
  if (quality === "金色") return 50;
  if (quality === "紫色") return 15;
  return 1;
}

export const CITY_HALL_COMMISSIONS: readonly CityHallCommission[] = [
  { id: "hall-clear-raccoon", category: "戰鬥", term: "short", quality: "白色", name: "清剿村外狸貓", description: "協助守衛清理村外驛路的狸貓。", metric: "kills", target: 5, objectiveLabel: "完成戰鬥", locationLabel: "新手村郊外", actionHint: "前往世界地圖的戰鬥區域，完成 5 場戰鬥。", rewardGold: 900, rewardCreditXp: 70, rewardMaterials: { "肉類": 2 } },
  { id: "hall-drive-bandits", category: "戰鬥", term: "long", quality: "紫色", name: "驅離山賊斥候", description: "長期清剿商路上的山賊勢力，讓巡商能安全通行。", metric: "kills", target: 10_000, objectiveLabel: "累計擊敗怪物", locationLabel: "北方商路", actionHint: "持續進行戰鬥，累計擊敗 10,000 隻怪物。", rewardGold: 1_500, rewardCreditXp: 100, rewardMaterials: { "下級精髓": 1 }, rewardEquipmentRarity: "傳說" },
  { id: "hall-gather-herbs", category: "採集", term: "short", quality: "綠色", name: "補充村莊藥材", description: "替藥師收集怪物掉落的材料。", metric: "materials", target: 8, objectiveLabel: "取得材料", locationLabel: "野外戰鬥區", actionHint: "擊敗怪物取得材料，累積 8 件後回到市政廳。", rewardGold: 1_100, rewardCreditXp: 80, rewardMaterials: { "甘草": 2 } },
  { id: "hall-gather-cooking", category: "採集", term: "short", quality: "綠色", name: "準備餐廳食材", description: "收集足夠材料，讓村莊餐廳備妥今日食材。", metric: "materials", target: 12, objectiveLabel: "取得材料", locationLabel: "野外戰鬥區", actionHint: "擊敗怪物取得材料，累積 12 件後交給市政廳。", rewardGold: 1_600, rewardCreditXp: 110, rewardMaterials: { "肉類": 3 } },
  { id: "hall-scout-route", category: "探索", term: "short", quality: "藍色", name: "探查外圍商路", description: "推進世界地圖進度，確認商路是否安全。", metric: "stage", target: 2, objectiveLabel: "推進地圖進度", locationLabel: "世界地圖", actionHint: "前往世界地圖並完成探索，直到進度達到第 2 區。", rewardGold: 1_800, rewardCreditXp: 130 },
  { id: "hall-recruit-helper", category: "招募", term: "short", quality: "藍色", name: "招募商路幫手", description: "招募一名傭兵，擴充村莊商隊的人手。", metric: "mercs", target: 1, objectiveLabel: "招募傭兵", locationLabel: "傭兵公會", actionHint: "前往城市的傭兵公會，招募 1 名傭兵。", rewardGold: 2_000, rewardCreditXp: 150 },
  { id: "hall-equip-caravan", category: "裝備", term: "long", quality: "紫色", name: "整備商隊裝備", description: "長期替巡商準備裝備，建立穩定的商隊庫存。", metric: "equipment", target: 100, objectiveLabel: "累計取得裝備", locationLabel: "背包／裝備欄", actionHint: "持續取得裝備，累計 100 件後回到市政廳。", rewardGold: 1_300, rewardCreditXp: 90, rewardEquipmentRarity: "傳說" },
  { id: "hall-prepare-supplies", category: "採集", term: "long", quality: "金色", name: "準備出發補給", description: "收集大量補給，交給市政廳統一分配給巡商。", metric: "materials", target: 5_000, objectiveLabel: "累計取得材料", locationLabel: "野外戰鬥區", actionHint: "持續取得怪物材料，累計 5,000 件後回報。", rewardGold: 2_400, rewardCreditXp: 170, rewardMaterials: { "肉類": 4, "下級精髓": 1 }, rewardEquipmentRarity: "金色" },
];

const commissionById = (id: string) => CITY_HALL_COMMISSIONS.find((commission) => commission.id === id);
const commissionIds = () => CITY_HALL_COMMISSIONS.map((commission) => commission.id);

export function cityHallEffectiveReward(commission: CityHallCommission): CityHallCommission {
  const multiplier = cityHallRewardMultiplier(commission.quality);
  if (multiplier === 1) return commission;
  const rewardMaterials = commission.rewardMaterials
    ? Object.fromEntries(Object.entries(commission.rewardMaterials).map(([name, amount]) => [name, amount * multiplier]))
    : undefined;
  return { ...commission, rewardGold: commission.rewardGold * multiplier, rewardCreditXp: commission.rewardCreditXp * multiplier, rewardMaterials };
}

export function cityHallActiveLimit(creditLevel: number) {
  if (creditLevel >= 8) return 6;
  if (creditLevel >= 5) return 5;
  if (creditLevel >= 3) return 4;
  return 3;
}

export function cityHallMetricValue(state: GameState, metric: CityHallCommissionMetric) {
  if (metric === "kills") return state.kills;
  if (metric === "materials") return Object.values(state.materials).reduce((sum, amount) => sum + Math.max(0, Number(amount) || 0), 0);
  if (metric === "stage") return state.stage;
  if (metric === "mercs") return state.mercs.length + state.restingMercs.length;
  return state.inventory.length + Object.values(state.hero.equip).filter(Boolean).length + state.mercs.reduce((sum, unit) => sum + Object.values(unit.equip).filter(Boolean).length, 0);
}

function cityHallProgressValue(state: GameState, commission: CityHallCommission) {
  if (commission.term === "long" && (commission.metric === "materials" || commission.metric === "equipment")) {
    const hall = normalizeCityHallState(state.cityHall);
    return hall.lifetime[commission.metric];
  }
  return cityHallMetricValue(state, commission.metric);
}

export function cityHallCommissionProgress(state: GameState, active: CityHallActiveCommission) {
  const commission = commissionById(active.id);
  if (!commission) return 0;
  return Math.max(0, cityHallProgressValue(state, commission) - active.startValue);
}

export function freshCityHallState(): CityHallState {
  return { availableIds: commissionIds().slice(0, CITY_HALL_BOARD_SIZE), active: [], completedIds: [], refreshTickets: 0, refreshCount: 0, lifetime: { materials: 0, equipment: 0 } };
}

export function normalizeCityHallState(value: unknown): CityHallState {
  const fresh = freshCityHallState();
  if (!value || typeof value !== "object") return fresh;
  const source = value as Partial<CityHallState>;
  const valid = new Set(commissionIds());
  const availableIds = Array.isArray(source.availableIds) ? [...new Set(source.availableIds.filter((id): id is string => typeof id === "string" && valid.has(id)))] : fresh.availableIds;
  const active = Array.isArray(source.active)
    ? source.active.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const item = entry as Partial<CityHallActiveCommission>;
        return typeof item.id === "string" && valid.has(item.id) ? [{ id: item.id, startValue: Math.max(0, Math.floor(Number(item.startValue) || 0)) }] : [];
      }).filter((entry, index, list) => list.findIndex((candidate) => candidate.id === entry.id) === index)
    : fresh.active;
  const used = new Set(active.map((entry) => entry.id));
  const board = availableIds.filter((id) => !used.has(id)).slice(0, CITY_HALL_BOARD_SIZE);
  for (const id of commissionIds()) if (board.length < CITY_HALL_BOARD_SIZE && !used.has(id) && !board.includes(id)) board.push(id);
  return {
    availableIds: board,
    active,
    completedIds: Array.isArray(source.completedIds) ? [...new Set(source.completedIds.filter((id): id is string => typeof id === "string" && valid.has(id)))] : [],
    refreshTickets: Math.max(0, Math.floor(Number(source.refreshTickets) || 0)),
    refreshCount: Math.max(0, Math.floor(Number(source.refreshCount) || 0)),
    lifetime: {
      materials: Math.max(0, Math.floor(Number(source.lifetime?.materials) || 0)),
      equipment: Math.max(0, Math.floor(Number(source.lifetime?.equipment) || 0)),
    },
  };
}

function cityHallEquipmentCount(state: GameState) {
  return state.inventory.length + Object.values(state.hero.equip).filter(Boolean).length + state.mercs.reduce((sum, unit) => sum + Object.values(unit.equip).filter(Boolean).length, 0);
}

/** 將戰鬥／取得物品產生的累積數值寫入市政廳長期統計。 */
export function syncCityHallLifetime(previous: GameState, next: GameState): GameState {
  const oldHall = normalizeCityHallState(previous.cityHall);
  const nextHall = normalizeCityHallState(next.cityHall);
  const materialGain = Object.entries(next.materials).reduce((sum, [name, amount]) => sum + Math.max(0, (Number(amount) || 0) - (Number(previous.materials[name]) || 0)), 0);
  const equipmentGain = Math.max(0, cityHallEquipmentCount(next) - cityHallEquipmentCount(previous));
  if (!materialGain && !equipmentGain) return next;
  return { ...next, cityHall: { ...nextHall, lifetime: { materials: oldHall.lifetime.materials + materialGain, equipment: oldHall.lifetime.equipment + equipmentGain } } };
}

function fillBoard(state: CityHallState, startOffset = state.refreshCount) {
  const activeIds = new Set(state.active.map((entry) => entry.id));
  const ids = commissionIds();
  const ordered = ids.slice(startOffset % ids.length).concat(ids.slice(0, startOffset % ids.length));
  const available = ordered.filter((id) => !activeIds.has(id)).slice(0, CITY_HALL_BOARD_SIZE);
  return { ...state, availableIds: available };
}

export function acceptCityHallCommission(state: GameState, commissionId: string): { state: GameState; error?: string } {
  const hall = normalizeCityHallState(state.cityHall);
  const commission = commissionById(commissionId);
  if (!commission || !hall.availableIds.includes(commissionId)) return { state, error: "這份委託已不在公告欄上。" };
  if (hall.active.length >= cityHallActiveLimit(state.creditLevel)) return { state, error: `目前最多只能同時接取 ${cityHallActiveLimit(state.creditLevel)} 件市政廳委託。` };
  const nextHall = { ...hall, availableIds: hall.availableIds.filter((id) => id !== commissionId), active: [...hall.active, { id: commissionId, startValue: cityHallProgressValue(state, commission) }] };
  return { state: { ...state, cityHall: nextHall } };
}

function makeCityHallEquipmentReward(state: GameState, rarity: CityHallEquipmentRewardRarity) {
  const level = Math.max(1, Math.floor(Number(state.hero.level) || 1));
  const base = rollEquipment(level, true);
  return {
    ...advanceEquipmentQuality(base, rarity),
    requiredLevel: level,
    source: `市政廳委託・${rarity === "傳說" ? "紫色" : "金色"}品階獎勵`,
  };
}

export function claimCityHallCommission(state: GameState, commissionId: string): { state: GameState; reward?: CityHallCommission; equipment?: Equipment; error?: string } {
  const hall = normalizeCityHallState(state.cityHall);
  const active = hall.active.find((entry) => entry.id === commissionId);
  const commission = commissionById(commissionId);
  if (!active || !commission) return { state, error: "找不到這份進行中的市政廳委託。" };
  if (cityHallCommissionProgress(state, active) < commission.target) return { state, error: "委託條件尚未完成。" };
  const reward = cityHallEffectiveReward(commission);
  const nextHall = fillBoard({ ...hall, active: hall.active.filter((entry) => entry.id !== commissionId), completedIds: [...hall.completedIds, commissionId], refreshCount: hall.refreshCount + 1 }, hall.refreshCount + 1);
  const materials = { ...state.materials };
  for (const [name, amount] of Object.entries(reward.rewardMaterials || {})) materials[name] = (materials[name] || 0) + amount;
  const equipment = commission.rewardEquipmentRarity ? makeCityHallEquipmentReward(state, commission.rewardEquipmentRarity) : undefined;
  const inventory = equipment ? addInventoryItem(state.inventory, equipment).inventory : state.inventory;
  return { state: { ...state, gold: state.gold + reward.rewardGold, materials, inventory, cityHall: nextHall }, reward, equipment };
}

export function abandonCityHallCommission(state: GameState, commissionId: string): { state: GameState; error?: string } {
  const hall = normalizeCityHallState(state.cityHall);
  if (!hall.active.some((entry) => entry.id === commissionId)) return { state, error: "找不到這份進行中的市政廳委託。" };
  const nextHall = fillBoard({ ...hall, active: hall.active.filter((entry) => entry.id !== commissionId), availableIds: [...hall.availableIds, commissionId] });
  return { state: { ...state, cityHall: nextHall } };
}

export function refreshCityHallCommissions(state: GameState): { state: GameState; error?: string } {
  const hall = normalizeCityHallState(state.cityHall);
  if (hall.refreshTickets < 1) return { state, error: "沒有委託刷新券，請先到商店購買。" };
  const nextHall = fillBoard({ ...hall, refreshTickets: hall.refreshTickets - 1, refreshCount: hall.refreshCount + 1 }, hall.refreshCount + 1);
  return { state: { ...state, cityHall: nextHall } };
}

export function buyCityHallRefreshTicket(state: GameState): { state: GameState; error?: string } {
  if (state.gold < CITY_HALL_REFRESH_TICKET_PRICE) return { state, error: "銀兩不足，無法購買委託刷新券。" };
  return { state: { ...state, gold: state.gold - CITY_HALL_REFRESH_TICKET_PRICE, cityHall: { ...normalizeCityHallState(state.cityHall), refreshTickets: normalizeCityHallState(state.cityHall).refreshTickets + 1 } } };
}

export function cityHallCommission(id: string) {
  return commissionById(id);
}

export function cityHallQualityKey(quality: CityHallCommissionQuality) {
  return ({ "白色": "white", "綠色": "green", "藍色": "blue", "紫色": "purple", "金色": "gold" } as const)[quality];
}
