import {D1Store} from './d1-store.mjs';

const query = (db, sql, ...args) => db.prepare(sql).bind(...args);

export async function releaseManifest(db, now = new Date()) {
 const control = await query(db,'SELECT enabled,paused FROM release_control WHERE id=1').first();
 if (!control?.enabled) return {enabled:false};
 const timestamp = now.toISOString();
 const {results:rows} = await query(db,`SELECT p.*,
  EXISTS(SELECT 1 FROM release_events e WHERE e.pack_id=p.id AND e.action='open' AND e.status='done') AS opened
  FROM packs p JOIN release_schedule s ON p.id=s.pack_id ORDER BY p.opens_at`).all();
 const current = rows.find(p=>p.opened && p.opens_at<=timestamp && timestamp<p.closes_at && !p.published_at);
 const next = rows.find(p=>p.opens_at>timestamp);
 return {enabled:true,paused:Boolean(control.paused),currentPack:current?.id||null,currentRevision:current?.revision||null,
  packs:rows.filter(p=>p.opened && p.opens_at<=timestamp).map(p=>p.id),
  nextOpensAt:next?.opens_at||null,serverTime:timestamp};
}

export async function releasePayload(db, id, now = new Date()) {
 const row = await query(db,`SELECT s.payload FROM release_schedule s JOIN packs p ON p.id=s.pack_id
  WHERE p.id=? AND p.opens_at<=? AND (EXISTS(SELECT 1 FROM release_events e WHERE e.pack_id=p.id AND e.action='open' AND e.status='done')
   OR EXISTS(SELECT 1 FROM publications x WHERE x.pack_id=p.id))`,id,now.toISOString()).first();
 return row ? JSON.parse(row.payload) : null;
}

// The same runner is used by Cron and the local administrator CLI. All actions
// are idempotent; failed close operations are retried before opening another pack.
export async function runReleases(db, now = new Date()) {
 const control = await query(db,'SELECT enabled,paused FROM release_control WHERE id=1').first();
 if (!control?.enabled) return {enabled:false,actions:[]};
 const timestamp=now.toISOString(), actions=[];
 const store = new D1Store(db,{now:()=>now});
 const {results:closed} = await query(db,`SELECT p.id FROM packs p JOIN release_schedule s ON p.id=s.pack_id
  WHERE p.closes_at<=? AND NOT EXISTS(SELECT 1 FROM publications x WHERE x.pack_id=p.id)
  ORDER BY p.closes_at LIMIT 20`,timestamp).all();
 for (const pack of closed) {
  try {
   const snapshot=await store.finalize(pack.id);
   await query(db,`INSERT INTO release_events VALUES(?,'close','done',?,?)
    ON CONFLICT(pack_id,action) DO UPDATE SET status='done',updated_at=excluded.updated_at,detail=excluded.detail`,
    pack.id,timestamp,JSON.stringify({totalSubmissions:snapshot.totalSubmissions})).run();
   actions.push({packId:pack.id,action:'close',status:'done'});
  } catch(error) {
   await query(db,`INSERT INTO release_events VALUES(?,'close','failed',?,'Publication failed; retry required')
    ON CONFLICT(pack_id,action) DO UPDATE SET status='failed',updated_at=excluded.updated_at,detail=excluded.detail`,pack.id,timestamp).run();
   actions.push({packId:pack.id,action:'close',status:'failed'});
  }
 }
 // Guard in the write itself: overlapping invocations cannot open a pack while
 // an earlier scheduled pack still lacks its immutable publication.
 const {results:due} = await query(db,`SELECT p.id FROM packs p JOIN release_schedule s ON p.id=s.pack_id
  WHERE p.opens_at<=? AND p.closes_at>? AND p.published_at IS NULL`,timestamp,timestamp).all();
 for (const pack of due) {
  if (control.paused) break;
  await query(db,`INSERT OR IGNORE INTO release_events
   SELECT p.id,'open','done',?,'Scheduled pack available' FROM packs p WHERE p.id=?
   AND NOT EXISTS(SELECT 1 FROM packs previous JOIN release_schedule s ON previous.id=s.pack_id
    WHERE previous.closes_at<=p.opens_at AND NOT EXISTS(SELECT 1 FROM publications x WHERE x.pack_id=previous.id))`,timestamp,pack.id).run();
 }
 const manifest=await releaseManifest(db,now);
 return {enabled:true,actions,...manifest};
}
