import type { GameState } from './game-state';
import type { NpcId, NpcOption } from './npc-dialogue';

/** Story choices are separate from once-only affinity conversations. */
export function hanyangNpcOptions(game: Pick<GameState, 'hanyangPrologueStep'>, npcId: NpcId): NpcOption[] {
  const step = game.hanyangPrologueStep;
  if (npcId === 'wang-deokchang' && step === 'caravan-crisis') return [{
    label: '詢問黑巾斥候的消息',
    reply: '北邊商路被黑巾斥候堵住了，貨物也被扣下。帶上你的槍兵，去驛路找回商隊貨物。',
    prologueStep: 'caravan-crisis',
  }];
  if (npcId === 'wang-deokchang' && step === 'caravan-delivery') return [{
    label: '交付找回的商隊貨物',
    reply: '這箱貨居然還完整……先把貨交給我。至於它真正值多少，我勸你記住接下來的話。',
    pages: ['在漢陽，這批貨頂多值幾百文。', '但送到北方城鎮，需求一上來，價格至少能翻上幾倍。', '看懂地域差價，你才算真正踏上商路。'],
    prologueStep: 'caravan-delivery',
  }];
  if (npcId === 'kim-seongho' && step === 'return') return [{ label: '回報商路平安', reply: '貨物已經找回並交給王德昌，北邊商路暫時安全了。', prologueStep: 'return' }];
  if (npcId === 'kim-seongho' && step === 'departure') return [{ label: '確認離開漢陽', reply: '去吧。別忘了，真正的商路才剛在城門外等著你。', prologueStep: 'departure' }];
  return [];
}

export function hanyangNpcGreeting(game: Pick<GameState, 'hanyangPrologueStep'>, npcId: NpcId): string | null {
  if (npcId === 'wang-deokchang' && game.hanyangPrologueStep === 'caravan-crisis') return '你已經有夥伴了？正好，北邊商路出了事。黑巾斥候攔下了一箱貨，我需要你們一起去找回來。';
  if (npcId === 'wang-deokchang' && game.hanyangPrologueStep === 'caravan-delivery') return '這箱貨……你真的從黑巾斥候手裡帶回來了？先別急著高興，我有件事要讓你看清楚。';
  if (npcId === 'kim-seongho' && game.hanyangPrologueStep === 'return') return '你回來了。王德昌已把貨物收妥？那麼，告訴我北邊商路究竟發生了什麼。';
  if (npcId === 'kim-seongho' && game.hanyangPrologueStep === 'departure') return '我都聽明白了。漢陽欠你一份人情，但別把這裡當成終點。';
  return null;
}
