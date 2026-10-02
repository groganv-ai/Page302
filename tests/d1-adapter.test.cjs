const {test}=require('node:test'),assert=require('node:assert/strict');
const {ScoreStore}=require('../backend/store.cjs');
const {generateSubmissions}=require('../backend/seed-review.cjs');
function binding(sqlite){
 return {prepare(sql){return {bind(...values){return {sql,values,async first(){return sqlite.prepare(sql).get(...values)||null},async all(){return {results:sqlite.prepare(sql).all(...values)}},async run(){return sqlite.prepare(sql).run(...values)}}}}},async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>sqlite.prepare(s.sql).run(...s.values));sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
}
test('D1 adapter matches local receipts, rankings and rarity; retries and reference collisions',async()=>{
 const {D1Store}=await import('../backend/cloudflare/d1-store.mjs');const local=new ScoreStore(),shadow=new ScoreStore();let now=new Date('2026-09-27T20:00Z'),ref=0;
 const db=binding(shadow.db),remote=new D1Store(db,{now:()=>now,reference:()=>String(++ref).padStart(6,'0')});
 const pack={id:'002',formation:'4-3-3',revision:'test',opensAt:'2026-09-01T00:00Z',closesAt:'2026-09-28T00:00Z'};
 local.addPack(pack);shadow.addPack(pack);local.now=()=>now;let localRef=0;local.reference=()=>String(++localRef).padStart(6,'0');
 try{const entries=generateSubmissions();for(const input of entries){assert.deepEqual(await remote.submit(input),local.submit(input))}
  assert.deepEqual(await remote.submit(entries[0]),local.submit(entries[0]));
  await assert.rejects(remote.submit({...entries[0],score:1}),/different content/);
  await assert.rejects(remote.find('002'),/not published/);assert.equal(await remote.latest(),null);
  now=new Date('2026-09-28T00:00Z');assert.deepEqual(await remote.finalize('002'),local.finalize('002'));
  assert.deepEqual(await remote.latest(),local.latest());assert.deepEqual(await remote.find('002',{initials:'VGG'}),local.find('002',{initials:'VGG'}));
  assert.deepEqual(await remote.submit(entries[0]),local.submit(entries[0]));await assert.rejects(remote.submit({...entries[0],requestId:'new_request_after_close'}),/not open/);
  const pack3={...pack,id:'003',opensAt:'2026-09-28T00:00Z',closesAt:'2026-10-05T00:00Z'};shadow.addPack(pack3);
  remote.reference=()=> '000001';await remote.submit({...entries[0],packId:'003',requestId:'new_collision_test_1'});
  let collision=0;remote.reference=()=>collision++?'000002':'000001';await remote.submit({...entries[1],packId:'003',requestId:'new_collision_test_2'});
  assert.equal(shadow.db.prepare('SELECT count(*) n FROM answers').get().n,144);
 }finally{local.close();shadow.close()}
});
test('Worker rejects unknown origins, malformed JSON and oversized bodies',async()=>{
 const {default:worker}=await import('../backend/cloudflare/worker.mjs');const store=new ScoreStore();const env={DB:binding(store.db),ALLOWED_ORIGINS:'http://localhost:8080'};
 try{const request=(body,origin='http://localhost:8080')=>new Request('https://preview.test/api/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body});
 assert.equal((await worker.fetch(request('{}','https://other.test'),env)).status,403);
 assert.equal((await worker.fetch(request('{'),env)).status,400);
 assert.equal((await worker.fetch(request('x'.repeat(32769)),env)).status,413);
 const response=await worker.fetch(new Request('https://preview.test/api/results/latest',{headers:{Origin:'http://localhost:8080'}}),env);assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'http://localhost:8080');assert.equal(await response.json(),null);
 }finally{store.close()}
});
