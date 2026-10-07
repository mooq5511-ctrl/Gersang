import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';

// These hashes were read from git 6c66ce3:app/game-v15.tsx, not regenerated
// from current modules. Original whole-page fixture files remain immutable.
const historical={
  'panel city-atlas':'456b222ac0377817e4fddb603980cfa39b708a9161fcffd9d8ce9cb1baf27fe6',
  'city-heading':'832808ceaa2a048ff68ae4007b59690dbc754e630d7b6c6475cec63546f0542f',
  'city-service-tabs':'93be1fee8b564518591cd2c926a172488949b214f97b3e85b9583ea1cbb19785',
  'warehouse':'2bd8e38fc23dced2f16a920a026a8ec491b71311358bdf0b885411ae41e41f33',
  'inn':'2de7997dd1646596309756e3ee7ed0ace40e08258e6e29aafd6d5e5497cd658c',
  'pharmacy':'e556ded544158666069072109288734489568929ff7014dc12097abb9e50e190',
  'exchange':'96695cc4bfa5c094c1bb3dbbdc7c04debee4760dfcef5efa51f5a944dc59ff14',
  'battle-panel-visibility':'db244b8163ab0814eb7162a7d5f78719cc0f9d096206d67e0b910e386a89e1a3',
  'panel party-vitals':'70179a3889dbbb3f8f52ed8728a593e60a64b6156c4ccbc430dec7229ea84ab8',
  'battle-grid':'2067ad02435e00f1d50700c534915605124c4fd8f97e14a475f0d3c257475918',
};
function canonical(n){
  if(ts.isParenthesizedExpression(n))return canonical(n.expression);
  const children=[];ts.forEachChild(n,c=>{if(c.kind!==ts.SyntaxKind.ExportKeyword)children.push(canonical(c));});
  let value='';if(ts.isIdentifier(n)||ts.isStringLiteralLike(n)||ts.isNumericLiteral(n))value=n.text;
  if(ts.isJsxText(n))value=n.text.replace(/\s+/g,' ').trim();
  return [n.kind,value,children];
}
const hash=n=>createHash('sha256').update(JSON.stringify(canonical(n))).digest('hex');
function collect(text){
  const sf=ts.createSourceFile('page.tsx',text,99,true,ts.ScriptKind.TSX),found={};
  function visit(n){
    if(ts.isJsxElement(n)) {
      const attr=n.openingElement.attributes.properties.find(a=>a.name?.text==='className');
      const key=attr?.initializer?.text;
      if(key in historical)found[key]=hash(n);
    }
    // Hash the whole conditional, including the service gate and callbacks.
    if(ts.isJsxExpression(n)&&n.expression&&ts.isBinaryExpression(n.expression)) {
      const left=n.expression.left;
      if(ts.isBinaryExpression(left)&&left.left.getText(sf)==='cityService'&&ts.isStringLiteral(left.right)&&left.right.text in historical)
        found[left.right.text]=hash(n);
    }
    ts.forEachChild(n,visit);
  }
  visit(sf);return found;
}
const city=readFileSync(new URL('../app/game-city-page.tsx',import.meta.url),'utf8');
const battle=readFileSync(new URL('../app/game-battle-page.tsx',import.meta.url),'utf8');
test('ten unchanged city and battle sections retain original pre-extraction syntax trees',()=>{
  assert.deepEqual({...collect(city),...collect(battle)},historical);
});
test('historical section checks catch unintended warehouse and battle control changes',()=>{
  const warehouse=city.replace('depositToWarehouse(item.uid)','depositToWarehouse("wrong-item")');
  const controls=battle.replace('[key]: !previous[key]','[key]: true');
  assert.notEqual(warehouse,city);assert.notEqual(controls,battle);
  assert.notEqual(collect(warehouse).warehouse,historical.warehouse);
  assert.notEqual(collect(controls)['battle-panel-visibility'],historical['battle-panel-visibility']);
});
