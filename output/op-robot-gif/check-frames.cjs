const sharp=require('C:/Users/l9933/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path=require('path');
async function main(){const dir=process.argv[2],inputs=[];for(let i=1;i<=56;i++){
 const input=await sharp(path.join(dir,`frame-${String(i).padStart(2,'0')}.png`)).resize(128,128).toBuffer();inputs.push({input,left:(i-1)%8*128,top:Math.floor((i-1)/8)*128});
}await sharp({create:{width:1024,height:896,channels:3,background:'#000'}}).composite(inputs).png().toFile(path.join(dir,'contact-sheet.png'));}
main();
