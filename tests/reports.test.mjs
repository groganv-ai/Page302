import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {validateReport,readReport,reportMessage,sendReport,reserveReport} from '../backend/report-mail.mjs';
import worker from '../backend/cloudflare/worker.mjs';
const input={category:'data',description:'A manager is missing — José Example',build:'v3.7.11_003',pack:'003'};
const env={GMAIL_CLIENT_ID:'test',GMAIL_CLIENT_SECRET:'test',GMAIL_REFRESH_TOKEN:'test'};
test('optional fields, categories, malformed input, header injection and UTF-8 mail',async()=>{
 const report=validateReport(input);assert.equal(report.person,'');
 for(const category of ['data','name','game','web','general'])assert.equal(validateReport({...input,category}).category,category);
 for(const bad of [{category:'bad'},{description:' '},{email:'a@example.com\r\nBcc:evil@example.com'},{website:'spam'},{description:'x'.repeat(4001)},{pack:'x'},{club:123}])assert.throws(()=>validateReport({...input,...bad}));
 const message=reportMessage(report);assert.match(message,/To: vince.grogan.games@gmail.com/);assert.match(message,/Subject: \[Page302 Report\]/);
 assert.match(Buffer.from(message.split('\r\n\r\n')[1],'base64').toString('utf8'),/José Example/);
 assert.equal(validateReport({...input,category:'web',club:'hidden',alias:'hidden'}).club,'');
 assert.equal(validateReport({...input,category:'data',alias:'hidden'}).alias,'');
 await assert.rejects(readReport(new Request('https://test',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(24577)})),{status:413});
});
test('mail reports success only after Gmail accepts and hides upstream errors',async()=>{
 let calls=0;
 const fetcher=async(url,options)=>{calls++;if(calls===1){assert.equal(new URLSearchParams(options.body).get('grant_type'),'refresh_token');return Response.json({access_token:'access'});}assert.equal(options.headers.Authorization,'Bearer access');assert.match(Buffer.from(JSON.parse(options.body).raw,'base64url').toString(),/Subject: \[Page302 Report\]/);return Response.json({id:'sent'});};
 assert.deepEqual(await sendReport(validateReport(input),env,fetcher),{sent:true});assert.equal(calls,2);
 await assert.rejects(sendReport(validateReport(input),env,async()=>new Response('secret upstream details',{status:401})),error=>error.status===503&&!error.message.includes('secret'));
 await assert.rejects(sendReport(validateReport(input),{}),{status:503});
});
test('atomic SQLite counters enforce visitor and global caps and expire',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(new URL('../backend/cloudflare/migrations/0002_report_limits.sql',import.meta.url),'utf8'));
 const binding={prepare(sql){return{bind(...values){return{sql,values}}}},async batch(statements){db.exec('BEGIN');try{const result=statements.map(s=>({results:db.prepare(s.sql).all(...s.values)}));db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}};
 try{
 const now=1800000000000;
 for(let i=0;i<3;i++)await reserveReport(binding,'127.0.0.1',now);
 await assert.rejects(reserveReport(binding,'127.0.0.1',now),{status:429});
 assert.ok(!JSON.stringify(db.prepare('SELECT * FROM report_limits').all()).includes('127.0.0.1'));
 for(let i=0;i<96;i++)await reserveReport(binding,'other-'+i,now);
 await assert.rejects(reserveReport(binding,'over-global',now),{status:429});
 await reserveReport(binding,'127.0.0.1',now+3*86400000);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM report_limits').get().n,2);
 }finally{db.close();}
});
test('Worker checks origin, request validation and configuration before sending',async()=>{
 const env={ALLOWED_ORIGINS:'https://page302.test',DB:{}};
 const post=(body=input,origin='https://page302.test')=>worker.fetch(new Request('https://api.test/api/reports',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(body)}),env);
 assert.equal((await post(input,'https://evil.test')).status,403);
 assert.equal((await post(input,'')).status,403);
 assert.equal((await post({...input,description:''})).status,400);
 const response=await post();assert.equal(response.status,503);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://page302.test');
});
