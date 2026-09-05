"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Compass, Database, Download, PackageOpen, Search, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

type AssetRow = [path: string, ext: string, category: string, size: number];
type AssetCatalog = { total: number; categories: Record<string, number>; extensions: Record<string, number>; assets: AssetRow[] };
type DiscoverySave = { count: number; recent: AssetRow[] };

const CATEGORIES = ["全部", "角色", "物品", "場景", "介面", "聲音", "圖像", "資料", "系統"];
const PREVIEWS: Record<string, string> = { 角色: "phoenix-0.png", 物品: "armor-0.png", 場景: "china-market-0.png", 介面: "element-8.png", 聲音: "creature-8.png", 圖像: "bosstiger-0.png", 資料: "food-8.png", 系統: "creature-16.png" };
const SAVE_KEYS = ["bt52_v19_character_profiles", "bt52_v19_character_slot_0", "bt52_v19_character_slot_1", "bt52_v19_character_slot_2", "bt52_v20_shared_warehouse", "east_sea_v28_archive_slot_0", "east_sea_v28_archive_slot_1", "east_sea_v28_archive_slot_2"];
const format = (value: number) => new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(value);
const shortName = (path: string) => path.split("/").at(-1)?.replace(/\.[^.]+$/, "") || path;

export function GersangArchive({ slot, onReward, onLegacyImport }: { slot: number; onReward: (reward: number, name: string) => void; onLegacyImport: (payload: Record<string, unknown>) => void }) {
  const [catalog, setCatalog] = useState<AssetCatalog | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [page, setPage] = useState(0);
  const [discoveries, setDiscoveries] = useState<DiscoverySave>({ count: 0, recent: [] });
  const fileRef = useRef<HTMLInputElement>(null);
  const saveKey = `east_sea_v28_archive_slot_${slot}`;

  useEffect(() => {
    fetch("/game-data/asset-index.json").then((response) => {
      if (!response.ok) throw new Error("asset catalog");
      return response.json() as Promise<AssetCatalog>;
    }).then(setCatalog).catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    try { const raw = localStorage.getItem(saveKey); if (raw) queueMicrotask(() => setDiscoveries(JSON.parse(raw))); } catch { /* keep a fresh archive */ }
  }, [saveKey]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const needle = query.trim().toLowerCase();
    return catalog.assets.filter((asset) => (category === "全部" || asset[2] === category) && (!needle || asset[0].toLowerCase().includes(needle) || asset[1].toLowerCase().includes(needle)));
  }, [catalog, category, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 18));
  const visible = filtered.slice(page * 18, page * 18 + 18);

  function explore() {
    if (!catalog?.assets.length) return;
    const found = catalog.assets[Math.floor(Math.random() * catalog.assets.length)];
    const reward = Math.min(6800, 1200 + Math.floor(found[3] / 180));
    const next = { count: discoveries.count + 1, recent: [found, ...discoveries.recent.filter((asset) => asset[0] !== found[0])].slice(0, 8) };
    setDiscoveries(next); localStorage.setItem(saveKey, JSON.stringify(next)); onReward(reward, shortName(found[0]));
  }

  function exportSave() {
    const values = Object.fromEntries(SAVE_KEYS.map((key) => [key, localStorage.getItem(key)]).filter((entry) => entry[1] !== null));
    const payload = { kind: "east-sea-fusion-save-v28", exportedAt: new Date().toISOString(), values };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `east-sea-fusion-save-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  }

  async function importSave(file: File) {
    try {
      const payload = JSON.parse(await file.text()) as { kind?: string; values?: Record<string, string>; gold?: number; level?: number };
      if (payload.kind === "east-sea-fusion-save-v28" && payload.values) {
        if (!window.confirm("匯入將覆蓋這個瀏覽器中的融合版存檔，確定繼續？")) return;
        Object.entries(payload.values).forEach(([key, value]) => { if (SAVE_KEYS.includes(key) && typeof value === "string") localStorage.setItem(key, value); });
        window.location.reload(); return;
      }
      if (typeof payload.gold === "number" || typeof payload.level === "number") {
        if (!window.confirm("偵測到《東方商路》舊版存檔，確定把資源與進度合併到目前角色？")) return;
        onLegacyImport(payload as Record<string, unknown>); return;
      }
      throw new Error("format");
    } catch { window.alert("無法識別此存檔。請選擇融合版匯出檔或《東方商路》舊版 JSON。 "); }
    finally { if (fileRef.current) fileRef.current.value = ""; }
  }

  return <div className="archive-layout">
    <section className="panel archive-expedition">
      <div className="panel-title"><Compass /><h2>萬象遠征</h2><span>角色 {slot + 1}・發現 {format(discoveries.count)} 次</span></div>
      <div className="archive-hero"><img src={`/game-assets/${discoveries.recent[0] ? PREVIEWS[discoveries.recent[0][2]] || "blackdragon-0.png" : "blackdragon-0.png"}`} alt="本次遠征發現" /><div><small>{discoveries.recent[0]?.[2] || "未知區域"}</small><h3>{discoveries.recent[0] ? shortName(discoveries.recent[0][0]) : "六萬素材等待探索"}</h3><p>{discoveries.recent[0]?.[0] || "派遣商隊，從完整 Gersang 素材庫發現角色、怪物、物品、場景與聲音卷宗。"}</p><Button onClick={explore} disabled={!catalog}><Sparkles />{catalog ? "派遣素材遠征" : loadError ? "索引載入失敗" : "整備素材索引…"}</Button></div></div>
      <div className="archive-metrics"><div><Database /><span><strong>{catalog ? format(catalog.total) : "—"}</strong><small>全量素材</small></span></div><div><PackageOpen /><span><strong>{catalog ? Object.keys(catalog.extensions).length : "—"}</strong><small>檔案格式</small></span></div><div><BookOpen /><span><strong>{discoveries.recent.length}</strong><small>近期發現</small></span></div></div>
      <div className="save-bridge"><div><strong>融合存檔</strong><small>備份三角色、共用倉庫與萬象遠征；亦可合併舊版資源。</small></div><Button variant="outline" onClick={exportSave}><Download />匯出</Button><Button variant="outline" onClick={() => fileRef.current?.click()}><Upload />匯入</Button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSave(file); }} /></div>
    </section>

    <section className="panel archive-catalog">
      <div className="panel-title"><BookOpen /><h2>Gersang 萬象圖鑑</h2><span>{catalog ? `${format(filtered.length)} / ${format(catalog.total)}` : "讀取中"}</span></div>
      <div className="archive-toolbar"><label><Search /><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="搜尋名稱、路徑或格式" aria-label="搜尋素材" /></label><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }} aria-label="素材分類">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></div>
      {loadError ? <div className="archive-empty">素材索引暫時無法載入。</div> : !catalog ? <div className="archive-empty">正在展開素材卷宗…</div> : <><div className="archive-grid">{visible.map((asset) => <article key={asset[0]}><div><img src={`/game-assets/${PREVIEWS[asset[2]] || "element-0.png"}`} alt="分類代表預覽" /><b>{asset[1]}</b></div><span><small>{asset[2]}・{format(asset[3] / 1024)} KB</small><strong title={asset[0]}>{shortName(asset[0])}</strong><em>{asset[0]}</em></span></article>)}</div>{visible.length === 0 && <div className="archive-empty">找不到符合條件的素材。</div>}<div className="archive-pages"><Button variant="outline" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>上一頁</Button><span>第 {page + 1} / {pageCount} 頁</span><Button variant="outline" disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>下一頁</Button></div></>}
    </section>
  </div>;
}
