const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {ScoreStore}=require('../backend/store.cjs');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'script.js'),'utf8').replace(/document\s*\.getElementById\("answer"\)\s*\.addEventListener[\s\S]*$/,'');
const pack003=JSON.parse(fs.readFileSync(path.join(root,'data/vggfax003.json')));
const pack007=require('./fixtures/pack007-sidwell.json');
function engine(pack=pack003){
 const storage=new Map();
 const context=vm.createContext({testPack:pack,console:{log(){}},setTimeout(){},window:{addEventListener(){}},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  document:{getElementById(){return {value:'',focus(){},select(){}}}}});
 vm.runInContext(source,context);
 vm.runInContext(`clubPool=testPack.clubs;packData=testPack;currentVggfax=testPack.packNumber||'003';currentGame={formation:testPack.formation,score:0,totalGuesses:0,gameOver:false};buildSquad();refreshScreen=function(){};drawGuesses=function(){};setStatus=function(text){testStatus=text;};selectedAnswerRequest=function(){return testRequest;};`,context);
 const run=code=>vm.runInContext(code,context);
 const stats=()=>JSON.parse(run('JSON.stringify({score:currentGame.score,guesses:currentGame.totalGuesses,answers:squadDisplay,usage:clubUsage,squad,used:[...usedPeople]})'));
 const submit=(surname,position,clubCode)=>{
  context.testRequest={surname,position,clubCode,playerAnswer:surname,slot:run(`squad.findIndex(line=>line===${JSON.stringify(position+'  --------')})`)};
  run('submitAnswer()');return stats();
 };
 return {context,run,stats,submit,storage};
}
test('pack 003 Hein is retained in data but rejected by lookup, hints and direct replay; one guess, no rewards',()=>{
 const e=engine(),hein=pack003.clubs.find(c=>c.clubCode==='ARS2324').squad.find(p=>p.surname==='Hein');
 assert.equal(hein.appearances,0);
 assert.equal(e.context.findPlayers('HEIN','GK','ARS').length,0);
 assert.equal(e.context.playerExistsAtClub('HEIN','ARS'),false);
 const state=e.submit('HEIN','GK','ARS');
 assert.equal(state.guesses,1);assert.equal(state.score,0);assert.deepEqual(state.answers,{});assert.deepEqual(state.usage,{});assert.deepEqual(state.used,[]);
 assert.equal(e.context.testStatus,'HEIN - NOT FOUND');assert.equal(state.squad[0],'GK  --------');
 e.context.raw=hein;e.run("applyAnswer(raw,'GK','ARS','HEIN','HEIN')");
 assert.deepEqual(e.stats(),state);
 assert.throws(()=>e.context.getRarity(hein),/Ineligible/);
 assert.equal(pack003.clubs.find(c=>c.clubCode==='ARS2324').squad.includes(hein),true);
});
test('pack 007 Sidwell qualifies only at Fulham/Reading; Brighton never adds a club, multiplier or contribution',()=>{
 const before=JSON.stringify(pack007),e=engine(pack007);
 assert.equal(pack007.clubs.find(c=>c.clubCode==='BRI1718').squad[0].appearances,0);
 assert.equal(e.context.findPlayers('SIDWELL','MD','BRI').length,0);
 assert.equal(e.context.findPlayers('SIDWEL','MD','BRI').length,0);
 assert.equal(e.context.findPlayers('SIDWEL','MD','FUL').length,1);
 assert.deepEqual(Array.from(e.context.findLinkedRecords('Steve Sidwell',false),r=>r.clubCode),['FUL','REA']);
 const rejected=e.submit('SIDWELL','MD','BRI');assert.equal(rejected.guesses,1);assert.equal(rejected.score,0);assert.deepEqual(rejected.usage,{});
 const accepted=e.submit('SIDWELL','MD','FUL');assert.equal(accepted.guesses,2);assert.equal(accepted.score,520);assert.deepEqual(accepted.usage,{FUL:1});
 const answer=Object.values(accepted.answers)[0];assert.deepEqual(answer.clubs,['FUL','REA']);assert.equal(answer.contributions.length,2);
 assert.ok(answer.contributions.every(c=>!c.recordId.startsWith('BRI')&&c.points===260));
 assert.equal(engine(pack007).submit('SIDWELL','MD','REA').score,520);
 assert.equal(JSON.stringify(pack007),before);
});
test('zero-match and caretaker manager records are excluded from acceptance and manager multipliers',()=>{
 const counts=[1,0,2,30];
 const pack={packNumber:'003',formation:'5-4-1',clubs:counts.map((appearances,i)=>({clubCode:['AAA0001','BBB0001','CCC0001','DDD0001'][i],squad:[{id:'manager-'+i,fullname:'Alex Example',surname:'Example',positions:['MAN'],appearances,status:i===2?'caretaker':'permanent'}]}))};
 const e=engine(pack);
 assert.equal(e.context.findPlayers('EXAMPLE','MAN','BBB').length,0);assert.equal(e.context.findPlayers('EXAMPLE','MAN','CCC').length,0);
 const links=e.context.findLinkedRecords('Alex Example',true);assert.deepEqual(Array.from(links,r=>r.clubCode),['AAA','DDD']);
 assert.equal(e.context.calculateMultiManagerScore(links),240);
 assert.equal(e.context.calculateMultiManagerScore(pack.clubs.map(c=>({clubCode:c.clubCode.slice(0,3),record:c.squad[0]}))),240);
 assert.equal(e.submit('EXAMPLE','MAN','BBB').score,0);assert.equal(e.submit('EXAMPLE','MAN','CCC').score,0);
 const accepted=e.submit('EXAMPLE','MAN','AAA');assert.equal(accepted.score,240);assert.deepEqual(accepted.usage,{});
 assert.deepEqual(Object.values(accepted.answers)[0].clubs,['AAA','DDD']);
});
test('ineligible exact names cannot turn into a different fuzzy answer or enter ambiguity choices',()=>{
 const record=(fullname,surname,appearances)=>({fullname,surname,appearances,positions:['DF']});
 const e=engine({formation:'5-4-1',clubs:[{clubCode:'AAA0001',squad:[record('Alex Stone','Stone',0),record('Ben Stowe','Stowe',10),record('Chris Stowe','Stowe',0)]}]});
 assert.equal(e.context.findPlayers('STONE','DF','AAA').length,0);
 assert.deepEqual(Array.from(e.context.findPlayers('STOWE','DF','AAA'),p=>p.fullname),['Ben Stowe']);
 assert.deepEqual(Array.from(e.context.findPlayers('STOW','DF','AAA'),p=>p.fullname),['Ben Stowe']);
});
test('ordinary positive rarity bands, first-club scoring, duplicates and managers keep their established behaviour',()=>{
 const e=engine();
 for(const [appearances,short,points] of [[1,'UNI',100],[2,'SUB',80],[9,'SUB',80],[10,'UTL',60],[15,'UTL',60],[16,'ENG',40],[29,'ENG',40],[30,'LEG',20]]){
  const rarity=e.context.getRarity({appearances,positions:['DF']});assert.equal(rarity.short,short);assert.equal(rarity.points,points);
 }
 assert.equal(e.submit('CECH','GK','CHE').score,260);
 assert.equal(e.submit('CECH','GK','CHE').score,260);assert.match(e.context.testStatus,/ALREADY USED/);assert.equal(e.stats().usage.CHE,1);
 const keanePack=JSON.parse(fs.readFileSync(path.join(root,'data/vggfax001.json')));
 assert.equal(engine(keanePack).submit('KEANE','MD','MUN').score,520);
 assert.equal(engine().submit('MOURINHO','MAN','CHE').score,20);
});
test('missing, nonnumeric, fractional, negative and zero participation cannot earn rarity points',()=>{
 const e=engine();
 for(const appearances of [undefined,null,'1',0,-1,0.5,NaN,Infinity]){
  const record={appearances,positions:['MAN']};assert.equal(e.context.isEligibleRecord(record),false);assert.throws(()=>e.context.getManagerRarity(record),/Ineligible/);
 }
});
test('saved Sidwell progress with a zero-appearance linked-club bonus is discarded, not repriced or restored',()=>{
 const e=engine(pack007);vm.runInContext(fs.readFileSync(path.join(root,'progress.js'),'utf8'),e.context);
 const key='page302.progress.v1.007';
 e.storage.set(key,JSON.stringify({version:1,pack:'007',signature:JSON.stringify(pack007),formation:pack007.formation,guesses:1,score:780,picks:[{name:'Steve Sidwell',position:'MD',club:'FUL',slot:6}]}));
 e.run('restoreGameProgress()');assert.equal(e.stats().score,0);assert.deepEqual(e.stats().answers,{});assert.deepEqual(e.stats().usage,{});
 assert.equal(e.storage.has(key),false);assert.match(e.context.testStatus,/SAVED PROGRESS COULD NOT BE RESTORED/);
});
test('legacy backend receipt, supplied score, rows and published leaderboard remain byte-for-byte unchanged',()=>{
 const fixture=require('./fixtures/legacy-zero-appearance-submission.json'),payload=fixture.payload;
 assert.equal(fixture.sourceBuild,'v4.1.03_003');assert.equal(payload.answers[0].name,'Karl Jakob Hein');assert.equal(payload.answers[0].contributions[0].points,1040);
 let now=new Date('2026-11-09T12:00Z');
 const store=new ScoreStore(':memory:',{now:()=>now,reference:()=> '123456'});
 try{
  store.addPack({id:'003',formation:'5-4-1',revision:'historical',opensAt:'2026-11-01T00:00Z',closesAt:'2026-11-10T00:00Z'});
  const receipt=store.submit(payload),stored=JSON.stringify(store.db.prepare('SELECT * FROM submissions').all());
  now=new Date('2026-11-11T00:00Z');const published=JSON.stringify(store.finalize('003'));
  assert.equal(engine().submit('HEIN','GK','ARS').score,0);
  assert.deepEqual(store.submit(payload),receipt);assert.equal(receipt.score,1580);
  assert.equal(JSON.stringify(store.db.prepare('SELECT * FROM submissions').all()),stored);
  assert.equal(JSON.stringify(store.finalize('003')),published);assert.equal(store.latest().results[0].score,1580);
 }finally{store.close();}
});
