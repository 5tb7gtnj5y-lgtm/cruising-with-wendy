# Migration verification — 13 October 2026

Passed locally:

- Production Vite build and TypeScript check.
- Exact backup restoration: 31 content records, four settings, six audit records, 12 view records and zero revisions. Every exported row was compared after SQLite restoration; complete article bodies were preserved.
- Both schema migrations and the full backup imported successfully in a fresh local Cloudflare D1 database.
- Built Worker smoke test: HTTPS login and CSS delivery, private-page redirects, protected system/admin endpoints, rejection of spoofed ChatGPT identity headers, all restored records read back, password sign-in, authenticated page rendering and session revocation on sign-out.
- Password verification, secure cookie flags, hashed session tokens, expiration, logout, cross-origin rejection and login attempt limiting.
- Original content checks: publication/revisions, draft isolation, search, scheduling, duplicate suppression, approved source validation, pause, one original draft per UTC day, expanding news feed and affiliate disclosure handling.
- Collector fixture tests: recent-date validation, host allowlist, pause, review-only news imports, exact duplicates, archived suppression, concurrent-run lease and preservation of existing content on source failures.
- The current hosted Site source was left unchanged. Its normal researched update API accepted nine additional primary-source links, and all nine were read back while the previous 22 records remained unchanged.

Pending account-dependent checks:

- Cloudflare account sign-in, real account/database identifiers, runtime secret provisioning and production deployment.
- Administrator sign-in on the actual workers.dev destination.
- Live Cron Trigger source coverage from Cloudflare; some official newsrooms block automated access or render links with JavaScript.
- A new private GitHub repository and Cloudflare Workers Builds connection.
- Connecting the independent researcher for original AI-assisted daily drafts. The metadata collector does not generate those articles.

No custom domain, paid AI integration, public access change, old-site credential rotation or old automation shutdown was performed.
