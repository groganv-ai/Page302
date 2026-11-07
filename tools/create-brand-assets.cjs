const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const dir=path.join(__dirname,'../assets');
const inner=name=>fs.readFileSync(path.join(dir,name),'utf8').replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
const ball=inner('ball.svg');
const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" shape-rendering="crispEdges"><rect width="100" height="100" fill="#000000"/><path fill="#00ff00" d="M16 12h68v5H16zM16 83h68v5H16z"/><svg x="25" y="25" width="50" height="50" viewBox="0 0 20 20">${ball}</svg></svg>`;
// Compact letterforms reuse the exact approved PAGE/302 artwork.
const compact=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100" shape-rendering="crispEdges"><rect width="300" height="100" fill="#000000"/><svg x="10" y="20" width="60" height="60" viewBox="0 0 20 20">${ball}</svg><rect x="85" y="15" width="200" height="70" fill="#0000ff"/><rect x="85" y="15" width="45" height="70" fill="#ffffff"/><svg x="94" y="30" width="28" height="42" viewBox="0 0 6 9">${inner('word-page.svg')}</svg><svg x="134" y="30" width="140" height="42" viewBox="0 0 23 9">${inner('word-302.svg')}</svg></svg>`;
const page=fs.readFileSync(path.join(dir,'word-page.svg'),'utf8');
const numbers=fs.readFileSync(path.join(dir,'word-302.svg'),'utf8');
const nest=(svg,x,y,w,h)=>svg.replace('<svg ',`<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
const card=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" shape-rendering="crispEdges"><rect width="1200" height="630" fill="#000000"/><path fill="#00ff00" d="M60 90h1080v6H60zM60 530h1080v6H60z"/><svg x="100" y="220" width="140" height="140" viewBox="0 0 20 20">${ball}</svg><rect x="280" y="200" width="460" height="180" fill="#ffffff"/><rect x="750" y="200" width="350" height="180" fill="#0000ff"/>${nest(page,300,230,420,120)}${nest(numbers,775,230,300,120)}${inner('social-subtitle.svg')}</svg>`;
async function main(){
 for(const [name,color] of [['red','#FF0000'],['yellow','#FFFF00']])fs.writeFileSync(path.join(dir,'ball-'+name+'.svg'),fs.readFileSync(path.join(dir,'ball.svg'),'utf8').replace('fill="white"','fill="'+color+'"'));
 fs.writeFileSync(path.join(dir,'app-icon.svg'),icon);
 fs.writeFileSync(path.join(dir,'compact-logo.svg'),compact);
 for(const [file,size] of [['favicon-32.png',32],['apple-touch-icon.png',180],['app-icon-192.png',192],['app-icon-512.png',512]])await sharp(Buffer.from(icon)).resize(size,size,{kernel:'nearest'}).png().toFile(path.join(dir,file));
 await sharp(Buffer.from(card)).png().toFile(path.join(dir,'social-card.png'));
}
main().catch(e=>{console.error(e);process.exitCode=1});
