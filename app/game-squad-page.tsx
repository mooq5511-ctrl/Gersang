"use client";
import { TabsContent } from "@/components/ui/tabs";
import { CaravanStatus } from './caravan-status';
import { dungeonBusy,freshDungeon,teleportDungeon } from './dungeon-engine';
import { WorldMapNavigation } from './dungeon-panel';
import { itemKind } from './equipment-slots';
import { xpNeed } from "./game-progression";
import { appendGameLog as addLog,enterGameInnAction as enterGameInn } from "./game-runtime-actions";
import { promoteMercenary } from "./game-squad-actions";
import { type Unit } from "./game-state";
import { ACTIVE_MERCENARY_LIMIT } from './guild-migration';
import { heroPersonalPower,heroWeightLimit } from './hero-rules';
import { merchantMercenaries } from './mercenary-roster';
import type { GameViewModel } from './use-game-controller';
import { MATERIAL_PRICES } from './village-exchange';
import { vitalStats } from "./vitals-engine";

type Props = Pick<GameViewModel, "addStat" | "availableRestingMercs" | "craftTerritoryRestaurantFood" | "currentCity" | "cycleUnitPosition" | "displayedPower" | "enhanceFeedback" | "enhanceTerritoryEquipment" | "equipItem" | "equipmentPulseUid" | "fuseAllTerritoryEquipment" | "game" | "openAncientCoinBox" | "promoteGuildRank" | "recruitMerchant" | "redeemWandererBlackBoneChickenSoup" | "redeemWandererChickenSoup" | "redeemWandererGinsengChickenSoup" | "redeemWandererSet" | "sellEveryInventoryEquipment" | "sellEveryLoot" | "sellInventoryEquipment" | "sellLoot" | "setGame" | "setSelectedUid" | "smeltLowRarityEquipment" | "squadDestination" | "storeMercenary" | "toggleActive" | "unequipItem" | "upgradeGuildSkill" | "upgradeTerritoryBuilding" | "withdrawRestingMercenary">;

export function GameSquadPage({ addStat, availableRestingMercs, craftTerritoryRestaurantFood, currentCity, cycleUnitPosition, displayedPower, enhanceFeedback, enhanceTerritoryEquipment, equipItem, equipmentPulseUid, fuseAllTerritoryEquipment, game, openAncientCoinBox, promoteGuildRank, recruitMerchant, redeemWandererBlackBoneChickenSoup, redeemWandererChickenSoup, redeemWandererGinsengChickenSoup, redeemWandererSet, sellEveryInventoryEquipment, sellEveryLoot, sellInventoryEquipment, sellLoot, setGame, setSelectedUid, smeltLowRarityEquipment, squadDestination, storeMercenary, toggleActive, unequipItem, upgradeGuildSkill, upgradeTerritoryBuilding, withdrawRestingMercenary }: Props) {
return (<TabsContent value="squad" className="tab-panel">
          <CaravanStatus key={squadDestination.key} initialWindow={squadDestination.window} territory={game.territory} upgradeBuilding={upgradeTerritoryBuilding} enhanceEquipment={enhanceTerritoryEquipment} enhanceFeedback={enhanceFeedback} equipmentPulseUid={equipmentPulseUid} fuseAllEquipment={fuseAllTerritoryEquipment} busy={dungeonBusy(game.dungeon)} hero={game.hero} mercs={game.mercs} restingMercs={availableRestingMercs} active={game.active} toggleActive={toggleActive} storeMercenary={storeMercenary} withdrawRestingMercenary={withdrawRestingMercenary} gold={game.gold} credit={game.credit} creditXp={game.creditXp} creditLevel={game.creditLevel} guildRank={game.guildRank} promoteGuildRank={promoteGuildRank} guildSkillPoints={game.guildSkillPoints} guildSkills={game.guildSkills} upgradeGuildSkill={upgradeGuildSkill} newbieCoins={game.newbieCoins} redeemWandererSet={redeemWandererSet} redeemWandererChickenSoup={redeemWandererChickenSoup} redeemWandererGinsengChickenSoup={redeemWandererGinsengChickenSoup} redeemWandererBlackBoneChickenSoup={redeemWandererBlackBoneChickenSoup}
            navigation={<WorldMapNavigation state={game.dungeon||freshDungeon()} level={game.hero.level} power={heroPersonalPower(game.hero)} travel={id=>{const now=Date.now(),spawnRoll=Math.random();setGame(previous=>{
              const old=previous.dungeon||freshDungeon();
              const deployed=[previous.hero,...previous.mercs.filter(unit=>previous.active.slice(0,ACTIVE_MERCENARY_LIMIT).includes(unit.uid))];
              if(deployed.every(unit=>vitalStats(unit).hp<=0))return enterGameInn(previous,now,'出戰隊伍生命值不足，已自動返回漢陽客棧。',{...freshDungeon(),pauseAt:old.pauseAt||now});
              const dungeon=teleportDungeon(old,previous.hero.level,heroPersonalPower(previous.hero),now,id,spawnRoll);
              return dungeon===old?previous:{...previous,dungeon,logs:addLog(previous.logs,dungeon.logs[0])};
            });}}/>}
            battle={null}
             inventory={game.inventory} materials={game.materials} materialPrices={MATERIAL_PRICES} medicines={game.medicines} craftRestaurantFood={craftTerritoryRestaurantFood}
            equipSelected={(itemUid,targetUid)=>equipItem(itemUid,undefined,targetUid)} sellInventory={sellInventoryEquipment} sellAllInventory={sellEveryInventoryEquipment} smeltLowRarityEquipment={smeltLowRarityEquipment} sellMaterial={sellLoot} sellAllMaterials={sellEveryLoot} openAncientCoinBox={openAncientCoinBox} unequipHero={slot=>unequipItem(slot,'hero')} unequipEquipment={unequipItem} bagMessage={game.logs[0]||''}

            weight={[...game.inventory,...Object.values(game.hero.equip)].reduce((sum,item)=>sum+(item?({weapon:5,helm:3,armor:12,boots:3,ring:0.2,gloves:2,amulet:1,accessory:1}[itemKind(item.slot)]||1):0),0)}
            maxWeight={heroWeightLimit(game.hero)} cost={Math.floor(6000*currentCity.priceFactor)} power={unit=>displayedPower(unit as Unit)} xpNeed={xpNeed} select={setSelectedUid}
            cyclePosition={cycleUnitPosition}
            promote={(uid,targetTier)=>setGame(previous=>promoteMercenary(previous,uid,targetTier))}
            promotionItems={{fusionCores:game.fusionCores,soulStones:game.soulStones,awakeningStones:game.awakeningStones}}
            hire={()=>{ const index=Math.floor(Math.random()*merchantMercenaries.length); recruitMerchant(merchantMercenaries[index],index); }}
            allocate={addStat} />
        </TabsContent>);
}
