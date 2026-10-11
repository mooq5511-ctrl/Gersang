import type { GameState } from './game-state';
import type { NpcId, NpcOption } from './npc-dialogue';

type StoryProgress = Pick<GameState, 'hanyangPrologueStep'> & Partial<Pick<GameState, 'trade' | 'relicDungeon'>>;

/** Story choices are separate from once-only affinity conversations. */
export function hanyangNpcOptions(game: StoryProgress, npcId: NpcId): NpcOption[] {
  const step = game.hanyangPrologueStep;
  if (npcId === 'kim-seongho' && step === 'arrival') return [{
    label: '我該如何重開商路？',
    reply: '新掌櫃，先別急著遠行。漢陽的驛路不通，你的商團和村裡的藥材車都得停在這裡。',
    pages: ['先接下送貨委託，到新手村郊外擊敗 3 隻偷糧狸，再回來找我回報。', '謝禮能替你添置補給；接著招募一位護衛，你才有本錢保住下一車貨。', '你不必一次學會所有生意。先讓第一車貨平安抵達，再把商路帳簿翻向下一頁。'],
  }];
  if (npcId === 'wang-deokchang' && step === 'journey-fund') return [{
    label: '領取啟程資金，請教遠行準備',
    reply: '你肯把戰利品換成周轉銀兩，就知道生意不能只靠一把劍。啟程資金我替你備好，先把補給與護衛安排妥當。',
    pages: ['先去藥店買 1 瓶金創藥，再到傭兵公會招募第一位夥伴。', '有夥伴還不夠，要確認他已在出戰名單中。商團的錢要換成真正能守住貨物的力量。'],
    prologueStep: 'journey-fund',
  }];
  if (npcId === 'hong-museong' && step === 'guild') return [{
    label: '第一位護衛，該怎麼選？',
    reply: '先招募一名新手槍兵。別只把他當作帳簿上的戰力數字，他是要與你一起走過驛路的人。',
    pages: ['前往傭兵公會招募；加入後，到主角與隊伍確認出戰狀態，並替他穿戴裝備。', '先一起練功。到 Lv.12 時，持有對應兵符才能選擇槍或弓的轉職路線，不是到等級就自動轉職。'],
  }];
  if (npcId === 'wang-deokchang' && step === 'caravan-crisis') return [{
    label: '詢問黑巾斥候的消息',
    reply: '北邊商路被黑巾斥候堵住了，貨物也被扣下。帶上你的槍兵，去驛路找回商隊貨物。',
    prologueStep: 'caravan-crisis',
  }];
  if (npcId === 'wang-deokchang' && step === 'caravan-delivery') return [{
    label: '交付找回的商隊貨物',
    reply: '這箱貨居然還完整……先把貨交給我。至於它真正值多少，我勸你記住接下來的話。',
    pages: ['貨物找回來了，商團才能繼續接下一筆生意。護衛的價值，就在這一趟平安回程。', '不同城鎮的需求與運送成本不同；看帳面售價之前，要先看實際報價與結算收益。', '離開漢陽後，到港口完成第一趟東海交易。那是你把戰鬥、養兵和經營串起來的第一筆紀錄。'],
    prologueStep: 'caravan-delivery',
  }];
  if (npcId === 'kim-seongho' && step === 'return') return [{ label: '回報商路平安', reply: '貨物已經找回並交給王德昌，北邊商路暫時安全了。', prologueStep: 'return' }];
  if (npcId === 'kim-seongho' && step === 'departure') return [{ label: '確認離開漢陽', reply: '你替漢陽守住了第一車貨。去吧，新掌櫃，下一頁帳簿要由你自己寫。', pages: ['離城後，先到港口完成第一趟東海交易；任務列的「前往」會帶你找到下一步。', '第一章的終點，是完成這趟交易，並帶領整備好的隊伍擊敗第一層遺跡守衛。不是現在就去硬闖，先用生意與練功養成商團。'], prologueStep: 'departure' }];
  if (npcId === 'wang-deokchang' && step === 'completed' && game.trade) return [{
    label: '翻開商路帳簿，接下來去哪？',
    reply: !(game.trade.trips || game.trade.totalProfit) ? '先到港口查看東海商路，依畫面報價安排可派遣的傭兵；等這趟運輸實際結算，才算完成第一筆遠行。' : game.relicDungeon?.clearedRuns ? '首趟遠行與遺跡首層都留下了紀錄。接下來可挑戰第二層遺跡；世界地圖的道路，仍要逐一擊敗守路首領才能開通。' : '第一筆遠行已結算，沿岸船家卻帶來了沉沒遺跡的傳聞。這次不只為了寶物：商團要繼續走海路，就得查清那裡藏著什麼。先查看商路帳簿安排調查與整備；派遣中的傭兵不能同時參與世界地圖戰鬥。',
    pages: ['銀兩用來招募、配裝與補給；傭兵守住商路，地下城則考驗整備的成果。', '不必把所有每日任務做完。隨時打開商路帳簿，只跟著目前主線走，也能知道下一個目標。'],
  }];
  return [];
}

export function hanyangNpcGreeting(game: StoryProgress, npcId: NpcId): string | null {
  if (npcId === 'kim-seongho' && game.hanyangPrologueStep === 'arrival') return '你就是準備重開商路的新掌櫃？來得正好。港口的藥材車被堵在村外，先替漢陽清出驛路，讓你的商團從這一筆委託重新起步。';
  if (npcId === 'wang-deokchang' && game.hanyangPrologueStep === 'journey-fund') return '第一場買賣做完了？我替你備了一筆啟程資金。先買藥、找護衛，別讓下一次出發變成孤身冒險。';
  if (npcId === 'hong-museong' && game.hanyangPrologueStep === 'guild') return '商團要走遠路，先找能同行的人。第一位新手槍兵正在公會等一份合約；把他帶上，也把他的性命放在心上。';
  if (npcId === 'wang-deokchang' && game.hanyangPrologueStep === 'caravan-crisis') return '你已經有夥伴了？正好，北邊商路出了事。黑巾斥候攔下了一箱貨，我需要你們一起去找回來。';
  if (npcId === 'wang-deokchang' && game.hanyangPrologueStep === 'caravan-delivery') return '這箱貨……你真的從黑巾斥候手裡帶回來了？先別急著高興，我有件事要讓你看清楚。';
  if (npcId === 'kim-seongho' && game.hanyangPrologueStep === 'return') return '你回來了。王德昌已把貨物收妥？那麼，告訴我北邊商路究竟發生了什麼。';
  if (npcId === 'kim-seongho' && game.hanyangPrologueStep === 'departure') return '我都聽明白了。漢陽欠你一份人情，但別把這裡當成終點。';
  return null;
}
