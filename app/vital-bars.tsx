import { Progress } from "@/components/ui/progress";
import { mercenarySpec } from './mercenary-roster';
import { combatStats, vitalStats, type VitalUnit } from "./vitals-engine";

export function VitalBars({ unit }: { unit: VitalUnit }) {
  const stats = vitalStats(unit);
  const combat = combatStats(unit);
  const spec = mercenarySpec(unit.templateId);
  return <div className="unit-vitals">
    <div className="combat-stat-pair"><span>ATK 攻擊力 <b>{combat.attack}</b></span><span>DEF 防禦力 <b>{combat.defense}</b></span></div>
    {spec && <div className="merchant-skill-copy"><p>移速 {combat.speed}・命中 {(combat.accuracy*100).toFixed(1)}%・{spec.ranged ? '後排' : '前排'}</p><p>被動・{spec.passive}：{spec.passiveEffect}</p><p>主動・{spec.active}：{spec.activeEffect} 冷卻 {spec.cooldown} 回合／{spec.mp} MP。</p></div>}
    <div className="unit-hp"><span>HP 生命 <b>{stats.hp} / {stats.maxHp}</b></span><Progress aria-label="生命值" value={stats.hp / stats.maxHp * 100} /></div>
    <div className="unit-mp"><span>MP 魔力 <b>{stats.mp} / {stats.maxMp}</b></span><Progress aria-label="魔力值" value={stats.mp / stats.maxMp * 100} /></div>
    {stats.hp === 0 && <small>無法參戰・請至客棧休息或使用補血藥</small>}
  </div>;
}
