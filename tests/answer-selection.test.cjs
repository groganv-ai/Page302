const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || undefined });
    try {
        const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('dialog', dialog => dialog.accept());
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'page302.test') return route.abort();
            const relative = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
            const file = path.resolve(root, relative);
            if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.abort();
            const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png' };
            return route.fulfill({ body: fs.readFileSync(file), contentType: types[path.extname(file)] || 'application/octet-stream' });
        });
        await page.goto('http://page302.test/');
        await page.waitForFunction(() => clubPool.length === 11 && document.querySelector('#squadBoard').textContent.indexOf('Loading') === -1);
        async function reset(pack = '003', formation = '4-4-2') {
            await page.evaluate(async ({ pack, formation }) => {
                clearPendingAnswer();
                currentVggfax = pack;
                await loadClub();
                currentGame = { totalGuesses: 0, formation, score: 0, gameOver: false };
                usedPeople = new Set(); clubUsage = {}; squadDisplay = {};
                buildSquad(); refreshScreen(); setStatus('ENTER ANSWER');
            }, { pack, formation });
        }
        async function submit(value) {
            await page.locator('#answer').fill(value);
            await page.locator('#answer').press('Enter');
        }
        const status = () => page.locator('#result').textContent();
        const stats = () => page.evaluate(() => ({ guesses: currentGame.totalGuesses, score: currentGame.score, used: usedPeople.size, ful: clubUsage.FUL || 0 }));

        await reset();
        await submit('AT JOHNSON FUL');
        assert.equal(await page.locator('.answerChoice').count(), 2);
        assert.deepEqual(await stats(), { guesses: 1, score: 0, used: 0, ful: 0 });
        await page.locator('.answerButton').click();
        assert.equal((await stats()).guesses, 1);
        await page.getByRole('button', { name: 'ANDREW JOHNSON', exact: true }).click();
        assert.equal(await status(), 'AT ANDREW JOHNSON FUL - CORRECT');
        assert.equal(await page.locator('#result').evaluate(el => getComputedStyle(el).color), 'rgb(0, 255, 0)');
        await submit('AT JOHNSON FUL');
        assert.equal(await page.getByRole('button', { name: /ANDREW JOHNSON/ }).isDisabled(), true);
        await page.getByRole('button', { name: 'EDDIE JOHNSON', exact: true }).click();
        assert.equal(await status(), 'AT EDDIE JOHNSON FUL - CORRECT');
        assert.equal((await stats()).guesses, 2);
        assert.equal((await stats()).used, 2);
        assert.equal((await stats()).ful, 2);
        await submit('AT JOHNSON FUL');
        assert.equal(await page.locator('.answerChoice:disabled').count(), 2);
        await page.getByRole('button', { name: 'CANCEL', exact: true }).press('Escape');
        assert.equal(await page.locator('#answerChoices').isVisible(), false);

        await reset('003', '5-4-1');
        await submit('AT JOHNSON FUL');
        await page.getByRole('button', { name: 'ANDREW JOHNSON', exact: true }).click();
        const beforeFull = await stats();
        await submit('AT JOHNSON FUL');
        await page.getByRole('button', { name: 'EDDIE JOHNSON', exact: true }).click();
        assert.match(await status(), /POSITION FULL/);
        assert.equal((await stats()).score, beforeFull.score);
        assert.equal((await stats()).ful, 1);
        assert.equal(await page.locator('#result').evaluate(el => el.classList.contains('correctAnswer')), false);

        await reset();
        await submit('MD COOK BOU');
        assert.equal(await status(), 'MD COOK BOU - CORRECT');
        await submit('MN HUGHES FUL');
        assert.equal(await status(), 'MN HUGHES FUL - CORRECT');
        await submit('MD RONALDO MUN');
        assert.equal(await status(), 'MD RONALDO MUN - CORRECT');
        await submit('GK VAN DER SAR MUN');
        assert.equal(await status(), 'GK VAN DER SAR MUN - CORRECT');

        await reset();
        const helpBefore = await page.locator('#helpOverlay').innerHTML();
        await submit('AT RONLADO MUN');
        assert.equal(await status(), 'AT RONALDO MUN - CORRECT');
        assert.equal((await stats()).guesses, 1);
        const typoScore = (await stats()).score;
        await submit('AT RONADO MUN');
        assert.match(await status(), /ALREADY USED/);
        assert.equal((await stats()).score, typoScore);
        await reset();
        await submit('AT RONALDO MUN');
        assert.equal((await stats()).score, typoScore);
        await reset();
        await submit('MD GROSS BRI');
        assert.equal(await status(), 'MD GROSS BRI - CORRECT');
        await reset();
        await submit('DF VIDIC MUN');
        assert.equal(await status(), 'DF VIDIĆ MUN - CORRECT');
        await submit('MD O SHEA MUN');
        assert.equal(await status(), "MD O'SHEA MUN - CORRECT");
        await submit('MD JI SUNG MUN');
        assert.equal(await status(), 'MD JI-SUNG MUN - CORRECT');
        await submit('GK VIDIC MUN');
        assert.match(await status(), /TRY ANOTHER POSITION/);
        assert.equal(await page.locator('#helpOverlay').innerHTML(), helpBefore);
        await reset('001');
        await submit('DF NEVILE MUN');
        assert.equal(await page.locator('.answerChoice').count(), 2);
        await page.getByRole('button', { name: 'PHIL NEVILLE', exact: true }).click();
        assert.equal(await status(), 'DF PHIL NEVILLE MUN - CORRECT');
        assert.equal((await stats()).guesses, 1);

        for (const [pack, answer, names] of [
            ['001', 'DF NEVILLE MUN', ['Gary Neville', 'Phil Neville']],
            ['002', 'MD SILVA MCI', ['Bernardo Silva', 'David Silva']],
            ['002', 'DF YOUNG AVL', ['Ashley Young', 'Luke Young']]
        ]) {
            await reset(pack);
            await submit(answer);
            assert.deepEqual(await page.locator('.answerChoice').allTextContents(), names.map(n => n.toUpperCase()));
            await page.getByRole('button', { name: 'CANCEL', exact: true }).click();
            assert.equal((await stats()).used, 0);
        }

        await reset();
        await submit('AT JOHNSON FUL');
        const staleButton = await page.locator('.answerChoice').first().elementHandle();
        await page.locator('#answer').fill('MD COOK BOU');
        assert.equal(await page.locator('#answerChoices').isVisible(), false);
        await staleButton.evaluate(el => el.click());
        assert.equal((await stats()).used, 0);
        await submit('AT JOHNSON FUL');
        await page.evaluate(() => newGame());
        assert.equal(await page.locator('#answerChoices').isVisible(), false);
        assert.equal((await stats()).guesses, 0);

        await reset();
        await page.setViewportSize({ width: 375, height: 800 });
        await submit('AT JOHNSON FUL');
        const buttons = await page.locator('.answerChoice').evaluateAll(elements => elements.map(el => {
            const rect = el.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, right: rect.right, height: rect.height };
        }));
        assert.ok(buttons[1].top >= buttons[0].bottom);
        assert.ok(buttons.every(button => button.right <= 375 && button.height >= 44));
        await page.locator('.inputArea').screenshot({ path: path.join(root, 'outputs', 'answer-selection-mobile.png') });
        await page.setViewportSize({ width: 1100, height: 850 });
        await page.locator('.inputArea').screenshot({ path: path.join(root, 'outputs', 'answer-selection-desktop.png') });
        assert.deepEqual(errors, []);
        console.log('Answer selection, response formats, repeat use, formation limits, cancellation, pack changes and mobile layout passed.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
