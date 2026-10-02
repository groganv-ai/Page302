const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { randomInt } = require('node:crypto');
const {normalize,ServiceError}=require('./validation.cjs');

const reject = (message, status = 400) => { throw new ServiceError(status, message); };
const text = (value, max = 100) => typeof value === 'string' && value.length > 0 && value.length <= max;

class ScoreStore {
  constructor(file = ':memory:', options = {}) {
    this.db = new DatabaseSync(file);
    this.db.exec(readFileSync(join(__dirname, 'schema.sql'), 'utf8'));
    this.db.exec('PRAGMA busy_timeout=5000');
    this.now = options.now || (() => new Date());
    this.reference = options.reference || (() => String(randomInt(0, 1000000)).padStart(6, '0'));
  }
  close() { this.db.close(); }
  addPack(pack) {
    if (!/^\d{3,}$/.test(pack.id) || !['4-4-2','4-3-3','5-4-1','4-5-1'].includes(pack.formation) || !text(pack.revision)) reject('Invalid pack');
    const opens = new Date(pack.opensAt), closes = new Date(pack.closesAt);
    if (!Number.isFinite(+opens) || !Number.isFinite(+closes) || opens >= closes) reject('Invalid pack window');
    this.db.prepare('INSERT INTO packs(id,formation,opens_at,closes_at,revision) VALUES(?,?,?,?,?)').run(pack.id, pack.formation, opens.toISOString(), closes.toISOString(), pack.revision);
  }
  normalize(input) { return normalize(input); }
  receipt(row) { return {packId:row.pack_id, initials:row.initials, reference:row.reference, score:row.score, guesses:row.guesses, receivedAt:row.received_at}; }
  submit(input) {
    const data = this.normalize(input), payload = JSON.stringify(data);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db.prepare('SELECT * FROM submissions WHERE request_id=?').get(input.requestId);
      if (existing) {
        if (existing.payload !== payload) reject('Request ID already used with different content',409);
        this.db.exec('COMMIT'); return this.receipt(existing);
      }
      const pack = this.db.prepare('SELECT * FROM packs WHERE id=?').get(data.packId);
      if (!pack) reject('Unknown pack',404);
      const timestamp = this.now().toISOString();
      if (timestamp < pack.opens_at || timestamp >= pack.closes_at) reject('Pack is not open',409);
      const counts = {GK:1,DF:Number(pack.formation[0]),MD:Number(pack.formation[2]),AT:Number(pack.formation[4]),MAN:1};
      for (const [position,count] of Object.entries(counts)) if (data.answers.filter(a=>a.position===position).length !== count) reject('Squad does not match formation');
      let reference;
      for (let attempt=0; attempt<100; attempt++) {
        const candidate = this.reference();
        if (!/^\d{6}$/.test(candidate)) reject('Reference generation failed',503);
        if (!this.db.prepare('SELECT 1 FROM submissions WHERE pack_id=? AND reference=?').get(data.packId,candidate)) { reference=candidate; break; }
      }
      if (!reference) reject('Unable to allocate reference; retry later',503);
      const inserted = this.db.prepare('INSERT INTO submissions(pack_id,request_id,payload,initials,reference,score,guesses,received_at) VALUES(?,?,?,?,?,?,?,?)').run(data.packId,input.requestId,payload,data.initials,reference,data.score,data.guesses,timestamp);
      const insert = this.db.prepare('INSERT INTO answers VALUES(?,?,?,?,?,?,?)');
      data.answers.forEach((a,slot)=>insert.run(inserted.lastInsertRowid,slot,a.personId,a.name,a.position,JSON.stringify(a.clubs),JSON.stringify(a.contributions)));
      const row = this.db.prepare('SELECT * FROM submissions WHERE id=?').get(inserted.lastInsertRowid);
      this.db.exec('COMMIT'); return this.receipt(row);
    } catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }
  finalize(packId) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous=this.db.prepare('SELECT snapshot FROM publications WHERE pack_id=?').get(packId);
      if(previous) { this.db.exec('COMMIT'); return JSON.parse(previous.snapshot); }
      const pack=this.db.prepare('SELECT * FROM packs WHERE id=?').get(packId);
      if(!pack) reject('Unknown pack',404);
      if(this.now().toISOString()<pack.closes_at) reject('Pack is still open',409);
      const rows=this.db.prepare('SELECT * FROM submissions WHERE pack_id=? ORDER BY score DESC,guesses ASC,id ASC').all(packId);
      const counts=new Map();
      const squads=rows.map(row=>this.db.prepare('SELECT * FROM answers WHERE submission_id=? ORDER BY slot').all(row.id));
      squads.forEach(squad=>new Set(squad.map(a=>a.person_id)).forEach(id=>counts.set(id,(counts.get(id)||0)+1)));
      let rank=0;
      const results=rows.map((row,i)=>{
        if(!i||row.score!==rows[i-1].score||row.guesses!==rows[i-1].guesses) rank=i+1;
        const submitted=JSON.parse(row.payload).answers;
        const answers=squads[i].map((a,j)=>({personId:a.person_id,name:a.name,position:a.position,clubs:JSON.parse(a.clubs),contributions:JSON.parse(a.contributions),rarity:submitted[j].rarity||null,clubTier:submitted[j].clubTier??null,percentage:counts.get(a.person_id)/rows.length*100}));
        return {...this.receipt(row),rank,answers,rarityScore:answers.reduce((sum,a)=>sum+a.percentage,0)/12};
      });
      const publishedAt=this.now().toISOString();
      const snapshot={packId,formation:pack.formation,revision:pack.revision,publishedAt,totalSubmissions:rows.length,results};
      this.db.prepare('INSERT INTO publications VALUES(?,?)').run(packId,JSON.stringify(snapshot));
      this.db.prepare('UPDATE packs SET published_at=? WHERE id=?').run(publishedAt,packId);
      this.db.exec('COMMIT');return snapshot;
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  latest(limit = 25) {
    const row=this.db.prepare('SELECT snapshot FROM publications JOIN packs ON packs.id=publications.pack_id ORDER BY closes_at DESC LIMIT 1').get();
    if(!row)return null;
    const snapshot=JSON.parse(row.snapshot);
    return {...snapshot,results:snapshot.results.filter(r=>r.rank<=limit)};
  }
  find(packId, {initials,reference}={}) {
    const row=this.db.prepare('SELECT snapshot FROM publications WHERE pack_id=?').get(packId);
    if(!row)reject('Results not published',404);
    const snapshot=JSON.parse(row.snapshot);
    return snapshot.results.filter(r=>(!initials||r.initials===initials.toUpperCase())&&(!reference||r.reference===reference));
  }
}
module.exports={ScoreStore,ServiceError};

