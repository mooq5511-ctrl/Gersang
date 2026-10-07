import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../app/caravan-status.tsx',import.meta.url),'utf8');
const sf=ts.createSourceFile('caravan-status.tsx',source,99,true,ts.ScriptKind.TSX);
const menus=[];
function visit(node){
  if(ts.isJsxOpeningElement(node)&&node.tagName.getText(sf)==='nav'&&node.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(sf)==='className'&&p.initializer?.text==='party-context-menu'))menus.push(node);
  ts.forEachChild(node,visit);
}
visit(sf);

test('formation hides only the character action menu and restores it on close',()=>{
  assert.equal(menus.length,1);
  const hidden=menus[0].attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(sf)==='hidden');
  assert.ok(hidden&&ts.isJsxExpression(hidden.initializer)&&hidden.initializer.expression);
  const expression=hidden.initializer.expression.getText(sf);
  for(const activeWindow of ['formation',null,'stats','inventory','rest','skills','territory','wanderer','rank']){
    assert.equal(vm.runInNewContext(expression,{activeWindow}),activeWindow==='formation');
  }
  const css=readFileSync(new URL('../app/guild-territory-layout.css',import.meta.url),'utf8');
  assert.match(css,/\.caravan-status \.party-context-menu\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
});

test('formation retains the real cycle action and busy restriction',()=>{
  const buttons=[];
  function find(node){if(ts.isJsxOpeningElement(node)&&node.tagName.getText(sf)==='button'&&node.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(sf)==='className'&&p.initializer?.text==='formation-slot occupied'))buttons.push(node);ts.forEachChild(node,find);}
  find(sf);
  assert.equal(buttons.length,1);
  const attr=name=>buttons[0].attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(sf)===name).initializer.expression.getText(sf);
  let called;
  vm.runInNewContext(attr('onClick'),{p:{cyclePosition:uid=>{called=uid;}},unit:{uid:'hero'}})();
  assert.equal(called,'hero');
  for(const busy of [true,false])assert.equal(vm.runInNewContext(attr('disabled'),{p:{busy}}),busy);
});
