import type {HanyangPrologueStep} from './hanyang-prologue';
import type {NpcId} from './npc-dialogue';
/** The locked town must retain the NPC named by the current story objective. */
export function hanyangTutorialNpcIds(step:HanyangPrologueStep):NpcId[]{
  return step==='journey-fund'||step==='caravan-crisis'||step==='caravan-delivery'
    ? ['wang-deokchang'] : ['kim-seongho'];
}
