const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
test('report entry points, hover, optional fields, retry, success, focus and mobile',async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:1000}}),errors=[];let payload,fail=true;
  page.on('pageerror',error=>errors.push(error.message));
  const root=path.resolve(__dirname,'..');
  await page.addInitScript(()=>window.PAGE302_SCORES_API='http://page302.test');
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname!=='page302.test')return route.abort();
   if(url.pathname==='/api/reports'){payload=route.request().postDataJSON();return route.fulfill({status:fail?503:200,json:fail?{error:'Please try later.'}:{sent:true}});}
   const file=path.resolve(root,url.pathname.slice(1)||'index.html');
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png'};
   return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
  await page.goto('http://page302.test');await page.waitForFunction(()=>clubPool?.length===11);
  await page.evaluate(()=>showHelp());
  const helpButton=page.locator('#helpOverlay .helpPageFooter button').nth(2);assert.equal(await helpButton.textContent(),'REPORT');
  await helpButton.hover();assert.equal(await helpButton.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 0)');
  await helpButton.click();assert.ok(await page.locator('#reportOverlay').isVisible());
  await page.locator('#reportType').selectOption('name');assert.ok(await page.locator('#reportAliasField').isVisible());
  await page.locator('#reportType').selectOption('web');assert.ok(await page.locator('#reportPlayerFields').isHidden());
  await page.locator('#reportType').selectOption('data');
  await page.locator('[name=description]').fill('Manager data test');
  await page.locator('#reportSend').click();await page.waitForFunction(()=>document.getElementById('reportStatus').textContent==='Please try later.');
  assert.equal(await page.locator('[name=description]').inputValue(),'Manager data test');assert.equal(payload.person,'');assert.equal(payload.build,'v3.7.11_003');assert.equal(payload.pack,'003');
  fail=false;await page.locator('#reportSend').click();await page.waitForFunction(()=>document.getElementById('reportStatus').textContent.includes('Thank you'));
  assert.equal(await page.locator('[name=description]').inputValue(),'');
  await page.keyboard.press('Escape');assert.ok(await page.locator('#helpOverlay').isVisible());
  await page.evaluate(()=>{hideHelp();showAbout()});await page.locator('.aboutContact a').filter({hasText:'REPORT AN ISSUE'}).click();assert.ok(await page.locator('#reportOverlay').isVisible());
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.locator('#reportOverlay').evaluate(el=>el.scrollWidth<=el.clientWidth));
  await page.locator('#reportType').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'NEW GAME');
  await page.locator('#reportOverlay').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:path.join(root,'outputs/report-mobile.png')});
  await page.setViewportSize({width:1100,height:1100});await page.locator('#reportOverlay').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(root,'outputs/report-desktop.png')});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
