/* eslint-disable next/no-img-element */
import { useState } from 'react';
import type { CaravanMember } from './caravan-status';
import { combatStats, vitalStats } from './vitals-engine';
import { heroTotalAttributes } from './hero-rules';

type StatKey = 'str' | 'agi' | 'vit' | 'intel';
const nodes: { key: StatKey; label: string; subtitle: string; asset: string }[] = [
  { key: 'str', label: '力量', subtitle: '商路・破軍', asset: '/game-assets/ability/AbilitySlot1-0.png' },
  { key: 'agi', label: '敏捷', subtitle: '商路・疾行', asset: '/game-assets/ability/AbilitySlot2-0.png' },
  { key: 'vit', label: '體力', subtitle: '商路・固守', asset: '/game-assets/ability/CommonAbilitySlot-0.png' },
  { key: 'intel', label: '智力', subtitle: '商路・運籌', asset: '/game-assets/ability/SkillSlot-0.png' },
];

export function AbilityPanel({ hero, allocate }: { hero: CaravanMember; allocate: (stat: StatKey, amount?: number) => void }) {
  const [selected, setSelected] = useState<StatKey>('str');
  const active = nodes.find((node) => node.key === selected) ?? nodes[0];
  const vital = vitalStats(hero);
  const combat = combatStats(hero);
  const total = heroTotalAttributes(hero);
  const rows = [['力量', total.str], ['敏捷', total.agi], ['體力', total.vit], ['智力', total.intel], ['攻擊力', combat.attack], ['防禦力', combat.defense], ['命中', total.agi + hero.level], ['迴避', Math.floor(total.agi * 0.6 + hero.level)], ['生命力', `${vital.hp} / ${vital.maxHp}`], ['魔法力', `${vital.mp} / ${vital.maxMp}`]] as const;
  return <section className="ability-panel ability-panel-embedded" aria-label="主角能力值">
    <div className="ability-window-body">
      <section className="ability-character" aria-label="主角與能力槽"><div className="ability-portrait"><img src={hero.image} alt={hero.name}/><span>Lv. {hero.level}</span></div><div className="ability-slots" role="tablist" aria-label="能力節點">{nodes.map((node) => <button type="button" role="tab" aria-selected={selected === node.key} className={selected === node.key ? 'selected' : ''} key={node.key} onClick={() => setSelected(node.key)}><img src={node.asset} alt=""/><span>{node.label}</span></button>)}</div></section>
      <section className="ability-attributes" aria-label="主角數值">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    </div>
    <div className="ability-description"><div className="ability-point-slot"><img src="/game-assets/ability/AbilityPointSlot-0.png" alt=""/><strong>{hero.points}</strong></div><p><strong>{active.subtitle}</strong><span>選擇「{active.label}」後，可投入能力點並立即套用至角色屬性。</span></p></div>
    <footer className="ability-actions"><small>可用能力點：{hero.points}</small><button type="button" disabled={hero.points <= 0} onClick={() => allocate(active.key)}>投入 1 點</button><button type="button" disabled={hero.points <= 0} onClick={() => allocate(active.key,100)}>投入 100 點</button></footer>
  </section>;
}
