// Local website preview connected to the remote test service; no local score database.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const api='https://page302-scores-preview.vince-grogan-games.workers.dev';
http.createServer((req,res)=>{
 try {
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
  if(!/^(index\.html|script\.js|style\.css|scores-client\.js|scores\.css|results-client\.js|results\.css|(?:assets|data|fonts|images)\/[A-Za-z0-9_.\/-]+)$/.test(relative))throw Error();
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error();
  let body=fs.readFileSync(file);
  if(relative==='index.html')body=body.toString().replace('<script src="scores-client.js"></script>','<script>window.PAGE302_SCORES_API='+JSON.stringify(api)+'</script>\n<script src="scores-client.js"></script>');
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(8082,'127.0.0.1',()=>console.log('Cloudflare-connected website preview: http://127.0.0.1:8082'));
