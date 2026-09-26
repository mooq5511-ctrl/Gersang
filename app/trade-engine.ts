export const TRADE_ROUTES = [
  { id: "hanji", from: "漢陽", to: "台北", good: "高麗人參", nation: "朝鮮 → 台灣", cost: 1800, sale: 2900, seconds: 18, reputation: 0, stage: 1, rewardRep: 8, color: "#79b9d5" },
  { id: "tea", from: "台北", to: "南京", good: "烏龍茶", nation: "台灣 → 中國", cost: 3600, sale: 6000, seconds: 24, reputation: 40, stage: 5, rewardRep: 12, color: "#88c9a6" },
  { id: "silk", from: "南京", to: "江戶", good: "雲錦", nation: "中國 → 日本", cost: 6500, sale: 11000, seconds: 32, reputation: 150, stage: 15, rewardRep: 18, color: "#e2ac73" },
  { id: "porcelain", from: "江戶", to: "漢陽", good: "江戶刀具", nation: "日本 → 朝鮮", cost: 10000, sale: 18000, seconds: 40, reputation: 350, stage: 30, rewardRep: 24, color: "#c6a6df" },
] as const;

export type TradeRoute = (typeof TRADE_ROUTES)[number];
export type TradeEventKind = "danger" | "neutral" | "fortune";
export type TradeEventResult = {
  id: string;
  name: string;
  kind: TradeEventKind;
  message: string;
  threat: number;
  escortPower: number;
  protected: boolean;
  cargoLossRate: number;
  revenueDelta: number;
};
export type Voyage = {
  routeId: string; startedAt: number; duration: number; cost: number;
  revenue: number; reputation: number; xp: number; cargo: number;
  encounterSeed: number; encountersResolved: number;
  escortIds?: string[];
  escortPower?: number;
};
export type TradeState = {
  reputation: number; cargoLevel: number; totalProfit: number; trips: number;
  selectedRouteId: string; auto: boolean; caravan: Voyage | null;
  /** New games use the richer trade economy; old direct engine callers keep the legacy baseline. */
  rewardMultiplier?: number;
};
export const OFFLINE_LIMIT = 8 * 60 * 60 * 1000;
export const MAX_CARGO_LEVEL = 20;
export const freshTrade = (): TradeState => ({ reputation: 0, cargoLevel: 1, totalProfit: 0, trips: 0, selectedRouteId: "hanji", auto: true, caravan: null });
export const cargoCapacity = (level: number) => 10 + (level - 1) * 5;
export const upgradeCost = (level: number) => Math.floor(30_000 * Math.pow(1.15, level - 1));
const safe = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;

/** 舊版戰鬥遭遇排程保留為零；跑商改用完成時結算的隨機商路事件。 */
export const encounterCount = (_seed: number) => 0;
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
    auto: parsed.auto !== false, rewardMultiplier: typeof parsed.rewardMultiplier === "number" && Number.isFinite(parsed.rewardMultiplier) ? Math.min(4, Math.max(1, parsed.rewardMultiplier)) : 3,
    caravan: validCaravan ? { ...caravan,
      encounterSeed: safe(caravan.encounterSeed, Math.floor(caravan.startedAt)) >>> 0,
      // Pre-update voyages start with their encounters consumed, preventing retroactive fights.
      encountersResolved: caravan.encounterSeed === undefined ? encounterCount(Math.floor(caravan.startedAt)) : Math.min(encounterCount(caravan.encounterSeed), Math.floor(safe(caravan.encountersResolved))),
      escortIds: Array.isArray(caravan.escortIds) ? caravan.escortIds.filter((id): id is string => typeof id === "string").slice(0, 12) : undefined,
      escortPower: safe(caravan.escortPower),
    } : null,
  };
}

export function voyageQuote(route: TradeRoute, level: number, escorts: number, now: number, rewardMultiplier = 1): Voyage {
  const cargo = cargoCapacity(level);
  const multiplier = cargo / 10;
  const economy = Math.min(4, Math.max(1, rewardMultiplier));
  return {
    routeId: route.id, startedAt: now, duration: route.seconds * 1000, cargo,
    cost: Math.floor(route.cost * Math.pow(multiplier, 1.1)),
    revenue: Math.floor(route.sale * multiplier * economy * (1 + Math.min(10, Math.max(0, escorts)) * 0.015)),
    reputation: route.rewardRep, xp: route.rewardRep * 8,
    encounterSeed: 0, encountersResolved: 0,
  };
}

export type DispatchTradeOptions = { escortIds?: string[]; escortPower?: number; rewardMultiplier?: number };
export function dispatchTrade(trade: TradeState, gold: number, routeId: string, stage: number, escorts: number, now: number, seed = Math.floor(Math.random() * 4294967296), options: DispatchTradeOptions = {}) {
  const route = TRADE_ROUTES.find((entry) => entry.id === routeId);
  if (!route) return { error: "找不到這條商路。", trade, gold };
  if (trade.caravan) return { error: "商隊正在航行，請先等候本趟完成。", trade, gold };
  if (trade.reputation < route.reputation || stage < route.stage) return { error: "商譽或戰場關卡尚未達到解鎖條件。", trade, gold };
  const caravan = voyageQuote(route, trade.cargoLevel, escorts, now, options.rewardMultiplier ?? trade.rewardMultiplier ?? 1);
  caravan.encounterSeed = seed >>> 0;
  if (options.escortIds?.length) caravan.escortIds = options.escortIds.slice(0, 12);
  if (options.escortPower) caravan.escortPower = Math.max(0, Math.floor(options.escortPower));
  if (gold < caravan.cost) return { error: "銀兩不足，無法支付本趟進貨費用。", trade, gold };
  return { error: null, trade: { ...trade, selectedRouteId: route.id, caravan }, gold: gold - caravan.cost };
}

const TRADE_EVENT_CHANCE = 0.3;
const TRADE_EVENTS = [
  { id: "pirate-raid", name: "海盜劫掠", kind: "danger" as const, weight: 20, threat: 620, loss: 1, message: "黑帆從濃霧中逼近，海盜試圖奪走整批貨物。" },
  { id: "bandit-roadblock", name: "山賊攔路", kind: "danger" as const, weight: 14, threat: 430, loss: .55, message: "商路前方被山賊封鎖，幾箱貨物遭到哄搶。" },
  { id: "storm", name: "突遇暴風雨", kind: "danger" as const, weight: 13, threat: 280, loss: .28, message: "海象突然惡化，船隊在風浪中失去部分貨物。" },
  { id: "wet-cargo", name: "貨物受潮", kind: "danger" as const, weight: 10, threat: 180, loss: .2, message: "貨艙滲水，部分貨物受潮，只能折價出售。" },
  { id: "checkpoint", name: "關卡盤查", kind: "neutral" as const, weight: 11, threat: 160, loss: .1, message: "地方關卡臨時盤查，商隊支付通行費後順利通過。" },
  { id: "merchant-buyout", name: "商會高價收購", kind: "fortune" as const, weight: 10, threat: 0, loss: -.25, message: "當地商會急需這批貨，願意以高價提前收購。" },
  { id: "village-supply", name: "漁村補給", kind: "fortune" as const, weight: 8, threat: 0, loss: -.12, message: "漁村提供補給與嚮導，商隊順利省下部分成本。" },
  { id: "drift-chest", name: "發現漂流寶箱", kind: "fortune" as const, weight: 7, threat: 0, loss: -.08, message: "瞭望手發現漂流寶箱，連同貨物一起帶回港口。" },
  { id: "shortcut", name: "發現商路捷徑", kind: "fortune" as const, weight: 7, threat: 0, loss: -.05, message: "護衛找到一條安全捷徑，貨物能更快送達並減少耗損。" },
] as const;

function pickTradeEvent(seed: number) {
  const chance = seed / 4294967296;
  if (chance >= TRADE_EVENT_CHANCE) return null;
  const total = TRADE_EVENTS.reduce((sum, event) => sum + event.weight, 0);
  const roll = nextSeed(seed) / 4294967296 * total;
  let cursor = 0;
  for (const event of TRADE_EVENTS) {
    cursor += event.weight;
    if (roll < cursor) return event;
  }
  return TRADE_EVENTS.at(-1)!;
}

export function resolveTradeEvent(voyage: Voyage): TradeEventResult | null {
  const event = pickTradeEvent(nextSeed(voyage.encounterSeed));
  if (!event) return null;
  const escortPower = Math.max(0, voyage.escortPower || 0);
  const protectedEvent = event.kind === "danger" && escortPower > 0 && escortPower >= event.threat;
  const partialProtection = event.kind === "danger" && escortPower > 0 && !protectedEvent;
  const cargoLossRate = event.kind !== "danger" ? Math.max(0, event.loss) : protectedEvent ? 0 : partialProtection ? event.loss * .45 : event.loss;
  const revenueDelta = Math.floor(voyage.revenue * -cargoLossRate);
  const escortText = event.kind === "danger" ? (protectedEvent ? "護衛傭兵及時擊退威脅，貨物完整保全。" : partialProtection ? "護衛傭兵減少了損失，但仍有部分貨物受損。" : "沒有足夠護衛，貨物損失慘重。") : "";
  return { id: event.id, name: event.name, kind: event.kind, message: `${event.message} ${escortText}`.trim(), threat: event.threat, escortPower, protected: protectedEvent, cargoLossRate, revenueDelta };
}

/** Same settlement for foreground, sleeping tabs and offline reloads; voyage terms are fixed at dispatch. */
export function advanceTrade(trade: TradeState, gold: number, now: number, options: { resolveEvents?: boolean } = {}) {
  if (!trade.caravan || now < trade.caravan.startedAt) return { trade, gold, trips: 0, xp: 0, profit: 0, encounters: 0 };
  const effectiveNow = Math.min(now, trade.caravan.startedAt + OFFLINE_LIMIT);
  let caravan: Voyage | null = { ...trade.caravan };
  let trips = 0;
  let xp = 0;
  let profit = 0;
  let reputation = 0;
  let encounters = 0;
  const tradeEvents: TradeEventResult[] = [];
  const releasedEscorts: string[] = [];
  while (caravan) {
    const due = encounterTimes(caravan).filter((offset) => effectiveNow >= caravan!.startedAt + offset).length;
    encounters += Math.max(0, due - caravan.encountersResolved);
    caravan.encountersResolved = Math.max(caravan.encountersResolved, due);
    if (effectiveNow < caravan.startedAt + caravan.duration) break;
    gold += caravan.revenue;
    profit += caravan.revenue - caravan.cost;
    if (options.resolveEvents) {
      const event = resolveTradeEvent(caravan);
      if (event) {
        gold += event.revenueDelta;
        profit += event.revenueDelta;
        tradeEvents.push(event);
      }
    }
    reputation += caravan.reputation;
    xp += caravan.xp;
    trips += 1;
    if (trade.auto && gold >= caravan.cost) {
      gold -= caravan.cost;
      caravan = { ...caravan, startedAt: caravan.startedAt + caravan.duration, encounterSeed: nextSeed(caravan.encounterSeed), encountersResolved: 0 };
    } else {
      if (caravan.escortIds?.length) releasedEscorts.push(...caravan.escortIds);
      caravan = null;
    }
  }
  // Discard time beyond the eight-hour cap, so another reload cannot claim it again.
  if (caravan && effectiveNow < now) caravan.startedAt += now - effectiveNow;
  return {
    trade: { ...trade, caravan, reputation: trade.reputation + reputation, totalProfit: trade.totalProfit + profit, trips: trade.trips + trips },
    gold, trips, xp, profit, encounters, tradeEvents, releasedEscorts: [...new Set(releasedEscorts)],
  };
}
