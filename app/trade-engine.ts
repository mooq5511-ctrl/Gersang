export const TRADE_ROUTES = [
  { id: "hanji", from: "漢陽", to: "釜山", good: "韓紙", nation: "朝鮮", cost: 1800, sale: 2900, seconds: 18, reputation: 0, stage: 1, rewardRep: 8, color: "#79b9d5" },
  { id: "tea", from: "台北", to: "南京", good: "烏龍茶", nation: "台灣 → 中國", cost: 3600, sale: 6000, seconds: 24, reputation: 40, stage: 5, rewardRep: 12, color: "#88c9a6" },
  { id: "silk", from: "南京", to: "大阪", good: "雲錦", nation: "中國 → 日本", cost: 6500, sale: 11000, seconds: 32, reputation: 150, stage: 15, rewardRep: 18, color: "#e2ac73" },
  { id: "porcelain", from: "京都", to: "台南", good: "京燒瓷器", nation: "日本 → 台灣", cost: 10000, sale: 18000, seconds: 40, reputation: 350, stage: 30, rewardRep: 24, color: "#c6a6df" },
] as const;

export type TradeRoute = (typeof TRADE_ROUTES)[number];
export type Voyage = {
  routeId: string; startedAt: number; duration: number; cost: number;
  revenue: number; reputation: number; xp: number; cargo: number;
  encounterSeed: number; encountersResolved: number;
};
export type TradeState = {
  reputation: number; cargoLevel: number; totalProfit: number; trips: number;
  selectedRouteId: string; auto: boolean; caravan: Voyage | null;
};
export const OFFLINE_LIMIT = 8 * 60 * 60 * 1000;
export const MAX_CARGO_LEVEL = 20;
export const freshTrade = (): TradeState => ({ reputation: 0, cargoLevel: 1, totalProfit: 0, trips: 0, selectedRouteId: "hanji", auto: true, caravan: null });
export const cargoCapacity = (level: number) => 10 + (level - 1) * 5;
export const upgradeCost = (level: number) => Math.floor(6000 * Math.pow(1.55, level - 1));
const safe = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;

export const encounterCount = (seed: number) => (seed >>> 0) % 11;
const nextSeed = (seed: number) => (Math.imul(seed, 1664525) + 1013904223) >>> 0;
export function encounterTimes(voyage: Voyage): number[] {
  const count = encounterCount(voyage.encounterSeed);
  let seed = voyage.encounterSeed;
  return Array.from({ length: count }, (_, index) => {
    seed = nextSeed(seed);
    return Math.floor(voyage.duration * (index + 0.25 + (seed / 4294967296) * 0.5) / count);
  });
}

export function restoreTrade(raw: unknown): TradeState {
  if (!raw || typeof raw !== "object") return freshTrade();
  const parsed = raw as Partial<TradeState>;
  const caravan = parsed.caravan;
  const validCaravan = caravan && TRADE_ROUTES.some((route) => route.id === caravan.routeId)
    && [caravan.startedAt, caravan.duration, caravan.cost, caravan.revenue, caravan.reputation, caravan.xp, caravan.cargo].every((value) => Number.isFinite(value) && value >= 0)
    && caravan.duration >= 18000 && caravan.revenue >= caravan.cost;
  return {
    reputation: safe(parsed.reputation), cargoLevel: Math.min(MAX_CARGO_LEVEL, Math.max(1, Math.floor(safe(parsed.cargoLevel, 1)))),
    totalProfit: safe(parsed.totalProfit), trips: Math.floor(safe(parsed.trips)),
    selectedRouteId: TRADE_ROUTES.some((route) => route.id === parsed.selectedRouteId) ? parsed.selectedRouteId! : "hanji",
    auto: parsed.auto !== false, caravan: validCaravan ? { ...caravan,
      encounterSeed: safe(caravan.encounterSeed, Math.floor(caravan.startedAt)) >>> 0,
      // Pre-update voyages start with their encounters consumed, preventing retroactive fights.
      encountersResolved: caravan.encounterSeed === undefined ? encounterCount(Math.floor(caravan.startedAt)) : Math.min(encounterCount(caravan.encounterSeed), Math.floor(safe(caravan.encountersResolved))),
    } : null,
  };
}

export function voyageQuote(route: TradeRoute, level: number, escorts: number, now: number): Voyage {
  const cargo = cargoCapacity(level);
  const multiplier = cargo / 10;
  return {
    routeId: route.id, startedAt: now, duration: route.seconds * 1000, cargo,
    cost: Math.floor(route.cost * multiplier),
    revenue: Math.floor(route.sale * multiplier * (1 + Math.min(10, Math.max(0, escorts)) * 0.015)),
    reputation: route.rewardRep, xp: route.rewardRep * 8,
    encounterSeed: 0, encountersResolved: 0,
  };
}

export function dispatchTrade(trade: TradeState, gold: number, routeId: string, stage: number, escorts: number, now: number, seed = Math.floor(Math.random() * 4294967296)) {
  const route = TRADE_ROUTES.find((entry) => entry.id === routeId);
  if (!route) return { error: "找不到這條商路。", trade, gold };
  if (trade.caravan) return { error: "商隊正在航行，請先等候本趟完成。", trade, gold };
  if (trade.reputation < route.reputation || stage < route.stage) return { error: "商譽或戰場關卡尚未達到解鎖條件。", trade, gold };
  const caravan = voyageQuote(route, trade.cargoLevel, escorts, now);
  caravan.encounterSeed = seed >>> 0;
  if (gold < caravan.cost) return { error: "銀兩不足，無法支付本趟進貨費用。", trade, gold };
  return { error: null, trade: { ...trade, selectedRouteId: route.id, caravan }, gold: gold - caravan.cost };
}

/** Same settlement for foreground, sleeping tabs and offline reloads; voyage terms are fixed at dispatch. */
export function advanceTrade(trade: TradeState, gold: number, now: number) {
  if (!trade.caravan || now < trade.caravan.startedAt) return { trade, gold, trips: 0, xp: 0, profit: 0, encounters: 0 };
  const effectiveNow = Math.min(now, trade.caravan.startedAt + OFFLINE_LIMIT);
  let caravan: Voyage | null = { ...trade.caravan };
  let trips = 0;
  let xp = 0;
  let profit = 0;
  let reputation = 0;
  let encounters = 0;
  while (caravan) {
    const due = encounterTimes(caravan).filter((offset) => effectiveNow >= caravan!.startedAt + offset).length;
    encounters += Math.max(0, due - caravan.encountersResolved);
    caravan.encountersResolved = Math.max(caravan.encountersResolved, due);
    if (effectiveNow < caravan.startedAt + caravan.duration) break;
    gold += caravan.revenue;
    profit += caravan.revenue - caravan.cost;
    reputation += caravan.reputation;
    xp += caravan.xp;
    trips += 1;
    if (trade.auto && gold >= caravan.cost) {
      gold -= caravan.cost;
      caravan = { ...caravan, startedAt: caravan.startedAt + caravan.duration, encounterSeed: nextSeed(caravan.encounterSeed), encountersResolved: 0 };
    } else caravan = null;
  }
  // Discard time beyond the eight-hour cap, so another reload cannot claim it again.
  if (caravan && effectiveNow < now) caravan.startedAt += now - effectiveNow;
  return {
    trade: { ...trade, caravan, reputation: trade.reputation + reputation, totalProfit: trade.totalProfit + profit, trips: trade.trips + trips },
    gold, trips, xp, profit, encounters,
  };
}
