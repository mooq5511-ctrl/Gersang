// Deterministic format conversion only: original artwork, dimensions and alpha stay intact.
import {readFile,writeFile,stat} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const WORLD_ENTRY_ASSETS=['sprites/newbie-raccoon-v1','monsters/bandit-chief-normal','world-map/world-map-voyage'];

/** Invisible RGB under alpha=0 has no rendered effect; all other channels must match exactly. */
export function visibleRgbaEqual(left,right){
  if(left.length!==right.length||left.length%4)return false;
  for(let index=0;index<left.length;index+=4){
    if(left[index+3]!==right[index+3])return false;
    if(left[index+3]&&[0,1,2].some(channel=>left[index+channel]!==right[index+channel]))return false;
  }
  return true;
}

export async function encodeWorldEntryAssets({write=false}={}){
  const sharp=require(process.env.GERSANG_SHARP_MODULE_PATH||'sharp');
  const reports=[];
  for(const name of WORLD_ENTRY_ASSETS){
    const source=path.join(root,'public/assets',`${name}.png`),target=path.join(root,'public/assets',`${name}.webp`);
    const original=await readFile(source);
    const candidate=await sharp(original).webp({lossless:true,effort:6}).toBuffer();
    const before=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const after=await sharp(candidate).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    if(before.info.width!==after.info.width||before.info.height!==after.info.height||!visibleRgbaEqual(before.data,after.data))throw new Error(`Visible pixel mismatch: ${name}`);
    if(candidate.length>=original.length)throw new Error(`No byte reduction: ${name}`);
    let created=false;
    if(write){
      try{await stat(target);if(!(await readFile(target)).equals(candidate))throw new Error(`Refusing to overwrite existing asset: ${target}`);}
      catch(error){if(error.code!=='ENOENT')throw error;await writeFile(target,candidate,{flag:'wx'});created=true;}
    }
    reports.push({name,width:before.info.width,height:before.info.height,originalBytes:original.length,optimizedBytes:candidate.length,
      savedPercent:Number(((1-candidate.length/original.length)*100).toFixed(2)),visiblePixelsEqual:true,alphaEqual:true,created});
  }
  return reports;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await encodeWorldEntryAssets({write:process.argv.includes('--write')}),null,2));
