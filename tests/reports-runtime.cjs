// Run against the installed Wrangler/Workers runtime without sending mail or touching remote data.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {spawn,execFileSync}=require('node:child_process');
async function main(){
 const root=path.resolve(__dirname,'..'),cli=path.resolve(process.argv[2]);
 const config=path.join(root,'backend/cloudflare/wrangler.jsonc');
 const state=path.join(root,'.local/report-runtime');fs.mkdirSync(state,{recursive:true});
 const args=['--config',config];
 execFileSync(process.execPath,[cli,'d1','migrations','apply','DB','--local','--persist-to',state,...args],{cwd:root,stdio:'pipe'});
 const child=spawn(process.execPath,[cli,'dev','--local','--port','8793','--persist-to',state,...args],{cwd:root,stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
 const request=(body,origin='http://localhost:8080')=>fetch('http://127.0.0.1:8793/api/reports',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body});
 try{
  let ready=false;
  for(let i=0;i<100;i++){try{if((await request('{}')).status===400){ready=true;break}}catch{}if(child.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,200));}
  assert.ok(ready,logs);
  assert.equal((await request('{')).status,400);assert.equal((await request('x'.repeat(24577))).status,413);
  assert.equal((await request('{}','https://evil.test')).status,403);
  const report={category:'data',description:'Runtime test',build:'v3.7.11_003',pack:'003'};
  const response=await request(JSON.stringify(report));assert.equal(response.status,503);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'http://localhost:8080');
  assert.match((await response.json()).error,/not configured/);
  console.log('PASS: actual Worker runtime and local D1 migration, validation, payload limit, CORS and missing-secret handling. No mail sent.');
 }finally{child.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1});
