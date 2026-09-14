import { dungeonBusy } from "./dungeon-engine";
import { settleCaravanIdle } from "./caravan-idle";
import { advanceTrade } from "./trade-engine";
import type { DungeonKey } from "./dungeon-engine";
import type { GameState, Hero, Unit } from "./game-state";
import { runDungeonAction } from "./game-battle-actions";
import { rollEquipment } from "./game-equipment-factory";
import { formatGameNumber } from "./game-display";
import { grantCreditXp, grantXp } from "./game-progression";
import { appendGameLog, enemyMaxForStage, enterGameInnAction, leaveGameInnAction } from "./game-runtime-actions";
import { resolveRoadEncounterAction } from "./game-trade-actions";

/** Random values are sampled once per tick so React retries cannot change an outcome. */
export function createGameTickRolls() {
  return {
    now: Date.now(), roll: Math.random(), choice: Math.random(), spawnRoll: Math.random(), encounterCountRoll: Math.random(),
    retaliationRoll: Math.random(), materialRolls: [Math.random(), Math.random(), Math.random()],
  };
}

type LoopDependencies = {
  runDungeon: (state: GameState, action: "tick", now: number, key: DungeonKey | undefined, rolls: GameTickRolls) => GameState;
  grantXp: <T extends Unit | Hero>(unit: T, amount: number) => T;
  grantCreditXp: (state: GameState, amount: number) => GameState;
  addLog: (logs: string[], message: string) => string[];
  format: (value: number) => string;
  resolveRoadEncounter: (state: GameState) => GameState;
};

export type GameTickRolls = {
  now: number; roll: number; choice: number; spawnRoll: number; encounterCountRoll: number; retaliationRoll: number; materialRolls: number[];
};

/** Settles the shared idle timer, dungeon state and caravan completion exactly once. */
export function settleGameLoop(previous: GameState, rolls: GameTickRolls, deps: LoopDependencies): GameState {
  const { now, roll, choice, spawnRoll, encounterCountRoll, retaliationRoll, materialRolls } = rolls;
  if (dungeonBusy(previous.dungeon)) {
    const battle = previous.dungeon!;
    const due = battle.status === "respawning" ? battle.spawnAt : battle.status === "recovering" ? (battle.innHealAt || battle.stamp + 2000) : battle.stamp + 50;
    if (now < due) return previous;
    const pause = Math.max(0, now - (previous.dungeon!.pauseAt || previous.dungeon!.stamp || now));
    let next = deps.runDungeon(previous, "tick", now, undefined, { now, roll, choice, spawnRoll, encounterCountRoll, retaliationRoll, materialRolls });
    next = { ...next, dungeon: { ...next.dungeon!, pauseAt: now } };
    if (next.trade.caravan) next = { ...next, trade: { ...next.trade, caravan: { ...next.trade.caravan, startedAt: next.trade.caravan.startedAt + pause } } };
    if (previous.dungeon!.status === "recovering") return { ...next, idleStamp: now };
    const idle = settleCaravanIdle(previous.idleStamp, now, Math.max(previous.stage, previous.hero.level));
    return deps.grantCreditXp({ ...next, idleStamp: idle.stamp, gold: next.gold + idle.gold, credit: next.credit + idle.credit }, idle.credit);
  }
  const idle = settleCaravanIdle(previous.idleStamp, now, Math.max(previous.stage, previous.hero.level));
  if (idle.stamp !== previous.idleStamp) previous = deps.grantCreditXp({ ...previous, idleStamp: idle.stamp, gold: previous.gold + idle.gold, credit: previous.credit + idle.credit }, idle.credit);
  const result = advanceTrade(previous.trade, previous.gold, now);
  if (!result.trips && !result.encounters) return previous;
  let next: GameState = { ...previous, trade: result.trade, gold: result.gold, hero: deps.grantXp(previous.hero, result.xp), mercs: previous.mercs.map((unit) => previous.active.includes(unit.uid) ? deps.grantXp(unit, Math.floor(result.xp * .8)) : unit), logs: result.trips ? deps.addLog(previous.logs, `商隊完成 ${result.trips} 趟交易，淨利 ${deps.format(result.profit)} 兩；主角與出戰傭兵獲得經驗。`) : previous.logs };
  for (let index = 0; index < result.encounters; index++) next = deps.resolveRoadEncounter(next);
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
    resolveRoadEncounter: (state) => resolveRoadEncounterAction(state, {
      addLog: appendGameLog,
      enterInn: enterGameInnAction,
      grantXp,
      rollEquipment,
      enemyMax: enemyMaxForStage,
      format: formatGameNumber,
    }),
  });
}
