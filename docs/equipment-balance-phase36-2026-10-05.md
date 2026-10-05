# 第三十六輪：教學戰鬥目標直接可見

## 實作

世界地圖最上方新增「現在要做的事／清除驛路上的偷糧狸」，顯示0–3進度與開始清剿按鈕。僅原outskirts教學階段顯示，不新增任務、不改怪物或首領、不取代完整地圖與怪物清單。全清單與原按鈕仍保留。

app/tutorial-hunt.ts 是新入口專用小模組：權威最新狀態檢查教學階段、starter-outskirts、少於3次擊殺與未fighting／respawning／recovering；不符合就回傳原state，不會重置當前战鬥、跳過療傷或給獎。合法時沿用freshDungeon＋runDungeonAction的真實e_starter_raccoon，與既有怪物卡相同遭遇流程，不建另一個模擬。事件先採樣時間／隨機，再用functional setGame檢查最新state，React重試不重抽。

獨立tutorial-hunt.css使目標卡在桌面左右排列，小螢幕上下排列；48px按鈕、focus-visible輪廓、disabled狀態。不改全站字型、切圖或數值。此輪優先修正目標看不到，不以新增目標卡聲稱首次文字排版更快，phase35效能問題仍待量測優化。

## 正式版瀏覽器證據

本機production build成功；沿用3001正式版測試server、隔離Edge namespace/session。中斷後重新檢查原session已沒有原頁面，CLI啟動空browser；關閉這個空browser後以空config／指定Edge／僅本機domain重新建立。server仍存活，未重啟它；確認三欄空白才UI建立「教學36」，未覆寫玩家角色。前一次中斷前角色是否已建立不可由目前空context證明，也不聲稱刪除／恢復了該資料。

從村長實際接任務：桌面1600×1000新按鈕top181.06、bottom229.06；小螢幕390×844 top379.94、bottom427.94。兩者均完整在視窗內，中心elementFromPoint為按鈕本身，非被遮住。截圖可見目標、進度與按鈕；小螢幕完整側欄仍佔部分寬度，是既有佈局，不聲稱整個手機體驗完成。

在小螢幕直接點「開始清剿偷糧狸」，真實動態戰鬥開啟、有偷糧狸HP與玩家HP。完成3次後收起視窗，主線顯示「回村長處領取戰利品」，記事有3次真實20經驗擊殺與原序章停止Auto Hunt通知。新目標卡消失，未持續額外刷怪。點城門自動開村長對話，點「回報任務」後選項消失，回報流程正常。

測試有排查等待與Idle收入，只有第一份委託回報，不是自然連續30分鐘。未塞錢／經驗／兵符、改時間或修改隱藏state。errors命令未列頁面執行錯誤，不保證所有console/network無警告。隔離state與桌面／手機截圖在outputs/browser-phase36，測試browser關閉，自己3001server停止；3000玩家預覽未停止。

## 測試

新增3測試：合法新入口與原runDungeonAction完全等價、過期點擊／戰鬥／療傷／不同地圖／完成階段不變state、目標入口在地圖及面板控制之前。加首領防護測試6/6過。最初錯誤假設start不會擊殺，因此assert gold不变失敗（實際8兩）；既有引擎start會即刻執行首擊，改成完整既有動作deepEqual，不放寬獎勵或改怪物來配測試。

全套583項579過、4既有失敗（三immutable AST、一海底洞節奏）；沒有更新凍結基準或放寬門檻。typecheck、build過；新純TS模組lint過；頁面仍原有status角色標籤／img警告，不能宣稱全頁／全專案lint成功。chunk／plugin／route警告仍有。

## 未完成

仍需首次世界地圖文字排版效能實驗、自然30分鐘完整成長、多傭兵持續戰鬥、小螢幕全流程、補給與MP負擔、章末與遺跡養成、寶石成本與上限、既有測試失敗處理。此輪入口改善不能代替整套方案完成。未改待授權普通怪HP、清玩家資料、push、merge或deploy。

React指引促使新入口採最新state的functional更新與事件前固定隨機；瀏覽器指引讓本輪驗證可見性與真實點擊／回報，而非只驗HTTP。

建議commit message：fix: surface tutorial hunt objective above world map。
