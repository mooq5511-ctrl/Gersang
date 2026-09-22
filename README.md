# Gersang

《Gersang》是以繁體中文為主的單人網頁放置 RPG。玩家可建立角色、招募傭兵、探索地圖、進行戰鬥、收集裝備並保存進度。

## 開始開發

```bash
pnpm dev
pnpm lint
pnpm build
node --test tests/*.test.mjs
```

主要入口是 `app/page.tsx` → `app/game-v15.tsx`。遊戲資料集中於 `data/`，回歸測試位於 `tests/`。

## 專案文件

- [開發手冊](docs/DEVELOPMENT.md)：Git 工作流程、commit 規範、存檔保護與發布。
- [變更紀錄](docs/CHANGELOG.md)：版本發布與玩家可見改動。
- [路線圖](docs/ROADMAP.md)：里程碑與產品方向。
- [待辦](docs/TODO.md)：可提交的小型工作項目。
- [NPC 與任務](docs/NPC.md)：對話、任務與進度設計。
- [地圖與區域](docs/MAP.md)：地圖、解鎖與區域資料。
- [傭兵系統](docs/MERCENARY.md)：招募、編隊、升階與存檔規則。
- [戰鬥系統](docs/BATTLE.md)：戰鬥循環、結算與驗收。
- [UI 規範](docs/UI.md)：介面與可用性檢查。
- [美術指南](docs/ART_GUIDE.md)：素材命名、授權與視覺方向。

提交前請依 [開發手冊](docs/DEVELOPMENT.md) 執行受影響的測試與檢查；文件改動使用清楚的 commit，例如 `chore: 建立專案開發文件`。

