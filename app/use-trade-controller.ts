"use client";
import { useCallback,useEffect } from "react";
import type { GameStateSetter } from './game-controller-types';
import { appendGameLog as addLog } from "./game-runtime-actions";
import { dispatchTradeAction,upgradeCaravanAction,upgradeTradePortAction } from "./game-trade-actions";
import { TRADE_ROUTES } from "./trade-engine";

type useTradeControllerContext = {
activeSlot: number | null;
ready: boolean;
setGame: GameStateSetter;
};

export function useTradeController({ activeSlot, ready, setGame }: useTradeControllerContext) {
const sendCaravan = useCallback((routeId: string, escortIds?: string[]) => {
    const now = Date.now();
    setGame((previous) => {
      const relic = previous.relicDungeon;
      const reserved = relic && (relic.status === "dispatching" || relic.status === "ready" || relic.status === "boss") ? relic.dispatchPartyUids || [] : [];
      const available = previous.restingMercs.filter(unit => !reserved.includes(unit.uid));
      return dispatchTradeAction(previous, routeId, now, addLog, escortIds ?? available.slice(0, 11).map((unit) => unit.uid));
    });
  }, [setGame]);

function upgradeCaravan() {
    setGame((previous) => upgradeCaravanAction(previous, addLog));
  }

function upgradeTradePort() {
    setGame((previous) => upgradeTradePortAction(previous, addLog));
  }

useEffect(() => {
    if (!ready || activeSlot === null) return;
    type ModelContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: object; execute: (input: unknown) => unknown }, options: { signal: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "dispatch_trade_route", title: "派遣商隊", description: "送出商隊派遣請求。系統會依資金與解鎖條件執行，結果顯示於商團記事。",
      inputSchema: { type: "object", properties: { routeId: { type: "string", enum: TRADE_ROUTES.map((route) => route.id) } }, required: ["routeId"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const routeId = input && typeof input === "object" && "routeId" in input ? input.routeId : null;
        if (typeof routeId !== "string" || !TRADE_ROUTES.some((route) => route.id === routeId)) throw new Error("商路代號無效。");
        sendCaravan(routeId);
        return { status: "requested", routeId, resultLocation: "商團記事" };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [ready, activeSlot, sendCaravan]);
return { sendCaravan, upgradeCaravan, upgradeTradePort };
}
