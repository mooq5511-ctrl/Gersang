"use client";

import { useEffect, useState } from "react";
import { Anchor, ArrowRight, ChevronDown, Coins, Compass, LockKeyhole, Package, Pause, Play, Ship, Shield, TrendingUp, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cargoCapacity, marketMultiplier, MAX_CARGO_LEVEL, portInvestmentBonus, portInvestmentCost, portInvestmentLevel, TRADE_CARGOES, TRADE_ROUTES, upgradeCost, voyageQuote, type TradeState } from "./trade-engine";

type Props = {
  trade: TradeState; gold: number; stage: number; mercenaries: Array<{ uid: string; name: string; level: number; power: number; available: boolean }>; logs: string[]; lastEncounter: string;
  onDispatch: (id: string, escortIds: string[]) => void; onSelect: (id: string) => void;
  onUpgrade: () => void; onUpgradePort: () => void; onToggleAuto: () => void;
  onSelectCargo: (cargoId: string) => void; onToggleInsurance: () => void;
};
const fmt = (value: number) => Math.floor(value).toLocaleString("zh-TW");
type CollapseKey = "hero" | "metrics" | "routes" | "dispatch" | "upgrade" | "port" | "ledger";
function CollapseButton({ label, collapsed, onToggle }: { label: string; collapsed: boolean; onToggle: () => void }) {
  return <button type="button" className="trade-collapse-toggle" aria-label={`${collapsed ? "展開" : "收合"}${label}`} aria-expanded={!collapsed} onClick={onToggle}><span>{collapsed ? "展開" : "收合"}</span><ChevronDown aria-hidden="true" /></button>;
}

export function TradePanel({ trade, gold, stage, mercenaries, logs, lastEncounter, onDispatch, onSelect, onUpgrade, onUpgradePort, onToggleAuto, onSelectCargo, onToggleInsurance }: Props) {
  const [now, setNow] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<CollapseKey, boolean>>({ hero: false, metrics: false, routes: false, dispatch: false, upgrade: false, port: false, ledger: false });
  const toggleSection = (key: CollapseKey) => setCollapsed((previous) => ({ ...previous, [key]: !previous[key] }));
  const [selectedEscortIds, setSelectedEscortIds] = useState<string[]>(() => mercenaries.filter((unit) => unit.available).map((unit) => unit.uid));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  const availableEscortIds = mercenaries.filter((unit) => unit.available).map((unit) => unit.uid);
  const availableEscortSignature = availableEscortIds.join("|");
  useEffect(() => {
    setSelectedEscortIds(trade.caravan?.escortIds || (availableEscortSignature ? availableEscortSignature.split("|") : []));
  }, [trade.caravan?.routeId, trade.caravan?.startedAt, trade.caravan?.escortIds, availableEscortSignature]);
  const route = TRADE_ROUTES.find((item) => item.id === (trade.caravan?.routeId || trade.selectedRouteId)) || TRADE_ROUTES[0];
  const selectedEscorts = trade.caravan?.escortIds || selectedEscortIds;
  const selectedPower = mercenaries.filter((unit) => selectedEscorts.includes(unit.uid)).reduce((sum, unit) => sum + unit.power, 0);
  const routePort = route.from as "漢陽" | "台北" | "南京" | "江戶";
  const market = trade.market?.[route.id] ?? marketMultiplier(route.id);
  const investmentLevel = portInvestmentLevel(trade, routePort);
  const quote = trade.caravan || voyageQuote(route, trade.cargoLevel, selectedEscorts.length, 0, trade.rewardMultiplier, { cargoId: trade.selectedCargoId, marketMultiplier: market, portInvestmentLevel: investmentLevel, insurance: trade.insurance });
  const progress = trade.caravan ? Math.min(100, Math.max(0, (now - trade.caravan.startedAt) / trade.caravan.duration * 100)) : 0;
  const secondsLeft = trade.caravan ? Math.max(0, Math.ceil((trade.caravan.startedAt + trade.caravan.duration - now) / 1000)) : route.seconds;
  const unlocked = trade.reputation >= route.reputation && stage >= route.stage;

  const displayEncounter = lastEncounter.includes("尚未遭遇敵人") ? "尚未發生商路事件；商隊抵達後才會結算。" : lastEncounter;
  return <div className="trade-v21">
    <section className={`trade-hero panel ${collapsed.hero ? "is-collapsed" : ""}`}>
      <CollapseButton label="航路總覽" collapsed={collapsed.hero} onToggle={() => toggleSection("hero")} />
      {!collapsed.hero && <>
        <div className="trade-intro"><small>東海商路 / {trade.caravan ? "航行中" : "商隊待命"}</small><h2>{route.from}<em> → </em>{route.to}</h2><p>{quote.cargo} 箱{quote.cargoName || route.good} · 每趟淨利 <strong>+{fmt(quote.revenue - quote.cost)} 兩</strong><br />{trade.caravan ? "商隊正在航行，抵達時會結算一則隨機商路事件。" : "選擇貨物與護衛，讓每趟商路都值得規劃。"}</p><Button disabled={!!trade.caravan || !unlocked || gold < quote.cost} onClick={() => onDispatch(route.id, selectedEscortIds)}><Ship />{trade.caravan ? "商隊運送中" : !unlocked ? "尚未解鎖" : gold < quote.cost ? "資金不足" : "立即出航 · " + fmt(quote.cost) + " 兩"}</Button><div className="trade-tags"><span><Shield />{selectedEscorts.length} 名護衛・戰力 {fmt(selectedPower)}</span><span><Anchor />市價 {Math.round((quote.marketMultiplier || market) * 100)}%</span><span><Anchor />離線上限 8 小時</span></div></div>
      <div className="trade-chart" aria-label={`${route.from}至${route.to}商路示意圖`}>
        <div className="trade-compass"><Compass /><span>四國貿易網</span><small>商路節點示意</small></div>
        <div className="trade-island trade-island-china"><small>CHINA</small><strong>中國</strong><span>南京</span></div>
        <div className="trade-island trade-island-korea"><small>KOREA</small><strong>朝鮮</strong><span>漢陽</span></div>
        <div className="trade-island trade-island-japan"><small>JAPAN</small><strong>日本</strong><span>江戶</span></div>
        <div className="trade-island trade-island-taiwan"><small>TAIWAN</small><strong>台灣</strong><span>台北</span></div>
        <div className={"trade-ship " + (trade.caravan ? "sailing" : "")}><Ship /><span>{trade.caravan ? "商隊航行中" : "商隊待命"}</span></div>
        <div className="trade-map-caption">{route.from}<ArrowRight />{route.to}<b>{route.good}</b></div>
      </div></>}
    </section>
    <section className={`trade-metrics-panel ${collapsed.metrics ? "is-collapsed" : ""}`}>
      <div className="trade-fold-heading"><strong>商團資產</strong><CollapseButton label="商團資產" collapsed={collapsed.metrics} onToggle={() => toggleSection("metrics")} /></div>
      {!collapsed.metrics && <div className="trade-metrics">
        <article><Coins /><span>商團資金<strong>{fmt(gold)}<small> 兩</small></strong></span></article>
        <article><TrendingUp /><span>累積貿易淨利<strong>{fmt(trade.totalProfit)}<small> 兩</small></strong></span></article>
        <article><Compass /><span>商譽<strong>{fmt(trade.reputation)}<small> 聲望</small></strong></span></article>
        <article><Ship /><span>成交航次<strong>{fmt(trade.trips)}<small> 趟</small></strong></span></article>
      </div>}
    </section>
    <div className="trade-columns">
      <section className={`panel trade-routes ${collapsed.routes ? "is-collapsed" : ""}`}><div className="panel-title"><Compass /><h2>選擇你的商路</h2><span>{String(TRADE_ROUTES.length).padStart(2, "0")} 條貿易航線</span><CollapseButton label="商路選擇" collapsed={collapsed.routes} onToggle={() => toggleSection("routes")} /></div>
        {!collapsed.routes && <><p className="section-copy">商譽與戰場關卡共同解鎖新航線。出航時可派遣傭兵護衛，抵達後隨機結算商路事件。</p>
        <div className="trade-route-grid">{TRADE_ROUTES.map((item, index) => {
          const available = trade.reputation >= item.reputation && stage >= item.stage;
            const itemPort = item.from as "漢陽" | "台北" | "南京" | "江戶";
            const terms = voyageQuote(item, trade.cargoLevel, selectedEscorts.length, 0, trade.rewardMultiplier, { cargoId: trade.selectedCargoId, marketMultiplier: trade.market?.[item.id] ?? marketMultiplier(item.id), portInvestmentLevel: portInvestmentLevel(trade, itemPort), insurance: trade.insurance });
          return <button type="button" key={item.id} className={"trade-route " + (trade.selectedRouteId === item.id ? "selected " : "") + (!available ? "locked" : "")} onClick={() => onSelect(item.id)} aria-pressed={trade.selectedRouteId === item.id} style={{ "--route-color": item.color } as React.CSSProperties}>
            <div><small>0{index + 1} / {item.nation}</small>{available ? <span>{item.seconds} 秒 / 趟</span> : <LockKeyhole size={15} />}</div>
            <h3>{item.from}<ArrowRight />{item.to}</h3><p><Package />{terms.cargoName || item.good}・{cargoCapacity(trade.cargoLevel)} 箱</p>
            <footer><span>每趟淨利<strong>+{fmt(terms.revenue - terms.cost)} 兩</strong></span><small>{available ? "已開通" : `需商譽 ${item.reputation}・世界地圖進度不足`}</small></footer>
          </button>;
        })}</div></>}
      </section>
      <aside className="trade-sidebar">
        <section className={`panel trade-dispatch ${collapsed.dispatch ? "is-collapsed" : ""}`}><div className="panel-title"><Ship /><h2>{trade.caravan ? "商隊航行中" : "商隊調度"}</h2><span className="trade-live">{trade.caravan ? "進行中" : "待命"}</span><CollapseButton label="商隊調度" collapsed={collapsed.dispatch} onToggle={() => toggleSection("dispatch")} /></div>
          {!collapsed.dispatch && <>
          <div className="trade-destination"><strong>{route.from}</strong><ArrowRight /><strong>{route.to}</strong></div><p>{quote.cargo} 箱{quote.cargoName || route.good} · {trade.caravan ? (now ? secondsLeft + " 秒後抵達" : "計算航程中") : route.seconds + " 秒航程"}</p>
          {!trade.caravan && <section className="trade-cargo-picker" aria-label="選擇貿易貨物"><div className="trade-cargo-heading"><strong>貨物策略</strong><small>市價 {Math.round(market * 100)}%</small></div><div className="trade-cargo-list">{TRADE_CARGOES.map((cargo) => <button key={cargo.id} type="button" className={trade.selectedCargoId === cargo.id ? "selected" : ""} onClick={() => onSelectCargo(cargo.id)}><span><b>{cargo.id === "standard" ? route.good : cargo.name}</b><small>{cargo.description}</small></span><em style={{ color: cargo.color }}>{cargo.saleMultiplier > 1 ? `收益 ×${cargo.saleMultiplier}` : cargo.saleMultiplier < 1 ? `收益 ×${cargo.saleMultiplier}` : "穩定"}</em></button>)}</div><label className="trade-insurance"><input type="checkbox" checked={trade.insurance} onChange={onToggleInsurance} /><span><strong>購買商路保險</strong><small>保費約為成本 12%，貨損時理賠 70%</small></span><em>{trade.insurance ? `+${fmt(quote.insuranceCost || 0)} 兩` : "未投保"}</em></label></section>}
          <Progress value={progress} aria-label="商隊航程" />
          <output className="trade-encounter-status">抵達時隨機觸發商路事件<br /><small>護衛戰力越高，越能防止搶劫與貨損。</small></output>
          <section className="trade-escort-picker" aria-label="派遣傭兵護衛"><div className="trade-escort-heading"><strong>派遣傭兵護衛</strong><small>{trade.caravan ? "護衛航行中" : "僅限休息中的傭兵"}</small></div><div className="trade-escort-list">{mercenaries.map((unit) => <label key={unit.uid} className={!unit.available && !selectedEscorts.includes(unit.uid) ? "unavailable" : ""}><input type="checkbox" aria-label={`${unit.name} Lv.${unit.level} 護衛 ${fmt(unit.power)}`} checked={selectedEscorts.includes(unit.uid)} disabled={!!trade.caravan || !unit.available} onChange={(event) => setSelectedEscortIds((previous) => event.target.checked ? [...previous, unit.uid] : previous.filter((uid) => uid !== unit.uid))} /><span><strong>{unit.name}</strong><small>Lv.{unit.level}・護衛 {fmt(unit.power)}</small></span></label>)}</div>{!mercenaries.length && <small className="trade-escort-empty">目前沒有休息中的傭兵，請先將傭兵撤下並送往休息處。</small>}<p>本趟護衛戰力 <strong>{fmt(selectedPower)}</strong>；上陣隊伍不會受到影響。</p></section>
          <dl><div><dt>進貨成本</dt><dd>{fmt(quote.cost)} 兩</dd></div><div><dt>售出總額</dt><dd>{fmt(quote.revenue)} 兩</dd></div><div><dt>每趟淨利</dt><dd className="trade-profit">+{fmt(quote.revenue - quote.cost)} 兩</dd></div><div><dt>港口投資</dt><dd>Lv.{investmentLevel} · 收益 +{Math.round((portInvestmentBonus(investmentLevel) - 1) * 100)}%</dd></div><div><dt>養成收益</dt><dd>商譽 +{quote.reputation} · 經驗 +{quote.xp}</dd></div></dl>
          <Button className="trade-primary" disabled={!!trade.caravan || !unlocked || gold < quote.cost} onClick={() => onDispatch(route.id, selectedEscortIds)}><Ship />{trade.caravan ? "運送貨物中" : !unlocked ? "尚未解鎖此航線" : gold < quote.cost ? "進貨資金不足" : "裝貨並出航"}</Button>
          <Button variant="outline" className="trade-primary" onClick={onToggleAuto}>{trade.auto ? <Pause /> : <Play />}{trade.auto ? "連續經商已開啟 · 點此關閉" : "連續經商已關閉 · 點此開啟"}</Button>
          <small className="trade-hint">關閉連續經商後，本趟仍會完成。航行中保留出發時的貨量與護衛加成。</small>
        </>}
        </section>
        <section className={`panel trade-upgrade ${collapsed.upgrade ? "is-collapsed" : ""}`}><div className="panel-title"><Warehouse /><h2>商隊貨艙</h2><span>Lv.{trade.cargoLevel}</span><CollapseButton label="商隊貨艙" collapsed={collapsed.upgrade} onToggle={() => toggleSection("upgrade")} /></div>{!collapsed.upgrade && <><p><strong>{cargoCapacity(trade.cargoLevel)}</strong> 箱容量 <span>升級 +5 箱</span></p><Button variant="secondary" disabled={!!trade.caravan || trade.cargoLevel >= MAX_CARGO_LEVEL || gold < upgradeCost(trade.cargoLevel)} onClick={onUpgrade}>{trade.cargoLevel >= MAX_CARGO_LEVEL ? "貨艙已滿級" : trade.caravan ? "停靠後可升級" : "升級 · " + fmt(upgradeCost(trade.cargoLevel)) + " 兩"}</Button></>}</section>
        <section className={`panel trade-port-investment ${collapsed.port ? "is-collapsed" : ""}`}><div className="panel-title"><Compass /><h2>{route.from}港口投資</h2><span>Lv.{investmentLevel}/6</span><CollapseButton label="港口投資" collapsed={collapsed.port} onToggle={() => toggleSection("port")} /></div>{!collapsed.port && <><p>升級港口可永久提高從此出發的商路收益。</p><Button variant="secondary" disabled={!!trade.caravan || investmentLevel >= 6 || gold < portInvestmentCost(trade, routePort)} onClick={onUpgradePort}>{investmentLevel >= 6 ? "港口已滿級" : trade.caravan ? "停靠後可投資" : "投資升級 · " + fmt(portInvestmentCost(trade, routePort)) + " 兩"}</Button></>}</section>
      </aside>
    </div>
    <section className={`panel trade-ledger ${collapsed.ledger ? "is-collapsed" : ""}`}><div className="panel-title"><Shield /><h2>商路記事</h2><span>抵達時結算隨機事件</span><CollapseButton label="商路記事" collapsed={collapsed.ledger} onToggle={() => toggleSection("ledger")} /></div>{!collapsed.ledger && <><output>{displayEncounter}</output><ol>{logs.slice(0, 6).map((log, index) => <li key={index}><span>{String(index + 1).padStart(2, "0")}</span>{log}</li>)}</ol></>}</section>
  </div>;
}
