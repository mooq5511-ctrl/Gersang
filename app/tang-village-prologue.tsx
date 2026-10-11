'use client';

import { useState } from 'react';
import { MapPin, Package, ScrollText, ShoppingBasket, X } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import type { GameState, TangPrologueState } from './game-state';
import { DEFAULT_TANG_PROLOGUE, TANG_GRAIN_COST, tangQuestLabel } from './tang-prologue';
import './tang-village-prologue.css';

type Props = { game: GameState; setGame: (action: GameState | ((previous: GameState) => GameState)) => void };

export function TangVillagePrologue({ game, setGame }: Props) {
  const progress = game.tangPrologue || DEFAULT_TANG_PROLOGUE;
  const [dialogue, setDialogue] = useState(false);
  const canBuy = progress.step === 'p02-accepted' && game.gold >= TANG_GRAIN_COST;

  function update(next: TangPrologueState) {
    setGame(previous => ({ ...previous, tangPrologue: next }));
  }

  function speakToMother() {
    if (progress.step === 'not-started') update({ ...progress, motherMet: true, step: 'p01-completed' });
    else if (progress.step === 'p02-ready-to-return') update({ ...progress, step: 'p02-completed' });
  }

  function acceptErrand() {
    if (progress.step === 'p01-completed') update({ ...progress, step: 'p02-accepted' });
  }

  function buyGrain() {
    if (!canBuy) return;
    setGame(previous => ({
      ...previous,
      gold: previous.gold - TANG_GRAIN_COST,
      tangPrologue: { ...(previous.tangPrologue || DEFAULT_TANG_PROLOGUE), step: 'p02-ready-to-return', grainPouch: true },
    }));
  }

  const motherLine = progress.step === 'p02-completed'
    ? '辛苦了。快進來吧，飯菜正熱著。'
    : progress.step === 'p02-ready-to-return'
      ? '你回來了？那袋米糧……快讓娘看看。'
      : '早些回來，娘等你吃晚飯。';

  return <TabsContent value="tang-prologue" className="tab-panel tang-prologue-panel">
    <section className="tang-village" aria-label="大唐篇：無名村">
      <header className="tang-village-header">
        <div><small>大唐篇・第一階段・可玩切片</small><h1>無名村</h1><p>晨霧未散，主角家的門前有人在等你。</p></div>
        <div className="tang-location"><MapPin /> 主角家・村南</div>
      </header>

      <div className="tang-stage" data-quest={progress.step}>
        <div className="tang-sky" /><div className="tang-hills tang-hills-far" /><div className="tang-hills tang-hills-near" />
        <div className="tang-road" /><div className="tang-field tang-field-left" /><div className="tang-field tang-field-right" />
        <div className="tang-house"><span className="tang-roof" /><span className="tang-wall" /><span className="tang-door" /></div>
        <button className="tang-mother-pin" type="button" onClick={() => setDialogue(true)} aria-label="與母親交談">
          <span className="tang-npc-shadow" /><img src="/assets/tang-prologue/mother-v1.png" alt="母親立繪" />
          <span className="tang-npc-tag"><b>01</b> 母親<small>主角家門前</small></span>
        </button>
        <button className="tang-grain-stall" type="button" onClick={buyGrain} disabled={progress.step !== 'p02-accepted'} aria-label="村口糧販">
          <ShoppingBasket /><span>村口糧販</span><small>{progress.step === 'p02-accepted' ? `買米糧・${TANG_GRAIN_COST} 兩` : '委託後開放'}</small>
        </button>
        <div className="tang-stage-caption">斜俯視・無名村南口　<span>NPC 固定站位：01 / 主角家門前</span></div>
      </div>

      <div className="tang-bottom-grid">
        <section className="tang-quest-card"><ScrollText /><div><small>目前任務</small><strong>{tangQuestLabel(progress)}</strong><p>{progress.grainPouch ? '背包：米糧 × 1（序章任務物品）' : '點擊場景中的母親開始。'}</p></div></section>
        <section className="tang-bag-card"><Package /><div><small>序章背包</small><strong>{progress.grainPouch ? '米糧 × 1' : '尚無任務物品'}</strong><p>此物品獨立存入大唐序章進度，不影響既有裝備背包。</p></div></section>
      </div>

      {dialogue && <div className="tang-dialogue-backdrop" role="presentation" onMouseDown={() => setDialogue(false)}>
        <section className="tang-dialogue" role="dialog" aria-modal="true" aria-label="母親對話" onMouseDown={event => event.stopPropagation()}>
          <button className="tang-dialogue-close" onClick={() => setDialogue(false)} aria-label="關閉對話"><X /></button>
          <img src="/assets/tang-prologue/mother-v1.png" alt="母親" />
          <div className="tang-dialogue-copy"><small>無名村・主角家門前</small><h2>母親 <b>01</b></h2><p>「{motherLine}」</p>
            {progress.step === 'not-started' && <button onClick={speakToMother}>應聲答話・完成 P-01</button>}
            {progress.step === 'p01-completed' && <button onClick={acceptErrand}>娘，交給我吧・接受 P-02</button>}
            {progress.step === 'p02-ready-to-return' && <button onClick={speakToMother}>把米糧交給母親・完成 P-02</button>}
            {progress.step === 'p02-accepted' && <em>村口糧販已標出，買好米糧再回來。</em>}
            {progress.step === 'p02-completed' && <em>序章切片完成。下一步將擴展七名村莊 NPC、官道與長安城。</em>}
          </div>
        </section>
      </div>}
    </section>
  </TabsContent>;
}

