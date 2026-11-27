const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
test('browser spelling flow, confirmation, position privacy, duplicates, scoring and mobile',async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  for(const mobile of [false,true]){
   const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1100,height:900},isMobile:mobile,hasTouch:mobile});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{window.PAGE302_RELEASES_ENABLED=false;window.PAGE302_FUZZY_NAMES_ENABLED=true;window.PAGE302_SCORES_API=location.origin;});
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.pathname.startsWith('/api/'))return route.fulfill({status:404,json:{}});
    if(u.pathname==='/data/vggfax-manifest.json')return route.fulfill({json:{packs:['002']}});
    if(u.hostname!=='page302.test')return route.abort();
    const file=path.resolve(root,u.pathname.slice(1)||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();
    return route.fulfill({body:fs.readFileSync(file),contentType:({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'});
   });
   await page.goto('http://page302.test/');await page.waitForFunction(()=>progressReady&&clubPool.length===11);
   assert.equal(await page.locator('#buildLabel').textContent(),'v4.1.25_002');
   // Controlled eligible club-season fixture, using the real submission and scoring engine.
   await page.evaluate(()=>{
    const record=(id,fullname,surname,positions)=>({id,fullname,surname,positions,appearances:30,aliases:[fullname,surname]});
    clubPool[0].squad=[record('lj','Freddie Ljungberg','Ljungberg',['MD']),record('gn','Gary Neville','Neville',['DF']),record('pn','Phil Neville','Neville',['DF']),record('gs','Gilberto Silva','Gilberto Silva',['MD'])];
   });
   const submit=async(name,pos)=>{
    await page.evaluate(pos=>{clearPendingAnswer();selectedTeamClub=clubPool[0].clubCode.slice(0,3);selectedTeamSlot=squad.findIndex(s=>s===pos+'  --------');drawSquad();drawClubTitle();},pos);
    await page.locator('#answer').fill(name);await page.locator('#answer').press('Enter');
   };
   const status=()=>page.locator('#result').textContent();
   await submit('Ljunburg','DF');assert.equal(await status(),'CLOSE — TRY ANOTHER POSITION');
   assert.equal(await page.locator('#answerChoices').textContent(),'');assert.equal(await page.evaluate(()=>pendingAnswer),null);
   fs.mkdirSync(path.join(root,'outputs/fuzzy-review'),{recursive:true});
   await page.locator('.inputArea').screenshot({path:path.join(root,'outputs/fuzzy-review/wrong-position-'+(mobile?'mobile':'desktop')+'.png')});
   await submit('Ljungber','DF');assert.equal(await status(),'TRY ANOTHER POSITION');
   await submit('Ljunburg','MD');assert.equal(await status(),'DID YOU MEAN?');assert.deepEqual(await page.locator('.answerChoice').allTextContents(),['LJUNGBERG']);
   await page.locator('.inputArea').screenshot({path:path.join(root,'outputs/fuzzy-review/suggestion-'+(mobile?'mobile':'desktop')+'.png')});
   const guesses=await page.evaluate(()=>currentGame.totalGuesses);
   assert.equal(await page.locator('.answerChoice').evaluate(b=>b===document.activeElement),true);
   await page.keyboard.press('Enter');assert.match(await status(),/CORRECT/);
   assert.equal(await page.evaluate(()=>currentGame.totalGuesses),guesses);
   assert.equal(await page.evaluate(()=>Object.values(squadDisplay).filter(p=>p.name==='Freddie Ljungberg').length),1);
   await submit('Ljunburg','MD');await page.locator('.answerChoice').click();assert.match(await status(),/ALREADY USED/);
   await submit('Nevill','DF');assert.deepEqual(await page.locator('.answerChoice').allTextContents(),['NEVILLE']);
   await page.keyboard.press('Enter');assert.deepEqual(await page.locator('.answerChoice').allTextContents(),['GARY NEVILLE','PHIL NEVILLE']);
   await page.keyboard.press('Tab');await page.keyboard.press('Enter');assert.match(await status(),/CORRECT/);
   await submit('Gilberto Silvo','MD');assert.match(await status(),/CORRECT/);assert.equal(await page.locator('.answerChoice').count(),0);
   await submit('NEV','DF');assert.match(await status(),/NOT FOUND/);
   await submit('Ljunburg','MD');await page.evaluate(()=>currentGame.gameOver=true);await page.locator('.answerChoice').click();assert.equal(await status(),'DID YOU MEAN?');
   assert.deepEqual(errors,[]);await page.close();
  }
 }finally{await browser.close();}
});
