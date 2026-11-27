const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {ScoreStore}=require('../backend/store.cjs');
const {sqliteBinding}=require('../backend/sqlite-binding.cjs');
test('approved result rejects tampering, retries lost receipt, replays same pack and fits mobile',async()=>{
 const store=new ScoreStore();store.addPack({id:'003',formation:'5-4-1',revision:'test',opensAt:'2020-01-01T00:00Z',closesAt:'2099-01-01T00:00Z'});
 const {D1Store}=await import('../backend/cloudflare/d1-store.mjs');
 const remote=new D1Store(sqliteBinding(store.db));
 store.db.prepare('INSERT INTO release_schedule VALUES(?,?,?,?)').run('003',JSON.stringify(require('../data/vggfax003.json')),'test',new Date().toISOString());
 const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL||'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}});let lose=true,forge=true;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>window.PAGE302_SCORES_API='http://page302.test');
  const root=path.resolve(__dirname,'..');
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/data/vggfax-manifest.json')return route.fulfill({json:{packs:['003']}});
   if(url.hostname!=='page302.test')return route.abort();
   if(url.pathname==='/api/submissions'){
    try{const input=route.request().postDataJSON();if(forge){forge=false;input.score++;}
     const receipt=await remote.submit(input);if(lose){lose=false;return route.abort()};return route.fulfill({json:receipt});}
    catch(e){return route.fulfill({status:e.status||500,json:{error:e.message}})}
   }
   const file=path.resolve(root,url.pathname.slice(1)||'index.html');
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png'};
   return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
  await page.addInitScript(() => window.PAGE302_RELEASES_ENABLED = false);
        await page.goto('http://page302.test');await page.waitForFunction(()=>clubPool?.length===11);
  await page.evaluate(async()=>{
   currentVggfax='003';await loadClub();currentGame={formation:'5-4-1',score:0,totalGuesses:18,gameOver:false};buildSquad();squadDisplay={};clubUsage={};usedPeople=new Set();
   for(let slot=0;slot<squad.length;slot++){
    if(!squad[slot])continue;
    const pos=squad[slot].split(' ')[0];
    for(const club of clubPool){
     const found=club.squad.find(p=>isEligibleRecord(p)&&p.positions.includes(pos)&&!playerAlreadyUsed(p));
     if(found){answerTargetSlot=slot;applyAnswer(found,pos,club.clubCode.slice(0,3),'',found.surname,true);break;}
    }
   }
   completeGame();
  });
  const originalRequest=await page.evaluate(()=>scoreAttempt.requestId);
  const originalScore=await page.evaluate(()=>scoreAttempt.score);
  assert.equal(await page.locator('#buildLabel').textContent(),'v4.1.27_002');
  await page.evaluate(()=>{releaseState={enabled:true};updateBuildLabels();});
  assert.equal(await page.locator('#buildLabel').textContent(),'v4.1.27_003');
  await page.evaluate(()=>{releaseState=null;updateBuildLabels();});
  await page.locator('#scoreInitials').fill('vgg');
  await page.locator('#gameCompleteOverlay .completeDismiss').click();
  await page.locator('#reopenResults').click();
  assert.equal(await page.evaluate(()=>scoreAttempt.requestId),originalRequest);
  assert.equal(await page.locator('#scoreInitials').inputValue(),'vgg');
  assert.equal(store.db.prepare('SELECT count(*) n FROM submissions').get().n,0);
  await page.locator('#scoreInitials').fill('vgg');await page.locator('#submitScoreButton').click();
  await page.waitForFunction(()=>document.getElementById('scoreSubmissionStatus').textContent.includes('SCORE COULD NOT BE VERIFIED'));
  assert.equal(store.db.prepare('SELECT count(*) n FROM submissions').get().n,0);
  await page.locator('#submitScoreButton').click();
  await page.waitForFunction(()=>document.getElementById('scoreSubmissionStatus').textContent.includes('RETRY'));
  await page.locator('#submitScoreButton').click();await page.waitForFunction(()=>document.getElementById('submitScoreButton').textContent==='SAVED');
  assert.equal(store.db.prepare('SELECT count(*) n FROM submissions').get().n,1);
  const saved=store.db.prepare('SELECT * FROM submissions').get();assert.equal(saved.score,originalScore);assert.equal(saved.guesses,18);
  assert.equal(await page.locator('#scoreInitials').isDisabled(),true);
  await page.locator('#gameCompleteOverlay .completeDismiss').click();await page.locator('#reopenResults').click();
  assert.equal(await page.evaluate(()=>scoreAttempt.requestId),originalRequest);
  assert.equal(await page.locator('#submitScoreButton').textContent(),'SAVED');
  assert.equal(store.db.prepare('SELECT count(*) n FROM submissions').get().n,1);
  // A live schedule gap must reject reopening even if the button was visible.
  await page.locator('#gameCompleteOverlay .completeDismiss').click();
  await page.waitForFunction(()=>!!document.getElementById('reopenResults'));
  await page.evaluate(()=>{window.PAGE302_RELEASES_ENABLED=true;window.originalRefreshReleaseState=refreshReleaseState;refreshReleaseState=async()=>({enabled:true,currentPack:null});});
  await page.locator('#reopenResults').click();
  assert.equal(await page.locator('#gameCompleteOverlay').isVisible(),false);
  assert.equal(await page.locator('#reopenResults').isVisible(),false);
  await page.evaluate(()=>{window.PAGE302_RELEASES_ENABLED=false;refreshReleaseState=window.originalRefreshReleaseState;closeCompleteGame();});
  await page.locator('#reopenResults').click();
  await page.setViewportSize({width:390,height:844});
  const bounds=await page.locator('#gameCompleteWindow').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
  await page.getByRole('button',{name:'PLAY AGAIN',exact:true}).click();
  assert.equal(await page.locator('#newGameMessage').textContent(),'Are you sure you want to start a new game?');
  await page.locator('#confirmNewGame').click();
  await page.waitForFunction(()=>!currentGame.gameOver&&currentGame.score===0);
  assert.equal(await page.evaluate(()=>currentVggfax),'003');assert.equal(await page.evaluate(()=>scoreAttempt),null);
  assert.equal(await page.locator('#reopenResults').isVisible(),false);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();store.close()}
});
