import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const {usesPromotionV1}=createRequire(import.meta.url)('../app/mercenary-growth-v1.ts');
const source=readFileSync(new URL('../app/caravan-status.tsx',import.meta.url),'utf8');
const sf=ts.createSourceFile('caravan-status.tsx',source,99,true,ts.ScriptKind.TSX);
const fn=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='CharacterAbilityShortcut');
assert.ok(fn);
const GameDetailDialog=()=>{},AbilityPanel=()=>{},MercenaryStatusWindow=()=>{};
const context=vm.createContext({exports:{},GameDetailDialog,AbilityPanel,MercenaryStatusWindow,usesPromotionV1,
  require:()=>({jsx:(type,props)=>({type,props})})});
vm.runInContext(ts.transpileModule(fn.getText(sf),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:99,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
const allocate=()=>{},power=()=>10,promote=()=>{},promotionItems={seal:1};
const render=unit=>context.exports.CharacterAbilityShortcut({unit,allocate,power,promote,promotionItems});
test('visible earned points open existing hero or mercenary allocation panel without allocating on render',()=>{
  for(const uid of ['hero','merc']) {
    const unit={uid,name:uid,points:15},before=structuredClone(unit),entry=render(unit);
    assert.equal(entry.type,GameDetailDialog);assert.equal(entry.props.trigger,'分配能力（15 點）');
    const panel=entry.props.children;
    assert.equal(panel.type,uid==='hero'?AbilityPanel:MercenaryStatusWindow);
    assert.equal(panel.props.allocate,allocate);
    assert.equal(uid==='hero'?panel.props.hero:panel.props.unit,unit);
    if(uid!=='hero'){assert.equal(panel.props.promote,promote);assert.equal(panel.props.promotionItems,promotionItems);}
    assert.deepEqual(unit,before);
  }
});
test('no earned points means no extra action and shortcut is wired to selected roster',()=>{
  for(const points of [0,-1,undefined,NaN])assert.equal(render({uid:'hero',points}),null);
  assert.match(source,/<CharacterAbilityShortcut unit=\{selectedRoster\} power=\{p.power\} allocate=\{p.allocate\}/);
});

test('live spear and bow trees have a direct promotion entry even with no unspent points',()=>{
  for(const templateId of ['merchant-spear','merchant-promotion-bow'])for(const points of [0,3,undefined,NaN]){
    const unit={uid:'merc',templateId,name:'傭兵',points,promotionStage:2,level:12};
    const before=structuredClone(unit),entry=render(unit);
    assert.equal(entry.type,GameDetailDialog);
    assert.match(entry.props.title,/兵種轉職與能力/);
    assert.equal(entry.props.trigger,`兵種轉職／配點（${points===3?3:0} 點）`);
    assert.match(entry.props.description,/成功轉職才扣兵符/);
    assert.equal(entry.props.children.type,MercenaryStatusWindow);
    assert.equal(entry.props.children.props.unit,unit);
    assert.equal(entry.props.children.props.promote,promote);
    assert.equal(entry.props.children.props.promotionItems,promotionItems);
    assert.deepEqual(unit,before);
  }
});

test('direct promotion entry does not invent a tree for unrelated units or the hero',()=>{
  assert.equal(render({uid:'merc',templateId:'merchant-shield',points:0}),null);
  assert.equal(render({uid:'hero',templateId:'merchant-spear',points:0}),null);
});
