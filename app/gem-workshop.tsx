"use client";
import {Button} from '@/components/ui/button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Gem} from 'lucide-react';
import type {EquipmentSlot} from './equipment-slots';
import {formatGameNumber as format} from './game-display';
import {slotLabels,slots} from './game-ui-config';
import {officialGems} from '../data/items/official-gems';
import {GEM_SOCKET_LIMIT,gemSocketResult} from './gem-socket-quote';
import {gemInvestmentPreview} from './gem-investment-preview';
import type {GameViewModel} from './use-game-controller';
import './gem-workshop.css';

type Props=Pick<GameViewModel,'game'|'selected'|'gemSlot'|'gemAmount'|'setGemSlot'|'setGemAmount'|'socketGem'>;
export function GemWorkshop({game,selected,gemSlot,gemAmount,setGemSlot,setGemAmount,socketGem}:Props){
  const item=selected.equip[gemSlot];
  return <section className="panel gem-workshop">
    <div className="panel-title"><Gem /><h2>寶石鑲嵌工房</h2><span>目前對象・{selected.name}</span></div>
    <Select value={gemSlot} onValueChange={value=>{if(value)setGemSlot(value as EquipmentSlot);}}>
      <SelectTrigger aria-label="選擇鑲嵌欄位"><SelectValue>{slotLabels[gemSlot]}</SelectValue></SelectTrigger>
      <SelectContent>{slots.map(slot=><SelectItem key={slot} value={slot}>{slotLabels[slot]}</SelectItem>)}</SelectContent>
    </Select>
    <p>{item?`${item.name}・已鑲嵌 ${item.socketGem?.count??0}/${GEM_SOCKET_LIMIT} 顆`:'此部位尚未穿戴裝備。'}</p>
    <label className="gem-amount">鑲嵌數量（1～{GEM_SOCKET_LIMIT}）<input aria-label="寶石鑲嵌數量" type="number" min="1" max={GEM_SOCKET_LIMIT} value={gemAmount} onChange={event=>setGemAmount(Math.min(GEM_SOCKET_LIMIT,Math.max(1,Math.floor(Number(event.target.value)||1))))}/></label>
    <p>下方為整筆加工費，超過剩餘容量時只收實際顆數。屬性是原始加值，戰鬥能力仍受裝備加成上限限制。</p>
    <div className="gem-grid">{officialGems.map(gem=><article key={gem.id}>
      <strong>{gem.name}</strong><small>{gem.label}</small>
      <div>{gem.values.map((value,grade)=>{
        const quote=gemSocketResult(item,gem,grade,gemAmount);
        const preview=quote.ok?gemInvestmentPreview(selected,gemSlot,quote.item):null;
        const affordable=quote.ok&&Number.isFinite(game.gold)&&game.gold>=quote.cost;
        const reason=quote.ok?(affordable?'': '銀兩不足'):quote.error;
        return <section key={grade}><Button size="sm" variant="outline" disabled={!affordable} title={reason||`${gem.label}原始加值 +${quote.ok?quote.value:0}`} aria-label={`${gem.name}品級${grade+1}，${quote.ok?`${quote.amount}顆，總價${quote.cost}兩`:reason}`} onClick={()=>socketGem(gem.id,grade,gemAmount)}>
          +{value}/顆・{quote.ok?`${quote.amount}顆 ${format(quote.cost)}兩`:reason}
        </Button>{preview&&<small>{preview.unchanged?'目前配裝無戰鬥能力增益（仍會扣款）':`實際：攻 ${preview.delta.attack>=0?'+':''}${preview.delta.attack}・防 ${preview.delta.defense>=0?'+':''}${preview.delta.defense}・HP ${preview.delta.maxHp>=0?'+':''}${preview.delta.maxHp}・MP ${preview.delta.maxMp>=0?'+':''}${preview.delta.maxMp}`}</small>}</section>;
      })}</div>
    </article>)}</div>
  </section>;
}
