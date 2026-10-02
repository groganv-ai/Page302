// Local review only: valid generated squads, never production/player submissions.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {ScoreStore}=require('./store.cjs'),{seedReview}=require('./seed-review.cjs'),{createServer}=require('./server.cjs');
const root=path.resolve(__dirname,'..');const store=new ScoreStore(path.join(__dirname,'review.sqlite'));seedReview(store);
createServer(store).listen(8787,'127.0.0.1',()=>console.log('Review results service on 8787 · 10 sample entries'));
http.createServer((req,res)=>{
 try{const url=new URL(req.url,'http://localhost');const relative=decodeURIComponent(url.pathname).slice(1)||'index.html';
  if(!/^(index\.html|script\.js|style\.css|scores-client\.js|scores\.css|results-client\.js|results\.css|(?:assets|data|fonts|images)\/[A-Za-z0-9_.\/-]+)$/.test(relative))throw Error();
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error();
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));
 }catch{res.writeHead(404);res.end('Not found')}
}).listen(8080,'127.0.0.1',()=>console.log('Review website: http://127.0.0.1:8080 · Pack 003 active; Pack 002 closed'));
