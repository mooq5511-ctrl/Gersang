import { positionInventory } from './inventory-layout';
import { type EquipmentSlot } from './equipment-slots';
import { type WearableBase } from './wearable-catalog';
import { OfficialEquipment } from './v17-content';
import { combatStats } from './vitals-engine';
import { MATERIAL_BUY_PRICES, type VillageWeaponId } from './village-exchange';
import { medicineCatalog, SHOP_QUALITY, WEAPON_SHOP_QUALITY } from './game-config';
import { grantXp, unitPower } from './game-progression';
import { formatGameNumber as format } from './game-display';
import { appendGameLog as addLog } from './game-runtime-actions';
import {
  applyShopQuality,
  makeOfficialEquipment,
  makeUid as uid,
  rollEquipment,
  rollRelicEquipment,
  rollShopQuality,
} from './game-equipment-factory';
import {
  buyMaterialAction,
  buyMedicineAction,
  consumeMedicineAction,
  depositWarehouseItemAction,
  equipInventoryItemAction,
  forgeVillageWeaponAction,
  fuseAllInventoryEquipmentAction,
  openAncientCoinBoxAction,
  purchaseEquipmentAction,
  purchaseEquipmentBatchAction,
  purchaseTierEquipmentAction,
  sellAllInventoryEquipmentAction,
  sellAllMaterialsAction,
  sellInventoryEquipmentAction,
  sellMaterialAction,
  smeltLowRarityEquipmentAction,
  socketGemAction,
  unequipInventoryItemAction,
  withdrawWarehouseItemAction,
} from './game-inventory-actions';
import { fusionItemKey, type FusionSourceRarity } from './equipment-fusion';
import { tierEquipmentPrice, type TierEquipment } from './tier-equipment';
import { type Equipment, type GameState } from './game-state';
import { enhanceEquipment, warehouseLimit } from './guild-territory';
import type { WorldCity } from './v15-data';
import type { Dispatch, SetStateAction } from 'react';
import type {
  GameStateSetter,
  EquipmentEnhanceFeedback,
} from './game-controller-types';

type Context = {
  selectedUid: string;
  game: GameState;
  setNotice: (message: string) => void;
  setEquipmentPulseUid: Dispatch<SetStateAction<string | null>>;
  setGame: GameStateSetter;
  flashShopPurchase: (key: string) => void;
  currentCity: WorldCity;
  sharedWarehouse: Equipment[];
  setSharedWarehouse: Dispatch<SetStateAction<Equipment[]>>;
  setEnhanceFeedback: Dispatch<SetStateAction<EquipmentEnhanceFeedback | null>>;
  gemSlot: EquipmentSlot;
};

/** Bind UI feedback and the current render snapshot to the existing game actions. */
export function createInventoryController({
  selectedUid,
  game,
  setNotice,
  setEquipmentPulseUid,
  setGame,
  flashShopPurchase,
  currentCity,
  sharedWarehouse,
  setSharedWarehouse,
  setEnhanceFeedback,
  gemSlot,
}: Context) {
  function equipItem(
    itemUid: string,
    requestedSlot?: EquipmentSlot,
    targetUid = selectedUid,
  ) {
    const preview = equipInventoryItemAction(
      game,
      itemUid,
      requestedSlot,
      targetUid,
      addLog,
    );
    const before =
      targetUid === 'hero'
        ? game.hero
        : game.mercs.find((unit) => unit.uid === targetUid);
    const after =
      targetUid === 'hero'
        ? preview.hero
        : preview.mercs.find((unit) => unit.uid === targetUid);
    if (before && after && before !== after) {
      const powerGain = unitPower(after) - unitPower(before);
      const beforeCombat = combatStats(before),
        afterCombat = combatStats(after);
      const attackGain = afterCombat.attack - beforeCombat.attack;
      const defenseGain = afterCombat.defense - beforeCombat.defense;
      const changes = [
        attackGain && `攻擊 ${attackGain > 0 ? '+' : ''}${format(attackGain)}`,
        defenseGain &&
          `防禦 ${defenseGain > 0 ? '+' : ''}${format(defenseGain)}`,
        powerGain && `戰力 ${powerGain > 0 ? '+' : ''}${format(powerGain)}`,
      ].filter(Boolean);
      if (changes.length) setNotice(`裝備生效：${changes.join('・')}`);
      setEquipmentPulseUid(targetUid);
      window.setTimeout(
        () =>
          setEquipmentPulseUid((current) =>
            current === targetUid ? null : current,
          ),
        900,
      );
    }
    setGame((previous) =>
      equipInventoryItemAction(
        previous,
        itemUid,
        requestedSlot,
        targetUid,
        addLog,
      ),
    );
  }

  function sellLoot(itemName: string) {
    setGame((previous) =>
      sellMaterialAction(previous, itemName, addLog, format),
    );
  }

  function sellEveryLoot() {
    setGame((previous) => sellAllMaterialsAction(previous, addLog, format));
  }

  function buyLootMaterial(itemName: string) {
    const price = MATERIAL_BUY_PRICES[itemName] || 0;
    if (price > 0 && game.gold >= price)
      flashShopPurchase(`material:${itemName}`);
    setGame((previous) =>
      buyMaterialAction(previous, itemName, addLog, format, setNotice),
    );
  }

  function buyExchangeUpgrade(id: VillageWeaponId) {
    setGame((previous) => forgeVillageWeaponAction(previous, id, addLog));
  }

  function craftRelicEquipment() {
    const materialCost = 12;
    const shardCost = 2;
    const goldCost = 15000;
    const materials = game.materials['遺跡材料'] || 0;
    const shards = game.materials['遺跡碎片'] || 0;
    if (
      game.gold < goldCost ||
      materials < materialCost ||
      shards < shardCost
    ) {
      setNotice(
        `遺跡鍛造需要 ${goldCost.toLocaleString('zh-TW')} 兩、遺跡材料 ${materialCost}、遺跡碎片 ${shardCost}。`,
      );
      return;
    }
    const item = rollRelicEquipment(
      Math.max(1, game.relicDungeon?.floor || 1),
      Math.random,
      true,
    );
    setGame((previous) => {
      const previousMaterials = previous.materials['遺跡材料'] || 0;
      const previousShards = previous.materials['遺跡碎片'] || 0;
      if (
        previous.gold < goldCost ||
        previousMaterials < materialCost ||
        previousShards < shardCost
      )
        return previous;
      return {
        ...previous,
        gold: previous.gold - goldCost,
        inventory: positionInventory([...previous.inventory, item]),
        materials: {
          ...previous.materials,
          遺跡材料: previousMaterials - materialCost,
          遺跡碎片: previousShards - shardCost,
        },
        logs: addLog(previous.logs, `遺跡鍛造完成：${item.name}。`),
      };
    });
    setNotice(`遺跡鍛造完成：${item.name}，已放入背包。`);
  }

  function sellInventoryEquipment(itemUid: string) {
    setGame((previous) =>
      sellInventoryEquipmentAction(previous, itemUid, addLog, format),
    );
  }

  function sellEveryInventoryEquipment() {
    setGame((previous) =>
      sellAllInventoryEquipmentAction(previous, addLog, format),
    );
  }

  function smeltLowRarityEquipment() {
    setGame((previous) =>
      smeltLowRarityEquipmentAction(previous, Math.random, addLog, setNotice),
    );
  }

  function unequipItem(slot: EquipmentSlot, targetUid = selectedUid) {
    setGame((previous) =>
      unequipInventoryItemAction(previous, slot, targetUid, addLog),
    );
  }

  function buyWearable(base: WearableBase, quantity = 1) {
    const price = Math.floor(base.price * currentCity.priceFactor);
    if (game.gold >= price * quantity) flashShopPurchase(`wearable:${base.id}`);
    setGame((previous) => {
      return purchaseEquipmentBatchAction(previous, quantity, price, base.name, () => {
        const baseItem: Equipment = {
          ...base,
          uid: uid(base.id),
          enhance: 0,
          rarity: '普通',
          magic: [],
          requiredLevel: 1,
          bonus: { str: 0, agi: 0, intel: 0, vit: 0 },
          resist: { physical: 0, magic: 0 },
        };
        return applyShopQuality(baseItem, rollShopQuality(WEAPON_SHOP_QUALITY));
      }, addLog, setNotice);
    });
  }

  function buyMagicEquipment() {
    const cost = 12000;
    if (game.gold >= cost) flashShopPurchase('magic-equipment');
    setGame((previous) => {
      const item = applyShopQuality(rollEquipment(previous.stage, true));
      return purchaseEquipmentAction(
        previous,
        item,
        cost,
        '購入附魔裝備「' +
          item.name +
          '」・品質倍率 x' +
          SHOP_QUALITY[item.rarity].multiplier +
          '。',
        addLog,
        setNotice,
      );
    });
  }

  function buyOfficialItem(record: OfficialEquipment, price = record.price, quantity = 1) {
    if (game.gold >= price * quantity) flashShopPurchase(`official:${record.id}`);
    setGame((previous) => {
      return purchaseEquipmentBatchAction(previous, quantity, price, record.name, () => makeOfficialEquipment(record), addLog, setNotice);
    });
  }

  function depositToWarehouse(itemUid: string) {
    const result = depositWarehouseItemAction(
      game,
      sharedWarehouse,
      itemUid,
      warehouseLimit(game.territory),
      addLog,
    );
    if (result.error) {
      setNotice(result.error);
      return;
    }
    if (result.game === game) return;
    setGame(result.game);
    setSharedWarehouse(result.warehouse);
  }

  function withdrawFromWarehouse(itemUid: string) {
    const result = withdrawWarehouseItemAction(
      game,
      sharedWarehouse,
      itemUid,
      addLog,
    );
    if (result.game === game) return;
    setGame(result.game);
    setSharedWarehouse(result.warehouse);
  }

  function buyTierEquipment(spec: TierEquipment, quantity = 1) {
    const itemUid = uid(spec.id);
    const price = Math.floor(
      tierEquipmentPrice(spec) * currentCity.priceFactor,
    );
    if (game.hero.level >= spec.requiredLevel && game.gold >= price * quantity)
      flashShopPurchase(`tier:${spec.id}`);
    setGame((previous) =>
      purchaseTierEquipmentAction(
        previous,
        spec.id,
        currentCity.priceFactor,
        currentCity.name,
        itemUid,
        addLog,
        setNotice,
        quantity,
      ),
    );
  }

  function enhanceTerritoryEquipment(itemUid: string) {
    const roll = Math.random();
    const result = enhanceEquipment(game, itemUid, roll);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    const before = game.inventory.find((item) => item.uid === itemUid);
    const after = result.game.inventory.find((item) => item.uid === itemUid);
    if (before && after) {
      const success = after.enhance > before.enhance;
      setEnhanceFeedback({
        uid: itemUid,
        name: before.name,
        success,
        level: after.enhance,
      });
      window.setTimeout(
        () =>
          setEnhanceFeedback((current) =>
            current?.uid === itemUid ? null : current,
          ),
        1300,
      );
    }
    setGame(result.game);
  }

  function fuseAllTerritoryEquipment(sourceRarity: FusionSourceRarity) {
    setGame((previous) => {
      const next = fuseAllInventoryEquipmentAction(
        previous,
        sourceRarity,
        Math.random,
        addLog,
        setNotice,
      );
      const result = next.inventory.find(
        (item) => !previous.inventory.some((old) => old.uid === item.uid),
      );
      const base =
        result &&
        previous.inventory.find(
          (item) => fusionItemKey(item) === fusionItemKey(result),
        );
      if (sourceRarity === '普通' && result && base)
        setNotice(
          `白→綠合成成功：${result.name}｜基礎攻擊 ${base.atk} → ${result.atk}・防禦 ${base.def} → ${result.def}・生命 ${base.hp} → ${result.hp}。前往背包穿戴。`,
        );
      return next;
    });
  }

  function buyMedicine(medicineId: string, requestedAmount = 1) {
    const medicine = medicineCatalog.find((entry) => entry.id === medicineId);
    const unitPrice = medicine
      ? Math.floor(medicine.price * currentCity.priceFactor)
      : 0;
    if (unitPrice > 0 && game.gold >= unitPrice)
      flashShopPurchase(`medicine:${medicineId}`);
    setGame((previous) =>
      buyMedicineAction(
        previous,
        medicineId,
        requestedAmount,
        currentCity.priceFactor,
        currentCity.name,
        addLog,
        setNotice,
      ),
    );
  }

  function openAncientCoinBox(amount = 1) {
    const requested = Math.max(1, Math.floor(amount));
    const rolls = Array.from({ length: requested }, () => {
      const rareRoll = Math.random();
      return {
        coins: 1 + Math.floor(Math.random() * 10),
        fusionCores: Math.random() < 0.05 ? 1 : 0,
        rareReward:
          rareRoll < 0.0001
            ? '大吉(帥)'
            : rareRoll < 0.0002
              ? '大吉(好)'
              : rareRoll < 0.0003
                ? '大吉(者)'
                : rareRoll < 0.0004
                  ? '大吉(作)'
                  : null,
      };
    });
    setGame((previous) =>
      openAncientCoinBoxAction(previous, requested, rolls, addLog),
    );
  }

  function consumeMedicine(medicineId: string) {
    setGame((previous) => {
      const next = consumeMedicineAction(
        previous,
        medicineId,
        false,
        addLog,
        grantXp,
      );
      if (next === previous) {
        const medicine = medicineCatalog.find(
          (entry) => entry.id === medicineId,
        );
        if (medicine) setNotice('目前沒有「' + medicine.name + '」。');
      }
      return next;
    });
  }

  function socketGem(gemId: string, grade: number, requestedAmount = 1) {
    setGame((previous) =>
      socketGemAction(
        previous,
        selectedUid,
        gemSlot,
        gemId,
        grade,
        requestedAmount,
        addLog,
        setNotice,
      ),
    );
  }

  return {
    equipItem,
    sellLoot,
    sellEveryLoot,
    buyLootMaterial,
    buyExchangeUpgrade,
    craftRelicEquipment,
    sellInventoryEquipment,
    sellEveryInventoryEquipment,
    smeltLowRarityEquipment,
    unequipItem,
    buyWearable,
    buyMagicEquipment,
    buyOfficialItem,
    depositToWarehouse,
    withdrawFromWarehouse,
    buyTierEquipment,
    enhanceTerritoryEquipment,
    fuseAllTerritoryEquipment,
    buyMedicine,
    openAncientCoinBox,
    consumeMedicine,
    socketGem,
  };
}
