import test from 'node:test';
import assert from 'node:assert/strict';
import {rarityPresentation,battleLogPresentation} from '../app/classic-presentation.ts';
test('rarity styles preserve real game labels and handle older missing values',()=>{
 assert.equal(rarityPresentation('傳說').className,'rarity-mythic');
 assert.equal(rarityPresentation('傳說').label,'紫色・傳說');
 assert.equal(rarityPresentation('稀有').className,'rarity-uncommon');
 assert.equal(rarityPresentation('稀有').label,'綠色・稀有');
 assert.equal(rarityPresentation('史詩').className,'rarity-epic');
 assert.equal(rarityPresentation('優良').className,'rarity-uncommon');
 assert.equal(rarityPresentation().className,'rarity-common');
});
test('battle log classifications do not mistake full bags for rewards',()=>{
 for(const [text,kind]of [['成功擊敗 閻王！','log-win'],['商隊不幸全滅，已被熱心商旅送回漢陽療傷...','log-lose'],['背包已滿，本次掉落無法拾取。','log-lose'],['獲得「海王戰甲」！','log-drop'],['主角施放了 [蛇龍出水]','log-skill'],['已傳送至 漢陽近郊！','log-travel'],['主角普通攻擊','log-normal']])assert.equal(battleLogPresentation(text).className,kind);
});
