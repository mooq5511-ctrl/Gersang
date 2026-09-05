import {positionInventory,addInventoryItem} from './inventory-layout.ts';
export const EQUIPMENT_SLOTS = ['weapon','helm','armor','boots','ring1','ring2','gloves','amulet'] as const;
export type EquipmentSlot = typeof EQUIPMENT_SLOTS[number];
export type EquipmentKind = 'helm' | 'armor' | 'boots' | 'ring' | 'gloves' | 'amulet' | 'weapon' | 'accessory';
export const EQUIPMENT_LABELS: Record<EquipmentSlot | EquipmentKind,string> = { helm:'頭盔',armor:'盔甲',boots:'鞋子',ring1:'戒指Ⅰ',ring2:'戒指Ⅱ',gloves:'手套',amulet:'護身符',ring:'戒指',weapon:'武器',accessory:'護身符' };
export const emptyEquipmentSlots = <E,>(): Record<EquipmentSlot,E|null> => ({weapon:null,helm:null,armor:null,boots:null,ring1:null,ring2:null,gloves:null,amulet:null});
export function itemKind(slot: unknown): EquipmentKind {
  if (slot==='accessory') return 'amulet';
  if (slot==='ring1'||slot==='ring2') return 'ring';
  return ['helm','armor','boots','ring','gloves','amulet'].includes(String(slot)) ? slot as EquipmentKind : 'weapon';
}
export function compatibleSlots(kind: unknown): EquipmentSlot[] {
  const normalized=itemKind(kind);
  return normalized==='ring' ? ['ring1','ring2'] : [normalized as EquipmentSlot];
}
export const normalizeStoredItem = <T extends {slot?: unknown}>(item:T) => ({...item,slot:itemKind(item.slot)});
type Wearable = {uid:string;slot:EquipmentKind;requiredLevel?:number;bagSlot?:number};
export function equipFromInventory<E extends Wearable,U extends {level:number;equip:Record<EquipmentSlot,E|null>}>(unit:U,inventory:E[],uid:string,requested?:EquipmentSlot) {
  const fail=(error:string)=>({unit,inventory,error});
  inventory=positionInventory(inventory);
  const item=inventory.find(entry=>entry.uid===uid);
  if(!item) return fail('物品不在背包中。');
  const allowed=compatibleSlots(item.slot);
  const slot=requested ?? allowed.find(key=>!unit.equip[key]) ?? allowed[0];
  if(!slot||!allowed.includes(slot)) return fail('此裝備無法放入該欄位。');
  if(unit.level<(item.requiredLevel||1)) return fail('裝備等級不足。');
  if(Object.values(unit.equip).some(entry=>entry?.uid===uid)) return fail('同一件物品不能重複穿戴。');
  const equip={...unit.equip,[slot]:normalizeStoredItem(item)};
  const next=inventory.filter(entry=>entry.uid!==uid);
  if(unit.equip[slot]) next.push({...unit.equip[slot]!,bagSlot:item.bagSlot});
  return {unit:{...unit,equip},inventory:next,error:undefined};
}
export function unequipToInventory<E extends Wearable,U extends {equip:Record<EquipmentSlot,E|null>}>(unit:U,inventory:E[],slot:EquipmentSlot) {
  const item=unit.equip[slot];
  if(!item) return {unit,inventory,error:undefined};
  return {unit:{...unit,equip:{...unit.equip,[slot]:null}},inventory:inventory.some(entry=>entry.uid===item.uid)?inventory:addInventoryItem(inventory,item).inventory,error:undefined};
}
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
/** Migrate before sanitization so retired slots can never silently discard gear. */
export function migrateSevenSlotSave(raw:unknown):unknown {
  if(!record(raw)) return raw;
  const returned:Record<string,unknown>[]=[];
  const equipped=new Set<string>();
  const convert=(unit:unknown,owner:string)=>{
    if(!record(unit)) return unit;
    const equip=emptyEquipmentSlots<Record<string,unknown>>();
    const previous=record(unit.equip)?unit.equip:{};
    for(const key of [...EQUIPMENT_SLOTS,...Object.keys(previous).filter(key=>!EQUIPMENT_SLOTS.includes(key as EquipmentSlot))]) {
      const value=previous[key];if(!record(value)) continue;
      const item={...value,uid:String(value.uid||'migrated-'+owner+'-'+key),slot:itemKind(value.slot??key)};
      const allowed=compatibleSlots(item.slot);
      const desired=key==='accessory'?'amulet':key==='ring'?(equip.ring1?'ring2':'ring1'):key;
      if(equipped.has(item.uid)) continue;
      if(allowed.includes(desired as EquipmentSlot)&&!equip[desired as EquipmentSlot]) {
        equip[desired as EquipmentSlot]=item;equipped.add(item.uid);
      } else returned.push(item);
    }
    return {...unit,equip};
  };
  const hero=convert(raw.hero,'hero');
  const mercs=Array.isArray(raw.mercs)?raw.mercs.map((unit,index)=>convert(unit,'merc-'+index)):raw.mercs;
  const inventory: Record<string,unknown>[]=(Array.isArray(raw.inventory)?raw.inventory:[]).filter(record).map(item=>normalizeStoredItem(item));
  const seen=new Set(inventory.map(item=>String(item.uid)));
  let count=0;
  for(const item of returned) if(!seen.has(String(item.uid))&&!equipped.has(String(item.uid))) { inventory.push(normalizeStoredItem(item));seen.add(String(item.uid));count++; }
  return {...raw,hero,mercs,inventory,logs:count?['裝備欄已調整為八格，'+count+' 件不相容裝備退回背包。',...(Array.isArray(raw.logs)?raw.logs:[])].slice(0,40):raw.logs};
}
export function backupBeforeEquipmentMigration(storage:Pick<Storage,'getItem'|'setItem'>,key:string,raw:string) {
  const saved=JSON.parse(raw);
  const members=[saved.hero,...(Array.isArray(saved.mercs)?saved.mercs:[])];
  const legacy=members.some(unit=>record(unit?.equip)&&('weapon' in unit.equip||'accessory' in unit.equip));
  if(legacy&&storage.getItem(key+':before-seven-slots')===null) storage.setItem(key+':before-seven-slots',raw);
}
