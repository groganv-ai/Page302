# Report form release checklist

The form posts to `/api/reports` using `PAGE302_REPORTS_API` when supplied, otherwise the existing scores API. All report email is addressed to vince.grogan.games@gmail.com, with `[Page302 Report]` in the subject. Optional reply email is the Reply-To header. Game version and pack are captured when opening the form.

## Local review

Run `node tools/preview-reports.cjs <path-to-ignored-gmail-credentials.json>` and open http://127.0.0.1:8083. This uses the real Worker handler with a local, in-memory SQLite rate-limit binding. Reports submitted here send real email. Without the credential path, sending is disabled.

Credentials use `client_id`, `client_secret`, and `refresh_token` keys. Keep this file outside published assets in an ignored `.local` directory. Never commit it or paste it into a command argument.

## Before release

- Resolve Google OAuth Testing mode's seven-day refresh token lifetime and reauthorise as necessary. Publishing the OAuth app and satisfying any applicable Google requirements is separate from publishing the website.
- Apply `0002_report_limits.sql` to the intended remote D1 database through the approved migration workflow. This branch starts from origin/main; reconcile migration numbering if scheduler work is merged first.
- Configure `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` as Worker secrets through the approved staged release workflow. Local files do not configure deployed secrets.
- Deploy the Worker changes through the approved release workflow, then verify a real form report and the Gmail filter.
- Publish website assets only after review and explicit Pages environment approval.

The endpoint permits three attempts per visitor per hour, and 100 total per UTC day. Failures consume attempts conservatively. Limits are atomic D1 counters. Daily-salted SHA-256 values replace IP addresses in counters; expired counters are purged on subsequent submissions. Report bodies and reply addresses are not stored in D1. A honeypot and origin checks provide basic abuse resistance; origin checks are not bot authentication.

Delivery is awaited with bounded Google request timeouts. Success appears only after Gmail accepts the message. A timeout can leave delivery uncertain; the form preserves entered text and asks the user to wait before retrying. No automatic send retry avoids silently duplicating uncertain submissions.

## Checks

- `node --test tests/reports.test.mjs tests/reports-browser.test.cjs`
- `node tests/reports-runtime.cjs <installed-wrangler-cli-path>`
- `node tools/build-pages.cjs`
- `wrangler deploy --dry-run --config backend/cloudflare/wrangler.jsonc`

The browser test mocks delivery. The runtime test uses only local D1 and sends no mail. Neither changes remote configuration.
