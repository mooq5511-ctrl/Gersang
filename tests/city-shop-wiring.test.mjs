import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../app/game-city-page.tsx',import.meta.url),'utf8');
// Inert UI/data doubles isolate the real page's quote/action wiring. Actual
// inventory mutations and quality generation are tested by batch-purchase.
function harness(pageSource=source) {
  const Button=()=>{},EquipmentPurchaseControl=()=>{},MercenaryRecruitment=()=>{},GeneralRecruitment=()=>{},GemWorkshop=()=>{};
  const calls=[];
  const official={id:'official',name:'official',kind:'weapon',price:101,level:1,atk:4};
  const wearable={id:'wearable',name:'wearable',slot:'weapon',price:203};
  const tier={id:'tier',name:'tier',part:'weapon',requiredLevel:20};
  const modules={
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    '@/components/ui/button':{Button},'@/components/ui/progress':{Progress:()=>{}},
    '@/components/ui/tabs':{TabsContent:()=>{}},
    'lucide-react':Object.fromEntries(['BedDouble','Map','PackageOpen','Pill','Shield','ShoppingBag','Swords','Users','Warehouse'].map(name=>[name,()=>{}])),
    './gem-workshop':{GemWorkshop},'./game-config':{medicineCatalog:[]},
    './game-data':{formations:[{id:'line',name:'line',detail:'front'},{id:'bow',name:'bow',detail:'rear'}],mercenaries:[{id:'local-general',grade:'general',city:'city'},{id:'foreign-general',grade:'general',city:'other'}]},'./game-display':{formatGameNumber:String},
    './game-ui-config':{slotLabels:{}},'./general-recruitment':{GeneralRecruitment},
    './gersang-visuals':{cuteEquipmentArt:()=>'',gersangBuildingArt:()=>'',gersangItemArt:()=>''},
    './guild-territory':{warehouseLimit:()=>10},
    './hanyang-prologue':{hanyangRecruitmentCost:(game,cost)=>{calls.push(['recruit-quote',game,cost]);return 6000;},recommendedMercenaryIds:()=>['starter-spear']},
    './mercenary-recruitment':{MercenaryRecruitment},
    './equipment-purchase-control':{EquipmentPurchaseControl},
    './tier-equipment':{tierEquipmentPrice:()=>307,tierEquipmentShopCatalog:[tier],TIER_EQUIPMENT_SHOP_LEVELS:[20]},
    './v15-data':{nations:[],worldCities:[]},
    './village-exchange':{MATERIAL_BUY_PRICES:{},VILLAGE_WEAPONS:[],exchangeAttackBonus:()=>0,weaponCost:()=>0},
    './wearable-catalog':{wearableCatalog:[wearable]},
    './equipment-v1-policy':{v1MagicEquipmentPrice:level=>level*100,v1RandomEquipmentTier:level=>level>=20?20:1},
  };
  const code=ts.transpileModule(pageSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:99,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const context=vm.createContext({exports:{},require:id=>{assert.ok(id in modules,id);return modules[id];}});
  vm.runInContext(code,context);
  const render=(level=19,gold=1899,service='weapon',overrides={})=>context.exports.GameCityPage({
    cityService:service,currentCity:{name:'city',priceFactor:1.2},currentNation:{id:'nation'},
    game:{gold,hero:{level},mercs:[],medicines:{},exchangePurchases:{},materials:{}},
    cityWeapons:[official],cityArmors:[],medicineAmounts:{},currentWorldZone:{dropTable:[]},
    buyOfficialItem:(...args)=>calls.push(['official',...args]),
    buyWearable:(...args)=>calls.push(['wearable',...args]),
    buyTierEquipment:(...args)=>calls.push(['tier',...args]),
    buyMagicEquipment:()=>calls.push(['magic']),...overrides,
  });
  return {render,calls,Button,EquipmentPurchaseControl,MercenaryRecruitment,GeneralRecruitment,GemWorkshop,official,wearable,tier};
}
function nodes(tree,predicate) {
  const found=[];
  function visit(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(visit);return;}
    if(predicate(node))found.push(node);visit(node.props?.children);}
  visit(tree);return found;
}
function checkPurchaseWiring(h) {
  const controls=nodes(h.render(),node=>node.type===h.EquipmentPurchaseControl);
  assert.equal(controls.length,3);
  assert.deepEqual(controls.map(node=>node.props.unitPrice),[121,243,368]);
  assert.ok(controls.every(node=>node.props.gold===1899));
  assert.equal(controls[2].props.lockedLabel,'Lv.20 開放');
  controls.forEach(node=>node.props.onPurchase(3));
  assert.deepEqual(h.calls,[['official',h.official,121,3],['wearable',h.wearable,3],['tier',h.tier,3]]);
  assert.equal(nodes(h.render(20),node=>node.type===h.EquipmentPurchaseControl)[2].props.lockedLabel,undefined);
}
test('actual city page forwards displayed regional prices, quantities and tier level locks',()=>checkPurchaseWiring(harness()));
test('shop wiring assertions detect a broken quote rather than blessing current markup',()=>{
  const broken=source.replace('record.price * currentCity.priceFactor','record.price');
  assert.notEqual(broken,source);
  assert.throws(()=>checkPurchaseWiring(harness(broken)),assert.AssertionError);
});
test('actual magic counter quotes hero level, locks insufficient funds and disappears in armor shop',()=>{
  const h=harness();
  const counter=tree=>nodes(tree,node=>node.props?.className?.startsWith('enchant-counter'))[0];
  const button=tree=>nodes(counter(tree),node=>node.type===h.Button)[0];
  assert.equal(button(h.render()).props.disabled,true);
  const enabled=button(h.render(20,2000));assert.equal(enabled.props.disabled,false);
  assert.ok(enabled.props.children.includes('2,000'));
  enabled.props.onClick();assert.deepEqual(h.calls,[['magic']]);
  assert.equal(counter(h.render(20,2000,'armor')),undefined);
});

function checkRecruitmentWiring(h) {
  const mercs=[{uid:'owned-merc'}],game={gold:7200,creditLevel:8,hero:{level:12},mercs,hanyangPrologueStep:'guild'};
  const recruit=()=>{},recruitGeneral=()=>{};
  const tree=h.render(12,7200,'mercenary',{game,recruitMerchant:recruit,recruitGeneral});
  const panel=nodes(tree,node=>node.type===h.MercenaryRecruitment)[0];
  assert.equal(panel.props.mercs,mercs);assert.equal(panel.props.creditLevel,8);
  assert.equal(panel.props.gold,7200);assert.equal(panel.props.cost,6000);assert.equal(panel.props.recruit,recruit);
  assert.deepEqual(Array.from(panel.props.recommendedIds),['starter-spear']);
  const quote=h.calls.find(call=>call[0]==='recruit-quote');
  assert.equal(quote[1],game);assert.equal(quote[2],7200);
  const generals=nodes(tree,node=>node.type===h.GeneralRecruitment)[0];
  assert.deepEqual(Array.from(generals.props.generals,item=>item.id),['local-general']);
  assert.equal(generals.props.recruit,recruitGeneral);
  const outside=h.render(12,7200,'mercenary',{game:{...game,hanyangPrologueStep:'done'}});
  assert.equal(nodes(outside,node=>node.type===h.MercenaryRecruitment)[0].props.recommendedIds.length,0);
  assert.equal(nodes(h.render(),node=>node.type===h.MercenaryRecruitment).length,0);
}
test('recruitment forwards owned roster, credit and current regional quote without selecting a branch',()=>checkRecruitmentWiring(harness()));
test('recruitment contract detects silently lost credit or roster after extraction',()=>{
  for(const field of ['creditLevel={game.creditLevel}','mercs={game.mercs}']) {
    const broken=source.replace(field,'');assert.notEqual(broken,source);
    assert.throws(()=>checkRecruitmentWiring(harness(broken)),assert.AssertionError);
  }
});
test('gem workshop forwards live selections and formation changes retain latest unrelated state',()=>{
  const h=harness(),selected={uid:'owned'},game={gold:9000,hero:{level:12},mercs:[],formation:'line'};
  const setGemSlot=()=>{},setGemAmount=()=>{},socketGem=()=>{};
  let updater;
  const tree=h.render(12,9000,'mercenary',{game,selected,gemSlot:'weapon',gemAmount:3,setGemSlot,setGemAmount,socketGem,setGame:fn=>{updater=fn;}});
  const workshop=nodes(tree,node=>node.type===h.GemWorkshop)[0];
  for(const [key,value] of Object.entries({game,selected,gemSlot:'weapon',gemAmount:3,setGemSlot,setGemAmount,socketGem}))assert.equal(workshop.props[key],value,key);
  const rows=nodes(tree,node=>node.props?.className?.startsWith('formation-row'));
  assert.equal(rows.length,2);assert.equal(rows[0].props.className,'formation-row active');
  rows[1].props.onClick();assert.equal(typeof updater,'function');
  const latest={...game,gold:8111,materials:{seal:2}},next=updater(latest);
  assert.equal(next.formation,'bow');assert.equal(next.gold,8111);assert.equal(next.materials,latest.materials);
});
