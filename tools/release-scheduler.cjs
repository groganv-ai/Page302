// Offline calendar review and account-authenticated administration; no public write API.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {ScoreStore}=require('../backend/store.cjs');
const {sqliteBinding}=require('../backend/sqlite-binding.cjs');
const ROOT=path.resolve(__dirname,'..');
const migration=()=>fs.readFileSync(path.join(ROOT,'backend/cloudflare/migrations/0002_release_scheduler.sql'),'utf8');
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const writeOutput=(file,text)=>{fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(file,text)};
const guard=sql=>`SELECT CASE WHEN (${sql}) THEN 1 ELSE json('PAGE302_RELEASE_GUARD_FAILED') END;\n`;
const wrap=sql=>`-- Apply with other administrator changes idle. Guards reject stale/conflicting changes.\n${sql}`;
const london=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function civil(date,time) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw Error('Use YYYY-MM-DD and HH:MM');
 const approximate=Date.parse(date+'T'+time+':00Z'),matches=[];
 for(let offset=-120;offset<=120;offset+=30){
  const candidate=new Date(approximate+offset*60000);
  if(!Number.isFinite(+candidate))continue;
  const p=Object.fromEntries(london.formatToParts(candidate).map(p=>[p.type,p.value]));
  if(`${p.year}-${p.month}-${p.day}`===date&&`${p.hour}:${p.minute}`===time)matches.push(candidate.toISOString());
 }
 // At the autumn clock change 01:00 occurs twice. Use the first occurrence:
 // this opens at the first 01:00 London and never opens the pack twice.
 if(!matches.length)throw Error(`Nonexistent London time ${date} ${time}; supply opensAt explicitly with its UTC offset`);
 return matches.sort()[0];
}
function instant(value) {
 if(typeof value!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error('Supply an ISO instant with Z or an explicit UTC offset');
 return new Date(value).toISOString();
}
function dailyOpening(date) {
 // 00:01 exists once on every UK date, including both clock-change days.
 return civil(date,'00:01');
}
function packEntry(entry,base) {
 if(!/^\d{3,}$/.test(entry.packId))throw Error('Pack IDs must have at least three digits');
 const file=path.resolve(base,entry.file),payload=JSON.parse(fs.readFileSync(file,'utf8'));
 if(payload.packNumber!==entry.packId||!['4-4-2','4-3-3','5-4-1','4-5-1'].includes(payload.formation)||payload.clubs?.length!==11)throw Error('Invalid pack metadata: '+entry.packId);
 const codes=new Set(),ids=new Set();
 for(const club of payload.clubs){
  if(!club.clubCode||codes.has(club.clubCode)||!Array.isArray(club.squad)||!club.squad.length)throw Error('Invalid/duplicate club: '+entry.packId);
  codes.add(club.clubCode);
  for(const p of club.squad){
   if(!p.id||ids.has(p.id)||!p.fullname||!p.surname||!Number.isInteger(p.appearances)||p.appearances<0||!Array.isArray(p.positions)||!p.positions.length||p.positions.some(v=>!['GK','DF','MD','AT','MAN'].includes(v)))throw Error('Invalid/duplicate answer: '+p.id);
   ids.add(p.id);
  }
 }
 const opensAt=entry.opensAt?instant(entry.opensAt):dailyOpening(entry.date);
 const closesAt=entry.closesAt?instant(entry.closesAt):civil(new Date(Date.parse(entry.date+'T12:00:00Z')+86400000).toISOString().slice(0,10),'00:00');
 if(opensAt>=closesAt)throw Error('Invalid window');
 const json=JSON.stringify(payload),sha256=crypto.createHash('sha256').update(json).digest('hex');
 return {packId:entry.packId,formation:payload.formation,opensAt,closesAt,revision:sha256,sha256,payload:json,file};
}
function calendar(file) {
 const config=JSON.parse(fs.readFileSync(file,'utf8'));
 if(config.timeZone!=='Europe/London'||!Array.isArray(config.packs)||!config.packs.length)throw Error('Calendar needs timeZone Europe/London and a nonempty packs array');
 const entries=config.packs.map(e=>packEntry(e,path.dirname(path.resolve(file)))).sort((a,b)=>a.opensAt.localeCompare(b.opensAt));
 if(new Set(entries.map(e=>e.packId)).size!==entries.length)throw Error('Duplicate pack ID');
 for(let i=1;i<entries.length;i++)if(entries[i].opensAt<entries[i-1].closesAt)throw Error('Overlapping pack windows');
 return entries;
}
function scheduleSQL(entries, now=new Date().toISOString()) {
 let sql='';
 for(const e of entries){
  const id=quote(e.packId);
  sql+=guard(`NOT EXISTS(SELECT 1 FROM packs WHERE id=${id} OR (opens_at<${quote(e.closesAt)} AND (closes_at='' OR closes_at>${quote(e.opensAt)})))`);
  sql+=`INSERT INTO packs(id,formation,opens_at,closes_at,revision) VALUES(${[e.packId,e.formation,e.opensAt,e.closesAt,e.revision].map(quote).join(',')});\n`;
  sql+=`INSERT INTO release_schedule VALUES(${id},${quote(e.payload)},${quote(e.sha256)},${quote(now)});\n`;
 }
 return wrap(sql);
}
function adminSQL(command,values,now=new Date().toISOString()) {
 if(command==='enable')return wrap('UPDATE release_control SET enabled=1,paused=0 WHERE id=1;\n');
 if(command==='pause'||command==='resume')return wrap(`UPDATE release_control SET paused=${command==='pause'?1:0} WHERE id=1;\n`);
 const [packId,value,extra]=values;
 if(!/^\d{3,}$/.test(packId))throw Error('Supply a pack ID');
 const id=quote(packId);
 if(command==='adopt'){
  const closes=instant(extra),e=packEntry({packId,file:value,opensAt:now,closesAt:closes},process.cwd());
  let sql=guard(`EXISTS(SELECT 1 FROM packs WHERE id=${id} AND formation=${quote(e.formation)} AND opens_at<=${quote(now)} AND published_at IS NULL) AND NOT EXISTS(SELECT 1 FROM release_schedule WHERE pack_id=${id})`);
  sql+=guard(`NOT EXISTS(SELECT 1 FROM packs p, packs target WHERE target.id=${id} AND p.id<>target.id AND p.opens_at<${quote(closes)} AND (p.closes_at='' OR p.closes_at>target.opens_at))`);
  return wrap(sql+`UPDATE packs SET closes_at=${quote(closes)} WHERE id=${id};\nINSERT INTO release_schedule VALUES(${id},${quote(e.payload)},${quote(e.sha256)},${quote(now)});\nINSERT INTO release_events VALUES(${id},'open','done',${quote(now)},'Existing live pack adopted');\n`);
 }
 let sql=guard(`EXISTS(SELECT 1 FROM packs p JOIN release_schedule s ON s.pack_id=p.id WHERE p.id=${id} AND p.published_at IS NULL AND NOT EXISTS(SELECT 1 FROM publications WHERE pack_id=${id}))`);
 if(command==='extend'||command==='close'){
  const closes=command==='close'?now:instant(value);
  sql+=guard(`EXISTS(SELECT 1 FROM packs WHERE id=${id} AND opens_at<${quote(closes)} ${command==='extend'?`AND closes_at>${quote(now)} AND closes_at<${quote(closes)}`:''})`);
  sql+=guard(`NOT EXISTS(SELECT 1 FROM packs p, packs target WHERE target.id=${id} AND p.id<>target.id AND p.opens_at<${quote(closes)} AND (p.closes_at='' OR p.closes_at>target.opens_at))`);
  sql+=`UPDATE packs SET closes_at=${quote(closes)} WHERE id=${id};\n`;
 }else if(command==='reschedule'){
  const opens=instant(value),closes=instant(extra);
  if(opens<=now||opens>=closes)throw Error('Rescheduling requires a future valid window');
  sql+=guard(`NOT EXISTS(SELECT 1 FROM submissions WHERE pack_id=${id}) AND NOT EXISTS(SELECT 1 FROM release_events WHERE pack_id=${id} AND action='open')`);
  sql+=guard(`NOT EXISTS(SELECT 1 FROM packs WHERE id<>${id} AND opens_at<${quote(closes)} AND (closes_at='' OR closes_at>${quote(opens)}))`);
  sql+=`UPDATE packs SET opens_at=${quote(opens)},closes_at=${quote(closes)} WHERE id=${id};\n`;
 }else if(command==='cancel'){
  sql+=guard(`EXISTS(SELECT 1 FROM packs WHERE id=${id} AND opens_at>${quote(now)}) AND NOT EXISTS(SELECT 1 FROM submissions WHERE pack_id=${id})`);
  sql+=`DELETE FROM release_events WHERE pack_id=${id};\nDELETE FROM release_schedule WHERE pack_id=${id};\nDELETE FROM packs WHERE id=${id};\n`;
 }else if(command==='replace'){
  const e=packEntry({packId,file:value,opensAt:now,closesAt:new Date(Date.parse(now)+86400000).toISOString(),date:now.slice(0,10)},process.cwd());
  sql+=guard(`NOT EXISTS(SELECT 1 FROM submissions WHERE pack_id=${id})`);
  sql+=`UPDATE packs SET formation=${quote(e.formation)},revision=${quote(e.revision)} WHERE id=${id};\nUPDATE release_schedule SET payload=${quote(e.payload)},sha256=${quote(e.sha256)},approved_at=${quote(now)} WHERE pack_id=${id};\n`;
 }else throw Error('Unknown administration command');
 return wrap(sql);
}
async function main(argv=process.argv.slice(2)) {
 const [command,...rest]=argv;
 const option=name=>{const i=rest.indexOf(name);return i<0?null:rest[i+1]};
 const dbFile=option('--db'),out=option('--out'),apply=rest.includes('--apply');
 if(command==='plan'||command==='stage'){
  const entries=calendar(rest[0]);
  const sql=scheduleSQL(entries);
  console.log(JSON.stringify({timeZone:'Europe/London',packs:entries.map(({payload,...e})=>e)},null,2));
  if(out)writeOutput(out,sql);
  if(command==='stage'&&apply){
   if(!dbFile)throw Error('--apply requires an explicit --db (never defaults to a live database)');
   fs.mkdirSync(path.dirname(path.resolve(dbFile)),{recursive:true});
   const store=new ScoreStore(dbFile);
   try{backupStore(store);store.db.exec(migration());store.db.exec('BEGIN IMMEDIATE');try{store.db.exec(sql);store.db.exec('COMMIT')}catch(e){store.db.exec('ROLLBACK');throw e}}finally{store.close()}
  }
 }else if(command==='status'||command==='tick'){
  if(!dbFile)throw Error('Specify --db');
  if(!fs.existsSync(dbFile))throw Error('Database does not exist');
  const store=new ScoreStore(dbFile);
  try{
   store.db.exec(migration());
   const {releaseManifest,runReleases}=await import('../backend/cloudflare/release-scheduler.mjs');
   if(command==='tick'&&!apply)throw Error('tick requires --apply');
   const result=command==='tick'?await runReleases(sqliteBinding(store.db)):await releaseManifest(sqliteBinding(store.db));
   console.log(JSON.stringify({...result,calendar:store.db.prepare('SELECT p.id,p.opens_at,p.closes_at,p.published_at FROM packs p JOIN release_schedule s ON p.id=s.pack_id ORDER BY p.opens_at').all(),events:store.db.prepare('SELECT * FROM release_events ORDER BY updated_at').all()},null,2));
  }finally{store.close()}
 }else if(['enable','pause','resume','close','extend','cancel','replace','adopt','reschedule'].includes(command)){
  const sql=adminSQL(command,rest);
  if(out)writeOutput(out,sql);else console.log(sql);
  if(apply){
   if(!dbFile||!fs.existsSync(dbFile))throw Error('Specify an existing --db');
   const store=new ScoreStore(dbFile);
   try{backupStore(store);store.db.exec(migration());store.db.exec('BEGIN IMMEDIATE');try{store.db.exec(sql);store.db.exec('COMMIT')}catch(e){store.db.exec('ROLLBACK');throw e}}finally{store.close()}
  }
 }else throw Error('Usage: release-scheduler.cjs plan|stage <calendar.json> [--out plan.sql] [--db file --apply] | status|tick --db file [--apply] | enable|pause|resume|close|extend|cancel|replace|reschedule|adopt [pack] [value] [--out change.sql] [--db file --apply]');
}
function backupStore(store) {
 const folder=path.join(ROOT,'outputs/release-scheduler/backups');fs.mkdirSync(folder,{recursive:true});
 const file=path.join(folder,new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID()+'.sqlite');
 store.db.exec('VACUUM INTO '+quote(file));
 console.log('Backup: '+file);
}
module.exports={civil,dailyOpening,instant,calendar,packEntry,scheduleSQL,adminSQL,migration,main};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
