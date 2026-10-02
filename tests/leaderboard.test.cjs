const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');const {ScoreStore}=require('../backend/store.cjs');const {seedReview}=require('../backend/seed-review.cjs');
test('real pack 002 squads, leaderboard search, detail and permanent link while 003 active',async()=>{
 const store=new ScoreStore();const snapshot=seedReview(store);assert.equal(snapshot.totalSubmissions,10);
 const pack=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/vggfax002.json'),'utf8'));
 for(const r of snapshot.results){assert.equal(r.answers.length,12);assert.equal(r.score,r.answers.reduce((s,a)=>s+a.contributions.reduce((n,c)=>n+c.points,0),0));for(const a of r.answers)for(const c of a.contributions)assert.ok(pack.clubs.some(club=>club.squad.some(p=>p.id===c.recordId&&p.fullname===a.name)));}
 const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL||'msedge'});
 try{const page=await browser.newPage({viewport:{width:1100,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.PAGE302_SCORES_API='http://page302.test');const root=path.resolve(__dirname,'..');
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname!=='page302.test')return route.abort();
 if(url.pathname==='/api/results/latest')return route.fulfill({json:store.latest()});
 if(url.pathname.startsWith('/api/results/'))return route.fulfill({json:store.find(url.pathname.split('/').pop(),{initials:url.searchParams.get('initials'),reference:url.searchParams.get('reference')})});
 const file=path.resolve(root,url.pathname.slice(1)||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.abort();const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png'};return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});});
 await page.goto('http://page302.test');await page.waitForFunction(()=>clubPool?.length===11);assert.equal(await page.evaluate(()=>currentVggfax),'003');
 await page.locator('.footerScores').click();await page.waitForFunction(()=>document.querySelectorAll('#leaderboardRows tr').length===10);
 assert.match(await page.locator('#resultFormation').textContent(),/4-3-3/);assert.equal(await page.locator('#resultClubs li').count(),11);
 assert.equal(await page.locator('#resultPrevious').isVisible(),false);assert.equal(await page.locator('#resultNext').isVisible(),false);
 await page.evaluate(()=>{resultRows=[...publishedPack.results,...publishedPack.results];renderLeaderboard()});
 assert.equal(await page.locator('#resultPrevious').isVisible(),false);assert.equal(await page.locator('#resultNext').isVisible(),true);
 await page.locator('#resultNext').click();assert.equal(await page.locator('#resultPages').textContent(),'2/2');assert.equal(await page.locator('#resultNext').isVisible(),false);assert.equal(await page.locator('#resultPrevious').isVisible(),true);
 await page.locator('#resultPrevious').click();await page.locator('#resultTop').click();
 assert.equal(await page.locator('#leaderboardRows tr').first().evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');assert.equal(await page.locator('#leaderboardRows tr').nth(1).evaluate(el=>getComputedStyle(el).color),'rgb(0, 255, 255)');
 await page.locator('#leaderboardRows button').first().click();assert.equal(await page.locator('.closedAnswer').count(),12);assert.ok((await page.locator('#closedResult').textContent()).includes(snapshot.results[0].answers[0].name));
 await page.locator('#resultInitials').fill('VGG');await page.getByRole('button',{name:'FIND SCORE'}).click();await page.waitForFunction(()=>document.querySelectorAll('#leaderboardRows tr').length===2);
 await page.locator('.resultsFooter').getByRole('button',{name:'BACK',exact:true}).click();assert.equal(await page.locator('#leaderboardRows tr').count(),10);
 assert.deepEqual(await page.locator('.resultsFooter button').allTextContents(),['BACK','HELP','ABOUT','NEW GAME']);
 await page.locator('.resultsFooter .helpFooterHelp').hover();await page.waitForTimeout(150);assert.equal(await page.locator('.resultsFooter .helpFooterHelp').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 255, 0)');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.wideCubes').first().isVisible(),false);
 await page.locator('#leaderboardRows button').first().click();const bounds=await page.locator('#closedResult').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
 await page.screenshot({path:path.join(root,'outputs/leaderboard-mobile-review.png'),fullPage:true});
 const r=snapshot.results[0];await page.goto('http://page302.test/?resultPack=002&resultRef='+r.reference);await page.waitForFunction(()=>document.querySelectorAll('.closedAnswer').length===12);assert.match(await page.locator('.closedMetrics').textContent(),/RANK #1/);
 await page.setViewportSize({width:1100,height:900});await page.screenshot({path:path.join(root,'outputs/closed-result-desktop-review.png'),fullPage:true});assert.deepEqual(errors,[]);
 }finally{await browser.close();store.close()}
});


