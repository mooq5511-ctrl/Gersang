# 《Gersang》開發手冊

> 本文件是《Gersang》繁體中文單人網頁 RPG 的共同開發準則。目標是讓每次改動可理解、可測試、可回復。

## 專案速覽

- 技術：React、TypeScript、Vinext／Vite、pnpm。
- 入口：`app/page.tsx` → `app/game-v15.tsx`。
- 遊戲內容優先放在 `data/`；畫面與規則放在 `app/`；回歸測試放在 `tests/`。
- 存檔目前使用瀏覽器 `localStorage`。`app/game-state.ts` 的 save key、版本與遷移邏輯是相容性契約，不可任意改名或移除。

常用檢查：

```bash
pnpm dev
pnpm lint
pnpm build
node --test tests/*.test.mjs
```

## Git 工作流程

每個 commit 只完成一個可驗證的小目標：實作 → 測試 → 檢查差異 → commit → push。

小型、已驗證的修改可以在 `main` 進行；跨多日、改動存檔或高風險功能請建立分支：

```text
feature/npc-quest-system
fix/dungeon-reward-once
refactor/monster-data
codex/formation-editor
```

分支合併前，更新至最新 `main`、處理衝突並跑完必要檢查。不要混入無關的 UI、戰鬥、美術與工具改動。

### Commit 格式

```text
<type>: <簡短且具體的繁體中文描述>
```

| 類型 | 用途 | 範例 |
| --- | --- | --- |
| `feat` | 玩家可見的新功能 | `feat: 新增漢陽藥師任務` |
| `fix` | 修正錯誤 | `fix: 修正地下城獎勵重複發放` |
| `art` | 視覺、音效、素材或介面美術 | `art: 更新白虎林怪物圖示` |
| `balance` | 數值、機率、獎勵 | `balance: 降低白虎領地怪物攻擊力` |
| `refactor` | 不改變遊戲效果的整理 | `refactor: 拆分怪物掉落資料` |
| `chore` | 工具、設定、文件與維護 | `chore: 補充 NPC 設計文件` |

不要使用沒有資訊的描述，例如「update」、「修正問題」或「測試」。不要提交 `.env*`、Token、憑證、`node_modules/`、`.next/`、`dist/` 或玩家資料。

## 命名與結構

- React 元件：`kebab-case.tsx`；一般模組：`kebab-case.ts`。
- 元件、型別、介面：`PascalCase`；函式與變數：`camelCase`；布林值以 `is`、`has`、`can` 或 `should` 開頭。
- 穩定資料 ID 一律小寫 `kebab-case`，發布後不改名，例如 `hanyang-apothecary`。
- 顯示名稱可用繁中，但不可作為唯一識別鍵。
- 圖片採小寫 `kebab-case`，例如 `white-tiger-king.webp`；記錄來源／授權。未完成素材使用 placeholder。

## 存檔與資料安全

變更 `GameState`、localStorage、背包、傭兵、裝備或任務進度前：

- [ ] 列出舊存檔會缺少或改變的欄位。
- [ ] 在正規化／遷移邏輯提供安全預設值。
- [ ] 保留既有 save key；若必須更動，提供讀取舊 key 的遷移。
- [ ] 以舊存檔、新角色、重新整理與重複操作驗證。
- [ ] 為「獎勵只領一次」等重要規則加入測試。

## Review 與發布

提交前：

- [ ] 變更只處理預定問題，沒有無關格式化。
- [ ] 新內容有穩定 ID，資料和 UI 沒有不必要耦合。
- [ ] 空資料、錯誤狀態、重新整理與連續點擊都有合理結果。
- [ ] 執行受影響測試；發布前執行完整測試、`pnpm lint` 與 `pnpm build`。
- [ ] 手動檢查新建／載入角色、戰鬥、獎勵、裝備與窄螢幕介面。
- [ ] 需要時更新本目錄對應文件與 `AI_HANDOFF.md`。

版本採 SemVer：`v主版.次版.修正版`。`v0.4.0` 代表向下相容的新系統，`v0.4.1` 代表修正；涉及存檔時，版本號不能取代遷移與驗證。

發布順序：確認範圍與版本 → 完整檢查 → 手動遊玩 → 更新 `CHANGELOG.md` → `chore: 準備 vX.Y.Z 發布` → 建立 Git tag 與 GitHub Release。

## AI 協作任務範本

```text
目標：在 data/npcs/hanyang.ts 新增可重複的藥師委託，並在既有對話 UI 顯示。
限制：保留現有 localStorage key 與舊任務進度；獎勵不得重複領取。
驗收：補上／更新測試，執行相關測試與 pnpm build，回報修改檔案、結果與風險。
```

不要提供 API Key、密碼、Token 或完整玩家存檔。重大架構或相容性調整完成後，同步更新 `AI_HANDOFF.md`。

最後更新：2026-09-22。
