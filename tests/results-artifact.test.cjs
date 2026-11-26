const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
test('published preview completes and reopens a full team',async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync('outputs/keyboard-review/page302-keyboard-review.html','utf8')}));
  await page.goto('http://page302.test/');
  await page.waitForFunction(()=>clubPool.length===11);
  assert.equal(await page.locator('.footerBar > *').count(),4);
  assert.equal(await page.locator('.footerBar .footerResultToggle').textContent(),'ABOUT');
  await page.evaluate(()=>{currentGame.totalGuesses=1;currentGame.score=25;});
  await page.locator('.footerNewGame').click();
  assert.equal(await page.locator('#newGameMessage').textContent(),'Are you sure you want to start a new game? Your current score will be reset!');
  await page.locator('#cancelNewGame').click();
  assert.equal(await page.evaluate(()=>currentGame.score),25);
  await page.evaluate(()=>{
   for(let slot=0;slot<squad.length;slot++){
    if(!squad[slot])continue;
    const pos=squad[slot].split(' ')[0];
    for(const club of clubPool){
     const player=club.squad.find(p=>p.positions.includes(pos)&&!playerAlreadyUsed(p));
     if(player){answerTargetSlot=slot;applyAnswer(player,pos,club.clubCode.slice(0,3),'',player.surname,true);break;}
    }
   }
  });
  await page.waitForFunction(()=>currentGame.gameOver);
  await page.locator('#gameCompleteOverlay .completeDismiss').click();
  console.log('state',await page.evaluate(()=>({gameComplete,over:currentGame.gameOver,attempt:!!scoreAttempt,button:document.getElementById('reopenResults')?.outerHTML})),errors);
  assert.deepEqual(errors,[]);
  assert.equal(await page.locator('#reopenResults').isVisible(),true);
  assert.equal(await page.locator('.footerBar > *').count(),4);
  assert.equal(await page.locator('.footerBar > #reopenResults').count(),1);
  assert.equal(await page.locator('#reopenResults').evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 0)');
  await page.locator('#reopenResults').screenshot({path:'.local/results-button.png'});
  await page.locator('#reopenResults').click();
  assert.equal(await page.locator('#gameCompleteOverlay').isVisible(),true);
  const original=await page.evaluate(()=>JSON.stringify(scoreAttempt));
  await page.getByRole('button',{name:'PLAY AGAIN',exact:true}).click();
  assert.equal(await page.locator('#newGameMessage').textContent(),'Are you sure you want to start a new game? Your previous results have not been submitted and your score will be reset!');
  await page.setViewportSize({width:390,height:844});
  const bounds=await page.locator('#newGameDialog').boundingBox();
  assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
  await page.locator('#newGameDialog').screenshot({path:'.local/new-game-dialog.png'});
  await page.locator('#newGameDialog').press('Escape');
  assert.equal(await page.evaluate(()=>JSON.stringify(scoreAttempt)),original);
  assert.equal(await page.locator('#gameCompleteOverlay').isVisible(),true);
  await page.evaluate(()=>scoreAttempt.saved=true);
  await page.getByRole('button',{name:'PLAY AGAIN',exact:true}).click();
  assert.equal(await page.locator('#newGameMessage').textContent(),'Are you sure you want to start a new game?');
  await page.locator('#confirmNewGame').click();
  await page.waitForFunction(()=>!currentGame.gameOver&&currentGame.score===0&&scoreAttempt===null);
  assert.equal(await page.locator('.footerBar > *').count(),4);
  assert.equal(await page.locator('#footerAboutButton').textContent(),'ABOUT');
 }finally{await browser.close();}
});
