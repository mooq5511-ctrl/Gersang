# 剩餘驗證失敗核對（2026-10-07）

## 重新執行的證據

### 完整頁面剩餘樹稽核完成

- 新tests/page-extraction-remainder.test.mjs直接讀git 6c66ce3的原始game-v15.tsx，比對整個城市／戰鬥TabsContent。僅替換明確列名且數量固定的已審查功能边界；其餘整棵樹必須相等，不只檢查十個挑選區塊。忽略純空白JSX文字節點，不忽略顯示文字、屬性或回呼。
- 城市僅三個邊界：招募、裝備商店、寶石工房；戰鬥：地圖導覽1、區域描述2、教學說明1、怪物卡1，另新增教學操作1。每個邊界數量有斷言，其他區塊不可意外消失。反向修改倉庫UID、陣法清單及隊伍顯示門檻均可被抓到。
- 新tests/gem-workshop-wiring.test.mjs執行真實元件，覆蓋報價所用選中裝備、預覽身份、確認後原配方轉交、取消／資金不足／NaN／無效配方不交易、欄位及數量上限。配合現有gem-investment-confirmation及gem-socket-transaction驗證實際交易；UI替身不是瀏覽器證據。
- 模組驗收改為六個未改頁面維持原whole-page hash；城市／戰鬥使用完整剩餘樹及逐項行為驗證。原fixtures未修改。另修正遺跡頁已淘汰settleRelicWarSeal名稱檢查，改核對實際settleRelicRewards入口並執行獎勵結算測試。
- 最新模組驗收69項全部通過（outputs/goal-reviewed-module-tests.log），全遊戲結果另以outputs/goal-page-audit-full-tests.log為準。自然Boss與滿編瀏覽器效能不因模組測試通過而視為完成。
- 最新全遊戲重跑731項、730通過、1失敗；僅剩world-monster-progression中的日本海五怪耗時目標。測試總數包含模組驗收匯入的行為套件重複執行，不代表731個獨立玩法。本輪指定測試檔oxlint exit0，差異格式檢查通過。

### 城市與世界地圖接線覆蓋補強

- tests/city-shop-wiring.test.mjs新增三項：出戰以外的自有傭兵名單／信用等級／地方招募報價正確傳給招募面板、移除名單或信用欄位時測試確實失敗，以及寶石工房參數身份與陣法最新狀態保留。連同原商店三項均通過；測試使用明確的UI／資料替身，不宣稱每個城市交易流程已實測。
- tests/battle-map-page-wiring.test.mjs新增三項：真實頁面渲染的地圖開放門檻、教學期間不能旅行到其他區域、地圖座標與選擇回呼；反向移除教學限制必須被抓到；地圖建議等級來自區域規格，怪物HP／EXP來自實際敵人記錄，恢復期間按鈕不可用。三項均通過，接入模組化驗收。
- 本輪沒有改遊戲行為、沒有覆写immutable fixtures；整頁城市／戰鬥AST差異仍保留為未完成項。新增測試只證明上述接線，不涵蓋完整視覺排版、每種首領門檻及寶石工房內部交易，不能直接移除整頁失敗。
- 模組驗收單獨重跑46項、45通過、1失敗，仍是整頁AST差異（outputs/goal-expanded-module-tests.log）。本輪指定測試檔oxlint exit0、diff檢查通過；上一輪690項全遊戲結果不能冒充新增測試後的完整重跑。

`node --test tests/modularization.test.mjs tests/world-monster-progression.test.mjs`
結果：14 項，10 通過、4 失敗。這是兩個檔案的重跑，不是完整測試。

### 三項 immutable AST 比對

原始 fixtures 未修改。失敗位置如下：

- 20 個搬移函式中，16 個仍完全符合舊樹；不同的 4 個是 `goToObjective`、`handleNpcAction`、`openNpcDialogue`、`redeemWandererSet`。
- 10 個頁面中，原本排除 squad/relic 後，battle/city 仍與歷史樹不同；其餘 6 頁仍符合。
- 全域 `WorldBattleWindow` 樹與合併時歷史版本不同。仍需區分真正回歸與後續功能變更，不能直接重錄 hash。
- 組合入口、typed controller 連接、view setter identity 的現有測試通過。

### 日本海域節奏

這次的實際失敗是 **偏慢**，不是偏快。全部能勝利，耗時超過測試上限：

| 怪物 ID | 分類 | 秒數 | 現有目標 |
| --- | --- | ---: | --- |
| e_japan_sea_bat | 入口怪 | 9.8 | 5–8.5 |
| e_japan_sea_crab | 主力怪 | 17.55 | 8–15 |
| e_japan_sea_starfish | 主力怪 | 15.6 | 8–15 |
| e_japan_sea_starfish_strong | 菁英 | 27.45 | 15–25 |
| e_sea_god | 菁英 | 27.45 | 15–25 |

以上是測試參考隊伍，不代表新角色實際購裝與轉職所需時間。沒有在此輪改海域怪物、關卡解鎖或放寬時間範圍。

## 新增語意連接保護

新增 `tests/world-battle-panel-wiring.test.mjs`，以 transpile 後的實際 TSX 模組搭配惰性 UI／依賴 doubles 執行：

- 全域視窗接現行 dungeon、request；ready=false／slot=null 不啟用，slot=0 有效。
- party 只包含主角與上陣傭兵，休息傭兵不計入 DPS。
- 持續練功、Auto Potion、Battle Log 仍接原有資料。
- 操作傳給既有 `runWorldBattleAction`，functional updater 使用最新 state；Date／亂數在 updater 外只取一次，重跑 updater 不重抽。
- 補血設定傳给原本 action，沒有副造遊戲狀態。
- 根入口不擁有 state／storage，全域視窗仍在 Tabs 生命周期外。
- 以記憶體中的源碼突變，驗證保護能拒絕「render 舊 state」與「updater 內重取時間／亂數」。沒有修改實際遊戲程式來製造錯誤。

與 `tests/world-battle-action.test.mjs` 的真實引擎、任務勝利、停止與撤退測試一起執行：14 項全部通過。

這些新測試是補充語意證據，**目前未替換三項 immutable 比對**。NPC／套裝／battle-city 的後續變更仍需分別核對覆蓋，再決定如何維護歷史模組化保護。全遊戲尚未重新測試；Boss 自然養成與多傭兵正式版效能也未完成。

本輪未 push、merge、deploy，未改玩家資料或更新 immutable fixtures。

## 後續：函式與全域面板語意保護落地

- `hanyang-npc-dialogue.test.mjs` 新增實際 controller 交付／返村／出發選項的 NPC 與 step gate、重複交付不重領；故事 greeting 優先與一般 fallback、不給獎勵；第一份委託未完成不領短劍，完成才給 atk4／Lv1 短劍與補給，重領不複製。
- 初次新測試的 fixture 漏了出發所需的貨物交付旗標，並誤以為 NPC 靜態選項包含 UI 動態回報按鈕；已按實際前置與 `npc-dialogue-panel.tsx` 的動態選項修正測試資料，未變更遊戲程式以迎合測試。
- NPC／navigation／mythic 三個檔案 13 項通過。
- `modularization.test.mjs` 靜態引入上述行為測試及世界戰鬥面板／action 回歸，因此單獨跑模組化測試也必須真的執行行為保護，不是僅宣稱其他測試存在。
- 只對明確已變更的 4 個函式取消舊樹一致要求；其餘 16 個維持原 hash，20 個函式存在檢查保留。全域面板改檢查唯一 arena 與根入口位置，同時執行接線與真實引擎測試。兩份 immutable fixture 的 git diff 為空，未重錄任何 hash。
- battle／city 頁面歷史差異暫不排除。模組化測試重跑 32 項，31 通過／1 失敗，失敗仍精確指出這兩個頁面。
- 完整重跑已完成：`outputs/goal-semantic-coverage-tests.log`，667 項／665 通過／2 失敗，151764.4961ms。數量包含模組化檔案引入後再執行的既有行為案例，不是新增35種獨立玩法。失敗為 battle／city 的歷史 AST 比對及日本海域節奏；未宣稱整體完成。

## 頁面差異核對發現的實際修正

- 對照模組化提交 `08999a5` 的兩個頁面差異，battle 的怪物卡片仍把 `Date.now()`／`Math.random()` 放在 `setGame` updater 內。沒有因此放行歷史頁面比對。
- `app/game-battle-page.tsx` 將怪物點擊事件移至元件外 `handleMonsterHunt`，每次點擊先取時間與遭遇 rolls，再交給 functional updater。沿用 `runDungeonAction`、原怪物、掉落與 autoHunt 行為，不新增戰鬥模擬。
- render 與最新 state 都檢查 Boss 教學 gate／recovering，避免過期卡片操作重設療傷。原 UI 的教學怪物 disabled 規則保留。
- 新增 `tests/world-monster-selection-wiring.test.mjs`，執行實際 TSX 抽出的事件函式，驗證重播兩次 updater 仍使用相同 rolls、最新 state、原存檔不變，以及禁用／過期限制不啟動引擎。引擎本體仍由既有 Boss／battle action 測試覆蓋。
- 最終事件位置重跑 15 項全部通過；`tsc --noEmit` 通過。
- oxlint 原先對元件內 handler 產生 purity 錯誤，移至元件外後已消除。整個頁面的 lint 仍有既有 `prefer-tag-over-role`／`no-img-element` 兩項，不能宣稱 lint 通過；沒有停用規則。
- 為建置只停止自有3001程序67357，未動玩家3000；最新 build 日誌 `outputs/goal-monster-selection-build.log`，程序96094 exit0，正式建置通過，仍有既有大chunk／路由分類警告。新版本瀏覽器驗收尚未完成，不能把先前667項結果當成此修正後的全量結果。
# 城市商店行為覆蓋補強

新增 `tests/city-shop-wiring.test.mjs`，轉譯並執行真正的GameCityPage，使用明列的惰性UI／資料替身隔離串接：驗證城市價格倍率與取整、官方裝備／穿戴裝備／系列裝備的購買數量轉送、系列等級鎖、主角等級附魔報價與資金不足鎖定、防具商店不顯示附魔櫃。加入變異驗證，刻意移除地區價格倍率時，測試必須捕捉錯誤。

這不是畫面截圖或真實商品資料測試；真正扣款、品質、等級檢查由equipment-batch-purchase與magic-offer-growth交叉驗證。模組化基準失敗仍保留，未直接更新fixture或排除整個city/battle頁面。城市其他服務與整個戰鬥頁的歷史差異還需逐項稽核後，才可改寫該驗證方式。
# 歷史區塊對照結果

唯讀取得固定歷史版本 `6c66ce3:app/game-v15.tsx`，按AST對照目前城市／戰鬥模組。城市地圖、城市標題、服務切換、倉庫、客棧、藥店、材料交易；戰鬥可見性切換、隊伍生命資訊、戰報，共十個區塊完全一致。新增page-extraction-unchanged測試保留這些歷史hash，hash來源為歷史版本而非目前模組；刻意改錯倉庫物品UID或戰鬥開關亦可被捕捉。與城市串接測試合跑5/5通過。

差異位置：城市招募追加轉職資料、裝備商店改版、寶石工作台抽出；戰鬥新增頂部教學按鈕、地圖成長說明／新手引導、怪物卡片啟動。新增行為與歷史區塊測試已由modularization測試直接匯入，但原整頁歷史hash失敗仍保留，尚未宣稱整個模組化驗收完成。
