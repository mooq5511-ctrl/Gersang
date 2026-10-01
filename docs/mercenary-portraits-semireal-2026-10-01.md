# 傭兵半身立繪：成熟半寫實 v1

2026-10-01。使用內建 image_gen 逐張生成，以使用者定稿的朝鮮槍兵為風格參考。

## 完成範圍

19 種角色：1 張使用者定稿槍兵 + 18 張新設計。皆為 1024×1536 半身卡面，帶深色暖光背景，**不是透明去背圖**。

素材位置：`public/assets/mercenary-portraits/semireal-v1/`。

[開啟本機全員預覽](http://localhost:3000/assets/mercenary-portraits/semireal-v1/index.html)

已套用到傭兵招募介紹、隊伍頭像、休息處、編隊、裝備頁、能力頁及遺跡 Boss 參戰頭像。展示元件依 templateId（或舊圖片路徑）選用新版，不改寫存檔 image；戰鬥小人物、主角、既有武將與技能數值保持不變。尚未部署。

遊戲使用另存的 512×768 JPEG，19 張合計 2,216,410 bytes（約 2.2 MB），原始 PNG 保留。使用固定尺寸、lazy loading 與非同步解碼。專案使用 vinext，核心引擎同時在純 Node 測試中引用遺跡模組，因此展示元件使用預先最佳化的靜態 img，不引入無法於純 Node 解析的 next/image 或 CSS；樣式由介面入口載入。未知角色保留既有圖片，不作隨機職業配圖。

驗證：339 項測試全數通過，TypeScript 與正式編譯通過；原有 CSS import 排序與 bundle-size 警告仍存在。獨立瀏覽器角色實際展開槍兵招募介紹、招募槍兵、選取隊伍並開啟能力／裝備頁，皆確認新版 JPEG 載入成功，控制台未出現錯誤。截圖為 `mercenary-portraits-squad-applied.png`；測試只使用獨立角色，未改動玩家存檔。

## 設計提示集

完整通用提示與各角色提示保存於 `public/assets/mercenary-portraits/semireal-v1/design-manifest.json`。重點是：成熟半寫實、頭至腰的半身構圖、深色暖光、舊銅與實際材質、各職業武器和姿態可辨、無文字與介面邊框。這是遊戲幻想設計，不主張服飾或器物的嚴格歷史考證。媽祖是既有作者測試角色，不新增招募設定。

## 角色檔案

- 朝鮮槍兵：`spear.png`
- 山城盾衛：`shield.png`
- 虎獵弓手：`archer.png`
- 朝鮮巫女：`shaman.png`
- 倭國武士：`samurai.png`
- 伊賀忍者：`ninja.png`
- 鐵砲足輕：`gunner.png`
- 陰陽術士：`onmyoji.png`
- 中原刀客：`blade.png`
- 少林武僧：`monk.png`
- 行腳郎中：`healer.png`
- 火器砲手：`cannon.png`
- 東海鏢師：`escort.png`
- 山林獵手：`hunter.png`
- 天竺戰象兵：`elephant.png`
- 天竺梵僧：`priest.png`
- 劍豪：`swordmaster.png`
- 軍神真田信綱：`sanada.png`
- 媽祖娘娘：`mazu.png`
