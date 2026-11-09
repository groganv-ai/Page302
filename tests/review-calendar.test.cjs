const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {scheduledReviewStore}=require('../backend/review-calendar.cjs');
const {sqliteBinding}=require('../backend/sqlite-binding.cjs');
const {generateSubmissions}=require('../backend/seed-review.cjs');

test('local daily review survives restart without replacing its calendar or saved pack-002 receipt',async()=>{
 const {runReleases,releaseManifest}=await import('../backend/cloudflare/release-scheduler.mjs');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'page302-review-calendar-'));
 const file=path.join(folder,'scores.sqlite'),now=new Date('2026-11-09T12:00Z');
 let store;
 try{
  store=scheduledReviewStore(file);store.now=()=>now;
  await runReleases(sqliteBinding(store.db),now);
  assert.equal((await releaseManifest(sqliteBinding(store.db),now)).currentPack,'002');
  const input={...generateSubmissions()[0],requestId:'persistent_review_calendar_test'};
  const receipt=store.submit(input);
  const before=store.db.prepare('SELECT * FROM release_schedule ORDER BY pack_id').all();
  store.close();store=scheduledReviewStore(file);store.now=()=>now;
  assert.deepEqual(store.db.prepare('SELECT * FROM release_schedule ORDER BY pack_id').all(),before);
  assert.deepEqual(store.submit(input),receipt);
 }finally{if(store)store.close();fs.rmSync(folder,{recursive:true,force:true})}
});
