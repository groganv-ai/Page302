const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
for(const engine of [chromium,webkit])test('club sorting preserves gameplay in '+engine.name(),async()=>{
 const browser=await engine.launch(engine===chromium?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync('outputs/keyboard-review/page302-keyboard-review.html','utf8')}));
  await page.goto('http://page302.test/');await page.waitForFunction(()=>clubPool.length===11);
  const snapshot=await page.evaluate(()=>JSON.stringify(clubPool));
  const order=()=>page.locator('.clubPick').evaluateAll(nodes=>nodes.map(n=>n.dataset.club));
  const original=await order();
  await page.locator('.clubPick[data-club="ARS"]').click();
  await page.evaluate(()=>{clubUsage.ARS=2;drawClubTitle();});
  const colour=await page.locator('[data-club="ARS"]').evaluate(e=>e.style.color);
  const toggle=page.locator('.clubSortToggle'),heading=page.locator('.clubSortHeader > span');
  assert.equal(await toggle.count(),1);
  assert.equal(await heading.textContent(),'CLUBS');
  await toggle.click();
  assert.equal(await heading.textContent(),'CLUBS (A/Z)');
  assert.deepEqual(await order(),original);
  await toggle.press('Enter');
  assert.equal(await heading.textContent(),'CLUBS (#1)');
  assert.deepEqual(await order(),['MUN','ARS','CHE','LIV','NEW','QPR','BRI','FUL','SWA','BOU','CRY']);
  assert.ok((await page.locator('.clubPick').allTextContents()).every(text=>!text.includes('[#')));
  assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);
  await toggle.click();
  assert.equal(await heading.textContent(),'CLUBS (yrs)');
  assert.deepEqual(await order(),['QPR','CRY','LIV','NEW','MUN','FUL','SWA','CHE','BOU','BRI','ARS']);
  await toggle.click();
  assert.equal(await heading.textContent(),'CLUBS');
  assert.deepEqual(await order(),original);
  assert.equal(await page.evaluate(()=>JSON.stringify(clubPool)),snapshot);
  assert.equal(await page.evaluate(()=>selectedTeamClub),'ARS');
  assert.equal(await page.locator('[data-club="ARS"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('[data-club="ARS"]').evaluate(e=>e.style.color),colour);
  const edge=await page.evaluate(()=>{
   const clubs=[{club:'Unknown',clubCode:'ZZZ',season:'2000-01'},{club:'A',clubCode:'ARS2324',season:'2023-24'},{club:'B',clubCode:'ARS2324',season:'2023-24'}];
   return [false,true].map(desc=>sortedClubView(clubs,'rank',desc).map(c=>c.club));
  });
  assert.deepEqual(edge,[['A','B','Unknown'],['A','B','Unknown']]);
  for(const width of [320,390,768,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.locator('.clubSortHeader').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
   const box=await toggle.boundingBox(),bar=await page.locator('.clubSortHeader').boundingBox();
   assert.ok(Math.abs(box.x+box.width-bar.x-bar.width)<2);
   assert.ok(box.height>=44);
  }
  await page.setViewportSize({width:390,height:844});
  await toggle.click();await toggle.click();
  await page.locator('.clubsPanel').screenshot({path:'.local/club-sorting-'+engine.name()+'.png'});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
