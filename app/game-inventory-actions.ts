import { buyMarketMaterial, sellAllMaterials, sellMaterial } from "./village-exchange";
import { VILLAGE_WEAPONS, buyVillageWeapon, exchangeAttackBonus, type VillageWeaponId } from "./village-exchange";
import { sellAllEquipmentFromInventory, sellEquipmentFromInventory } from "./equipment-market";
import { addInventoryItem } from "./inventory-layout";
import { THUNDER_FORGE_ITEMS, type ThunderForgeId } from "./mythic-forge";
import { compatibleSlots, equipFromInventory, unequipToInventory, type EquipmentSlot } from "./equipment-slots";
import { medicineCatalog } from "./game-config";
import { officialGems } from "./v17-content";
import { normalizeVitals, recoverVitals, vitalStats } from "./vitals-engine";
import type { Equipment, GameState, Hero, MagicAffix, Unit } from "./game-state";

type Log = (logs: string[], message: string) => string[];
type Format = (value: number) => string;

export function sellMaterialAction(state: GameState, itemName: string, addLog: Log, format: Format): GameState {
  const result = sellMaterial(state.materials, state.gold, itemName);
  return result.error ? { ...state, logs: addLog(state.logs, result.error) } : { ...state, materials: result.materials, gold: result.gold, logs: addLog(state.logs, `交易所售出「${itemName}」×1，獲得 ${format(result.earned)} 兩。`) };
}

export function sellAllMaterialsAction(state: GameState, addLog: Log, format: Format): GameState {
  const result = sellAllMaterials(state.materials, state.gold);
  if (!result.count) return { ...state, logs: addLog(state.logs, "目前沒有可變賣的怪物素材。") };
  return { ...state, materials: result.materials, gold: result.gold, logs: addLog(state.logs, `交易所完成全部變賣，獲得 ${format(result.earned)} 兩。`) };
}

export function buyMaterialAction(state: GameState, itemName: string, addLog: Log, format: Format): GameState {
  const result = buyMarketMaterial(state.materials, state.gold, itemName);
  return result.error ? { ...state, logs: addLog(state.logs, result.error) } : { ...state, materials: result.materials, gold: result.gold, logs: addLog(state.logs, `交易所買入「${itemName}」×1，支付 ${format(result.spent)} 兩。`) };
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
  const item: Equipment = { uid: uid(`t10-${id}`), name: recipe.name, slot: recipe.slot, atk: recipe.atk, def: recipe.def, hp: recipe.hp, image: recipe.image || itemImage(compatibleSlots(recipe.slot)[0]), enhance: 0, rarity: "傳說", magic: recipe.magic.map((affix) => ({ ...affix })), bonus: { ...recipe.bonus }, skill: recipe.skill, requiredLevel: recipe.set === "thunder" ? 150 : 1, source: "神仙谷・雷霆祭壇" };
  const pickup = addInventoryItem(state.inventory, item);
  if (pickup.error) { notify("背包已滿，無法完成鍛造。"); return state; }
  notify(`鍛造完成：${recipe.name}`);
  return { ...state, materials, inventory: pickup.inventory, logs: addLog(state.logs, `神仙谷鍛造完成「${recipe.name}」。`) };
}

export function purchaseEquipmentAction(state: GameState, item: Equipment, price: number, message: string, addLog: Log, notify: (message: string) => void): GameState {
  if (state.gold < price) { notify("裝備商店資金不足。"); return state; }
  return { ...state, gold: state.gold - price, inventory: [item, ...state.inventory], logs: addLog(state.logs, message) };
}

export function equipInventoryItemAction(state: GameState, itemUid: string, requestedSlot: EquipmentSlot | undefined, targetUid: string, addLog: Log): GameState {
  const target = targetUid === "hero" ? state.hero : state.mercs.find((unit) => unit.uid === targetUid);
  if (!target) return state;
  const result = equipFromInventory<Equipment, Unit | Hero>(target, state.inventory, itemUid, requestedSlot);
  if (result.error) return { ...state, logs: addLog(state.logs, result.error) };
  const unit = normalizeVitals(result.unit);
  const logs = addLog(state.logs, "已穿戴裝備，原部位裝備已交換回背包。");
  return targetUid === "hero"
    ? { ...state, logs, inventory: result.inventory, hero: unit as Hero }
    : { ...state, logs, inventory: result.inventory, mercs: state.mercs.map((old) => old.uid === targetUid ? unit : old) };
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
  if (purchased < amount) notify(`金幣不足，僅購入「${medicine.name}」×${purchased}。`);
  return { ...state, gold: state.gold - price * purchased, medicines: { ...state.medicines, [medicine.id]: (state.medicines[medicine.id] || 0) + purchased }, logs: addLog(state.logs, `在${cityName}藥店購入「${medicine.name}」×${purchased}。`) };
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

export function socketGemAction(state: GameState, targetUid: string, slot: EquipmentSlot, gemId: string, grade: number, requestedAmount: number, addLog: Log, notify: (message: string) => void): GameState {
  const gem = officialGems.find((entry) => entry.id === gemId), target = targetUid === "hero" ? state.hero : state.mercs.find((unit) => unit.uid === targetUid);
  if (!gem || !target) return state;
  if (!target.equip[slot]) { notify(`請先在${slot}欄穿戴裝備。`); return state; }
  const equip = { ...target.equip }, item = equip[slot]!, existing = item.socketGem, amount = Math.min(requestedAmount, 100 - (existing?.count || 0));
  if (amount < 1 || (existing?.count || 0) >= 100) { notify("此裝備部位最多鑲嵌 100 顆寶石。"); return state; }
  const cost = gem.costs[grade] * amount;
  if (state.gold < cost) { notify("寶石加工資金不足。"); return state; }
  if (existing && existing.id !== gem.id) { notify("每個裝備部位只能鑲嵌一種寶石。"); return state; }
  const bonus = { ...(item.bonus || { str: 0, agi: 0, intel: 0, vit: 0 }) };
  if (gem.stat === "all") { bonus.str += gem.values[grade] * amount; bonus.agi += gem.values[grade] * amount; bonus.intel += gem.values[grade] * amount; bonus.vit += gem.values[grade] * amount; } else bonus[gem.stat] += gem.values[grade] * amount;
  const count = (existing?.count || 0) + amount, totalValue = (existing?.totalValue || 0) + gem.values[grade] * amount, baseName = existing?.baseName || item.name, gemTitle = `${gem.name.replace(/石$/, "")}的 ${baseName}`;
  const gemAffix: MagicAffix = { id: `socket-${gem.id}`, name: gem.name, text: `${gem.label} +${totalValue}（${count} 顆）`, color: "#8ee7ff", stat: gem.stat, value: totalValue };
  equip[slot] = { ...item, name: `+${count} ${gemTitle}`, bonus, socketGem: { id: gem.id, name: gem.name, count, totalValue, baseName }, magic: [...(item.magic || []).filter((affix) => affix.id !== `socket-${gem.id}`), gemAffix] };
  const common = { ...state, gold: state.gold - cost, logs: addLog(state.logs, `${gem.name}已鑲嵌至「${item.name}」。`) };
  return targetUid === "hero" ? { ...common, hero: { ...state.hero, equip } } : { ...common, mercs: state.mercs.map((unit) => unit.uid === targetUid ? { ...unit, equip } : unit) };
}

export function openAncientCoinBoxAction(state: GameState, requestedAmount: number, rolls: Array<{ coins: number; rareReward: string | null }>, addLog: Log): GameState {
  const boxes = Math.max(0, Math.floor(state.materials["古錢箱"] || 0));
  if (!boxes) return state;
  const opened = Math.min(boxes, Math.max(1, Math.floor(requestedAmount))), openedRolls = rolls.slice(0, opened), coins = openedRolls.reduce((sum, roll) => sum + roll.coins, 0), materials = { ...state.materials };
  if (boxes === opened) delete materials["古錢箱"]; else materials["古錢箱"] = boxes - opened;
  const rareCounts: Record<string, number> = {};
  for (const roll of openedRolls) if (roll.rareReward) rareCounts[roll.rareReward] = (rareCounts[roll.rareReward] || 0) + 1;
  for (const [name, count] of Object.entries(rareCounts)) materials[name] = (materials[name] || 0) + count;
  const rareText = Object.entries(rareCounts).map(([name, count]) => `【${name}】×${count}`).join("、");
  return { ...state, materials, newbieCoins: state.newbieCoins + coins, logs: addLog(state.logs, `開啟「古錢箱」×${opened}，獲得【新手兌換銅錢】×${coins}${rareText ? `，稀有獎勵${rareText}` : ""}。`) };
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
