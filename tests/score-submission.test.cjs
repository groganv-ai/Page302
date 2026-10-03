const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {ScoreStore}=require('../backend/store.cjs');
test('active result submits unchanged values, retries lost receipt, replays same pack and fits mobile',async()=>{
 const store=new ScoreStore();store.addPack({id:'003',formation:'5-4-1',revision:'test',opensAt:'2020-01-01T00:00Z',closesAt:'2099-01-01T00:00Z'});
 const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL||'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}});let lose=true;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>window.PAGE302_SCORES_API='http://page302.test');
  const root=path.resolve(__dirname,'..');
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname!=='page302.test')return route.abort();
   if(url.pathname==='/api/submissions'){
    try{const receipt=store.submit(route.request().postDataJSON());if(lose){lose=false;return route.abort()};return route.fulfill({json:receipt});}
    catch(e){return route.fulfill({status:e.status||500,json:{error:e.message}})}
   }
   const file=path.resolve(root,url.pathname.slice(1)||'index.html');
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png'};
   return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
  await page.goto('http://page302.test');await page.waitForFunction(()=>clubPool?.length===11);
  await page.evaluate(async()=>{
   currentVggfax='003';await loadClub();currentGame={formation:'5-4-1',score:2450,totalGuesses:18,gameOver:false};buildSquad();squadDisplay={};
   const used=new Set();
   for(let slot=0;slot<squad.length;slot++){
    if(!squad[slot])continue;
    const pos=squad[slot].split(' ')[0];let found;
    for(const club of clubPool){found=club.squad.find(p=>p.positions.includes(pos)&&!used.has(normalizePersonName(p.fullname)));if(found)break;}
    used.add(normalizePersonName(found.fullname));
    const links=findLinkedRecords(found.fullname,pos==='MAN');
    addPlayerToSquad(found,pos,pos==='MAN',links.map(l=>l.clubCode),{short:'UNI'},1,100);
   }
   completeGame();
  });
  await page.locator('#scoreInitials').fill('vgg');await page.locator('#submitScoreButton').click();
  await page.waitForFunction(()=>document.getElementById('scoreSubmissionStatus').textContent.includes('RETRY'));
  await page.locator('#submitScoreButton').click();await page.waitForFunction(()=>document.getElementById('submitScoreButton').textContent==='SAVED');
  assert.equal(store.db.prepare('SELECT count(*) n FROM submissions').get().n,1);
  const saved=store.db.prepare('SELECT * FROM submissions').get();assert.equal(saved.score,2450);assert.equal(saved.guesses,18);
  assert.equal(await page.locator('#scoreInitials').isDisabled(),true);
  await page.setViewportSize({width:390,height:844});
  const bounds=await page.locator('#gameCompleteWindow').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
  await page.getByRole('button',{name:'PLAY AGAIN',exact:true}).click();
  await page.waitForFunction(()=>!currentGame.gameOver&&currentGame.score===0);
  assert.equal(await page.evaluate(()=>currentVggfax),'003');assert.equal(await page.evaluate(()=>scoreAttempt),null);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();store.close()}
});
