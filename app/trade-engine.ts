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
    auto: parsed.auto !== false, caravan: validCaravan ? { ...caravan } : null,
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
  };
}

export function dispatchTrade(trade: TradeState, gold: number, routeId: string, stage: number, escorts: number, now: number) {
  const route = TRADE_ROUTES.find((entry) => entry.id === routeId);
  if (!route) return { error: "找不到這條商路。", trade, gold };
  if (trade.caravan) return { error: "商隊正在航行，請先等候本趟完成。", trade, gold };
  if (trade.reputation < route.reputation || stage < route.stage) return { error: "商譽或戰場關卡尚未達到解鎖條件。", trade, gold };
  const caravan = voyageQuote(route, trade.cargoLevel, escorts, now);
  if (gold < caravan.cost) return { error: "銀兩不足，無法支付本趟進貨費用。", trade, gold };
  return { error: null, trade: { ...trade, selectedRouteId: route.id, caravan }, gold: gold - caravan.cost };
}

/** Same settlement for foreground, sleeping tabs and offline reloads; voyage terms are fixed at dispatch. */
export function advanceTrade(trade: TradeState, gold: number, now: number) {
  if (!trade.caravan || now < trade.caravan.startedAt + trade.caravan.duration) return { trade, gold, trips: 0, xp: 0, profit: 0 };
  const effectiveNow = Math.min(now, trade.caravan.startedAt + OFFLINE_LIMIT);
  let caravan: Voyage | null = { ...trade.caravan };
  let trips = 0;
  let xp = 0;
  let profit = 0;
  let reputation = 0;
  while (caravan && effectiveNow >= caravan.startedAt + caravan.duration) {
    gold += caravan.revenue;
    profit += caravan.revenue - caravan.cost;
    reputation += caravan.reputation;
    xp += caravan.xp;
    trips += 1;
    if (trade.auto && gold >= caravan.cost) {
      gold -= caravan.cost;
      caravan = { ...caravan, startedAt: caravan.startedAt + caravan.duration };
    } else caravan = null;
  }
  // Discard time beyond the eight-hour cap, so another reload cannot claim it again.
  if (caravan && effectiveNow < now) caravan.startedAt += now - effectiveNow;
  return {
    trade: { ...trade, caravan, reputation: trade.reputation + reputation, totalProfit: trade.totalProfit + profit, trips: trade.trips + trips },
    gold, trips, xp, profit,
  };
}
