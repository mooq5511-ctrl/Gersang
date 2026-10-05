import type {DungeonState} from './dungeon-engine';
/** A display-only description: never starts, stops or heals a battle. */
export function huntStatusPresentation(state:Pick<DungeonState,'status'|'autoHunt'>){
  if(state.status==='recovering')return {enabled:false,label:'自動練功・已停止',detail:'戰敗後已停止狩獵，請療傷後重新出發。'};
  if(!state.autoHunt)return state.status==='fighting'
    ? {enabled:false,label:'自動練功・本場後停止',detail:'收起視窗不會中斷本場戰鬥；本場結束後不再尋找下一批怪物。'}
    : {enabled:false,label:'自動練功・已停止',detail:'狩獵已停止。請查看主線目標，或重新選擇怪物開始戰鬥。'};
  if(state.status==='idle')return {enabled:true,label:'自動練功・等待出發',detail:'自動練功已開啟；選擇怪物開始戰鬥後會持續循環。'};
  return {enabled:true,label:'自動練功・持續狩獵',detail:'收起視窗不會中斷狩獵；勝利後會繼續尋找怪物，戰敗後停止並返回客棧療傷。'};
}
