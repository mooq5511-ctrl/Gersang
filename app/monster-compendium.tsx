"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { battleMaps } from "./reference-data";
import {
  COMPENDIUM_MAP_IDS, monsterCompendiumJson,
  type CompendiumMapId, type MonsterCompendiumEntry,
} from "./monster-compendium-data";
import "./monster-compendium.css";

const number = (value: number) => value.toLocaleString("zh-TW");

function isMonsterEntry(value: unknown): value is MonsterCompendiumEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<MonsterCompendiumEntry>;
  return typeof entry.id === "string" && typeof entry.name === "string" &&
    typeof entry.mapId === "string" && typeof entry.region === "string" &&
    typeof entry.kind === "string" && typeof entry.hp === "number" &&
    typeof entry.mp === "number" && typeof entry.atk === "number" &&
    typeof entry.exp === "number" && typeof entry.isBoss === "boolean" &&
    (entry.prerequisite === null || typeof entry.prerequisite === "string") &&
    (entry.skill === null || typeof entry.skill === "string") &&
    Array.isArray(entry.drops) && entry.drops.every((drop) => typeof drop === "string");
}

/** Accepts a JSON array so the view can also be reused with a fetched payload. */
export function MonsterCompendium({ json = monsterCompendiumJson }: { json?: string }) {
  const [open, setOpen] = useState(false);
  const [mapId, setMapId] = useState<CompendiumMapId | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { entries, error } = useMemo(() => {
    try {
      const data: unknown = JSON.parse(json);
      if (!Array.isArray(data) || !data.every(isMonsterEntry)) throw new Error("圖鑑資料格式不正確");
      return { entries: data as MonsterCompendiumEntry[], error: null };
    } catch {
      return { entries: [] as MonsterCompendiumEntry[], error: "怪物圖鑑資料無法讀取。" };
    }
  }, [json]);
  const filtered = entries.filter((entry) =>
    (mapId === "all" || entry.mapId === mapId) &&
    (!query.trim() || `${entry.name} ${entry.region} ${entry.drops.join(" ")}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
  );
  const selected = filtered.find((entry) => entry.id === selectedId) ?? filtered[0];

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger className="monster-codex-trigger"><BookOpen size={16} />怪物圖鑑</DialogTrigger>
    <DialogContent className="monster-codex-dialog" showCloseButton>
      <DialogHeader>
        <DialogTitle>怪物圖鑑</DialogTitle>
        <DialogDescription>五大區域・{entries.length} 隻怪物；數值為戰鬥基礎值。</DialogDescription>
      </DialogHeader>
      <div className="monster-codex-controls">
        <label className="monster-codex-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋怪物或掉落物" aria-label="搜尋怪物或掉落物" /></label>
        <fieldset className="monster-codex-filters"><legend className="sr-only">篩選地區</legend>
          <button type="button" aria-pressed={mapId === "all"} onClick={() => setMapId("all")}>全部</button>
          {COMPENDIUM_MAP_IDS.map((id) => <button key={id} type="button" aria-pressed={mapId === id} onClick={() => setMapId(id)}>{battleMaps.find((map) => map.id === id)?.name ?? id}</button>)}
        </fieldset>
      </div>
      <div className="monster-codex-layout">
        <nav className="monster-codex-list" aria-label="怪物清單">
          {filtered.map((entry) => <button key={entry.id} type="button" aria-pressed={selected?.id === entry.id} onClick={() => setSelectedId(entry.id)}>
            <span><strong>{entry.name}</strong><small>{entry.region}</small></span><em>{entry.kind}</em>
          </button>)}
          {!filtered.length && <p>{error ?? "找不到符合條件的怪物。"}</p>}
        </nav>
        <section className="monster-codex-detail" aria-live="polite" aria-label="怪物詳細資訊">
          {selected ? <>
            <header><small>{selected.region} · {selected.kind}</small><h3>{selected.name}</h3></header>
            <dl className="monster-codex-stats">
              <div><dt>HP</dt><dd>{number(selected.hp)}</dd></div>
              <div><dt>MP</dt><dd>{number(selected.mp)}</dd></div>
              <div><dt>ATK</dt><dd>{number(selected.atk)}</dd></div>
              <div><dt>EXP</dt><dd>{number(selected.exp)}</dd></div>
            </dl>
            <p><b>首領</b>　{selected.isBoss ? "是" : "否"}</p>
            <p><b>前置條件</b>　{selected.prerequisite ?? "無"}</p>
            {selected.skill && <p><b>技能資料</b>　{selected.skill}</p>}
            <h4>可能掉落</h4>
            {selected.drops.length ? <ul className="monster-codex-drops">{selected.drops.map((drop) => <li key={drop}>{drop}</li>)}</ul> : <p>目前沒有登錄掉落物。</p>}
          </> : <p>選擇怪物查看詳細資訊。</p>}
        </section>
      </div>
    </DialogContent>
  </Dialog>;
}
