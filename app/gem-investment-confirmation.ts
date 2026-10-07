import type {gemInvestmentPreview} from './gem-investment-preview';

/** A synchronous user decision; cancellation must never reach the transaction. */
export function confirmGemInvestment(
  preview: ReturnType<typeof gemInvestmentPreview>,
  quote: {amount: number; cost: number},
  gemName: string,
  confirm: (message: string) => boolean,
): boolean {
  if (!preview.unchanged) return true;
  return confirm(`目前配裝鑲嵌後，攻擊、防禦、HP、MP、智力、速度與命中均沒有增加。\n仍要鑲嵌 ${quote.amount} 顆${gemName}，支付 ${quote.cost.toLocaleString('zh-TW')} 兩嗎？\n取消不會加工或扣款。`);
}
