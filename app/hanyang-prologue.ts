import type { GameState } from "./game-state";

/** The short story layer sits on top of the existing battle, inventory and guild systems. */
export type HanyangPrologueStep =
  | "arrival"
  | "outskirts"
  | "first-battle"
  | "first-sale"
  | "journey-fund"
  | "guild"
  | "formation"
  | "caravan-crisis"
  | "bandit-trial"
  | "return"
  | "completed";

export type HanyangPrologueFlags = {
  lootSold: boolean;
  journeyFundClaimed: boolean;
  firstMercenaryContract: boolean;
  firstMercenaryDeployed: boolean;
  caravanRestored: boolean;
  completionRewardClaimed: boolean;
};

export const HANYANG_PROLOGUE_STEPS: ReadonlyArray<{ step: HanyangPrologueStep; title: string; detail: string }> = [
  { step: "arrival", title: "初來乍到", detail: "老商人注意到了站在漢陽城門口的你。" },
  { step: "outskirts", title: "城外走走", detail: "先到城外看看，別讓第一次出門就空手而回。" },
  { step: "first-sale", title: "第一場買賣", detail: "把剛取得的戰利品帶回漢陽，換成真正能用的銀兩。" },
  { step: "journey-fund", title: "啟程之資", detail: "老商人會依傭兵公會的實際價格補足一筆不重複的啟程資金。" },
  { step: "guild", title: "人多好辦事", detail: "去傭兵公會，從公會推薦的人選中挑一名夥伴。" },
  { step: "formation", title: "並肩而行", detail: "確認第一名傭兵已加入出戰隊伍。" },
  { step: "caravan-crisis", title: "商路告急", detail: "黑巾山賊開始影響漢陽商路，前往事件區域調查。" },
  { step: "bandit-trial", title: "黑巾山賊", detail: "沿用既有黑巾山賊傭兵試煉，和第一名夥伴並肩作戰。" },
  { step: "return", title: "路才剛開始", detail: "返回漢陽，看看商路恢復後的變化。" },
  { step: "completed", title: "初入漢陽", detail: "序章完成；漢陽之外的世界現在由你自由探索。" },
];

export const HANYANG_PROLOGUE_DIALOGUE = {
  merchant: ["喂，那邊那個年輕人。", "看你站在城門口東張西望的樣子……第一次來漢陽？", "身上沒幾個錢，倒是覺得天下到處都是機會。"],
  sale: ["至少不是空著手回來。", "打倒敵人只是第一步；真正的商人，得知道怎麼把手裡的東西變成銀兩。"],
  guild: ["一個人在外行走終究太危險。", "拿著這些錢，去傭兵公會看看。能陪你活著回來的人，才是好夥伴。"],
  ending: ["你知道今天真正賺到的是什麼嗎？不是那些錢。", "東西能賣錢，錢能僱人，人能替你保住貨；這些東西啊，都是連在一起的。", "漢陽只是你的第一站。接下來想去哪，就看你自己了。"],
} as const;

export function freshHanyangPrologueFlags(): HanyangPrologueFlags {
  return { lootSold: false, journeyFundClaimed: false, firstMercenaryContract: false, firstMercenaryDeployed: false, caravanRestored: false, completionRewardClaimed: false };
}

export function normalizeHanyangPrologueFlags(value: unknown): HanyangPrologueFlags {
  const source = value && typeof value === "object" ? value as Partial<HanyangPrologueFlags> : {};
  return { lootSold: source.lootSold === true, journeyFundClaimed: source.journeyFundClaimed === true, firstMercenaryContract: source.firstMercenaryContract === true, firstMercenaryDeployed: source.firstMercenaryDeployed === true, caravanRestored: source.caravanRestored === true, completionRewardClaimed: source.completionRewardClaimed === true };
}

export function normalizeHanyangPrologueStep(value: unknown): HanyangPrologueStep {
  return HANYANG_PROLOGUE_STEPS.some(({ step }) => step === value) ? value as HanyangPrologueStep : "arrival";
}

export function recommendedMercenaryRoles() {
  return ["近戰", "遠程", "生存"] as const;
}

/** Existing roster entries used as recommendations; every other roster entry stays available. */
export function recommendedMercenaryIds() {
  return ["shield", "archer", "spear"] as const;
}

/** The current guild uses 6,000 as its base ordinary-mercenary price. Keep the rule here, not in UI. */
export function hanyangJourneyFund(guildPrice: number, currentGold: number, targetRatio = 1.25) {
  const price = Math.max(1, Math.floor(guildPrice));
  const target = Math.ceil(price * Math.max(1.2, Math.min(1.5, targetRatio)));
  return Math.max(0, target - Math.max(0, Math.floor(currentGold)));
}

/** One-time emergency floor prevents a player who spent the grant from being stuck. */
export function hanyangRecruitmentCost(state: Pick<GameState, "gold" | "hanyangPrologueStep" | "hanyangPrologueFlags">, guildPrice: number) {
  if (state.hanyangPrologueStep === "guild" && !state.hanyangPrologueFlags.firstMercenaryContract && state.gold < guildPrice) return Math.max(0, Math.floor(state.gold));
  return Math.max(1, Math.floor(guildPrice));
}

export function markHanyangLootSold(state: GameState): GameState {
  if (state.hanyangPrologueFlags.lootSold) return state;
  if (state.hanyangPrologueStep !== "first-sale") return state;
  return { ...state, hanyangPrologueStep: "journey-fund", hanyangPrologueFlags: { ...state.hanyangPrologueFlags, lootSold: true } };
}

export function claimHanyangJourneyFund(state: GameState, guildPrice: number): GameState {
  const flags = state.hanyangPrologueFlags;
  if (flags.journeyFundClaimed || !flags.lootSold || state.hanyangPrologueStep !== "journey-fund") return state;
  const grant = hanyangJourneyFund(guildPrice, state.gold);
  return { ...state, gold: state.gold + grant, hanyangPrologueStep: "guild", hanyangPrologueFlags: { ...flags, journeyFundClaimed: true }, logs: [...state.logs, `老商人補助啟程資金 ${grant.toLocaleString("zh-TW")} 兩；這筆資金只能領取一次。`] };
}

export function syncHanyangPrologue(state: GameState, guildPrice: number): GameState {
  let next = state;
  const count = state.mercs.length + state.restingMercs.length;
  const activeMerc = state.mercs.some((unit) => state.active.includes(unit.uid));
  if (next.hanyangPrologueStep === "arrival") next = { ...next, hanyangPrologueStep: "outskirts" };
  if (count > 0 && !next.hanyangPrologueFlags.firstMercenaryContract) next = { ...next, hanyangPrologueStep: "formation", hanyangPrologueFlags: { ...next.hanyangPrologueFlags, firstMercenaryContract: true } };
  if (next.hanyangPrologueStep === "formation" && next.hanyangPrologueFlags.firstMercenaryContract && next.hanyangPrologueFlags.firstMercenaryDeployed === false && activeMerc) next = { ...next, hanyangPrologueStep: "caravan-crisis", hanyangPrologueFlags: { ...next.hanyangPrologueFlags, firstMercenaryDeployed: true } };
  if (next.hanyangPrologueStep === "journey-fund" && next.hanyangPrologueFlags.lootSold && !next.hanyangPrologueFlags.journeyFundClaimed) next = claimHanyangJourneyFund(next, guildPrice);
  return next;
}

export function completeHanyangPrologue(state: GameState): GameState {
  if (state.hanyangPrologueStep !== "return" || state.hanyangPrologueFlags.completionRewardClaimed) return state;
  return {
    ...state,
    hanyangPrologueStep: "completed",
    gold: state.gold + 1000,
    medicines: { ...state.medicines, healing: (state.medicines.healing || 0) + 1 },
    hanyangPrologueFlags: { ...state.hanyangPrologueFlags, completionRewardClaimed: true, caravanRestored: true },
    logs: [...state.logs, "《初入漢陽》完成：獲得 1,000 兩、金創藥 ×1。旅人札記已開放，自此自由探索。"],
  };
}
