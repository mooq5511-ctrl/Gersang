"use client";
import { Button } from "@/components/ui/button";
import { Dialog,DialogContent,DialogDescription,DialogTitle } from "@/components/ui/dialog";
import { Coins,Gem,Pill } from "lucide-react";
import { formatGameNumber as format } from "./game-display";
import { appendGameLog as addLog } from "./game-runtime-actions";
import type { GameViewModel } from './use-game-controller';

type Props = Pick<GameViewModel, "game" | "goToObjective" | "mainObjective" | "quickDialog" | "returnReport" | "setGame" | "setQuickDialog" | "setReturnReport" | "setSceneMode" | "setTreasureQuery" | "setUiSettings" | "treasureMaterialNames" | "treasureMedicineEntries" | "treasureQuery" | "uiSettings">;

export function GameDialogs({ game, goToObjective, mainObjective, quickDialog, returnReport, setGame, setQuickDialog, setReturnReport, setSceneMode, setTreasureQuery, setUiSettings, treasureMaterialNames, treasureMedicineEntries, treasureQuery, uiSettings }: Props) {
return <><Dialog open={quickDialog !== null} onOpenChange={open => { if (!open) setQuickDialog(null); }}>
        <DialogContent className="quick-menu-dialog">
          <DialogTitle>{quickDialog === "settings" ? "行旅設定" : "秘寶圖鑑"}</DialogTitle>
          <DialogDescription>{quickDialog === "settings" ? "調整音樂、場景顯示與自動技能；偏好會保存在此瀏覽器。" : "查看已收集的材料與商隊珍藏。"}</DialogDescription>
          {quickDialog === "settings" ? <>
            <div className="quick-setting-row quick-setting-volume">
              <div className="quick-setting-volume-heading"><span><strong>遊戲音樂音量</strong><small>調整場景與戰鬥音樂，不影響音效。</small></span><output htmlFor="game-music-volume">{uiSettings.musicVolume}%</output></div>
              <input id="game-music-volume" aria-label="遊戲音樂音量" type="range" min="0" max="100" step="1" value={uiSettings.musicVolume} onChange={event => { const musicVolume = Number(event.currentTarget.value); setUiSettings(previous => ({ ...previous, musicVolume })); }}/>
            </div>
            <fieldset className="quick-setting-ratio">
              <legend>畫面尺寸</legend>
              <p>選擇遊戲舞台比例；不會修改裝置本身的解析度。</p>
              <div className="quick-setting-ratio-options">
                <label className={uiSettings.sceneMode === "auto" ? "selected" : ""}><input type="radio" name="game-scene-mode" checked={uiSettings.sceneMode === "auto"} onChange={() => setSceneMode("auto")}/><span><strong>自動尺寸</strong><small>依目前視窗自動調整</small></span></label>
                <label className={uiSettings.sceneMode === "mobile-916" ? "selected" : ""}><input type="radio" name="game-scene-mode" checked={uiSettings.sceneMode === "mobile-916"} onChange={() => setSceneMode("mobile-916")}/><span><strong>📱 手機 9:16</strong><small>直式舞台，可能保留上下留邊</small></span></label>
                <label className={uiSettings.sceneMode === "pc-169" ? "selected" : ""}><input type="radio" name="game-scene-mode" checked={uiSettings.sceneMode === "pc-169"} onChange={() => setSceneMode("pc-169")}/><span><strong>🖥️ PC 16:9</strong><small>桌面與投影橫式舞台</small></span></label>
                <label className={uiSettings.sceneMode === "fullscreen" ? "selected" : ""}><input type="radio" name="game-scene-mode" checked={uiSettings.sceneMode === "fullscreen"} onChange={() => setSceneMode("fullscreen")}/><span><strong>⛶ 全螢幕</strong><small>使用瀏覽器全螢幕 API</small></span></label>
              </div>
              <small className="quick-setting-ratio-note">全螢幕必須由使用者點擊啟動；按 Esc 可離開。</small>
            </fieldset>
            <div className="quick-setting-row"><span><strong>滿 MP 自動施放技能</strong><small>每名出戰角色集滿魔力後自動施放。</small></span><button type="button" role="switch" aria-checked={game.autoSkill} className={game.autoSkill ? "enabled" : ""} onClick={() => setGame(previous => ({ ...previous, autoSkill: !previous.autoSkill, logs: addLog(previous.logs, previous.autoSkill ? "已關閉技能自動施放。" : "已開啟技能自動施放。") }))}>{game.autoSkill ? "開啟" : "關閉"}</button></div>
          </> : <><label className="treasure-search">搜尋材料、食物或藥品<input type="search" value={treasureQuery} onChange={event => setTreasureQuery(event.target.value)} placeholder="輸入名稱或效果" aria-label="搜尋秘寶圖鑑材料、食物或藥品" /></label><section className="treasure-codex-group"><h3>食物與藥品</h3><div className="treasure-codex-list">{treasureMedicineEntries.map(medicine => <article className="treasure-entry" key={medicine.id}><span className="treasure-entry-icon"><Pill aria-hidden="true" /></span><span><strong>{medicine.name}</strong><small>{("hpRestore" in medicine && medicine.hpRestore) ? `食物・${medicine.effect}` : `藥品・${medicine.effect}`}</small></span><b>×{format(game.medicines[medicine.id] || 0)}</b></article>)}</div></section><section className="treasure-codex-group"><h3>材料與貨幣</h3><div className="treasure-codex-list"><article className="treasure-entry"><span className="treasure-entry-icon"><Coins aria-hidden="true" /></span><span><strong>信用值</strong><small>商團通用資源・Lv.{game.creditLevel}</small></span><b>{format(game.credit)}</b></article><article className="treasure-entry"><span className="treasure-entry-icon"><Coins aria-hidden="true" /></span><span><strong>新手兌換銅錢</strong><small>特殊貨幣</small></span><b>×{format(game.newbieCoins)}</b></article>{treasureMaterialNames.map(name => <article className="treasure-entry" key={name}><span className="treasure-entry-icon"><Gem aria-hidden="true" /></span><span><strong>{name}</strong><small>{game.materials[name] ? "已收集" : "尚未取得"}</small></span><b>×{format(game.materials[name] || 0)}</b></article>)}</div></section>{!treasureMedicineEntries.length && !treasureMaterialNames.length && <p className="treasure-empty">找不到符合的秘寶、材料、食物或藥品。</p>}</>}
        </DialogContent>
      </Dialog>
<Dialog open={returnReport !== null} onOpenChange={open => { if (!open) setReturnReport(null); }}>
        <DialogContent className="caravan-return-report" showCloseButton={false}>
          <span className="return-report-seal" aria-hidden="true">商</span>
          <DialogTitle>商隊帶著收穫回來了</DialogTitle>
          <DialogDescription>你離開了 {Math.floor((returnReport?.minutes || 0) / 60)} 小時 {(returnReport?.minutes || 0) % 60} 分鐘</DialogDescription>
          <dl className="return-report-rewards">
            <div><dt>金錢淨變動</dt><dd>{(returnReport?.gold || 0) >= 0 ? '+' : ''}{(returnReport?.gold || 0).toLocaleString('zh-TW')} <small>兩</small></dd></div>
            <div><dt>信用增加</dt><dd>+{(returnReport?.credit || 0).toLocaleString('zh-TW')}</dd></div>
          </dl>
          <p>收益已自動入帳，放置累積上限為 8 小時。{(returnReport?.minutes || 0) > 480 ? '本次離開時間已超過累積上限。' : ''}</p>
          {returnReport?.gold === 0 && returnReport.credit === 0 && <p>本次沒有新增收益；戰敗療傷期間不累積放置收益。</p>}
          <div className="return-report-next"><small>接下來</small><strong>{mainObjective.title}</strong><p>{mainObjective.detail}</p></div>
          <Button onClick={() => { setReturnReport(null); goToObjective(); }}>繼續商隊旅程</Button>
          <Button variant="ghost" onClick={() => setReturnReport(null)}>先看看城鎮</Button>
        </DialogContent>
      </Dialog></>;
}
