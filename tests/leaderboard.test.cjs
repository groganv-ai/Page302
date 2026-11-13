const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');const {ScoreStore}=require('../backend/store.cjs');const {seedReview}=require('../backend/seed-review.cjs');
test('real pack 002 squads, leaderboard search, detail and permanent link while 003 active',async()=>{
 const store=new ScoreStore();const snapshot=seedReview(store);assert.equal(snapshot.totalSubmissions,10);
 const pack=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/vggfax002.json'),'utf8'));
 for(const r of snapshot.results){assert.equal(r.answers.length,12);assert.equal(r.score,r.answers.reduce((s,a)=>s+a.contributions.reduce((n,c)=>n+c.points,0),0));for(const a of r.answers)for(const c of a.contributions)assert.ok(pack.clubs.some(club=>club.squad.some(p=>p.id===c.recordId&&p.fullname===a.name)));}
 const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL||'msedge'});
 try{const page=await browser.newPage({viewport:{width:1100,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.PAGE302_SCORES_API='http://page302.test');const root=path.resolve(__dirname,'..');
 await page.route('**/*',route=>{const url=new URL(route.request().url());
   if(url.pathname==='/data/vggfax-manifest.json')return route.fulfill({json:{packs:['003']}});if(url.hostname!=='page302.test')return route.abort();
 if(url.pathname==='/api/results/latest')return route.fulfill({json:store.latest()});
 if(url.pathname.startsWith('/api/results/'))return route.fulfill({json:store.find(url.pathname.split('/').pop(),{initials:url.searchParams.get('initials'),reference:url.searchParams.get('reference')})});
 const file=path.resolve(root,url.pathname.slice(1)||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml'};return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});});
 await page.addInitScript(() => window.PAGE302_RELEASES_ENABLED = false);
        await page.goto('http://page302.test');await page.waitForFunction(()=>clubPool?.length===11);assert.equal(await page.evaluate(()=>currentVggfax),'003');
 await page.locator('.footerScores').click();await page.waitForFunction(()=>document.querySelectorAll('#leaderboardRows tr').length===10);
 assert.match(await page.locator('#resultFormation').textContent(),/4-3-3/);assert.equal(await page.locator('#resultClubs li').count(),11);
 assert.equal(await page.locator('#resultClubDetails').getAttribute('open'),null);
 await page.locator('#resultClubDetails summary').click();assert.equal(await page.locator('#resultClubs').isVisible(),true);

 assert.ok(!(await page.locator('#leaderboard').textContent()).includes(snapshot.results[0].reference));
 assert.equal(await page.locator('#rarestAward').isVisible(),true);
 await page.locator('#resultRarity').click();assert.match(await page.locator('#resultRarity').textContent(),/RARITY/);
 assert.ok(await page.evaluate(()=>resultRows.every((r,i)=>!i||r.rarityScore>=resultRows[i-1].rarityScore)));
 await page.locator('#resultRarity').click();assert.ok(await page.evaluate(()=>resultRows.every((r,i)=>!i||r.rarityScore<=resultRows[i-1].rarityScore)));await page.locator('#resultScore').click();
 assert.equal(await page.evaluate(()=>APP_BUILD),'v4.1.08_002');
 assert.equal(await page.locator('#resultPrevious').isVisible(),false);assert.equal(await page.locator('#resultNext').isVisible(),false);
 await page.evaluate(()=>{resultRows=[...publishedPack.results,...publishedPack.results];renderLeaderboard()});
 assert.equal(await page.locator('#resultPrevious').isVisible(),false);assert.equal(await page.locator('#resultNext').isVisible(),true);assert.equal(await page.locator('#leaderboardRows tr').count(),15);
 await page.locator('#resultNext').click();assert.equal(await page.locator('#resultPages').textContent(),'2/2');assert.equal(await page.locator('#resultNext').isVisible(),false);assert.equal(await page.locator('#resultPrevious').isVisible(),true);
 await page.locator('#resultPrevious').click();await page.evaluate(()=>restoreFullLeaderboard());
 assert.equal(await page.locator('#leaderboardRows tr').first().evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');assert.equal(await page.locator('#leaderboardRows tr').nth(1).evaluate(el=>getComputedStyle(el).color),'rgb(0, 255, 255)');
 await page.locator('#leaderboardRows button').first().click();assert.equal(await page.locator('.closedAnswer').count(),12);assert.ok((await page.locator('#closedResult').textContent()).includes(snapshot.results[0].answers[0].name));
 await page.locator('#resultReference').fill(snapshot.results[0].reference);await page.getByRole('button',{name:'SEARCH'}).click();await page.waitForFunction(()=>document.querySelectorAll('#leaderboardRows tr').length===1);
 await page.locator('#resultReference').fill('');await page.getByRole('button',{name:'SEARCH',exact:true}).click();assert.equal(await page.locator('#leaderboardRows tr').count(),10);
 await page.locator('#resultReference').fill(snapshot.results[0].reference);await page.getByRole('button',{name:'SEARCH'}).click();
 assert.equal(await page.locator('#leaderboardRows tr').count(),1);
 await page.locator('#resultReference').fill('');await page.getByRole('button',{name:'SEARCH',exact:true}).click();
 assert.deepEqual(await page.locator('.resultsFooter button').allTextContents(),['BACK','HELP','ABOUT','NEW GAME']);
 await page.locator('.resultsFooter .helpFooterHelp').hover();await page.waitForTimeout(150);assert.equal(await page.locator('.resultsFooter .helpFooterHelp').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 255, 0)');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.wideCubes').first().isVisible(),false);
 await page.locator('#leaderboardRows button').first().click();const bounds=await page.locator('#closedResult').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
 await page.locator('#closedResult .closedActions button').last().click();
 await page.evaluate(()=>{document.getElementById('resultClubDetails').open=false;document.getElementById('scoresOverlay').scrollTop=0;});
 assert.ok(await page.locator('#scoresOverlay').evaluate(el=>el.scrollWidth<=el.clientWidth));
 await page.screenshot({path:path.join(root,'outputs/leaderboard-mobile-review.png')});
 await page.setViewportSize({width:1100,height:900});await page.screenshot({path:path.join(root,'outputs/leaderboard-desktop-review.png')});
 await page.locator('#resultClubDetails summary').click();
 const headingX=await page.locator('.resultTeamHeading').evaluate(el=>el.getBoundingClientRect().left);
 const blockX=await page.locator('#leaderboardRows .resultCube').first().evaluate(el=>el.getBoundingClientRect().left);
 assert.ok(Math.abs(headingX-blockX)<1);
 await page.setViewportSize({width:1100,height:1250});await page.screenshot({path:path.join(root,'outputs/leaderboard-desktop-expanded-review.png')});

 const r=snapshot.results[0];await page.addInitScript(() => window.PAGE302_RELEASES_ENABLED = false);
        await page.goto('http://page302.test/?resultPack=002&resultRef='+r.reference);await page.waitForFunction(()=>document.querySelectorAll('.closedAnswer').length===12);assert.match(await page.locator('.closedMetrics').textContent(),/RANK #1/);
 await page.setViewportSize({width:1100,height:900});await page.screenshot({path:path.join(root,'outputs/closed-result-desktop-review.png'),fullPage:true});assert.deepEqual(errors,[]);
 }finally{await browser.close();store.close()}
});


