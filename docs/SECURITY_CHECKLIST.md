# Security Checklist

Each item from the spec (sections 3 and 6), where it is implemented, and the test that proves it.
This file is updated in every pull request that touches an item.

**Status:** ✅ done · 🟡 partly done · ⬜ planned (the step it lands in is noted)

Build steps: **1** architecture & schema · **2** auth & security · **3** core tracking (3a logging, 3b recipes and barcode, 3c progress, 3d AI and habits) · **4** marketing & SEO · **5** PWA & testing

## Core requirements (1–20)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 1 | Hide API keys; only `NEXT_PUBLIC_*` values reach the browser | `src/lib/env.ts` (public) vs `src/lib/env.server.ts` (`server-only` import makes client imports fail the build); ESLint blocks importing server modules in UI code | `scripts/check-client-bundle.sh` in CI builds with sentinel secrets and fails if any reach `.next/static` | ✅ 2 |
| 2 | Purge Git secrets: `.gitignore`, gitleaks in pre-commit and CI, rotation/scrub docs | `.gitignore` ignores `.env*` (except `.env.example`); `.githooks/pre-commit` runs gitleaks (enabled by `npm install`); gitleaks job in CI; rotation and history scrub in `docs/INCIDENT_RESPONSE.md` | CI gitleaks job | ✅ 2 |
| 3 | Only the anon key in the client; service-role key server-only | Browser never talks to Supabase directly; `src/lib/supabase/admin.ts` is `server-only` | Bundle check in CI; ESLint `no-restricted-imports` | ✅ 2 |
| 4 | RLS on every table, default deny, `user_id = auth.uid()` | `supabase/migrations/20261004000200_rls.sql`: RLS on all tables, all API-role grants revoked first, default privileges revoked for future tables | `supabase/tests/rls.test.sql`: "every public table has RLS enabled", cross-user read/write tests | ✅ 1 |
| 5 | Encrypt sensitive data: TLS, at rest, field-level for health data | Supabase encrypts at rest and serves TLS only. Weight and body measurements are encrypted in the app server with AES-256-GCM before it reaches the database (`src/lib/security/health-crypto.ts`, key in `HEALTH_DATA_ENCRYPTION_KEY`), with the user id bound as associated data so ciphertext can't be moved between accounts. Production refuses to store weight without the key. `body_measurements.data_enc` uses the same helper in step 3c. Progress photos in a private bucket. | `health-crypto.test.ts` (round trip, fresh IV, wrong user, tampering, wrong key, key length); E2E checks the stored value is `v1.` ciphertext | ✅ 3a |
| 6 | Server-side auth on every API route, server action and edge function | `src/proxy.ts` redirects `/app/*` without a session; `requireUser()` in `src/lib/auth.ts` validates with `auth.getUser()` at the top of every protected page and every Server Action in `src/app/app/actions.ts`; RLS backs it up | E2E: `/app` redirects to `/login` without a session; RLS tests | ✅ 3a |
| 7 | Ownership checks on every read/update/delete; non-guessable UUIDs | All primary keys are `gen_random_uuid()`; RLS `using`/`with check` on `user_id` | `rls.test.sql`: "B cannot update/delete A's meal by id (IDOR)", "D cannot find C's custom food". Delete actions run through the user's client, so a guessed id deletes nothing | ✅ 3a |
| 8 | No mass assignment: users can't set role, user_id, premium or verified | Column-level grants in the DB; Zod object schemas drop unknown fields in every action | `rls.test.sql` tampering tests; `auth.test.ts` "drops fields that aren't on the allow-list" | ✅ 2 |
| 9 | Secure session cookies (HttpOnly, Secure, SameSite, rotation, logout invalidation) | `src/lib/supabase/cookies.ts` forces `HttpOnly`, `Secure` (production), `SameSite=Lax` on every auth cookie; Supabase rotates refresh tokens; logout calls `signOut()` which revokes the session | Manual header check | ✅ 2 |
| 10 | Password hashing via provider, email verification, expiring reset tokens, optional MFA | Supabase Auth (bcrypt); email confirmation required (`supabase/config.toml`, hosted setting in README); single-use `token_hash` links in `supabase/templates/`; MFA enrolment UI comes with account settings | Auth flow tests | 🟡 2 (MFA UI in step 3) |
| 11 | Rate limiting per IP and per account with backoff | `check_rate_limit()` DB function (`20261004000400_rate_limits.sql`) + `src/lib/security/rate-limit.ts`; login 5/15 min, signup 5/h, reset 3/h, per IP and per email; per user: food search 60/min, external lookups 30/min, log writes 120/min, recipe imports 10/h; fails closed | `rls.test.sql` rate-limit tests | ✅ 3a (AI limits with step 3d) |
| 12 | Bot protection (Turnstile) + honeypots | Turnstile widget + server verification on signup, login and reset (`src/lib/security/turnstile.ts`); hidden `website` honeypot; production fails closed without keys. Contact form in step 4. | `auth.test.ts` honeypot tests | ✅ 2 |
| 13 | Parameterized queries only | Supabase query builder only; ESLint blocks dynamic `rpc()` names; migrations use `format('%I')`; `search_foods()` escapes `%`, `_` and `\` before `ilike` | Lint; `rls.test.sql`: "a bare _ is a literal", "a % matches only a literal %" | ✅ 3a |
| 14 | Zod validation on client and server | Shared Zod schemas in `src/lib/validation/` (auth, profile, food) used by the forms (`useClientValidation`) and the Server Actions; external API data validated and clamped in `src/lib/food/external.ts`; DB `check` constraints as a final layer | `auth.test.ts`, `profile.test.ts`, `food.test.ts`, `external.test.ts` | ✅ 3a |
| 15 | Escape user content; no `dangerouslySetInnerHTML` with user data; DOMPurify for rich text | React escaping; ESLint `react/no-danger: error` | Lint | ✅ 2 |
| 16 | Restrict uploads: type/extension allow-list, magic bytes, size, random names, private bucket, signed URLs, strip EXIF | Bucket is private, 5 MB limit, jpeg/png/webp only, no client policies (`20261004000300_storage.sql`). Upload route `src/app/app/progress/photos/route.ts`: same-origin check, size capped from `Content-Length` before the body is read, type from magic bytes (`src/lib/images/sanitize.ts`), re-encoded to WebP with sharp (drops EXIF/GPS/XMP and trailing bytes, 50 MP pixel cap), stored as `<user_id>/<random uuid>.webp` with the service role; 20 uploads/hour per user. Photos are served by `/app/progress/photos/[id]` only after an RLS ownership check, `private` cache, `nosniff`, instead of signed URLs (keeps the CSP at `img-src 'self'`). Deleting a photo removes the file too. | `sanitize.test.ts` (magic bytes, EXIF stripped, oversize, corrupt); `rls.test.sql`: client insert into `progress_photos` rejected; E2E: SVG renamed `.jpg` refused, EXIF gone from the served file, anonymous fetch refused, cross-origin upload 403 | ✅ 3c |
| 17 | Trim API responses; generic errors; no stack traces | Actions return only a status and user-facing message; auth errors are generic; database and upstream errors are mapped to "Something went wrong"; Next.js hides stack traces in production | E2E checks user-facing messages; route-handler response tests come with the first route handlers (3b) | 🟡 3a |
| 18 | Security headers (CSP, HSTS, nosniff, frame-ancestors, Referrer-Policy, Permissions-Policy, CORS) | `src/proxy.ts` (nonce CSP) + `next.config.ts` (HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP) | `csp.test.ts`; headers checked against a production build | ✅ 2 |
| 19 | Force HTTPS, HSTS preload, Secure cookies | Vercel redirects HTTP→HTTPS; HSTS `max-age=63072000; includeSubDomains; preload`; CSP `upgrade-insecure-requests`; Secure cookies | Header check | ✅ 2 (submit to hstspreload.org once a domain exists) |
| 20 | Dependency scanning, lockfile, pinned versions | `package-lock.json`; `.npmrc` `save-exact=true`; `npm audit` in CI; Dependabot | CI | ✅ 2 |

## Authentication and sessions (21–26)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 21 | CSRF protection on state-changing requests | Server Actions: Next.js rejects requests whose Origin doesn't match the host; `SameSite=Lax` cookies; auth links are GET with single-use tokens. State-changing route handlers call `isSameOrigin()` (`src/lib/security/same-origin.ts`); GET routes only read. | `same-origin.test.ts`; E2E cross-origin upload 403 | ✅ 3c |
| 22 | No account enumeration (same response and timing) | Generic messages for login/signup/reset; existing-email signup behaves like a new one; every auth action padded to ≥ 800 ms (`src/lib/security/timing.ts`) | Manual | ✅ 2 |
| 23 | MFA (TOTP) and passkeys; HIBP breach check; 12+ char minimum | 12–128 chars in Zod and Supabase config; HIBP k-anonymity check on signup and reset (`src/lib/security/password.ts`). TOTP two-factor in Settings (enrol with QR or key, confirm with a code, turn off). Once enrolled, `requireUser()` and `getApiUser()` refuse aal1 sessions and send them to `/login/mfa`; code checks are rate limited (10 per 15 min) and audited. Passkeys later. | `password.test.ts`, `auth.test.ts`; E2E: wrong code refused, password-only session redirected, API returns 401, login completes with the code | 🟡 3d (passkeys pending) |
| 24 | Device list, log out everywhere, invalidate on password change, re-auth for sensitive actions | "Log out on all devices" in Settings (`signOut({ scope: 'global' })`); other sessions signed out on password change; `secure_password_change` on. Turning off two-factor needs an aal2 session. Device list and re-auth for account deletion with the account-deletion flow. | Manual | 🟡 3d |
| 25 | No open redirects | `safeRedirectPath()` allow-lists `/app/*`; `/auth/confirm` allow-lists `next` | `redirect.test.ts` | ✅ 2 |
| 26 | Timing-safe comparisons; short-lived, single-use, hashed tokens | Email/reset tokens are Supabase's single-use hashed OTPs; no app-level secret comparisons yet (webhooks in step 3 will use `timingSafeEqual`) | — | 🟡 2 |

## Server and data (27–34)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 27 | SSRF protection for recipe URL importer and server fetches | `src/lib/security/safe-fetch.ts`: http/https only, default ports only, no credentials in URLs; DNS answers are checked inside the socket's `lookup` hook so a rebinding answer can't slip past; private, loopback, link-local, CGNAT, multicast and IPv4-mapped IPv6 ranges blocked; redirects followed by hand (max 3), each hop re-checked; 8 s timeout, 2 MB cap, HTML only. Recipe import is rate limited to 10 per hour per user. Open Food Facts/USDA calls go to fixed hosts. | `safe-fetch.test.ts`; E2E: importing `http://localhost:3000` is refused | ✅ 3b |
| 28 | Least-privilege DB roles | App uses `anon`/`authenticated` (RLS) and `service_role` only on the server; no superuser. Separate migration and analytics roles documented in step 2. | `rls.test.sql` runs every check as the API roles | 🟡 1 |
| 29 | Pagination and max page size on every list endpoint | Every list query has a hard `limit` (recent foods 40, favourites 30, search 25, weigh-ins 400, photos 60); CSV export reads in pages of 1000 up to 50,000 rows. Exports limited to 20/hour per user. | E2E exports | 🟡 3c (shared helper when list pages get paging UI) |
| 30 | Encrypted, automated backups, tested restore, retention, scheduled purge | Supabase daily backups; `docs/BACKUP_AND_RETENTION.md` (step 2). Account deletion already cascades to all user data. | `rls.test.sql`: "account deletion cascades" | 🟡 1 |
| 31 | Immutable audit logs, no health data or secrets | `audit_logs` (append-only); `src/lib/security/audit.ts` records login, failed login, logout, signup, reset, password change, rate-limit and bot-check events with a salted IP hash | `rls.test.sql` | ✅ 2 (exports, deletions and admin actions logged when built) |
| 32 | Verified, idempotent, replay-safe webhooks | Signature check helper + processed-event table | Tests (step 3) | ⬜ 3 |
| 33 | Idempotency keys for payments; hosted Stripe Checkout | Premium tier uses Stripe Checkout | Tests (step 3) | ⬜ 3 |
| 34 | Strict CORS allow-list | No CORS headers are sent, so browsers block cross-origin reads; API is same-origin only | Header check | ✅ 2 |

## AI-specific (35–37)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 35 | Treat AI input/output as untrusted; schema-validate output; no access to other users' data or write tools | AI routes run server-side with only the requester's data, Zod-validated output, escaped rendering | Tests with injected prompts (step 3) | ⬜ 3 |
| 36 | Per-user AI/photo/OCR quotas and cost caps | `ai_usage` table (server-only, daily counters) | `rls.test.sql`: client read rejected; quota tests (step 3) | 🟡 1 |
| 37 | No PII to AI providers; no-training settings; disclosed in Privacy Policy | Prompt builder strips identifiers | Tests (step 3); Privacy Policy (step 4) | ⬜ 3 |

## Frontend and mobile (38–41)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 38 | CSP with nonces, SRI on third-party scripts, analytics only after consent | Nonce CSP with `strict-dynamic`, no inline/eval scripts in production. Inline styles are allowed (React style attributes and the Turnstile widget need them). Turnstile can't use SRI (Cloudflare changes the file); GA4 consent gating in step 4. | `csp.test.ts` | 🟡 2 |
| 39 | Service worker never caches authenticated/personal data; clear caches on logout | Network-only for `/api` and `/app`; logout clears caches and storage | Tests (step 5) | ⬜ 5 |
| 40 | Capacitor: Keychain/Keystore tokens, biometric lock, hidden app-switcher previews, no sensitive logs, consider pinning | Capacitor config and secure storage plugin | Manual checklist (step 5) | ⬜ 5 |
| 41 | `frame-ancestors 'none'`; `Cache-Control: no-store` on sensitive pages | CSP `frame-ancestors 'none'` + `X-Frame-Options: DENY`; `no-store` on `/app/*`, auth pages and `/auth/*` | Verified on a production build | ✅ 2 |

## Supply chain, CI and operations (42–48)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 42 | Lockfile, `npm ci`, no untrusted install scripts, provenance | `package-lock.json`; CI uses `npm ci`; exact versions (`save-exact`) | CI | 🟡 2 (review `ignore-scripts` when native deps arrive) |
| 43 | SAST, secret scanning, block merges on high severity | CodeQL (`security-extended`) + gitleaks in CI. Make both required checks in branch protection. | CI | ✅ 2 |
| 44 | Branch protection, required reviews, signed commits, separate environments and keys | GitHub settings + Vercel environments; steps in `docs/DEPLOYMENT.md` | Manual (repo owner) | ⬜ manual |
| 45 | Secret rotation schedule and incident-response runbook | `docs/INCIDENT_RESPONSE.md` | — | ✅ 2 |
| 46 | WAF/DDoS, SPF/DKIM/DMARC, CAA, `security.txt` | Cloudflare + DNS once a domain exists; `public/.well-known/security.txt` (step 4) | Manual | ⬜ 4 |
| 47 | Error monitoring with PII scrubbing | Sentry with `beforeSend` scrubbing | — | ⬜ 5 |
| 48 | OWASP Top 10 / ASVS L2 review and pre-launch pen-test checklist | `docs/PENTEST_CHECKLIST.md` | — | ⬜ 5 |

## User safety (49–50)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 49 | Not-medical-advice disclaimer; safe calorie floor; supportive resources; hide-numbers mode | DB check `nutrition_targets.calories between 1200 and 6000`; sex-specific floors (female/other 1200, male 1500) in `src/lib/nutrition/targets.ts`, applied to suggestions and enforced on manual targets with the floor taken from the profile, never the form; not-medical-advice note on onboarding; `profiles.hide_numbers` toggle in Settings, respected by Today and Progress. Fasting timer is adults-only with a safety note; adaptive targets move at most 150 kcal a week, respect the floor, are shown for the user to accept and run at most weekly. Supportive-resources page with the legal pages (step 4). | `targets.test.ts` "never goes below the safe floor"; `profile.test.ts` floor tests; E2E: 900 kcal rejected by the server after removing the browser `min`; `rls.test.sql`: 800 kcal rejected | 🟡 3a |
| 50 | Age confirmation; no weight-loss targets for minors | `profiles.age_confirmed_at`; trigger `enforce_minor_goal` blocks `goal = 'lose'` under 18; onboarding refuses under-13s and blocks lose and keto goals under 18 (marked 18+ in the form); suggested and adaptive targets never include a deficit for minors; the fasting timer refuses under-18s | `rls.test.sql`: minor + lose rejected; `targets.test.ts` "never gives minors a deficit"; `profile.test.ts`; E2E: under-18 weight-loss goal refused | ✅ 3a |
