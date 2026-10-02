const http=require('node:http');
const {ScoreStore}=require('./store.cjs');

function createServer(store, options = {}) {
  const allowedOrigins = options.allowedOrigins || ['http://127.0.0.1:8080','http://localhost:8080'];
  return http.createServer(async(req,res)=>{
    const origin=req.headers.origin;
    if(origin && !allowedOrigins.includes(origin)){res.writeHead(403);res.end();return;}
    if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.writeHead(204);res.end();return;}
    res.setHeader('Content-Type','application/json');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    try {
      const url=new URL(req.url,'http://localhost');
      let result;
      if(req.method==='POST'&&url.pathname==='/api/submissions') {
        if(!req.headers['content-type']?.startsWith('application/json')) {res.writeHead(415);res.end(JSON.stringify({error:'Use application/json'}));return;}
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>32768){res.writeHead(413);res.end(JSON.stringify({error:'Request too large'}));return;}chunks.push(chunk);}
        let input;try{input=JSON.parse(Buffer.concat(chunks).toString())}catch{res.writeHead(400);res.end(JSON.stringify({error:'Invalid JSON'}));return;}
        result=store.submit(input);
      } else if(req.method==='GET'&&url.pathname==='/api/results/latest') result=store.latest(options.reviewLimit || 25);
      else if(req.method==='GET'&&/^\/api\/results\/\d{3,}$/.test(url.pathname)) result=store.find(url.pathname.split('/').pop(),{initials:url.searchParams.get('initials'),reference:url.searchParams.get('reference')});
      else {res.writeHead(404);res.end(JSON.stringify({error:'Not found'}));return;}
      res.end(JSON.stringify(result));
    }catch(error){res.writeHead(error.status||500);res.end(JSON.stringify({error:error.status?error.message:'Service unavailable'}));}
  });
}
if(require.main===module){
  const store=new ScoreStore(process.env.PAGE302_DB||'backend/local.sqlite');
  createServer(store).listen(8787,'127.0.0.1',()=>console.log('Local scores service: http://127.0.0.1:8787'));
}
module.exports={createServer};
