const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {ScoreStore}=require('../backend/store.cjs');
const {sqliteBinding}=require('../backend/sqlite-binding.cjs');
const {calendar,scheduleSQL,adminSQL}=require('../tools/release-scheduler.cjs');

test('approved 10–14 November calendar uses updated packs and preserves each daily publication',async()=>{
 const {runReleases,releaseManifest,releasePayload}=await import('../backend/cloudflare/release-scheduler.mjs');
 const entries=calendar(path.join(__dirname,'../tools/release-calendar.2026-11-10.json'));
 assert.deepEqual(entries.map(e=>e.packId),['003','004','005','006','007']);
 assert.deepEqual(entries.map(e=>e.opensAt),Array.from({length:5},(_,i)=>`2026-11-${10+i}T00:01:00.000Z`));
 assert.deepEqual(entries.map(e=>e.closesAt),Array.from({length:5},(_,i)=>`2026-11-${11+i}T00:00:00.000Z`));
 const recreated=JSON.parse(entries[4].payload);
 assert.equal(recreated.clubs.flatMap(c=>c.squad).length,325);
 assert.ok(recreated.clubs.flatMap(c=>c.squad).every(p=>p.appearances>0));
 assert.ok(recreated.clubs.flatMap(c=>c.squad).some(p=>p.playerId));
 const kepa=JSON.parse(entries[4].payload).clubs.flatMap(c=>c.squad).find(p=>p.fullname.startsWith('Kepa'));
 assert.ok(kepa.aliases.includes('Kepa'));
 const store=new ScoreStore(),db=sqliteBinding(store.db);
 try{
  store.db.exec(scheduleSQL(entries));store.db.exec(adminSQL('enable',[]));
  for(const [i,entry] of entries.entries()){
   let now=new Date(Date.parse(entry.opensAt)-60000);store.now=()=>now;
   await runReleases(db,now);
   assert.equal((await releaseManifest(db,now)).currentPack,null);
   assert.equal(await releasePayload(db,entry.packId,now),null);
   now=new Date(entry.opensAt);await runReleases(db,now);
   assert.equal((await releaseManifest(db,now)).currentPack,entry.packId);
   assert.deepEqual(await releasePayload(db,entry.packId,now),JSON.parse(entry.payload));
   const positions=['GK',...Array(Number(entry.formation[0])).fill('DF'),...Array(Number(entry.formation[2])).fill('MD'),...Array(Number(entry.formation[4])).fill('AT'),'MAN'];
   const input={packId:entry.packId,requestId:'unified_calendar_'+entry.packId,initials:'TST',score:120+i,guesses:12,
    answers:positions.map((position,j)=>({personId:`fixture-${j}`,name:`Fixture ${j}`,position,clubs:['ARS'],contributions:[{recordId:`fixture-${j}`,points:1}]}))};
   const receipt=store.submit(input);
   now=new Date(entry.closesAt);
   assert.throws(()=>store.submit({...input,requestId:input.requestId+'_closed'}),/not open/);
   await runReleases(db,now);
   const final=store.latest();assert.equal(final.packId,entry.packId);assert.equal(final.totalSubmissions,1);
   assert.deepEqual(store.submit(input),receipt);
   await runReleases(db,now);assert.deepEqual(store.latest(),final);
   assert.equal((await releaseManifest(db,now)).currentPack,null);
  }
  assert.equal(store.db.prepare('SELECT count(*) n FROM publications').get().n,5);
 }finally{store.close()}
});
