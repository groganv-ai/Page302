// Local-only integration check against Wrangler's actual Worker and D1 runtime.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn, execFileSync} = require('node:child_process');
const {ScoreStore} = require('../store.cjs');
const {seedReview, generateSubmissions} = require('../seed-review.cjs');
const cwd = __dirname;
const cli = path.join(cwd, 'node_modules/wrangler/bin/wrangler.js');
const state = path.join(cwd, '.wrangler/runtime-check');
const run = args => execFileSync(process.execPath, [cli, ...args], {cwd, encoding:'utf8'});
const quote = value => value === null ? 'NULL' : typeof value === 'number' ? String(value) : "'" + String(value).replaceAll("'", "''") + "'";
async function main() {
  fs.mkdirSync(state, {recursive:true});
  run(['d1','migrations','apply','DB','--local','--persist-to',state]);
  const store = new ScoreStore();
  let sql = 'DELETE FROM answers; DELETE FROM submissions; DELETE FROM publications; DELETE FROM packs;\n';
  try {
    seedReview(store);
    // Use a past pack for publication and a brief open window for submission checks.
    store.db.prepare('UPDATE packs SET formation=?,opens_at=?,closes_at=? WHERE id=?').run('4-3-3', new Date(Date.now()-3600000).toISOString(), new Date(Date.now()+3600000).toISOString(), '003');
    for (const table of ['packs','submissions','answers','publications']) {
      for (const row of store.db.prepare('SELECT * FROM '+table).all()) {
        sql += 'INSERT INTO '+table+' ('+Object.keys(row).join(',')+') VALUES ('+Object.values(row).map(quote).join(',')+');\n';
      }
    }
  } finally { store.close(); }
  const fixture = path.join(state,'fixture.sql');
  fs.writeFileSync(fixture,sql);
  run(['d1','execute','DB','--local','--persist-to',state,'--file',fixture]);
  const child = spawn(process.execPath,[cli,'dev','--local','--port','8791','--persist-to',state],{cwd,stdio:['ignore','pipe','pipe']});
  let logs=''; child.stdout.on('data', b=>logs+=b); child.stderr.on('data', b=>logs+=b);
  const request = (route, options={}) => fetch('http://127.0.0.1:8791'+route, {headers:{Origin:'http://localhost:8080',...options.headers},...options});
  try {
    let ready=false;
    for(let i=0;i<100;i++) {
      try { if((await request('/api/results/latest')).ok){ready=true;break;} } catch {}
      if(child.exitCode!==null)throw Error(logs);
      await new Promise(r=>setTimeout(r,200));
    }
    assert.ok(ready,logs);
    const latestResponse=await request('/api/results/latest');
    assert.equal(latestResponse.headers.get('Access-Control-Allow-Origin'),'http://localhost:8080');
    const latest=await latestResponse.json(); assert.equal(latest.packId,'002'); assert.equal(latest.totalSubmissions,10);
    const matching=await (await request('/api/results/002?initials=VGG')).json(); assert.equal(matching.length,2);
    const detail=await (await request('/api/results/002?reference='+matching[0].reference)).json(); assert.equal(detail.length,1); assert.equal(detail[0].answers.length,12);
    const input={...generateSubmissions()[0],packId:'003',requestId:'runtime_check_submission',score:123,guesses:27};
    const post = data => request('/api/submissions',{method:'POST',headers:{Origin:'http://localhost:8080','Content-Type':'application/json'},body:JSON.stringify(data)});
    const savedResponse=await post(input); assert.equal(savedResponse.status,200); const saved=await savedResponse.json();
    assert.equal(saved.score,123); assert.equal(saved.guesses,27); assert.match(saved.reference,/^\d{6}$/);
    assert.deepEqual(await (await post(input)).json(),saved);
    assert.equal((await post({...input,score:124})).status,409);
    assert.equal((await post({...input,requestId:'runtime_check_closed',packId:'002'})).status,409);
    assert.equal((await request('/api/results/003')).status,404);
    assert.equal((await request('/api/results/latest',{headers:{Origin:'https://unapproved.example'}})).status,403);
    assert.equal((await request('/api/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
    assert.equal((await request('/api/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(32769)})).status,413);
    const rows=JSON.parse(run(['d1','execute','DB','--local','--persist-to',state,'--command',"SELECT (SELECT COUNT(*) FROM submissions WHERE pack_id='003') submissions, (SELECT COUNT(*) FROM answers JOIN submissions ON submissions.id=answers.submission_id WHERE pack_id='003') answers",'--json']));
    assert.equal(rows[0].results[0].submissions,1); assert.equal(rows[0].results[0].answers,12);
    console.log('PASS: actual Worker/D1 runtime, 10 closed results, lookup, 12 saved answers, unchanged score/guesses, retry, conflicts, closed pack, CORS and body validation.');
  } finally { child.kill(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
