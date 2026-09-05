/** 隨機地域怪物：沿用已確認示範版的原創數值；舊怪物 ID 留在主資料庫供舊資料相容。 */
export const ECOLOGY_MONSTERS={
 e_raccoon:{name:'小狸貓',level:1,hp:60,mp:0,atk:5,dex:10,xp:20,gold:15,drop:.05,loot:['boots']},
 e_terracotta:{name:'兵馬俑',level:35,hp:300,mp:80,atk:35,dex:24,xp:300,gold:220,drop:.35,loot:['helmet','armor']},
 e_mad_cow:{name:'狂牛',level:15,hp:120,mp:0,atk:18,dex:20,xp:70,gold:55,drop:.18,loot:['boots']},
 e_big_eye:{name:'大眼怪',level:10,hp:80,mp:40,atk:12,dex:18,xp:45,gold:35,drop:.18,loot:['helmet']},
 e_boar:{name:'狂暴山豬',level:20,hp:200,mp:0,atk:28,dex:16,xp:120,gold:90,drop:.25,loot:['staff']},
 e_miko:{name:'幽靈巫女',level:25,hp:250,mp:160,atk:32,dex:30,xp:160,gold:120,drop:.22,loot:['staff','armor']},
 e_sea_god:{name:'海神',level:45,hp:4400,mp:2000,atk:140,dex:42,xp:1200,gold:900,drop:.55,loot:['staff','armor']},
 e_cat:{name:'狸貓',level:1,hp:100,mp:0,atk:6,dex:10,xp:20,gold:15,drop:.05,loot:['boots']},
 e_mantis:{name:'大螳螂',level:5,hp:180,mp:0,atk:10,dex:18,xp:35,gold:25,drop:.07,loot:['boots']},
 e_bandit:{name:'山賊打手',level:10,hp:300,mp:20,atk:16,dex:14,xp:60,gold:40,drop:.1,loot:['boots']},
 e_raider:{name:'海掠者',level:18,hp:800,mp:40,atk:35,dex:25,xp:150,gold:120,drop:.25,loot:['boots']},
 e_star:{name:'巨型海星',level:25,hp:1200,mp:60,atk:45,dex:15,xp:220,gold:180,drop:.28,loot:['boots']},
 e_crab:{name:'海底巨蟹',level:35,hp:2000,mp:80,atk:65,dex:20,xp:350,gold:260,drop:.32,loot:['boots']},
 e_yeti:{name:'雪人',level:42,hp:4000,mp:100,atk:120,dex:35,xp:800,gold:600,drop:.45,loot:['helmet','staff']},
 e_crystal:{name:'冰雪結晶',level:50,hp:5500,mp:250,atk:145,dex:40,xp:1100,gold:800,drop:.5,loot:['helmet','staff']},
 e_snow:{name:'經典雪女',level:65,hp:8000,mp:400,atk:190,dex:65,xp:1600,gold:1200,drop:.55,loot:['helmet','staff']},
 e_ghost:{name:'冥界餓鬼',level:72,hp:11000,mp:200,atk:230,dex:55,xp:2400,gold:1600,drop:.6,loot:['armor']},
 e_snake:{name:'冥界大蛇',level:80,hp:17000,mp:350,atk:290,dex:60,xp:3500,gold:2200,drop:.7,loot:['armor']},
 e_king:{name:'終極 BOSS 閻王',level:100,hp:25000,mp:500,atk:350,dex:70,xp:5000,gold:3000,drop:.8,loot:['armor']}
} as const;
/** 新五關卡採單一專屬怪物；舊四區怪物仍保留在上方，讓舊存檔可以安全載入。 */
export const ECOLOGY_POOLS={
 hanyang:['e_raccoon'],
 'qin-shi-huang-mausoleum':['e_terracotta'],
 'iwami-silver-mine':['e_mad_cow'],
 'fuji-foothills':['e_miko'],
 'datun-mountain':['e_big_eye'],
 alishan:['e_boar'],
 'undersea-king-cave':['e_sea_god'],
} as const;
export function pickZoneMonster(zone:string='hanyang',sample=0){
 const pool=ECOLOGY_POOLS[zone as keyof typeof ECOLOGY_POOLS]||ECOLOGY_POOLS.hanyang;
 return pool[Math.min(pool.length-1,Math.max(0,Math.floor(sample*pool.length)))];
}
