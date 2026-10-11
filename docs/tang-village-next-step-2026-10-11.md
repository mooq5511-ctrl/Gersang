# 大唐篇：村民互動與切片修正

基礎：`origin/main` 23521d6；開發分支 `codex/tang-village-vertical-slice`。

## 本次內容

七個獨立 NPC 資料項目含編號、固定百分比站位、地點、功能、對話、可替換立繪路徑。母親在家門前；其他角色使用暫用符號。母親、村長、雜貨掌櫃、老農、鐵匠、村童、糧販的角色與站位均待正式圖片原檔核對，不能視為原圖設計的完整還原。

任務事件透過 `actTangPrologue` 在 `setGame` 更新邊界檢查最新狀態；快速重複買糧、提前交付及資金不足皆不改動狀態。交付後清除任務米糧。舊存檔沒有大唐欄位時仍保持 optional；重登正規化新進度，避免不合法狀態與已交付米糧殘留。

沿用現有 Dialog 元件的 Escape、焦點管理、語意標題與說明。大唐頁面隱藏漢陽主線目標條；舊教學導覽鎖定仍保留，但允許進入大唐切片。

## 修改檔案

- `app/tang-village-npcs.ts`：七名 NPC 資料與資產插槽。
- `app/tang-prologue.ts`：任務正規化與具防重複執行的交易。
- `app/tang-village-prologue.tsx`：七名 NPC 按鈕、個別對話與糧販交易。
- `app/tang-village-prologue.css`：獨立站位、對話視窗、手機排版。
- `app/game-profile-storage.ts`：大唐存檔讀取正規化。
- `app/classic-map-interface.css`：修正教學鎖定阻擋大唐入口。
- `app/game-v15.tsx`：大唐頁面隱藏漢陽目標。
- `tests/tang-prologue.test.mjs`、`tests/tang-save.test.mjs`：交易順序、防重複、真正角色槽位存讀。

## 待製作與後續

場景仍是程式繪製的暫用背景；主角家以外的老槐樹、雜貨鋪、打鐵棚、水井與村口建築素材尚未完成。六名村民需要分別製作去背立繪與地圖角色圖；母親目前為第一輪暫用生成稿。

村口買糧僅為 P-01/P-02 功能驗證的暫用櫃檯。正式序章依既定規劃，仍應經官道至長安買糧，再返回村莊；官道、長安、時空裂縫與 P-03～P-08 尚未實作。既有角色建立、商店、裝備背包、存檔和掛機循環沿用，不重製。

## 預覽

在本分支工作樹啟動 `node node_modules/vinext/dist/cli.js dev --host 127.0.0.1 --port 4317`，開啟 `http://localhost:4317`。建立或進入角色，選「大唐・無名村」。本機測試使用此 port 的獨立瀏覽器存檔，沒有載入或刪除正式網站的角色存檔。

## 驗證紀錄

- `tsc --noEmit --pretty false`：通過。
- `node --test tests/tang-prologue.test.mjs tests/tang-save.test.mjs`：4 項通過。
- `node --test tests/game-save-scheduler.test.mjs tests/session-hooks.test.mjs tests/storage-guards.test.mjs`：11 項通過。
- 實際瀏覽器建立本機測試角色，進入大唐、完成 P-01、接受 P-02、購米、交付；重登後確認完成狀態保留且米糧清除。
- 七名 NPC 對話逐一點開；新手教學鎖定期間可進入大唐頁面。
- 實際手機版視窗 391×846：對話無水平溢出；Escape 關閉後焦點回到母親按鈕。
- `node node_modules/vinext/dist/cli.js build`：五階段建置成功；仍有既有大型 chunk 與路由分類提示。
