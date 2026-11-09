// Local review only. Persist review receipts and never overwrite an existing calendar.
const fs=require('node:fs'),path=require('node:path');
const {ScoreStore}=require('./store.cjs');
const {calendar,scheduleSQL,adminSQL}=require('../tools/release-scheduler.cjs');
function scheduledReviewStore(file){
 if(file!==':memory:')fs.mkdirSync(path.dirname(file),{recursive:true});
 const store=new ScoreStore(file);
 if(!store.db.prepare('SELECT 1 FROM release_schedule LIMIT 1').get()){
  if(store.db.prepare('SELECT 1 FROM packs LIMIT 1').get())throw Error('Review database already has packs; review its calendar before staging.');
  const entries=calendar(path.join(__dirname,'../tools/release-calendar.2026-11-10.json'));
  store.db.exec('BEGIN IMMEDIATE');
  try{store.db.exec(scheduleSQL(entries));store.db.exec(adminSQL('enable',[]));store.db.exec('COMMIT')}
  catch(error){store.db.exec('ROLLBACK');store.close();throw error}
 }
 return store;
}
module.exports={scheduledReviewStore};
