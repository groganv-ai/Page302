// Isolated local daily review: durable receipts; no remote service or data changes.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createServer}=require('../backend/server.cjs');
const {scheduledReviewStore}=require('../backend/review-calendar.cjs');
const {sqliteBinding}=require('../backend/sqlite-binding.cjs');
const store=scheduledReviewStore(path.resolve(__dirname,'../.local/daily-review.sqlite'));
let pendingTick=Promise.resolve();
function tick(){
 pendingTick=pendingTick.catch(()=>{}).then(async()=>{
  const {runReleases}=await import('../backend/cloudflare/release-scheduler.mjs');
  return runReleases(sqliteBinding(store.db),store.now());
 });return pendingTick;
}
setInterval(()=>tick().catch(console.error),60000);
const reviewPort=Number(process.env.PORT)||8086;
const root=path.resolve(__dirname,'..');const api=createServer(store,{allowedOrigins:['http://127.0.0.1:'+reviewPort]});
http.createServer(async(req,res)=>{
 if(req.url.startsWith('/api/')){
  try{await tick();api.emit('request',req,res)}
  catch(error){console.error(error);res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Local schedule unavailable'}))}
  return;
 }
 try{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
  if(!/^(index\.html|privacy\.html|site\.webmanifest|[\w-]+\.(?:js|css)|(?:assets|data|fonts)\/[\w./-]+)$/.test(relative))throw Error();
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error();
  let body=fs.readFileSync(file);
  if(relative==='index.html')body=body.toString().replace('<script src="script.js"></script>','<script>window.PAGE302_SCORES_API=location.origin;window.PAGE302_RELEASES_ENABLED=true;</script><script src="script.js"></script>');
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(reviewPort,'127.0.0.1',()=>console.log('V4 scheduled local review: http://127.0.0.1:'+reviewPort+' · persistent local scores; pack 002 on 9 Nov, 003 on 10 Nov'));
