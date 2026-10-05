# 裝備校準第三十三輪：瀏覽器新手入口與首領誤入修正

## 實際瀏覽器證據

內建cua工具因Windows sandbox setup錯誤無法啟動。經本輪網路授權，以固定agent-browser 0.38.2工具快取搭配既有Edge，隔離namespace／session與空config，不共用玩家profile／storage。工具放.codex/browser-tool-cache，未加入package.json或lockfile。

localhost:3000開發版真的載入；入口「進入角色選擇」可操作，確認三欄均未建立角色，UI建立「新手實測33」。桌面1600×1000截圖可見主線收合欄、側欄與村長入口。接受第一份委託後能到世界地圖，按鈕與怪物資料真的渲染；errors命令未列出頁面執行錯誤。沒有因此聲稱沒有任何console/network警告或完整資產均成功。

新手入口實測發現：普通怪在outskirts教學被鎖，但山賊首領仍可點；點下去實際直接進入戰敗／免費客棧療傷。不是連線問題，也不是Boss該削弱的證據，而是誤入保護不一致。

## 修正

新增hanyang-boss-access共用政策：已存在但未完成的漢陽序章階段，實際sourceEnemy.boss世界首領暫不允許；完成序章後開放，不新增等級／戰力門檻。無序章欄位的舊型資料不另強鎖。偷糧狸與黑巾斥候不是世界首領，不受此政策限制。

game-battle-page直接衍生disabled／原因文字與render時防護，setGame再依最新狀態檢查，未加同步effect。runDungeonAction防護直接start／start-auto-hunt／toggle-auto-hunt，並停止既有教學首領fighting／respawning的tick，避免舊Auto Hunt續戰；不碰HP／MP、金錢、經驗、物品、擊殺或任務內容，也不假補血。recovering可正常免費療傷，stop／retreat仍可離場。不是遊戲通用Boss難度調整，也不更改其他地圖／掉落來源。

熱更新後實際瀏覽器確認山賊首領disabled、文字「請先完成村長的新手引導，再挑戰世界首領。」；仍能點偷糧狸，看到動態戰鬥、我方HP與Auto Potion介面。三次擊殺後真正停止狩獵、任務改為回村長領戰利品。側欄城門回城自動開村長回報對話，點「回報任務」後回報選項消失。未呼叫隱藏state setter、跳時間、塞錢或設定勝利。

本輪測試角色曾誤入Boss並有停下排查的等待，Idle收入照真實時間累積；這個角色不是無中斷自然30分鐘節奏樣本。隔離測試狀態存於.codex/phase33-browser-state.json後關閉測試瀏覽器，沒有清除／覆寫玩家本來存檔。截圖phase33-entry／map／boss-locked／tutorial-pause也在.codex；不當可發佈美術。加入針對工具快取、空config、本輪截圖與測試角色state的gitignore，避免這些測試資料進提交，其他.codex內容不忽略。

## 測試與品質

新增3測試覆盖所有未完序章階段、真實偷糧狸／黑巾斥候例外、完成／缺欄位開放；三種開始動作不傷害／扣費／給獎；舊首領auto遭遇停止且療傷保留。首領掉落結算測試補上「已完成序章」的合法fixture前置，掉落一次、存檔、Auto Hunt等斷言未削弱。未改immutable AST基準。最初完成序章fixture用Lv.1裸角預期fighting不正確，已有立即戰敗／回客棧重設key規則；測試改驗證合法挑戰後真实戰敗與未觸發教學拒絕，不加強測試角色或改Boss。

教學／序章相關10/10，神裝與防護6/6過。全套574項570過，仍4既有失敗（三immutable AST、一海底洞節奏）。typecheck與build過；新政策／戰鬥動作核心lint過，battle-page仍2現有lint（status tag、img），不能稱修改頁面或全專案lint通過。建置chunk／plugin／route警告仍在。

React檢查指引促使畫面直接讀取共用政策、不使用衍生state或effect，避免顯示與權威規則飄移。本輪僅一TSX頁面改動。瀏覽器skill讓本次驗證取得真正按鈕／畫面證據，並非只查HTTP200。

## 尚未完成

目前只實測到第一份委託回報，未走完購物／招募／轉職或完整自然30分鐘；正式版FPS／長任務／輸入延遲尚未量測。補藥負擔、角色MP／目標選擇、20級章末及遺跡整備、寶石成本／上限仍待接續。不能把本輪首領入口修正代替整套裝備方案完成。

未改Boss能力、未套用待批准普通怪HP、未清玩家存檔、push、merge或deploy。建議本輪commit message：fix: prevent world boss entry during Hanyang prologue。
