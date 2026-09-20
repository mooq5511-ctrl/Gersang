import { dungeonBusy } from "./dungeon-engine";
import { EQUIPMENT_SLOTS } from "./equipment-slots";
import type { GameState } from "./game-state";

type Contract = { id: string; name: string; metric: string; target: number; reward: { gold: number } };
type Log = (logs: string[], message: string) => string[];

export function contractProgress(state: GameState, metric: string) {
  if (metric === "stage") return state.stage;
  if (metric === "kills") return state.kills;
  if (metric === "starterDelivery") return state.starterDeliveryKills;
  if (metric === "mercs") return state.mercs.length;
  if (metric === "tier1") return state.mercs.filter((unit) => unit.tier >= 1).length;
  if (metric === "tier2") return state.mercs.filter((unit) => unit.tier >= 2).length;
  if (metric === "materials") return Object.values(state.materials).reduce((sum, value) => sum + value, 0);
  if (metric === "awakened") return state.mercs.filter((unit) => unit.awakened).length;
  return state.inventory.length + EQUIPMENT_SLOTS.filter((slot) => state.hero.equip[slot]).length + state.mercs.reduce((sum, unit) => sum + EQUIPMENT_SLOTS.filter((slot) => unit.equip[slot]).length, 0);
}

export function claimContractAction(state: GameState, contracts: Contract[], contractId: string, addLog: Log, notify: (message: string) => void): GameState {
  if (dungeonBusy(state.dungeon)) { notify("副本或療傷期間暫停此操作，請先完成療傷。"); return state; }
  const contract = contracts.find((entry) => entry.id === contractId);
  if (!contract || state.claimedContracts.includes(contractId)) return state;
  if (contractProgress(state, contract.metric) < contract.target) { notify("委託條件尚未完成。"); return state; }
  return { ...state, gold: state.gold + contract.reward.gold, claimedContracts: [...state.claimedContracts, contractId], logs: addLog(state.logs, `完成委託「${contract.name}」，領取商團獎勵。`) };
}
