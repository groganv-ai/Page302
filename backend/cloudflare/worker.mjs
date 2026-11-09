import {D1Store} from './d1-store.mjs';
import {readReport,reportConfigured,reserveReport,sendReport} from '../report-mail.mjs';
import {releaseManifest,releasePayload,runReleases} from './release-scheduler.mjs';
export default {
 async scheduled(controller,env){
  try {
   const result=await runReleases(env.DB,new Date());
   if(result.enabled)console.log(JSON.stringify({event:'release_scheduler',...result}));
   if(result.actions.some(a=>a.status==='failed'))throw Error('Pack publication failed');
  }catch(error){console.error(JSON.stringify({event:'release_scheduler_failed',message:error.message}));throw error}
 },
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
   if(request.method==='POST'&&url.pathname==='/api/reports'){
    if(!origin)return respond({error:'Origin required'},403);
    const report=await readReport(request);
    if(!reportConfigured(env))return respond({error:'Report sending is not configured yet. Please try later.'},503);
    await reserveReport(env.DB,request.headers.get('CF-Connecting-IP')||'unknown');
    return respond(await sendReport(report,env));
   }
   if(request.method==='GET'&&url.pathname==='/api/releases')return respond(await releaseManifest(env.DB));
   if(request.method==='GET'&&/^\/api\/packs\/\d{3,}$/.test(url.pathname)){
    const payload=await releasePayload(env.DB,url.pathname.split('/').pop());
    return payload?respond(payload):respond({error:'Pack unavailable'},404);
   }
   if(request.method==='POST'&&url.pathname==='/api/submissions'){
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return respond({error:'Use application/json'},415);
    const reader=request.body?.getReader();if(!reader)return respond({error:'Invalid JSON'},400);
    let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();return respond({error:'Request too large'},413)}chunks.push(value)}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    let input;try{input=JSON.parse(new TextDecoder().decode(bytes))}catch{return respond({error:'Invalid JSON'},400)}
    return respond(await store.submit(input));
   }
   if(request.method==='GET'&&/^\/api\/challenges\/\d{3,}$/.test(url.pathname))return respond(await store.challenge(url.pathname.split('/').pop()));
   if(request.method==='GET'&&/^\/api\/standing\/\d{3,}\/\d{6}$/.test(url.pathname)){const parts=url.pathname.split('/');return respond(await store.standing(parts[3],parts[4]));}
   if(request.method==='GET'&&url.pathname==='/api/results/latest')return respond(await store.latest());
   if(request.method==='GET'&&/^\/api\/results\/\d{3,}$/.test(url.pathname))return respond(await store.find(url.pathname.split('/').pop(),{initials:url.searchParams.get('initials'),reference:url.searchParams.get('reference')}));
   return respond({error:'Not found'},404);
  }catch(error){return respond({error:error.status?error.message:'Service unavailable'},error.status||503)}
 }
};
