import { Progress } from "@/components/ui/progress";
import { vitalStats, type VitalUnit } from "./vitals-engine";

export function VitalBars({ unit }: { unit: VitalUnit }) {
  const stats = vitalStats(unit);
  return <div className="unit-vitals">
    <div className="unit-hp"><span>HP 生命 <b>{stats.hp} / {stats.maxHp}</b></span><Progress aria-label="生命值" value={stats.hp / stats.maxHp * 100} /></div>
    <div className="unit-mp"><span>MP 魔力 <b>{stats.mp} / {stats.maxMp}</b></span><Progress aria-label="魔力值" value={stats.mp / stats.maxMp * 100} /></div>
    {stats.hp === 0 && <small>無法參戰・請至客棧休息或使用補血藥</small>}
  </div>;
}
