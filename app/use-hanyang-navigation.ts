"use client";
import { useEffect, useEffectEvent } from "react";
import type { GameStateSetter } from './game-controller-types';
import { FIRST_CARAVAN_TARGET } from "./game-progression-view";
import { type GameState } from "./game-state";
import { pauseHanyangTutorialBattle,syncHanyangPrologue } from "./hanyang-prologue";

type useHanyangReturnEffectsContext = {
game: GameState;
setGame: GameStateSetter;
setNotice: (notice: string) => void;
};

export function useHanyangReturnEffects({ game, setGame, setNotice }: useHanyangReturnEffectsContext) {
// React 19.2 effect events read the latest state without adding a 200ms tick
// dependency: this pause/notice still runs only when the tutorial step changes.
const pauseTutorialBattle = useEffectEvent(() => {
    if (pauseHanyangTutorialBattle(game) !== game) setNotice("序章回城整備：已停止自動練功；療傷後不會自動再戰。完成序章後可自由練功。");
    setGame(pauseHanyangTutorialBattle);
  });
useEffect(() => { pauseTutorialBattle(); }, [game.hanyangPrologueStep]);

useEffect(() => {
    if (game.hanyangPrologueStep !== "bandit-trial" || game.dungeon?.status === "fighting") return;
    const banditVictoryLogged = game.dungeon?.logs.some((entry) => entry.includes("成功擊敗") && (entry.includes("黑巾斥候") || entry.includes("黑巾山賊")));
    if (!banditVictoryLogged) return;
    setGame((previous) => ({ ...previous, hanyangPrologueStep: "caravan-delivery", hanyangPrologueFlags: { ...previous.hanyangPrologueFlags, caravanRestored: true }, dungeon: previous.dungeon ? { ...previous.dungeon, status: "idle", autoHunt: false } : previous.dungeon }));
  }, [game.dungeon, game.hanyangPrologueStep, setGame]);

useEffect(() => {
    if (game.hanyangPrologueStep !== "return" || game.hanyangPrologueFlags.caravanCargoDelivered) return;
    setGame(previous => ({ ...previous, hanyangPrologueStep: "caravan-delivery" }));
  }, [game.hanyangPrologueStep, game.hanyangPrologueFlags.caravanCargoDelivered, setGame]);
}

type useHanyangFormationEffectContext = {
activeTab: string;
game: GameState;
setGame: GameStateSetter;
};

export function useHanyangFormationEffect({ activeTab, game, setGame }: useHanyangFormationEffectContext) {
useEffect(() => {
    if (activeTab !== "squad" || game.hanyangPrologueStep !== "formation") return;
    setGame(previous => previous.hanyangPrologueStep === "formation" ? syncHanyangPrologue(previous, 6000) : previous);
  }, [activeTab, game.hanyangPrologueStep, game.active, game.mercs, setGame]);
}

type useHanyangKillEffectContext = {
game: GameState;
setGame: GameStateSetter;
};

export function useHanyangKillEffect({ game, setGame }: useHanyangKillEffectContext) {
useEffect(() => {
    if ((game.hanyangPrologueStep === "outskirts" || game.hanyangPrologueStep === "first-sale") && game.starterDeliveryKills < FIRST_CARAVAN_TARGET) {
      if (game.hanyangPrologueStep !== "outskirts") setGame(previous => ({ ...previous, hanyangPrologueStep: "outskirts" }));
    } else if ((game.hanyangPrologueStep === "outskirts" || game.hanyangPrologueStep === "first-battle") && game.starterDeliveryKills >= FIRST_CARAVAN_TARGET) {
      setGame(previous => ({ ...previous, hanyangPrologueStep: "first-sale" }));
    }
  }, [game.hanyangPrologueStep, game.starterDeliveryKills, setGame]);
}
