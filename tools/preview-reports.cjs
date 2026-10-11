// Local review server. Uses ignored Gmail credentials; never includes them in website responses.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..');
const credentialFile=process.argv[2];
const credentials=credentialFile?JSON.parse(fs.readFileSync(credentialFile,'utf8')):{};
const env={GMAIL_CLIENT_ID:credentials.client_id,GMAIL_CLIENT_SECRET:credentials.client_secret,GMAIL_REFRESH_TOKEN:credentials.refresh_token,ALLOWED_ORIGINS:'http://127.0.0.1:8083'};
async function main(){
 const worker=(await import('../backend/cloudflare/worker.mjs')).default;
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(root,'backend/cloudflare/migrations/0002_report_limits.sql'),'utf8'));
 env.DB={prepare(sql){return{bind(...values){return{sql,values}}}},async batch(statements){db.exec('BEGIN');try{const rows=statements.map(s=>({results:db.prepare(s.sql).all(...s.values)}));db.exec('COMMIT');return rows;}catch(error){db.exec('ROLLBACK');throw error;}}};
 http.createServer(async(req,res)=>{
  try{
   const pathname=new URL(req.url,'http://127.0.0.1:8083').pathname;
   if(pathname==='/api/reports'){
    const request=new Request('http://127.0.0.1:8083/api/reports',{method:req.method,headers:{...req.headers,'CF-Connecting-IP':req.socket.remoteAddress},...(req.method==='POST'?{body:require('node:stream').Readable.toWeb(req),duplex:'half'}:{})});
    const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
   }
   const relative=decodeURIComponent(pathname).slice(1)||'index.html';
   if(!/^(index\.html|script\.js|report-client\.js|style\.css|scores-client\.js|scores\.css|results-client\.js|results\.css|(?:assets|data|fonts)\/[A-Za-z0-9_.\/-]+)$/.test(relative))throw Error();
   const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error();
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png'};
   let body=fs.readFileSync(file);if(relative==='index.html')body=body.toString().replace('<script src="report-client.js"></script>','<script>window.PAGE302_REPORTS_API=""</script><script src="report-client.js"></script>');
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
 }).listen(8083,'127.0.0.1',()=>console.log('Report review: http://127.0.0.1:8083 (real Gmail delivery '+(credentials.refresh_token?'enabled':'disabled')+')'));
}
main().catch(()=>{console.error('Preview could not start.');process.exitCode=1});
