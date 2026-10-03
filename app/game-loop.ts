import { dungeonBusy } from "./dungeon-engine";
import { settleCaravanIdle } from "./caravan-idle";
import { advanceTrade } from "./trade-engine";
import type { DungeonKey } from "./dungeon-engine";
import type { GameState, Hero, Unit } from "./game-state";
import { runDungeonAction } from "./game-battle-actions";
import { formatGameNumber } from "./game-display";
import { grantCreditXp, grantXp, grantTerritoryXp } from "./game-progression";
import { appendGameLog, enterGameInnAction, leaveGameInnAction } from "./game-runtime-actions";
import { territoryBonus } from "./guild-territory";
import { guildSkillTradeBonuses } from "./guild-skills";
import { pauseHanyangTutorialBattle } from "./hanyang-prologue";

/** Random values are sampled once per tick so React retries cannot change an outcome. */
export function createGameTickRolls() {
  return {
    now: Date.now(), roll: Math.random(), choice: Math.random(), spawnRoll: Math.random(), encounterCountRoll: Math.random(),
    retaliationRoll: Math.random(), materialRolls: [Math.random(), Math.random(), Math.random()], gearDropRoll: Math.random(), gearChoiceRoll: Math.random(), sealDropRoll: Math.random(), sealChoiceRoll: Math.random(),
  };
}

type LoopDependencies = {
  runDungeon: (state: GameState, action: "tick", now: number, key: DungeonKey | undefined, rolls: GameTickRolls) => GameState;
  grantXp: <T extends Unit | Hero>(unit: T, amount: number) => T;
  grantCreditXp: (state: GameState, amount: number) => GameState;
  addLog: (logs: string[], message: string) => string[];
  format: (value: number) => string;
};

export type GameTickRolls = {
  now: number; roll: number; choice: number; spawnRoll: number; encounterCountRoll: number; retaliationRoll: number; materialRolls: number[]; gearDropRoll?: number; gearChoiceRoll?: number; sealDropRoll?:number;sealChoiceRoll?:number;
};

/** Settles the shared idle timer, dungeon state and caravan completion exactly once. */
export function settleGameLoop(previous: GameState, rolls: GameTickRolls, deps: LoopDependencies): GameState {
  const { now, roll, choice, spawnRoll, encounterCountRoll, retaliationRoll, materialRolls, gearDropRoll, gearChoiceRoll, sealDropRoll, sealChoiceRoll } = rolls;
  previous = pauseHanyangTutorialBattle(previous);
  if (dungeonBusy(previous.dungeon)) {
    const battle = previous.dungeon!;
    const due = battle.status === "respawning" ? battle.spawnAt : battle.status === "recovering" ? (battle.innHealAt || battle.stamp + 2000) : battle.stamp + 50;
    if (now < due) return previous;
    const pause = Math.max(0, now - (previous.dungeon!.pauseAt || previous.dungeon!.stamp || now));
    let next = deps.runDungeon(previous, "tick", now, undefined, { now, roll, choice, spawnRoll, encounterCountRoll, retaliationRoll, materialRolls, gearDropRoll, gearChoiceRoll, sealDropRoll, sealChoiceRoll });
    next = { ...next, dungeon: { ...next.dungeon!, pauseAt: now } };
    if (next.trade.caravan) next = { ...next, trade: { ...next.trade, caravan: { ...next.trade.caravan, startedAt: next.trade.caravan.startedAt + pause } } };
    if (previous.dungeon!.status === "recovering") return { ...next, idleStamp: now };
    const idle = settleCaravanIdle(previous.idleStamp, now, Math.max(previous.stage, previous.hero.level), territoryBonus(previous.territory, "idle"));
    return deps.grantCreditXp({ ...next, idleStamp: idle.stamp, gold: next.gold + idle.gold, credit: next.credit + idle.credit }, idle.credit);
  }
  const idle = settleCaravanIdle(previous.idleStamp, now, Math.max(previous.stage, previous.hero.level), territoryBonus(previous.territory, "idle"));
  if (idle.stamp !== previous.idleStamp) previous = deps.grantCreditXp({ ...previous, idleStamp: idle.stamp, gold: previous.gold + idle.gold, credit: previous.credit + idle.credit }, idle.credit);
  const result = advanceTrade(previous.trade, previous.gold, now, { resolveEvents: true });
  if (!result.trips && !result.encounters && !result.tradeEvents.length) return previous;
  let logs = result.trips ? deps.addLog(previous.logs, `商隊完成 ${result.trips} 趟交易，淨利 ${deps.format(result.profit)} 兩；主角與參與商隊的傭兵獲得經驗。`) : previous.logs;
  for (const event of result.tradeEvents) {
    const delta = event.revenueDelta === 0 ? "" : event.revenueDelta > 0 ? ` 收益增加 ${deps.format(event.revenueDelta)} 兩。` : ` 收益減少 ${deps.format(Math.abs(event.revenueDelta))} 兩。`;
    logs = deps.addLog(logs, `商路事件「${event.name}」：${event.message}${delta}`);
  }
  const released = result.releasedEscorts;
  const releasedToActive = released.length && previous.trade.caravan?.escortRoster !== "resting";
  const active = releasedToActive ? [...new Set([...previous.active, ...released])] : previous.active;
  const latestEvent = result.tradeEvents.at(-1);
  const lastEncounter = latestEvent ? `商路事件「${latestEvent.name}」：${latestEvent.message}` : previous.lastEncounter;
  const tradeXpIds = new Set([...previous.active, ...(previous.trade.caravan?.escortIds || []), ...released]);
  const tradeXp = Math.floor(result.xp * (1 + guildSkillTradeBonuses(previous.guildSkills).xpBonus));
  const tradeMercXp = Math.floor(tradeXp * .8);
  const next: GameState = { ...previous, trade: result.trade, gold: result.gold, active, lastEncounter, hero: grantTerritoryXp(previous, previous.hero, tradeXp), mercs: previous.mercs.map((unit) => tradeXpIds.has(unit.uid) ? grantTerritoryXp(previous, unit, tradeMercXp) : unit), restingMercs: previous.restingMercs.map((unit) => tradeXpIds.has(unit.uid) ? grantTerritoryXp(previous, unit, tradeMercXp) : unit), logs };
  return next;
}

/** Public game-loop entry point with all battle and trade dependencies wired in one module. */
export function settleCurrentGame(previous: GameState, rolls: GameTickRolls): GameState {
  return settleGameLoop(previous, rolls, {
    runDungeon: (state, action, now, key, dungeonRolls) => runDungeonAction(state, action, now, key, dungeonRolls, {
      addLog: appendGameLog,
      grantXp,
      enterInn: enterGameInnAction,
      leaveInn: leaveGameInnAction,
    }),
    grantXp,
    grantCreditXp,
    addLog: appendGameLog,
    format: formatGameNumber,
  });
}
