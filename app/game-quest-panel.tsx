"use client";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import './game-detail-dialog.css';
import { claimAdventureQuest } from "./adventure-quests";
import { gameplayContracts } from './game-catalog';
import { grantXp } from "./game-progression";
import { type NpcId } from "./npc-dialogue";
import { QuestJournal } from "./quest-journal";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "game" | "goToObjective" | "mainObjective" | "objectiveExpanded" | "openNpcDialogue" | "roadmapStages" | "setActiveTab" | "setGame" | "setObjectiveExpanded">;

export function GameQuestPanel({ game, goToObjective, mainObjective, objectiveExpanded, openNpcDialogue, roadmapStages, setActiveTab, setGame, setObjectiveExpanded }: Props) {
return <><section className="main-objective is-collapsed" aria-label="目前主線目標">
        <div className="objective-collapsed-row"><strong className="objective-collapsed-label" title={mainObjective.title}>任務・{mainObjective.title}</strong><button type="button" className="objective-collapse-toggle" aria-haspopup="dialog" aria-expanded={objectiveExpanded} aria-label="查看任務詳情" title="查看任務詳情" onClick={() => setObjectiveExpanded(true)}><ChevronDown aria-hidden="true"/></button></div>
      </section>
      <Dialog open={objectiveExpanded} onOpenChange={setObjectiveExpanded}>
        <DialogContent className="game-detail-dialog quest-detail-dialog classic-live-game" overlayClassName="game-detail-overlay" showCloseButton={false}>
          <header className="game-detail-heading"><DialogTitle>任務詳情</DialogTitle><DialogClose render={<button type="button" aria-label="關閉任務詳情"/>}>×</DialogClose></header>
          <DialogDescription>查看目標、進度與獎勵；關閉視窗不會取消任務。</DialogDescription>
          <div className="game-detail-body"><QuestJournal game={game} current={mainObjective} stages={roadmapStages} contracts={gameplayContracts} onClaim={id => setGame(previous => claimAdventureQuest(previous, id, Date.now(), grantXp))} onClose={() => setObjectiveExpanded(false)} onNavigate={destination => {
          setObjectiveExpanded(false);
          if (destination === "current") goToObjective();
          else if (["contracts", "hall", "battle", "squad", "trade", "relic"].includes(destination)) setActiveTab(destination);
          else { setActiveTab("map"); openNpcDialogue(destination as NpcId); }
        }}/></div>
        </DialogContent>
      </Dialog></>;
}
