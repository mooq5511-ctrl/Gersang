"use client";
import { useEffect } from "react";
import type { GameStateSetter } from './game-controller-types';
import { type GameState } from "./game-state";
import { guildSkillPointsForRank } from "./guild-rank";
import { normalizeGuildSkills } from "./guild-skills";

type useGameMaintenanceContext = {
activeSlot: number | null;
game: GameState;
ready: boolean;
setGame: GameStateSetter;
};

export function useGameMaintenance({ activeSlot, game, ready, setGame }: useGameMaintenanceContext) {
useEffect(() => {
    if (!ready || activeSlot === null) return;
    setGame(previous => {
      const normalizedSkills = normalizeGuildSkills(previous.guildSkills);
      const skillsChanged = JSON.stringify(normalizedSkills) !== JSON.stringify(previous.guildSkills);
      const skillLevelTotal = Object.values(normalizedSkills).reduce((sum, level) => sum + level, 0);
      const expectedPoints = Math.max(0, guildSkillPointsForRank(previous.guildRank) - skillLevelTotal);
      const legacyPoints = !Number.isFinite((previous as Partial<GameState>).guildSkillPoints) || Number(previous.guildSkillPoints) < expectedPoints;
      if (!legacyPoints && !skillsChanged) return previous;
      return { ...previous, guildSkillPoints: legacyPoints ? guildSkillPointsForRank(previous.guildRank) : previous.guildSkillPoints, guildSkills: normalizedSkills };
    });
  }, [ready, activeSlot, setGame]);

const relicStatus = game.relicDungeon?.status;
const dispatchNamesCount = game.relicDungeon?.dispatchPartyNames?.length;
const dispatchUidsCount = game.relicDungeon?.dispatchPartyUids?.length;
useEffect(() => {
    if (relicStatus !== "idle" || (!dispatchUidsCount && !dispatchNamesCount)) return;
    setGame(previous => {
      const current = previous.relicDungeon;
      if (!current || current.status !== "idle" || (!current.dispatchPartyUids?.length && !current.dispatchPartyNames?.length)) return previous;
      return { ...previous, relicDungeon: { ...current, dispatchPartyNames: [], dispatchPartyUids: [] } };
    });
  }, [relicStatus, dispatchNamesCount, dispatchUidsCount, setGame]);
}
