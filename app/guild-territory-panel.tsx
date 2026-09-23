/* eslint-disable next/no-img-element */
import { useState } from "react";
import type { Equipment } from "./game-state";
import { equipmentDetailLines } from "./divine-equipment";
import { rarityPresentation } from "./classic-presentation";
import { EQUIPMENT_FUSION_RECIPES, FUSION_RARITY_LABEL, fusionItemKey, isFusionIngredient, type FusionSourceRarity } from "./equipment-fusion";
import {
  BUILDINGS, BUILDING_IDS, TERRITORY_UNLOCK_LEVEL, buildingCost, enhancementChance,
  enhancementCost, enhancementMilestoneOptions, enhancementMultiplier, territoryBonus, territoryHealInterval, warehouseLimit,
  type BuildingId, type GuildTerritory,
} from "./guild-territory";

type Props = {
  territory: GuildTerritory;
  heroLevel: number;
  gold: number;
  inventory: Equipment[];
  upgrade: (id: BuildingId) => void;
  enhance: (itemUid: string) => void;
  enhanceFeedback: { uid: string; name: string; success: boolean; level: number } | null;
  fuseAll: (rarity: FusionSourceRarity) => void;
};

export function GuildTerritoryPanel({ territory, heroLevel, gold, inventory, upgrade, enhance, enhanceFeedback, fuseAll }: Props) {
  const [selectedItem, setSelectedItem] = useState("");
  const [fusionRarity, setFusionRarity] = useState<FusionSourceRarity>("普通");
  const [fusionItems, setFusionItems] = useState<string[]>([]);
  const item = inventory.find((entry) => entry.uid === selectedItem);
  const itemEnhancementMultiplier = item ? enhancementMultiplier(item.enhance) : 1;
  const itemEnhancementBonuses = item ? Array.from(new Map((item.enhanceBonuses || []).map((bonus) => [bonus.id, bonus])).values()) : [];
  const nextMilestone = item ? ([5, 10, 15] as const).find((level) => level > item.enhance) : undefined;
  const itemEnhanceFeedback = item && enhanceFeedback?.uid === item.uid ? enhanceFeedback : null;
  const open = heroLevel >= TERRITORY_UNLOCK_LEVEL;
  const smithyOpen = territory.buildings.smithy > 0;
  const recipe = EQUIPMENT_FUSION_RECIPES.find((entry) => entry.sourceRarity === fusionRarity)!;
  const fusionCandidates = inventory.filter((entry) => isFusionIngredient(entry, fusionRarity));
  const selectedFusionItems = fusionItems.filter((uid) => fusionCandidates.some((entry) => entry.uid === uid));
  const selectedFusionEntry = fusionCandidates.find((entry) => entry.uid === selectedFusionItems[0]);
  const selectedFusionKey = selectedFusionEntry ? fusionItemKey(selectedFusionEntry) : undefined;
  const autoFusionEntry = fusionCandidates.find((entry) => fusionCandidates.filter((candidate) => fusionItemKey(candidate) === fusionItemKey(entry)).length >= recipe.ingredientCount);
  const autoFusionKey = selectedFusionKey || (autoFusionEntry ? fusionItemKey(autoFusionEntry) : undefined);
  const autoFusionItems = autoFusionKey ? fusionCandidates.filter((entry) => fusionItemKey(entry) === autoFusionKey).slice(0, recipe.ingredientCount) : [];
  const toggleFusionItem = (uid: string) => setFusionItems((current) => {
    if (current.includes(uid)) return current.filter((entry) => entry !== uid);
    const candidate = fusionCandidates.find((entry) => entry.uid === uid);
    const currentKey = fusionCandidates.find((entry) => entry.uid === current[0]);
    if (!candidate || current.length >= recipe.ingredientCount || (currentKey && fusionItemKey(currentKey) !== fusionItemKey(candidate))) return current;
    return [...current, uid];
  });
  const bulkItemCount = [...new Set(fusionCandidates.map(fusionItemKey))].reduce((total, key) => total + Math.floor(fusionCandidates.filter((entry) => fusionItemKey(entry) === key).length / recipe.ingredientCount) * recipe.ingredientCount, 0);
  const bulkBatchCount = bulkItemCount / recipe.ingredientCount;
  const confirmFusion = () => {
    if (!bulkItemCount) return;
    const warning = recipe.successRate < 1 ? `成功率 ${Math.round(recipe.successRate * 100)}%，失敗時 5 件材料會全部消失。` : "本次合成保證成功。";
    if (!window.confirm(`確定要將背包中 ${bulkItemCount} 件${FUSION_RARITY_LABEL[fusionRarity]}裝備全部合成為${FUSION_RARITY_LABEL[recipe.targetRarity]}嗎？\n同名稱、同部位會分開合成，名稱不會改變，共執行 ${bulkBatchCount} 組；${warning}`)) return;
    fuseAll(fusionRarity);
    setFusionItems([]);
  };

  return <div className="guild-territory-panel">
    <p className="territory-intro">主角 Lv.{TERRITORY_UNLOCK_LEVEL} 開放經營。Lv.1–10 沿用原有成長，Lv.11–100 以加速曲線衝刺終局獎勵；建造與升級立即完成，永久加成按百分比直接相加，每名角色各自經營領地。</p>
    <div className="territory-summary" aria-label="目前領地加成">
      <span>放置收益 <b>+{Math.round(territoryBonus(territory, "idle") * 100)}%</b></span>
      <span>經驗 <b>+{Math.round(territoryBonus(territory, "xp") * 100)}%</b></span>
      <span>療傷 <b>每 {territoryHealInterval(territory) / 1000} 秒恢復 10 HP</b></span>
      <span>共用倉庫 <b>{warehouseLimit(territory)} 格</b></span>
    </div>
    <div className="territory-building-grid">
      {BUILDING_IDS.map((id) => {
        const building = BUILDINGS[id];
        const level = territory.buildings[id];
        const cost = buildingCost(id, level);
        const required = "unlockLevel" in building ? building.unlockLevel : TERRITORY_UNLOCK_LEVEL;
        const unlocked = open && heroLevel >= required;
        return <article key={id} id={`guild-building-${id}`}>
          <div className="territory-building-heading"><span aria-hidden="true">{building.icon}</span><div><strong>{building.name}</strong><small>Lv.{level} / {building.maxLevel}</small></div></div>
          <p>{building.description}</p>
          <button type="button" disabled={!unlocked || level >= building.maxLevel || gold < cost} onClick={() => upgrade(id)}>
            {!unlocked ? `主角 Lv.${required} 開放` : level >= building.maxLevel ? "已達最高等級" : `${level ? "升級" : "建造"}・${cost.toLocaleString()} 兩`}
          </button>
        </article>;
      })}
    </div>
    <section className="territory-smithy" aria-label="鐵匠鋪裝備強化">
      <h3>鐵匠鋪・裝備強化</h3>
      <p>僅可強化背包裝備，最高 +15。成功後裝備能力提高；失敗只消耗金錢，不損壞裝備。旗幟與鐵匠鋪成功率加成相加，上限 100%。</p>
      {smithyOpen ? <div className="territory-smithy-controls">
        <label>選擇裝備<select value={selectedItem} onChange={(event) => setSelectedItem(event.target.value)}><option value="">請選擇背包裝備</option>{inventory.map((entry) => <option value={entry.uid} key={entry.uid}>{entry.name} +{entry.enhance}</option>)}</select></label>
        {item && <span>成功率 {Math.round(enhancementChance(territory, item) * 1000) / 10}%・花費 {enhancementCost(item).toLocaleString()} 兩</span>}
        <button type="button" className={itemEnhanceFeedback ? "enhance-button-pulse" : ""} disabled={!item || item.enhance >= 15 || gold < enhancementCost(item)} onClick={() => item && enhance(item.uid)}>強化裝備</button>
        {itemEnhanceFeedback && <output className={'enhance-feedback '+(itemEnhanceFeedback.success ? 'success' : 'failure')} aria-live="polite">{itemEnhanceFeedback.success ? `強化成功・+${itemEnhanceFeedback.level}` : '強化失敗・裝備未受損'}</output>}
        {item && <article className={'smithy-item-preview '+rarityPresentation(item.rarity).className} aria-label="目前選取裝備詳細資訊">
          <div className="smithy-item-preview-heading"><span className="smithy-item-preview-icon">{item.image ? <img src={item.image} alt="" /> : item.slot.slice(0, 1)}</span><div><strong>{item.name} <b>+{item.enhance}</b></strong><small>{rarityPresentation(item.rarity).label}・需求 Lv.{item.requiredLevel || 1}・{item.slot}</small></div></div>
          <div className="smithy-item-preview-stats"><span>攻擊 <b>{Math.floor(item.atk * itemEnhancementMultiplier).toLocaleString()}</b></span><span>防禦 <b>{Math.floor(item.def * itemEnhancementMultiplier).toLocaleString()}</b></span><span>生命 <b>{Math.floor(item.hp * itemEnhancementMultiplier).toLocaleString()}</b></span><span>幸運值 <b>{item.luckyValue || 0}/100</b></span></div>
          <div className="smithy-item-preview-lines">{equipmentDetailLines({ ...item, enhanceBonuses: itemEnhancementBonuses }).filter((line) => !line.startsWith('強化 +')).slice(0, 6).map((line) => <em key={line}>{line}</em>)}</div>
          {nextMilestone && <div className="smithy-milestone-guide"><strong>下一里程碑：+{nextMilestone}</strong><small>每種契印機率 33.3%，數值範圍如下：</small>{enhancementMilestoneOptions(nextMilestone).map((option) => <span key={option.id}><b>{option.name}</b>・{option.text} +{option.min}%～{option.max}%・{(option.chance * 100).toFixed(1)}%</span>)}</div>}
        </article>}
      </div> : <p>主角 Lv.20 後建造鐵匠鋪即可使用。</p>}
    </section>
    <section className="territory-smithy equipment-fusion" aria-label="裝備合成工坊">
      <h3>商團工坊・裝備合成</h3>
      <p>以 5 件同名稱、同品質、同部位的背包裝備合成為下一階品質，產出名稱與部位完全不變。白→綠為保底；綠→藍、藍→紫、紫→金依序降低成功率，失敗時 5 件材料裝備會全部消失。已強化或已鑲嵌的裝備不可投入。</p>
      <div className="territory-smithy-controls fusion-controls">
        <label>材料品質<select value={fusionRarity} onChange={(event) => { setFusionRarity(event.target.value as FusionSourceRarity); setFusionItems([]); }}>
          {EQUIPMENT_FUSION_RECIPES.map((entry) => <option key={entry.sourceRarity} value={entry.sourceRarity}>{FUSION_RARITY_LABEL[entry.sourceRarity]} → {FUSION_RARITY_LABEL[entry.targetRarity]}・成功 {Math.round(entry.successRate * 100)}%</option>)}
        </select></label>
        <span>已選 {selectedFusionItems.length}/{recipe.ingredientCount} 件・成功率 {Math.round(recipe.successRate * 100)}%</span>
        <button type="button" disabled={!autoFusionItems.length} onClick={() => setFusionItems(autoFusionItems.map((entry) => entry.uid))}>自動選取 5 件</button>
        <button type="button" className="fusion-submit" disabled={!bulkItemCount} onClick={confirmFusion}>一鍵合成全部 {recipe.targetRarity}品質</button>
      </div>
      {fusionCandidates.length ? <div className="fusion-item-grid">
        {fusionCandidates.map((entry) => <button key={entry.uid} type="button" disabled={Boolean(selectedFusionKey && selectedFusionKey !== fusionItemKey(entry))} className={selectedFusionItems.includes(entry.uid) ? "selected" : ""} aria-pressed={selectedFusionItems.includes(entry.uid)} onClick={() => toggleFusionItem(entry.uid)}>
          <strong>{entry.name}</strong><small>{entry.rarity}・{entry.slot}</small>
        </button>)}
      </div> : <p className="fusion-empty">沒有可投入的{fusionRarity}裝備。請準備未強化、未鑲嵌的背包裝備。</p>}
    </section>
  </div>;
}
