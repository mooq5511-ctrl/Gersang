"use client";
import { Button } from "@/components/ui/button";
import { Coins,HeartPulse,Swords,Users } from "lucide-react";
import { formatGameNumber as format } from "./game-display";
import { ACTIVE_MERCENARY_LIMIT } from './guild-migration';
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "activePartyHp" | "activePartyMaxHp" | "displayedPower" | "game" | "returnToCharacterSelect">;

export function GameHeader({ activePartyHp, activePartyMaxHp, displayedPower, game, returnToCharacterSelect }: Props) {
return <><header className="topbar">
        <div className="brand">
          <div className="brand-seal">合</div>
          <div><h1>放置你的巨商魂</h1><p>雷霆祭壇與等級曲線</p></div>
        </div>
        <div className="resource-strip v15-resources">
          <div className="resource-card resource-gold" aria-label="商團資金" title="銀兩：用於招募、商店、客棧與城市建設"><Coins /><span>{format(game.gold)}</span><small>兩</small></div>
          <div className="resource-card resource-credit" aria-label="信用值" title="信用值：用於商團升階與商團技能"><Coins /><span>{format(game.credit)}</span><small>信用值 · Lv.{game.creditLevel}</small></div>
          <div className={`resource-card resource-hp ${game.hero.status==='客棧中'?'hp-status at-inn':'hp-status'}`} aria-label="隊伍生命值" title="隊伍血量：影響戰鬥與遺跡遠征，歸零會撤退"><HeartPulse /><span id="p-hp">{activePartyHp} / {activePartyMaxHp}</span><small>隊伍血量 · {game.hero.status}</small></div>
          <div className="resource-card resource-power" aria-label="總商隊戰力" title="總商隊戰力：影響地圖戰鬥、商路護衛與遺跡效率"><Swords /><span>{format(displayedPower(game.hero)+game.mercs.reduce((sum,unit)=>sum+displayedPower(unit),0))}</span><small>總商隊戰力</small></div>
          <div className="resource-card resource-mercs" aria-label="出戰傭兵" title="出戰傭兵：組成商路護衛與遺跡遠征隊"><Users /><span>{game.active.length}/{ACTIVE_MERCENARY_LIMIT}</span><small>出戰傭兵</small></div>
          <Button className="character-switch" variant="outline" size="sm" onClick={returnToCharacterSelect}><Users />切換角色</Button>
        </div>
      </header></>;
}
