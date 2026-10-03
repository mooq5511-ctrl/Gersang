# 主控制器模組化：完成報告

日期：2026-10-03（台灣時間）。基準提交：`ae8da1b`。

## 結果與邊界

`app/game-v15.tsx` 從 147,534 bytes 降到 117,646 bytes，減少 29,888 bytes（20.3%）。抽出主線／成長資料推導與 34 個操作事件，清除不再使用的匯入。原 JSX 畫面仍由主檔組裝。拆檔改善維護界線，不代表下載量或執行速度已下降。

| 新檔案 | 責任 |
|---|---|
| `app/game-progression-view.ts` | `getProgressionView(game)` 回傳目前目標、成長路線及首領資格；提供共用首份委託常數與遠征裝備評分 |
| `app/game-inventory-controller.ts` | 22 個購買、穿戴、販售、藥品、倉庫、鍛造、強化、合成及寶石操作 |
| `app/game-squad-controller.ts` | 7 個傭兵招募、出戰、存入休息處、取出、屬性與換排操作 |
| `app/game-commissions-controller.ts` | 5 個市政接取、領獎、放棄、刷新及刷新券購買操作 |
| `app/game-controller-types.ts` | `GameStateSetter` 與強化提示型別 |

依賴以具型別的 context 注入，計算沿用既有 actions／engine。控制器每次 render 建立，保持原回呼的快照語意。所有操作經主檔的集中 setter，使序章與任務同步繼續生效。存檔 schema、key、倉庫更新、價格及獎勵不變。

## 驗證

- 全套回歸：343 通過、0 失敗。`tests/progression-flow.test.mjs` 查驗新推導模組，並保留主檔接線檢查。
- `tsc --noEmit`、`vinext build`、`git diff --check` 通過。
- 正式編譯仍有原本 CSS `@import` 順序與大於 500 KB chunk 警告。
- 以 TypeScript 語法樹比對基準：34 個搬移函式與 `mainObjective`、`roadmapStages`、`firstCaravanBossReady` 表達式結構一致，忽略格式及等價引號／括號差異。一次性腳本於驗證後清理。

## 正式版瀏覽器

以 Wrangler 本機正式版 3102 埠及獨立 session `modular-1003` 驗證，沒有存取使用者日常瀏覽器角色。

1. 空白存檔建立「模組驗證」，展開任務日誌，確認起始「村長的緊急委託」與後續列表。
2. 在該獨立角色設定 Lv.30、已完成序章、100 萬兩與首趟商路完成，作跨功能測試 fixture；這部分不是自然試玩或平衡驗收。
3. 買入「普通・木刀」：支付 1,656 兩，進入背包。
4. 買入金創藥：支付 552 兩，庫存為 1。
5. 招募朝鮮槍兵：進入傭兵與出戰名單。
6. 市政廳接取「清剿村外狸貓」：新增 `hall-clear-raccoon`，起始計數 0。
7. 背包穿戴木刀：背包裝備數量 1→0，顯示攻擊 +7、戰力 +45；存檔主角武器確認為「普通・木刀」。
8. 瀏覽器 `errors` 沒有輸出執行期錯誤。

已覆蓋上述代表性流程；未逐一點擊全部 34 個事件，也未進行 30 分鐘自然養成或卡頓量測。

## 發現與接續

任務收合浮條在測試視窗／滾動位置會遮住市集「中央傭兵公會」按鈕。聚焦後 Enter 可進入，事件已接通，但滑鼠操作仍有排版問題。本輪記錄待修，未修改 CSS。

下一批整理角色 session／存檔生命週期、遊戲循環與序章導頁效果、頁面容器、剩餘 NPC／領地事件。優先評估既有 `use-character-session.ts`、`use-game-loop.ts` 與 screen 模組的相容性，再決定搬移邊界。

此次尚未提交 Git 或發布；`.site-sync*` 不屬本次修改。

## 第二批：角色 session 與遊戲循環

同日完成第二批。主檔進一步從 117,646 bytes 降至 108,821 bytes；相對本次原始基準減少 38,713 bytes（26.2%）。畫面與序章導頁效果仍在主檔，未宣稱降低執行期卡頓。

| 新檔案 | 責任 |
|---|---|
| `app/use-game-state.ts` | 初始化與集中狀態更新，保留任務同步、市政累積、背包定位及立繪套用 |
| `app/use-character-session.ts` | 創角、登入、刪除、切換、存檔節流、離線結算、共享倉庫及損毀保護 |
| `app/use-game-loop.ts` | 角色登入時的 200ms 遊戲循環、隨機抽樣及自動藥品；登出／切換清除舊計時器 |

歷史備忘錄曾記錄 session／loop hooks，但搬移前目前工作區沒有這兩個檔案，因此以當前主檔為準重新抽離，沒有套回舊版程式。現行循環是 200ms，不是歷史紀錄中的 50ms。存檔格式、key、2 秒節流及 pagehide／visibility 保存策略不變；隨機值仍在狀態 updater 外抽樣。

### 第二批驗證

- 全套回歸 347/347、TypeScript、正式編譯通過；原本 CSS／大型 chunk 警告仍在。
- 新增 4 項 hook 生命週期測試：最新進度切換時落盤且角色不串檔、pagehide 與損毀倉庫保護、計時器卸載及 updater 重放不重抽、集中 setter 的 no-op 與角色替換語意。
- 更新副本接線及商團遷移測試，查驗搬移後的 hook 與主檔接線。
- Wrangler 本機正式版 3103 埠、獨立 `hooks-1003` 瀏覽器，從空白存檔自然建立「存檔甲」與「存檔乙」，沒有注入角色資金／等級 fixture。甲接委託並開啟循環，戰鬥推進至 42 kills；乙維持 0 kills 與起始主線。切回甲、重載並進入乙後，兩份資料保持獨立，離線結算視窗正常顯示。
- 瀏覽器 `errors` 無執行期錯誤。這是存檔與循環煙霧測試，不是完整新手流程、30 分鐘平衡驗收或卡頓量測。

### 第二批發現與下一批

資源列覆蓋「切換角色」按鈕中央，滑鼠點擊無法觸發；聚焦後 Enter 可正常切換並保存。與第一批任務浮條遮擋一起列為 UI 修正項目，這次不改 CSS。

切換角色後，在未重載頁面前原角色的 NPC 對話仍可能顯示，屬主檔 UI 狀態尚未重設的既有行為，待另行修正。甲未先選擇指定狸貓就啟用自動練功，雖 kills 增加，送貨委託計數仍為 0；需另外驗證預設目標與引導是否清楚，不能把本輪測試當成委託通關。

接續順序：序章導頁效果與各頁面容器 → NPC／領地剩餘事件。保留集中 setter 入口；不要繞過 `use-game-state.ts` 的 `setGame`。本輪沒有提交、推送或發布。

## 第三批：本輪模組化收尾完成

本輪範圍是繼續拆完 `GameV15` 主控制器的剩餘責任，沿用已存在的各系統 actions／engine，而不是重寫所有引擎或任意把大檔切成碎片。最終主入口為 10,694 bytes，較起始 147,534 bytes 減少約 92.8%。`use-game-controller.ts` 為 11,496 bytes，只管理共用介面狀態、呼叫 hooks／控制器並組合具型別的畫面資料；不把原大檔改名後留下。

| 邊界 | 模組與責任 |
|---|---|
| 入口 | `game-v15.tsx`：shell、Tabs 與元件接線 |
| 畫面資料 | `game-view-selector.ts`：隊伍生命／戰力、城市庫存、解鎖、地圖資格、秘寶搜尋；沿用 `game-progression-view.ts` |
| 規則操作 | 新增 `game-npc-controller.ts`、`game-city-controller.ts`、`game-territory-controller.ts`、`game-guild-controller.ts`、`game-navigation-controller.ts`；搭配第一批背包、傭兵、市政控制器 |
| 副作用 | `use-game-preferences.ts`（音量／全螢幕／偏好）、`use-hanyang-navigation.ts`（序章效果）、`use-game-maintenance.ts`（商團舊資料與遠征預約清理）、`use-trade-controller.ts`（出航／升級／WebMCP 生命週期） |
| 十個分頁 | `game-{map,trade,battle,raid,squad,city,contracts,hall,relic,archive}-page.tsx`；保留原 TabsContent、條件掛載及回呼 |
| 共用畫面 | `game-character-gateway.tsx`、`game-header.tsx`、`game-navigation.tsx`、`game-dialogs.tsx`、`game-quest-panel.tsx`、`game-inn-panel.tsx`、`game-live-footer.tsx`、`game-tab-navigation.tsx`、`game-onboarding.tsx` |
| 共用靜態設定 | `game-ui-config.ts`、`game-catalog.ts` |

各畫面以 `Pick<GameViewModel, ...>` 宣告實際需要的資料，入口用 `selectGameView` 明確投影，不傳整包隱式 runtime context。畫面只用 type import 參照控制器型別，不引入 runtime 循環依賴。元件在模組頂層宣告，hooks 保持無條件呼叫；序章／session／循環的相關效果次序保留。存檔格式、storage key、價格、掉落與戰鬥公式不變。

### 最終驗證證據

- 354/354 回歸通過；TypeScript、正式編譯、主接線／控制器／新 hooks 的 Oxlint 與 `git diff --check` 通過。CSS 匯入順序、大型 chunk 及 Vinext 路由分類提示仍在，未宣稱改善卡頓。
- 收尾補充效果品質：穩定 setter 列入依賴、遠征清理依賴明確的狀態／預約數量；React 19.2 `useEffectEvent` 讓序章暫停讀取最新狀態但仍只隨教學步驟觸發。偏好初始載入及客棧資訊展開使用可取消微工作，保持 SSR 初始一致，避免卸載後更新。新增 3 項效果生命週期測試，session 測試工具共用 `tests/hook-harness.mjs`。
- 新增 `tests/modularization.test.mjs` 與不可變基準 `tests/fixtures/modularization-ae8da1b.json`：20 個搬移函式與全部十個 TabsContent 的語法樹一致，忽略新增 export、括號及格式；另檢查主入口只組裝、hooks／控制器皆有接線、畫面投影不洩漏私有值。基準取自已提交版本，不隨當前程式自動重建。
- 8 個既有來源接線測試改讀各自負責模組，保留原斷言。未以刪掉失敗測試達成通過。
- 正式版 3104 埠、獨立瀏覽器 `modular-final`：空白存檔創角「模組完工驗收」→村長接案→世界地圖→選狸貓→開啟自動練功→保存；指定擊殺由 1 到 2，與總擊殺同步。
- 已解鎖 fixture 測試（Lv.30／100 萬兩，非自然養成）：買木刀支付 1,656 兩、金創藥支付 552 兩、招募朝鮮槍兵、穿戴木刀（攻擊 +7／戰力 +45）、商隊出航並結算，trips 1→2。
- 十個分頁均實際渲染；補齊 fixture 的序章旗標後，港口、遺跡、圖鑑、委託、市政、祭壇的滑鼠導航均通過。
- 設定音量 42→41，展開 204 項任務日誌。重載後核對武器「普通・木刀」、金創藥 1、朝鮮槍兵、商路 trips 2 與音量 41 均保留；無錯誤 overlay，`errors` 無執行期錯誤。
- 效果品質整理後重新正式編譯，再以獨立瀏覽器 `modular-final-check` 建立「最後檢查」：村長接案→世界地圖，序章提示正常；無錯誤 overlay，`errors` 無執行期錯誤。
- 視覺紀錄：`docs/modularization-final-2026-10-03.png`。本機測試伺服器與獨立瀏覽器在收尾關閉。

### 驗收限制與後續工作（不屬本輪拆分）

最初 fixture 漏填序章旗標，招募後被同步回「商路告急」，造成側欄教學鎖；補齊所有完成旗標後重測滑鼠正常，不列為拆分回歸。先前的資源列遮住切換角色、任務浮條遮住市集服務、角色切換時 NPC 對話未清空仍列待修。尚未完成 30 分鐘自然成長／離線 Boss 完整通關／性能量測，不用煙霧測試取代平衡驗收。

本輪主控制器模組化計畫已完成；下一階段應處理 UI 遮擋與正式版卡頓量測，而非繼續為縮小檔案而拆檔。尚未 Git 提交、推送或發布，三個 `.site-sync*` 使用者目錄原樣保留。
