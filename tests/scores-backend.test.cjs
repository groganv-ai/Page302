const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ScoreStore}=require('../backend/store.cjs');
const {createServer}=require('../backend/server.cjs');
const positions=['GK','DF','DF','DF','DF','MD','MD','MD','MD','AT','AT','MAN'];
function submission(n=0, overrides={}) {
  return {requestId:'request_for_test_'+n,packId:'003',initials:'vgg',score:2450,guesses:12,answers:positions.map((position,i)=>({personId:'person-'+i,name:'Player '+i,position,clubs:['ARS'],contributions:[{recordId:'record-'+i,points:1}]})),...overrides};
}
function setup(options={}) {
  let now=new Date('2026-10-05T00:00:00Z'), ref=0;
  const store=new ScoreStore(':memory:',{now:()=>now,reference:()=>String(++ref).padStart(6,'0'),...options});
  store.addPack({id:'003',formation:'4-4-2',revision:'test-1',opensAt:'2026-10-05T01:00:00+01:00',closesAt:'2026-10-12T00:00:00+01:00'});
  return {store,time:value=>now=new Date(value)};
}
test('save supplied score unchanged, distinct replay, stable retry after closing',()=>{
  const {store,time}=setup();try{
    const a=store.submit(submission());assert.equal(a.score,2450);assert.equal(a.initials,'VGG');
    assert.deepEqual(store.submit(submission()),a);
    const b=store.submit(submission(1));assert.notEqual(a.reference,b.reference);
    assert.throws(()=>store.submit(submission(0,{score:99})),/different content/);
    time('2026-10-12T00:00:00Z');assert.deepEqual(store.submit(submission()),a);
    assert.throws(()=>store.submit(submission(2)),/not open/);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM answers').get().n,24);
  }finally{store.close()}
});
test('opening inclusive, closing exclusive and UK DST windows',()=>{
  const {store,time}=setup();try{
    time('2026-10-04T23:59:59Z');assert.throws(()=>store.submit(submission()),/not open/);
    time('2026-10-05T00:00:00Z');store.submit(submission());
    time('2026-10-11T22:59:59.999Z');store.submit(submission(1));
    time('2026-10-11T23:00:00Z');assert.throws(()=>store.submit(submission(2)),/not open/);
    store.addPack({id:'004',formation:'4-4-2',revision:'winter',opensAt:'2026-10-26T01:00:00+00:00',closesAt:'2026-11-02T00:00:00+00:00'});
    time('2026-10-26T00:59:59Z');assert.throws(()=>store.submit(submission(3,{packId:'004'})),/not open/);
    time('2026-10-26T01:00:00Z');store.submit(submission(3,{packId:'004'}));
  }finally{store.close()}
});
test('invalid squads rejected and no partial save on reference exhaustion',()=>{
  const {store}=setup({reference:()=> '111111'});try{
    assert.throws(()=>store.submit(submission(0,{initials:'<x>'})),/initials/);
    assert.throws(()=>store.submit(submission(0,{guesses:11})),/guess/);
    assert.throws(()=>store.submit(submission(0,{score:Infinity})),/score/);
    const input=submission();input.answers[1].personId=input.answers[0].personId;assert.throws(()=>store.submit(input),/Duplicate/);
    const wrong=submission();wrong.answers[0].position='DF';assert.throws(()=>store.submit(wrong),/formation/);
    store.submit(submission());assert.throws(()=>store.submit(submission(1)),/allocate reference/);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM submissions').get().n,1);
  }finally{store.close()}
});
test('publication hides active answers, ranks by points then guesses, freezes rarity',()=>{
  const {store,time}=setup();try{
    store.submit(submission(0,{guesses:15}));
    store.submit(submission(1,{guesses:12}));
    const third=submission(2,{guesses:12});third.answers[0].personId='rare-person';store.submit(third);
    assert.equal(store.latest(),null);assert.throws(()=>store.find('003'),/not published/);
    assert.throws(()=>store.finalize('003'),/still open/);
    time('2026-10-12T00:00:00Z');const published=store.finalize('003');
    assert.deepEqual(published.results.map(r=>r.rank),[1,1,3]);
    const rare=published.results.find(r=>r.answers[0].personId==='rare-person');
    assert.ok(Math.abs(rare.answers[0].percentage-100/3)<1e-9);assert.equal(rare.answers[1].percentage,100);
    assert.ok(Math.abs(rare.rarityScore-(1100+100/3)/12)<1e-9);
    assert.equal(store.find('003',{initials:'vgg'}).length,3);
    assert.equal(store.find('003',{reference:rare.reference}).length,1);
    assert.deepEqual(store.finalize('003'),published);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM publications').get().n,1);
  }finally{store.close()}
});
test('top 25 includes cutoff ties and empty packs publish safely',()=>{
  const {store,time}=setup();try{
    for(let i=0;i<27;i++) store.submit(submission(i,{score:i<24?3000-i:2000}));
    time('2026-10-12T00:00:00Z');store.finalize('003');assert.equal(store.latest().results.length,27);
    store.addPack({id:'004',formation:'4-4-2',revision:'empty',opensAt:'2026-10-05T00:00Z',closesAt:'2026-10-06T00:00Z'});
    assert.equal(store.finalize('004').results.length,0);
    assert.equal(store.latest().packId,'003');
  }finally{store.close()}
});
test('HTTP concurrent retries create one receipt; malformed JSON and unpublished lookup fail',async()=>{
  const {store}=setup();const server=createServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    const responses=await Promise.all(Array.from({length:8},()=>fetch(base+'/api/submissions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(submission())})));
    const receipts=await Promise.all(responses.map(r=>{assert.equal(r.status,200);return r.json()}));
    assert.equal(new Set(receipts.map(r=>r.reference)).size,1);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM submissions').get().n,1);
    const bad=await fetch(base+'/api/submissions',{method:'POST',headers:{'content-type':'application/json'},body:'{'});assert.equal(bad.status,400);
    assert.equal((await fetch(base+'/api/results/003')).status,404);
    assert.equal((await fetch(base+'/api/finalize',{method:'POST'})).status,404);
  }finally{await new Promise(resolve=>server.close(resolve));store.close()}
});
