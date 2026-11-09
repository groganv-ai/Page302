const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
test('live selection flow rejects Hein with one guess and safely discards an old zero-appearance save',async()=>{
 const root=path.resolve(__dirname,'..'),browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];let submissions=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/data/vggfax-manifest.json')return route.fulfill({json:{packs:['003']}});if(url.hostname!=='page302.test')return route.abort();
   if(url.pathname.startsWith('/api/')){if(url.pathname==='/api/submissions')submissions++;return route.fulfill({status:404,json:{error:'Not found'}});}
   const file=path.resolve(root,url.pathname.slice(1)||'index.html');
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf'};
   return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
  const ready=()=>page.waitForFunction(()=>progressReady&&clubPool.length===11&&document.querySelector('.clubPick'));
  const stats=()=>page.evaluate(()=>({score:currentGame.score,guesses:currentGame.totalGuesses,answers:squadDisplay,usage:clubUsage,used:[...usedPeople]}));
  await page.addInitScript(() => window.PAGE302_RELEASES_ENABLED = false);
        await page.goto('http://page302.test');await ready();await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('#buildLabel').textContent(),'v4.1.07_002');
  await page.locator('.clubPick[data-club="ARS"]').click();await page.locator('.positionPick[data-position="GK"]').click();
  await page.locator('#answer').fill('HEIN');await page.locator('#answer').press('Enter');
  assert.deepEqual(await stats(),{score:0,guesses:1,answers:{},usage:{},used:[]});
  assert.match(await page.locator('#lastAnswer').textContent(),/HEIN.*NOT FOUND/);
  assert.match(await page.locator('#lastAnswer img').getAttribute('src'),/ball-red/);
  assert.equal(await page.locator('.positionPick[data-position="GK"]').isEnabled(),true);
  assert.equal(await page.locator('.mainLayout [aria-pressed="true"]').count(),2);
  assert.equal(await page.evaluate(()=>packData.clubs.find(c=>c.clubCode==='ARS2324').squad.find(p=>p.surname==='Hein').appearances),0);
  await page.locator('.clubPick[data-club="CHE"]').click();await page.locator('#answer').fill('CECH');await page.locator('#answer').press('Enter');
  const valid=await stats();assert.equal(valid.score,260);assert.equal(valid.guesses,2);assert.equal(valid.answers[0].name,'Petr Čech');
  await page.reload();await ready();assert.deepEqual(await stats(),valid);
  // Genuine old scoring: John Terry (260) followed by Hein (1040), with unchanged pack signature.
  await page.evaluate(()=>{
   window.removeEventListener('pagehide',saveGameProgress);
   localStorage.setItem(progressKey(),JSON.stringify({version:1,pack:currentVggfax,signature:packSignature(),formation:currentGame.formation,guesses:2,score:1300,
    picks:[{name:'John Terry',position:'DF',club:'CHE',slot:1},{name:'Karl Jakob Hein',position:'GK',club:'ARS',slot:0}],attempt:null}));
  });
  await page.reload();await ready();
  assert.deepEqual(await stats(),{score:0,guesses:0,answers:{},usage:{},used:[]});
  assert.match(await page.locator('#lastAnswer').textContent(),/SAVED PROGRESS COULD NOT BE RESTORED/);
  assert.equal(await page.evaluate(()=>localStorage.getItem(progressKey())),null);
  assert.equal(await page.locator('#answer').isEnabled(),true);assert.equal(submissions,0);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
