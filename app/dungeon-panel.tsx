import {DUNGEONS,type DungeonState,type DungeonKey} from './dungeon-engine';
import {Progress} from '@/components/ui/progress';
export function DungeonPanel({state,mp,act}:{state:DungeonState;mp:number;act:(action:'start'|'normal'|'skill'|'retreat',key?:DungeonKey)=>void}){
 const monster=DUNGEONS[state.key],active=state.status==='fighting',cooldown=Math.max(0,Math.ceil((state.skillAt-state.stamp)/1000));
 return <section className="dungeon-panel" aria-label="動態戰鬥">
 <header><small>幽冥征途 · 主角副本</small><h2>戰鬥實況</h2><span>{{idle:'整裝待發',fighting:'交鋒中',respawning:'等待下一隻',recovering:'漢陽療傷中'}[state.status]}</span></header>
 <div className="dungeon-choices">{(Object.keys(DUNGEONS) as DungeonKey[]).map(key=><button key={key} disabled={state.status!=='idle'} onClick={()=>act('start',key)}>挑戰 {DUNGEONS[key].name}<small>Lv.{DUNGEONS[key].level} · 掉寶 {DUNGEONS[key].drop*100}%</small></button>)}</div>
 <div className="dungeon-enemy"><span className="dungeon-seal" aria-hidden="true">{{wolf:'狼',snake:'蛇',king:'閻'}[state.key]}</span><h3>{monster.name} <small>Lv.{monster.level}{state.key==='king'?' · BOSS':''}</small></h3><p>攻擊 {monster.atk} · 敏捷 {monster.dex}</p>
 <label>HP {state.enemyHp} / {monster.hp}<Progress className="dungeon-hp" value={state.enemyHp/monster.hp*100} aria-label="怪物生命值"/></label>
 <label>MP {monster.mp} / {monster.mp}<Progress className="dungeon-mp" value={monster.mp?100:0} aria-label="怪物魔法值"/></label></div>
 <p className="dungeon-flash" key={state.logs[0]} role="status">{state.logs[0]||'選擇對手，開始自動戰鬥。'}</p>
 <div className="dungeon-actions"><button disabled={!active||state.normalAt>state.stamp} onClick={()=>act('normal')}>普通攻擊<small>無消耗 · 共用自動攻擊冷卻</small></button><button disabled={!active||mp<40||cooldown>0} onClick={()=>act('skill')}>蛇龍出水<small>{mp<40?'MP 不足':cooldown?'冷卻 '+cooldown+' 秒':'40 MP · 冷卻 3 秒'}</small></button><button disabled={!active&&state.status!=='respawning'} onClick={()=>act('retreat')}>撤退療傷</button></div>
 <p className="dungeon-help">每秒交鋒，敏捷高者先攻。神仙棒使蛇龍出水傷害加倍。副本期間航程暫停；勝利自動刷怪，療傷停止收益。怪物目前僅普通攻擊，MP 為預留數值。</p>
 <details open><summary>戰鬥日誌 · 最近 40 則</summary><ol className="dungeon-log">{state.logs.map((line,i)=><li key={i}>{line}</li>)}</ol></details>
 </section>;
}
