import { effectiveEquipmentStats } from './equipment-stats.ts';
import {warSeal} from './war-seals.ts';
import {v1Definition,v1QualityMultiplier,v1EnhancementMultiplier} from './equipment-v1-policy.ts';

export type TooltipField = { label: string; value: string };
export type ItemTooltipData = {
  name: string;
  image?: string;
  quality: string;
  kind: string;
  description: string;
  sellPrice: number;
  stack: number;
  owned: number;
  source: string;
  sections: Array<{ title: string; fields: TooltipField[] }>;
};

export type TooltipEquipment = {
  definitionId?: string;
  balanceVersion?: string;
  name: string;
  image?: string;
  rarity?: string;
  source?: string;
  atk?: number;
  def?: number;
  hp?: number;
  enhance?: number;
  enhanceBonuses?: Array<{ name?: string; text?: string; stat?: string; value?: number }>;
  magic?: Array<{ id?: string; name?: string; text?: string; stat?: string; value?: number; color?: string }>;
  resist?: { physical?: number; magic?: number };
  socketGem?: { name: string; count: number; totalValue: number };
  skill?: string;
  requiredLevel?: number;
  requiredJob?: string;
  durability?: number;
  bonus?: { str?: number; agi?: number; intel?: number; vit?: number };
};
export type TooltipMedicine = {
  id: string;
  name: string;
  effect: string;
  price: number;
  hpRestore?: number;
  mpRestore?: number;
  cooldown?: number;
  image?: string;
  source?: string;
};
export type TooltipEnemy = { name: string; drops: string[] };

const format = (value: number) =>
  Math.max(0, Math.floor(value || 0)).toLocaleString('zh-TW');
const materialMetadata: Record<
  string,
  { description: string; image?: string }
> = {
  古錢箱: {
    description: '開啟後可獲得新手兌換銅錢，也能直接出售。',
    image: '/assets/sprites/loot-rare-cute-v1.png',
  },
};

function base(
  data: Omit<ItemTooltipData, 'sections'>,
): Array<{ title: string; fields: TooltipField[] }> {
  return [
    {
      title: '基本資訊',
      fields: [
        { label: '品質', value: data.quality },
        { label: '種類', value: data.kind },
        { label: '說明', value: data.description },
        { label: '販售價格', value: `${format(data.sellPrice)} 兩` },
        { label: '堆疊數量', value: `×${format(data.stack)}` },
        { label: '目前持有', value: `×${format(data.owned)}` },
        { label: '取得來源', value: data.source || '—' },
      ],
    },
  ];
}

/** Pure metadata adapter: the UI supplies existing databases and only renders these returned fields. */
export const ItemTooltipManager = Object.freeze({
  equipment(
    item: TooltipEquipment,
    options: {
      kind: string;
      description: string;
      sellPrice: number;
      owned: number;
    },
  ): ItemTooltipData {
    const effective = effectiveEquipmentStats(item);
    const data = {
      name: item.name,
      image: item.image,
      quality: item.rarity || '普通',
      kind: options.kind,
      description: options.description,
      sellPrice: options.sellPrice,
      stack: 1,
      owned: options.owned,
      source: item.source || '未知來源',
    };
    return {
      ...data,
      sections: [
        ...base(data),
        {
          title: '裝備屬性',
          fields: [
            { label: '攻擊', value: `+${format(effective.atk)}` },
            { label: '防禦', value: `+${format(effective.def)}` },
            { label: '生命', value: `+${format(effective.hp)}` },
            { label: '力量', value: `+${format(item.bonus?.str || 0)}` },
            { label: '敏捷', value: `+${format(item.bonus?.agi || 0)}` },
            { label: '智力', value: `+${format(item.bonus?.intel || 0)}` },
            { label: '體質', value: `+${format(item.bonus?.vit || 0)}` },
            ...(item.resist?.physical ? [{ label: '物理抗性', value: `+${format(item.resist.physical)}` }] : []),
            ...(item.resist?.magic ? [{ label: '魔法抗性', value: `+${format(item.resist.magic)}` }] : []),
            {
              label: '需求等級',
              value: `Lv.${Math.max(1, Math.floor(item.requiredLevel || 1))}`,
            },
            { label: '需求職業', value: item.requiredJob || '不限' },
            ...(typeof item.durability === 'number'
              ? [{ label: '耐久度', value: format(item.durability) }]
              : []),
          ],
        },
        ...(item.enhance ? [{ title: '強化與鑲嵌', fields: [
          { label: '強化等級', value: `+${format(item.enhance)}` },
          ...(item.socketGem ? [{ label: '鑲嵌寶石', value: `${item.socketGem.name} ×${format(item.socketGem.count)}（+${format(item.socketGem.totalValue)}）` }] : []),
          ...(item.enhanceBonuses || []).map(bonus => ({ label: bonus.name || bonus.stat || '強化效果', value: bonus.text || `+${format(bonus.value || 0)}` })),
        ] }] : item.socketGem || item.enhanceBonuses?.length ? [{ title: '強化與鑲嵌', fields: [
          ...(item.socketGem ? [{ label: '鑲嵌寶石', value: `${item.socketGem.name} ×${format(item.socketGem.count)}（+${format(item.socketGem.totalValue)}）` }] : []),
          ...(item.enhanceBonuses || []).map(bonus => ({ label: bonus.name || bonus.stat || '強化效果', value: bonus.text || `+${format(bonus.value || 0)}` })),
        ] }] : []),
        ...(item.magic?.filter(affix => !affix.id?.startsWith('socket-')).length ? [{ title: '魔法詞條', fields: item.magic.filter(affix => !affix.id?.startsWith('socket-')).map(affix => ({ label: affix.name || affix.stat || '附加效果', value: affix.text || `+${format(affix.value || 0)}` })) }] : []),
        ...(item.skill ? [{ title: '裝備技能', fields: [{ label: '技能', value: item.skill }] }] : []),
        ...(v1Definition(item) ? [{title:'新版系列規則',fields:[
          {label:'品質倍率',value:`×${v1QualityMultiplier(item.rarity)}（已計入上方核心）`},
          {label:'強化倍率',value:`×${Number(v1EnhancementMultiplier(item.enhance||0).toFixed(2))}（每級4%，最高+15）`},
          {label:'品質合成',value:'3件同款同品質加銀兩，保證升階；強化或鑲嵌後不可投入'},
          {label:'求知契印',value:'新版加成每人最高25%，再取出戰隊伍平均；舊裝加成另計'},
          {label:'特殊加成',value:'新版穿戴總增幅：攻擊／防禦各35%、生命30%、魔力25%，四項共用80%；依角色結算，單件原值不代表實際增幅'},
          {label:'裝備抗性',value:'新版额外物理／魔法抗性各最高25點，合計最高40點；天生抗性不占此額度'},
        ]}] : []),
      ],
    };
  },

  material(
    name: string,
    quantity: number,
    sellPrice: number,
    enemies: readonly TooltipEnemy[],
    image?: string,
  ): ItemTooltipData {
    const metadata = materialMetadata[name];
    const seal=warSeal(name);
    const sources = enemies
      .filter((enemy) => enemy.drops.includes(name))
      .map((enemy) => enemy.name);
    const data = {
      name,
      image: image || metadata?.image,
      quality: seal?'稀有':'普通',
      kind: seal?'完整兵符':'材料',
      description:
        seal?`${['長弓兵符','強弓兵符'].includes(name)?'弓兵路線':['長槍兵符','鐵騎兵符'].includes(name)?'槍兵路線':'槍／弓兵路線共用'}轉職至 ${seal.stage} 階，成功時消耗 1 枚完整兵符；不含碎片或合成。`:metadata?.description || '怪物掉落的材料，可用於交易、鍛造或兌換。',
      sellPrice,
      stack: quantity,
      owned: quantity,
      source: seal?.source || (sources.length ? sources.join('、') : '未記錄'),
    };
    return { ...data, sections: [...base(data),...(seal?[{title:'轉職需求',fields:[{label:'需求等級',value:`Lv.${seal.level}`},{label:'用途',value:`${seal.stage} 階轉職，消耗 1 枚`}]}]:[])] };
  },

  consumable(item: TooltipMedicine, quantity: number): ItemTooltipData {
    const data = {
      name: item.name,
      image: item.image,
      quality: '普通',
      kind: '消耗品',
      description: item.effect,
      sellPrice: item.price,
      stack: quantity,
      owned: quantity,
      source: item.source || '城鎮藥店',
    };
    const effects: TooltipField[] = [
      {
        label: '回血量',
        value: item.hpRestore
          ? `${Math.round(item.hpRestore * 100)}% 最大 HP`
          : '—',
      },
      {
        label: 'MP恢復',
        value: item.mpRestore
          ? `${Math.round(item.mpRestore * 100)}% 最大 MP`
          : '—',
      },
      {
        label: '冷卻時間',
        value: item.cooldown !== undefined ? `${item.cooldown} 秒` : '—',
      },
      { label: '使用效果', value: item.effect },
    ];
    return {
      ...data,
      sections: [...base(data), { title: '使用效果', fields: effects }],
    };
  },

  position(
    pointer: { x: number; y: number },
    viewport: { width: number; height: number },
    size = { width: 360, height: 380 },
  ) {
    const gap = 12,
      margin = 8;
    return {
      left: Math.max(
        margin,
        Math.min(pointer.x + gap, viewport.width - size.width - margin),
      ),
      top: Math.max(
        margin,
        Math.min(pointer.y + gap, viewport.height - size.height - margin),
      ),
    };
  },
});
