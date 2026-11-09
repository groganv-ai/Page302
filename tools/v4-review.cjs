// Isolated local review: all submissions remain in this process's memory.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {ScoreStore}=require('../backend/store.cjs'),{createServer}=require('../backend/server.cjs');
const {seedReview}=require('../backend/seed-review.cjs');
const store=new ScoreStore();seedReview(store);
// Requested review cutoff: next midnight GMT (fixed UTC, not local DST).
const reviewDeadline=new Date();reviewDeadline.setUTCHours(24,0,0,0);
store.db.prepare('UPDATE packs SET closes_at=? WHERE id=?').run(reviewDeadline.toISOString(), '003');
const reviewPort=Number(process.env.PORT)||8086;
const root=path.resolve(__dirname,'..');const api=createServer(store,{allowedOrigins:['http://127.0.0.1:'+reviewPort]});
http.createServer((req,res)=>{
 if(req.url.startsWith('/api/')){api.emit('request',req,res);return;}
 try{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
  if(!/^(index\.html|privacy\.html|site\.webmanifest|[\w-]+\.(?:js|css)|(?:assets|data|fonts)\/[\w./-]+)$/.test(relative))throw Error();
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error();
  let body=fs.readFileSync(file);
  if(relative==='index.html')body=body.toString().replace('<script src="scores-client.js">','<script>window.PAGE302_SCORES_API=location.origin;</script><script src="scores-client.js">');
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(reviewPort,'127.0.0.1',()=>console.log('V4 isolated review: http://127.0.0.1:'+reviewPort+' · in-memory submissions only'));
