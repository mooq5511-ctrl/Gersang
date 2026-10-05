# 第三十四輪：正式版首次操作量測與無損素材載入

## 範圍與實作

本輪使用本機 production build、Wrangler local 127.0.0.1:3001、隔離 Edge agent-browser 0.38.2 session，1600×1000 視窗。3000 開發預覽保持運作。沒有部署、共用玩家 profile、清除玩家資料、注入金錢／經驗／勝利或快轉遊戲時間。

新增 scripts/browser-performance-probe.js：以 PerformanceObserver 觀察長任務、event timing、paint 與 layout shift，以及有上限的 rAF 樣本。不讀寫遊戲 state/storage。interactionMax 是本次操作事件的最大觀察值，不是正式 INP；layout shift 是非近期輸入的觀察加總，不是正式 CLS session-window 指標。headless rAF 不代表玩家螢幕 FPS。各操作只有一組前後樣本，不能據此聲稱穩定改善或根因已證實。

首次世界地圖載入三張 PNG 共 7,780,480 bytes；可能影響首次進入，但不能把所有主執行緒耗時都歸因於圖片。scripts/encode-world-entry-assets.mjs 使用 bundled Sharp 進行 lossless WebP 格式轉換；不裁切、縮放或重繪，原 PNG 保留。重新解碼驗證尺寸、alpha 與所有可見像素 RGB 一致；alpha=0 的不可見 RGB 不要求一致。既有不同內容目標檔拒絕覆寫，不新增遊戲依賴。

| 圖片 | 原 PNG bytes | WebP bytes | 減少 |
|---|---:|---:|---:|
| newbie-raccoon-v1 | 2,337,530 | 1,089,616 | 53.39% |
| bandit-chief-normal | 2,197,318 | 1,587,132 | 27.77% |
| world-map-voyage | 3,245,632 | 2,545,734 | 21.56% |

總量 5,222,482 bytes，減少 2,557,998 bytes（約32.88%）。僅改 battle-visual-data.ts、game-ui-config.ts、globals.css 的路徑；保留原佈局、切圖設定、數值與任務。

## 正式版操作觀察

建置與測試結束後量測，操作由 UI 建立空角色、查看任務、接受村長委託、進地圖與點偷糧狸。量測過程有排查等待、真實 Idle 收入；不是無中斷自然30分鐘試玩。以下毫秒，讀取窗口長度不同；不可比較 frame percentile 的整段體驗。

| 操作 | 修改前最大事件時長 | 修改後 | 前最大長任務 | 後最大長任務 |
|---|---:|---:|---:|---:|
| 首次任務面板 | 208 | 160 | 189 | 151 |
| 首次世界地圖 | 528 | 456 | 297 | 263 |
| 首次教學戰鬥 | 240 | 216 | 207 | 173 |

任務面板差異不是本次圖片優化的因果證據：它沒有使用這三張圖片，環境變動可能影響數值。首次地圖仍有456ms事件、263ms長任務，卡頓未解決。前後導航 TTFB144.8/132.3、FCP344/320、LCP560/544 只描述入口頁，非世界地圖完成時間。

實際 WebP resource body bytes 與生成檔一致，三張 resource duration149.4/170.9/270ms（前 PNG280.5/286.6/303.4ms）。localhost 單次資源時間不能推估朋友網路速度或保證 decode CPU 降低。DOM 圖片完成且 natural dimensions1536×1024、1148×1371正確；地圖 screenshot 視覺正常。errors 命令未列頁面執行錯誤，不宣稱所有 console/network 警告清零；favicon 404 原有。

截圖與本輪獨立角色 state 在已忽略的 outputs/browser-phase34，測試瀏覽器關閉，沒有使用玩家角色。舊3001測試程序曾鎖住 dist 導致首次 build EPERM；停止自己的程序後成功 build。chunk/plugin/route 警告仍在。

## 驗證與後續

新增3測試：可見像素比較規則、WebP格式／縮小／原圖保留、正式呈現模組引用。3/3過；實際 Sharp 重新解碼驗證三張均一致。全套577項573過、4失敗（三個既有 immutable AST、一個海底洞節奏），不修改基準／放寬門檻來掩蓋。typecheck與兩個修改TS模組lint通過。測試命令輸出經過濾後需看測試總結，不能以後續lint的程序exit0稱全套成功。測試server與兩個獨立browser session均已停止，玩家3000預覽不停止。

需要繼續查首次介面建立的主執行緒耗時、實際長時間多人戰鬥與小螢幕，並完成自然新角色30分鐘、補給／MP／升級、章末及遺跡投資、寶石上限／成本。此次素材優化不代表整套裝備與遊玩方案完成。未套用待授權普通怪HP、未push／merge／deploy。

建議 commit message：perf: serve lossless world-entry artwork。
