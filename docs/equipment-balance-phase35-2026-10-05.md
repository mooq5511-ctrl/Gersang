# 第三十五輪：首次世界地圖版面配置追蹤

## 現況與範圍

上一輪為實際進展：接入三張無損WebP並取得正式版操作證據。本輪繼續定位剩餘初次操作成本，沒有修改遊戲數值、任務、字體、CSS或React生產模組。用phase34已建立的本機正式版、隔離Edge session production-profile35、1600×1000、真實UI建立新角色「剖析35」。有診斷等待／Idle收入，不是自然無中斷30分鐘。

依React效能指引檢查重算、查表與螢幕外渲染；沒有僅因看到filter/find就改寫，因為尚未证明這是主要成本。瀏覽器skill協助取得真實點擊與Chrome追蹤，不以HTTP200代替畫面證據。

## 有效追蹤結果

world-profile.json 59,051 events：從任務導航開村長對話，剖析開始後UI點「立刻接下送貨委託」，第一次世界地圖建立。

- click EventDispatch本身43.926ms，這不是INP／端到端操作時長。
- clicked renderer thread在click開始後：Layout區間聯集223.253ms（最大210.570ms）；UpdateLayoutTree聯集19.899ms；FunctionCall聯集54.805ms；Paint聯集3.886ms。分類可能彼此包含，不可相加成總阻塞時間。
- 最大Layout有522 dirty objects／780 total objects；其內173次InlineNode::ShapeTextIncludingFirstLine聯集151.422ms。這是目前具體的文字排版成本證據；不等於已定位到某一張卡或某個字型。
- 開啟profiler本身產生334.877ms CpuProfiler::StartProfiling，發生在click之前，已排除；不能把這個被Phaser rAF包住的啟動耗時當成遊戲Phaser慢335ms。錄製仍有額外負擔，與phase34未剖析樣本不可直接作優化前後比較。

quest-profile.json 8,779 events 是第二次開任務（首次錄製失敗後已開過），不是cold sample：最大Layout6.250ms，文字排版聯集4.533ms，FunctionCall聯集51.331ms。沒有證據能由此宣稱初次任務卡頓已定位或解決。

第一個quest.cpuprofile無效：trace與profiler共用錄製機制，同時啟用被拒絕，stop輸出0 events。保留診斷紀錄但不採樣；之後改用單獨profiler取得有效world／quest追蹤。

## 測量工具與回歸

新增 scripts/analyze-browser-trace.mjs，只讀Chrome trace：選首次完整click事件與同pid/tid後續完整事件；同類重疊區間聯集計時；只計最大Layout範圍內文字排版；缺click與空追蹤回報invalid，防止空檔當成成功。3/3測試通過，涵蓋巢狀區間不重複、跨程序／執行緒／click前排除、read-only及無效輸入。沒有本輪全套／build重新驗證主張，因生產程式未改；上一輪全套577/573/4仍是最近正式回歸結果。

實際DOM：8張怪物卡片全在1600×1000初始畫面之外，第一列top1398px／height156px，第二列1563px／156px，最後列1727px／277px。新手目標需要捲動才看得到，這同時是引導可見性問題。不能直接從卡片在螢幕外推斷content-visibility一定省成本，瀏覽器可能預先渲染鄰近範圍；須做相同條件實驗並檢查捲動、鍵盤定位、卡片尺寸及目標操作。

測試browser errors未列頁面執行錯誤，不代表全console/network清零；工具有一次過期ref，重新snapshot取得當前ref，沒有用舊ref做其他遊戲修改。

## 下一步

優先測初次版面文字排版／螢幕外內容的可驗證優化，也應改善新手指定怪物在地圖之下難找的問題。保留完整地圖、怪物資料、首領鎖與戰鬥；不因追求低毫秒而砍功能或換字體破壞風格。

自然30分鐘、11傭兵長時間戰鬥、補給與MP、20級首領成長銜接、寶石成本／上限、既有測試失敗仍未完成。沒有改待授權普通怪HP、清玩家資料、push／merge／deploy，整套目標維持未完成。
