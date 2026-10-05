"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DUNGEONS, type DungeonState } from "./dungeon-engine";
import {huntStatusPresentation} from './hunt-status-presentation';

/** Display state only: hiding or unmounting the arena never sends a battle action. */
export function WorldBattleWindow({ state, request, enabled, children }: {
  state: DungeonState; request: number; enabled: boolean; children: ReactNode;
}) {
  const [display, setDisplay] = useState({
    open: false, defeat: null as string | null, status: state.status, request, enabled,
  });
  const { open, defeat } = display;
  const setOpen = (value: boolean) => setDisplay(previous => ({ ...previous, open: value }));
  const setDefeat = (value: string | null) => setDisplay(previous => ({ ...previous, defeat: value }));
  const hunting = state.status === "fighting" || state.status === "respawning";
  const monster = DUNGEONS[state.key].name;
  const huntStatus=huntStatusPresentation(state);

  // Reconcile changed battle props once; respawns never reopen a minimized window.
  if (display.status !== state.status || display.request !== request || display.enabled !== enabled) {
    const last = display;
    const next = { ...display, status: state.status, request, enabled };
    if (!enabled) {
      next.open = false;
      next.defeat = null;
    } else if (state.status === "recovering" && last.status !== "recovering") {
      next.open = false;
      next.defeat = monster;
    } else if (state.status !== "recovering" && (
      request !== last.request ||
      hunting && (!last.enabled || last.status === "idle")
    )) {
      next.defeat = null;
      next.open = true;
    }
    setDisplay(next);
  }

  if (!enabled) return null;
  return <>
    {!open && hunting && typeof document !== "undefined" && createPortal(<button type="button" className="world-battle-reopen" onClick={() => setOpen(true)} aria-label="重新開啟戰鬥視窗">
      <span className="world-battle-live-dot" aria-hidden="true" />
      <span><strong>戰鬥中・{monster}</strong><small>{state.status === "respawning" ? "等待下一批怪物" : "商隊持續狩獵中"}・點此查看</small></span>
    </button>, document.body)}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="world-battle-window" overlayClassName="world-battle-overlay" showCloseButton={false}>
        <header className="world-battle-window-header">
          <div><DialogTitle>商隊戰鬥・{monster}</DialogTitle><DialogDescription>{huntStatus.detail}</DialogDescription></div>
          <Button variant="outline" onClick={() => setOpen(false)} aria-label="收起戰鬥視窗">收起戰鬥</Button>
        </header>
        <div className="world-battle-window-body">{children}</div>
      </DialogContent>
    </Dialog>
    <Dialog open={defeat !== null} onOpenChange={value => { if (!value) setDefeat(null); }}>
      <DialogContent className="world-battle-defeat" overlayClassName="world-battle-overlay" showCloseButton={false}>
        <DialogTitle>戰敗・商隊已離開戰鬥</DialogTitle>
        <DialogDescription>挑戰{defeat}失敗，已停止自動狩獵並返回客棧療傷。恢復後，請重新選擇怪物再出發。</DialogDescription>
        <Button onClick={() => setDefeat(null)}>返回查看商隊</Button>
      </DialogContent>
    </Dialog>
  </>;
}
