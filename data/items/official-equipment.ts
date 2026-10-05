import {legacyOfficialEquipment} from './official-equipment-legacy.ts';
import {V1_EQUIPMENT_DEFINITIONS} from '../../app/equipment-v1-policy.ts';
export type {OfficialEquipment} from './official-equipment-legacy.ts';
/** UI and new acquisition share canonical ordinary cores; existing saves are not catalog-rebound. */
export const officialEquipment=legacyOfficialEquipment.map(record=>{
  const definition=V1_EQUIPMENT_DEFINITIONS[`official-${record.id}`];
  return {...record,atk:definition.atk,def:definition.def,hp:definition.hp,price:definition.price};
});
