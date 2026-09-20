import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_SCENE_HEIGHT,BATTLE_SCENE_WIDTH,calculateBattleScale} from '../app/battle-viewport.ts';

const desktopResolutions=[[1920,1080,1],[1600,900,682/700],[1440,900,682/700],[1366,768,550/700]];

test('battle scene keeps its original logical size',()=>{
  assert.equal(BATTLE_SCENE_WIDTH,900);
  assert.equal(BATTLE_SCENE_HEIGHT,700);
});

test('battle scene fits and stays centered at the requested desktop resolutions',()=>{
  for(const [screenWidth,screenHeight,expectedScale] of desktopResolutions){
    // Mirror the desktop content column and the original 700px theatre
    // inside the available fixed-HUD game area.
    const availableWidth=screenWidth-300-36-(screenWidth*0.082-6)-32-36-2;
    const availableHeight=Math.max(1,Math.min(screenHeight-216,702))-2;
    const scale=calculateBattleScale(availableWidth,availableHeight);

    assert.ok(Math.abs(scale-expectedScale)<1e-8,`${screenWidth}×${screenHeight}: expected scale ${expectedScale}, received ${scale}`);
    assert.ok(scale>0&&scale<=1,`${screenWidth}×${screenHeight}: scale must be in (0, 1]`);
    assert.ok(BATTLE_SCENE_WIDTH*scale<=availableWidth+1e-8,`${screenWidth}×${screenHeight}: no horizontal crop`);
    assert.ok(BATTLE_SCENE_HEIGHT*scale<=availableHeight+1e-8,`${screenWidth}×${screenHeight}: no vertical crop`);
  }
});

test('scale responds to a resized viewport without enlarging the scene',()=>{
  assert.ok(calculateBattleScale(640,360)<calculateBattleScale(1200,800));
  assert.equal(calculateBattleScale(1800,1200),1);
  assert.equal(calculateBattleScale(0,0),0);
});
