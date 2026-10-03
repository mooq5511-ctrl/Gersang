"use client";
import { Coins,HeartPulse,Sparkles,Swords } from "lucide-react";
import { formatGameNumber as format } from "./game-display";
import { LEVEL_CAP } from "./level-progression";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "displayCityName" | "displayedPower" | "game" | "heroVital" | "heroXpNeeded">;

export function GameLiveFooter({ displayCityName, displayedPower, game, heroVital, heroXpNeeded }: Props) {
return <><footer className="classic-live-footer">
        <section className="classic-live-identity">
          <img src={game.hero.image} alt="" />
          <div><small>LV {game.hero.level} · {game.hero.job}</small><strong>{game.hero.name}</strong><span>{displayCityName} · 世界地圖進度</span></div>
        </section>
        <section className="classic-live-resources">
          <div><Coins /><span>{format(game.gold)} 兩</span></div>
          <div><HeartPulse /><span>{heroVital.hp} / {heroVital.maxHp}</span></div>
          <div title="主角升級經驗"><Sparkles /><span>{game.hero.level>=LEVEL_CAP?'EXP 已滿級':`EXP ${format(game.hero.xp)} / ${format(heroXpNeeded)}`}</span></div>
          <div><Swords /><span>{format(displayedPower(game.hero)+game.mercs.reduce((sum,unit)=>sum+displayedPower(unit),0))}</span></div>
        </section>
        <section className="classic-live-log" aria-label="即時訊息">
          {game.logs.slice(0, 4).map((log, index) => <p key={index}>{log}</p>)}
        </section>
      </footer></>;
}
