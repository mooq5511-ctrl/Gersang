import { dungeonBusy } from "./dungeon-engine";
import { recoverVitals } from "./vitals-engine";
import { worldCities } from "./v15-data";
import type { GameState, Hero, Unit } from "./game-state";

type Log = (logs: string[], message: string) => string[];
type GrantXp = <T extends Unit | Hero>(unit: T, amount: number) => T;

export function travelCityAction(state: GameState, cityId: string, addLog: Log, format: (value: number) => string, notify: (message: string) => void): GameState {
  const destination = worldCities.find((city) => city.id === cityId);
  if (!destination || destination.id === state.city) return state;
  const origin = worldCities.find((city) => city.id === state.city) || worldCities[0], cost = origin.nation === destination.nation ? Math.floor(destination.travelFee * .45) : destination.travelFee;
  if (state.gold < cost) { notify(`前往「${destination.name}」需要 ${format(cost)} 兩旅費。`); return state; }
  return { ...state, city: destination.id, gold: state.gold - cost, logs: addLog(state.logs, `商團抵達「${destination.name}」。`) };
}

export function restAtInnAction(state: GameState, priceFactor: number, cityName: string, addLog: Log, grantXp: GrantXp, notify: (message: string) => void): GameState {
  if (dungeonBusy(state.dungeon)) { notify("副本戰鬥期間無法入住，請先撤退。"); return state; }
  const cost = Math.floor(1800 * priceFactor);
  if (state.gold < cost) { notify(`入住客棧需要 ${cost.toLocaleString()} 兩。`); return state; }
  return { ...state, gold: state.gold - cost, hero: recoverVitals(grantXp(state.hero, 700)), mercs: state.mercs.map((unit) => recoverVitals(state.active.includes(unit.uid) ? grantXp(unit, 550) : unit)), logs: addLog(state.logs, `在${cityName}客棧休息，全員 HP / MP 恢復至上限，主角與出戰傭兵獲得修練經驗。`) };
}
