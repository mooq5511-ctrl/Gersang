/* eslint-disable next/no-img-element */
import { combatStats, vitalStats, type VitalUnit } from './vitals-engine';
import {MercenaryPromotionPanelV1} from './mercenary-promotion-panel-v1';
import {usesPromotionV1} from './mercenary-growth-v1';
import type {CSSProperties,ReactNode,PointerEvent as ReactPointerEvent} from 'react';
import {useEffect,useState} from 'react';

import {EQUIPMENT_LABELS,type EquipmentSlot} from './equipment-slots';
import {InventoryPanel} from './inventory-panel';
import {type BattlePosition} from './formation-position';
import { AbilityPanel } from './ability-panel';
import { GameDetailDialog } from './game-detail-dialog';
import { mercenarySpec } from './mercenary-roster';
import { LEVEL_CAP, progressForLevel } from './level-progression';
import { MERCENARY_PROMOTION_TREES, type JobTier } from './mercenary-promotions';
import { GuildTerritoryPanel } from './guild-territory-panel';
import { rarityPresentation } from './classic-presentation';
import type { FusionSourceRarity } from './equipment-fusion';
import { equipmentDescription } from './divine-equipment';
import { equipmentSellPrice } from './equipment-market';
import { GUILD_RANK_CAP, GUILD_RANK_TIERS, guildRankCost, guildRankInfo } from './guild-rank';
import { GUILD_SKILL_MAX, GUILD_SKILLS, guildSkillCost, guildSkillDefinition, guildSkillPrerequisiteMet, normalizeGuildSkills, type GuildSkillId, type GuildSkills } from './guild-skills';
import { ItemTooltipManager, type ItemTooltipData } from './item-tooltip-manager';
import { EquipmentTooltipCard } from './equipment-tooltip-card';
import { TERRITORY_ENTRY_ID, TERRITORY_UNLOCK_LEVEL, type BuildingId, type GuildTerritory } from './guild-territory';
import type { Equipment } from './game-state';
import './guild-territory.css';
import './guild-territory-layout.css';

// 此面板只呈現真實遊戲資料；金錢與成長由遊戲唯一計時器結算。
export type CaravanMember = VitalUnit & { uid:string; name:string; role:string; job?:string; skill?:string; image:string; templateId?:string; xp:number; points:number; str:number; agi:number; position:BattlePosition };
type CharacterTab = 'equipment'|'advancement'|'skills';
type Props = {
  initialWindow?: 'inventory' | 'territory';
  battle:ReactNode;navigation:ReactNode;busy:boolean;
  territory:GuildTerritory;upgradeBuilding:(id:BuildingId)=>void;enhanceEquipment:(itemUid:string)=>void;fuseAllEquipment:(rarity:FusionSourceRarity)=>void;
  enhanceFeedback:{uid:string;name:string;success:boolean;level:number}|null; equipmentPulseUid:string|null;
  hero:CaravanMember; mercs:CaravanMember[]; restingMercs:CaravanMember[]; active:string[]; toggleActive:(uid:string)=>void; storeMercenary:(uid:string)=>void; withdrawRestingMercenary:(uid:string)=>void; gold:number; credit:number; creditXp:number; creditLevel:number; guildRank:number; promoteGuildRank:()=>void; guildSkillPoints:number; guildSkills:GuildSkills; upgradeGuildSkill:(id:GuildSkillId)=>void; newbieCoins:number; redeemWandererSet:(set:'azure'|'chiyou'|'amaterasu')=>void; redeemWandererChickenSoup:()=>void; redeemWandererGinsengChickenSoup:()=>void; redeemWandererBlackBoneChickenSoup:()=>void; weight:number; maxWeight:number;
  cost:number; power:(unit:CaravanMember)=>number; xpNeed:(level:number)=>number;
  select:(uid:string)=>void; cyclePosition:(uid:string)=>void; hire:()=>void; allocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void;
  promote:(uid:string,targetTier?:number,branch?:'spear'|'bow')=>void; promotionItems:Readonly<Record<string,number>>;

  inventory:Equipment[];materials:Record<string,number>;materialPrices:Record<string,number>;medicines:Record<string,number>;craftRestaurantFood:(recipeId:string)=>void;
  equipSelected:(uid:string,targetUid:string)=>void;sellInventory:(uid:string)=>void;sellAllInventory:()=>void;smeltLowRarityEquipment:()=>void;sellMaterial:(name:string)=>void;sellAllMaterials:()=>void;openAncientCoinBox:(amount:number)=>void;
  unequipHero:(slot:EquipmentSlot)=>void;unequipEquipment:(slot:EquipmentSlot,targetUid:string)=>void;bagMessage:string;
};
export function CaravanStatus(p:Props) {
  // 戰力使用既有引擎，包含穿戴裝備。
  const [selectedRosterUid,setSelectedRosterUid]=useState(p.hero.uid);
  const [characterTab,setCharacterTab]=useState<CharacterTab>('equipment');
  const [activeWindow,setActiveWindow]=useState<'stats'|'inventory'|'wanderer'|'rest'|'formation'|'territory'|'rank'|'skills'|null>(p.initialWindow || null);
  const [windowPositions,setWindowPositions]=useState<Partial<Record<'stats'|'inventory',{left:number;top:number}>>>({});
  const [draggingWindow,setDraggingWindow]=useState<{kind:'stats'|'inventory';offsetX:number;offsetY:number}|null>(null);
  const rosterUnits=[p.hero,...p.mercs].slice(0,12);
  const selectedRoster=rosterUnits.find(unit=>unit.uid===selectedRosterUid)||p.hero;
  const selectedRosterIndex=Math.max(0,rosterUnits.findIndex(unit=>unit.uid===selectedRoster.uid));
  const characterWindowStyle={"--party-selected-top":`${88+24+selectedRosterIndex*45}px`} as CSSProperties;
  const deployed=[p.hero,...p.mercs.filter(unit=>p.active.includes(unit.uid))].slice(0,12);
  const formationRows=(['前排','中排','後排'] as const).map(position=>({position,units:deployed.filter(unit=>unit.position===position)}));
  const rankInfo=guildRankInfo(p.guildRank);
  const guildSkillPoints=Math.max(0,Math.floor(Number(p.guildSkillPoints)||0));
  const guildSkills=normalizeGuildSkills(p.guildSkills);
  const rankMax=rankInfo.rank>=GUILD_RANK_CAP;
  const nextRank=rankMax?rankInfo:guildRankInfo(rankInfo.rank+1);
  const rankCost=guildRankCost(rankInfo.rank);
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
    <aside className="party-window-roster" aria-label="主角與傭兵"><strong>隊伍 {Math.min(12,1+p.mercs.length)}／12</strong>{rosterUnits.map(unit=><button type="button" className={selectedRoster.uid===unit.uid?'selected':''} key={unit.uid} onClick={()=>chooseRoster(unit)} aria-label={'選擇'+unit.name}><MercenaryPortrait unit={unit}/><span>{unit.uid==='hero'?'主':'傭'}</span></button>)}</aside>
    <nav className="party-context-menu" hidden={activeWindow==='formation'} style={characterWindowStyle} aria-label="角色功能"><strong>{selectedRoster.name}</strong>{selectedRoster.uid!=='hero'&&<button type="button" onClick={()=>p.toggleActive(selectedRoster.uid)}>{p.active.includes(selectedRoster.uid)?'撤下':'上陣'}</button>}<button type="button" disabled={selectedRoster.uid==='hero'||p.active.includes(selectedRoster.uid)} onClick={()=>p.storeMercenary(selectedRoster.uid)}>休息</button><CharacterAbilityShortcut unit={selectedRoster} power={p.power} allocate={p.allocate} promotionItems={p.promotionItems} promote={p.promote}/><button type="button" aria-pressed={activeWindow==='stats'} onClick={()=>setActiveWindow('stats')}>能力值</button><button type="button" aria-pressed={activeWindow==='inventory'} onClick={()=>setActiveWindow('inventory')}>背包</button></nav>
    <nav className="guild-facility-actions" aria-label="商團駐地設施">
      <button type="button" className={'guild-rank-entry'+(p.credit<rankCost&&!rankMax?' insufficient':'')} onClick={()=>setActiveWindow('rank')} aria-label="查看商團階位圖鑑"><span>商團階位</span><strong>{rankInfo.label}</strong><small>{rankMax?'已達最高階位':'查看階位與升階成本'}</small></button>
      <button type="button" className="guild-skill-entry" aria-pressed={activeWindow==='skills'} onClick={()=>setActiveWindow('skills')}><span>商團成長</span><strong>商團技能</strong><small>{guildSkillPoints} 點技能點可用</small></button>
      <button type="button" className="wandering-caravan-button" aria-pressed={activeWindow==='wanderer'} onClick={()=>setActiveWindow('wanderer')}><span>平行世界</span><strong>流浪商團</strong><small>神獸套裝兌換</small></button>
      <button type="button" className="mercenary-rest-button" aria-pressed={activeWindow==='rest'} onClick={()=>setActiveWindow('rest')}><span>商團駐地</span><strong>傭兵休息處</strong><small>{p.restingMercs.length}／10 格</small></button>
      <button type="button" className="party-formation-button" aria-pressed={activeWindow==='formation'} onClick={()=>setActiveWindow('formation')}><span>商團駐地</span><strong>隊伍編制</strong><small>調整 3 × 4 站位</small></button>
      <button type="button" id={TERRITORY_ENTRY_ID} className="guild-territory-entry" aria-pressed={activeWindow==='territory'} onClick={()=>setActiveWindow('territory')}><span>商團駐地・新模式</span><strong>商團領地</strong><small>{p.hero.level >= TERRITORY_UNLOCK_LEVEL ? '建設據點・永久增益' : `主角 Lv.${TERRITORY_UNLOCK_LEVEL} 開放經營`}</small></button>
    </nav>
    {activeWindow==='rank'&&<section className="floating-game-window floating-guild-rank" aria-label="商團階位圖鑑"><header><strong>商團階位圖鑑</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉商團階位圖鑑">×</button></header><div className="guild-rank-summary"><div><small>目前階位</small><strong>{rankInfo.label}</strong><span>第 {rankInfo.rank}／{GUILD_RANK_CAP} 階</span></div><div><small>持有信用值</small><strong>{p.credit.toLocaleString('zh-TW')}</strong><span>{rankMax?'已達最高階位':`下一階：${nextRank.label}`}</span></div></div><div className="guild-rank-upgrade"><div><strong>{rankMax?'紫金十階・商團巔峰':`升至${nextRank.label}`}</strong><small>{rankMax?'所有商團階位均已解鎖':`需要 ${rankCost.toLocaleString('zh-TW')} 信用值・升階後不會自動再次扣款`}</small></div><button type="button" disabled={rankMax||p.credit<rankCost} onClick={p.promoteGuildRank}>{rankMax?'已達最高':p.credit<rankCost?'信用值不足':`升階至 ${nextRank.label}`}</button></div><div className="guild-rank-roadmap">{GUILD_RANK_TIERS.map((tier,tierIndex)=><section key={tier}><header><strong>{tier}</strong><small>{tierIndex===4?'最終品階':'第 '+(tierIndex+1)+' 品階・10 個階位'}</small></header><div>{Array.from({length:10},(_,stepIndex)=>{const rank=tierIndex*10+stepIndex+1;const info=guildRankInfo(rank);const unlocked=rank<=rankInfo.rank;const current=rank===rankInfo.rank;return <article className={(current?'current ':unlocked?'unlocked ':'locked ')+(rank===GUILD_RANK_CAP?'cap':'')} key={rank}><strong>{info.stepName}階</strong><small>{rank===GUILD_RANK_CAP?'最高階':`升階 ${guildRankCost(rank).toLocaleString('zh-TW')}`}</small>{current&&<b>目前</b>}</article>;})}</div></section>)}</div><p className="guild-rank-note">升階只消耗信用值，不會自動跳階；建議在完成航線、委託與投資後，再決定要不要把信用值投入商團成長。</p></section>}
    {activeWindow==='skills'&&<GuildSkillTree rankInfo={rankInfo} guildSkillPoints={guildSkillPoints} guildSkills={guildSkills} upgradeGuildSkill={p.upgradeGuildSkill} close={()=>setActiveWindow(null)}/>}
    {p.battle && <div className="hero-inventory-layout battle-only">{p.battle}</div>}
    {activeWindow==='stats'&&<section data-draggable-window="stats" className={'floating-game-window floating-character'+(p.equipmentPulseUid===selectedRoster.uid?' equipment-equip-pulse':'')} style={{...characterWindowStyle,...windowStyle('stats')}} aria-label="角色能力值"><header className="draggable-window-header" onPointerDown={event=>startWindowDrag('stats',event)}><strong>{selectedRoster.name}・角色頁</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉角色頁">×</button></header><div className="character-panel-tabs" role="tablist" aria-label="角色頁面分頁">{([['equipment','裝備'],['advancement','進階'],['skills','技能']] as const).map(([tab,label])=><button type="button" role="tab" aria-selected={characterTab===tab} className={characterTab===tab?'selected':''} onClick={()=>setCharacterTab(tab)} key={tab}>{label}</button>)}</div>{characterTab==='skills'?<CharacterSkillPanel unit={selectedRoster}/>:characterTab==='advancement'?<CharacterAdvancementPanel unit={selectedRoster} power={p.power} allocate={p.allocate} promotionItems={p.promotionItems} promote={p.promote} heroAllocate={p.allocate}/>:<CharacterEquipmentLayout unit={selectedRoster} power={p.power} unequip={selectedRoster.uid==='hero'?slot=>p.unequipHero(slot):slot=>p.unequipEquipment(slot,selectedRoster.uid)}/>}</section>}
    {activeWindow==='inventory'&&<section data-draggable-window="inventory" className="floating-game-window floating-inventory" style={windowStyle('inventory')} aria-label="行囊窗"><header className="draggable-window-header" onPointerDown={event=>startWindowDrag('inventory',event)}><strong>{selectedRoster.name}・背包</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉背包">×</button></header><InventoryPanel inventory={p.inventory} materials={p.materials} materialPrices={p.materialPrices} equip={itemUid=>p.equipSelected(itemUid,selectedRoster.uid)} sell={p.sellInventory} sellAllEquipment={p.sellAllInventory} smeltLowRarityEquipment={p.smeltLowRarityEquipment} sellMaterial={p.sellMaterial} sellAllMaterials={p.sellAllMaterials} openAncientCoinBox={p.openAncientCoinBox} message={p.bagMessage} weight={p.weight} maxWeight={p.maxWeight} targetName={selectedRoster.name}/></section>}
    {activeWindow==='territory'&&<section className="floating-game-window floating-territory" aria-label="商團領地"><header><strong>商團領地・經營</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉商團領地">×</button></header><GuildTerritoryPanel territory={p.territory} heroLevel={p.hero.level} gold={p.gold} inventory={p.inventory} materials={p.materials} upgrade={p.upgradeBuilding} enhance={p.enhanceEquipment} enhanceFeedback={p.enhanceFeedback} fuseAll={p.fuseAllEquipment} craftRestaurantFood={p.craftRestaurantFood}/></section>}
    {activeWindow==='wanderer'&&<section className="floating-game-window floating-wanderer" aria-label="平行世界流浪商團"><header><strong>平行世界流浪商團</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉流浪商團">×</button></header><div className="wanderer-exchange"><small>商團駐地・異界旅人限定兌換</small><strong>新手兌換銅錢 {p.newbieCoins.toLocaleString()} 枚</strong><p>每次花費 1,000 枚，直接兌換一套完整 T10 神獸裝備（五件）。</p>{([['azure','青龍套裝','防禦・生命'],['chiyou','蚩尤套裝','力量・戰意'],['amaterasu','天照套裝','智力・法術']] as const).map(([set,name,focus])=><button key={set} type="button" disabled={p.newbieCoins<1000} onClick={()=>p.redeemWandererSet(set)}><span><b>{name}</b><small>{focus}・五件套</small></span><em>1,000 枚兌換</em></button>)}<button type="button" className="wanderer-consumable-exchange" disabled={p.newbieCoins<100} onClick={p.redeemWandererChickenSoup}><span><b>雞湯 ×100</b><small>每份恢復主角與出戰傭兵 10% 最大 HP</small></span><em>100 枚兌換</em></button><button type="button" className="wanderer-consumable-exchange" disabled={p.newbieCoins<100} onClick={p.redeemWandererGinsengChickenSoup}><span><b>蔘雞湯 ×50</b><small>每份恢復主角與出戰傭兵 30% 最大 HP</small></span><em>100 枚兌換</em></button><button type="button" className="wanderer-consumable-exchange" disabled={p.newbieCoins<100} onClick={p.redeemWandererBlackBoneChickenSoup}><span><b>烏骨雞湯 ×30</b><small>每份恢復主角與出戰傭兵 50% 最大 HP</small></span><em>100 枚兌換</em></button></div></section>}
    {activeWindow==='rest'&&<section className="floating-game-window floating-rest" aria-label="傭兵休息處"><header><strong>傭兵休息處・{p.restingMercs.length}／10</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉傭兵休息處">×</button></header><div className="mercenary-rest-grid">{Array.from({length:10},(_,index)=>{const unit=p.restingMercs[index];return unit?<article key={unit.uid}><MercenaryPortrait unit={unit}/><span><strong>{unit.name}</strong><small>Lv. {unit.level}・{unit.role}</small></span><button type="button" disabled={p.mercs.length>=11} onClick={()=>p.withdrawRestingMercenary(unit.uid)}>取回</button></article>:<div className="mercenary-rest-empty" key={'empty-'+index}><b>＋</b><small>空位</small></div>;})}</div><p className="mercenary-rest-note">休息中的傭兵不會參與戰鬥；請先將上陣傭兵撤下，再點選「休息」存放。</p></section>}
    {activeWindow==='formation'&&<section className="floating-game-window floating-formation" aria-label="隊伍編制"><header><strong>隊伍編制・前中後排各四格</strong><button type="button" onClick={()=>setActiveWindow(null)} aria-label="關閉隊伍編制">×</button></header><div className="formation-overview"><span><b>{deployed.length}</b><small>出戰／12</small></span>{formationRows.map(row=><span key={row.position} className={'formation-count formation-count-'+row.position}><b>{row.units.length}</b><small>{row.position}／4</small></span>)}</div><p className="formation-guide">每排固定四格；點擊角色會依序切換前排、中排、後排。同排角色依出戰順序進入 1～4 號格，戰鬥中不可換位。</p><div className="formation-lanes">{formationRows.map(({position,units})=><section className={'formation-lane formation-lane-'+position} key={position}><header><span><strong>{position}</strong><small>{position==='前排'?'近敵・攻擊 +20%':position==='後排'?'遠敵・50% 閃避':'中央・攻守支援'}</small></span><b>{Math.min(units.length,4)}／4</b></header><div className="formation-slot-grid">{Array.from({length:4},(_,index)=>{const unit=units[index];return unit?<button type="button" className="formation-slot occupied" key={unit.uid} disabled={p.busy} onClick={()=>p.cyclePosition(unit.uid)} title={p.busy?'戰鬥進行中不可換位':'點擊切換下一排'}><i>{index+1}</i><MercenaryPortrait unit={unit}/><span><b>{unit.name}</b><small>{unit.uid==='hero'?'主角':'傭兵'}・換排</small></span></button>:<div className="formation-slot empty" key={position+'-'+index}><i>{index+1}</i><span><b>空位</b><small>{position}第 {index+1} 格</small></span></div>})}</div>{units.length>4&&<div className="formation-overflow"><strong>超出本排 {units.length-4} 人</strong><span>請點擊角色移至下一排：</span>{units.slice(4).map(unit=><button type="button" key={unit.uid} disabled={p.busy} onClick={()=>p.cyclePosition(unit.uid)}><MercenaryPortrait unit={unit}/><b>{unit.name}</b></button>)}</div>}</section>)}</div></section>}
  </section>;
}

type GuildSkillTreeProps = {
  rankInfo: ReturnType<typeof guildRankInfo>;
  guildSkillPoints: number;
  guildSkills: GuildSkills;
  upgradeGuildSkill: (id: GuildSkillId) => void;
  close: () => void;
};

function GuildSkillTree({rankInfo,guildSkillPoints,guildSkills,upgradeGuildSkill,close}:GuildSkillTreeProps){
  const [selectedId,setSelectedId]=useState<GuildSkillId>('tradeProsperity');
  const selectedSkill=guildSkillDefinition(selectedId);
  const selectedLevel=Math.max(0,Math.min(GUILD_SKILL_MAX,Math.floor(Number(guildSkills[selectedId])||0)));
  const selectedRankLocked=rankInfo.rank<selectedSkill.unlockRank;
  const selectedPrerequisiteLocked=!guildSkillPrerequisiteMet(selectedId,guildSkills);
  const selectedLocked=selectedRankLocked||selectedPrerequisiteLocked;
  const selectedMaxed=selectedLevel>=GUILD_SKILL_MAX;
  const selectedCost=guildSkillCost(selectedId,selectedLevel);
  const selectedPrerequisite=selectedSkill.requires?guildSkillDefinition(selectedSkill.requires.id):null;
  const selectedStatus=selectedRankLocked?`第 ${selectedSkill.unlockRank} 階開放`:selectedPrerequisiteLocked?`需${selectedPrerequisite?.name} Lv.${selectedSkill.requires?.level}`:selectedMaxed?'已達最高 10 級':guildSkillPoints<1?'技能點不足':`消耗 ${selectedCost} 點技能點`;
  return <section className="floating-game-window floating-guild-skills" aria-label="商團技能">
    <header><strong>商團技能樹</strong><button type="button" onClick={close} aria-label="關閉商團技能">×</button></header>
    <div className="guild-skill-summary"><div><small>目前階位</small><strong>{rankInfo.label}</strong></div><div><small>可用技能點</small><strong>{guildSkillPoints.toLocaleString('zh-TW')} 點</strong></div><span>商團每升一階獲得 1 點；跨越黑鐵、青銅等大品階時額外獲得 5 點。點選地圖上的技能徽章查看效果，再從詳情面板升級。</span></div>
    <div className="guild-skill-stage">
      <ul className="guild-skill-grid" aria-label="商團技能節點">
        {GUILD_SKILLS.map(skill=>{
          const level=Math.max(0,Math.min(GUILD_SKILL_MAX,Math.floor(Number(guildSkills[skill.id])||0)));
          const rankLocked=rankInfo.rank<skill.unlockRank;
          const prerequisiteLocked=!guildSkillPrerequisiteMet(skill.id,guildSkills);
          const locked=rankLocked||prerequisiteLocked;
          const maxed=level>=GUILD_SKILL_MAX;
          const branch=skill.id==='tradeProsperity'||skill.id==='battleSpoils'?'商業脈':skill.id==='expeditionWisdom'||skill.id==='mercenaryTraining'?'遠征脈':'領袖脈';
          return <li data-branch={branch} data-level={level} className={'guild-skill-card'+(locked?' locked':'')+(maxed?' maxed':'')} key={skill.id}><button type="button" className={'guild-skill-hotspot'+(selectedId===skill.id?' selected':'')} aria-pressed={selectedId===skill.id} title={`${skill.name}・Lv.${level}/${GUILD_SKILL_MAX}`} onClick={()=>setSelectedId(skill.id)}><span className="guild-skill-node-art"><img src={skill.image} alt=""/></span><span className="guild-skill-node-copy"><b>{skill.name}</b><small>Lv.{level}／{GUILD_SKILL_MAX}</small><em>{locked?'尚未解鎖':maxed?'已滿級':'可升級'}</em></span><span className="sr-only">查看{skill.name}，目前 Lv.{level}</span></button></li>;
        })}
      </ul>
      <aside className="guild-skill-detail" aria-live="polite">
        <div className="guild-skill-detail-heading"><span aria-hidden="true">{selectedSkill.icon}</span><div><strong>{selectedSkill.name}</strong><small>Lv.{selectedLevel}／{GUILD_SKILL_MAX}</small></div><b>{selectedStatus}</b></div>
        <p>{selectedSkill.description}</p>
        <strong className="guild-skill-detail-effect">{selectedSkill.effect(selectedLevel)}</strong>
        <div className="guild-skill-detail-actions"><small>{selectedLocked?'先完成階位或前置技能後即可解鎖':selectedMaxed?'這項技能已經達到最高等級':`下一級需要 ${selectedCost} 點技能點`}</small><button type="button" onClick={()=>upgradeGuildSkill(selectedId)}>{selectedLocked?'查看解鎖條件':selectedMaxed?'已達最高等級':guildSkillPoints<1?'技能點不足':`提升至 Lv.${selectedLevel+1}`}</button></div>
      </aside>
    </div>
    <p className="guild-skill-note">技能點只用於商團技能，不會消耗信用值；特殊傭兵契約的實際名單將在後續版本逐步開放。</p>
  </section>;
}

export function CharacterAbilityShortcut({unit,power,allocate,promotionItems,promote}:{unit:CaravanMember;power:(unit:CaravanMember)=>number;allocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void;promotionItems:Readonly<Record<string,number>>;promote:(uid:string,targetTier?:number,branch?:'spear'|'bow')=>void}){
  const promotion=unit.uid!=='hero'&&usesPromotionV1(unit);
  if(!promotion&&!(unit.points>0))return null;
  const points=Number.isFinite(unit.points)?Math.max(0,Math.floor(unit.points)):0;
  return <GameDetailDialog title={`${unit.name}・${promotion?'兵種轉職與能力':'分配能力'}`} description={promotion?'查看槍／弓兵種樹、需求等級與持有兵符；成功轉職才扣兵符。能力點可在同一面板分配。':'升級獲得的能力點尚未使用；選擇屬性後投入，依既有規則提升角色能力。'} trigger={promotion?`兵種轉職／配點（${points} 點）`:`分配能力（${points} 點）`}>{unit.uid==='hero'?<AbilityPanel hero={unit} allocate={allocate}/>:<MercenaryStatusWindow unit={unit} power={power} allocate={allocate} promotionItems={promotionItems} promote={promote}/>}</GameDetailDialog>;
}

function CharacterAdvancementPanel({unit,power,allocate,promotionItems,promote,heroAllocate}:{unit:CaravanMember;power:(unit:CaravanMember)=>number;allocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void;promotionItems:Readonly<Record<string,number>>;promote:(uid:string,targetTier?:number,branch?:'spear'|'bow')=>void;heroAllocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void}){
  if(unit.uid!=='hero') return <div className="character-detail-summary"><strong>{unit.name}・Lv. {unit.level}</strong><p>目前戰力 {power(unit).toLocaleString()}・可用能力點 {unit.points}</p><GameDetailDialog title={`${unit.name}・詳細能力`} description="查看角色能力、分配屬性點與進階條件。" trigger="查看能力"><MercenaryStatusWindow unit={unit} power={power} allocate={allocate} promotionItems={promotionItems} promote={promote}/></GameDetailDialog></div>;
  const levelData=progressForLevel(unit.level);
  const xpProgress=unit.level>=LEVEL_CAP?levelData.xpToNext:Math.min(levelData.xpToNext,unit.xp);
  return <section className="character-advancement-panel" aria-label="主角進階"><div className="character-advancement-heading"><strong>主角成長</strong><span>Lv. {unit.level}／{LEVEL_CAP}</span></div><div className="character-advancement-power"><span>目前戰力</span><strong>{power(unit).toLocaleString()}</strong></div><label className="hp-meter hp-exp">經驗值<span>{unit.level>=LEVEL_CAP?'已達最高等級':`${unit.xp.toLocaleString()} / ${levelData.xpToNext.toLocaleString()}`}</span>{unit.level<LEVEL_CAP&&<progress max={levelData.xpToNext} value={xpProgress}/>}</label><div className="character-advancement-note"><strong>商隊領袖</strong><p>主角經驗值獨立成長；完成委託、主線與戰鬥可獲得主角經驗。</p></div><div className="character-advancement-locks"><span>技能欄位<em>依序解鎖</em></span><span>高階職業<em>後續開放</em></span></div><div className="character-detail-summary"><p>可用能力點：{unit.points}</p><GameDetailDialog title={`${unit.name}・詳細能力`} description="查看完整屬性；配點會依原有規則即時套用。" trigger="查看能力"><AbilityPanel hero={unit} allocate={heroAllocate}/></GameDetailDialog></div></section>;
}

function CharacterEquipmentLayout({unit,power,unequip}:{unit:CaravanMember;power:(unit:CaravanMember)=>number;unequip:(slot:EquipmentSlot)=>void}){
  const [tooltip,setTooltip]=useState<{data:ItemTooltipData;left:number;top:number}|null>(null);
  const vital=vitalStats(unit),combat=combatStats(unit);
  const leftSlots=['weapon','helm','gloves','ring1'] as const;
  const rightSlots=['armor','amulet','boots','ring2'] as const;
  const showTooltip=(item:Equipment,event:{clientX:number;clientY:number})=>setTooltip({...ItemTooltipManager.position({x:event.clientX,y:event.clientY},{width:window.innerWidth,height:window.innerHeight}),data:ItemTooltipManager.equipment(item,{kind:EQUIPMENT_LABELS[item.slot],description:equipmentDescription(item),sellPrice:equipmentSellPrice(item),owned:1})});
  const slotCard=(slot:EquipmentSlot)=>{const item=unit.equip[slot] as Equipment|null;const rarity=item?rarityPresentation(item.rarity).className:'';return <button type="button" className={'character-equipment-slot '+rarity+(item?' filled':'')} onClick={()=>item&&unequip(slot)} onPointerEnter={event=>{if(item)showTooltip(item,event)}} onPointerLeave={()=>setTooltip(null)} aria-label={`${EQUIPMENT_LABELS[slot]}：${item?.name||'未裝備'}`}><span className="character-equipment-icon">{item?.image?<img src={item.image} alt=""/>:EQUIPMENT_LABELS[slot].slice(0,1)}</span><span className="character-equipment-slot-copy"><small>{EQUIPMENT_LABELS[slot]}</small><strong>{item?.name||'未裝備'}</strong>{item&&<em>Lv.{item.requiredLevel||1}</em>}</span></button>};
  return <section className="character-equipment-layout" aria-label={`${unit.name}八格裝備`}><div className="character-equipment-column">{leftSlots.map(slot=><div key={slot}>{slotCard(slot)}</div>)}</div><div className="character-equipment-center"><div className="character-equipment-portrait"><MercenaryPortrait unit={unit} alt={unit.name}/><span>Lv. {unit.level}</span></div><strong>{unit.name}</strong><small>{unit.role}</small><div className="character-equipment-power"><span>總戰力</span><b>{power(unit).toLocaleString()}</b></div><div className="character-equipment-stats"><span>生命<strong>{vital.hp} / {vital.maxHp}</strong></span><span>攻擊<strong>{combat.attack.toLocaleString()}</strong></span><span>防禦<strong>{combat.defense.toLocaleString()}</strong></span><span>魔法<strong>{vital.mp} / {vital.maxMp}</strong></span></div><small className="character-equipment-hint">點擊已穿戴裝備可卸下<br/>移到裝備上查看詳細資訊</small></div><div className="character-equipment-column">{rightSlots.map(slot=><div key={slot}>{slotCard(slot)}</div>)}</div>{tooltip&&<EquipmentTooltipCard data={tooltip.data} left={tooltip.left} top={tooltip.top} rarityClass={rarityPresentation(tooltip.data.quality).className}/>}</section>;
}

function CharacterSkillPanel({unit}:{unit:CaravanMember}){
  const spec=mercenarySpec(unit.templateId);
  const primarySkill=unit.skill?.trim()||`${unit.role}專技`;
  const skills=[
    {name:spec?.active||primarySkill,subtitle:'主動技能',asset:'/game-assets/ability/SkillSlot-0.png',state:'已解鎖'},
    {name:spec?.passive||`${unit.role}訓練`,subtitle:'角色專精',asset:'/game-assets/ability/AbilitySlot1-0.png',state:'已解鎖'},
    {name:'裝備共鳴',subtitle:'穿戴指定套裝後解鎖',asset:'/game-assets/ability/AbilitySlot2-0.png',state:'未解鎖'},
    {name:'隊伍協同',subtitle:'商團等級提升後解鎖',asset:'/game-assets/ability/CommonAbilitySlot-0.png',state:'未解鎖'},
  ];
  return <section className="character-skill-panel" aria-label={`${unit.name}技能`}><div className="character-skill-heading"><strong>{unit.name}・技能</strong><small>{unit.role}・戰鬥專精</small></div><div className="character-skill-grid">{skills.map((skill,index)=><GameDetailDialog key={skill.name} title={skill.name} description={`${unit.name}・${skill.subtitle}・${skill.state}`} triggerClassName={'character-skill-card'+(skill.state==='未解鎖'?' locked':'')} trigger={<><div className="character-skill-icon"><img src={skill.asset} alt=""/>{skill.state==='未解鎖'?<span aria-hidden="true">🔒</span>:<b>{index<2?'★':'◇'}</b>}</div><strong>{skill.name}</strong><small>{skill.subtitle}</small><em>查看詳情</em></>}><dl className="skill-detail-facts"><div><dt>效果</dt><dd>{index===0?spec?.activeEffect||'沿用目前角色的既有戰鬥技能；此視窗不新增技能效果。':index===1?spec?.passiveEffect||'沿用角色與裝備的既有加成；未提供獨立效果資料。':'此欄位為後續內容預覽，尚未提供獨立技能效果。'}</dd></div>{index===0&&spec&&<><div><dt>耗魔</dt><dd>{spec.mp} MP</dd></div><div><dt>冷卻</dt><dd>{spec.cooldown} 回合（依既有戰鬥系統結算）</dd></div></>}<div><dt>狀態／條件</dt><dd>{skill.state==='未解鎖'?skill.subtitle:skill.state}</dd></div></dl></GameDetailDialog>)}</div><p className="character-skill-note">點選技能查看詳情；實際技能效果仍由既有戰鬥系統判定。</p></section>;
}

function MercenaryStatusWindow({unit,power,allocate,promotionItems,promote}:{unit:CaravanMember;power:(unit:CaravanMember)=>number;allocate:(stat:'str'|'agi'|'vit'|'intel',amount?:number)=>void;promotionItems:Readonly<Record<string,number>>;promote:(uid:string,targetTier?:number,branch?:'spear'|'bow')=>void}){
  if(usesPromotionV1(unit))return <MercenaryPromotionPanelV1 unit={unit} materials={promotionItems} promote={promote} allocate={allocate}/>;
  const vital=vitalStats(unit); const combat=combatStats(unit),levelData=progressForLevel(unit.level);
  const currentTier=(unit.tier === 2 || unit.tier === 3 ? unit.tier : 1) as JobTier;
  const tree=unit.templateId ? MERCENARY_PROMOTION_TREES[unit.templateId as keyof typeof MERCENARY_PROMOTION_TREES] : undefined;
  const target=currentTier < 3 ? tree?.[currentTier === 1 ? 'tier2' : 'tier3'] : undefined;
  const levelReady=!!target && unit.level >= target.requiredLevel;
  const itemsReady=!!target && target.requiredItems.every(({itemId,quantity}) => (promotionItems[itemId] ?? 0) >= quantity);
  const promotionPanel=target?<section className="mercenary-promotion" aria-label="傭兵轉職"><strong>進階職業：Tier {target.tier}・{target.name}</strong><small>需要等級：Lv. {target.requiredLevel}（目前 {unit.level}）</small><small>轉職後重置為 Lv.1／EXP 0；保留裝備與既有能力值。</small>{target.requiredItems.map(({itemId,quantity})=><small key={itemId}>{itemId}：{promotionItems[itemId] ?? 0}／{quantity}</small>)}<button type="button" disabled={!levelReady||!itemsReady} onClick={()=>promote(unit.uid,target.tier)}>轉職</button></section>:<p className="mercenary-promotion"><small>已達最高階級</small></p>;
  return <section className="hero-personal iron-character compact mercenary-status">{promotionPanel}<div className="mercenary-status-identity"><MercenaryPortrait unit={unit} alt={unit.name}/><span><strong>{unit.name}</strong><small>{unit.role} · Tier {currentTier} · Lv. {unit.level}</small></span></div>
    <section className="hp-indicators"><div className="hp-power"><span>總戰鬥力</span><strong>{power(unit).toLocaleString()}</strong></div><p className="hp-gold">定位：{unit.role}</p></section>
    <section className="hp-allocation"><p>剩餘屬性點 <strong>{unit.points}</strong><small>＋100 會在點數不足時投入全部剩餘點數。</small></p>{([['str','力量','Str',unit.str],['agi','敏捷','Dex',unit.agi],['vit','體質','Vit',unit.vit],['intel','智力','Int',unit.intel]] as const).map(([stat,label,short,value])=><div className="hp-stat" key={stat}><span>{label} <small>{short}</small></span><small>基礎能力</small><strong>{value}</strong><button aria-label={`增加${label}`} disabled={unit.points<=0} onClick={()=>allocate(stat)}>＋</button><button aria-label={`增加100點${label}`} disabled={unit.points<=0} onClick={()=>allocate(stat,100)}>＋100</button></div>)}<p className="hp-defense">防禦力 <strong>{combat.defense}</strong><small>已包含等級與裝備加成</small></p><div className="hp-vitals"><label className="hp-meter">生命值 HP<span>{vital.hp} / {vital.maxHp}</span><progress className="hp" max={vital.maxHp} value={vital.hp}/></label><label className="hp-meter">魔法值 MP<span>{vital.mp} / {vital.maxMp}</span><progress className="mp" max={vital.maxMp} value={vital.mp}/></label></div><label className="hp-meter hp-exp">EXP<span>{unit.level>=LEVEL_CAP?'已達 Lv.300':`${unit.xp.toLocaleString()} / ${levelData.xpToNext.toLocaleString()}`}</span>{unit.level<LEVEL_CAP&&<progress max={levelData.xpToNext} value={unit.xp}/>}</label></section>
  </section>;
}

import { MercenaryPortrait } from './mercenary-portrait';
import './mercenary-portrait.css';
