const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const mime={'.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf'};
const embed=file=>'data:'+mime[path.extname(file)]+';base64,'+fs.readFileSync(path.join(root,file)).toString('base64');
const inlineAssets=text=>text.replace(/(?:assets|fonts)\/[A-Za-z0-9_.\/-]+\.(?:svg|png|ttf)/g,file=>embed(file));
const html=read('index.html');
let body=html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
body=body.replace(/<div class="aboutPortrait">[\s\S]*?<\/div>/,'');
body=inlineAssets(body);
const css=['style.css','scores.css','results.css','v4.css','team-input.css','club-sorting.css'].map(read).join('\n');
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
let js=scripts.map(read).join('\n');
js=inlineAssets(js).replace(/\bfetch\s*\(/g,'readEmbeddedResource(');
const pack=JSON.stringify(JSON.parse(read('data/vggfax003.json'))).replace(/</g,'\\u003c');
const setup=`window.PAGE302_RELEASES_ENABLED=false;window.PAGE302_SCORES_API='https://offline.invalid';
const artifactRoot=document.getElementById('page302-keyboard-review');
document.getElementById('scoreSubmissionForm').addEventListener('submit',event=>{
 event.preventDefault();event.stopImmediatePropagation();
 document.getElementById('scoreSubmissionStatus').textContent='TEST PREVIEW · LIVE SCORE SUBMISSION DISABLED';
},true);
const embeddedPack=${pack};
async function readEmbeddedResource(url){
 const name=String(url);
 if(name==='data/vggfax-manifest.json')return {ok:true,json:async()=>({packs:['003']})};
 if(name==='data/vggfax003.json')return {ok:true,json:async()=>structuredClone(embeddedPack)};
 return {ok:false,status:503,json:async()=>({error:'Unavailable in keyboard preview'})};
}
`;
const fragment='<div id="page302-keyboard-review">\n<style>\n'+inlineAssets(css).replace(/\bbody\b/g,'#page302-keyboard-review')+'\n</style>\n'+body+'\n</div>\n<script>\n'+setup+js.replace(/<\/script/gi,'<\\/script')+'\n</script>\n';
if(Buffer.byteLength(fragment)>1024*1024)throw Error('Preview exceeds size limit');
fs.mkdirSync(path.join(root,'outputs','keyboard-review'),{recursive:true});
fs.writeFileSync(path.join(root,'outputs','keyboard-review','page302-keyboard-review.html'),fragment);
console.log('Created self-contained preview:',Buffer.byteLength(fragment),'bytes');
