import type { CSSProperties } from 'react';
import type { ItemTooltipData, TooltipField } from './item-tooltip-manager';

type Props = {
  data: ItemTooltipData;
  left: number;
  top: number;
  rarityClass: string;
};

const section = (data: ItemTooltipData, title: string) => data.sections.find(entry => entry.title === title);
const field = (fields: TooltipField[] | undefined, label: string) => fields?.find(entry => entry.label === label)?.value;
const meaningful = (value?: string) => !!value && !/^\+?0(?:\.0+)?$/.test(value.replace(/,/g, '').trim());

/** Compact, game-style equipment card shared by the backpack and character equipment views. */
export function EquipmentTooltipCard({data,left,top,rarityClass}:Props){
  const basic=section(data,'基本資訊');
  const attributes=section(data,'裝備屬性');
  const enhance=section(data,'強化與鑲嵌');
  const magic=section(data,'魔法詞條');
  const skill=section(data,'裝備技能');
  const stats=(attributes?.fields||[]).filter(entry=>['攻擊','防禦','生命','力量','敏捷','智力','體質'].includes(entry.label)&&meaningful(entry.value));
  const requirements=[['部位',data.kind],['需求等級',field(basic?.fields,'需求等級')||'Lv.1']].filter(([,value])=>value);
  const price=field(basic?.fields,'販售價格');
  return <aside className={`item-tooltip equipment-tooltip-card ${rarityClass}`} role="tooltip" style={{left,top} as CSSProperties}>
    <header className="equipment-tooltip-header"><div className="equipment-tooltip-image">{data.image?<img src={data.image} alt=""/>:<span>裝</span>}</div><div><strong>{data.name}</strong><small>{data.quality}・{data.kind}</small></div></header>
    <div className="equipment-tooltip-meta">{requirements.map(([label,value])=><span key={label}><b>{label}</b><strong>{value}</strong></span>)}</div>
    {stats.length>0&&<section className="equipment-tooltip-stats" aria-label="裝備屬性">{stats.map(entry=><span key={entry.label}><b>{entry.label}</b><strong>{entry.value}</strong></span>)}</section>}
    {data.description&&<p className="equipment-tooltip-description">{data.description}</p>}
    {magic?.fields.length&&<section className="equipment-tooltip-section"><b>魔法詞條</b>{magic.fields.map(entry=><span key={entry.label}><strong>{entry.label}</strong>{entry.value}</span>)}</section>}
    {skill?.fields.length&&<section className="equipment-tooltip-section"><b>裝備技能</b>{skill.fields.map(entry=><span key={entry.label}><strong>{entry.label}</strong>{entry.value}</span>)}</section>}
    {(enhance?.fields.length||price)&&<footer className="equipment-tooltip-footer">{enhance?.fields.map(entry=><span key={entry.label}><b>{entry.label}</b>{entry.value}</span>)}{price&&<span><b>販售</b>{price}</span>}</footer>}
  </aside>;
}
