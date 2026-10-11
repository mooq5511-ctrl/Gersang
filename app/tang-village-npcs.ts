/** Provisional roles and placements pending the approved reference image originals. */
export const TANG_VILLAGE_NPCS = [
  { id: 'mother', number: '01', name: '母親', place: '主角家門前', role: 'P-01／P-02', x: 34, y: 94, portrait: '/assets/tang-prologue/mother-v1.png', line: '早些回來，娘等你吃晚飯。' },
  { id: 'elder', number: '02', name: '村長', place: '村中老槐樹下', role: '村莊介紹', x: 52, y: 42, portrait: null, line: '這村子雖小，左鄰右舍卻都熟識。出門前和大家打個招呼吧。' },
  { id: 'grocer', number: '03', name: '雜貨掌櫃', place: '雜貨鋪門前', role: '商店介紹', x: 79, y: 50, portrait: null, line: '針線、麻繩、火摺子，出門的零碎都在這兒。今日店裡正在盤貨，暫不交易。' },
  { id: 'farmer', number: '04', name: '老農', place: '西側田埂', role: '田間閒談', x: 12, y: 47, portrait: null, line: '昨夜落了些雨，苗兒長得精神。路上若踩著濕泥，慢些走。' },
  { id: 'smith', number: '05', name: '鐵匠', place: '東側打鐵棚', role: '生活背景', x: 90, y: 73, portrait: null, line: '我打的是鋤頭鐮刀，莊稼人的日子靠這些。你的包帶鬆了，出門前記得繫牢。' },
  { id: 'child', number: '06', name: '村童', place: '村中水井旁', role: '村莊閒談', x: 65, y: 65, portrait: null, line: '你要去長安嗎？聽說那裡街市可大了！回來講給我聽，好不好？' },
  { id: 'grain-seller', number: '07', name: '糧販', place: '北側村口', role: '暫用買糧櫃檯', x: 73, y: 29, portrait: null, line: '今早磨的新米，八兩一袋。接了家中的囑託再來買吧。' },
] as const;

export type TangNpcId = typeof TANG_VILLAGE_NPCS[number]['id'];
