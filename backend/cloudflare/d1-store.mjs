import validation from '../validation.cjs';
const {normalize,ServiceError}=validation;
const fail=(status,message)=>{throw new ServiceError(status,message)};
export class D1Store {
 constructor(db,{now=()=>new Date(),reference}={}){this.db=db;this.now=now;this.reference=reference||(()=>{const limit=4294000000;let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0]}while(n>=limit);return String(n%1000000).padStart(6,'0')});}
 query(sql,...values){return this.db.prepare(sql).bind(...values)}
 receipt(r){return {packId:r.pack_id,initials:r.initials,reference:r.reference,score:r.score,guesses:r.guesses,receivedAt:r.received_at}}
 async retry(requestId,payload){const r=await this.query('SELECT * FROM submissions WHERE request_id=?',requestId).first();if(!r)return null;if(r.payload!==payload)fail(409,'Request ID already used with different content');return this.receipt(r)}
 async submit(input){
  const data=normalize(input),payload=JSON.stringify(data);const existing=await this.retry(input.requestId,payload);if(existing)return existing;
  const pack=await this.query('SELECT * FROM packs WHERE id=?',data.packId).first();if(!pack)fail(404,'Unknown pack');
  const timestamp=this.now().toISOString();if(timestamp<pack.opens_at||(pack.closes_at&&timestamp>=pack.closes_at)||pack.published_at)fail(409,'Pack is not open');
  const counts={GK:1,DF:Number(pack.formation[0]),MD:Number(pack.formation[2]),AT:Number(pack.formation[4]),MAN:1};
  for(const [position,count] of Object.entries(counts))if(data.answers.filter(a=>a.position===position).length!==count)fail(400,'Squad does not match formation');
  for(let attempt=0;attempt<100;attempt++){
   const reference=this.reference();if(!/^\d{6}$/.test(reference))fail(503,'Reference generation failed');
   const statements=[this.query('INSERT INTO submissions(pack_id,request_id,payload,initials,reference,score,guesses,received_at) SELECT ?,?,?,?,?,?,?,? FROM packs WHERE id=? AND published_at IS NULL',data.packId,input.requestId,payload,data.initials,reference,data.score,data.guesses,timestamp,data.packId)];
   data.answers.forEach((a,slot)=>statements.push(this.query('INSERT INTO answers SELECT id,?,?,?,?,?,? FROM submissions WHERE request_id=?',slot,a.personId,a.name,a.position,JSON.stringify(a.clubs),JSON.stringify(a.contributions),input.requestId)));
   try{await this.db.batch(statements);const saved=await this.retry(input.requestId,payload);if(!saved)fail(409,'Pack is not open');return saved;}
   catch(error){if(error.status)throw error;const saved=await this.retry(input.requestId,payload);if(saved)return saved;
    // Retry only confirmed reference collisions; preserve other storage failures.
    if(!await this.query('SELECT 1 FROM submissions WHERE pack_id=? AND reference=?',data.packId,reference).first())throw error;
   }
  }fail(503,'Unable to allocate reference; retry later');
 }
 async latest(){const row=await this.query('SELECT snapshot FROM publications JOIN packs ON packs.id=publications.pack_id ORDER BY closes_at DESC LIMIT 1').first();if(!row)return null;const pack=JSON.parse(row.snapshot);return {...pack,results:pack.results.filter(r=>r.rank<=25)}}
 async find(packId,{initials,reference}={}){const row=await this.query('SELECT snapshot FROM publications WHERE pack_id=?',packId).first();if(!row)fail(404,'Results not published');return JSON.parse(row.snapshot).results.filter(r=>(!initials||r.initials===initials.toUpperCase())&&(!reference||r.reference===reference))}
 async finalize(packId){
  const existing=await this.query('SELECT snapshot FROM publications WHERE pack_id=?',packId).first();if(existing)return JSON.parse(existing.snapshot);
  const pack=await this.query('SELECT * FROM packs WHERE id=?',packId).first();if(!pack)fail(404,'Unknown pack');if(!pack.closes_at||this.now().toISOString()<pack.closes_at)fail(409,'Pack is still open');
  // Freeze writes before reading the final rows. Failed publication can be retried;
  // public retrieval still requires the completed publications record.
  await this.query("UPDATE packs SET published_at='FINALIZING' WHERE id=? AND published_at IS NULL",packId).run();
  const {results:rows}=await this.query('SELECT * FROM submissions WHERE pack_id=? ORDER BY score DESC,guesses ASC,id ASC',packId).all();
  const counts=new Map(),squads=rows.map(r=>JSON.parse(r.payload).answers);
  squads.forEach(s=>new Set(s.map(a=>a.personId)).forEach(id=>counts.set(id,(counts.get(id)||0)+1)));
  let rank=0;const results=rows.map((r,i)=>{if(!i||r.score!==rows[i-1].score||r.guesses!==rows[i-1].guesses)rank=i+1;
   const answers=squads[i].map(a=>({...a,rarity:a.rarity||null,clubTier:a.clubTier??null,percentage:counts.get(a.personId)/rows.length*100}));return {...this.receipt(r),rank,answers,rarityScore:answers.reduce((sum,a)=>sum+a.percentage,0)/12};});
  const publishedAt=this.now().toISOString();const snapshot={packId,formation:pack.formation,revision:pack.revision,publishedAt,totalSubmissions:rows.length,results};
  await this.db.batch([this.query('INSERT OR IGNORE INTO publications VALUES(?,?)',packId,JSON.stringify(snapshot)),this.query('UPDATE packs SET published_at=(SELECT json_extract(snapshot,\'$.publishedAt\') FROM publications WHERE pack_id=?) WHERE id=?',packId,packId)]);
  return JSON.parse((await this.query('SELECT snapshot FROM publications WHERE pack_id=?',packId).first()).snapshot);
 }
}
