import type { GameState } from "./game-state";

/**
 * Controls which large systems a newcomer needs to see right now.
 *
 * The prologue keeps its own story beats; this layer only decides when a
 * system becomes visible in navigation. Veteran saves keep their existing
 * access, so adding a new step never takes a feature away from an established
 * caravan.
 */
export type NewcomerFeature = "trade" | "relic" | "collection" | "contracts" | "hall" | "raid";

export type NewcomerUnlocks = Record<NewcomerFeature, boolean> & {
  prologueComplete: boolean;
  firstTradeComplete: boolean;
  firstRelicReward: boolean;
  firstRelicBossDefeated: boolean;
};

type NewcomerProgress = Pick<GameState, "hanyangPrologueStep" | "trade" | "relicDungeon" | "hero" | "mercs" | "restingMercs" | "territory">;

export function newcomerUnlocks(game: NewcomerProgress): NewcomerUnlocks {
  const relic = game.relicDungeon;
  const prologueComplete = game.hanyangPrologueStep === "completed";
  const firstTradeComplete = Math.max(0, game.trade.trips || 0) > 0 || Math.max(0, game.trade.totalProfit || 0) > 0;
  const firstRelicReward = !!relic && (relic.materialsFound > 0 || relic.equipmentFound > 0 || relic.relicShards > 0);
  const firstRelicBossDefeated = !!relic && relic.clearedRuns > 0;
  const teamReady = game.mercs.length + game.restingMercs.length > 0;
  const veteran = game.hero.level >= 20 || firstRelicBossDefeated || game.territory.buildings.waystation >= 1;

  return {
    prologueComplete,
    firstTradeComplete,
    firstRelicReward,
    firstRelicBossDefeated,
    trade: prologueComplete || veteran,
    relic: veteran || (prologueComplete && firstTradeComplete && teamReady),
    collection: veteran || firstRelicReward,
    contracts: veteran || firstRelicReward,
    hall: veteran || firstRelicReward,
    raid: veteran || firstRelicBossDefeated,
  };
}
