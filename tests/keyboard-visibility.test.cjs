const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
for(const engine of ['chromium','webkit'])test(engine+' touch keyboard dismissal and viewport',async()=>{
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const root=path.resolve(__dirname,'..'),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>window.PAGE302_RELEASES_ENABLED=false);
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/data/vggfax-manifest.json')return route.fulfill({json:{packs:['003']}});
   if(url.hostname!=='page302.test')return route.abort();
   const file=path.resolve(root,url.pathname.slice(1)||'index.html');
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();
   return route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'});
  });
  await page.goto('http://page302.test/');
  await page.waitForFunction(()=>clubPool.length===11&&document.querySelector('.clubPick'));
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await page.locator('#buildLabel').textContent(),'v4.1.21_002');
  await page.locator('.clubPick[data-club="CHE"]').click();
  const formation=await page.locator('.teamPanel').boundingBox();
  assert.ok(formation.y>=-1&&formation.y<40,'club selection jumps to formation');
  assert.equal(await page.locator('#answer').evaluate(e=>e===document.activeElement),false,'club alone must not open keyboard');
  await page.locator('.positionPick[data-position="GK"]').click();
  await page.locator('#answer').fill('CECH');
  const before=await page.evaluate(()=>({score:currentGame.score,guesses:currentGame.totalGuesses}));
  assert.equal(await page.getByRole('button',{name:'Dismiss keyboard'}).count(),0);
  assert.equal(await page.locator('#answer').inputValue(),'CECH');
  assert.equal(await page.locator('#answer').evaluate(e=>e===document.activeElement),true);
  assert.deepEqual(await page.evaluate(()=>({score:currentGame.score,guesses:currentGame.totalGuesses})),before);
  for(const size of [{width:390,height:360},{width:844,height:300},{width:390,height:844}]){
   await page.setViewportSize(size);await page.locator('#answer').focus();
   await page.waitForTimeout(450);
   const geometry=await page.locator('.answerRow').evaluate(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,height:visualViewport.height,offset:visualViewport.offsetTop}));
   assert.ok(geometry.top>=geometry.offset && geometry.bottom<=geometry.offset+geometry.height,JSON.stringify(geometry));
  }
  await page.locator('#answer').dispatchEvent('keydown',{key:'Enter',isComposing:true});
  // Safari's viewport pans after our correction. Those scroll events must not
  // start another correction, even when the field is temporarily outside view.
  await page.waitForTimeout(450);
  const scrollCalls=await page.evaluate(async()=>{
   const original=window.scrollBy;let calls=0;
   window.scrollBy=(...args)=>{calls++;return original.apply(window,args);};
   window.scrollTo({top:0,behavior:'instant'});
   for(let i=0;i<20;i++)visualViewport.dispatchEvent(new Event('scroll'));
   await new Promise(resolve=>setTimeout(resolve,500));
   window.scrollBy=original;return calls;
  });
  assert.equal(scrollCalls,0,'viewport scrolling must not feed back into programmatic scrolling');
  assert.equal(await page.evaluate(()=>currentGame.totalGuesses),before.guesses);
  await page.locator('#answer').press('Enter');
  assert.equal(await page.locator('#answer').evaluate(e=>e===document.activeElement),false);
  assert.equal(await page.evaluate(()=>currentGame.totalGuesses),before.guesses+1);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
