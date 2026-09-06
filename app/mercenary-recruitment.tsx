/* eslint-disable next/no-img-element */
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { merchantMercenaries, ratingAccuracy, type MercenarySpec } from './mercenary-roster';
import { gersangMercenaryArt, gersangUnitArt } from './gersang-visuals';
export const mercenaryPortrait = (id: string, index: number) => gersangUnitArt('merchant-'+id, id, index) || gersangMercenaryArt(index);
export function MercenaryRecruitment({ gold, cost, recruit }: { gold: number; cost: number; recruit: (spec: MercenarySpec, index: number) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return <section className="merchant-recruits" aria-labelledby="merchant-recruits-title">
    <h2 id="merchant-recruits-title">中央傭兵公會・{merchantMercenaries.length} 種傭兵</h2>
    <p>點選名稱可開啟或關閉介紹；各城皆可招募，招募後至角色能力值配置隊伍。</p>
    <div className="merchant-recruit-list">{merchantMercenaries.map((spec, index) => {
      const expanded = expandedId === spec.id;
      return <article className={'merchant-recruit-row' + (expanded ? ' expanded' : '')} key={spec.id}>
        <button type="button" className="mercenary-name-button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : spec.id)}><span>{spec.name}</span><small>{spec.role}・{expanded ? '收起介紹' : '查看介紹'}</small></button>
        <Button size="sm" disabled={gold < cost} onClick={() => recruit(spec,index)} aria-label={'招募'+spec.name}>{gold < cost ? '資金不足' : '招募'}・{cost.toLocaleString()} 兩</Button>
        {expanded && <div className="merchant-recruit-detail"><img src={mercenaryPortrait(spec.id,index)} alt={spec.name} loading="lazy" /><div><p>生命 {spec.ratings[0]}／攻擊 {spec.ratings[1]}／防禦 {spec.ratings[2]}／移速 {spec.ratings[3]}／命中 {spec.ratings[4]}</p><p>初始 HP {spec.ratings[0]*20}・ATK {spec.ratings[1]*2}・DEF {spec.ratings[2]*2}・命中 {(ratingAccuracy(spec.ratings[4])*100).toFixed(1)}%</p><p>被動・{spec.passive}：{spec.passiveEffect}</p><p>主動・{spec.active}：{spec.activeEffect} 冷卻 {spec.cooldown} 回合；{spec.mp ? '消耗 '+spec.mp+' MP' : '武技，不耗 MP'}。</p></div></div>}
      </article>;
    })}</div>
  </section>;
}
