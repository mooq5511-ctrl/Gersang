export type BattleLogCategory = "battle" | "reward" | "auto-hunt" | "auto-potion" | "warning";
export type BattleLogEntry = { id: string; sequence: number; at: number; category: BattleLogCategory; message: string };

const MAX_BATTLE_LOGS = 100;

function isEntry(value: unknown): value is BattleLogEntry {
  return !!value && typeof value === "object" && typeof (value as BattleLogEntry).message === "string" && typeof (value as BattleLogEntry).at === "number";
}

/** Shared, newest-first battle history. It stores no combat state and does not control battle managers. */
export const BattleLogManager = Object.freeze({
  addLog(logs: readonly BattleLogEntry[] | undefined, message: string, category: BattleLogCategory = "battle", at = Date.now()): BattleLogEntry[] {
    const current = BattleLogManager.getLogs(logs);
    const sequence = (current[0]?.sequence || 0) + 1;
    return [{ id: `${at}-${sequence}`, sequence, at, category, message }, ...current].slice(0, MAX_BATTLE_LOGS);
  },

  clear(): BattleLogEntry[] {
    return [];
  },

  getLogs(logs: readonly BattleLogEntry[] | undefined): BattleLogEntry[] {
    return (logs || []).filter(isEntry).map((entry, index) => ({ ...entry, sequence: Number.isFinite(entry.sequence) ? entry.sequence : index + 1 })).slice(0, MAX_BATTLE_LOGS);
  },
});
