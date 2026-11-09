const {test}=require('node:test'),assert=require('node:assert/strict');
const {ScoreStore}=require('../backend/store.cjs');
const {generateSubmissions}=require('../backend/seed-review.cjs');
const {standing}=require('../backend/challenge-status.cjs');
function binding(sqlite){return {prepare(sql){return {bind(...v){return {async first(){return sqlite.prepare(sql).get(...v)||null}}}}}};}
test('standing bands, shared ties, repeat attempts and immutable final aggregate agree across adapters',async()=>{
 const {D1Store}=await import('../backend/cloudflare/d1-store.mjs');
 const store=new ScoreStore(),remote=new D1Store(binding(store.db));let now=new Date('2026-10-24T10:00:00Z');
 store.now=()=>now;remote.now=()=>now;
 store.addPack({id:'002',formation:'4-3-3',revision:'v4-test',opensAt:'2026-10-01T00:00Z',closesAt:'2026-10-25T01:00:00Z'});
 try{
  const fixtures=generateSubmissions();let receipts=[];
  for(let i=0;i<20;i++)receipts.push(store.submit({...fixtures[i%fixtures.length],requestId:'standing-test-'+String(i).padStart(4,'0'),score:i<2?1000:1000-i*10,guesses:12}));
  for(let i=0;i<receipts.length;i++){
   const actual=store.standing('002',receipts[i].reference);
   assert.deepEqual(await remote.standing('002',receipts[i].reference),actual);
   assert.deepEqual(actual,standing(i<2?1:i+1,20,false));
   assert.deepEqual(Object.keys(actual).sort(),['final','outsideTop90','topPercent']);
  }
  assert.equal(store.standing('002',receipts[0].reference).topPercent,10);
  assert.equal(store.standing('002',receipts[4].reference).topPercent,25);
  assert.equal(store.standing('002',receipts[19].reference).outsideTop90,true);
  assert.equal(standing(1,1,false).topPercent,10);
  assert.throws(()=>store.standing('002','999999'),/not found/);
  assert.deepEqual(await remote.challenge('002'),store.challenge('002'));
  assert.equal(store.challenge('002').status,'open');
  assert.equal(store.challenge('002').closesAt,'2026-10-25T01:00:00.000Z');
  now=new Date('2026-10-25T01:00:00Z');assert.equal(store.challenge('002').status,'closed');
  store.finalize('002');assert.equal(store.standing('002',receipts[0].reference).final,true);
  assert.deepEqual(await remote.standing('002',receipts[0].reference),store.standing('002',receipts[0].reference));
 }finally{store.close();}
});
test('unknown and open-ended challenge windows never invent a midnight deadline',()=>{
 const store=new ScoreStore();try{
  store.addPack({id:'003',formation:'4-4-2',revision:'open',opensAt:'2020-01-01',closesAt:null});
  assert.equal(store.challenge('003').closesAt,null);assert.equal(store.challenge('003').status,'open');
  assert.throws(()=>store.challenge('004'),/Unknown pack/);
 }finally{store.close();}
});
