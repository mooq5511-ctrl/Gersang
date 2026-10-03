// Read-only catalog exporter: node scripts/export-monster-catalog.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: filename,
}).outputText, filename);
require.extensions['.tsx'] = require.extensions['.ts'];
const { monsterCatalogEntries: entries } = require('../app/monster-compendium-data.ts');
const { MONSTER_REGION_LABELS, MONSTER_REDESIGN } = require('../data/monsters/monster-redesign.ts');
const COMPENDIUM_MAP_IDS = Object.keys(MONSTER_REGION_LABELS);
const lines = [
  '# 全區域怪物與戰利品數值表', '',
  `目前共 ${COMPENDIUM_MAP_IDS.length} 個區域分類、${entries.length} 個怪物 ID；${Object.keys(MONSTER_REDESIGN).length} 隻小怪重製。`, '',
  'Boss 保留名稱與戰鬥數值。舊怪物 ID 保留，新手村長與小嚮導的任務流程保留。', '',
  'HP、MP、攻擊、速度、物防、魔防、經驗與銀兩為每隻怪物的基礎數值；白虎林大型隊伍倍率只保留於首領。一般怪依入口怪、主力怪、菁英分階。', '',
  '世界地圖 Lv.36 起以已晉升傭兵及自動技能校準，不使用未晉升新兵估算終盤強度；Lv.72 起小怪有受防禦、抗性及減傷影響的高階壓迫，完整計算規則見 world-monster-progression.md。', '',
  '素材以每場勝利抽取：一般材料 45%，稀有材料普通怪 4%、菁英 8%，兩格獨立判定。價格為每件交易所收購價，販售價為兩倍；新手首戰另保證一件一般戰利品。', '',
  '古錢箱為新手區每場固定獎勵（售價 1 兩，全部出售時保留）；新手兌換銅錢為特殊貨幣，不能出售。', '',
  '世界 Boss 保留原本每場選一件材料的規則；遺跡 Boss 以其 drop 機率選一件。極稀有神裝每件 0.01%，一場最多一件；地區等級裝備另依原有裝備掉落表與角色等級判定。', '',
];
for (const region of COMPENDIUM_MAP_IDS) {
  lines.push(`## ${MONSTER_REGION_LABELS[region]}`, '', '| 怪物／ID | 類別／定位 | 等級 | HP／MP | 攻擊／速度 | 物防／魔防 | EXP／銀兩 | 素材（機率；每件收購價） | 極稀有裝備（機率；回收價） |', '|---|---|---:|---:|---:|---:|---:|---|---|');
  for (const entry of entries.filter(entry => entry.mapId === region)) {
    const goods = entry.dropDetails.map(drop => `${drop.item}（${Number(drop.rate.toFixed(2))}%；${drop.price} 兩）`).join('、') || '無';
    const gear = entry.equipmentDrops.map(drop => `${drop.item}（${drop.rate}%；${drop.price} 兩）`).join('、') || '無';
    const monster = require('../app/dungeon-engine.ts').DUNGEONS[entry.id];
    lines.push(`| ${entry.name}／${entry.id} | ${entry.kind}／${entry.role} | ${entry.level} | ${entry.hp}／${entry.mp} | ${entry.atk}／${monster.dex} | ${entry.physicalDefense}／${entry.magicDefense} | ${entry.exp}／${entry.gold} | ${goods} | ${gear} |`);
  }
  lines.push('');
}
console.log(lines.join('\n'));
