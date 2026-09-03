"use client";

import { useEffect, useState } from "react";
import { Anchor, ArrowRight, Coins, Compass, LockKeyhole, Package, Pause, Play, Ship, Shield, TrendingUp, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cargoCapacity, encounterCount, MAX_CARGO_LEVEL, TRADE_ROUTES, upgradeCost, voyageQuote, type TradeState } from "./trade-engine";

type Props = {
  trade: TradeState; gold: number; stage: number; escorts: number; logs: string[]; lastEncounter: string;
  onDispatch: (id: string) => void; onSelect: (id: string) => void;
  onUpgrade: () => void; onToggleAuto: () => void;
};
const fmt = (value: number) => Math.floor(value).toLocaleString("zh-TW");

export function TradePanel({ trade, gold, stage, escorts, logs, lastEncounter, onDispatch, onSelect, onUpgrade, onToggleAuto }: Props) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  const route = TRADE_ROUTES.find((item) => item.id === (trade.caravan?.routeId || trade.selectedRouteId)) || TRADE_ROUTES[0];
  const quote = trade.caravan || voyageQuote(route, trade.cargoLevel, escorts, 0);
  const progress = trade.caravan ? Math.min(100, Math.max(0, (now - trade.caravan.startedAt) / trade.caravan.duration * 100)) : 0;
  const secondsLeft = trade.caravan ? Math.max(0, Math.ceil((trade.caravan.startedAt + trade.caravan.duration - now) / 1000)) : route.seconds;
  const unlocked = trade.reputation >= route.reputation && stage >= route.stage;

  return <div className="trade-v21">
    <section className="trade-hero panel">
      <div className="trade-intro"><small>東海商路 / {trade.caravan ? "航行中" : "商隊待命"}</small><h2>{route.from}<em> → </em>{route.to}</h2><p>{quote.cargo} 箱{route.good} · 每趟淨利 <strong>+{fmt(quote.revenue - quote.cost)} 兩</strong><br />{trade.caravan ? "貨物正運往目的地，途中遭遇由護衛自動迎戰。" : "支付進貨成本即可出航，交易完成也會培養出戰隊伍。"}</p><Button disabled={!!trade.caravan || !unlocked || gold < quote.cost} onClick={() => onDispatch(route.id)}><Ship />{trade.caravan ? "商隊運送中" : !unlocked ? "尚未解鎖" : gold < quote.cost ? "資金不足" : "立即出航 · " + fmt(quote.cost) + " 兩"}</Button><div className="trade-tags"><span><Shield />{escorts} 名護衛協作</span><span><Anchor />離線上限 8 小時</span></div></div>
      <div className="trade-chart" aria-label={`${route.from}至${route.to}商路示意圖`}>
        <div className="trade-compass"><Compass /><span>四國貿易網</span><small>商路節點示意</small></div>
        <div className="trade-island trade-island-china"><small>CHINA</small><strong>中國</strong><span>南京</span></div>
        <div className="trade-island trade-island-korea"><small>KOREA</small><strong>朝鮮</strong><span>漢陽・釜山</span></div>
        <div className="trade-island trade-island-japan"><small>JAPAN</small><strong>日本</strong><span>京都・大阪</span></div>
        <div className="trade-island trade-island-taiwan"><small>TAIWAN</small><strong>台灣</strong><span>台北・台南</span></div>
        <div className={"trade-ship " + (trade.caravan ? "sailing" : "")}><Ship /><span>{trade.caravan ? "商隊航行中" : "商隊待命"}</span></div>
        <div className="trade-map-caption">{route.from}<ArrowRight />{route.to}<b>{route.good}</b></div>
      </div>
    </section>
    <div className="trade-metrics">
      <article><Coins /><span>商團資金<strong>{fmt(gold)}<small> 兩</small></strong></span></article>
      <article><TrendingUp /><span>累積貿易淨利<strong>{fmt(trade.totalProfit)}<small> 兩</small></strong></span></article>
      <article><Compass /><span>商譽<strong>{fmt(trade.reputation)}<small> 聲望</small></strong></span></article>
      <article><Ship /><span>成交航次<strong>{fmt(trade.trips)}<small> 趟</small></strong></span></article>
    </div>
    <div className="trade-columns">
      <section className="panel trade-routes"><div className="panel-title"><Compass /><h2>選擇你的商路</h2><span>04 條貿易航線</span></div><p className="section-copy">商譽與戰場關卡共同解鎖新航線。每名出戰傭兵增加 1.5% 售價，最多 15%。</p>
        <div className="trade-route-grid">{TRADE_ROUTES.map((item, index) => {
          const available = trade.reputation >= item.reputation && stage >= item.stage;
          const terms = voyageQuote(item, trade.cargoLevel, escorts, 0);
          return <button type="button" key={item.id} className={"trade-route " + (trade.selectedRouteId === item.id ? "selected " : "") + (!available ? "locked" : "")} onClick={() => onSelect(item.id)} aria-pressed={trade.selectedRouteId === item.id} style={{ "--route-color": item.color } as React.CSSProperties}>
            <div><small>0{index + 1} / {item.nation}</small>{available ? <span>{item.seconds} 秒 / 趟</span> : <LockKeyhole size={15} />}</div>
            <h3>{item.from}<ArrowRight />{item.to}</h3><p><Package />{item.good}・{cargoCapacity(trade.cargoLevel)} 箱</p>
            <footer><span>每趟淨利<strong>+{fmt(terms.revenue - terms.cost)} 兩</strong></span><small>{available ? "已開通" : `需商譽 ${item.reputation}・第 ${item.stage} 關`}</small></footer>
          </button>;
        })}</div>
      </section>
      <aside className="trade-sidebar">
        <section className="panel trade-dispatch"><div className="panel-title"><Ship /><h2>{trade.caravan ? "商隊航行中" : "商隊調度"}</h2><span className="trade-live">{trade.caravan ? "進行中" : "待命"}</span></div>
          <div className="trade-destination"><strong>{route.from}</strong><ArrowRight /><strong>{route.to}</strong></div><p>{quote.cargo} 箱{route.good} · {trade.caravan ? (now ? secondsLeft + " 秒後抵達" : "計算航程中") : route.seconds + " 秒航程"}</p>
          <Progress value={progress} aria-label="商隊航程" />
          <p className="trade-encounter-status" role="status">{trade.caravan ? `本趟遭遇 ${trade.caravan.encountersResolved} / ${encounterCount(trade.caravan.encounterSeed)} 場` : "每趟隨機遭遇 0～10 場戰鬥"}<br /><small>自動迎戰，最多 30 回合；未能擊退則撤離，不扣貨款。</small></p>
          <dl><div><dt>進貨成本</dt><dd>{fmt(quote.cost)} 兩</dd></div><div><dt>售出總額</dt><dd>{fmt(quote.revenue)} 兩</dd></div><div><dt>每趟淨利</dt><dd className="trade-profit">+{fmt(quote.revenue - quote.cost)} 兩</dd></div><div><dt>養成收益</dt><dd>商譽 +{quote.reputation} · 經驗 +{quote.xp}</dd></div></dl>
          <Button className="trade-primary" disabled={!!trade.caravan || !unlocked || gold < quote.cost} onClick={() => onDispatch(route.id)}><Ship />{trade.caravan ? "運送貨物中" : !unlocked ? "尚未解鎖此航線" : gold < quote.cost ? "進貨資金不足" : "裝貨並出航"}</Button>
          <Button variant="outline" className="trade-primary" onClick={onToggleAuto}>{trade.auto ? <Pause /> : <Play />}{trade.auto ? "連續經商已開啟 · 點此關閉" : "連續經商已關閉 · 點此開啟"}</Button>
          <small className="trade-hint">關閉連續經商後，本趟仍會完成。航行中保留出發時的貨量與護衛加成。</small>
        </section>
        <section className="panel trade-upgrade"><div className="panel-title"><Warehouse /><h2>商隊貨艙</h2><span>Lv.{trade.cargoLevel}</span></div><p><strong>{cargoCapacity(trade.cargoLevel)}</strong> 箱容量 <span>升級 +5 箱</span></p><Button variant="secondary" disabled={!!trade.caravan || trade.cargoLevel >= MAX_CARGO_LEVEL || gold < upgradeCost(trade.cargoLevel)} onClick={onUpgrade}>{trade.cargoLevel >= MAX_CARGO_LEVEL ? "貨艙已滿級" : trade.caravan ? "停靠後可升級" : "升級 · " + fmt(upgradeCost(trade.cargoLevel)) + " 兩"}</Button></section>
      </aside>
    </div>
    <section className="panel trade-ledger"><div className="panel-title"><Shield /><h2>最近遭遇戰</h2><span>僅在跑商途中觸發</span></div><p role="status">{lastEncounter}</p><ol>{logs.slice(0, 6).map((log, index) => <li key={index}><span>{String(index + 1).padStart(2, "0")}</span>{log}</li>)}</ol></section>
  </div>;
}
