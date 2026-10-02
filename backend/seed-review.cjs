const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {ScoreStore}=require('./store.cjs');
const root=path.resolve(__dirname,'..');
const pack=JSON.parse(fs.readFileSync(path.join(root,'data/vggfax002.json'),'utf8'));
function generateSubmissions(){
 const source=fs.readFileSync(path.join(root,'script.js'),'utf8').replace(/document\s*\.getElementById\("answer"\)\s*\.addEventListener[\s\S]*$/,'');
 const context=vm.createContext({console:{log(){}},setTimeout(){},document:{getElementById(){return {value:'',focus(){},select(){}}}},testPack:pack});vm.runInContext(source,context);
 vm.runInContext('clubPool=testPack.clubs;currentVggfax="002";refreshScreen=function(){};setStatus=function(){};clearPendingAnswer=function(){};',context);
 return ['VGG','ABC','JON','SAM','VGG','LEE','KAT','MAX','BEN','ACE'].map((initials,n)=>{
  context.seed=n;
  return JSON.parse(vm.runInContext(`
   currentGame={formation:testPack.formation,score:0,totalGuesses:12+seed,gameOver:false};clubUsage={};usedPeople=new Set();squadDisplay={};buildSquad();
   squad.filter(Boolean).map(s=>s.split(' ')[0]).forEach((position,slot)=>{
    const candidates=clubPool.flatMap(club=>club.squad.filter(p=>p.positions.includes(position)&&!playerAlreadyUsed(p)).map(player=>({player,code:club.clubCode.slice(0,3)})));
    const choice=candidates[(seed*19+slot*13)%candidates.length];applyAnswer(choice.player,position,choice.code,'',choice.player.surname,true);
   });
   JSON.stringify({requestId:'pack002_review_attempt_'+seed,packId:'002',initials:${JSON.stringify(initials)},score:currentGame.score,guesses:currentGame.totalGuesses,
   answers:Object.keys(squadDisplay).sort((a,b)=>a-b).map(k=>{const a=squadDisplay[k];return {personId:a.personId,name:a.name,position:a.position,clubs:a.clubs,contributions:a.contributions,rarity:a.rarity,clubTier:a.clubTier}})})`,context));
 });
}
function seedReview(store, copies=1){
 const original=store.now;
 try{
  if(!store.db.prepare('SELECT 1 FROM packs WHERE id=?').get('002'))store.addPack({id:'002',formation:pack.formation,revision:'local-review',opensAt:'2026-09-21T01:00:00+01:00',closesAt:'2026-09-28T00:00:00+01:00'});
  store.now=()=>new Date('2026-09-27T20:00Z');
  const submissions=generateSubmissions();
  if(copies===1){
   // Remove only the twenty explicitly generated pagination-test copies.
   store.db.exec('BEGIN IMMEDIATE');let removed=0;
   try{for(const s of submissions)for(let copy=1;copy<=2;copy++){
    const requestId=s.requestId+'_copy_'+copy;
    store.db.prepare('DELETE FROM answers WHERE submission_id IN (SELECT id FROM submissions WHERE request_id=?)').run(requestId);
    removed+=Number(store.db.prepare('DELETE FROM submissions WHERE request_id=?').run(requestId).changes);
   }if(removed)store.db.prepare('DELETE FROM publications WHERE pack_id=?').run('002');store.db.exec('COMMIT');}
   catch(error){store.db.exec('ROLLBACK');throw error;}
  }
  for(let copy=0;copy<copies;copy++)submissions.forEach(s=>store.submit({...s,requestId:s.requestId+(copy?'_copy_'+copy:'')}));
  if(copies>1)store.db.prepare('DELETE FROM publications WHERE pack_id=?').run('002'); // Review fixture only; republish after adding duplicate samples.
  store.now=()=>new Date('2026-09-28T00:00Z');store.finalize('002');
  if(!store.db.prepare('SELECT 1 FROM packs WHERE id=?').get('003'))store.addPack({id:'003',formation:'5-4-1',revision:'review-only',opensAt:'2026-09-28T01:00:00+01:00',closesAt:'2099-01-01T00:00Z'});
 }finally{store.now=original}return store.latest();
}
if(require.main===module){const store=new ScoreStore(path.join(__dirname,'review.sqlite'));try{console.log('Pack 002: '+seedReview(store).totalSubmissions+' genuine test squads; Pack 003 open for review.')}finally{store.close()}}
module.exports={generateSubmissions,seedReview};

