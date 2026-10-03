import {D1Store} from './d1-store.mjs';
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin');const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowed.includes(origin))return respond({error:'Origin not allowed'},403);
  if(origin)headers['Access-Control-Allow-Origin']=origin;
  if(request.method==='OPTIONS'){headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type';return new Response(null,{status:204,headers});}
  if(!env.DB)return respond({error:'Database not configured'},503);
  const store=new D1Store(env.DB),url=new URL(request.url);
  try{
   if(request.method==='POST'&&url.pathname==='/api/submissions'){
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return respond({error:'Use application/json'},415);
    const reader=request.body?.getReader();if(!reader)return respond({error:'Invalid JSON'},400);
    let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();return respond({error:'Request too large'},413)}chunks.push(value)}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    let input;try{input=JSON.parse(new TextDecoder().decode(bytes))}catch{return respond({error:'Invalid JSON'},400)}
    return respond(await store.submit(input));
   }
   if(request.method==='GET'&&url.pathname==='/api/results/latest')return respond(await store.latest());
   if(request.method==='GET'&&/^\/api\/results\/\d{3,}$/.test(url.pathname))return respond(await store.find(url.pathname.split('/').pop(),{initials:url.searchParams.get('initials'),reference:url.searchParams.get('reference')}));
   return respond({error:'Not found'},404);
  }catch(error){return respond({error:error.status?error.message:'Service unavailable'},error.status||503)}
 }
};
