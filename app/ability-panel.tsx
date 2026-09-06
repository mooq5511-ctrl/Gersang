/* eslint-disable next/no-img-element */
import { useState } from 'react';
import type { CaravanMember } from './caravan-status';

type StatKey = 'str' | 'agi' | 'vit' | 'intel';
const nodes: { key: StatKey; label: string; subtitle: string }[] = [
  { key: 'str', label: '商路・破軍', subtitle: '力量節點' },
  { key: 'agi', label: '商路・疾行', subtitle: '敏捷節點' },
  { key: 'vit', label: '商路・固守', subtitle: '體質節點' },
  { key: 'intel', label: '商路・運籌', subtitle: '智力節點' },
];

export function AbilityPanel({ hero, allocate }: { hero: CaravanMember; allocate: (stat: StatKey) => void }) {
  const [selected, setSelected] = useState<StatKey>('str');
  const active = nodes.find((node) => node.key === selected) ?? nodes[0];
  return <section className="ability-panel" aria-label="主角能力樹">
    <header className="ability-header"><div><small>Ability Archive · 角色成長</small><h2>主角能力樹</h2><p>把能力點投入節點，立即套用到現有四圍與戰力計算。</p></div><div className="ability-points"><img src="/game-assets/ability/AbilityPointSlot-0.png" alt=""/><strong>{hero.points}</strong><span>可用能力點</span></div></header>
    <div className="ability-body">
      <div className="ability-art"><img src="/game-assets/ability/MainAblityImage_2nd_1-0.png" alt="能力樹背景"/><div className="ability-gauge"><img src="/game-assets/ability/AbilityGauge-0.png" alt=""/><span>{Math.min(100, hero.level * 5)}%</span></div></div>
      <div className="ability-tree" role="tablist" aria-label="能力節點">
        {nodes.map((node, index) => <button type="button" role="tab" aria-selected={selected === node.key} className={'ability-node '+(selected === node.key ? 'selected' : '')} key={node.key} onClick={() => setSelected(node.key)}>
          {index > 0 && <img className="ability-connector" src="/game-assets/ability/AbilityNode-0.png" alt=""/>}
          <img className="ability-slot" src={index % 2 ? '/game-assets/ability/AbilitySlot2-0.png' : '/game-assets/ability/AbilitySlot1-0.png'} alt=""/>
          <span><strong>{node.label}</strong><small>{node.subtitle} · Lv.{hero[node.key]}</small></span>
        </button>)}
      </div>
    </div>
    <footer className="ability-footer"><div><img src="/game-assets/ability/IconOutline-0.png" alt=""/><span><strong>{active.label}</strong><small>{active.subtitle}：每點提升角色基礎能力。</small></span></div><button type="button" disabled={hero.points <= 0} onClick={() => allocate(active.key)}>投入 1 點</button></footer>
  </section>;
}
