const {test}=require('node:test'),assert=require('node:assert/strict');
const {ScoreStore}=require('../backend/store.cjs');
const {sqliteBinding}=require('../backend/sqlite-binding.cjs');
const {scheduleSQL,adminSQL,civil,dailyOpening}=require('../tools/release-scheduler.cjs');
const {generateSubmissions}=require('../backend/seed-review.cjs');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const entry=(packId,date)=>({packId,formation:'4-3-3',revision:'fixture',sha256:'fixture',payload:JSON.stringify({packNumber:packId,clubs:[]}),opensAt:`2026-10-${date}T00:00:00.000Z`,closesAt:`2026-10-${Number(date)+1}T00:00:00.000Z`});
function setup(){
 const store=new ScoreStore();
 store.db.exec(scheduleSQL([entry('004','11'),entry('005','12')]));
 store.db.exec(adminSQL('enable',[]));
 return store;
}
test('London windows handle summer, winter and the repeated autumn hour',()=>{
 assert.equal(civil('2026-10-11','01:00'),'2026-10-11T00:00:00.000Z');
 assert.equal(civil('2026-12-11','01:00'),'2026-12-11T01:00:00.000Z');
 assert.equal(civil('2026-10-25','01:00'),'2026-10-25T00:00:00.000Z');
 assert.throws(()=>civil('2027-03-28','01:00'),/Nonexistent/);
 assert.equal(dailyOpening('2026-10-11'),'2026-10-10T23:01:00.000Z');
 assert.equal(dailyOpening('2026-12-11'),'2026-12-11T00:01:00.000Z');
 assert.equal(dailyOpening('2027-03-28'),'2027-03-28T00:01:00.000Z');
 assert.equal(dailyOpening('2026-10-25'),'2026-10-24T23:01:00.000Z');
});
test('close, publish, open and retry preserve scores and one snapshot',async()=>{
 const {runReleases,releaseManifest,releasePayload}=await import('../backend/cloudflare/release-scheduler.mjs');
 const store=setup(),db=sqliteBinding(store.db);let now=new Date('2026-10-11T12:00Z');
 try{
  store.now=()=>now;
  assert.equal((await releaseManifest(db,now)).currentPack,null);
  assert.equal(await releasePayload(db,'005',now),null);
  assert.throws(()=>store.submit({...generateSubmissions()[0],packId:'004'}),/not open/);
  assert.equal((await runReleases(db,now)).currentPack,'004');
  const input={...generateSubmissions()[0],packId:'004'};
  const receipt=store.submit(input);
  now=new Date('2026-10-12T00:00Z');
  assert.throws(()=>store.submit({...input,requestId:'closed_pack_request_111'}),/not open/);
  const result=await runReleases(db,now);
  assert.equal(result.currentPack,'005');
  assert.equal(store.latest().totalSubmissions,1);
  assert.equal(store.latest().results[0].score,input.score);
  assert.deepEqual(store.submit(input),receipt);
  const snapshot=store.db.prepare('SELECT snapshot FROM publications').get().snapshot;
  await runReleases(db,now);
  assert.equal(store.db.prepare('SELECT snapshot FROM publications').get().snapshot,snapshot);
  assert.equal(store.db.prepare('SELECT count(*) n FROM publications').get().n,1);
 }finally{store.close()}
});
test('midnight gap, pause and resume, extension collisions and cancel guards',async()=>{
 const {runReleases,releaseManifest}=await import('../backend/cloudflare/release-scheduler.mjs');
 const store=setup(),db=sqliteBinding(store.db);
 try{
  store.db.prepare('UPDATE packs SET opens_at=? WHERE id=?').run('2026-10-12T01:00:00.000Z','005');
  await runReleases(db,new Date('2026-10-11T01:00Z'));
  assert.throws(()=>store.db.exec(adminSQL('extend',['004','2026-10-12T02:00Z'],'2026-10-11T12:00:00.000Z')),/malformed JSON/);
  store.db.exec(adminSQL('extend',['004','2026-10-12T00:30Z'],'2026-10-11T12:00:00.000Z'));
  assert.equal((await releaseManifest(db,new Date('2026-10-12T00:15Z'))).currentPack,'004');
  assert.equal((await runReleases(db,new Date('2026-10-12T00:30Z'))).currentPack,null);
  store.db.exec(adminSQL('pause',[]));
  assert.equal((await runReleases(db,new Date('2026-10-12T01:00Z'))).currentPack,null);
  store.db.exec(adminSQL('resume',[]));
  assert.equal((await runReleases(db,new Date('2026-10-12T01:01Z'))).currentPack,'005');
  assert.throws(()=>store.db.exec(adminSQL('cancel',['005'],'2026-10-12T02:00:00.000Z')),/malformed JSON/);
  assert.throws(()=>store.db.exec(adminSQL('extend',['004','2026-10-14T00:00Z'])),/malformed JSON/);
 }finally{store.close()}
});
test('failed publication blocks next opening; subsequent tick recovers',async()=>{
 const {runReleases}=await import('../backend/cloudflare/release-scheduler.mjs');
 const store=setup(),binding=sqliteBinding(store.db),now=new Date('2026-10-12T00:00Z');
 try{
  const broken={...binding,async batch(){throw Error('Injected write failure')}};
  const failed=await runReleases(broken,now);
  assert.equal(failed.currentPack,null);
  assert.equal(failed.actions[0].status,'failed');
  assert.equal(store.db.prepare('SELECT published_at FROM packs WHERE id=?').get('004').published_at,'FINALIZING');
  const success=await runReleases(binding,now);
  assert.equal(success.currentPack,'005');
  assert.equal(store.db.prepare("SELECT status FROM release_events WHERE action='close'").get().status,'done');
 }finally{store.close()}
});
test('missed runs catch up closed packs without opening expired packs',async()=>{
 const {runReleases}=await import('../backend/cloudflare/release-scheduler.mjs');
 const store=setup();
 try{
  const result=await runReleases(sqliteBinding(store.db),new Date('2026-10-14T12:00Z'));
  assert.equal(result.currentPack,null);
  assert.equal(store.db.prepare('SELECT count(*) n FROM publications').get().n,2);
  assert.equal(store.db.prepare("SELECT count(*) n FROM release_events WHERE action='open'").get().n,0);
 }finally{store.close()}
});
test('queued content replacement, rescheduling and cancellation are guarded',()=>{
 const store=setup(),folder=fs.mkdtempSync(path.join(os.tmpdir(),'page302-release-'));
 const file=path.join(folder,'replacement.json');
 try{
  const payload=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/vggfax003.json'),'utf8'));
  payload.packNumber='005';fs.writeFileSync(file,JSON.stringify(payload));
  const now='2026-10-10T12:00:00.000Z';
  store.db.exec(adminSQL('reschedule',['005','2026-10-13T01:00Z','2026-10-14T00:00Z'],now));
  assert.equal(store.db.prepare("SELECT opens_at FROM packs WHERE id='005'").get().opens_at,'2026-10-13T01:00:00.000Z');
  store.db.exec(adminSQL('replace',['005',file],now));
  assert.equal(store.db.prepare("SELECT formation FROM packs WHERE id='005'").get().formation,payload.formation);
  assert.equal(JSON.parse(store.db.prepare("SELECT payload FROM release_schedule WHERE pack_id='005'").get().payload).packNumber,'005');
  store.db.exec(adminSQL('cancel',['005'],now));
  assert.equal(store.db.prepare("SELECT id FROM packs WHERE id='005'").get(),undefined);
 }finally{store.close();if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(folder)}
});
test('adoption preserves existing receipts and original revision; saved content cannot be overwritten',async()=>{
 const {runReleases}=await import('../backend/cloudflare/release-scheduler.mjs');
 const store=new ScoreStore(),now=new Date('2026-10-11T12:00Z');store.now=()=>now;
 try{
  store.addPack({id:'003',formation:'5-4-1',revision:'original-live-revision',opensAt:'2026-10-01T00:00Z',closesAt:null});
  const positions=['GK',...Array(5).fill('DF'),...Array(4).fill('MD'),'AT','MAN'];
  const input={...generateSubmissions()[0],packId:'003'};
  input.answers=input.answers.map((a,i)=>({...a,position:positions[i]}));
  const receipt=store.submit(input),file=path.join(__dirname,'../data/vggfax003.json');
  store.db.exec(adminSQL('adopt',['003',file,'2026-10-12T00:00Z'],now.toISOString()));
  assert.equal(store.db.prepare("SELECT revision FROM packs WHERE id='003'").get().revision,'original-live-revision');
  assert.deepEqual(store.submit(input),receipt);
  assert.throws(()=>store.db.exec(adminSQL('replace',['003',file],now.toISOString())),/malformed JSON/);
  store.db.exec(adminSQL('enable',[]));
  store.db.exec(adminSQL('close',['003'],now.toISOString()));
  await runReleases(sqliteBinding(store.db),now);
  assert.equal(store.latest().packId,'003');assert.equal(store.latest().totalSubmissions,1);
 }finally{store.close()}
});
