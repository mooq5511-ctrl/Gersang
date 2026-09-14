/** 保存獨立結算時間，不因 React 重繪、存檔或重新整理而重複發錢。 */
export function settleCaravanIdle(stamp:number, now:number, stage = 1, bonus = 0) {
  if(!Number.isFinite(stamp)||stamp<=0) return {stamp:now,gold:0,credit:0};
  const elapsed=Math.max(0,Math.floor((now-stamp)/1000));
  const seconds=Math.min(28800,elapsed);
  // Progress improves idle yield, but cannot outgrow active trading without bound.
  const clearedStage = Number.isFinite(stage) ? Math.max(1, Math.floor(stage)) : 1;
  const goldPerSecond = 10 + Math.min(20, Math.floor((clearedStage - 1) / 5));
  const creditPerSecond = 5 + Math.min(5, Math.floor((clearedStage - 1) / 20));
  // Use the absolute second as a fixed-point carry so small bonuses still pay out
  // across many one-second ticks without storing fractional currency in saves.
  const tick = Math.floor(stamp / 1000);
  const yieldFor = (rate:number) => Math.floor((tick + seconds) * rate * (1 + bonus)) - Math.floor(tick * rate * (1 + bonus));
  return {stamp:elapsed>28800?now:stamp+seconds*1000,gold:yieldFor(goldPerSecond),credit:yieldFor(creditPerSecond)};
}
