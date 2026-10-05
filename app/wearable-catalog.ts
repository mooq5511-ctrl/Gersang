import {legacyWearableCatalog} from './wearable-catalog-legacy.ts';
import {V1_EQUIPMENT_DEFINITIONS} from './equipment-v1-policy.ts';
export type {WearableBase} from './wearable-catalog-legacy.ts';
/** Lv.1 stock uses canonical core and price; legacy records remain archived unchanged. */
export const wearableCatalog=legacyWearableCatalog.map(record=>{
  const definition=V1_EQUIPMENT_DEFINITIONS[`wearable-${record.id}`];
  return {...record,atk:definition.atk,def:definition.def,hp:definition.hp,price:definition.price};
});
