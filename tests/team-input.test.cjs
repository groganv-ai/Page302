const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {ScoreStore}=require('../backend/store.cjs');
test('selection input preserves exact rows, recovery, retries, complete scoring and submission',async()=>{
 const root=path.resolve(__dirname,'..'),store=new ScoreStore();
 store.addPack({id:'003',formation:'5-4-1',revision:'test',opensAt:'2020-01-01T00:00Z',closesAt:'2099-01-01T00:00Z'});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>window.PAGE302_SCORES_API='http://page302.test');
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/data/vggfax-manifest.json')return route.fulfill({json:{packs:['003']}});if(url.hostname!=='page302.test')return route.abort();
   if(url.pathname==='/api/submissions'){
    try{return route.fulfill({json:store.submit(route.request().postDataJSON())});}
    catch(e){return route.fulfill({status:e.status||500,json:{error:e.message}});}
   }
   if(url.pathname.startsWith('/api/standing/'))return route.fulfill({json:{topPercent:10,final:false}});
   if(url.pathname==='/api/challenges/003'){
    const deadline=new Date();deadline.setUTCHours(24,0,0,0);
    return route.fulfill({json:{packId:'003',serverTime:new Date().toISOString(),opensAt:'2020-01-01T00:00Z',closesAt:deadline.toISOString(),status:'open'}});
   }
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:404,json:{error:'Not found'}});
   const file=path.resolve(root,url.pathname.slice(1)||'index.html');
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf'};
   return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
  });
  const ready=()=>page.waitForFunction(()=>progressReady&&clubPool.length===11&&document.querySelector('.clubPick'));
  await page.addInitScript(() => window.PAGE302_RELEASES_ENABLED = false);
        await page.goto('http://page302.test/');await ready();await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('#buildLabel').textContent(),'v4.1.08_002');
  assert.ok((await page.locator('.clubPick').evaluateAll(rows=>rows.map(row=>getComputedStyle(row).color))).every(colour=>colour==='rgb(255, 255, 255)'));
  assert.ok((await page.locator('.clubPick .pickLabel').allTextContents()).every(label=>!/[+x]0/.test(label)));
  const stats=()=>page.evaluate(()=>({score:currentGame.score,guesses:currentGame.totalGuesses,answers:squadDisplay,squad,usage:clubUsage}));
  const selected=()=>page.locator('.mainLayout [aria-pressed="true"]').count();
  const position=slot=>page.locator('.positionPick[data-slot="'+slot+'"]');
  const club=code=>page.locator('.clubPick[data-club="'+code+'"]');
  const submit=async surname=>{await page.locator('#answer').fill(surname);await page.locator('#answer').press('Enter');};
  assert.equal(await page.locator('#answer').isEnabled(),true);
  await submit('GK CECH CHE');assert.equal((await stats()).guesses,0);
  await club('CHE').click();assert.equal(await page.locator('.selectionHint').textContent(),'SELECT A POSITION > ENTER A SURNAME');
  assert.match(await page.locator('.inputContext').textContent(),/Chelsea 13-14/);
  fs.mkdirSync(path.join(root,'outputs'),{recursive:true});
  await page.locator('.inputArea').screenshot({path:path.join(root,'outputs','v4.1.03-selection.png')});
  await club('CHE').click();assert.equal(await selected(),0);
  const df=await page.evaluate(()=>squad.findIndex(line=>line.startsWith('DF'))+3);
  await position(df).click();await position(df).click();assert.equal(await selected(),0);
  await position(df).click();await club('CHE').click();
  assert.equal(await page.locator('#answer').evaluate(el=>el===document.activeElement),true);
  assert.equal(await page.locator('.selectionHint').textContent(),'ENTER A SURNAME');
  await submit('');assert.equal((await stats()).guesses,0);
  await submit('CECH');assert.match(await page.locator('#lastAnswer').textContent(),/TRY ANOTHER POSITION/);
  assert.equal((await stats()).guesses,1);assert.equal(await selected(),2);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await submit('TERRY');let state=await stats();assert.equal(state.answers[df].name,'John Terry');assert.equal(state.answers[1],undefined);assert.match(await club('CHE').textContent(),/\(1\)/);
  assert.equal(await position(df).locator('.pickLabel').evaluate(el=>getComputedStyle(el).animationName),'vidiReveal');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await position(df).locator('.pickLabel').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await selected(),0);assert.equal(await position(df).isDisabled(),true);
  assert.equal(await position(df).locator('.pickLabel').evaluate(el=>getComputedStyle(el).fontWeight),'700');
  assert.equal(await club('CHE').locator('.pickLabel').evaluate(el=>getComputedStyle(el).fontWeight),'700');
  assert.equal(await page.locator('#lastAnswer').isVisible(),true);assert.equal(await page.locator('#lastAnswer .feedbackPoints').textContent(),'+'+state.answers[df].score.toLocaleString('en-GB')+' POINTS');
  await club('CHE').click();assert.equal(await page.locator('#lastAnswer').isVisible(),false);
  await page.reload();await ready();assert.deepEqual(await stats(),state);
  assert.equal(await page.locator('.vidiReveal').count(),0);
  // Legacy saved records without row metadata still recover in their original order.
  await page.evaluate(()=>{window.removeEventListener('pagehide',saveGameProgress);const record=JSON.parse(localStorage.getItem(progressKey()));record.picks.forEach(p=>delete p.slot);localStorage.setItem(progressKey(),JSON.stringify(record));});
  await page.reload();await ready();assert.equal((await stats()).answers[1].name,'John Terry');
  await page.evaluate(()=>{window.removeEventListener('pagehide',saveGameProgress);localStorage.clear();});
  await page.reload();await ready();
  // Complete the actual formation, including a multi-club player and manager.
  const slots=await page.evaluate(()=>squad.map((line,slot)=>line?{slot,position:line.split(' ')[0]}:null).filter(Boolean));
  for(const item of slots){
   const pick=await page.evaluate(({position,slot})=>{
    const rotated=[...clubPool.slice(slot%clubPool.length),...clubPool.slice(0,slot%clubPool.length)];
    if(position==='GK')rotated.sort((a,b)=>Number(b.clubCode.startsWith('CHE'))-Number(a.clubCode.startsWith('CHE')));
    for(const c of rotated){const p=c.squad.find(p=>p.positions.includes(position)&&!playerAlreadyUsed(p)&&(position!=='GK'||/ech/i.test(p.surname)));if(p)return {club:c.clubCode.slice(0,3),surname:p.surname,name:p.fullname};}
   },item);
   await club(pick.club).click();await position(item.slot).click();await submit(pick.surname);
   const choices=page.locator('.answerChoice');
   if(await choices.count())await page.getByRole('button',{name:pick.name.toUpperCase(),exact:true}).click();
   assert.equal((await stats()).answers[item.slot].name,pick.name);
  }
  await page.waitForFunction(()=>currentGame.gameOver);
  const complete=await stats();assert.equal(Object.keys(complete.answers).length,12);assert.equal(complete.guesses,12);
  assert.ok(Object.values(complete.answers).some(a=>a.clubs.length>1));
  assert.equal(complete.score,Object.values(complete.answers).reduce((sum,a)=>sum+a.score,0));
  assert.equal(await page.locator('label[for="scoreInitials"]').textContent(),'ENTER 3 LETTERS TO SUBMIT YOUR SCORE');
  await page.locator('#scoreInitials').fill('TST');await page.locator('#submitScoreButton').click();
  await page.waitForFunction(()=>scoreAttempt?.saved);
  assert.equal(await page.locator('label[for="scoreInitials"]').textContent(),'SAVE THIS CODE AND COME BACK TOMORROW TO FIND YOUR SCORE');
  const shared=await page.evaluate(async()=>{
   let text;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{text=value;}}});
   await shareResult();return text;
  });
  const expectedRows=Object.values(complete.answers).map(answer=>{
   const clubEmoji=['','🟪','🟦','🟩','🟨','⬜'][answer.clubTier];
   const rarityEmoji={UNI:'🟪',SUB:'🟦',UTL:'🟩',ENG:'🟨',LEG:'⬜'}[answer.rarity];
   return (answer.position==='MAN'?'MN':answer.position)+' '+(answer.isManager?'':clubEmoji)+rarityEmoji+(answer.clubs.length>1?' ×'+answer.clubs.length:'');
  });
  assert.equal(shared,'CAN YOU BEAT MY PAGE302 SCORE?\nSCORE: '+complete.score+'\n\n'+expectedRows.join('\n')+'\n\nPAGE302 / GAME #003:\nhttps://groganv-ai.github.io/Page302/');
  assert.equal(store.db.prepare('SELECT count(*) n FROM submissions').get().n,1);
  assert.equal(store.db.prepare('SELECT score FROM submissions').get().score,complete.score);
  assert.match(await page.locator('#currentStanding').textContent(),/TOP 10%/);
  await page.screenshot({path:path.join(root,'outputs','v4.1.03-saved-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.locator('#gameCompleteWindow').evaluate(el=>el.scrollWidth<=el.clientWidth));
  await page.locator('#scoreSubmissionForm').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(root,'outputs','v4.1.03-saved-mobile.png'),fullPage:true});
  await page.evaluate(()=>closeCompleteGame());
  for(const width of [1100,925,850,700,430,390,360]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(80);
   const layout=await page.evaluate(()=>{
    const rows=[...document.querySelectorAll('.clubPick,.positionPick')];
    return {width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
     rows:rows.map(row=>{const label=row.querySelector('.pickLabel'),dashes=row.querySelectorAll('.pickDashes');return {single:getComputedStyle(label).whiteSpace==='nowrap',equal:dashes[0].textContent===dashes[1].textContent,fits:label.getBoundingClientRect().width<=row.clientWidth,whole:[...dashes].every(d=>d.scrollWidth<=d.clientWidth)};}),
     hintsBelow:document.querySelector(innerWidth<=700?'.legendRowMobile':'.legendRowDesktop').getBoundingClientRect().top>=document.querySelector('.answerRow').getBoundingClientRect().bottom,
     order:[...document.querySelector(innerWidth<=700?'.legendRowMobile':'.legendRowDesktop').children].map(p=>p.querySelector('.legendTitle').textContent.trim())};
   });
   if(layout.scroll!==layout.width)console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>document.documentElement.clientWidth).slice(0,12).map(e=>({tag:e.tagName,id:e.id,class:e.className,right:e.getBoundingClientRect().right,text:e.textContent.slice(0,55)}))));
   assert.equal(layout.scroll,layout.width,'page overflow at '+width);
   assert.ok(layout.rows.every(row=>row.single&&row.equal&&row.fits&&row.whole),'row fit at '+width);
   assert.ok(layout.hintsBelow,'hints below answer at '+width);
   assert.deepEqual(layout.order,width<=700?['PLAYER RARITY','CLUB USAGE']:['CLUB USAGE','PLAYER RARITY']);
   if(width===1100||width===390){
    fs.mkdirSync(path.join(root,'outputs'),{recursive:true});
    await page.screenshot({path:path.join(root,'outputs','v4.1.2-full-team-'+width+'.png'),fullPage:true});
   }
  }
  assert.deepEqual(errors,[]);
  console.log('New selection flow: exact slots, legacy/new recovery, correct/error behaviour, full team, scoring, submission and seven responsive widths passed.');
 }finally{await browser.close();store.close();}
});
