/** 保存獨立結算時間，不因 React 重繪、存檔或重新整理而重複發錢。 */
export function settleCaravanIdle(stamp:number, now:number) {
  if(!Number.isFinite(stamp)||stamp<=0) return {stamp:now,gold:0,credit:0};
  const elapsed=Math.max(0,Math.floor((now-stamp)/1000));
  const seconds=Math.min(28800,elapsed);
  return {stamp:elapsed>28800?now:stamp+seconds*1000,gold:seconds*5,credit:seconds*2};
}
