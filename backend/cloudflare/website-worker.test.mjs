import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair, SignJWT} from 'jose';
import worker, {authorize, serve} from './website-worker.mjs';
import fs from 'node:fs';
import vm from 'node:vm';

const env = {ACCESS_TEAM_DOMAIN: 'https://test.cloudflareaccess.com', ACCESS_AUD: 'test-audience', TESTER_EMAIL: 'tester@example.com'};
const {privateKey, publicKey} = await generateKeyPair('RS256');
async function signed(email = env.TESTER_EMAIL, aud = env.ACCESS_AUD, expiry = '1h', key = privateKey) {
    return new SignJWT({email}).setProtectedHeader({alg: 'RS256'}).setIssuer(env.ACCESS_TEAM_DOMAIN)
        .setAudience(aud).setIssuedAt().setExpirationTime(expiry).sign(key);
}
const request = token => new Request('https://page302.co.uk/data/vggfax002.json', {headers: token ? {'Cf-Access-Jwt-Assertion': token} : {}});
test('private site denies absent configuration and unsigned identity headers', async () => {
    let called = false;
    const result = await worker.fetch(new Request('https://page302.co.uk/', {headers: {'Cf-Access-Authenticated-User-Email': env.TESTER_EMAIL}}), {
        ASSETS: {fetch() { called = true; }}
    });
    assert.equal(result.status, 403); assert.equal(called, false);
    assert.equal(await authorize(request(), env, publicKey), false);
});
test('only correctly signed, current tokens for the intended audience and tester pass', async () => {
    assert.equal(await authorize(request(await signed()), env, publicKey), true);
    for (const token of [await signed('other@example.com'), await signed(env.TESTER_EMAIL, 'other'), await signed(env.TESTER_EMAIL, env.ACCESS_AUD, '-1h'), 'forged']) {
        assert.equal(await authorize(request(token), env, publicKey), false);
    }
    const other = await generateKeyPair('RS256');
    assert.equal(await authorize(request(await signed(env.TESTER_EMAIL, env.ACCESS_AUD, '1h', other.privateKey)), env, publicKey), false);
});
test('aliases preserve path and query and unknown hostnames cannot serve assets', async () => {
    for (const host of ['page302.uk', 'www.page302.uk', 'www.page302.co.uk']) {
        const res = await serve(new Request(`https://${host}/privacy.html?a=1`), {});
        assert.equal(res.status, 308); assert.equal(res.headers.get('Location'), 'https://page302.co.uk/privacy.html?a=1');
    }
    assert.equal((await serve(new Request('https://unexpected.workers.dev/'), {})).status, 404);
});
test('API has no live fallback and preserves requests to its explicit binding', async () => {
    const req = new Request('https://page302.co.uk/api/submissions', {method: 'POST', body: '{}'});
    assert.equal((await serve(req, {})).status, 503);
    let received;
    const res = await serve(req, {SCORES: {fetch(r) {received = r; return new Response('test result');}}});
    assert.equal(received, req); assert.equal(await res.text(), 'test result');
});
test('browser config selects root API on domains and isolated API on GitHub subpath', () => {
    const code = fs.readFileSync(new URL('../../site-config.js', import.meta.url), 'utf8');
    for (const [url, expected] of [
        ['https://page302.co.uk/', 'https://page302.co.uk'],
        ['https://groganv-ai.github.io/Page302/', 'https://page302-scores-testing.vince-grogan-games.workers.dev'],
        ['http://localhost:8080/', 'http://127.0.0.1:8787']
    ]) {
        const context = {window: {}, location: new URL(url)}; vm.runInNewContext(code, context);
        assert.equal(context.window.PAGE302_SCORES_API, expected);
    }
});
