# GitHub Project 工作流程

GitHub Project「Gersang Development」是唯一的日常工作清單；`docs/ROADMAP.md` 保留版本方向，Issue 則是可提交、可驗收的工作單位。

## 欄位流程

`Backlog → Planning → Ready → Developing → Testing → Done`

- Backlog：已拆分但尚未排入本週的工作。
- Planning：已補齊範圍、驗收、存檔與測試影響。
- Ready：可立即開始，沒有設計阻塞。
- Developing：目前實作中；同一時間只保留少量卡片。
- Testing：程式完成，等待自動或手動驗收。
- Done：驗收、文件與變更紀錄都已更新。

## Issue 最小完成條件

每張卡都要寫清楚玩家目標、修改範圍、存檔影響、可驗收結果與測試。功能完成時，連結 PR，移入 Testing；通過驗收後關閉 Issue，Project 會進入 Done。

## 版本節奏

- `Alpha v0.4 — 城鎮、NPC 與任務`
- `Alpha v0.5 — 傭兵與戰術`
- `Alpha v0.6 — 戰鬥、裝備與平衡`
- `Beta — 完整遊戲循環`
- `Release v1.0 — 發布準備`

Issue 的優先度用 `P0`–`P3` 標籤表示；領域標籤反映系統歸屬，兩者都必填。
