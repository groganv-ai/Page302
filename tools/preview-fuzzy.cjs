// Offline feature review: no live APIs, submissions or release schedule.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=3025;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"connect-src 'self'; object-src 'none'; base-uri 'self'");
 const send=(code,type,body)=>{res.writeHead(code,{'Content-Type':type});res.end(body);};
 let url;try{url=new URL(req.url,'http://localhost');}catch{return send(400,'text/plain','Bad request');}
 if(req.method!=='GET'||url.pathname.startsWith('/api/'))return send(403,'application/json','{"error":"Offline review"}');
 if(url.pathname==='/data/vggfax-manifest.json')return send(200,'application/json','{"packs":["002"]}');
 const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1)),file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)||!(/^[^/\\]+\.(html|js|css|webmanifest)$/.test(relative)||/^(assets|data|fonts)\//.test(relative))||relative.split(/[\\/]/).some(p=>p.startsWith('.')))return send(404,'text/plain','Not found');
 fs.readFile(file,(err,body)=>{
  if(err)return send(404,'text/plain','Not found');
  if(relative==='index.html')body=body.toString().replace('<head>','<head><script>window.PAGE302_RELEASES_ENABLED=false;window.PAGE302_SCORES_API=location.origin;window.PAGE302_FUZZY_NAMES_ENABLED='+String(url.searchParams.get('baseline')!=='1')+';</script>');
  send(200,types[path.extname(file)]||'application/octet-stream',body);
 });
}).listen(port,'127.0.0.1',()=>console.log('Fuzzy review: http://127.0.0.1:'+port+' (baseline: /?baseline=1)'));
