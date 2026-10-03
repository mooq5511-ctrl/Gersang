"use client";
import { Building2,Castle,ChevronLeft,ChevronRight,Crown,Gem,Map,ScrollText,Settings,Shield,Ship,ShoppingBag,Users } from "lucide-react";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "activeTab" | "progressiveUnlocks" | "quickDialog" | "quickNavExpanded" | "setActiveTab" | "setCityService" | "setQuickDialog" | "setQuickNavExpanded">;

export function GameNavigation({ activeTab, progressiveUnlocks, quickDialog, quickNavExpanded, setActiveTab, setCityService, setQuickDialog, setQuickNavExpanded }: Props) {
return <><nav id="mobile-game-nav" className="classic-live-quicknav" aria-label="遊戲功能" hidden={!quickNavExpanded}>
        <section className="quick-nav-group" aria-labelledby="quick-nav-explore">
          <h2 id="quick-nav-explore" className="quick-nav-group-label">探索</h2>
          <button type="button" data-nav-key="battle" className={activeTab === "battle" ? "active" : ""} aria-current={activeTab === "battle" ? "page" : undefined} onClick={() => setActiveTab("battle")}><span className="quick-nav-icon"><Map aria-hidden="true" /></span><span className="quick-nav-label">世界地圖</span></button>
          <button type="button" data-nav-key="map" className={activeTab === "map" ? "active" : ""} aria-current={activeTab === "map" ? "page" : undefined} onClick={() => setActiveTab("map")}><span className="quick-nav-icon"><Castle aria-hidden="true" /></span><span className="quick-nav-label">城門</span></button>
          {progressiveUnlocks.trade && <button type="button" data-nav-key="trade" className={activeTab === "trade" ? "active" : ""} aria-current={activeTab === "trade" ? "page" : undefined} onClick={() => setActiveTab("trade")}><span className="quick-nav-icon"><Ship aria-hidden="true" /></span><span className="quick-nav-label">港口</span></button>}
          {progressiveUnlocks.relic && <button type="button" data-nav-key="relic" className={activeTab === "relic" ? "active" : ""} aria-current={activeTab === "relic" ? "page" : undefined} onClick={() => setActiveTab("relic")}><span className="quick-nav-icon"><Castle aria-hidden="true" /></span><span className="quick-nav-label">遺跡地下城</span></button>}
        </section>
        <section className="quick-nav-group" aria-labelledby="quick-nav-character">
          <h2 id="quick-nav-character" className="quick-nav-group-label">角色</h2>
          <button type="button" data-nav-key="squad" className={activeTab === "squad" ? "active" : ""} aria-current={activeTab === "squad" ? "page" : undefined} onClick={() => setActiveTab("squad")}><span className="quick-nav-icon"><Users aria-hidden="true" /></span><span className="quick-nav-label">主角與隊伍</span></button>
          {progressiveUnlocks.collection && <button type="button" data-nav-key="archive" className={activeTab === "archive" ? "active" : ""} aria-current={activeTab === "archive" ? "page" : undefined} onClick={() => setActiveTab("archive")}><span className="quick-nav-icon"><Shield aria-hidden="true" /></span><span className="quick-nav-label">裝備圖鑑</span></button>}
          {progressiveUnlocks.collection && <button type="button" data-nav-key="treasure" onClick={() => setQuickDialog("treasure")}><span className="quick-nav-icon"><Gem aria-hidden="true" /></span><span className="quick-nav-label">秘寶圖鑑</span></button>}
        </section>
        <section className="quick-nav-group" aria-labelledby="quick-nav-town">
          <h2 id="quick-nav-town" className="quick-nav-group-label">城鎮</h2>
          {progressiveUnlocks.contracts && <button type="button" data-nav-key="contracts" className={activeTab === "contracts" ? "active" : ""} aria-current={activeTab === "contracts" ? "page" : undefined} onClick={() => setActiveTab("contracts")}><span className="quick-nav-icon"><ScrollText aria-hidden="true" /></span><span className="quick-nav-label">冒險委託</span></button>}
          {progressiveUnlocks.hall && <button type="button" data-nav-key="hall" className={activeTab === "hall" ? "active" : ""} aria-current={activeTab === "hall" ? "page" : undefined} onClick={() => setActiveTab("hall")}><span className="quick-nav-icon"><Building2 aria-hidden="true" /></span><span className="quick-nav-label">市政廳</span></button>}
          <button type="button" data-nav-key="city" className={activeTab === "city" ? "active" : ""} aria-current={activeTab === "city" ? "page" : undefined} onClick={() => { setCityService("weapon"); setActiveTab("city"); }}><span className="quick-nav-icon"><ShoppingBag aria-hidden="true" /></span><span className="quick-nav-label">市集</span></button>
          {progressiveUnlocks.raid && <button type="button" data-nav-key="raid" className={activeTab === "raid" ? "active" : ""} aria-current={activeTab === "raid" ? "page" : undefined} onClick={() => setActiveTab("raid")}><span className="quick-nav-icon"><Crown aria-hidden="true" /></span><span className="quick-nav-label">雷霞祭壇</span></button>}
        </section>
        <section className="quick-nav-group quick-nav-group-system" aria-labelledby="quick-nav-system">
          <h2 id="quick-nav-system" className="quick-nav-group-label">系統</h2>
          <button type="button" data-nav-key="settings" aria-pressed={quickDialog === "settings"} onClick={() => setQuickDialog("settings")}><span className="quick-nav-icon"><Settings aria-hidden="true" /></span><span className="quick-nav-label">設定</span></button>
        </section>
      </nav>
<button type="button" className="hud-edge-toggle hud-edge-toggle-nav" aria-controls="mobile-game-nav" aria-expanded={quickNavExpanded} aria-label={quickNavExpanded ? "收起遊戲功能列" : "展開遊戲功能列"} title={quickNavExpanded ? "收起遊戲功能列" : "展開遊戲功能列"} onClick={() => setQuickNavExpanded(value => !value)}>
        {quickNavExpanded ? <ChevronRight aria-hidden="true"/> : <ChevronLeft aria-hidden="true"/>}
      </button></>;
}
