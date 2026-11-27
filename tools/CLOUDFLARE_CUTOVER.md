# Page302 Cloudflare cutover — review draft

Prepared from approved main 8013ca4, then reconciled with approved source-credits release 45d8063. Website build: v4.1.24_002; the active release changes the displayed suffix to 015.

## Leaderboard switch — 27 November 2026

The user explicitly requested that the private domain use the existing leaderboard and all future live submissions, while GitHub Pages uses the sandbox leaderboard. This supersedes the initial private-domain test binding described in the historical provisioning notes below. Public access remains unapproved.

- Existing results service remains page302-scores-preview, D1 e38a4c54-9f24-47c5-8f95-03948e774015. Added canonical origin and deployed version 800b4e5d-8d09-4882-9a0b-9ff40f78844a. No player data migration or synthetic live submissions.
- Private domain now binds SCORES to that existing service. Website version 3c0d5af9-7ec1-4494-8b5f-621f5e4387fd, SITE_ACCESS private, same Access secrets and protected domains.
- User separately approved GitHub Pages deployment after run 45922830156 paused. Approved the exact merged commit 54e4e7b95f8d679db073280ad2acb568c1828af7 through the pending-deployments API; run completed successfully. The public GitHub site now serves v4.1.24 and selects page302-scores-testing through site-config.js.
- Removed GitHub's origin from the existing results service after verifying the Pages deployment; backend version d9ceb58b-8295-4a58-bbcc-30a98b210ae8. Canonical origin reads return 200, GitHub-origin live requests return 403, and GitHub-origin sandbox requests return 200. An invalid stale-GitHub POST was rejected before database access; no synthetic live scores were inserted. CORS is not API authentication.
- Verified the actual published GitHub page in headless Edge: v4.1.24_015, all seven observed API requests use the sandbox, and leaderboard loading completes. Anonymous canonical results requests still redirect to Access. Refresh old GitHub tabs before submitting; old tabs targeting the live endpoint are intentionally blocked.
- Validation: five Worker security/routing tests, domain/subpath browser test, score submission/retry/mobile test, scheduled pack transition and leaderboard browser test, and both Wrangler dry runs passed. Updated the old scheduler test's version assertions, confirmation flow, timer mock and full-results fixture to reflect existing application behaviour.

## Provisioning status — 26 November 2026

- User approved pushing and protected Cloudflare setup; public launch remains unapproved.
- PR: https://github.com/groganv-ai/Page302/pull/14 (draft pending Access setup).
- Created separate D1 page302-scores-testing: a1b78e57-c747-4f7e-8751-a41220916092; applied all three migrations.
- Seeded only pack 002 metadata, with a testing-only window from 26 November through 31 December 2026. Scheduler remains disabled; no player data was copied.
- Deployed page302-scores-testing, version be7103d7-2866-44d2-96be-3eb5978d02e1.
- Uploaded page302-website, version d9622145-1a4d-49cd-b6e3-452c7331508b, with the test-service binding. No routes/custom domains, workers.dev disabled, preview URLs disabled, private access enforced.
- Test API smoke passed: allowed origins, rejection of an unrelated origin, submission, idempotent retry, unchanged scores and standing lookup. Test-only request ID cloudflare-cutover-smoke-v4-1-23, initials TST, reference 492464.
- Local token tests and browser root/GitHub-subpath tests pass with displayed v4.1.23_002.
- 27 November: user created Worker-wide Access application and One-time PIN configuration. User screenshot confirms exact-email Include rule; user confirms Allow action. Session is 12 hours. Three authentication secrets uploaded and verified by name.
- Inspected user screenshots: .co.uk had no DNS records or rules; .uk has two proxied placeholder A records and a zone-wide redirect. User corrected a malformed Markdown URL in that redirect.
- Connected page302.co.uk and www.page302.co.uk as Worker Custom Domains, version 840335d6-f311-4f89-86da-44e393792a3f. Existing application assets unchanged (v4.1.23_002). SITE_ACCESS remains private; SCORES remains bound to testing.
- Anonymous HTTPS checks passed: canonical root, script.js, pack JSON, API releases and www all return 302 to the expected Cloudflare Access login. Both .uk hosts return 301 to canonical, preserving test path and query.
- User confirmed authorized browser sign-in loads the game. Authenticated www redirect and full end-to-end game submission remain to be checked. No GitHub Pages deployments or live database writes have been made by this cutover work.
- 27 November release parity correction: user requires the private site to follow the live release behaviour, currently pack 015. Backed up testing D1 to ignored backend/cloudflare/.local/testing-before-release-copy.sql. Read-only exported 22 live pack payloads/calendar entries, release control and opening events; validated all payload SHA-256 values. Imported metadata into testing only, preserving its submissions. Historical result publications are generated from test data, not copied from live.
- Enabled the same once-per-minute scheduler on testing; deployed testing Worker a8c4601e-1ebc-4fa1-979a-9a12d3c24ad8. Live and testing manifests match except server time; pack 015 payloads are identical. Next opening 28 November 00:01 UTC. Current copied schedule runs through pack 021 closing 4 December; later live calendar edits must also be applied to testing.
- Headless browser using prepared assets and real testing API shows v4.1.23_015, current pack 015, no JavaScript errors. No frontend source changed for this database/configuration correction; displayed suffix follows the active release.

## Intended environments

- GitHub Pages stays the public testing website. Its API becomes page302-scores-testing.
- page302.co.uk is the Cloudflare website; page302.uk and both www variants redirect to it.
- During private testing, the Cloudflare website also uses the isolated test API through a SCORES service binding.
- The user has now approved the real-results binding independently of public launch; the private Cloudflare website uses page302-scores-preview, which holds real results despite its name.
- Keep the real database and scheduler intact. Never import test scores into it.

## Access settings to apply before attaching domains

Create a Cloudflare Access self-hosted application protecting all four exact hostnames, all paths. Alternatively use Worker-wide protection for page302-website covering all traffic.
Enable One-time PIN. The sole Allow policy uses the exact email supplied in this chat (not the gmail.com domain). Set session duration to 12 hours. Do not add bypass or Everyone policies.
Configure ACCESS_TEAM_DOMAIN (https://TEAM.cloudflareaccess.com, no trailing slash), ACCESS_AUD (application audience) and TESTER_EMAIL as secrets on page302-website. Keep the tester email out of public GitHub files.

The Worker independently verifies signature, issuer, audience, expiry and exact email. Missing configuration fails closed. Every asset runs through the Worker; workers.dev and preview URLs are disabled. Keep SITE_ACCESS private until explicit public-launch approval.

## Provisioning and review order

1. Review this branch before pushing or merging, following AGENTS.md. Do not deploy GitHub Pages yet: the new testing API must exist first.
2. Create a NEW D1 database named page302-scores-testing. Put its returned ID in wrangler.testing.jsonc as binding DB with migrations_dir migrations. Verify the ID is not e38a4c54-9f24-47c5-8f95-03948e774015 (the existing real-results database).
3. Apply the existing migrations to the NEW database using the testing config; seed only reviewed game packs and a test release calendar. Do not copy player submissions or report-email secrets. Leave test cron disabled until a test schedule is intentionally required.
4. Deploy page302-scores-testing. It allows the GitHub and canonical Cloudflare origins. Test submissions and results against this database. Report sending remains disabled unless explicitly configured for a test mailbox.
5. Add a SCORES service binding to wrangler.website.jsonc for page302-scores-testing. Create the website Worker without routes (workers.dev and preview URLs remain off), then configure Access and the three secrets above.
6. Add custom-domain routes for page302.co.uk, www.page302.co.uk, page302.uk and www.page302.uk with custom_domain true. Review any existing DNS records first; preserve mail records. Build with node tools/build-pages.cjs. Dry-run and then deploy using wrangler.website.jsonc only after review approval.
7. Verify anonymous requests cannot retrieve /, /script.js, /data/vggfax002.json or /api/releases. Verify the allowed mailbox can sign in, another mailbox cannot, all aliases redirect, and HTTPS works. Test an entire game, results, sharing, mobile layouts and the displayed v4.1.23 build label (pack suffix can follow the release calendar).
8. Publish the reviewed GitHub Pages testing build through the existing environment approval. Verify its submissions appear only in the new test database.

## Public launch — separate approval required

Before launch, add https://page302.co.uk to the existing scores backend ALLOWED_ORIGINS and remove the GitHub origin only after its test API transition is verified. Local developer origins should be reviewed separately. CORS is not authentication or anti-cheat protection.
The SCORES binding is already switched by separate user approval. Set SITE_ACCESS public and remove the temporary Access restriction only after explicit public-launch approval. Do not disable protection on unrelated Workers. Re-test the real service without inserting disposable scores. Test emails and submissions are not automatically migrated.

Frontend share links, canonical URLs, social previews and privacy canonical now use page302.co.uk. Assets and manifest paths remain relative for GitHub /Page302/ compatibility. Browser storage does not migrate between domains; old progress needs a separate migration feature if required. GitHub testing remains public and may reveal client-side game data.

## Rollback

Record deployed Worker version IDs and DNS before cutover. If private testing fails, keep Access enabled and the current GitHub website unchanged. After launch, restore the previous website Worker version and its matching configuration as needed; code rollback does not restore database data. Do not delete the existing scores service or database. Keep domain ownership and Access records in place while resolving failures.

## Commands (run from backend/cloudflare)

- pnpm exec wrangler deploy --dry-run --config wrangler.website.jsonc
- pnpm exec wrangler deploy --dry-run --config wrangler.testing.jsonc
- node --test website-worker.test.mjs

Use explicit --config for every remote command. The default wrangler.jsonc targets the existing real-results backend.

## References

- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/
- https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
