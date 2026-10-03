"use client";
import { ChevronDown } from "lucide-react";
import { claimAdventureQuest } from "./adventure-quests";
import { gameplayContracts } from './game-catalog';
import { grantXp } from "./game-progression";
import { type NpcId } from "./npc-dialogue";
import { QuestJournal } from "./quest-journal";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "game" | "goToObjective" | "mainObjective" | "objectiveExpanded" | "openNpcDialogue" | "roadmapStages" | "setActiveTab" | "setGame" | "setObjectiveExpanded">;

export function GameQuestPanel({ game, goToObjective, mainObjective, objectiveExpanded, openNpcDialogue, roadmapStages, setActiveTab, setGame, setObjectiveExpanded }: Props) {
return <><section className={`main-objective${objectiveExpanded ? "" : " is-collapsed"}`} aria-label="目前主線目標">
        {objectiveExpanded ? <QuestJournal game={game} current={mainObjective} stages={roadmapStages} contracts={gameplayContracts} onClaim={id => setGame(previous => claimAdventureQuest(previous, id, Date.now(), grantXp))} onClose={() => setObjectiveExpanded(false)} onNavigate={destination => {
          setObjectiveExpanded(false);
          if (destination === "current") goToObjective();
          else if (["contracts", "hall", "battle", "squad", "trade", "relic"].includes(destination)) setActiveTab(destination);
          else { setActiveTab("map"); openNpcDialogue(destination as NpcId); }
        }}/> : <div className="objective-collapsed-row"><strong className="objective-collapsed-label" title={mainObjective.title}>任務・{mainObjective.title}</strong><button type="button" className="objective-collapse-toggle" aria-expanded={false} aria-label="展開完整任務面板" title="展開完整任務面板" onClick={() => setObjectiveExpanded(true)}><ChevronDown aria-hidden="true"/></button></div>}
      </section></>;
}
