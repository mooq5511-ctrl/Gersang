'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2, ChevronRight, CircleDollarSign, Clock3, Coins, Lock, Map,
  Package, Pause, Play, Shield, Sparkles, Sword, TrendingUp, Trophy, Users,
  Warehouse, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

type RouteData = {
  id: string; from: string; to: string; good: string; buy: number; sell: number;
  duration: number; risk: string; requiredReputation: number; color: string;
};
type Mercenary = {
  id: string; name: string; role: string; level: number; basePower: number;
  perk: string; sigil: string;
};
type CaravanState = {
  routeId: string; startedAt: number; duration: number; cargo: number; cycle: number;
};
type GameState = {
  gold: number; reputation: number; stage: number; cargoLevel: number;
  selectedRouteId: string; caravan: CaravanState | null; mercenaries: Mercenary[];
  logs: string[]; totalEarned: number; battlesWon: number;
};

type WebMcpContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown | Promise<unknown>;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

const ROUTES: RouteData[] = [
  { id: 'hanji', from: '漢城', to: '釜山', good: '韓紙', buy: 36, sell: 58,
    duration: 12, risk: '安穩', requiredReputation: 0, color: '#57c99b' },
  { id: 'tea', from: '台北', to: '福州', good: '烏龍茶', buy: 54, sell: 91,
    duration: 18, risk: '普通', requiredReputation: 8, color: '#f0b95b' },
  { id: 'silk', from: '南京', to: '大阪', good: '雲錦', buy: 82, sell: 143,
    duration: 26, risk: '險峻', requiredReputation: 30, color: '#e87056' },
];

const INITIAL_STATE: GameState = {
  gold: 1280, reputation: 12, stage: 1, cargoLevel: 1, selectedRouteId: 'hanji',
  caravan: null,
  mercenaries: [
    { id: 'guard', name: '朴勇', role: '護衛', level: 1, basePower: 58,
      perk: '降低商路遇襲損失', sigil: '盾' },
    { id: 'archer', name: '林月', role: '弓手', level: 1, basePower: 44,
      perk: '對首領造成額外傷害', sigil: '弓' },
    { id: 'healer', name: '阿蘭', role: '醫女', level: 1, basePower: 32,
      perk: '商隊休整時間減少', sigil: '藥' },
  ],
  logs: ['商行開張。先選擇一條商路，讓第一支商隊出發。'],
  totalEarned: 0, battlesWon: 0,
};

const STORAGE_KEY = 'east-sea-merchant-save-v1';
const compact = (value: number) => new Intl.NumberFormat('zh-TW', {
  maximumFractionDigits: 0,
}).format(Math.floor(value));
const mercenaryPower = (m: Mercenary) => Math.round(m.basePower * (1 + (m.level - 1) * 0.68));
const enemyPower = (stage: number) => Math.round(108 * Math.pow(1.43, stage - 1));
const cargoCapacity = (level: number) => 10 + (level - 1) * 5;

export default function Home() {
  const [game, setGame] = useState<GameState>(INITIAL_STATE);
  const [now, setNow] = useState(Date.now());
  const [hydrated, setHydrated] = useState(false);
  const [offlineGold, setOfflineGold] = useState(0);
  const [battleState, setBattleState] = useState<'idle' | 'fighting' | 'won' | 'lost'>('idle');

  const selectedRoute = ROUTES.find((r) => r.id === game.selectedRouteId) ?? ROUTES[0];
  const activeRoute = game.caravan ? ROUTES.find((r) => r.id === game.caravan?.routeId) ?? null : null;
  const cargo = cargoCapacity(game.cargoLevel);
  const partyPower = game.mercenaries.reduce((sum, m) => sum + mercenaryPower(m), 0);
  const foePower = enemyPower(game.stage);
  const selectedProfit = (selectedRoute.sell - selectedRoute.buy) * cargo;
  const tripCost = selectedRoute.buy * cargo;
  const progress = game.caravan
    ? Math.min(100, ((now - game.caravan.startedAt) / (game.caravan.duration * 1000)) * 100)
    : 0;
  const secondsLeft = game.caravan
    ? Math.max(0, Math.ceil(game.caravan.duration - (now - game.caravan.startedAt) / 1000))
    : 0;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as GameState & { savedAt?: number };
        const away = Math.min(28800, Math.max(0, (Date.now() - (saved.savedAt ?? Date.now())) / 1000));
        const earned = Math.floor(away * Math.max(1, saved.reputation * 0.32 + saved.stage * 0.8));
        setOfflineGold(earned);
        setGame({ ...INITIAL_STATE, ...saved, caravan: null, gold: saved.gold + earned,
          logs: earned ? [`離線期間，商行代營運獲得 ${compact(earned)} 兩。`, ...saved.logs].slice(0, 8) : saved.logs });
      }
    } catch { window.localStorage.removeItem(STORAGE_KEY); }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...game, savedAt: Date.now() }));
  }, [game, hydrated]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      setGame((current) => {
        if (!current.caravan || (tick - current.caravan.startedAt) / 1000 < current.caravan.duration) return current;
        const route = ROUTES.find((r) => r.id === current.caravan?.routeId);
        if (!route) return { ...current, caravan: null };
        const gross = route.sell * current.caravan.cargo;
        const nextCost = route.buy * current.caravan.cargo;
        const profit = (route.sell - route.buy) * current.caravan.cargo;
        const afterSale = current.gold + gross;
        const canRepeat = afterSale >= nextCost;
        return { ...current,
          gold: canRepeat ? afterSale - nextCost : afterSale,
          reputation: current.reputation + 1,
          totalEarned: current.totalEarned + profit,
          caravan: canRepeat ? { ...current.caravan, startedAt: tick, cycle: current.caravan.cycle + 1 } : null,
          logs: [`${route.from}→${route.to}：${route.good} 售罄，淨利 ${compact(profit)} 兩。${canRepeat ? '已自動補貨返程。' : '資金不足，商隊已停靠。'}`, ...current.logs].slice(0, 8),
        };
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(context.registerTool({
      name: 'dispatch_trade_route',
      title: '派遣商隊',
      description: '選擇一條已解鎖商路、支付進貨成本，並開始自動循環貿易。',
      inputSchema: {
        type: 'object',
        properties: { routeId: { type: 'string', enum: ROUTES.map((route) => route.id) } },
        required: ['routeId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (!input || typeof input !== 'object' || !('routeId' in input) || typeof input.routeId !== 'string') {
          throw new Error('routeId 必須是有效的商路代號。');
        }
        const route = ROUTES.find((item) => item.id === input.routeId);
        if (!route) throw new Error('找不到指定商路。');

        let result: Record<string, unknown> = {};
        let failure = '';
        setGame((current) => {
          const capacity = cargoCapacity(current.cargoLevel);
          const cost = route.buy * capacity;
          if (current.caravan) { failure = '目前已有商隊在行進中。'; return current; }
          if (current.reputation < route.requiredReputation) { failure = `需要商譽 ${route.requiredReputation}。`; return current; }
          if (current.gold < cost) { failure = `需要 ${cost} 兩進貨資金。`; return current; }
          result = { status: 'dispatched', routeId: route.id, cargo: capacity, arrivalInSeconds: route.duration };
          return { ...current, selectedRouteId: route.id, gold: current.gold - cost,
            caravan: { routeId: route.id, startedAt: Date.now(), duration: route.duration, cargo: capacity, cycle: 1 },
            logs: [`商隊裝載 ${capacity} 箱${route.good}，由${route.from}啟程。`, ...current.logs].slice(0, 8) };
        });
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        if (failure) throw new Error(failure);
        return result;
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  function chooseRoute(route: RouteData) {
    if (game.reputation >= route.requiredReputation) setGame((g) => ({ ...g, selectedRouteId: route.id }));
  }
  function dispatchCaravan() {
    if (game.caravan || game.gold < tripCost) return;
    setGame((g) => ({ ...g, gold: g.gold - tripCost,
      caravan: { routeId: selectedRoute.id, startedAt: Date.now(), duration: selectedRoute.duration, cargo, cycle: 1 },
      logs: [`商隊裝載 ${cargo} 箱${selectedRoute.good}，由${selectedRoute.from}啟程。`, ...g.logs].slice(0, 8) }));
  }
  function stopCaravan() {
    if (!game.caravan || !activeRoute) return;
    const refund = activeRoute.buy * game.caravan.cargo;
    setGame((g) => ({ ...g, gold: g.gold + refund, caravan: null,
      logs: [`商隊返回${activeRoute.from}，未售貨物已按進價入庫。`, ...g.logs].slice(0, 8) }));
  }
  function upgradeCargo() {
    const cost = 480 * game.cargoLevel * game.cargoLevel;
    if (game.gold < cost || game.caravan) return;
    setGame((g) => ({ ...g, gold: g.gold - cost, cargoLevel: g.cargoLevel + 1,
      logs: [`貨棧升至 ${g.cargoLevel + 1} 級，商隊容量增加 5 箱。`, ...g.logs].slice(0, 8) }));
  }
  function upgradeMercenary(id: string) {
    const merc = game.mercenaries.find((m) => m.id === id);
    if (!merc) return;
    const cost = 140 * merc.level * merc.level;
    if (game.gold < cost) return;
    setGame((g) => ({ ...g, gold: g.gold - cost,
      mercenaries: g.mercenaries.map((m) => m.id === id ? { ...m, level: m.level + 1 } : m),
      logs: [`${merc.name}完成操練，升至 ${merc.level + 1} 級。`, ...g.logs].slice(0, 8) }));
  }
  function challengeStage() {
    if (battleState === 'fighting') return;
    setBattleState('fighting');
    window.setTimeout(() => {
      const won = partyPower >= foePower;
      if (won) {
        const reward = 160 + game.stage * 75;
        setGame((g) => ({ ...g, gold: g.gold + reward, reputation: g.reputation + 2,
          stage: g.stage + 1, battlesWon: g.battlesWon + 1,
          logs: [`護衛隊掃清第 ${g.stage} 處山道，獲得 ${compact(reward)} 兩。`, ...g.logs].slice(0, 8) }));
        setBattleState('won');
      } else {
        setGame((g) => ({ ...g,
          logs: [`第 ${g.stage} 處山道防守嚴密。提升傭兵後再戰。`, ...g.logs].slice(0, 8) }));
        setBattleState('lost');
      }
      window.setTimeout(() => setBattleState('idle'), 1300);
    }, 900);
  }

  const cargoUpgradeCost = 480 * game.cargoLevel * game.cargoLevel;

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-seal" aria-hidden="true">商</div><div><p>東海商路志</p><h1>商途</h1></div></div>
        <div className="resource-bar" aria-label="商行資源">
          <div className="resource-item gold-resource"><Coins aria-hidden="true" /><span><small>資金</small>{compact(game.gold)} <b>兩</b></span></div>
          <div className="resource-divider" />
          <div className="resource-item"><Trophy aria-hidden="true" /><span><small>商譽</small>{compact(game.reputation)}</span></div>
        </div>
        <div className="top-status"><span className="live-dot" /><span>自動存檔</span></div>
      </header>

      <div className="game-content">
        {offlineGold > 0 && <section className="offline-banner" aria-live="polite">
          <Sparkles aria-hidden="true" /><div><strong>商行未曾停歇</strong><span>離線期間已入帳 {compact(offlineGold)} 兩</span></div>
          <Button variant="ghost" size="sm" onClick={() => setOfflineGold(0)}>知道了</Button>
        </section>}

        <section className="journey-strip" aria-label="商隊狀態">
          <div className={`journey-mark ${game.caravan ? 'is-moving' : ''}`}><Package aria-hidden="true" /></div>
          <div className="journey-main">
            <div className="journey-copy"><div><span className="eyebrow">{game.caravan ? '商隊行進中' : '商隊待命'}</span>
              <strong>{activeRoute ? `${activeRoute.from} → ${activeRoute.to}` : '選擇商路，展開第一趟買賣'}</strong></div>
              <span className="journey-time"><Clock3 aria-hidden="true" />{game.caravan ? `${secondsLeft} 秒抵達` : '最多累積 8 小時離線收益'}</span></div>
            <Progress value={game.caravan ? progress : 0} className="journey-progress" aria-label="商隊行程進度" />
          </div>
          {game.caravan
            ? <Button variant="outline" size="lg" onClick={stopCaravan}><Pause data-icon="inline-start" />召回</Button>
            : <Button size="lg" onClick={dispatchCaravan} disabled={game.gold < tripCost} className="primary-action"><Play data-icon="inline-start" />出發</Button>}
        </section>

        <div className="dashboard-grid">
          <section className="panel market-panel">
            <div className="panel-heading"><div><span className="eyebrow">MARKET ROUTES</span><h2>商路行情</h2></div><TrendingUp aria-hidden="true" /></div>
            <div className="route-list">
              {ROUTES.map((route) => {
                const locked = game.reputation < route.requiredReputation;
                const profit = (route.sell - route.buy) * cargo;
                const selected = route.id === selectedRoute.id;
                return <button key={route.id} type="button" className={`route-card ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                  onClick={() => chooseRoute(route)} aria-pressed={selected} disabled={locked}>
                  <span className="route-accent" style={{ backgroundColor: route.color }} />
                  <span className="route-card-top"><span className="good-chip">{route.good}</span>
                    {locked ? <span className="lock-copy"><Lock /> 商譽 {route.requiredReputation}</span> : <span className="risk-copy">{route.risk}</span>}</span>
                  <span className="route-places"><b>{route.from}</b><ChevronRight /><b>{route.to}</b></span>
                  <span className="route-numbers"><span><small>每趟淨利</small><strong>+{compact(profit)}</strong></span><span><small>需時</small><strong>{route.duration} 秒</strong></span></span>
                </button>;
              })}
            </div>
            <div className="warehouse-card"><div className="warehouse-icon"><Warehouse aria-hidden="true" /></div>
              <div><span>貨棧 · {game.cargoLevel} 級</span><strong>{cargo} 箱容量</strong></div>
              <Button size="sm" variant="secondary" onClick={upgradeCargo} disabled={game.gold < cargoUpgradeCost || Boolean(game.caravan)}>升級 {compact(cargoUpgradeCost)}</Button>
            </div>
          </section>

          <section className="panel map-panel">
            <div className="panel-heading map-heading"><div><span className="eyebrow">TRADE MAP</span><h2>{selectedRoute.from}至{selectedRoute.to}</h2></div><div className="market-pulse"><span />行情更新中</div></div>
            <div className="trade-map" aria-label="東海商路地圖"><div className="map-grid" />
              <svg className="route-lines" viewBox="0 0 700 320" aria-hidden="true">
                <path className={selectedRoute.id === 'hanji' ? 'active' : ''} d="M500 70 C530 105 548 140 520 172" />
                <path className={selectedRoute.id === 'tea' ? 'active' : ''} d="M260 240 C310 216 360 213 404 232" />
                <path className={selectedRoute.id === 'silk' ? 'active' : ''} d="M342 133 C430 125 510 188 596 218" />
              </svg>
              {[
                ['漢城', 72, 19, 'hanji'], ['釜山', 75, 51, 'hanji'], ['台北', 29, 76, 'tea'],
                ['福州', 48, 66, 'tea'], ['南京', 38, 35, 'silk'], ['大阪', 84, 66, 'silk'],
              ].map(([city, left, top, routeId]) => <div key={city} className={`city-node ${selectedRoute.id === routeId ? 'active' : ''}`}
                style={{ left: `${left}%`, top: `${top}%` }}><span /><b>{city}</b></div>)}
              <div className="map-compass"><Map aria-hidden="true" /><span>東海</span></div>
            </div>
            <div className="trade-ticket">
              <div className="trade-good"><div className="cargo-crate" aria-hidden="true">貨</div><div><small>本趟貨物</small><strong>{selectedRoute.good} · {cargo} 箱</strong></div></div>
              <div className="trade-metric"><small>進貨成本</small><strong>{compact(tripCost)} 兩</strong></div>
              <div className="trade-metric profit"><small>預計淨利</small><strong>+{compact(selectedProfit)} 兩</strong></div>
              <Button size="lg" onClick={dispatchCaravan} disabled={Boolean(game.caravan) || game.gold < tripCost} className="primary-action trade-button">
                {game.caravan ? '商隊忙碌中' : game.gold < tripCost ? '資金不足' : '派遣商隊'}
              </Button>
            </div>
          </section>

          <aside className="right-column">
            <section className="panel battle-panel">
              <div className="panel-heading compact-heading"><div><span className="eyebrow">GUARD DUTY</span><h2>山道護衛</h2></div><Sword aria-hidden="true" /></div>
              <div className={`battle-stage ${battleState}`}><div className="stage-number"><small>關卡</small><strong>{String(game.stage).padStart(2, '0')}</strong></div>
                <div className="foe-mark"><span>賊</span></div><div className="battle-title"><span>{game.stage % 3 === 0 ? '黑風寨頭目' : '山道劫匪'}</span><strong>敵方戰力 {compact(foePower)}</strong></div></div>
              <div className="power-comparison"><span><Shield />我方 {compact(partyPower)}</span><span className={partyPower >= foePower ? 'advantage' : 'danger'}>{partyPower >= foePower ? '戰力優勢' : `尚差 ${compact(foePower - partyPower)}`}</span></div>
              <Button size="lg" onClick={challengeStage} disabled={battleState === 'fighting'} className="battle-button"><Zap data-icon="inline-start" />
                {battleState === 'fighting' ? '交戰中…' : battleState === 'won' ? '大勝！' : battleState === 'lost' ? '整隊再戰' : '自動挑戰'}</Button>
            </section>

            <section className="panel mercenary-panel">
              <div className="panel-heading compact-heading"><div><span className="eyebrow">YOUR CREW</span><h2>隨行傭兵</h2></div><Users aria-hidden="true" /></div>
              <div className="mercenary-list">{game.mercenaries.map((merc) => {
                const cost = 140 * merc.level * merc.level;
                return <article className="mercenary" key={merc.id}><div className={`mercenary-sigil ${merc.id}`} aria-hidden="true">{merc.sigil}</div>
                  <div className="mercenary-copy"><span><strong>{merc.name}</strong><small>{merc.role}</small></span><span className="mercenary-power">戰力 {compact(mercenaryPower(merc))} · Lv.{merc.level}</span></div>
                  <Button size="icon-sm" variant="outline" onClick={() => upgradeMercenary(merc.id)} disabled={game.gold < cost} aria-label={`升級${merc.name}，花費${cost}兩`} title={`升級：${cost} 兩`}><Sparkles /></Button>
                </article>;
              })}</div>
            </section>
          </aside>
        </div>

        <section className="bottom-grid">
          <div className="panel ledger-panel"><div className="ledger-title"><CircleDollarSign aria-hidden="true" /><div><span className="eyebrow">LEDGER</span><h2>商行帳冊</h2></div></div>
            <div className="ledger-stats"><div><small>累計商利</small><strong>{compact(game.totalEarned)} 兩</strong></div><div><small>護衛勝場</small><strong>{game.battlesWon} 場</strong></div><div><small>目前容量</small><strong>{cargo} 箱</strong></div></div></div>
          <div className="panel log-panel"><div className="log-title"><CheckCircle2 aria-hidden="true" />最新商報</div><p>{game.logs[0]}</p></div>
        </section>
      </div>
    </main>
  );
}
