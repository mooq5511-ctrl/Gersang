import type { GameState } from './game-state';

/** All controllers use the root setter so quest/prologue synchronization stays centralized. */
export type GameStateSetter = (
  action: GameState | ((previous: GameState) => GameState),
) => void;

export type EquipmentEnhanceFeedback = {
  uid: string;
  name: string;
  success: boolean;
  level: number;
};
