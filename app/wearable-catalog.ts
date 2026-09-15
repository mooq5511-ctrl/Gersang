import type {EquipmentKind} from './equipment-slots.ts';
export type WearableBase={id:string;name:string;slot:EquipmentKind;atk:number;def:number;hp:number;image:string;price:number};
export const wearableCatalog:WearableBase[]=[
  {id:'guild-sword',name:'護商鐵劍',slot:'weapon',atk:24,def:0,hp:0,image:'/assets/equipment-portraits/guardian-iron-sword-v1.png',price:2000},
  {id:'guild-helm',name:'商團鐵盔',slot:'helm',atk:0,def:18,hp:60,image:'',price:1800},
  {id:'guild-armor',name:'商旅錦衣',slot:'armor',atk:0,def:32,hp:130,image:'/assets/items/a000_Dress01_I.png',price:3000},
  {id:'guild-boots',name:'行商長靴',slot:'boots',atk:4,def:12,hp:40,image:'',price:1600},
  {id:'guild-ring',name:'赤銅戒指',slot:'ring',atk:16,def:4,hp:20,image:'',price:2200},
  {id:'guild-jade-ring',name:'青玉戒指',slot:'ring',atk:8,def:10,hp:50,image:'',price:2400},
  {id:'guild-gloves',name:'護商手套',slot:'gloves',atk:12,def:10,hp:30,image:'',price:1900},
  {id:'guild-amulet',name:'風靈護身符',slot:'amulet',atk:20,def:8,hp:80,image:'/assets/items/a001_ELEMENT04_I.png',price:2800},
];
