import {createRemoteJWKSet, jwtVerify} from 'jose';

const hosts = new Set(['page302.co.uk', 'www.page302.co.uk', 'page302.uk', 'www.page302.uk']);
const deny = () => new Response('Private testing: sign-in required.', {
    status: 403, headers: {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'}
});

export async function authorize(request, env, keySet) {
    // Only an explicit reviewed launch setting makes this public.
    if (env.SITE_ACCESS === 'public') return true;
    if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.TESTER_EMAIL) return false;
    const issuer = env.ACCESS_TEAM_DOMAIN;
    if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)) return false;
    const token = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!token) return false;
    try {
        const {payload} = await jwtVerify(token, keySet || createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs')), {
            issuer, audience: env.ACCESS_AUD, algorithms: ['RS256'], requiredClaims: ['exp', 'email']
        });
        return payload.email === env.TESTER_EMAIL;
    } catch { return false; }
}

export async function serve(request, env) {
    const url = new URL(request.url);
    if (!hosts.has(url.hostname)) return new Response('Not found', {status: 404});
    if (url.hostname !== 'page302.co.uk' || url.protocol !== 'https:') {
        url.hostname = 'page302.co.uk'; url.protocol = 'https:'; url.port = '';
        return Response.redirect(url.toString(), 308);
    }
    if (url.pathname.startsWith('/api/')) {
        // No live service binding is installed until the approved cutover.
        if (!env.SCORES) return Response.json({error: 'Testing scores service is not configured yet.'}, {status: 503});
        return env.SCORES.fetch(request);
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status: 405});
    return env.ASSETS.fetch(request);
}

export default {
    async fetch(request, env) {
        if (!await authorize(request, env)) return deny();
        const response = await serve(request, env);
        const secured = new Response(response.body, response);
        secured.headers.set('X-Content-Type-Options', 'nosniff');
        secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        if (env.SITE_ACCESS !== 'public') {
            secured.headers.set('Cache-Control', 'private, no-store');
            secured.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        return secured;
    }
};
