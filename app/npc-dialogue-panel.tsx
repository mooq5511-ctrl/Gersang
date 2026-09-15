"use client";

import { useMemo, useState } from "react";
import { BookOpen, Heart, LockKeyhole, Store, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_NPC_PORTRAIT, npcGreeting, npcQuestProgress, npcQuestState, type NpcOption, type VillageNpc } from "./npc-dialogue";
import type { GameState } from "./game-state";

type DialogueAction = { option: NpcOption; npc: VillageNpc };

export function NpcDialoguePanel({
  npc,
  game,
  initialLine,
  onAction,
  onClose,
}: {
  npc: VillageNpc;
  game: GameState;
  initialLine?: string;
  onAction: (action: DialogueAction) => void;
  onClose: () => void;
}) {
  const [line, setLine] = useState(() => initialLine || npcGreeting(game, npc));
  const [pages, setPages] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const phase = npcQuestState(game, npc);
  const affinity = game.npcProgress.affinity[npc.id] || 0;
  const quest = npc.quest;
  const progress = quest ? npcQuestProgress(game, quest) : 0;
  const history = useMemo(() => game.npcProgress.history.filter(entry => entry.npcId === npc.id), [game.npcProgress.history, npc.id]);
  const visibleOptions = npc.options.filter(option => {
    if (option.quest === "start") return phase === "before";
    if (option.quest === "complete") return phase === "active" && !!quest && progress >= quest.target;
    return true;
  });

  function choose(option: NpcOption) {
    setLine(option.reply);
    setPages(option.pages || []);
    setPageIndex(0);
    onAction({ option, npc });
  }

  return (
    <section className="npc-dialogue" role="dialog" aria-modal="true" aria-label={`${npc.name}對話`}>
      <button className="npc-dialogue-backdrop" type="button" aria-label="關閉對話" onClick={onClose} />
      <article className="npc-dialogue-card">
        <button className="npc-dialogue-close" type="button" aria-label="關閉對話" onClick={onClose}><X /></button>
        <aside className="npc-portrait-frame">
          <img src={npc.portrait || DEFAULT_NPC_PORTRAIT} alt={`${npc.name}立繪`} onError={event => { event.currentTarget.src = DEFAULT_NPC_PORTRAIT; }} />
          {!npc.portrait && <small>預設立繪</small>}
        </aside>
        <div className="npc-dialogue-main">
          <header><div><small>{npc.role}</small><h2>{npc.name}</h2></div><span className="npc-affinity"><Heart />好感 {affinity}/100</span></header>
          <p className="npc-dialogue-line">「{line}」</p>
          {pages.length > 0 && <div className="npc-dialogue-pages"><p>「{pages[pageIndex]}」</p>{pageIndex < pages.length - 1 && <Button size="sm" variant="ghost" onClick={() => setPageIndex(index => index + 1)}>繼續</Button>}</div>}
          {quest && <section className={`npc-quest-status ${phase}`}>
            <div><BookOpen /><span><strong>{quest.name}</strong><small>{phase === "before" ? "尚未接受" : phase === "complete" ? "已完成" : `${Math.min(progress, quest.target)} / ${quest.target}`}</small></span></div>
            {phase === "active" && progress >= quest.target && <Button size="sm" onClick={() => choose({ label: "回報任務", reply: "做得好，這是約定的謝禮。", quest: "complete" })}>回報任務</Button>}
          </section>}
          <div className="npc-dialogue-options">
            {visibleOptions.map(option => <Button key={option.label} variant="outline" onClick={() => choose(option)}>{option.service && <Store />}{option.openContracts && <BookOpen />}{option.label}</Button>)}
            {npc.hidden && (npc.hidden.requirement(game)
              ? <Button variant="outline" className="npc-hidden-option" onClick={() => choose({ label: npc.hidden!.label, reply: npc.hidden!.reply, hidden: true })}><LockKeyhole />{npc.hidden.label}</Button>
              : <span className="npc-hidden-locked"><LockKeyhole />隱藏對話：提升好感或推進旅程後開放</span>)}
          </div>
          <footer><Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}><Users />{showHistory ? "收起" : "對話紀錄"}</Button></footer>
          {showHistory && <div className="npc-history">{history.length ? history.map((entry, index) => <p key={`${entry.at}-${index}`}>{entry.text}</p>) : <p>尚無對話紀錄。</p>}</div>}
        </div>
      </article>
    </section>
  );
}
