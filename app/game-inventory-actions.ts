import { buyMarketMaterial, sellAllMaterials, sellMaterial } from "./village-exchange";
import {warSeal} from './war-seals';
import { VILLAGE_WEAPONS, buyVillageWeapon, exchangeAttackBonus, type VillageWeaponId } from "./village-exchange";
import { sellAllEquipmentFromInventory, sellEquipmentFromInventory } from "./equipment-market";
import { addInventoryItem } from "./inventory-layout";
import { advanceEquipmentQuality, applyShopQuality, makeUid, rollEquipment, rollRelicEquipment, rollShopQuality } from "./game-equipment-factory";
import {v1Definition,v1RandomEquipmentTier,v1MagicEquipmentPrice,v1QualityMultiplier} from './equipment-v1-policy';
import { fusionBaseName, planEquipmentFusion, type FusionSourceRarity } from "./equipment-fusion";
import { THUNDER_FORGE_ITEMS, makeMythicEquipment, type ThunderForgeId } from "./mythic-forge";
import {hasEquipmentInvestment} from './equipment-processing';
import {gemSocketResult} from './gem-socket-quote';
import {relicCraftEquipmentLevel} from './relic-equipment-rewards';
import { compatibleSlots, equipFromInventory, unequipToInventory, type EquipmentSlot } from "./equipment-slots";
import { medicineCatalog, WEAPON_SHOP_QUALITY } from "./game-config";
import { officialGems } from "./v17-content";
import { normalizeVitals, recoverVitals, vitalStats } from "./vitals-engine";
import { AutoPotionManager, type AutoPotionSettings } from "./auto-potion-manager";
import { BattleLogManager } from "./battle-log-manager";
import type { Equipment, GameState, Hero, Unit } from "./game-state";
import { markHanyangEquipmentEquipped, markHanyangLootSold, markHanyangMedicinePurchased } from "./hanyang-prologue";
import { makeTierEquipment, tierEquipmentPrice, tierEquipmentShopCatalog } from "./tier-equipment";

type Log = (logs: string[], message: string) => string[];
type Format = (value: number) => string;

export const RELIC_CRAFT_COST=Object.freeze({gold:15000,materials:12,shards:2});
const AUTO_POTION_SHORTAGE_NOTICE = "補血藥不足，Auto Potion 已停止；購藥後需在戰鬥視窗重新勾選 Auto Potion。";

/** Commit a pre-sampled offer against the latest state, never announce a rejected craft. */
export function craftRelicEquipmentAction(state:GameState,item:Equipment,addLog:Log,notify:(message:string)=>void):GameState {
  const cost=RELIC_CRAFT_COST;
  const materials=state.materials['遺跡材料']||0,shards=state.materials['遺跡碎片']||0;
  if(!Number.isFinite(state.gold)||state.gold<cost.gold||!Number.isFinite(materials)||materials<cost.materials||!Number.isFinite(shards)||shards<cost.shards){
    notify(`遺跡鍛造需要 ${cost.gold.toLocaleString('zh-TW')} 兩、遺跡材料 ${cost.materials}、遺跡碎片 ${cost.shards}。`);
    return state;
  }
  const definition=v1Definition(item),tier=v1RandomEquipmentTier(relicCraftEquipmentLevel(state.hero.level,state.relicDungeon?.clearedRuns||0));
  if(!definition||!definition.id.startsWith('series-')||definition.level!==tier||item.requiredLevel!==tier||item.slot!==definition.slot||item.rarity==='普通'){
    notify('鍛造條件已變更，請重新確認後再試；未扣除資源。');return state;
  }
  if(state.inventory.some(entry=>entry.uid===item.uid)){
    notify('這件鍛造裝備已在背包中，未重複扣除資源。');return state;
  }
  const pickup=addInventoryItem(state.inventory,item);
  if(pickup.error){notify(pickup.error);return state;}
  const message=`遺跡鍛造完成：${item.name}。`;
  notify(`遺跡鍛造完成：${item.name}，已放入背包。`);
  return {...state,gold:state.gold-cost.gold,inventory:pickup.inventory,
    materials:{...state.materials,遺跡材料:materials-cost.materials,遺跡碎片:shards-cost.shards},
    logs:addLog(state.logs,message),battleLogs:BattleLogManager.addLog(state.battleLogs,message,'reward')};
}

export function fuseAllInventoryEquipmentAction(state: GameState, sourceRarity: FusionSourceRarity, roll: () => number, addLog: Log, notify: (message: string) => void): GameState {
  if (state.hero.level < 20) { notify('商團領地在主角 Lv.20 開放。'); return state; }
  const {entries:batchesByIdentity, consumedCount, batches, fee} = planEquipmentFusion(state.inventory, sourceRarity);
  if (!consumedCount) { notify(`新版需 3 件、舊版需 5 件同款、同品質、同部位的${sourceRarity}裝備；新舊版不可混合。`); return state; }
  if (!Number.isSafeInteger(fee) || fee < 0 || state.gold < fee) { notify(`合成資金不足，共需 ${fee.toLocaleString('zh-TW')} 兩；未消耗任何裝備。`); return state; }
  const consumed = new Set(batchesByIdentity.flatMap((entry) => entry.items.map((item) => item.uid)));
  let inventory = state.inventory.filter((item) => !consumed.has(item.uid));
  let successes = 0;
  for (const { template, recipe, batches:groupBatches } of batchesByIdentity) for (let index = 0; index < groupBatches; index += 1) {
    if (recipe.successRate < 1 && roll() >= recipe.successRate) continue;
    const result = { ...advanceEquipmentQuality({ ...template, uid: makeUid(`fusion-${template.slot}`), name: fusionBaseName(template.name), enhance: 0, socketGem: undefined }, recipe.targetRarity), source: `商團駐地・${fusionBaseName(template.name)}批次裝備合成` };
    inventory = addInventoryItem(inventory, result).inventory;
    successes += 1;
  }
  const failures = batches - successes;
  const message = `商團駐地批次合成${sourceRarity}裝備：投入 ${consumedCount} 件，共 ${batches} 組，支付 ${fee.toLocaleString('zh-TW')} 兩；成功 ${successes} 組、失敗 ${failures} 組。`;
  notify(message);
  return { ...state, gold:state.gold-fee, inventory, logs: addLog(state.logs, message) };
}

const RELIC_SMELT_VALUE: Partial<Record<Equipment["rarity"], number>> = { 普通: 5, 稀有: 15 };

/** 對應遺跡原型的低階裝備熔煉，僅處理尚在背包內、尚未穿戴的裝備。 */
export function smeltLowRarityEquipmentAction(state: GameState, roll: () => number, addLog: Log, notify: (message: string) => void): GameState {
  const lowRarity = state.inventory.filter(item => item.rarity === "普通" || item.rarity === "稀有");
  const candidates = lowRarity.filter(item => !hasEquipmentInvestment(item));
  const protectedCount = lowRarity.length-candidates.length;
  if (!candidates.length) {
    const message = protectedCount ? `已保留 ${protectedCount} 件強化、鑲嵌或有淬鍊進度的裝備；沒有可熔煉的普通或稀有裝備。` : "背包內沒有可熔煉的普通或稀有裝備。";
    notify(message);
    return { ...state, logs: addLog(state.logs, message) };
  }
  const gained = candidates.reduce((sum, item) => sum + (RELIC_SMELT_VALUE[item.rarity] || 0), 0);
  let inventory = state.inventory.filter(item => !candidates.some(candidate => candidate.uid === item.uid));
  let bonusText = "";
  if (candidates.length >= 5 && roll() < 0.35) {
    const bonus = rollRelicEquipment(relicCraftEquipmentLevel(state.hero.level,state.relicDungeon?.clearedRuns||0), roll, true);
    inventory = addInventoryItem(inventory, bonus).inventory;
    bonusText = `熔煉共鳴取得「${bonus.name}」；`;
  }
  const protectionText = protectedCount ? `已保留 ${protectedCount} 件投資裝備。` : "";
  notify(`熔煉 ${candidates.length} 件低階裝備，獲得遺跡魔晶 +${gained}。${bonusText}${protectionText}`);
  return { ...state, inventory, materials: { ...state.materials, "遺跡魔晶": (state.materials["遺跡魔晶"] || 0) + gained }, logs: addLog(state.logs, `遺跡熔煉爐處理 ${candidates.length} 件低階裝備，獲得遺跡魔晶 +${gained}。${bonusText}${protectionText}`) };
}

export function sellMaterialAction(state: GameState, itemName: string, addLog: Log, format: Format): GameState {
  if(warSeal(itemName))return {...state,logs:addLog(state.logs,'完整兵符保留供轉職使用，不可出售。')};
  const result = sellMaterial(state.materials, state.gold, itemName);
  return result.error ? { ...state, logs: addLog(state.logs, result.error) } : markHanyangLootSold({ ...state, materials: result.materials, gold: result.gold, logs: addLog(state.logs, `交易所售出「${itemName}」×1，獲得 ${format(result.earned)} 兩。`) });
}

export function sellAllMaterialsAction(state: GameState, addLog: Log, format: Format): GameState {
  const result = sellAllMaterials(state.materials, state.gold);
  if (!result.count) return { ...state, logs: addLog(state.logs, "目前沒有可變賣的怪物素材。") };
  return markHanyangLootSold({ ...state, materials: result.materials, gold: result.gold, logs: addLog(state.logs, `交易所完成全部變賣，獲得 ${format(result.earned)} 兩。`) });
}

export function buyMaterialAction(state: GameState, itemName: string, addLog: Log, format: Format, notify?: (message: string) => void): GameState {
  const result = buyMarketMaterial(state.materials, state.gold, itemName);
  if (result.error) { notify?.(result.error); return { ...state, logs: addLog(state.logs, result.error) }; }
  notify?.(`購買成功：「${itemName}」×1，支付 ${format(result.spent)} 兩。`);
  return { ...state, materials: result.materials, gold: result.gold, logs: addLog(state.logs, `交易所買入「${itemName}」×1，支付 ${format(result.spent)} 兩。`) };
}

export function sellInventoryEquipmentAction(state: GameState, itemUid: string, addLog: Log, format: Format): GameState {
  const result = sellEquipmentFromInventory(state.inventory, state.gold, itemUid);
  if (result.error || !result.item) return { ...state, logs: addLog(state.logs, result.error || "裝備出售失敗。") };
  return { ...state, inventory: result.inventory, gold: result.gold, logs: addLog(state.logs, `裝備商回收「${result.item.name}」，獲得 ${format(result.earned)} 兩。`) };
}

export function sellAllInventoryEquipmentAction(state: GameState, addLog: Log, format: Format): GameState {
  const result = sellAllEquipmentFromInventory(state.inventory, state.gold);
  if (!result.count) return { ...state, logs: addLog(state.logs, "背包內沒有可出售的裝備。") };
  return { ...state, inventory: result.inventory, gold: result.gold, logs: addLog(state.logs, `裝備商回收背包裝備 ${result.count} 件，獲得 ${format(result.earned)} 兩。`) };
}

export function forgeVillageWeaponAction(state: GameState, id: VillageWeaponId, addLog: Log): GameState {
  const result = buyVillageWeapon(state.gold, state.exchangePurchases, id);
  if (result.error) return { ...state, logs: addLog(state.logs, result.error) };
  const good = VILLAGE_WEAPONS.find((item) => item.id === id)!;
  return { ...state, gold: result.gold, exchangePurchases: result.purchases, hero: { ...state.hero, flatAttackBonus: exchangeAttackBonus(result.purchases) }, logs: addLog(state.logs, `村莊鍛造「${good.name}」完成，主角永久攻擊 +${good.atkBonus}；下次價格提高 30%。`) };
}

export function forgeThunderItemAction(state: GameState, id: ThunderForgeId, uid: (prefix: string) => string, itemImage: (slot: EquipmentSlot) => string, addLog: Log, notify: (message: string) => void): GameState {
  const recipe = THUNDER_FORGE_ITEMS[id];
  if (!Object.entries(recipe.needs).every(([name, amount]) => (state.materials[name] || 0) >= amount)) { notify("鍛造材料不足。"); return state; }
  const materials = { ...state.materials }; for (const [name, amount] of Object.entries(recipe.needs)) materials[name] -= amount;
  const item = makeMythicEquipment(id,uid(`t10-${id}`),itemImage(compatibleSlots(recipe.slot)[0]),"神仙谷・雷霆祭壇");
  const pickup = addInventoryItem(state.inventory, item);
  if (pickup.error) { notify("背包已滿，無法完成鍛造。"); return state; }
  notify(`鍛造完成：${recipe.name}`);
  return { ...state, materials, inventory: pickup.inventory, logs: addLog(state.logs, `神仙谷鍛造完成「${recipe.name}」。`) };
}

export function purchaseEquipmentAction(state: GameState, item: Equipment, price: number, message: string, addLog: Log, notify: (message: string) => void): GameState {
  if (state.gold < price) { notify("裝備商店資金不足。"); return state; }
  notify(`購買成功：「${item.name}」×1，支付 ${price.toLocaleString("zh-TW")} 兩，已放入背包。`);
  return { ...state, gold: state.gold - price, inventory: [item, ...state.inventory], logs: addLog(state.logs, message) };
}

/** Check the whole order before charging or generating any independently identified items. */
export function purchaseMagicEquipmentAction(state:GameState,random:()=>number,addLog:Log,notify:(message:string)=>void):GameState {
  const level=state.hero.level,price=v1MagicEquipmentPrice(level);
  if(state.gold<price){notify(`附魔裝備需要 ${price.toLocaleString('zh-TW')} 兩。`);return state;}
  const rarity=rollShopQuality(WEAPON_SHOP_QUALITY,random);
  const item=applyShopQuality(rollEquipment(level,true,undefined,random),rarity);
  return purchaseEquipmentAction(state,item,price,`購入附魔裝備「${item.name}」・${rarity}品質 ×${v1QualityMultiplier(rarity)}，支付 ${price.toLocaleString('zh-TW')} 兩。`,addLog,notify);
}

/** Check the whole order before charging or generating any independently identified items. */
export function purchaseEquipmentBatchAction(state: GameState, quantity: number, unitPrice: number, name: string, createItem: (index: number) => Equipment, addLog: Log, notify: (message: string) => void): GameState {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) { notify('購買數量請選擇 1～100 件。'); return state; }
  const total = unitPrice * quantity;
  if (!Number.isSafeInteger(total) || total < 0) { notify('購買金額無效。'); return state; }
  if (state.gold < total) { notify(`資金不足：${quantity} 件共需 ${total.toLocaleString('zh-TW')} 兩，還差 ${(total - state.gold).toLocaleString('zh-TW')} 兩。`); return state; }
  const items = Array.from({ length: quantity }, (_, index) => createItem(index));
  const counts = new Map<Equipment['rarity'], number>();
  for (const item of items) counts.set(item.rarity, (counts.get(item.rarity) ?? 0) + 1);
  const quality = [...counts].map(([rarity, count]) => `${rarity} ${count} 件`).join('・');
  const message = `購買成功：「${name}」×${quantity}，支付 ${total.toLocaleString('zh-TW')} 兩，已放入背包。鑑定結果：${quality}。`;
  notify(message);
  return { ...state, gold: state.gold - total, inventory: [...items, ...state.inventory], logs: addLog(state.logs, message) };
}

/** Validates the temporary high-tier shop source independently of the shop UI. */
export function purchaseTierEquipmentAction(state: GameState, itemId: string, priceFactor: number, cityName: string, uid: string, addLog: Log, notify: (message: string) => void, quantity = 1): GameState {
  const spec = tierEquipmentShopCatalog.find((item) => item.id === itemId);
  if (!spec) return state;
  if (state.hero.level < spec.requiredLevel) { notify(`需要 Lv.${spec.requiredLevel} 才能購買「${spec.name}」。`); return state; }
  const price = Math.floor(tierEquipmentPrice(spec) * priceFactor);
  return purchaseEquipmentBatchAction(state, quantity, price, spec.name, index => {
    const item = makeTierEquipment(spec, index === 0 ? uid : `${uid}-${index}`, `${cityName}商店・過渡供應`);
    return applyShopQuality(item, rollShopQuality(WEAPON_SHOP_QUALITY));
  }, addLog, notify);
}

export function equipInventoryItemAction(state: GameState, itemUid: string, requestedSlot: EquipmentSlot | undefined, targetUid: string, addLog: Log): GameState {
  const target = targetUid === "hero" ? state.hero : state.mercs.find((unit) => unit.uid === targetUid);
  if (!target) return state;
  const result = equipFromInventory<Equipment, Unit | Hero>(target, state.inventory, itemUid, requestedSlot);
  if (result.error) return { ...state, logs: addLog(state.logs, result.error) };
  const unit = normalizeVitals(result.unit);
  const logs = addLog(state.logs, "已穿戴裝備，原部位裝備已交換回背包。");
  const equipped = targetUid === "hero"
    ? { ...state, firstGreenEquipped: state.firstGreenEquipped || Object.values(unit.equip).some(item => item && item.rarity !== '普通'), logs, inventory: result.inventory, hero: unit as Hero }
    : { ...state, firstGreenEquipped: state.firstGreenEquipped || Object.values(unit.equip).some(item => item && item.rarity !== '普通'), logs, inventory: result.inventory, mercs: state.mercs.map((old) => old.uid === targetUid ? unit : old) };
  return markHanyangEquipmentEquipped(equipped);
}

export function unequipInventoryItemAction(state: GameState, slot: EquipmentSlot, targetUid: string, addLog: Log): GameState {
  const target = targetUid === "hero" ? state.hero : state.mercs.find((unit) => unit.uid === targetUid);
  if (!target) return state;
  const result = unequipToInventory<Equipment, Unit | Hero>(target, state.inventory, slot);
  if (result.error) return { ...state, logs: addLog(state.logs, result.error) };
  const unit = normalizeVitals(result.unit);
  const logs = addLog(state.logs, "裝備已卸下並放入背包空位。");
  return targetUid === "hero"
    ? { ...state, logs, inventory: result.inventory, hero: unit as Hero }
    : { ...state, logs, inventory: result.inventory, mercs: state.mercs.map((old) => old.uid === targetUid ? unit : old) };
}

type GrantXp = <T extends Unit | Hero>(unit: T, amount: number) => T;

export function buyMedicineAction(state: GameState, medicineId: string, requestedAmount: number, priceFactor: number, cityName: string, addLog: Log, notify: (message: string) => void): GameState {
  const medicine = medicineCatalog.find((entry) => entry.id === medicineId);
  if (!medicine) return state;
  const price = Math.floor(medicine.price * priceFactor), amount = Math.max(1, Math.floor(requestedAmount) || 1), purchased = Math.min(amount, Math.floor(state.gold / price));
  if (purchased <= 0) { notify(`購買「${medicine.name}」的資金不足。`); return state; }
  const spent = price * purchased;
  notify(purchased < amount ? `購買完成：「${medicine.name}」×${purchased}，支付 ${spent.toLocaleString("zh-TW")} 兩（受資金限制）。` : `購買成功：「${medicine.name}」×${purchased}，支付 ${spent.toLocaleString("zh-TW")} 兩。`);
  return markHanyangMedicinePurchased({ ...state, gold: state.gold - price * purchased, medicines: { ...state.medicines, [medicine.id]: (state.medicines[medicine.id] || 0) + purchased }, logs: addLog(state.logs, `在${cityName}藥店購入「${medicine.name}」×${purchased}。`) }, medicine.id);
}

export function consumeMedicineAction(state: GameState, medicineId: string, automatic: boolean, addLog: Log, grantXp: GrantXp): GameState {
  const medicine = medicineCatalog.find((entry) => entry.id === medicineId);
  if (!medicine || (state.medicines[medicine.id] || 0) <= 0) return state;
  const hpRestore = "hpRestore" in medicine ? medicine.hpRestore : 0, mpRestore = "mpRestore" in medicine ? medicine.mpRestore : 0;
  return { ...state, medicines: { ...state.medicines, [medicine.id]: state.medicines[medicine.id] - 1 }, hero: recoverVitals(grantXp(state.hero, medicine.heroXp), hpRestore, mpRestore), mercs: state.mercs.map((unit) => state.active.includes(unit.uid) ? recoverVitals(grantXp(unit, medicine.mercXp), hpRestore, mpRestore) : unit), logs: addLog(state.logs, `${automatic ? "自動" : ""}使用「${medicine.name}」：${medicine.effect}。`) };
}

export function applyAutoMedicineAction(state: GameState, now: number, addLog: Log, grantXp: GrantXp): GameState {
  let next = state;
  const hpRate = vitalStats(next.hero).hp / Math.max(1, vitalStats(next.hero).maxHp) * 100;
  if (next.autoMedicine.healing > 0 && hpRate <= next.autoMedicine.healing && now - next.autoMedicineAt.healing >= 1000) {
    const after = consumeMedicineAction(next, "healing", true, addLog, grantXp);
    if (after !== next) next = { ...after, autoMedicineAt: { ...after.autoMedicineAt, healing: now } };
  }
  const mpRate = vitalStats(next.hero).mp / Math.max(1, vitalStats(next.hero).maxMp) * 100;
  if (next.autoMedicine.mana > 0 && mpRate <= next.autoMedicine.mana && now - next.autoMedicineAt.mana >= 1000) {
    const after = consumeMedicineAction(next, "mana", true, addLog, grantXp);
    if (after !== next) next = { ...after, autoMedicineAt: { ...after.autoMedicineAt, mana: now } };
  }
  return next;
}

/** Keeps Auto Potion policy separate from both the battle UI and Auto Hunt. */
export function configureAutoPotionAction(state: GameState, patch: Partial<AutoPotionSettings>, addLog: Log): GameState {
  const result = AutoPotionManager.configure(state.autoPotion, patch, state.medicines, medicineCatalog);
  return result.shortage
    ? { ...state, autoPotion: result.settings, battleLogs: BattleLogManager.addLog(state.battleLogs, AUTO_POTION_SHORTAGE_NOTICE, "warning"), logs: addLog(state.logs, AUTO_POTION_SHORTAGE_NOTICE) }
    : { ...state, autoPotion: result.settings };
}

/** Applies one eligible healing item during an active battle, then lets React persist the new state. */
export function applyAutoPotionAction(state: GameState, now: number, addLog: Log, grantXp: GrantXp): GameState {
  if (state.dungeon?.status !== "fighting") return state;
  if (now - state.autoPotionAt < 1000) return state;
  const targets = [state.hero, ...state.mercs.filter(unit => state.active.includes(unit.uid))].map(unit => vitalStats(unit));
  const action = AutoPotionManager.nextAction(state.autoPotion, state.medicines, targets, medicineCatalog);
  if (action.type === "none") return state;
  if (action.type === "shortage") return { ...state, autoPotion: action.settings, battleLogs: BattleLogManager.addLog(state.battleLogs, AUTO_POTION_SHORTAGE_NOTICE, "warning"), logs: addLog(state.logs, AUTO_POTION_SHORTAGE_NOTICE) };
  const consumed = consumeMedicineAction(state, action.medicineId, true, addLog, grantXp);
  const medicine = medicineCatalog.find((entry) => entry.id === action.medicineId);
  const withBattleLog = { ...consumed, autoPotionAt: now, battleLogs: BattleLogManager.addLog(consumed.battleLogs, `Auto Potion 使用「${medicine?.name || action.medicineId}」。`, "auto-potion") };
  return (withBattleLog.medicines[action.medicineId] || 0) > 0
    ? withBattleLog
    : { ...withBattleLog, autoPotion: { ...withBattleLog.autoPotion, enabled: false }, battleLogs: BattleLogManager.addLog(withBattleLog.battleLogs, AUTO_POTION_SHORTAGE_NOTICE, "warning"), logs: addLog(withBattleLog.logs, AUTO_POTION_SHORTAGE_NOTICE) };
}

export function socketGemAction(state: GameState, targetUid: string, slot: EquipmentSlot, gemId: string, grade: number, requestedAmount: number, addLog: Log, notify: (message: string) => void): GameState {
  const gem = officialGems.find((entry) => entry.id === gemId), target = targetUid === "hero" ? state.hero : state.mercs.find((unit) => unit.uid === targetUid);
  if (!gem || !target) return state;
  if (!target.equip[slot]) { notify(`請先在${slot}欄穿戴裝備。`); return state; }
  const equip = { ...target.equip }, item = equip[slot]!;
  const quote=gemSocketResult(item,gem,grade,requestedAmount);
  if(!quote.ok){notify(quote.error);return state;}
  const {cost}=quote;
  if (!Number.isFinite(state.gold)||state.gold < cost) { notify("寶石加工資金不足。"); return state; }
  equip[slot] = quote.item;
  const common = { ...state, gold: state.gold - cost, logs: addLog(state.logs, `${gem.name}已鑲嵌至「${item.name}」，品級 ${grade+1}・${quote.amount} 顆，支付 ${cost.toLocaleString('en-US')} 兩。`) };
  return targetUid === "hero" ? { ...common, hero: { ...state.hero, equip } } : { ...common, mercs: state.mercs.map((unit) => unit.uid === targetUid ? { ...unit, equip } : unit) };
}

export function openAncientCoinBoxAction(state: GameState, requestedAmount: number, rolls: Array<{ coins: number; rareReward: string | null; fusionCores?: number }>, addLog: Log): GameState {
  const boxes = Math.max(0, Math.floor(state.materials["古錢箱"] || 0));
  if (!boxes) return state;
  const opened = Math.min(boxes, Math.max(1, Math.floor(requestedAmount))), openedRolls = rolls.slice(0, opened), coins = openedRolls.reduce((sum, roll) => sum + roll.coins, 0), materials = { ...state.materials };
  if (boxes === opened) delete materials["古錢箱"]; else materials["古錢箱"] = boxes - opened;
  const rareCounts: Record<string, number> = {};
  for (const roll of openedRolls) if (roll.rareReward) rareCounts[roll.rareReward] = (rareCounts[roll.rareReward] || 0) + 1;
  for (const [name, count] of Object.entries(rareCounts)) materials[name] = (materials[name] || 0) + count;
  const rareText = Object.entries(rareCounts).map(([name, count]) => `【${name}】×${count}`).join("、"), fusionCores = openedRolls.reduce((sum, roll) => sum + Math.max(0, Math.floor(roll.fusionCores || 0)), 0);
  return { ...state, materials, newbieCoins: state.newbieCoins + coins, fusionCores: state.fusionCores + fusionCores, logs: addLog(state.logs, `開啟「古錢箱」×${opened}，獲得【新手兌換銅錢】×${coins}${fusionCores ? `，融合核心 ×${fusionCores}` : ""}${rareText ? `，稀有獎勵${rareText}` : ""}。`) };
}

export function depositWarehouseItemAction(state: GameState, warehouse: Equipment[], itemUid: string, limit: number, addLog: Log): { game: GameState; warehouse: Equipment[]; error?: string } {
  if (warehouse.length >= limit) return { game: state, warehouse, error: `共用倉庫已達 ${limit} 格上限。` };
  const item = state.inventory.find((entry) => entry.uid === itemUid);
  if (!item) return { game: state, warehouse };
  return { game: { ...state, inventory: state.inventory.filter((entry) => entry.uid !== itemUid), logs: addLog(state.logs, `將「${item.name}」存入三角色共用倉庫。`) }, warehouse: [...warehouse, item].slice(0, limit) };
}

export function withdrawWarehouseItemAction(state: GameState, warehouse: Equipment[], itemUid: string, addLog: Log): { game: GameState; warehouse: Equipment[] } {
  const item = warehouse.find((entry) => entry.uid === itemUid);
  if (!item) return { game: state, warehouse };
  return { game: { ...state, inventory: [item, ...state.inventory], logs: addLog(state.logs, `從共用倉庫取出「${item.name}」。`) }, warehouse: warehouse.filter((entry) => entry.uid !== itemUid) };
}
