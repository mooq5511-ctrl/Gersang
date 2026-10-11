import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
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
function findDescendant(root,sf,predicate){
  let found;
  function visit(node){if(found)return;if(predicate(node,sf)){found=node;return;}ts.forEachChild(node,visit);}
  ts.forEachChild(root,visit);
  return found;
}
function reviewed(node,sf,value){
  if(value==='city'){
    if(className(node)==='merchant-advanced-features'){
      const auxiliary=findDescendant(node,sf,(child,sourceFile)=>className(child)==='city-auxiliary');
      assert.ok(auxiliary,'advanced disclosure must retain the reviewed city auxiliary subtree');
      return {name:'city-auxiliary-disclosure',node:auxiliary};
    }
    if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(sf)==='GemWorkshop'||className(node)==='panel gem-workshop')return 'gem-workshop';
    if(ts.isJsxExpression(node)&&node.expression&&ts.isBinaryExpression(node.expression)){
      const left=node.expression.left.getText(sf).replace(/[\s"']/g,'');
      if(left==='cityService===mercenary')return 'recruitment';
      if(left==='(cityService===weapon||cityService===armor)')return 'equipment-shops';
    }
  }
  if(value==='trade'&&ts.isJsxAttribute(node)&&node.name.getText(sf)==='onPrepareEscorts')return 'escort-preparation-navigation';
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
    if(boundary){
      const name=typeof boundary==='string'?boundary:boundary.name;
      seen[name]=(seen[name]||0)+1;
      if(typeof boundary==='object')return canonical(boundary.node);
      return ['added-tutorial-action','escort-preparation-navigation'].includes(boundary)?null:['reviewed-feature',boundary];
    }
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
  const {['added-tutorial-action']:added,['city-auxiliary-disclosure']:disclosure,...actualBoundaries}=actual.seen;
  assert.deepEqual(actualBoundaries,expected.seen);
  assert.equal(added,value==='battle'?1:undefined);
  assert.equal(disclosure,value==='city'?1:undefined);
  assert.deepEqual(expected.seen,value==='city'?{'recruitment':1,'equipment-shops':1,'gem-workshop':1}:
    {'map-navigation':1,'map-description':2,'tutorial-guide':1,'monster-cards':1});
});
test('trade page differs only at the reviewed escort-preparation navigation boundary',()=>{
  const current=readFileSync(new URL('../app/game-trade-page.tsx',import.meta.url),'utf8');
  const actual=normalized(current,'trade'),expected=normalized(previous,'trade');
  assert.deepEqual(actual.tree,expected.tree);
  assert.deepEqual(expected.seen,{});
  assert.deepEqual(actual.seen,{'escort-preparation-navigation':1});
  const unrelated=current.replace('onUpgrade={upgradeCaravan}','onUpgrade={()=>{}}');
  assert.notEqual(unrelated,current);
  assert.notDeepEqual(normalized(unrelated,'trade').tree,expected.tree);
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

function loadFunction(source,name,dependencies={}){
  const sf=ts.createSourceFile(`${name}.tsx`,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration=sf.statements.find(statement=>ts.isFunctionDeclaration(statement)&&statement.name?.text===name);
  assert.ok(declaration,`missing component ${name}`);
  const code=ts.transpileModule(declaration.getText(sf).replace(/^export\s+/,''),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None,jsx:ts.JsxEmit.React},
  }).outputText;
  const React={createElement(type,props,...children){const next={...(props||{})};if(children.length===1)next.children=children[0];else if(children.length>1)next.children=children;return {type,props:next};}};
  const context=vm.createContext({...dependencies,React});
  vm.runInContext(`${code}\nglobalThis.component=${name};`,context);
  return context.component;
}
function findElements(root,predicate){
  const found=[];
  function visit(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(visit);return;}if(predicate(node))found.push(node);visit(node.props?.children);}
  visit(root);return found;
}
test('city disclosure retains and operates gem and formation features through every prologue state',()=>{
  const button=()=>{},select=()=>{},noOp=()=>{};
  const quote={ok:true,item:{name:'鐵劍',socketGem:{count:1}},amount:1,cost:100,value:2};
  const preview={unchanged:false,delta:{attack:2,defense:0,maxHp:0,maxMp:0}};
  const GemWorkshop=loadFunction(readFileSync(new URL('../app/gem-workshop.tsx',import.meta.url),'utf8'),'GemWorkshop',{
    Button:button,Select:select,SelectContent:'SelectContent',SelectItem:'SelectItem',SelectTrigger:'SelectTrigger',SelectValue:'SelectValue',
    Gem:'Gem',formatGameNumber:String,format:String,slotLabels:{weapon:'武器'},slots:['weapon'],officialGems:[{id:'ruby',name:'紅寶石',label:'攻擊',values:[2]}],
    GEM_SOCKET_LIMIT:100,gemSocketResult:()=>quote,gemInvestmentPreview:()=>preview,
    confirmGemInvestment:(_preview,_quote,_name,confirm)=>confirm('確認鑲嵌？'),window:{confirm:()=>true},
  });
  const city=loadFunction(readFileSync(new URL('../app/game-city-page.tsx',import.meta.url),'utf8'),'GameCityPage',{
    TabsContent:'TabsContent',BedDouble:'BedDouble',Map:'Map',PackageOpen:'PackageOpen',Pill:'Pill',Shield:'Shield',ShoppingBag:'ShoppingBag',Swords:'Swords',Users:'Users',Warehouse:'Warehouse',
    GemWorkshop,medicineCatalog:[],formations:[{id:'line',name:'陣列'},{id:'bow',name:'雁形'}],mercenaries:[],
    formatGameNumber:String,slotLabels:{},GeneralRecruitment:'GeneralRecruitment',cuteEquipmentArt:noOp,gersangBuildingArt:noOp,gersangItemArt:noOp,
    warehouseLimit:()=>10,hanyangRecruitmentCost:()=>6000,recommendedMercenaryIds:()=>[],MercenaryRecruitment:'MercenaryRecruitment',
    EquipmentPurchaseControl:'EquipmentPurchaseControl',tierEquipmentPrice:()=>100,tierEquipmentShopCatalog:[],TIER_EQUIPMENT_SHOP_LEVELS:[],
    nations:[{id:'nation',name:'朝鮮',color:'#fff',description:''}],worldCities:[{id:'city',name:'漢陽',nation:'nation',travelFee:0}],
    MATERIAL_BUY_PRICES:{},VILLAGE_WEAPONS:[],exchangeAttackBonus:()=>0,weaponCost:()=>0,wearableCatalog:[],
    v1MagicEquipmentPrice:()=>100,v1RandomEquipmentTier:()=>1,
  });
  for(const step of [undefined,'medicine','guild','completed']){
    let game={city:'city',gold:5000,hero:{level:1,status:''},hanyangPrologueStep:step,formation:'line',materials:{seal:2}};
    const selected={name:'護衛',equip:{weapon:{name:'鐵劍'}}};
    const sockets=[];
    const tree=city({
      currentCity:{name:'漢陽',nation:'nation',specialty:'人參',priceFactor:1},currentNation:{id:'nation',name:'朝鮮',color:'#fff'},
      cityService:'other',game,selected,gemSlot:'weapon',gemAmount:1,setGemSlot:noOp,setGemAmount:noOp,
      socketGem:(...args)=>sockets.push(args),setGame:update=>{game=typeof update==='function'?update(game):update;},
      nations:undefined,worldCities:undefined,cityWeapons:[],cityArmors:[],medicineAmounts:{},sharedWarehouse:[],currentWorldZone:{name:'',dropTable:[]},
      buyExchangeUpgrade:noOp,buyLootMaterial:noOp,buyMagicEquipment:noOp,buyMedicine:noOp,buyOfficialItem:noOp,buyTierEquipment:noOp,buyWearable:noOp,
      consumeMedicine:noOp,craftRelicEquipment:noOp,depositToWarehouse:noOp,quickHealCost:0,recruitGeneral:noOp,recruitMerchant:noOp,
      restAtInn:noOp,shopPurchaseFeedback:'',setCityService:noOp,setMedicineAmounts:noOp,travelToCity:noOp,withdrawFromWarehouse:noOp,
    });
    const disclosure=findElements(tree,node=>node.type==='details'&&node.props.className==='merchant-advanced-features')[0];
    assert.ok(disclosure,`disclosure missing at prologue step ${step}`);
    assert.equal(disclosure.props.open,step==='completed'||!step,`initial open state at ${step}`);
    const summary=findElements(disclosure,node=>node.type==='summary')[0];
    assert.ok(summary,'native summary control must remain available');
    const workshop=findElements(disclosure,node=>node.type===GemWorkshop)[0];
    assert.ok(workshop,'gem workshop remains mounted inside collapsed and expanded states');
    const renderedWorkshop=GemWorkshop(workshop.props);
    const gemButton=findElements(renderedWorkshop,node=>node.type===button)[0];
    assert.ok(gemButton&&!gemButton.props.disabled,`gem action unavailable at ${step}`);
    gemButton.props.onClick();
    assert.deepEqual(sockets,[['ruby',0,1]],`gem transaction at ${step}`);
    const formation=findElements(disclosure,node=>node.type==='button'&&node.props.className?.startsWith('formation-row'))[1];
    assert.ok(formation,`formation choice unavailable at ${step}`);
    formation.props.onClick();
    assert.equal(game.formation,'bow',`formation selection at ${step}`);
    assert.equal(game.materials.seal,2,'formation change must preserve unrelated game state');
  }
});
test('trade escort preparation navigates to squad and the live navigation returns to trade',()=>{
  const noOp=()=>{};
  const tradeRoute={id:'hanji',from:'漢陽',to:'台北',good:'人參',nation:'朝鮮→台灣',seconds:18,cost:100,sale:150,reputation:0,stage:1,color:'#fff'};
  const trade={reputation:0,cargoLevel:1,totalProfit:0,trips:0,selectedRouteId:'hanji',auto:false,caravan:null,selectedCargoId:'standard',insurance:false,market:{hanji:1},portLevels:{}};
  const TradePanel=loadFunction(readFileSync(new URL('../app/trade-panel.tsx',import.meta.url),'utf8'),'TradePanel',{
    useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useEffect:noOp,fmt:String,
    Button:'Button',Progress:'Progress',CollapseButton:()=>null,DispatchPreparationGuide:'DispatchPreparationGuide',
    Anchor:'Anchor',ArrowRight:'ArrowRight',ChevronDown:'ChevronDown',Coins:'Coins',Compass:'Compass',LockKeyhole:'LockKeyhole',
    Package:'Package',Pause:'Pause',Play:'Play',Ship:'Ship',Shield:'Shield',TrendingUp:'TrendingUp',Warehouse:'Warehouse',
    cargoCapacity:()=>10,marketMultiplier:()=>1,MAX_CARGO_LEVEL:20,portInvestmentBonus:()=>1,portInvestmentCost:()=>100,
    portInvestmentLevel:()=>0,TRADE_CARGOES:[{id:'standard',name:'地方特產',description:'',saleMultiplier:1,color:'#fff'}],
    TRADE_ROUTES:[tradeRoute],upgradeCost:()=>100,voyageQuote:()=>({routeId:'hanji',startedAt:0,duration:18000,cost:100,revenue:150,reputation:1,xp:1,cargo:10,cargoName:'人參',marketMultiplier:1}),
  });
  const tradePage=loadFunction(readFileSync(new URL('../app/game-trade-page.tsx',import.meta.url),'utf8'),'GameTradePage',{TabsContent:'TabsContent',TradePanel});
  let activeTab='trade';
  const tradeTree=tradePage({
    availableRestingMercs:[],displayedPower:()=>0,game:{trade,gold:5000,stage:1,hero:{level:1},logs:[],lastEncounter:'尚未遭遇敵人'},
    sendCaravan:noOp,setActiveTab:tab=>{activeTab=tab;},setGame:noOp,upgradeCaravan:noOp,upgradeTradePort:noOp,
  });
  const tradePanel=findElements(tradeTree,node=>node.type===TradePanel)[0];
  assert.ok(tradePanel,'trade page must render the live trade panel');
  const renderedTrade=TradePanel(tradePanel.props);
  const Guide=loadFunction(readFileSync(new URL('../app/dispatch-preparation-guide.tsx',import.meta.url),'utf8'),'DispatchPreparationGuide');
  const guideProps=findElements(renderedTrade,node=>node.type==='DispatchPreparationGuide')[0]?.props;
  assert.ok(guideProps,'empty-escort guidance must be rendered while docked');
  const guide=Guide(guideProps);
  const prepare=findElements(guide,node=>node.type==='button')[0];
  assert.ok(prepare,'escort preparation action must be available');
  prepare.props.onClick();
  assert.equal(activeTab,'squad','preparation must open the mercenary roster');
  const navigation=loadFunction(readFileSync(new URL('../app/game-navigation.tsx',import.meta.url),'utf8'),'GameNavigation',{
    Building2:'Building2',Castle:'Castle',ChevronLeft:'ChevronLeft',ChevronRight:'ChevronRight',Crown:'Crown',Gem:'Gem',Map:'Map',
    ScrollText:'ScrollText',Settings:'Settings',Shield:'Shield',Ship:'Ship',ShoppingBag:'ShoppingBag',Users:'Users',
  });
  const navProps={activeTab,progressiveUnlocks:{trade:true,relic:false,collection:false,contracts:false,hall:false,raid:false},quickDialog:null,
    quickNavExpanded:true,setActiveTab:tab=>{activeTab=tab;},setCityService:noOp,setQuickDialog:noOp,setQuickNavExpanded:noOp};
  let navTree=navigation(navProps);
  const returnToTrade=findElements(navTree,node=>node.type==='button'&&node.props['data-nav-key']==='trade')[0];
  assert.ok(returnToTrade,'trade navigation must remain available from squad');
  returnToTrade.props.onClick();
  assert.equal(activeTab,'trade');
  navTree=navigation({...navProps,activeTab});
  assert.equal(findElements(navTree,node=>node.type==='button'&&node.props['data-nav-key']==='trade')[0].props['aria-current'],'page');
});
