/* eslint-disable next/no-img-element */
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { isMercenaryAvailable } from './mercenary-availability';
import { merchantMercenaries, ratingAccuracy, type MercenarySpec } from './mercenary-roster';
import { gersangMercenaryArt, gersangUnitArt } from './gersang-visuals';
import { ACTIVE_MERCENARY_LIMIT } from './guild-migration';
import type { Unit } from './game-state';
export const mercenaryPortrait = (id: string, index: number) => gersangUnitArt('merchant-'+id, id, index) || gersangMercenaryArt(index);
export function MercenaryRecruitment({ gold, cost, creditLevel, mercs, recruit, recommendedIds = [] }: { gold: number; cost: number; creditLevel: number; mercs: readonly Unit[]; recruit: (spec: MercenarySpec, index: number) => void; recommendedIds?: readonly string[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<{ id: string; name: string; count: number; cost: number } | null>(null);
  const joined = attempt && mercs.filter(unit => unit.templateId === 'merchant-' + attempt.id).length > attempt.count;
  const blockedReason = creditLevel < 2 ? '商團 Lv.2 開放' : mercs.length >= ACTIVE_MERCENARY_LIMIT ? '名冊已滿' : gold < cost ? '資金不足' : null;
  const availableMercenaries = merchantMercenaries.map((spec, index) => ({spec,index})).filter(({spec}) => isMercenaryAvailable(spec.id));
  return <section className="merchant-recruits" aria-labelledby="merchant-recruits-title">
    <h2 id="merchant-recruits-title">中央傭兵公會・{availableMercenaries.length} 種傭兵</h2>
    <p>點選名稱可開啟或關閉介紹；各城皆可招募，招募後至角色能力值配置隊伍。</p>
    <p className="recruitment-roster-count">傭兵名冊 {mercs.length}／{ACTIVE_MERCENARY_LIMIT} 位{blockedReason && `・${blockedReason === '名冊已滿' ? '請先將成員安排至休息處' : blockedReason === '資金不足' ? `還差 ${(cost - gold).toLocaleString()} 兩` : '先完成新手任務提升商團等級'}`}</p>
    <output aria-live="polite" aria-atomic="true">{joined && <div key={mercs.length} className="recruitment-success"><MercenaryPortrait unit={{templateId:'merchant-'+attempt.id,image:mercenaryPortrait(attempt.id, merchantMercenaries.findIndex(spec => spec.id === attempt.id))}} alt={attempt.name} /><div><strong>✓ 招募成功・{attempt.name}</strong><p>已加入護商隊並安排出戰！可至「角色能力值」查看與配置。</p><small>招募費用 {attempt.cost.toLocaleString()} 兩・目前傭兵 {mercs.length} 位</small></div></div>}</output>
    <div className="merchant-recruit-list">{availableMercenaries.map(({spec,index}) => {
      const expanded = expandedId === spec.id;
      const recruitable = spec.recruitable !== false;
      const recommended = recommendedIds.includes(spec.id);
      return <article className={'merchant-recruit-row' + (expanded ? ' expanded' : '') + (recommended ? ' recommended' : '')} key={spec.id}>
        <button type="button" className="mercenary-name-button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : spec.id)}><span>{spec.name}{recommended && <em>公會推薦</em>}</span><small>{spec.role}・{recruitable ? (expanded ? '收起介紹' : '查看介紹') : '暫未開放招募'}</small></button>
        <Button size="sm" disabled={!recruitable || !!blockedReason} onClick={() => { setAttempt({id: spec.id, name: spec.name, count: mercs.filter(unit => unit.templateId === 'merchant-' + spec.id).length, cost}); recruit(spec,index); }} aria-label={recruitable ? '招募'+spec.name : spec.name+'暫未開放招募'}>{!recruitable ? '暫未開放' : blockedReason ?? '招募'}・{cost.toLocaleString()} 兩</Button>
        {joined && attempt.id === spec.id && <p className="recruitment-row-success">✓ {spec.name}已加入護商隊</p>}
        {expanded && <div className="merchant-recruit-detail"><MercenaryPortrait unit={{templateId:'merchant-'+spec.id,image:mercenaryPortrait(spec.id,index)}} alt={spec.name} /><div><p>生命 {spec.ratings[0]}／攻擊 {spec.ratings[1]}／防禦 {spec.ratings[2]}／移速 {spec.ratings[3]}／命中 {spec.ratings[4]}</p><p>初始 HP {spec.baseHp??spec.ratings[0]*20}・MP {spec.baseMp??40}・ATK {spec.ratings[1]*2}・DEF {spec.ratings[2]*2}・命中 {(ratingAccuracy(spec.ratings[4])*100).toFixed(1)}%</p><p>被動・{spec.passive}：{spec.passiveEffect}</p><p>主動・{spec.active}：{spec.activeEffect} 冷卻 {spec.cooldown} 回合；{spec.mp ? '消耗 '+spec.mp+' MP' : '武技，不耗 MP'}。</p></div></div>}
      </article>;
    })}</div>
  </section>;
}
import { MercenaryPortrait } from './mercenary-portrait';
