export const REPORT_CATEGORIES = Object.freeze({data:'Player / Manager data issue',name:'Player name issue / Nickname required',game:'Game bug',web:'Website bug',general:'General inquiry'});
const recipient = 'vince.grogan.games@gmail.com';
function fail(message,status=400) {throw Object.assign(new Error(message),{status});}
export function validateReport(input) {
 if(!input || typeof input !== 'object' || Array.isArray(input)) fail('Invalid report');
 if(!Object.hasOwn(REPORT_CATEGORIES,input.category)) fail('Choose a report type.');
 const clean = {};
 for(const [key,max] of Object.entries({description:4000,club:100,season:30,person:150,alias:150,email:254,build:40,pack:8,website:200})) {
  if(input[key] !== undefined && typeof input[key] !== 'string') fail('Invalid '+key);
  clean[key]=(input[key]||'').trim();
  if(clean[key].length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(clean[key])) fail('Invalid '+key);
 }
 if(clean.website) fail('Report could not be accepted.');
 if(!clean.description) fail('Please describe the issue.');
 if(clean.email && !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(clean.email)) fail('Enter a valid email address.');
 if(!/^v\d+\.\d+\.\d+_\d{3,}$/.test(clean.build) || !/^\d{3,}$/.test(clean.pack)) fail('Invalid game context. Please refresh the page.');
 clean.category=input.category;
 if(!['data','name'].includes(clean.category)) clean.club=clean.season=clean.person=clean.alias='';
 if(clean.category!=='name') clean.alias='';
 return clean;
}
export async function readReport(request) {
 if(!request.headers.get('Content-Type')?.startsWith('application/json')) fail('Use application/json',415);
 const reader=request.body?.getReader(); if(!reader) fail('Invalid JSON');
 let size=0;const chunks=[];
 while(true) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>24576){await reader.cancel();fail('Request too large',413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let input;try{input=JSON.parse(new TextDecoder().decode(bytes));}catch{fail('Invalid JSON');}
 return validateReport(input);
}
export function reportConfigured(env) {return ['GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_REFRESH_TOKEN'].every(key=>Boolean(env[key]));}
export function reportMessage(report) {
 const subject='[Page302 Report] '+REPORT_CATEGORIES[report.category];
 const body=[`Category: ${REPORT_CATEGORIES[report.category]}`,`Version: ${report.build}`,`Game pack: ${report.pack}`,`Club: ${report.club || '(not supplied)'}`,`Season: ${report.season || '(not supplied)'}`,`Player / Manager: ${report.person || '(not supplied)'}`,`Suggested name / nickname: ${report.alias || '(not supplied)'}`,`Reply email: ${report.email || '(not supplied)'}`,'','Description:',report.description].join('\r\n');
 return [`To: ${recipient}`,`Subject: ${subject}`,...(report.email?[`Reply-To: ${report.email}`]:[]),'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',btoa(String.fromCharCode(...new TextEncoder().encode(body)))].join('\r\n');
}
export async function sendReport(report,env,fetcher=fetch) {
 if(!reportConfigured(env)) fail('Report sending is not configured yet. Please try later.',503);
 try {
  const tokenResponse=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:env.GMAIL_CLIENT_ID,client_secret:env.GMAIL_CLIENT_SECRET,refresh_token:env.GMAIL_REFRESH_TOKEN,grant_type:'refresh_token'}),signal:AbortSignal.timeout(10000)});
  if(!tokenResponse.ok) throw Error('token');
  const token=await tokenResponse.json();if(!token.access_token)throw Error('token');
  const raw=btoa(reportMessage(report)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const result=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify({raw}),signal:AbortSignal.timeout(10000)});
  if(!result.ok)throw Error('send');
  return {sent:true};
 } catch {fail('Report delivery could not be confirmed. Please wait before trying again.',503);}
}
export async function reserveReport(db,ip,now=Date.now()) {
 const day=Math.floor(now/86400000),hour=Math.floor(now/3600000);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(day+':'+ip));
 const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 const sql='INSERT INTO report_limits (bucket,count,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count';
 // Atomic increments across isolates; conservative counts also include failed delivery attempts.
 const results=await db.batch([db.prepare('DELETE FROM report_limits WHERE expires_at < ?').bind(now),db.prepare(sql).bind('ip:'+hour+':'+hash,now+86400000),db.prepare(sql).bind('day:'+day,now+172800000)]);
 if(results[1].results[0].count>3 || results[2].results[0].count>100) fail('Report limit reached. Please try again later.',429);
}
