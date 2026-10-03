"use client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BedDouble,ChevronUp } from "lucide-react";
import { payGameInnAction as payGameInn } from "./game-runtime-actions";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "game" | "heroVital" | "innPanelExpanded" | "quickHealCost" | "setGame" | "setInnPanelExpanded">;

export function GameInnPanel({ game, heroVital, innPanelExpanded, quickHealCost, setGame, setInnPanelExpanded }: Props) {
return <><section id="inn-zone" className="forced-inn" hidden={game.hero.status!=='客棧中' || !innPanelExpanded} aria-live="polite">
        <button type="button" className="forced-inn-collapse-toggle" aria-label="收起客棧療傷資訊" title="收起客棧療傷資訊" onClick={() => setInnPanelExpanded(false)}><ChevronUp aria-hidden="true"/></button>
        <BedDouble aria-hidden="true"/><div><small>漢陽客棧</small><h2>戰敗療傷中</h2><p>戰鬥已停止。每 2 秒自動恢復 10 點 HP，生命值全滿後會自動離開客棧。</p><Progress value={heroVital.hp/heroVital.maxHp*100} aria-label="客棧療傷進度"/></div>
        <Button type="button" onClick={()=>setGame(payGameInn)}>💰 付費快速治療<small>{quickHealCost.toLocaleString('zh-TW')} 兩</small></Button>
      </section>
{game.hero.status==='客棧中' && !innPanelExpanded && <button type="button" className="forced-inn-reopen" aria-controls="inn-zone" aria-expanded={false} onClick={() => setInnPanelExpanded(true)}>客棧療傷中・顯示資訊</button>}</>;
}
