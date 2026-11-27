const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('actual review URL loads pack 002 and baseline with isolated APIs',async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  for(const baseline of [false,true]){
   const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:3025/'+(baseline?'?baseline=1':''));
   await page.waitForFunction(()=>progressReady&&clubPool.length===11);
   const state=await page.evaluate(()=>({build:document.querySelector('#buildLabel').textContent,pack:currentVggfax,clubs:clubPool.length,players:clubPool.reduce((n,c)=>n+c.squad.length,0),enabled:window.PAGE302_FUZZY_NAMES_ENABLED,api:window.PAGE302_SCORES_API}));
   assert.equal(state.build,'v4.1.25_002');assert.equal(state.pack,'002');assert.equal(state.clubs,11);assert.ok(state.players>100);assert.equal(state.enabled,!baseline);assert.equal(state.api,'http://127.0.0.1:3025');
   const pick=await page.evaluate(()=>{for(const club of clubPool)for(const p of club.squad){if(isEligibleRecord(p)&&p.positions.includes('DF')&&findPlayers(p.surname,'DF',club.clubCode.slice(0,3)).length===1)return {club:club.clubCode.slice(0,3),surname:p.surname};}});
   await page.locator('.clubPick[data-club="'+pick.club+'"]').click();await page.locator('.positionPick').filter({hasText:'DF'}).first().click();
   await page.locator('#answer').fill(pick.surname);await page.locator('#answer').press('Enter');assert.match(await page.locator('#result').textContent(),/CORRECT/);
   assert.deepEqual(errors,[]);console.log(state);await page.close();
  }
 }finally{await browser.close();}
});

