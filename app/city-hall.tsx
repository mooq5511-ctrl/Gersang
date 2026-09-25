"use client";

import { Building2, CheckCircle2, Coins, RefreshCw, ScrollText, Ticket, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CITY_HALL_REFRESH_TICKET_PRICE,
  cityHallActiveLimit,
  cityHallCommission,
  cityHallCommissionProgress,
  type CityHallState,
} from "./city-hall-commissions";
import type { GameState } from "./game-state";

function rewardText(commission: NonNullable<ReturnType<typeof cityHallCommission>>) {
  const materials = Object.entries(commission.rewardMaterials || {}).map(([name, amount]) => `${name} ×${amount}`);
  return [`${commission.rewardGold.toLocaleString("zh-TW")} 兩`, `信用經驗 ${commission.rewardCreditXp}`, ...materials].join("・");
}

export function CityHall({
  game,
  onAccept,
  onClaim,
  onAbandon,
  onRefresh,
  onBuyTicket,
}: {
  game: GameState;
  onAccept: (commissionId: string) => void;
  onClaim: (commissionId: string) => void;
  onAbandon: (commissionId: string) => void;
  onRefresh: () => void;
  onBuyTicket: () => void;
}) {
  const hall: CityHallState = game.cityHall;
  const activeLimit = cityHallActiveLimit(game.creditLevel);
  const available = hall.availableIds.flatMap((id) => { const commission = cityHallCommission(id); return commission ? [commission] : []; });
  const active = hall.active.flatMap((entry) => { const commission = cityHallCommission(entry.id); return commission ? [{ entry, commission, progress: cityHallCommissionProgress(game, entry) }] : []; });
  return <section className="city-hall-board" aria-label="市政廳委託中心">
    <header className="city-hall-heading">
      <div><small>漢陽村・公共事務</small><h2><Building2 />市政廳</h2><p>張貼村民、商隊與守衛的委託，完成後回到市政廳領取報酬。</p></div>
      <div className="city-hall-resources"><span><ScrollText />進行中 <b>{active.length}/{activeLimit}</b></span><span><Ticket />刷新券 <b>{hall.refreshTickets}</b></span></div>
    </header>

    <section className="city-hall-toolbar" aria-label="委託操作"><div><strong>公告欄</strong><small>同時顯示 {available.length} / 5 份可接委託；完成後自動補充。</small></div><div className="city-hall-toolbar-actions"><Button size="sm" variant="outline" disabled={!hall.refreshTickets} onClick={onRefresh}><RefreshCw />使用刷新券</Button><Button size="sm" onClick={onBuyTicket} disabled={game.gold < CITY_HALL_REFRESH_TICKET_PRICE}><Ticket />購買刷新券・{CITY_HALL_REFRESH_TICKET_PRICE.toLocaleString("zh-TW")} 兩</Button></div></section>

    <section className="city-hall-section"><h3>可接取委託</h3><div className="city-hall-commission-grid">{available.map((commission) => <article className="city-hall-commission-card" key={commission.id}><header><span>{commission.category}</span><strong>{commission.name}</strong></header><p>{commission.description}</p><small>目標：{commission.target}（依接取時開始計算）</small><em>獎勵：{rewardText(commission)}</em><Button size="sm" onClick={() => onAccept(commission.id)} disabled={active.length >= activeLimit}>接取委託</Button></article>)}{available.length === 0 && <p className="city-hall-empty">目前沒有可接取委託，請使用委託刷新券。</p>}</div></section>

    <section className="city-hall-section"><h3>進行中委託</h3><div className="city-hall-active-list">{active.map(({ entry, commission, progress }) => { const ready = progress >= commission.target; return <article className={ready ? "city-hall-active-card ready" : "city-hall-active-card"} key={entry.id}><div className="city-hall-active-copy"><span>{commission.category}</span><strong>{commission.name}</strong><p>{commission.description}</p></div><div className="city-hall-active-progress"><span>{Math.min(progress, commission.target)} / {commission.target}</span><Progress value={Math.min(100, progress / commission.target * 100)} /><small>{ready ? "條件已完成，可領取獎勵" : "完成條件後回到市政廳"}</small></div><div className="city-hall-active-actions"><Button size="sm" variant={ready ? "default" : "outline"} disabled={!ready} onClick={() => onClaim(entry.id)}>{ready ? <CheckCircle2 /> : <XCircle />}{ready ? "領取獎勵" : "進行中"}</Button><Button size="sm" variant="ghost" onClick={() => onAbandon(entry.id)}>放棄</Button></div></article>; })}{active.length === 0 && <p className="city-hall-empty">尚未接取市政廳委託。</p>}</div></section>

    <footer className="city-hall-footer"><Coins /><span>商團 Lv.{game.creditLevel} 可同時接取 {activeLimit} 件委託；委託沒有期限，完成或放棄後才會釋放欄位。</span></footer>
  </section>;
}
