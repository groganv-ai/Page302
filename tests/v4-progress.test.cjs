const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
test('accepted picks, guesses and score recover safely; stale and blocked storage fail safely',async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();page.on('dialog',d=>d.accept());
  const root=path.resolve(__dirname,'..');const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/data/vggfax-manifest.json')return route.fulfill({json:{packs:['003']}});if(url.hostname!=='page302.test')return route.abort();
   const file=path.resolve(root,url.pathname.slice(1)||'index.html');
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf'};
   return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
  const ready=()=>page.waitForFunction(()=>typeof progressReady!=='undefined'&&progressReady);
  const stats=()=>page.evaluate(()=>({score:currentGame.score,guesses:currentGame.totalGuesses,squad:squadDisplay,usage:clubUsage,used:[...usedPeople]}));
  await page.addInitScript(() => window.PAGE302_RELEASES_ENABLED = false);
        await page.goto('http://page302.test');await ready();
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.dosCursor').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await page.locator('.dosCursor').evaluate(e=>getComputedStyle(e).display),'block');
  await page.locator('#answer').fill('GK');
  assert.equal(await page.locator('.dosCursor').evaluate(e=>getComputedStyle(e).display),'none');
  async function submit(position,surname,club='CHE'){
   const clubButton=page.locator('.clubPick[data-club="'+club+'"]');if(await clubButton.getAttribute('aria-pressed')!=='true')await clubButton.click();
   const slot=page.locator('.positionPick[data-position="'+position+'"]:not(:disabled)').last();if(await slot.getAttribute('aria-pressed')!=='true')await slot.click();
   await page.locator('#answer').fill(surname);await page.locator('#answer').press('Enter');
  }
  for(const [position,surname] of [['GK','CECH'],['DF','TERRY'],['DF','NONEXISTENT']])await submit(position,surname);
  const before=await stats();assert.ok(before.score>0);assert.equal(before.guesses,3);
  await page.reload();await ready();assert.deepEqual(await stats(),before);
  await page.evaluate(()=>{window.removeEventListener('pagehide',saveGameProgress);const k=progressKey(),r=JSON.parse(localStorage.getItem(k));r.score=999999;localStorage.setItem(k,JSON.stringify(r));});
  await page.reload();await ready();assert.equal((await stats()).score,0);
  await submit('GK','CECH');
  assert.ok((await stats()).score>0);
  await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})});
  await page.reload();await ready();await submit('GK','CECH');assert.ok((await stats()).score>0);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
