'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function EquipmentPurchaseControl({ name, unitPrice, gold, onPurchase, lockedLabel, allowQuantity = true }: {
  name: string;
  unitPrice: number;
  gold: number;
  onPurchase: (quantity: number) => void;
  lockedLabel?: string;
  allowQuantity?: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const count = allowQuantity ? quantity : 1;
  const total = unitPrice * count;
  const insufficient = gold < total;
  return <div className="equipment-purchase-control">
    {allowQuantity && <div className="equipment-purchase-quantity">
      <span>購買數量</span>
      <button type="button" aria-label={`減少${name}購買數量`} disabled={!!lockedLabel || count <= 1} onClick={() => setQuantity(count - 1)}>−</button>
      <input type="number" min={1} max={100} step={1} value={count} disabled={!!lockedLabel} aria-label={`${name}購買數量`} onChange={event => setQuantity(Math.max(1, Math.min(100, Math.floor(Number(event.target.value) || 1))))} />
      <button type="button" aria-label={`增加${name}購買數量`} disabled={!!lockedLabel || count >= 100} onClick={() => setQuantity(count + 1)}>＋</button>
    </div>}
    <Button size="sm" disabled={!!lockedLabel || insufficient} onClick={() => onPurchase(count)} aria-label={`購買${name} ${count} 件，共 ${total.toLocaleString('zh-TW')} 兩`}>
      {lockedLabel ?? `${insufficient ? '資金不足・' : '購買・'}${count} 件・${total.toLocaleString('zh-TW')} 兩`}
    </Button>
    {allowQuantity && <small>單價 {unitPrice.toLocaleString('zh-TW')} 兩・一次最多 100 件</small>}
  </div>;
}
