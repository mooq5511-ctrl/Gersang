export type MercenaryId = 'spear' | 'shield' | 'archer' | 'shaman' | 'samurai' | 'ninja' | 'gunner' | 'onmyoji' | 'blade' | 'monk' | 'healer' | 'cannon' | 'escort' | 'hunter' | 'elephant' | 'priest' | 'swordmaster' | 'sanada' | 'mazu';
export type MercenarySpec = { id: MercenaryId; name: string; role: string; ratings: readonly [number, number, number, number, number]; intel?: number; passive: string; passiveEffect: string; active: string; activeEffect: string; cooldown: number; mp: number; ranged: boolean };
export const merchantMercenaries: MercenarySpec[] = [
  { id:'spear',name:'朝鮮槍兵',role:'前排／反騎兵',ratings:[38,30,34,24,36],passive:'長槍拒馬',passiveEffect:'近戰普攻減傷 10%；對騎兵、獸類傷害 +15%。',active:'突槍穿陣',activeEffect:'前排單體 140% 物傷，防禦 −15%，持續 2 回合。',cooldown:4,mp:0,ranged:false },
  { id:'shield',name:'山城盾衛',role:'坦克／護衛',ratings:[48,18,48,14,30],passive:'守城鐵壁',passiveEffect:'HP 高於 50% 時防禦 +20%。',active:'舉盾護商',activeEffect:'其他隊友 HP 低於 50% 時，守護最低者，代受下一次單體攻擊並減傷 40%；最多 2 回合。',cooldown:4,mp:0,ranged:false },
  { id:'archer',name:'虎獵弓手',role:'遠程／獵獸',ratings:[26,39,18,32,46],passive:'獵虎眼',passiveEffect:'對獸類傷害 +20%。',active:'穿林重箭',activeEffect:'攻擊生命比例最低者，造成 170% 物傷；目標 HP 低於 30% 時改為 200%。',cooldown:4,mp:0,ranged:true },
  { id:'shaman',name:'朝鮮巫女',role:'法術／削弱',ratings:[25,33,19,27,40],passive:'山靈庇佑',passiveEffect:'開戰全體法術減傷 10%，持續 2 回合，不疊加。',active:'縛魂咒',activeEffect:'對攻擊最高者造成 110% 法傷，攻擊 −20%，持續 2 回合。',cooldown:4,mp:10,ranged:true },
  { id:'samurai',name:'倭國武士',role:'近戰／決鬥',ratings:[36,42,29,31,40],passive:'居合之心',passiveEffect:'HP 高於 70% 時物理傷害 +15%。',active:'一閃斬',activeEffect:'前排单體 180% 物傷；擊倒時恢復自身最大 HP 8%。',cooldown:4,mp:0,ranged:false },
  { id:'ninja',name:'伊賀忍者',role:'刺殺／閃避',ratings:[24,40,16,49,43],passive:'影步',passiveEffect:'15% 機率閃避單體物理攻擊，不適用範圍或法術。',active:'飛鏢襲後',activeEffect:'優先後排防禦最低者，130% 物傷；目標下次攻擊命中率 −20 個百分點。',cooldown:4,mp:0,ranged:false },
  { id:'gunner',name:'鐵砲足輕',role:'遠程／破甲',ratings:[28,47,22,18,44],passive:'火繩校準',passiveEffect:'連續攻擊同一目標 2 次後，後續命中 +10 個百分點；換目標重置。',active:'破甲鉛丸',activeEffect:'對防禦最高者造成 180% 物傷，本次忽略 30% 防禦。',cooldown:5,mp:0,ranged:true },
  { id:'onmyoji',name:'陰陽術士',role:'法術／控制',ratings:[23,41,17,25,42],passive:'式神護符',passiveEffect:'每場第一次受到致命傷時保留 1 HP。',active:'冰符封行',activeEffect:'最多 2 名最快敵人各受 100% 法傷，定身 1 回合；首領免疫。',cooldown:5,mp:14,ranged:true },
  { id:'blade',name:'中原刀客',role:'前排／群攻',ratings:[40,37,31,29,35],passive:'越戰越勇',passiveEffect:'受擊存活後攻擊 +3%，最多 5 層，戰後清除。',active:'旋風刀',activeEffect:'最多 3 名前排各受 110% 物傷；只剩一名敵人時改為 150%。',cooldown:4,mp:0,ranged:false },
  { id:'monk',name:'少林武僧',role:'副坦／反擊',ratings:[43,28,40,27,38],passive:'金鐘護體',passiveEffect:'受到物傷後 20% 機率反擊 60% 物傷，每回合最多一次，不連鎖。',active:'伏虎震掌',activeEffect:'前排單體 130% 物傷並暈眩 1 回合；首領免暈，改為 160% 物傷。',cooldown:5,mp:0,ranged:false },
  { id:'healer',name:'行腳郎中',role:'治療／解毒',ratings:[29,15,23,30,36],passive:'藥囊備急',passiveEffect:'戰後若存活，治療生命比例最低的存活隊友最大 HP 8%。',active:'回春術',activeEffect:'隊友 HP 低於 65% 時，治療最低者最大 HP 15%＋自身攻擊 100%，移除中毒。',cooldown:3,mp:12,ranged:true },
  { id:'cannon',name:'火器砲手',role:'遠程／範圍輸出',ratings:[31,49,25,12,29],passive:'重砲架設',passiveEffect:'本回合未移動時物理傷害 +15%。',active:'震地砲',activeEffect:'最多 3 名敵人各受 130% 物傷，移速 −20%，持續 2 回合。',cooldown:5,mp:0,ranged:true },
  { id:'escort',name:'東海鏢師',role:'護衛／均衡',ratings:[39,31,35,35,42],passive:'押鏢老練',passiveEffect:'跑商遭遇前 2 回合全體物理減傷 8%，多名不疊加。',active:'護路連斬',activeEffect:'對攻擊最高者連斬 2 次，每次 75% 物傷，各自判定命中。',cooldown:3,mp:0,ranged:false },
  { id:'hunter',name:'山林獵手',role:'遠程／陷阱',ratings:[30,35,23,41,45],passive:'熟悉山徑',passiveEffect:'森林、山道移速 +15%，命中 +5 個百分點。',active:'捕獸索',activeEffect:'最快敵人受 120% 物傷，移速 −40% 持續 2 回合；獸類額外定身 1 回合，首領免疫定身。',cooldown:4,mp:0,ranged:true },
  { id:'elephant',name:'天竺戰象兵',role:'重坦／震懾',ratings:[50,35,44,10,26],passive:'厚皮巨軀',passiveEffect:'物理減傷 12%；受到治療 −10%。',active:'戰象踐踏',activeEffect:'最多 3 名前排各受 100% 物傷，攻擊 −15%，持續 2 回合。',cooldown:5,mp:0,ranged:false },
  { id:'priest',name:'天竺梵僧',role:'輔助／法術防護',ratings:[32,23,28,23,39],passive:'靜心持咒',passiveEffect:'每完成 3 次行動恢復 4 MP，不超過上限。',active:'梵音護陣',activeEffect:'隊友 HP 低於 70% 時，全體獲得自身最大 HP 10% 護盾，持續 2 回合，並清除命中降低；不復活。',cooldown:5,mp:16,ranged:true },
  { id:'swordmaster',name:'劍豪',role:'前排／二轉劍士',ratings:[43,46,39,36,42],passive:'劍氣凝神',passiveEffect:'每次成功命中獲得 1 層劍氣；滿 3 層後下一次武技傷害 +35%，並無視 15% 防禦。',active:'奧義・居合',activeEffect:'對前排生命最低者造成 210% 物傷；若擊倒目標，立即獲得 1 層劍氣。',cooldown:4,mp:0,ranged:false },
  { id:'sanada',name:'軍神真田信綱',role:'前排／傳說武將',ratings:[50,48,47,34,40],passive:'六文錢軍略',passiveEffect:'開戰時前排獲得 10% 傷害減免；自身 HP 低於 45% 時，攻擊與防禦各 +15%。',active:'真田赤備突擊',activeEffect:'對前排及相鄰敵人各造成 155% 物傷；命中首領時額外附加 1 回合破甲 12%。',cooldown:5,mp:0,ranged:false },
  { id:'mazu',name:'媽祖娘娘',role:'作者測試／全能守護',ratings:[50000,50000,50000,50000,50000],intel:50000,passive:'天后庇護',passiveEffect:'作者測試傭兵：力量、敏捷、體質、智力皆為一般傭兵上限的 1,000 倍。',active:'海神護航',activeEffect:'對全體敵人造成 1000% 傷害，並使全體友軍恢復最大生命 50%。',cooldown:1,mp:0,ranged:true },
];
const byTemplate = new Map(merchantMercenaries.map(spec => ['merchant-'+spec.id, spec]));
export const mercenarySpec = (templateId?: string) => templateId ? byTemplate.get(templateId) : undefined;
export const ratingAccuracy = (rating: number) => Math.min(0.98, 0.7 + Math.max(1, Math.min(50, rating)) * 0.0056);
