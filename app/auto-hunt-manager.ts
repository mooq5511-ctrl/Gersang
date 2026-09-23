/** Owns the Auto Hunt lifecycle decisions shared by the battle engine. */
export type AutoHuntBattleStatus = "idle" | "fighting" | "respawning" | "recovering";

export type AutoHuntLifecycle = {
  autoHunt?: boolean;
  status: AutoHuntBattleStatus;
  spawnAt: number;
};

export const AUTO_HUNT_RESPAWN_DELAY_MS = 500;

export const AutoHuntManager = Object.freeze({
  isEnabled(state: Pick<AutoHuntLifecycle, "autoHunt">): boolean {
    return state.autoHunt === true;
  },

  toggle(state: Pick<AutoHuntLifecycle, "autoHunt">): boolean {
    return !AutoHuntManager.isEnabled(state);
  },

  afterVictory(state: AutoHuntLifecycle, now: number) {
    const continueHunting = AutoHuntManager.isEnabled(state);
    return {
      autoHunt: continueHunting,
      status: continueHunting ? ("respawning" as const) : ("idle" as const),
      spawnAt: continueHunting ? now + AUTO_HUNT_RESPAWN_DELAY_MS : 0,
    };
  },

  afterDefeat() {
    return { autoHunt: false as const, spawnAt: 0 };
  },

  afterStop() {
    return AutoHuntManager.afterDefeat();
  },

  shouldStartNextEncounter(state: AutoHuntLifecycle, now: number): boolean {
    return AutoHuntManager.isEnabled(state) && state.status === "respawning" && now >= state.spawnAt;
  },
});
