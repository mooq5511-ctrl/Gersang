import type { GameStateSetter } from './game-controller-types';
import { makeUid as uid } from "./game-equipment-factory";
import { forgeThunderItemAction } from "./game-inventory-actions";
import { appendGameLog as addLog } from "./game-runtime-actions";
import './gersang-archive.css';
import { gersangItemArt } from './gersang-visuals';
import { craftRestaurantFood,upgradeBuilding,type BuildingId } from './guild-territory';
import { addInventoryItem } from './inventory-layout';
import { THUNDER_FORGE_ITEMS,makeMythicEquipment,type MythicSet,type ThunderForgeId } from './mythic-forge';
import './quest-journal.css';
import './relic-dungeon.css';

type Context = {
  setGame: GameStateSetter;
  setNotice: (notice: string) => void;
};

export function createTerritoryController({ setGame, setNotice }: Context) {
function upgradeTerritoryBuilding(id: BuildingId) {
    setGame(previous => { const result = upgradeBuilding(previous, id); if (result.error) setNotice(result.error); else if (id === 'waystation' && previous.territory.buildings.waystation === 0) setNotice('驛站建成！放置金錢與信用收益 +2%。下一步：準備第一件綠裝。'); return result.game; });
  }

function forgeThunderSet(id: ThunderForgeId) {
    setGame(previous => forgeThunderItemAction(previous, id, uid, gersangItemArt, addLog, setNotice));
  }

function redeemWandererSet(set: Extract<MythicSet,'azure'|'chiyou'|'amaterasu'>) {
    const pieces=Object.values(THUNDER_FORGE_ITEMS).filter(recipe=>recipe.set===set);
    const setName={azure:'青龍',chiyou:'蚩尤',amaterasu:'天照'}[set];
    setGame(previous=>{
      if(previous.newbieCoins<1000){setNotice('新手兌換銅錢不足，需要 1,000 枚。');return previous;}
      let inventory=previous.inventory;
      for(const recipe of pieces){
        const item=makeMythicEquipment(recipe.id,uid(`wanderer-${recipe.id}`),gersangItemArt(recipe.slot),'平行世界流浪商團');
        inventory=addInventoryItem(inventory,item).inventory;
      }
      setNotice(`已兌換完整 T10 ${setName}套裝。`);
      return {...previous,newbieCoins:previous.newbieCoins-1000,inventory,logs:addLog(previous.logs,`平行世界流浪商團：兌換完整「T10 ${setName}套裝」。`)};
    });
  }

function craftTerritoryRestaurantFood(recipeId: string) {
    setGame(previous => {
      const result = craftRestaurantFood(previous, recipeId);
      if (result.error) setNotice(result.error);
      return result.game;
    });
  }

function redeemWandererGinsengChickenSoup() { redeemWandererSoup('ginseng-chicken-soup', '蔘雞湯', 50, 0.3); }

function redeemWandererBlackBoneChickenSoup() { redeemWandererSoup('black-bone-chicken-soup', '烏骨雞湯', 30, 0.5); }

function redeemWandererSoup(medicineId: string, name: string, amount: number, hpPercent: number) {
    setGame(previous => {
      if (previous.newbieCoins < 100) { setNotice('新手兌換銅錢不足，需要 100 枚。'); return previous; }
      setNotice('已兌換' + name + ' ×' + amount + '；每份可恢復主角與出戰傭兵 ' + Math.round(hpPercent * 100) + '% 最大 HP。');
      return { ...previous, newbieCoins: previous.newbieCoins - 100, medicines: { ...previous.medicines, [medicineId]: (previous.medicines[medicineId] || 0) + amount }, logs: addLog(previous.logs, '平行世界流浪商團：兌換' + name + ' ×' + amount + '。') };
    });
  }

function redeemWandererChickenSoup() {
    setGame(previous => {
      if (previous.newbieCoins < 100) { setNotice('新手兌換銅錢不足，需要 100 枚。'); return previous; }
      const amount = 100;
      setNotice('已兌換雞湯 ×100；每份可恢復主角與出戰傭兵 10% 最大 HP。');
      return { ...previous, newbieCoins: previous.newbieCoins - 100, medicines: { ...previous.medicines, 'chicken-soup': (previous.medicines['chicken-soup'] || 0) + amount }, logs: addLog(previous.logs, '平行世界流浪商團：兌換雞湯 ×100。') };
    });
  }
  return { upgradeTerritoryBuilding, forgeThunderSet, redeemWandererSet, craftTerritoryRestaurantFood, redeemWandererGinsengChickenSoup, redeemWandererBlackBoneChickenSoup, redeemWandererSoup, redeemWandererChickenSoup };
}
