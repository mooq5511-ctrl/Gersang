export type ReferenceCategory = {
  id: string;
  name: string;
  source: string;
  description: string;
  entries: string[];
};

const list = (value: string) => value.split("|").filter(Boolean);

export const referenceCategories: ReferenceCategory[] = [
  {
    id: "mercenary",
    name: "傭兵與將帥",
    source: "https://52jushang.com/yongbing/index2.asp",
    description: "國籍、主角、一般傭兵、將帥、怪物傭兵、神獸與天王養成索引。",
    entries: list("中國|朝鮮|日本|台灣|印度|主角|轉職主角|二轉主角|精靈|座騎|護身符|普通傭兵|一轉將帥|二轉將帥|改造|覺醒|傳說將帥|怪物傭兵|證書怪物|合體怪|新幻獸|凶獸|冥王|幻獸|神獸|四天王"),
  },
  {
    id: "skill",
    name: "技能",
    source: "https://52jushang.com/skill/index.asp",
    description: "主角、傭兵、將帥、怪物、神獸與商團技能分類。",
    entries: list("高級武器|變身武器|主角轉職|主角二轉|組合技|傭兵與普通武器|一轉將|二轉將|改造|覺醒|傳說將帥合體|幻獸|轉職怪物合體|神獸|凶獸|四天王|冥王|新幻獸|野外怪物|商團技能"),
  },
  {
    id: "quest",
    name: "任務與 NPC",
    source: "https://52jushang.com/quest/index.asp",
    description: "國籍、職業、中高階地區、重複任務、討伐與活動任務索引。",
    entries: list("訓練督監|戰鬥任務|商業任務|四季神|坐騎|二轉改造|主角轉職|主角二轉|千年湖|黑色商團|月奇峰|婚禮堂|少林寺|小玲的後院|冰雪神殿|隆山|五大神獸|玄武團|白虎團|破奧之塔|尼泊爾|印度北部|印度東部|印度西部|印度南部|冰城|帝王陵寢|神仙谷|日天鬼門|月天鬼門|須彌山|噩夢的縫隙|噩夢的根源|匡廬山藏身處|匡廬山峽谷|匡廬山地下神殿|香巴拉天獄|幻想溪谷夕陽|幻想溪谷黎明|星之房|混天儀混沌之門|精靈探索|每日任務普通|每日任務友好度|週間任務|七支刀|客棧傭兵任務|武道場|挑戰模式|血鬥專場|光之試煉|討伐齊天大聖|屬性任務|萬聖節活動|科舉考試|其他 NPC|深夜商店|如意寶珠"),
  },
  {
    id: "monster",
    name: "怪物與地區",
    source: "https://52jushang.com/monster/index.asp",
    description: "六大地區、特殊地形、討伐、巨型首領與活動怪物索引。",
    entries: list("朝鮮地面|大觀嶺|高手洞窟|巨濟海底洞|漢拏山|武寧王陵|月奇峰|千年湖|黑色商團營地|隆山|幽冥界|桂林星之房|介馬莊園|炎雀峰|白商會營地|黃天福的家|秘密場所|秘密祭壇|武道場|挑戰模式|血鬥專場|奇妙的傳說|中國地面|萬里長城|秦始皇陵墓|猿公的竹林|冰宮星之房|少林寺|小玲的後院|冰雪神殿|北海冰窟|詭異的洞窟|沼澤地帶|破奧之塔|神仙谷|狐仙的竹林|惡人村|炎魔洞|黑龍潭|精靈探索|日天鬼門|怨恨的房間|月天鬼門|怨望的祭壇|匡廬山頂部|光之試驗|隱身處地下墳墓|峽谷秘密研究所|地下神殿內部|混沌之門|幻想溪谷夕陽|幻想溪谷黎明|噩夢的龜裂|香巴拉天獄金庫|香巴拉關門勇猛試驗場|日本地面|日本海底洞|八幡平溫泉|大雪山冰谷|冰城|石鎚山|毒蛇的巢穴|鬼曲城|龍神之泉|台灣地面|海賊洞|海底洞|奇獨龜輪山|瘴氣森林|野獸林星之房|尼泊爾|尼泊爾石窟|印度北部|泰姬陵|印度東部|太陽寺院|武鬥場|印度西部|提婆神廟地下|印度南部|遺棄的海岸寺院|蒙古地面|帝王陵寢|須彌山|噩夢的縫隙|噩夢的房間|噩夢的根源|噩夢的祭壇|巨型 BOSS|國家討伐戰|詭異的包袱商|討伐齊天大聖|哪吒的試煉|聖誕節"),
  },
  {
    id: "item",
    name: "物品與裝備",
    source: "https://52jushang.com/item/index.asp",
    description: "主角與傭兵裝備、武器、防具、材料、交換與消耗品索引。",
    entries: list("主角武器|主角盔甲|主角頭盔|變身武器|匠人專用|其他武器|護身符|稱號|翅膀|三轉將裝備|驢|幻獸武器|神獸武器|凶獸武器|四天王裝備|冥王裝備|傳說將帥裝備|外形變換|屬性裝備|寶物|斧頭|雙刀|刀劍|棍棒|槍矛|護腕|爪刀|輪刃|娃娃|佛珠念珠|木魚佛鐘|扇子|飛鏢|投石索|庫爾喀彎刀|拐杖|珠子|飼養蛇|鈴鐺|鏡子|護符|針|弓箭|火繩槍鐵炮|筒炮|石弓|盔甲|頭盔|手套|腰帶|鞋子|戒指|衣服|帽子|遺物|套裝|暗商人|蒐集商友好度|蒐集商點數|國家貢獻度|白商會友好度|信用度|印章|材料|礦石|寶石|印記|工具|藥品|食物|交易品|其他物品|貴重消耗品|變身書|傳送符|咒術秘訣|經驗捲軸|傭兵證書|製造書"),
  },
  {
    id: "enchant",
    name: "鬼道與咒術",
    source: "https://52jushang.com/yanmo/index.asp",
    description: "鬼道、穿戴效果與五色咒術秘訣索引。",
    entries: list("鬼道說明|穿戴效果|藍色咒術|綠色咒術|赤色咒術|黃色咒術|褐色咒術"),
  },
  {
    id: "artisan",
    name: "匠人",
    source: "https://52jushang.com/jiangren/index.asp",
    description: "五種匠人職業、分解加工、寶石與採集場所索引。",
    entries: list("礦夫|藥師|鐵匠|煉金術士|細工師|鬼道分解|寶石鑲嵌|採礦場|採藥場"),
  },
  {
    id: "production",
    name: "生產",
    source: "https://52jushang.com/shengchan/index.asp",
    description: "生產地、設施分布與工作量系統索引。",
    entries: list("生產地經營|生產設施分布|工作量消除|農場|牧場|工廠|武器場|防具場"),
  },
  {
    id: "manufacture",
    name: "製造",
    source: "https://52jushang.com/jezo/cangku.asp",
    description: "物流、友好度商人與印度五地製造工房索引。",
    entries: list("物流倉庫|友好度商人|加德滿都|昌迪加爾|萊爾普洱|齋浦爾|班加羅爾"),
  },
  {
    id: "guild",
    name: "商團",
    source: "https://52jushang.com/shangtuan/shangtuan.asp",
    description: "商團制度、職位、攻城、旗幟、貢獻、技能與工房索引。",
    entries: list("商團介紹|商團職位|攻城兵種|旗幟|商團貢獻度|商團技能|商團工房|小商團"),
  },
  {
    id: "system",
    name: "公式與其他系統",
    source: "https://52jushang.com/qita/index.asp",
    description: "經驗、能力、隊伍公式與各種進階系統索引。",
    entries: list("戰鬥等級經驗|信用等級經驗|工作量消除|商團貢獻值|英雄的靈魂石|怪物等級|能力值算法|紅利公式|加工成功率|組隊公式|寶物地圖|社團|掃蕩令|生態地圖|屬性|陣法|星座|考古學|寶物製作|道具強化|正宗加工|戰鬥攻略|商業攻略|打獵攻略|村莊|快捷鍵"),
  },
];

export const progressionBranches = [
  { name: "一般傭兵", route: ["基礎傭兵", "一轉將帥", "二轉將帥", "改造／覺醒", "傳說將帥"] },
  { name: "印度路線", route: ["四國傭兵 Lv.100", "印度傭兵", "印度一轉將", "印度二轉將"] },
  { name: "怪物傭兵", route: ["怪物傭兵", "合體怪", "凶獸", "冥王"] },
  { name: "神獸路線", route: ["幻獸", "神獸", "四天王"] },
];

export type BattleMap = {
  id: string;
  name: string;
  region: string;
  enemyRegion?: string;
  unlockStage: number;
  theme: string;
  hpMultiplier: number;
  goldMultiplier: number;
  coreBonus: number;
  description: string;
};

export const battleMaps: BattleMap[] = [
  { id: "starter-outskirts", name: "新手村郊外", region: "新手軍營", enemyRegion: "朝鮮", unlockStage: 1, theme: "field", hpMultiplier: 0.8, goldMultiplier: 0.8, coreBonus: 0, description: "狸貓、倭寇與山賊出沒的六種新手遭遇地。" },
  { id: "millennium-lake", name: "千年湖", region: "朝鮮", enemyRegion: "朝鮮", unlockStage: 1, theme: "lake", hpMultiplier: 1.18, goldMultiplier: 1.12, coreBonus: 0, description: "擊敗新手村郊外的海賊王後方可進入。" },
  { id: "japan-sea", name: "日本海底洞", region: "日本", enemyRegion: "日本", unlockStage: 10, theme: "sea", hpMultiplier: 1.35, goldMultiplier: 1.25, coreBonus: 0, description: "潮汐與洞窟交錯的水屬戰場。" },
  { id: "miasma-forest", name: "瘴氣森林", region: "台灣", enemyRegion: "台灣", unlockStage: 15, theme: "forest", hpMultiplier: 1.55, goldMultiplier: 1.38, coreBonus: 1, description: "密林瘴氣使敵軍更加強韌。" },
  { id: "ice-temple", name: "冰雪神殿", region: "中國", enemyRegion: "中國", unlockStage: 20, theme: "ice", hpMultiplier: 1.8, goldMultiplier: 1.55, coreBonus: 1, description: "寒霜神殿，適合高階隊伍遠征。" },
  { id: "taj-mahal", name: "泰姬陵", region: "印度", enemyRegion: "印度", unlockStage: 30, theme: "desert", hpMultiplier: 2.15, goldMultiplier: 1.8, coreBonus: 1, description: "印度高階怪物盤據的古陵。" },
  { id: "sumeru", name: "須彌山", region: "特殊", unlockStage: 40, theme: "sumeru", hpMultiplier: 2.65, goldMultiplier: 2.15, coreBonus: 2, description: "神獸與冥界力量交會的險地。" },
  { id: "shambhala", name: "香巴拉天獄", region: "特殊", unlockStage: 50, theme: "shambhala", hpMultiplier: 3.25, goldMultiplier: 2.6, coreBonus: 3, description: "傳說隊伍才能征服的終極戰場。" },
];

export const referenceEntryCount = referenceCategories.reduce((sum, category) => sum + category.entries.length, 0);
