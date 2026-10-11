'use client';

import { useState } from 'react';
import { MapPin, Package, ScrollText, ShoppingBasket, UserRound } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { GameState } from './game-state';
import { actTangPrologue, DEFAULT_TANG_PROLOGUE, normalizeTangPrologue, TANG_GRAIN_COST, tangQuestLabel } from './tang-prologue';
import { TANG_VILLAGE_NPCS, type TangNpcId } from './tang-village-npcs';
import './tang-village-prologue.css';

type Props = { game: GameState; setGame: (action: GameState | ((previous: GameState) => GameState)) => void };

export function TangVillagePrologue({ game, setGame }: Props) {
  const progress = normalizeTangPrologue(game.tangPrologue) || DEFAULT_TANG_PROLOGUE;
  const [npcId, setNpcId] = useState<TangNpcId | null>(null);
  const npc = TANG_VILLAGE_NPCS.find(item => item.id === npcId);
  const canBuy = progress.step === 'p02-accepted' && game.gold >= TANG_GRAIN_COST;
  const act = (action: Parameters<typeof actTangPrologue>[1]) => setGame(previous => actTangPrologue(previous, action));
  const motherLine = progress.step === 'p02-completed'
    ? '辛苦了。快進來吧，飯菜正熱著。'
    : progress.step === 'p02-ready-to-return'
      ? '你回來了？那袋米糧……快讓娘看看。'
      : progress.step === 'p01-completed'
        ? '家裡的米快見底了。替娘買一袋米糧吧，早些回來，娘等你吃晚飯。'
        : '早些回來，娘等你吃晚飯。';

  return <TabsContent value="tang-prologue" className="tab-panel tang-prologue-panel">
    <section className="tang-village" aria-label="大唐篇：無名村">
      <header className="tang-village-header">
        <div><small>大唐序章</small><h1>無名村</h1><p>晨霧未散，主角家的門前有人在等你。</p></div>
        <div className="tang-location"><MapPin /> {game.hero.name}・村南</div>
      </header>
      <div className="tang-stage" data-quest={progress.step}>
        <div className="tang-sky" /><div className="tang-hills tang-hills-far" /><div className="tang-hills tang-hills-near" />
        <div className="tang-road" /><div className="tang-field tang-field-left" /><div className="tang-field tang-field-right" />
        <div className="tang-house"><span className="tang-roof" /><span className="tang-wall" /><span className="tang-door" /></div>
        {TANG_VILLAGE_NPCS.map(item => <button key={item.id} type="button"
          className={item.id === 'mother' ? 'tang-mother-pin tang-npc-pin' : 'tang-resident-pin tang-npc-pin'}
          style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => setNpcId(item.id)} aria-label={`與${item.name}交談`}>
          {item.portrait ? <img src={item.portrait} alt="母親立繪" /> : <UserRound className="tang-placeholder-sprite" aria-hidden="true" />}
          <span className="tang-npc-tag"><b>{item.number}</b> {item.name}<small>{item.place}</small></span>
        </button>)}
        <div className="tang-stage-caption">村南・主角家　／　村北・往長安官道</div>
      </div>
      <div className="tang-bottom-grid">
        <section className="tang-quest-card"><ScrollText /><div><small>目前任務</small><strong>{tangQuestLabel(progress)}</strong><p>{progress.step === 'p02-completed' ? '米糧已交付。' : progress.grainPouch ? '帶著米糧回家找母親。' : '點擊村民與他們交談。'}</p></div></section>
        <section className="tang-bag-card"><Package /><div><small>任務行囊</small><strong>{progress.grainPouch ? '米糧 × 1' : '尚無任務物品'}</strong><p>盤纏：{game.gold.toLocaleString()} 兩</p></div></section>
      </div>
      <Dialog open={!!npc} onOpenChange={open => { if (!open) setNpcId(null); }}>
        {npc && <DialogContent className="tang-dialogue-popup" overlayClassName="tang-dialogue-overlay">
          <div className="tang-dialogue-portrait">{npc.portrait ? <img src={npc.portrait} alt={npc.name} /> : <UserRound aria-hidden="true" />}</div>
          <div className="tang-dialogue-copy"><small>無名村・{npc.place}</small>
            <DialogTitle>{npc.name} <b>{npc.number}</b></DialogTitle>
            <DialogDescription>「{npc.id === 'mother' ? motherLine : npc.line}」</DialogDescription>
            {npc.id === 'mother' && <>
              {progress.step === 'not-started' && <button onClick={() => act('talk')}>應聲答話・完成 P-01</button>}
              {progress.step === 'p01-completed' && <button onClick={() => act('accept')}>娘，交給我吧・接受 P-02</button>}
              {progress.step === 'p02-ready-to-return' && <button onClick={() => act('deliver')}>把米糧交給母親・完成 P-02</button>}
              {progress.step === 'p02-accepted' && <p>去北側村口找糧販買米糧。</p>}
            </>}
            {npc.id === 'grain-seller' && <>
              <button disabled={!canBuy} onClick={() => act('buy')}><ShoppingBasket aria-hidden="true" />買米糧・{TANG_GRAIN_COST} 兩</button>
              <p role="status">{progress.step === 'p02-ready-to-return' ? '米糧已放入行囊，回家交給母親吧。' : progress.step === 'p02-accepted' && !canBuy ? '盤纏不足，還不能買米糧。' : progress.step === 'p02-accepted' ? '一袋新米，路上小心。' : '先去家門前與母親交談。'}</p>
            </>}
          </div>
        </DialogContent>}
      </Dialog>
    </section>
  </TabsContent>;
}
