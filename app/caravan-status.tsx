/* eslint-disable next/no-img-element */
import { combatStats, vitalStats, type VitalUnit } from './vitals-engine';
import { HeroStatusPanel } from './hero-status-panel';
import type {CSSProperties,ReactNode,PointerEvent as ReactPointerEvent} from 'react';
import {useEffect,useState} from 'react';

import {EQUIPMENT_SLOTS,EQUIPMENT_LABELS,type EquipmentSlot} from './equipment-slots';
import {InventoryPanel} from './inventory-panel';
import {type BattlePosition} from './formation-position';
import { AbilityPanel } from './ability-panel';
import { LEVEL_CAP, progressForLevel } from './level-progression';
import { MERCENARY_PROMOTION_TREES, type JobTier, type PromotionItemId } from './mercenary-promotions';
import { GuildTerritoryPanel } from './guild-territory-panel';
import { enhancementPresentation, rarityPresentation } from './classic-presentation';
import type { FusionSourceRarity } from './equipment-fusion';
import { equipmentDescription } from './divine-equipment';
import { equipmentSellPrice } from './equipment-market';
import { ItemTooltipManager, type ItemTooltipData } from './item-tooltip-manager';
import { EquipmentTooltipCard } from './equipment-tooltip-card';
import { TERRITORY_ENTRY_ID, TERRITORY_UNLOCK_LEVEL, type BuildingId, type GuildTerritory } from './guild-territory';
import type { Equipment } from './game-state';
import { effectiveEquipmentStats } from './equipment-stats.ts';
import './guild-territory.css';
import './guild-territory-layout.css';

// 此面板只呈現真實遊戲資料；金錢與成長由遊戲唯一計時器結算。
export type CaravanMember = VitalUnit & { uid:string; name:string; role:string; job?:string; skill?:string; image:string; xp:number; points:number; str:number; agi:number; position:BattlePosition };
type CharacterTab = 'equipment'|'advancement'|'skills';
type Props = {
  initialWindow?: 'inventory' | 'territory';
  battle:ReactNode;navigation:ReactNode;busy:boolean;
  territory:GuildTerritory;upgradeBuilding:(id:BuildingId)=>void;enhanceEquipment:(itemUid:string)=>void;fuseAllEquipment:(rarity:FusionSourceRarity)=>void;
  enhanceFeedback:{uid:string;name:string;success:boolean;level:number}|null; equipmentPulseUid:string|null;
  hero:CaravanMember; mercs:CaravanMember[]; restingMercs:CaravanMember[]; active:string[]; toggleActive:(uid:string)=>void; storeMercenary:(uid:string)=>void; withdrawRestingMercenary:(uid:string)=>void; gold:number; credit:number; creditXp:number; creditLevel:number; newbieCoins:number; redeemWandererSet:(set:'azure'|'chiyou'|'amaterasu')=>void; redeemWandererChickenSoup:()=>void; redeemWandererGinsengChickenSoup:()=>void; redeemWandererBlackBoneChickenSoup:()=>void; weight:number; maxWeight:number;
  cost:number; power:(unit:CaravanMember)=>number; xpNeed:(level:number)=>number;
  select:(uid:string)=>void; cyclePosition:(uid:string)=>void; hire:()=>void; allocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void;
  promote:(uid:string,targetTier?:JobTier)=>void; promotionItems:Readonly<Record<PromotionItemId,number>>;

  inventory:Equipment[];materials:Record<string,number>;materialPrices:Record<string,number>;medicines:Record<string,number>;craftRestaurantFood:(recipeId:string)=>void;
  equipSelected:(uid:string,targetUid:string)=>void;sellInventory:(uid:string)=>void;sellAllInventory:()=>void;sellMaterial:(name:string)=>void;sellAllMaterials:()=>void;openAncientCoinBox:(amount:number)=>void;
  unequipHero:(slot:EquipmentSlot)=>void;unequipEquipment:(slot:EquipmentSlot,targetUid:string)=>void;bagMessage:string;
};
export function CaravanStatus(p:Props) {
  // 戰力使用既有引擎，包含穿戴裝備。
  const [selectedRosterUid,setSelectedRosterUid]=useState(p.hero.uid);
  const [characterTab,setCharacterTab]=useState<CharacterTab>('equipment');
  const [activeWindow,setActiveWindow]=useState<'stats'|'inventory'|'wanderer'|'rest'|'formation'|'territory'|null>(p.initialWindow || null);
  const [windowPositions,setWindowPositions]=useState<Partial<Record<'stats'|'inventory',{left:number;top:number}>>>({});
  const [draggingWindow,setDraggingWindow]=useState<{kind:'stats'|'inventory';offsetX:number;offsetY:number}|null>(null);
  const rosterUnits=[p.hero,...p.mercs].slice(0,12);
  const selectedRoster=rosterUnits.find(unit=>unit.uid===selectedRosterUid)||p.hero;
  const selectedRosterIndex=Math.max(0,rosterUnits.findIndex(unit=>unit.uid===selectedRoster.uid));
  const characterWindowStyle={"--party-selected-top":`${88+24+selectedRosterIndex*45}px`} as CSSProperties;
  const deployed=[p.hero,...p.mercs.filter(unit=>p.active.includes(unit.uid))].slice(0,12);
  const formationRows=(['前排','中排','後排'] as const).map(position=>({position,units:deployed.filter(unit=>unit.position===position)}));
  const chooseRoster=(unit:CaravanMember)=>{setSelectedRosterUid(unit.uid);setActiveWindow(null);p.select(unit.uid);};
  const startWindowDrag=(kind:'stats'|'inventory',event:ReactPointerEvent<HTMLElement>)=>{
    if((event.target as HTMLElement).closest('button,input,select,textarea,a'))return;
    const panel=event.currentTarget.parentElement;
    if(!panel)return;
    const rect=panel.getBoundingClientRect();
    setWindowPositions(previous=>previous[kind]?previous:{...previous,[kind]:{left:rect.left,top:rect.top}});
    setDraggingWindow({kind,offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top});
    event.preventDefault();
  };
  useEffect(()=>{
    if(!draggingWindow)return;
    const move=(event:PointerEvent)=>{
      const panel=document.querySelector(`[data-draggable-window="${draggingWindow.kind}"]`) as HTMLElement|null;
      if(!panel)return;
      const width=panel.offsetWidth,height=panel.offsetHeight;
      const left=Math.max(8,Math.min(event.clientX-draggingWindow.offsetX,window.innerWidth-width-8));
      const top=Math.max(8,Math.min(event.clientY-draggingWindow.offsetY,window.innerHeight-height-8));
      setWindowPositions(previous=>({...previous,[draggingWindow.kind]:{left,top}}));
    };
    const stop=()=>setDraggingWindow(null);
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',stop,{once:true});
    return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);};
  },[draggingWindow]);
  const windowStyle=(kind:'stats'|'inventory')=>windowPositions[kind]?{left:windowPositions[kind]!.left,top:windowPositions[kind]!.top,right:'auto',zIndex:draggingWindow?.kind===kind?80:60} as CSSProperties:undefined;
  return <section className="caravan-status" aria-label="主角與商隊狀態">
    <aside className="party-window-roster" aria-label="主角與傭兵"><strong>隊伍 {Math.min(12,1+p.mercs.length)}／12</strong>{rosterUnits.map(unit=><button type="button" className={selectedRoster.uid===unit.uid?'selected':''} key={unit.uid} onClick={()=>chooseRoster(unit)} aria-label={'選擇'+unit.name}><img src={unit.image} alt=""/><span>{unit.uid==='hero'?'主':'傭'}</span></button>)}</aside>
    <nav className="party-context-menu" style={characterWindowStyle} aria-label="角色功能"><strong>{selectedRoster.name}</strong>{selectedRoster.uid!=='hero'&&<button type="button" onClick={()=>p.toggleActive(selectedRoster.uid)}>{p.active.includes(selectedRoster.uid)?'撤下':'上陣'}</button>}<button type="button" disabled={selectedRoster.uid==='hero'||p.active.includes(selectedRoster.uid)} onClick={()=>p.storeMercenary(selectedRoster.uid)}>休息</button><button type="button" aria-pressed={activeWindow==='stats'} onClick={()=>setActiveWindow('stats')}>能力值</button><button type="button" aria-pressed={activeWindow==='inventory'} onClick={()=>setActiveWindow('inventory')}>背包</button></nav>
    <nav className="guild-facility-actions" aria-label="商團駐地設施">
      <button type="button" className="wandering-caravan-button" aria-pressed={activeWindow==='wanderer'} onClick={()=>setActiveWindow('wanderer')}><span>平行世界</span><strong>流浪商團</strong><small>神獸套裝兌換</small></button>
      <button type="button" className="mercenary-rest-button" aria-pressed={activeWindow==='rest'} onClick={()=>setActiveWindow('rest')}><span>商團駐地</span><strong>傭兵休息處</strong><small>{p.restingMercs.length}／10 格</small></button>
      <button type="button" className="party-formation-button" aria-pressed={activeWindow==='formation'} onClick={()=>setActiveWindow('formation')}><span>商團駐地</span><strong>隊伍編制</strong><small>調整 3 × 4 站位</small></button>
      <button type="button" id={TERRITORY_ENTRY_ID} className="guild-territory-entry" aria-pressed={activeWindow==='territory'} onClick={()=>setActiveWindow('territory')}><span>商團駐地・新模式</span><strong>商團領地</strong><small>{p.hero.level >= TERRITORY_UNLOCK_LEVEL ? '建設據點・永久增益' : `主角 Lv.${TERRITORY_UNLOCK_LEVEL} 開放經營`}</small></button>
    </nav>
    {p.battle && <div className="hero-inventory-layout battle-only">{p.battle}</div>}
    {activeWindow==='stats'&&<section data-draggable-window="stats" className={'floating-game-window floating-character'+(p.equipmentPulseUid===selectedRoster.uid?' equipment-equip-pulse':'')} style={{...characterWindowStyle,...(windowStyle('stats')||{})}} aria-label="角色能力值"><header className="draggable-window-header" onPointerDown={event=>startWindowDrag('stats',event)}><strong>{selectedRoster.name}・角色頁</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉角色頁">×</button></header><div className="character-panel-tabs" role="tablist" aria-label="角色頁面分頁">{([['equipment','裝備'],['advancement','進階'],['skills','技能']] as const).map(([tab,label])=><button type="button" role="tab" aria-selected={characterTab===tab} className={characterTab===tab?'selected':''} onClick={()=>setCharacterTab(tab)} key={tab}>{label}</button>)}</div>{characterTab==='skills'?<CharacterSkillPanel unit={selectedRoster}/>:characterTab==='advancement'?<CharacterAdvancementPanel unit={selectedRoster} power={p.power} allocate={p.allocate} promotionItems={p.promotionItems} promote={p.promote} heroAllocate={p.allocate}/>:<CharacterEquipmentLayout unit={selectedRoster} power={p.power} unequip={selectedRoster.uid==='hero'?slot=>p.unequipHero(slot):slot=>p.unequipEquipment(slot,selectedRoster.uid)}/>}</section>}
    {activeWindow==='inventory'&&<section data-draggable-window="inventory" className="floating-game-window floating-inventory" style={windowStyle('inventory')} aria-label="行囊窗"><header className="draggable-window-header" onPointerDown={event=>startWindowDrag('inventory',event)}><strong>{selectedRoster.name}・背包</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉背包">×</button></header><InventoryPanel inventory={p.inventory} materials={p.materials} materialPrices={p.materialPrices} equip={itemUid=>p.equipSelected(itemUid,selectedRoster.uid)} sell={p.sellInventory} sellAllEquipment={p.sellAllInventory} sellMaterial={p.sellMaterial} sellAllMaterials={p.sellAllMaterials} openAncientCoinBox={p.openAncientCoinBox} message={p.bagMessage} weight={p.weight} maxWeight={p.maxWeight} targetName={selectedRoster.name}/></section>}
    {activeWindow==='territory'&&<section className="floating-game-window floating-territory" aria-label="商團領地"><header><strong>商團領地・經營</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉商團領地">×</button></header><GuildTerritoryPanel territory={p.territory} heroLevel={p.hero.level} gold={p.gold} inventory={p.inventory} materials={p.materials} upgrade={p.upgradeBuilding} enhance={p.enhanceEquipment} enhanceFeedback={p.enhanceFeedback} fuseAll={p.fuseAllEquipment} craftRestaurantFood={p.craftRestaurantFood}/></section>}
    {activeWindow==='wanderer'&&<section className="floating-game-window floating-wanderer" aria-label="平行世界流浪商團"><header><strong>平行世界流浪商團</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉流浪商團">×</button></header><div className="wanderer-exchange"><small>商團駐地・異界旅人限定兌換</small><strong>新手兌換銅錢 {p.newbieCoins.toLocaleString()} 枚</strong><p>每次花費 1,000 枚，直接兌換一套完整 T10 神獸裝備（五件）。</p>{([['azure','青龍套裝','防禦・生命'],['chiyou','蚩尤套裝','力量・戰意'],['amaterasu','天照套裝','智力・法術']] as const).map(([set,name,focus])=><button key={set} type="button" disabled={p.newbieCoins<1000} onClick={()=>p.redeemWandererSet(set)}><span><b>{name}</b><small>{focus}・五件套</small></span><em>1,000 枚兌換</em></button>)}<button type="button" className="wanderer-consumable-exchange" disabled={p.newbieCoins<100} onClick={p.redeemWandererChickenSoup}><span><b>雞湯 ×100</b><small>每份恢復主角與出戰傭兵 10% 最大 HP</small></span><em>100 枚兌換</em></button><button type="button" className="wanderer-consumable-exchange" disabled={p.newbieCoins<100} onClick={p.redeemWandererGinsengChickenSoup}><span><b>蔘雞湯 ×50</b><small>每份恢復主角與出戰傭兵 30% 最大 HP</small></span><em>100 枚兌換</em></button><button type="button" className="wanderer-consumable-exchange" disabled={p.newbieCoins<100} onClick={p.redeemWandererBlackBoneChickenSoup}><span><b>烏骨雞湯 ×30</b><small>每份恢復主角與出戰傭兵 50% 最大 HP</small></span><em>100 枚兌換</em></button></div></section>}
    {activeWindow==='rest'&&<section className="floating-game-window floating-rest" aria-label="傭兵休息處"><header><strong>傭兵休息處・{p.restingMercs.length}／10</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉傭兵休息處">×</button></header><div className="mercenary-rest-grid">{Array.from({length:10},(_,index)=>{const unit=p.restingMercs[index];return unit?<article key={unit.uid}><img src={unit.image} alt=""/><span><strong>{unit.name}</strong><small>Lv. {unit.level}・{unit.role}</small></span><button type="button" disabled={p.mercs.length>=11} onClick={()=>p.withdrawRestingMercenary(unit.uid)}>取回</button></article>:<div className="mercenary-rest-empty" key={'empty-'+index}><b>＋</b><small>空位</small></div>;})}</div><p className="mercenary-rest-note">休息中的傭兵不會參與戰鬥；請先將上陣傭兵撤下，再點選「休息」存放。</p></section>}
    {activeWindow==='formation'&&<section className="floating-game-window floating-formation" aria-label="隊伍編制"><header><strong>隊伍編制・前中後排各四格</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉隊伍編制">×</button></header><div className="formation-overview"><span><b>{deployed.length}</b><small>出戰／12</small></span>{formationRows.map(row=><span key={row.position} className={'formation-count formation-count-'+row.position}><b>{row.units.length}</b><small>{row.position}／4</small></span>)}</div><p className="formation-guide">每排固定四格；點擊角色會依序切換前排、中排、後排。同排角色依出戰順序進入 1～4 號格，戰鬥中不可換位。</p><div className="formation-lanes">{formationRows.map(({position,units})=><section className={'formation-lane formation-lane-'+position} key={position}><header><span><strong>{position}</strong><small>{position==='前排'?'近敵・攻擊 +20%':position==='後排'?'遠敵・50% 閃避':'中央・攻守支援'}</small></span><b>{Math.min(units.length,4)}／4</b></header><div className="formation-slot-grid">{Array.from({length:4},(_,index)=>{const unit=units[index];return unit?<button type="button" className="formation-slot occupied" key={unit.uid} disabled={p.busy} onClick={()=>p.cyclePosition(unit.uid)} title={p.busy?'戰鬥進行中不可換位':'點擊切換下一排'}><i>{index+1}</i><img src={unit.image} alt=""/><span><b>{unit.name}</b><small>{unit.uid==='hero'?'主角':'傭兵'}・換排</small></span></button>:<div className="formation-slot empty" key={position+'-'+index}><i>{index+1}</i><span><b>空位</b><small>{position}第 {index+1} 格</small></span></div>})}</div>{units.length>4&&<div className="formation-overflow"><strong>超出本排 {units.length-4} 人</strong><span>請點擊角色移至下一排：</span>{units.slice(4).map(unit=><button type="button" key={unit.uid} disabled={p.busy} onClick={()=>p.cyclePosition(unit.uid)}><img src={unit.image} alt=""/><b>{unit.name}</b></button>)}</div>}</section>)}</div></section>}
  </section>;
}

function CharacterAdvancementPanel({unit,power,allocate,promotionItems,promote,heroAllocate}:{unit:CaravanMember;power:(unit:CaravanMember)=>number;allocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void;promotionItems:Readonly<Record<PromotionItemId,number>>;promote:(uid:string,targetTier?:JobTier)=>void;heroAllocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void}){
  if(unit.uid!=='hero') return <MercenaryStatusWindow unit={unit} power={power} allocate={allocate} promotionItems={promotionItems} promote={promote}/>;
  const levelData=progressForLevel(unit.level);
  const xpProgress=unit.level>=LEVEL_CAP?levelData.xpToNext:Math.min(levelData.xpToNext,unit.xp);
  return <section className="character-advancement-panel" aria-label="主角進階"><div className="character-advancement-heading"><strong>主角成長</strong><span>Lv. {unit.level}／{LEVEL_CAP}</span></div><div className="character-advancement-power"><span>目前戰力</span><strong>{power(unit).toLocaleString()}</strong></div><label className="hp-meter hp-exp">經驗值<span>{unit.level>=LEVEL_CAP?'已達最高等級':`${unit.xp.toLocaleString()} / ${levelData.xpToNext.toLocaleString()}`}</span>{unit.level<LEVEL_CAP&&<progress max={levelData.xpToNext} value={xpProgress}/>}</label><div className="character-advancement-note"><strong>商隊領袖</strong><p>主角經驗值獨立成長；完成委託、主線與戰鬥可獲得主角經驗。</p></div><div className="character-advancement-locks"><span>技能欄位<em>依序解鎖</em></span><span>高階職業<em>後續開放</em></span></div><AbilityPanel hero={unit} allocate={heroAllocate}/></section>;
}

function CharacterEquipmentLayout({unit,power,unequip}:{unit:CaravanMember;power:(unit:CaravanMember)=>number;unequip:(slot:EquipmentSlot)=>void}){
  const [tooltip,setTooltip]=useState<{data:ItemTooltipData;left:number;top:number}|null>(null);
  const vital=vitalStats(unit),combat=combatStats(unit);
  const leftSlots=['weapon','helm','gloves','ring1'] as const;
  const rightSlots=['armor','amulet','boots','ring2'] as const;
  const showTooltip=(item:Equipment,event:{clientX:number;clientY:number})=>setTooltip({...ItemTooltipManager.position({x:event.clientX,y:event.clientY},{width:window.innerWidth,height:window.innerHeight}),data:ItemTooltipManager.equipment(item,{kind:EQUIPMENT_LABELS[item.slot],description:equipmentDescription(item),sellPrice:equipmentSellPrice(item),owned:1})});
  const slotCard=(slot:EquipmentSlot)=>{const item=unit.equip[slot] as Equipment|null;const rarity=item?rarityPresentation(item.rarity).className:'';return <button type="button" className={'character-equipment-slot '+rarity+(item?' filled':'')} onClick={()=>item&&unequip(slot)} onPointerEnter={event=>{if(item)showTooltip(item,event)}} onPointerLeave={()=>setTooltip(null)} aria-label={`${EQUIPMENT_LABELS[slot]}：${item?.name||'未裝備'}`}><span className="character-equipment-icon">{item?.image?<img src={item.image} alt=""/>:EQUIPMENT_LABELS[slot].slice(0,1)}</span><span className="character-equipment-slot-copy"><small>{EQUIPMENT_LABELS[slot]}</small><strong>{item?.name||'未裝備'}</strong>{item&&<em>Lv.{item.requiredLevel||1}</em>}</span></button>};
  return <section className="character-equipment-layout" aria-label={`${unit.name}八格裝備`}><div className="character-equipment-column">{leftSlots.map(slot=><div key={slot}>{slotCard(slot)}</div>)}</div><div className="character-equipment-center"><div className="character-equipment-portrait"><img src={unit.image} alt={unit.name}/><span>Lv. {unit.level}</span></div><strong>{unit.name}</strong><small>{unit.role}</small><div className="character-equipment-power"><span>總戰力</span><b>{power(unit).toLocaleString()}</b></div><div className="character-equipment-stats"><span>生命<strong>{vital.hp} / {vital.maxHp}</strong></span><span>攻擊<strong>{combat.attack.toLocaleString()}</strong></span><span>防禦<strong>{combat.defense.toLocaleString()}</strong></span><span>魔法<strong>{vital.mp} / {vital.maxMp}</strong></span></div><small className="character-equipment-hint">點擊已穿戴裝備可卸下<br/>移到裝備上查看詳細資訊</small></div><div className="character-equipment-column">{rightSlots.map(slot=><div key={slot}>{slotCard(slot)}</div>)}</div>{tooltip&&<EquipmentTooltipCard data={tooltip.data} left={tooltip.left} top={tooltip.top} rarityClass={rarityPresentation(tooltip.data.quality).className}/>}</section>;
}

function CharacterSkillPanel({unit}:{unit:CaravanMember}){
  const primarySkill=unit.skill?.trim()||`${unit.role}專技`;
  const skills=[
    {name:primarySkill,subtitle:'主動技能・Lv.1',asset:'/game-assets/ability/SkillSlot-0.png',state:'已解鎖'},
    {name:`${unit.role}訓練`,subtitle:'角色專精・Lv.1',asset:'/game-assets/ability/AbilitySlot1-0.png',state:'已解鎖'},
    {name:'裝備共鳴',subtitle:'穿戴指定套裝後解鎖',asset:'/game-assets/ability/AbilitySlot2-0.png',state:'未解鎖'},
    {name:'隊伍協同',subtitle:'商團等級提升後解鎖',asset:'/game-assets/ability/CommonAbilitySlot-0.png',state:'未解鎖'},
  ];
  return <section className="character-skill-panel" aria-label={`${unit.name}技能`}><div className="character-skill-heading"><strong>{unit.name}・技能</strong><small>{unit.role}・戰鬥專精</small></div><div className="character-skill-grid">{skills.map((skill,index)=><article className={'character-skill-card'+(skill.state==='未解鎖'?' locked':'')} key={skill.name}><div className="character-skill-icon"><img src={skill.asset} alt=""/>{skill.state==='未解鎖'?<span aria-hidden="true">🔒</span>:<b>{index<2?'★':'◇'}</b>}</div><strong>{skill.name}</strong><small>{skill.subtitle}</small><em>{skill.state}</em></article>)}</div><p className="character-skill-note">技能展示沿用目前角色資料；實際技能效果仍由既有戰鬥系統判定。</p></section>;
}

function MercenaryStatusWindow({unit,power,allocate,promotionItems,promote}:{unit:CaravanMember;power:(unit:CaravanMember)=>number;allocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void;promotionItems:Readonly<Record<PromotionItemId,number>>;promote:(uid:string,targetTier?:JobTier)=>void}){
  const vital=vitalStats(unit);
  const combat=combatStats(unit),levelData=progressForLevel(unit.level);
  const currentTier=(unit.tier === 2 || unit.tier === 3 ? unit.tier : 1) as JobTier;
  const tree=unit.templateId ? MERCENARY_PROMOTION_TREES[unit.templateId as keyof typeof MERCENARY_PROMOTION_TREES] : undefined;
  const target=currentTier < 3 ? tree?.[currentTier === 1 ? 'tier2' : 'tier3'] : undefined;
  const levelReady=!!target && unit.level >= target.requiredLevel;
  const itemsReady=!!target && target.requiredItems.every(({itemId,quantity}) => (promotionItems[itemId] ?? 0) >= quantity);
  const promotionPanel=target?<section className="mercenary-promotion" aria-label="傭兵轉職"><strong>進階職業：Tier {target.tier}・{target.name}</strong><small>需要等級：Lv. {target.requiredLevel}（目前 {unit.level}）</small><small>轉職後重置為 Lv.1／EXP 0；保留裝備與既有能力值。</small>{target.requiredItems.map(({itemId,quantity})=><small key={itemId}>{itemId}：{promotionItems[itemId] ?? 0}／{quantity}</small>)}<button type="button" disabled={!levelReady||!itemsReady} onClick={()=>promote(unit.uid,target.tier)}>轉職</button></section>:<p className="mercenary-promotion"><small>已達最高階級</small></p>;
  return <section className="hero-personal iron-character compact mercenary-status">{promotionPanel}<div className="mercenary-status-identity"><img src={unit.image} alt={unit.name}/><span><strong>{unit.name}</strong><small>{unit.role} · Tier {currentTier} · Lv. {unit.level}</small></span></div>
    <section className="hp-indicators"><div className="hp-power"><span>總戰鬥力</span><strong>{power(unit).toLocaleString()}</strong></div><p className="hp-gold">定位：{unit.role}</p></section>
    <section className="hp-allocation"><p>剩餘屬性點 <strong>{unit.points}</strong><small>＋100 會在點數不足時投入全部剩餘點數。</small></p>{([['str','力量','Str',unit.str],['agi','敏捷','Dex',unit.agi],['vit','體質','Vit',unit.vit],['intel','智力','Int',unit.intel]] as const).map(([stat,label,short,value])=><div className="hp-stat" key={stat}><span>{label} <small>{short}</small></span><small>基礎能力</small><strong>{value}</strong><button aria-label={`增加${label}`} disabled={unit.points<=0} onClick={()=>allocate(stat)}>＋</button><button aria-label={`增加100點${label}`} disabled={unit.points<=0} onClick={()=>allocate(stat,100)}>＋100</button></div>)}<p className="hp-defense">防禦力 <strong>{combat.defense}</strong><small>已包含等級與裝備加成</small></p><div className="hp-vitals"><label className="hp-meter">生命值 HP<span>{vital.hp} / {vital.maxHp}</span><progress className="hp" max={vital.maxHp} value={vital.hp}/></label><label className="hp-meter">魔法值 MP<span>{vital.mp} / {vital.maxMp}</span><progress className="mp" max={vital.maxMp} value={vital.mp}/></label></div><label className="hp-meter hp-exp">EXP<span>{unit.level>=LEVEL_CAP?'已達 Lv.300':`${unit.xp.toLocaleString()} / ${levelData.xpToNext.toLocaleString()}`}</span>{unit.level<LEVEL_CAP&&<progress max={levelData.xpToNext} value={unit.xp}/>}</label></section>
  </section>;
}

function EquipmentSummary({unit,unequip}:{unit:CaravanMember;unequip:(slot:EquipmentSlot,targetUid:string)=>void}){
  const [tooltip,setTooltip]=useState<{data:ItemTooltipData;left:number;top:number}|null>(null);
  const showTooltip=(item:Equipment,event:{clientX:number;clientY:number})=>setTooltip({...ItemTooltipManager.position({x:event.clientX,y:event.clientY},{width:window.innerWidth,height:window.innerHeight}),data:ItemTooltipManager.equipment(item,{kind:EQUIPMENT_LABELS[item.slot],description:equipmentDescription(item),sellPrice:equipmentSellPrice(item),owned:1})});
  const hideTooltip=()=>setTooltip(null);
  return <section className="window-equipment" aria-label="八格裝備與額外魔法屬性"><h3>八格裝備與額外魔法屬性</h3><div>{EQUIPMENT_SLOTS.map(slot=>{const item=unit.equip[slot] as Equipment|null;const enhance=enhancementPresentation(item?.enhance);const effective=item&&effectiveEquipmentStats(item);return <article key={slot} onPointerEnter={event=>{if(item)showTooltip(item,event)}} onPointerLeave={hideTooltip}><span className="window-equipment-icon">{item?.image?<img src={item.image} alt=""/>:EQUIPMENT_LABELS[slot].slice(0,1)}</span><p><small>{EQUIPMENT_LABELS[slot]}</small><strong className="equipment-name-line">{item?.name||'未裝備'}{enhance.label&&<b className={'enhancement-badge '+enhance.className} aria-label={`強化 ${enhance.label}`}>{enhance.label}</b>}</strong>{item&&effective&&<><em>攻 {effective.atk}・防 {effective.def}・生命 {effective.hp}</em>{item.socketGem&&<i style={{color:'#8ee7ff'}}>鑲嵌：{item.socketGem.name} ×{item.socketGem.count}（加成 {item.socketGem.totalValue}）</i>}{item.magic?.filter(affix=>!affix.id.startsWith('socket-')).map(affix=><i key={affix.id} style={{color:affix.color}}>{affix.name}：{affix.text}</i>)}<button type="button" className="window-equipment-unequip" onClick={()=>{hideTooltip();unequip(slot,unit.uid)}}>卸下</button></>}</p></article>;})}</div>{tooltip&&<EquipmentTooltipCard data={tooltip.data} left={tooltip.left} top={tooltip.top} rarityClass={rarityPresentation(tooltip.data.quality).className}/>}</section>;
}
