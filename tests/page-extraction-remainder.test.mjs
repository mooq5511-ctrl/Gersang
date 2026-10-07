import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';

// Compare the entire remaining page to the immutable pre-extraction commit.
// Only named reviewed feature boundaries may be replaced with stable markers.
const previous=execFileSync('git',['show','6c66ce3:app/game-v15.tsx'],{encoding:'utf8',maxBuffer:8*1024*1024});
function page(text,value){
  const sf=ts.createSourceFile('page.tsx',text,99,true,ts.ScriptKind.TSX);let result;
  function visit(node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(sf)==='TabsContent'&&node.openingElement.attributes.properties.some(attr=>attr.name?.text==='value'&&attr.initializer?.text===value))result=node;ts.forEachChild(node,visit);}
  visit(sf);assert.ok(result,value);return {sf,node:result};
}
function className(node){return ts.isJsxElement(node)?node.openingElement.attributes.properties.find(attr=>attr.name?.text==='className')?.initializer?.text:undefined;}
function reviewed(node,sf,value){
  if(value==='city'){
    if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(sf)==='GemWorkshop'||className(node)==='panel gem-workshop')return 'gem-workshop';
    if(ts.isJsxExpression(node)&&node.expression&&ts.isBinaryExpression(node.expression)){
      const left=node.expression.left.getText(sf).replace(/[\s"']/g,'');
      if(left==='cityService===mercenary')return 'recruitment';
      if(left==='(cityService===weapon||cityService===armor)')return 'equipment-shops';
    }
  }
  if(value==='battle'){
    const classes={'world-map-voyage-layout':'map-navigation','battle-world-map-description':'map-description','onboarding-battle-guide':'tutorial-guide','monster-choice-list':'monster-cards','tutorial-hunt-objective':'added-tutorial-action'};
    if(ts.isJsxExpression(node)&&node.expression&&ts.isBinaryExpression(node.expression))return classes[className(node.expression.right)];
    if(ts.isJsxElement(node)&&className(node)==='battle-world-map-description')return 'map-description';
  }
}
function normalized(text,value){
  const {sf,node}=page(text,value),seen={};
  function canonical(n){
    if(ts.isJsxText(n)&&!n.text.trim())return null;
    const boundary=reviewed(n,sf,value);
    if(boundary){seen[boundary]=(seen[boundary]||0)+1;return boundary==='added-tutorial-action'?null:['reviewed-feature',boundary];}
    if(ts.isParenthesizedExpression(n))return canonical(n.expression);
    const children=[];ts.forEachChild(n,child=>{if(child.kind!==ts.SyntaxKind.ExportKeyword){const c=canonical(child);if(c!==null)children.push(c);}});
    let literal='';if(ts.isIdentifier(n)||ts.isStringLiteralLike(n)||ts.isNumericLiteral(n))literal=n.text;
    if(ts.isJsxText(n))literal=n.text.replace(/\s+/g,' ').trim();
    return [n.kind,literal,children];
  }
  return {tree:canonical(node),seen};
}
for(const value of ['city','battle'])test(`${value} entire unreviewed page remainder matches pre-extraction commit`,()=>{
  const current=readFileSync(new URL(`../app/game-${value}-page.tsx`,import.meta.url),'utf8');
  const actual=normalized(current,value),expected=normalized(previous,value);
  assert.deepEqual(actual.tree,expected.tree);
  const {['added-tutorial-action']:added,...actualBoundaries}=actual.seen;
  assert.deepEqual(actualBoundaries,expected.seen);
  assert.equal(added,value==='battle'?1:undefined);
  assert.deepEqual(expected.seen,value==='city'?{'recruitment':1,'equipment-shops':1,'gem-workshop':1}:
    {'map-navigation':1,'map-description':2,'tutorial-guide':1,'monster-cards':1});
});
test('remainder audit rejects unrelated callbacks, removed formation and changed root gate',()=>{
  const city=readFileSync(new URL('../app/game-city-page.tsx',import.meta.url),'utf8');
  const battle=readFileSync(new URL('../app/game-battle-page.tsx',import.meta.url),'utf8');
  for(const [value,original,broken] of [
    ['city',city,city.replace('depositToWarehouse(item.uid)','depositToWarehouse("wrong")')],
    ['city',city,city.replace('formations.map','[].map')],
    ['battle',battle,battle.replace('battlePanelVisibility.partyVitals &&','false &&')],
  ]){
    assert.notEqual(broken,original);assert.notDeepEqual(normalized(broken,value).tree,normalized(previous,value).tree);
  }
});
