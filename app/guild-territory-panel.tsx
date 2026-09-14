import { useState } from "react";
import type { Equipment } from "./game-state";
import {
  BUILDINGS, BUILDING_IDS, TERRITORY_UNLOCK_LEVEL, buildingCost, enhancementChance,
  enhancementCost, territoryBonus, territoryHealInterval, warehouseLimit,
  type BuildingId, type GuildTerritory,
} from "./guild-territory";

type Props = {
  territory: GuildTerritory;
  heroLevel: number;
  gold: number;
  inventory: Equipment[];
  upgrade: (id: BuildingId) => void;
  enhance: (itemUid: string) => void;
};

export function GuildTerritoryPanel({ territory, heroLevel, gold, inventory, upgrade, enhance }: Props) {
  const [selectedItem, setSelectedItem] = useState("");
  const item = inventory.find((entry) => entry.uid === selectedItem);
  const open = heroLevel >= TERRITORY_UNLOCK_LEVEL;
  const smithyOpen = territory.buildings.smithy > 0;

  return <div className="guild-territory-panel">
    <p className="territory-intro">主角 Lv.{TERRITORY_UNLOCK_LEVEL} 開放經營。建造與升級立即完成，永久加成按百分比直接相加；每名角色各自經營領地。</p>
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
      <p>僅可強化背包裝備，最高 +10。成功後裝備能力提高；失敗只消耗金錢，不損壞裝備。旗幟與鐵匠鋪成功率加成相加，上限 100%。</p>
      {smithyOpen ? <div className="territory-smithy-controls">
        <label>選擇裝備<select value={selectedItem} onChange={(event) => setSelectedItem(event.target.value)}><option value="">請選擇背包裝備</option>{inventory.map((entry) => <option value={entry.uid} key={entry.uid}>{entry.name} +{entry.enhance}</option>)}</select></label>
        {item && <span>成功率 {Math.round(enhancementChance(territory, item) * 1000) / 10}%・花費 {enhancementCost(item).toLocaleString()} 兩</span>}
        <button type="button" disabled={!item || item.enhance >= 10 || gold < enhancementCost(item)} onClick={() => item && enhance(item.uid)}>強化裝備</button>
      </div> : <p>主角 Lv.50 後建造鐵匠鋪即可使用。</p>}
    </section>
  </div>;
}
