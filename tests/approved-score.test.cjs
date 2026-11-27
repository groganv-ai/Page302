const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {normalize} = require('../backend/validation.cjs');
const {verifyApprovedScore} = require('../backend/approved-score.cjs');
const {ScoreStore} = require('../backend/store.cjs');
const {sqliteBinding} = require('../backend/sqlite-binding.cjs');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root,'script.js'),'utf8')
  .replace(/document\s*\.getElementById\("answer"\)\s*\.addEventListener[\s\S]*$/, '');
const load = id => JSON.parse(fs.readFileSync(path.join(root,`data/vggfax${id}.json`),'utf8'));

// Independent oracle: exercise the actual browser's pick/scoring functions.
function play(pack, seed=0, reverse=false) {
  const context = vm.createContext({testPack:pack,seed,reverse,console:{log(){}},setTimeout(){},
    document:{getElementById(){return {value:'',focus(){},select(){}}}}});
  vm.runInContext(source, context);
  return JSON.parse(vm.runInContext(`
    clubPool=testPack.clubs;currentVggfax=testPack.packNumber;
    refreshScreen=function(){};setStatus=function(){};clearPendingAnswer=function(){};
    currentGame={formation:testPack.formation,score:0,totalGuesses:24,gameOver:false};
    clubUsage={};usedPeople=new Set();squadDisplay={};buildSquad();
    let slots=squad.map((value,index)=>({position:value.split(' ')[0],index})).filter(slot=>slot.position);
    if(reverse)slots.reverse();
    for(const {position,index} of slots){
      const candidates=clubPool.flatMap(club=>club.squad
        .filter(p=>isEligibleRecord(p)&&p.positions.includes(position)&&!playerAlreadyUsed(p))
        .map(player=>({player,code:club.clubCode.slice(0,3)})));
      const choice=candidates[seed===0?0:(seed*19+index*13)%candidates.length];
      answerTargetSlot=index;
      applyAnswer(choice.player,position,choice.code,'',choice.player.surname,true);
    }
    JSON.stringify({requestId:'approved_score_test_0001',packId:currentVggfax,initials:'TST',
      score:currentGame.score,guesses:currentGame.totalGuesses,
      answers:Object.keys(squadDisplay).sort((a,b)=>a-b).map(k=>{const a=squadDisplay[k];
        return {personId:a.personId,name:a.name,position:a.position,clubs:a.clubs,
          contributions:a.contributions,rarity:a.rarity,clubTier:a.clubTier};})})
  `,context));
}
const verify = (input,pack) => verifyApprovedScore(normalize(input),input,pack);

test('server matches browser scoring across published packs, both points tables and reverse pick order',()=>{
  for (const id of ['001','002','003','004','005','006','007']) {
    const pack=load(id);
    for (const packNumber of [id,'015']) for(const reverse of [false,true]) for(const seed of [0,1,3]) {
      const version={...pack,packNumber},input=play(version,seed,reverse);
      assert.equal(input.answers.length,12);
      assert.equal(verify(input,version),input.score,`${id} / ${packNumber} / ${seed} / ${reverse}`);
    }
  }
});

test('multi-club players and managers use all eligible records and exclude caretakers and zero appearances',()=>{
  const pack=load('002'), manager=pack.clubs[0].squad.find(r=>r.positions.includes('MAN'));
  const player=pack.clubs[0].squad.find(r=>r.positions.includes('GK')&&r.appearances>0);
  pack.clubs[1].squad.unshift({...manager,id:'linked-manager',appearances:1},
    {...player,id:'linked-player',appearances:3});
  pack.clubs[2].squad.unshift({...manager,id:'caretaker-record',status:'caretaker',appearances:2},
    {...player,id:'zero-record',appearances:0});
  const input=play(pack);
  assert.equal(input.answers.find(a=>a.position==='MAN').clubs.length,2);
  assert.equal(input.answers.find(a=>a.position==='GK').clubs.length,2);
  assert.equal(verify(input,pack),input.score);
  const bad=structuredClone(input);bad.answers.find(a=>a.position==='MAN').contributions[0].recordId='caretaker-record';
  assert.throws(()=>verify(bad,pack),{status:422});
});

test('reject fabricated identities, invalid positions, club lists, tiers, rarity, contribution points and total',()=>{
  const pack=load('002'),input=play(pack);
  const changes=[
    x=>x.score=999999999,
    x=>x.answers[0].personId='player:invented',
    x=>x.answers[0].name='Invented player',
    x=>x.answers[0].position='AT',
    x=>x.answers[0].clubs=['ZZZ'],
    x=>x.answers[0].clubs.push('ZZZ'),
    x=>x.answers[1].clubTier=1,
    x=>delete x.answers[0].clubTier,
    x=>x.answers[0].rarity=x.answers[0].rarity==='UNI'?'LEG':'UNI',
    x=>delete x.answers[0].rarity,
    x=>x.answers[0].contributions[0].recordId='invented-record',
    x=>x.answers[0].contributions[0].points++,
    x=>x.answers[0].contributions.push({...x.answers[0].contributions[0]}),
    x=>x.answers[11].clubTier=1
  ];
  for (const change of changes) {const bad=structuredClone(input);change(bad);assert.throws(()=>verify(bad,pack),{status:422});}
  assert.throws(()=>verify(input,null),{status:503});
});

test('one person cannot occupy both a player and manager slot',()=>{
  const pack=load('002'),input=play(pack),bad=structuredClone(input);
  bad.answers[11]={...bad.answers[11],name:bad.answers[0].name,personId:'manager:'+bad.answers[0].name.normalize('NFKC').trim().toLocaleLowerCase('en-GB')};
  assert.throws(()=>verify(bad,pack),{status:422});
});

async function setup() {
  const {D1Store}=await import('../backend/cloudflare/d1-store.mjs');
  const pack=load('002'),local=new ScoreStore(),now=()=>new Date('2026-11-27T12:00Z');
  local.addPack({id:'002',formation:pack.formation,revision:'approved',opensAt:'2026-11-27T00:00Z',closesAt:'2026-11-28T00:00Z'});
  local.db.prepare('INSERT INTO release_schedule VALUES(?,?,?,?)').run('002',JSON.stringify(pack),'approved',now().toISOString());
  const db=sqliteBinding(local.db);
  return {local,pack,db,remote:new D1Store(db,{now}),input:play(pack),now,D1Store};
}

test('Worker rejects forged scores without writes and keeps valid submissions and retries',async()=>{
  const {local,db,input}=await setup();
  const {default:worker}=await import('../backend/cloudflare/worker.mjs');
  // Keep this runtime fixture open irrespective of the test machine's date.
  local.db.exec("UPDATE packs SET opens_at='2000-01-01T00:00:00.000Z',closes_at='2100-01-01T00:00:00.000Z'");
  const post=body=>worker.fetch(new Request('https://test/api/submissions',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),{DB:db});
  try {
    assert.equal((await post({...input,score:999999999})).status,422);
    assert.equal(local.db.prepare('SELECT count(*) n FROM submissions').get().n,0);
    assert.equal(local.db.prepare('SELECT count(*) n FROM answers').get().n,0);
    const saved=await post(input);assert.equal(saved.status,200);const receipt=await saved.json();
    assert.equal(receipt.score,input.score);
    assert.deepEqual(await (await post(input)).json(),receipt);
    assert.equal(local.db.prepare('SELECT count(*) n FROM submissions').get().n,1);
    assert.equal(local.db.prepare('SELECT count(*) n FROM answers').get().n,12);
    assert.equal((await post({...input,score:1})).status,409);
  } finally {local.close();}
});

test('missing approved payload fails closed even with scheduling disabled; legacy receipts still retry',async()=>{
  const {local,remote,input}=await setup();
  try {
    local.db.exec('DELETE FROM release_schedule');
    await assert.rejects(remote.submit(input),{status:503});
    // The old local fixture store models a receipt written before this release.
    local.now=()=>new Date('2026-11-27T12:00Z');
    const legacy={...input,score:123};const receipt=local.submit(legacy);
    local.db.exec("UPDATE packs SET closes_at='2026-11-27T11:00:00.000Z'");
    assert.deepEqual(await remote.submit(legacy),receipt);
    await assert.rejects(remote.submit({...legacy,requestId:'new_request_after_close'}),{status:409});
  } finally {local.close();}
});

test('pack replacement between validation and insert cannot save a stale score',async()=>{
  const {local,db,input,now,D1Store}=await setup();
  const raced={...db,async batch(statements){
    local.db.exec("UPDATE release_schedule SET payload='{}'");
    return db.batch(statements);
  }};
  try {
    await assert.rejects(new D1Store(raced,{now}).submit(input),{status:409});
    assert.equal(local.db.prepare('SELECT count(*) n FROM submissions').get().n,0);
    assert.equal(local.db.prepare('SELECT count(*) n FROM answers').get().n,0);
  } finally {local.close();}
});
