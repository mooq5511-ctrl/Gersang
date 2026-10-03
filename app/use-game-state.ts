'use client';
import { useCallback, useState } from 'react';
import { positionInventory } from './inventory-layout';
import { freshGame } from './game-hero-factory';
import { applyGersangVisuals } from './game-save-normalizers';
import { normalizeQuestLedger, syncQuestProgress } from './adventure-quests';
import { syncCityHallLifetime } from './city-hall-commissions';
import { type GameState } from './game-state';

/** Central update boundary: quests, lifetime counters, inventory placement, and visual normalization. */
export function useGameState() {
  const [game, rawSetGame] = useState<GameState>(() => {
    const initial = freshGame();
    return {
      ...initial,
      questLedger: normalizeQuestLedger(
        undefined,
        Date.now(),
        initial.hero.level,
      ),
    };
  });

  const setGame = useCallback(
    (action: GameState | ((previous: GameState) => GameState)) =>
      rawSetGame((previous) => {
        const next = typeof action === 'function' ? action(previous) : action;
        const sameCharacterUpdate =
          typeof action === 'function' ||
          (next.questLedger && next.questLedger === previous.questLedger);
        const questSynced = sameCharacterUpdate
          ? syncQuestProgress(previous, next, Date.now())
          : {
              ...next,
              questLedger: normalizeQuestLedger(
                next.questLedger,
                Date.now(),
                next.hero.level,
              ),
            };
        const synced =
          questSynced === previous
            ? previous
            : syncCityHallLifetime(previous, questSynced);
        if (synced === previous) return previous;
        const inventory =
          synced.inventory === previous.inventory
            ? synced.inventory
            : positionInventory(synced.inventory);
        return applyGersangVisuals({ ...synced, inventory });
      }),
    [],
  );
  return { game, setGame };
}
