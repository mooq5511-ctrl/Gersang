/* eslint-disable next/no-img-element */
import { Button } from '@/components/ui/button';
import type { MercenaryDef } from './game-data';

export function GeneralRecruitment({ generals, gold, recruit }: { generals: MercenaryDef[]; gold: number; recruit: (general: MercenaryDef) => void }) {
  if (!generals.length) return <p className="section-copy">本城暫無可招募將帥；可前往其他城市尋找名將。</p>;
  return <section className="merchant-recruits general-recruits" aria-labelledby="general-recruits-title">
    <h2 id="general-recruits-title">本城將帥府・{generals.length} 位可招募將帥</h2>
    <p>將帥加入後與一般傭兵共用編隊、裝備、成長、轉職與即時戰鬥；每位將帥僅能招募一次。</p>
    <div className="merchant-recruit-list">{generals.map((general) => <article className="merchant-recruit-row expanded" key={general.id}>
      <div className="mercenary-name-button"><span>{general.name}</span><small>{general.job}・將帥・{general.skill}</small></div>
      <Button size="sm" disabled={gold < general.cost} onClick={() => recruit(general)} aria-label={`招募將帥${general.name}`}>{gold < general.cost ? '資金不足' : '招募'}・{general.cost.toLocaleString()} 兩</Button>
      <div className="merchant-recruit-detail"><img src={general.idle} alt={`${general.name}立繪`} loading="lazy" /><div><p>力量 {general.str}／敏捷 {general.agi}／智力 {general.intel}／體質 {general.vit}</p><p>自動技能・{general.skill}：累積 MP 後自動施放，使用現行即時戰鬥傷害與防禦公式。</p></div></div>
    </article>)}</div>
  </section>;
}
