const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

test('domain root and GitHub subpath load assets and display the reviewed build',async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  for(const base of ['https://page302.co.uk/','https://groganv-ai.github.io/Page302/']){
   const page=await browser.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const root=path.resolve(__dirname,'..','.pages-dist');
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'Test service unavailable'}});
    if(!url.href.startsWith(base))return route.abort();
    const relative=url.pathname.slice(new URL(base).pathname.length)||'index.html';
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml'};
    return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
   });
   await page.goto(base);
   await page.waitForFunction(()=>document.getElementById('buildLabel')?.textContent==='v4.1.23_002');
   assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://page302.co.uk/');
   assert.equal(await page.evaluate(()=>window.PAGE302_SCORES_API),base.includes('github.io')?'https://page302-scores-testing.vince-grogan-games.workers.dev':'https://page302.co.uk');
   assert.deepEqual(errors,[]);await page.close();
  }
 }finally{await browser.close();}
});
