/* eslint-disable next/no-img-element */
import { Button } from '@/components/ui/button';
import { merchantMercenaries, ratingAccuracy, type MercenarySpec } from './mercenary-roster';
import { gersangMercenaryArt, gersangUnitArt } from './gersang-visuals';
export const mercenaryPortrait = (id: string, index: number) => gersangUnitArt('merchant-'+id, id, index) || gersangMercenaryArt(index);
export function MercenaryRecruitment({ gold, cost, recruit }: { gold: number; cost: number; recruit: (spec: MercenarySpec, index: number) => void }) {
  return <section className="merchant-recruits" aria-labelledby="merchant-recruits-title">
    <h2 id="merchant-recruits-title">中央傭兵公會・{merchantMercenaries.length} 種傭兵</h2>
    <p>各城皆可招募公會傭兵，招募後請至隊伍頁安排出戰。數值評級為 1–50，不是實際生命或命中百分比。</p>
    <p>初始 HP＝生命評級×20，攻防＝評級×2，MP＝40；命中率＝70%＋評級×0.56%。移速影響先手與接敵，不增加攻擊次數。前後排依職業自動安排；法術耗 MP，武技不耗 MP。相同增減益不疊加；首領免疫暈眩與定身。</p>
    <div className="base-merc-grid">{merchantMercenaries.map((spec, index) => <article className="base-merc-card merchant-recruit-card" key={spec.id}>
      <img src={mercenaryPortrait(spec.id,index)} alt="" loading="lazy" /><div className="base-merc-info"><small>{spec.role}</small><h3>{spec.name}</h3>
      <p>生命 {spec.ratings[0]}／攻擊 {spec.ratings[1]}／防禦 {spec.ratings[2]}／移速 {spec.ratings[3]}／命中 {spec.ratings[4]}</p>
      <p>初始 HP {spec.ratings[0]*20}・ATK {spec.ratings[1]*2}・DEF {spec.ratings[2]*2}・命中 {(ratingAccuracy(spec.ratings[4])*100).toFixed(1)}%</p></div>
      <div className="merchant-skill-copy"><p>被動・{spec.passive}：{spec.passiveEffect}</p><p>主動・{spec.active}：{spec.activeEffect} 冷卻 {spec.cooldown} 回合；{spec.mp ? '消耗 '+spec.mp+' MP' : '武技，不耗 MP'}。</p></div>
      <Button size="sm" disabled={gold < cost} onClick={() => recruit(spec,index)} aria-label={'招募'+spec.name}>{gold < cost ? '資金不足・' : '招募・'}{cost.toLocaleString()} 兩</Button>
    </article>)}</div>
  </section>;
}
