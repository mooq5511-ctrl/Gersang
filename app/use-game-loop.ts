'use client';
import { useEffect } from 'react';
import { createGameTickRolls, settleCurrentGame } from './game-loop';
import { grantXp } from './game-progression';
import { appendGameLog as addLog } from './game-runtime-actions';
import { applyAutoPotionAction } from './game-inventory-actions';
import type { GameStateSetter } from './game-controller-types';

/** Sample random rolls outside React updaters and stop the timer on character exit. */
export function useGameLoop({
  ready,
  activeSlot,
  setGame,
}: {
  ready: boolean;
  activeSlot: number | null;
  setGame: GameStateSetter;
}) {
  useEffect(() => {
    if (!ready || activeSlot === null) return;
    const timer = window.setInterval(() => {
      // 在 React 更新函式外抽樣，同一次回合重跑不會改變掉寶結果。
      const rolls = createGameTickRolls();
      setGame((previous) => {
        const settled = applyAutoPotionAction(
          settleCurrentGame(previous, rolls),
          Date.now(),
          addLog,
          grantXp,
        );
        return settled;
      });
    }, 200);
    return () => window.clearInterval(timer);
  }, [ready, activeSlot, setGame]);
}
