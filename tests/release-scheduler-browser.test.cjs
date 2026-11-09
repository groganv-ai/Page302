const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {ScoreStore}=require('../backend/store.cjs');
const {sqliteBinding}=require('../backend/sqlite-binding.cjs');
const {scheduleSQL,adminSQL,calendar}=require('../tools/release-scheduler.cjs');
const ROOT=path.resolve(__dirname,'..');

test('website selects scheduled pack, shows midnight gap and final leaderboard, then changes pack',async()=>{
 const {runReleases,releaseManifest,releasePayload}=await import('../backend/cloudflare/release-scheduler.mjs');
 const store=new ScoreStore(),db=sqliteBinding(store.db);
 let now=new Date('2026-11-09T12:00Z');store.now=()=>now;
 const entries=calendar(path.join(ROOT,'tools/release-calendar.2026-11-10.json'));
 store.db.exec(scheduleSQL(entries));store.db.exec(adminSQL('enable',[]));await runReleases(db,now);
 const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL||'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[],requested=[];
  await page.emulateMedia({reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{
   window.PAGE302_SCORES_API='http://page302.test';window.PAGE302_RELEASES_ENABLED=true;
   const interval=window.setInterval.bind(window);
   window.setInterval=(fn,delay,...args)=>{if(delay===30000){window.tickRelease=fn;return 1}return interval(fn,delay,...args)};
  });
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.hostname!=='page302.test')return route.abort();
   requested.push(url.pathname);
   if(url.pathname==='/api/releases')return route.fulfill({json:await releaseManifest(db,now)});
   if(url.pathname.startsWith('/api/packs/')){
    const payload=await releasePayload(db,url.pathname.split('/').pop(),now);
    return route.fulfill({status:payload?200:404,json:payload||{error:'Pack unavailable'}});
   }
   if(url.pathname==='/api/results/latest')return route.fulfill({json:store.latest()});
   if(url.pathname.startsWith('/api/challenges/')){
    try{return route.fulfill({json:store.challenge(url.pathname.split('/').pop())})}
    catch(error){return route.fulfill({status:error.status||500,json:{error:error.message}})}
   }
   const file=path.resolve(ROOT,url.pathname.slice(1)||'index.html');
   if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'Not found'});
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf'};
   return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
  await page.goto('http://page302.test');await page.waitForFunction(()=>clubPool?.length===11);
  assert.equal(await page.evaluate(()=>currentVggfax),'002');
  assert.equal(await page.evaluate(()=>currentGame.formation),'4-3-3');
  assert.equal(requested.includes('/api/packs/003'),false);
  assert.match(await page.locator('#buildLabel').textContent(),/v4\.1\.07_002/);
  await page.waitForFunction(()=>/^\d{2}:\d{2}:\d{2}$/.test(document.querySelector('#submissionDeadline').textContent));
  for(let i=0;i<3;i++){
   await page.evaluate(()=>newGame({quiet:true}));
   assert.equal(await page.evaluate(()=>currentVggfax),'002');
  }
  await page.evaluate(()=>playAgainFromResult());
  assert.equal(await page.evaluate(()=>currentVggfax),'002');
  assert.equal(requested.includes('/api/packs/003'),false);
  const positions=['GK',...Array(4).fill('DF'),...Array(3).fill('MD'),...Array(3).fill('AT'),'MAN'];
  store.submit({packId:'002',requestId:'scheduler_browser_fixture',initials:'TST',score:123,guesses:17,answers:positions.map((position,i)=>({personId:'fixture-'+i,name:'Fixture '+i,position,clubs:['ARS'],contributions:[{recordId:'fixture-'+i,points:1}]}))});
  await page.evaluate(()=>currentGame.totalGuesses=2);
  now=new Date('2026-11-10T00:00Z');await runReleases(db,now);await page.evaluate(()=>window.tickRelease());
  assert.equal(await page.locator('#answer').isDisabled(),true);
  assert.match(await page.locator('#result').textContent(),/NEXT PACK OPENS/);
  assert.match(await page.locator('#result').textContent(),/00:01/);
  await page.evaluate(()=>newGame({quiet:true}));
  assert.equal(await page.evaluate(()=>currentVggfax),'002');
  assert.equal(await page.locator('#answer').isDisabled(),true);
  assert.equal(requested.includes('/api/packs/003'),false);
  await page.evaluate(()=>showScores());
  await page.waitForFunction(()=>document.querySelectorAll('#leaderboardRows tr').length===1);
  assert.match(await page.locator('#leaderboardTitle').textContent(),/PACK 002/);
  assert.match(await page.locator('#leaderboardRows').textContent(),/123/);
  await page.evaluate(()=>hideScores());
  now=new Date('2026-11-10T00:01Z');await runReleases(db,now);await page.evaluate(()=>window.tickRelease());
  assert.match(await page.locator('#result').textContent(),/NEW PACK AVAILABLE/);
  await page.evaluate(()=>newGame({quiet:true}));
  assert.equal(await page.evaluate(()=>currentVggfax),'003');
  assert.equal(await page.evaluate(()=>currentGame.formation),'5-4-1');
  assert.match(await page.locator('#buildLabel').textContent(),/v4\.1\.07_003/);
  assert.equal(await page.locator('#answer').isDisabled(),false);
  await page.waitForFunction(()=>/^\d{2}:\d{2}:\d{2}$/.test(document.querySelector('#submissionDeadline').textContent));
  assert.equal(await page.locator('img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0)),true);
  fs.mkdirSync(path.join(ROOT,'outputs/release-scheduler'),{recursive:true});
  await page.screenshot({path:path.join(ROOT,'outputs/release-scheduler/desktop.png'),fullPage:true,animations:'disabled',timeout:15000});
  await page.setViewportSize({width:390,height:844});
  assert.match(await page.locator('#buildLabel').textContent(),/v4\.1\.07_003/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(ROOT,'outputs/release-scheduler/mobile.png'),fullPage:true,animations:'disabled',timeout:15000});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();store.close()}
});
