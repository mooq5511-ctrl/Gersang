# 網站發布流程

正式網站由 GitHub 的完整遊戲原始碼與 OpenAI Sites 的發布包共同組成。大型圖片、音樂與圖集可以保留在 GitHub 與網站包中；Sites 的來源 Git 則只接收安全大小以內的程式與小型資源，避免單一 Git 物件大小限制造成發布失敗。

## 正常發布

1. 確認工作目錄乾淨，將要發布的變更提交並推送到 `main`。
2. 執行 `npm run release:prepare`。
3. 指令會完成建置、產生 `.site-publish/latest.tar.gz`，並寫入 `.site-publish/release-manifest.json`。
4. 發布服務使用 manifest 的 `siteSourceCommit` 同步 Sites 來源，再將同一份 archive 儲存並發布。

`release-manifest.json` 會記錄完整 GitHub 提交（`sourceCommit`）與 Sites 精簡來源快照（`siteSourceCommit`）的對照。正式遊戲實際執行的是完整 archive，因此大型素材仍會包含在網站中。

## 安全規則

- 發布指令預設拒絕未提交的檔案，避免發布包與 GitHub 提交不一致。
- `--allow-dirty` 與 `--skip-build` 只供本機診斷；不可用於正式發布。
- `.site-publish/` 是可重建的本機發布產物，不能提交。
- Sites 的短效發布憑證只由發布服務當次提供；不可寫入檔案、環境範本或 GitHub。
