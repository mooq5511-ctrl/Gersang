import { WORLD_MONSTER_LEVELS, WORLD_MONSTER_PROGRESSION, worldEncounterTier, type EncounterTier } from './world-progression.ts';
import { WORLD_MONSTER_HP } from './world-monster-hp.ts';
import { promotedMonsterCombat } from './promotion-monster-balance.ts';
/** Stable IDs are save-game contracts. Names and balance may change without migrating IDs. */
export type MonsterRole = '群居' | '均衡' | '重甲' | '突襲' | '術士';
export type MonsterDrop = { item: string; rate: number; price: number };
type DesignRow = readonly [id: string, name: string, region: string, level: number, role: MonsterRole, common: string, rare: string, elite?: boolean];

export const MONSTER_REGION_LABELS: Record<string, string> = {
  'starter-outskirts': '新手村郊外', 'korea-field': '朝鮮野外', 'millennium-lake': '千年湖',
  'japan-sea': '日本海底洞', 'miasma-forest': '白虎林', sumeru: '須彌山', 'sunken-relic': '沉沒王朝遺跡',
  hanyang: '漢陽城外', daegwallyeong: '大關嶺', hallasan: '漢拏山', 'datun-mountain': '大屯山',
  alishan: '阿里山', 'qin-taiwan': '秦始皇陵', 'japan-netherworld': '冥界', 'iwami-silver-mine': '石見銀山',
  'black-forest': '黑色森林', 'nanjing-outskirts': '南京城外', 'great-wall': '萬里長城',
  'yellow-emperor-mausoleum': '黃帝陵', 'legacy-dungeon': '舊幽冥副本',
  'ice-temple': '冰雪神殿', 'taj-mahal': '泰姬陵', shambhala: '香巴拉天獄',
};

// Every non-boss encounter has a bespoke identity and two regional trade goods.
const rows: readonly DesignRow[] = [
  ['e_starter_raccoon','偷糧狸','starter-outskirts',1,'群居','碎穀袋','完整狸皮'],
  ['e_starter_black_bandit','黑巾斥候','starter-outskirts',5,'均衡','黑巾布條','商路密信',true],
  ['e_starter_wako','斷道刀客','starter-outskirts',2,'突襲','缺口刀片','刀客腰牌'],
  ['e_starter_gunner','黑火銃手','starter-outskirts',4,'術士','粗製火藥','銅製銃管'],
  ['e_starter_bandit','荒坡匪卒','starter-outskirts',3,'均衡','破布腰帶','匪寨銅扣'],
  ['e_starter_pirate','斷帆掠匪','starter-outskirts',6,'均衡','鹽漬繩索','沉船銀扣'],
  ['e_starter_hook_pirate','鏽鉤悍匪','starter-outskirts',8,'重甲','鏽鐵鉤','海匪藏寶圖',true],
  ['e_korea_field_deer','白尾藥鹿','korea-field',3,'群居','嫩鹿茸','白尾鹿皮'],
  ['e_korea_field_small_bandit','山徑竊賊','korea-field',5,'突襲','散落銅錢','竊賊香囊'],
  ['e_korea_field_archer_bandit','松林伏弓手','korea-field',7,'術士','斷箭桿','精製弓弦'],
  ['e_korea_field_poison_moth','粉翅毒蛾','korea-field',9,'群居','毒蛾翅粉','青毒晶粒'],
  ['e_korea_field_hammer_bandit','鐵鎚寨兵','korea-field',12,'重甲','鐵鎚碎塊','寨兵護肩'],
  ['e_korea_field_tiger','斑額山虎','korea-field',15,'突襲','山虎骨','完整斑虎皮'],
  ['e_korea_field_yaksha','夜行獨角鬼','korea-field',18,'均衡','鬼角碎片','夜叉青玉',true],
  ['e_lake_red_thief','蘆灘拾骨客','millennium-lake',18,'群居','湖底骨針','蘆灘琥珀'],
  ['e_lake_shamaness','霧湖燈使','millennium-lake',22,'術士','燈芯灰','霧湖靈砂'],
  ['e_lake_commander','沉舟咒衛','millennium-lake',26,'重甲','沉舟甲片','沉舟令牌'],
  ['e_lake_vendor','無面貨郎','millennium-lake',30,'均衡','破舊貨簽','無面銅鏡',true],
  ['e_lake_horn_fire','赤燼蚌妖','millennium-lake',32,'重甲','赤燼蚌殼','赤燼珠'],
  ['e_lake_horn_water','寒汐蚌妖','millennium-lake',33,'重甲','寒汐蚌殼','寒汐珠'],
  ['e_lake_horn_lightning','鳴雷鱗妖','millennium-lake',34,'突襲','鳴雷碎鱗','鳴雷珠'],
  ['e_lake_horn_wind','裂風水鬼','millennium-lake',35,'突襲','水鬼濕布','裂風珠'],
  ['e_lake_altur','蘆葦伏鱗','millennium-lake',28,'均衡','伏鱗皮','湖心青鱗'],
  ['e_lake_dead_shamaness','溺魂祭徒','millennium-lake',38,'術士','祭徒殘符','溺魂燈芯',true],
  ['e_lake_shamaness_strong','千燈引魂師','millennium-lake',36,'術士','引魂紙','千燈玉墜',true],
  ['e_lake_male_shaman','葦舟巫祝','millennium-lake',39,'術士','葦舟咒結','湖祭青銅器',true],
  ['e_lake_evil_shaman','黑潮咒師','millennium-lake',42,'術士','黑潮墨','黑潮咒珠',true],
  ['e_lake_red_thief_chief','赤蘆巡獵使','millennium-lake',44,'突襲','赤蘆箭簇','巡獵血玉',true],
  ['e_japan_sea_kappa','潮溝河童','japan-sea',35,'均衡','濕苔皿','河童碧玉'],
  ['e_japan_sea_bat','斷帆夜蝠','japan-sea',36,'群居','夜蝠薄翼','銀紋蝠牙'],
  ['e_japan_sea_crab','礁背鐵蟹','japan-sea',40,'重甲','鐵蟹殼','礁心紅珊瑚'],
  ['e_japan_sea_leech','赤潮水蛭','japan-sea',42,'突襲','赤潮黏液','水蛭血晶'],
  ['e_japan_sea_starfish','碎浪棘星','japan-sea',46,'均衡','棘星腕節','碎浪珍珠'],
  ['e_japan_sea_starfish_strong','深潮棘衛','japan-sea',52,'重甲','深潮甲片','深潮珊瑚心',true],
  ['e_white_tiger_soul_eater','食骨山魈','miasma-forest',55,'突襲','山魈骨爪','食骨獠牙'],
  ['e_white_tiger_trainer','瘴燈馭獸師','miasma-forest',58,'術士','馭獸皮索','瘴燈獸印'],
  ['e_white_tiger_spider','腐葉毒蛛','miasma-forest',60,'群居','腐葉蛛絲','凝瘴毒囊'],
  ['e_sumeru_training_thunder_beast','裂雷石獸','sumeru',65,'均衡','雷紋石屑','裂雷晶核'],
  ['e_sumeru_training_plague_god','殘咒行者','sumeru',67,'術士','殘咒紙卷','封咒青珠'],
  ['e_sumeru_training_tiger_crane','裂風山鶴','sumeru',69,'突襲','山鶴翎','裂風金羽'],
  ['e_sumeru_blue_yaksha_vajra','青面鎖山衛','sumeru',73,'重甲','鎖山銅環','青面銅印',true],
  ['e_sumeru_bihan_vajra','寒石銅衛','sumeru',76,'重甲','寒石甲屑','寒石心玉',true],
  ['e_sumeru_zixian_vajra','紫壇咒侍','sumeru',79,'術士','紫壇香灰','紫壇法珠',true],
  ['e_sumeru_mighty_staff_guard','斷階棍衛','sumeru',82,'均衡','斷階鐵箍','護山棍芯',true],
  ['e_sumeru_black_tortoise','玄甲石龜','sumeru',85,'重甲','玄甲碎片','石龜鎮山玉',true],
  ['e_sumeru_white_tiger','雪鬃山虎','sumeru',88,'突襲','雪鬃虎毛','鎮山虎牙',true],
  ['e_raccoon','驛路花狸','hanyang',1,'群居','花狸尾毛','驛路狸皮'],
  ['e_mad_cow','裂角高原牛','daegwallyeong',12,'重甲','高原牛肉','完整裂牛角'],
  ['e_yellow_dragon','金鱗山蜥','hallasan',32,'均衡','山蜥鱗片','金鱗蜥膽'],
  ['e_big_eye','熔瞳石靈','datun-mountain',8,'術士','火山石粉','熔瞳晶珠'],
  ['e_boar','霧鬃山豬','alishan',15,'突襲','山豬硬毛','霧鬃獠牙'],
  ['e_tomb_raider','地宮盜燈客','qin-taiwan',24,'均衡','盜燈銅片','地宮玉扣'],
  ['e_ghost_cat','冥火狸妖','japan-netherworld',10,'突襲','冥火尾絨','幽瞳貓眼石'],
  ['e_kappa','銀砂河童','iwami-silver-mine',8,'重甲','銀砂濕泥','銀砂礦晶'],
  ['e_amakusa','黑杉咒徒','black-forest',40,'術士','黑杉符木','禁林咒印'],
  ['e_poison_moth','丹粉毒蛾','nanjing-outskirts',5,'群居','丹粉蛾翅','丹毒晶粒'],
  ['e_xiongnu','斷旗掠騎','great-wall',22,'突襲','掠騎馬鬃','塞外銀馬牌'],
  ['e_undersea_king','黃陵石衛','yellow-emperor-mausoleum',36,'重甲','黃陵陶片','黃陵鎮墓玉'],
  ['e_terracotta','裂甲陶卒','yellow-emperor-mausoleum',35,'重甲','陶卒甲片','古軍銅符'],
  ['e_miko','迷燈巫侍','japan-netherworld',25,'術士','迷燈符紙','巫侍銀鈴'],
  ['e_sea_god','深潮祭侍','japan-sea',54,'術士','深潮祭砂','海祭藍玉',true],
  ['e_cat','穀倉灰狸','legacy-dungeon',1,'群居','灰狸尾毛','灰狸皮'],
  ['e_mantis','割草刀螳','legacy-dungeon',5,'突襲','刀螳前肢','碧刃螳甲'],
  ['e_bandit','斷橋匪卒','legacy-dungeon',10,'均衡','斷橋匪巾','匪卒銅牌'],
  ['e_raider','鏽帆掠客','legacy-dungeon',18,'突襲','鏽帆索','掠客銀環'],
  ['e_star','暗礁棘星','legacy-dungeon',25,'均衡','暗礁腕節','棘星明珠'],
  ['e_crab','沉沙甲蟹','legacy-dungeon',35,'重甲','沉沙蟹甲','沉沙碧珊瑚'],
  ['e_yeti','雪谷白猿','ice-temple',42,'重甲','白猿厚毛','雪谷猿牙'],
  ['e_crystal','霜晶石靈','ice-temple',50,'術士','霜晶碎屑','霜晶心石'],
  ['e_snow','寒燈雪侍','ice-temple',58,'術士','寒燈冰砂','雪侍冰玉',true],
  ['e_taj_scarab','白砂甲蟲','taj-mahal',52,'群居','白砂蟲甲','琉金蟲珀'],
  ['e_taj_guard','斷刃陵衛','taj-mahal',56,'重甲','陵衛甲環','白陵銅令'],
  ['e_taj_dancer','月紗咒舞者','taj-mahal',60,'術士','月紗碎布','月紗銀鈴'],
  ['e_taj_assassin','影井刺客','taj-mahal',64,'突襲','影井短刃','陵影黑玉',true],
  ['e_ghost','餓影遊魂','shambhala',92,'群居','遊魂灰','餓影冥珠'],
  ['e_snake','冥鱗毒蟒','shambhala',96,'突襲','冥鱗蛇蛻','冥蟒毒膽'],
  ['e_shambhala_jailer','鎖魂獄卒','shambhala',100,'重甲','鎖魂鏈節','天獄黑金印'],
  ['e_shambhala_scribe','焚名咒吏','shambhala',106,'術士','焚名紙灰','天獄封魂筆',true],
  ['thug','巷口惡棍','legacy-dungeon',1,'均衡','破舊手套','銅指虎'],
  ['pirate','沉帆刀匪','legacy-dungeon',15,'突襲','沉帆布','刀匪銀扣'],
  ['snowWoman','霜衣巫侍','legacy-dungeon',40,'術士','霜衣碎布','寒咒玉鈴'],
  ['wolf','暮影灰狼','legacy-dungeon',10,'突襲','灰狼毛','暮影狼牙'],
  ['snake','骨紋冥蟒','legacy-dungeon',40,'突襲','骨紋蛇鱗','冥蟒青膽'],
  ['relic_moss_warden','鏽甲苔衛','sunken-relic',38,'重甲','苔衛鏽甲','王朝銅徽'],
  ['relic_royal_skeleton','失名骸卒','sunken-relic',42,'均衡','骸卒骨片','失名軍牌'],
  ['relic_ash_wisp','祭壇燼靈','sunken-relic',45,'術士','祭壇灰燼','燼靈晶核'],
  ['relic_tide_leech','潮墓血蛭','sunken-relic',48,'突襲','潮墓黏液','血蛭腺晶'],
  ['relic_salt_raider','鹽霧亡匪','sunken-relic',52,'突襲','鹽霧破帆','亡匪金扣'],
  ['relic_crystal_beetle','裂晶甲蟲','sunken-relic',56,'重甲','裂晶蟲甲','古晶心石'],
  ['relic_venom_cerberus','毒沼三顎蜥','sunken-relic',62,'突襲','三顎毒牙','濃縮沼毒核',true],
  ['relic_golden_scarab','日蝕金甲蟲','sunken-relic',68,'重甲','日蝕金片','太陽蟲珀',true],
  ['relic_silent_oracle','無聲王座祭司','sunken-relic',74,'術士','王座祭紙','無聲神諭石',true],
];

const roleFactors: Record<MonsterRole, { hp: number; atk: number; dex: number; physical: number; magic: number; description: string }> = {
  群居: { hp: .65, atk: .7, dex: 12, physical: .2, magic: .2, description: '血量低、容易成群清理；適合範圍攻擊。' },
  均衡: { hp: 1, atk: 1, dex: 18, physical: .55, magic: .55, description: '攻守均衡，適合穩定練功。' },
  重甲: { hp: 1.6, atk: .8, dex: 8, physical: 1.2, magic: .25, description: '血量與物防高、魔防低；適合法術隊伍。' },
  突襲: { hp: .75, atk: 1.25, dex: 35, physical: .3, magic: .3, description: '出手快、傷害高但脆弱；需要優先清除。' },
  術士: { hp: .8, atk: 1.15, dex: 14, physical: .25, magic: 1.1, description: '遠程魔法攻擊，魔防高但物防低。' },
};
export type RedesignedMonster = {
  name: string; region: string; level: number; role: MonsterRole; elite: boolean;
  hp: number; mp: number; atk: number; dex: number; xp: number; gold: number;
  physicalDefense: number; magicDefense: number; ranged: boolean; magicAttack: boolean;
  description: string; materialDrops: MonsterDrop[];
  encounterTier: EncounterTier; attackInterval: number;
  pressureRatio: number; pressureDefense: number;
};

export const MONSTER_REDESIGN: Record<string, RedesignedMonster> = Object.fromEntries(rows.map(([id, name, region, oldLevel, role, common, rare, oldElite = false]) => {
  const level = WORLD_MONSTER_LEVELS[id] ?? oldLevel;
  const elite = oldElite || id === 'e_white_tiger_trainer';
  const encounterTier = worldEncounterTier(id, region, elite, role);
  const factor = roleFactors[role], rank = elite ? 2.4 : 1;
  const hp = Math.round((16 + 6 * level + 1.4 * level ** 2) * factor.hp * rank);
  const atk = Math.round((4 + 1.5 * level + .12 * level ** 2) * factor.atk * (elite ? 1.35 : 1));
  const gold = Math.round((4 + 3 * level + .6 * level ** 2) * rank);
  const value = Math.max(5, Math.round(gold * .8));
  const design: RedesignedMonster = {
    name, region, level, role, elite, hp, atk, mp: role === '術士' ? 30 + level * 12 : 0,
    dex: Math.min(65, factor.dex + Math.floor(level / 4)), xp: Math.round((10 + 8 * level + 2 * level ** 2) * rank), gold,
    physicalDefense: Math.round(level * 2 * factor.physical), magicDefense: Math.round(level * 2 * factor.magic),
    encounterTier, attackInterval: Math.max(.6, 2.2 - Math.min(65, factor.dex + Math.floor(level / 4)) / 100),
    pressureRatio: 0, pressureDefense: 0,
    ranged: role === '術士', magicAttack: role === '術士', description: `${MONSTER_REGION_LABELS[region]}的${name}。${factor.description}`,
    materialDrops: [{ item: common, rate: 45, price: value }, { item: rare, rate: elite ? 8 : 4, price: value * 12 }],
  };
  if (WORLD_MONSTER_PROGRESSION[region]) {
    // Lv.36+ is calibrated against unlocked promotion ranks, not unpromoted starter templates.
    // Low-level encounters and the scripted tutorial remain unchanged.
    if (level > 2) {
      design.hp = WORLD_MONSTER_HP[id];
      design.atk = Math.round((4 + 1.5 * level + .012 * level ** 2) * factor.atk * (elite ? 2.5 : encounterTier === '主力怪' ? 1.5 : 1));
      design.physicalDefense = Math.round(level * factor.physical);
      design.magicDefense = Math.round(level * factor.magic);
      if (level >= 36) Object.assign(design, promotedMonsterCombat(level, encounterTier, factor.atk));
    }
    design.attackInterval = role === '重甲' ? 2.8 : role === '突襲' ? 1.2 : role === '術士' ? 2.4 : 2;
    // Entry targets favor XP efficiency; elites favor trade goods rather than universal best farming.
    if (level > 2) design.xp = Math.round((10 + 8 * level + 2 * level ** 2) * (elite ? 1.7 : encounterTier === '入口怪' ? 1.1 : 1));
    design.description = `${MONSTER_REGION_LABELS[region]}的${name}。${encounterTier}・${encounterTier === '入口怪' ? '低風險經驗路線' : elite ? '稀有素材路線，需注意補給' : '穩定銀兩與練功路線'}。${factor.description}`;
    if (design.pressureRatio) design.description += `高階壓迫：命中時附加目標最大 HP 的 ${Number((design.pressureRatio * 100).toFixed(1))}% 基準傷害，另受防禦、抗性與減傷影響。`;
  }
  // This scripted encounter must remain beatable by the first companion; its story uses the stable ID.
  // Keep the requested tutorial combat values, but do not retain an elite's
  // XP reward on a one-hit, near-zero-pressure repeatable encounter.
  if (id === 'e_starter_black_bandit') Object.assign(design, { hp: 52, atk: 5, xp: 40, physicalDefense: 0, magicDefense: 0 });
  return [id, design];
}));

export const REDESIGNED_MATERIAL_PRICES: Record<string, number> = Object.fromEntries(
  Object.values(MONSTER_REDESIGN).flatMap(monster => monster.materialDrops.map(drop => [drop.item, drop.price])),
);

export function redesignMonsterTable<T extends Record<string, object>>(table: T) {
  return Object.fromEntries(Object.entries(table).map(([id, monster]) => [id, { ...monster, ...MONSTER_REDESIGN[id] }])) as {
    [K in keyof T]: T[K] & Partial<RedesignedMonster>;
  };
}

/** Boss combat is unchanged; their existing trade goods now have explicit appraisals. */
export const BOSS_MATERIAL_PRICES: Record<string, number> = {
  '高級方天戟': 4500, '見月劍': 4800, '上級精髓': 1200,
  '天照的手套': 18000, '黃帝的腰帶': 20000, '結冰石': 900, '黃金海星的殼': 6500,
  '海星碎片': 700, '[天璇]咒術秘訣': 24000, '神獸之根源(白虎)': 12000,
  '狂虎之爪': 4200, '狂虎鬍鬚': 2200, '白虎的罈子': 8500,
  '多聞天王的冠飾': 18000, '廣目天王的寶珠': 22000, '神獸之魂(玄武)': 9000,
  '神獸之魂(白虎)': 10000, '須彌石': 1600,
  '沉沒王冠': 14000, '王朝核心': 18000, '古代Boss裝備': 25000,
  '海龍逆鱗': 18000, '深淵龍心': 24000, '鎮墓核心': 24000, '虛空巨鎧': 28000,
  '女皇潮冠': 32000, '深海王印': 36000,
  '遺跡碎片': 600, '遺跡材料': 350, '古代裝備': 2500,
};

/** Each encounter rolls two independent material slots; rates use percent, roll uses [0,1]. */
export function rollRedesignedMaterials(id: string, rolls: number[]) {
  return (MONSTER_REDESIGN[id]?.materialDrops ?? []).filter((drop, index) => {
    const roll = rolls[index] ?? 1;
    return Number.isFinite(roll) && roll >= 0 && roll < drop.rate / 100;
  }).map(drop => drop.item);
}
