# Security Checklist

Each item from the spec (sections 3 and 6), where it is implemented, and the test that proves it.
This file is updated in every pull request that touches an item.

**Status:** ✅ done · 🟡 partly done · ⬜ planned (the step it lands in is noted)

Build steps: **1** architecture & schema · **2** auth & security · **3** core tracking · **4** marketing & SEO · **5** PWA & testing

## Core requirements (1–20)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 1 | Hide API keys; only `NEXT_PUBLIC_*` values reach the browser | `.env.example` separates public vs server-only variables. Server env module with `server-only` import lands in step 2. | Build-time check that no server key appears in `.next/static` (step 2) | 🟡 1 |
| 2 | Purge Git secrets: `.gitignore`, gitleaks in pre-commit and CI, rotation/scrub docs | `.gitignore` ignores `.env*` (except `.env.example`); gitleaks job in `.github/workflows/ci.yml`; rotation and history scrub steps in `docs/INCIDENT_RESPONSE.md` (step 2); pre-commit hook (step 2) | CI gitleaks job | 🟡 1 |
| 3 | Only the anon key in the client; service-role key server-only | `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix in `.env.example`; client/server Supabase helpers in step 2 | Bundle scan (step 2) | 🟡 1 |
| 4 | RLS on every table, default deny, `user_id = auth.uid()` | `supabase/migrations/20261004000200_rls.sql`: RLS on all tables, all API-role grants revoked first, default privileges revoked for future tables | `supabase/tests/rls.test.sql`: "every public table has RLS enabled", cross-user read/write tests | ✅ 1 |
| 5 | Encrypt sensitive data: TLS, at rest, field-level for health data | Supabase encrypts at rest and serves TLS only. `weight_logs.weight_kg_enc` and `body_measurements.data_enc` store ciphertext only; AES-256-GCM helper in step 3. Progress photos in a private bucket (`20261004000300_storage.sql`). | Encryption round-trip unit test (step 3) | 🟡 1 |
| 6 | Server-side auth on every API route, server action and edge function | `proxy.ts` session refresh + `requireUser()` helper | Route tests that call each endpoint without a session (step 2) | ⬜ 2 |
| 7 | Ownership checks on every read/update/delete; non-guessable UUIDs | All primary keys are `gen_random_uuid()`; RLS `using`/`with check` on `user_id` | `rls.test.sql`: "B cannot update/delete A's meal by id (IDOR)" | ✅ 1 |
| 8 | No mass assignment: users can't set role, user_id, premium or verified | Column-level grants: `role`, `is_premium`, `is_verified`, review `status` and `user_id` are never granted for writes. Zod allow-lists on routes in step 2. | `rls.test.sql`: role, is_premium, is_verified, owner_id, status, user_id tampering all rejected | ✅ 1 (DB) · ⬜ 2 (API) |
| 9 | Secure session cookies (HttpOnly, Secure, SameSite, rotation, logout invalidation) | `@supabase/ssr` cookie options | Cookie attribute test (step 2) | ⬜ 2 |
| 10 | Password hashing via provider, email verification, expiring reset tokens, optional MFA | Supabase Auth (bcrypt), email confirmation on, MFA (TOTP) enrolment UI | Auth flow tests (step 2) | ⬜ 2 |
| 11 | Rate limiting per IP and per account with backoff | Rate limiter on login, signup, reset, search and AI routes | Rate-limit tests (step 2) | ⬜ 2 |
| 12 | Bot protection (Turnstile) + honeypots | Cloudflare Turnstile on signup, login, reset, contact | Server rejects missing/invalid token (step 2) | ⬜ 2 |
| 13 | Parameterized queries only | Supabase client query builder only; no raw SQL strings in app code. Migrations use `format('%I')` for identifiers. | ESLint rule banning raw `sql` string concat (step 2) | 🟡 1 |
| 14 | Zod validation on client and server | Shared schemas in `src/lib/validation` (step 2). DB `check` constraints already enforce lengths and ranges on every column. | Validation unit tests (step 2) | 🟡 1 |
| 15 | Escape user content; no `dangerouslySetInnerHTML` with user data; DOMPurify for rich text | React escaping by default; ESLint `react/no-danger` | Lint rule (step 2) | ⬜ 2 |
| 16 | Restrict uploads: type/extension allow-list, magic bytes, size, random names, private bucket, signed URLs, strip EXIF | Bucket is private, 5 MB limit, jpeg/png/webp only, no client policies (`20261004000300_storage.sql`). Clients can't insert `progress_photos` rows. Upload route with magic-byte check and EXIF strip in step 3. | `rls.test.sql`: client insert into `progress_photos` rejected; upload route tests (step 3) | 🟡 1 |
| 17 | Trim API responses; generic errors; no stack traces | Explicit `select` column lists; error helper | Response shape tests (step 2) | ⬜ 2 |
| 18 | Security headers (CSP, HSTS, nosniff, frame-ancestors, Referrer-Policy, Permissions-Policy, CORS) | `proxy.ts` nonce-based CSP + `next.config.ts` headers | Header test against a built app (step 2) | ⬜ 2 |
| 19 | Force HTTPS, HSTS preload, Secure cookies | Vercel HTTPS redirect + HSTS header | Header test (step 2) | ⬜ 2 |
| 20 | Dependency scanning, lockfile, pinned versions | `package-lock.json` committed; `npm audit` + OSV-Scanner in CI; Dependabot config | CI jobs | 🟡 1 |

## Authentication and sessions (21–26)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 21 | CSRF protection on state-changing requests | SameSite cookies + Origin check in server actions and route handlers | CSRF tests (step 2) | ⬜ 2 |
| 22 | No account enumeration (same response and timing) | Generic auth responses, constant-time padding | Response equality tests (step 2) | ⬜ 2 |
| 23 | MFA (TOTP) and passkeys; HIBP breach check; 12+ char minimum | Supabase MFA; HIBP k-anonymity check on signup/reset | Password policy tests (step 2) | ⬜ 2 |
| 24 | Device list, log out everywhere, invalidate on password change, re-auth for sensitive actions | Account security page | Session tests (step 2) | ⬜ 2 |
| 25 | No open redirects | Allow-listed `next` parameter | Redirect tests (step 2) | ⬜ 2 |
| 26 | Timing-safe comparisons; short-lived, single-use, hashed tokens | `crypto.timingSafeEqual`; Supabase OTP tokens | Unit tests (step 2) | ⬜ 2 |

## Server and data (27–34)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 27 | SSRF protection for recipe URL importer and server fetches | `safeFetch()` with http/https allow-list, DNS resolution, private-IP blocking after redirects, timeouts, size cap. DB already restricts `recipes.source_url` to `http(s)://`. | SSRF unit tests (step 3) | ⬜ 3 |
| 28 | Least-privilege DB roles | App uses `anon`/`authenticated` (RLS) and `service_role` only on the server; no superuser. Separate migration and analytics roles documented in step 2. | `rls.test.sql` runs every check as the API roles | 🟡 1 |
| 29 | Pagination and max page size on every list endpoint | Shared pagination helper (max 100) | Tests (step 3) | ⬜ 3 |
| 30 | Encrypted, automated backups, tested restore, retention, scheduled purge | Supabase daily backups; `docs/BACKUP_AND_RETENTION.md` (step 2). Account deletion already cascades to all user data. | `rls.test.sql`: "account deletion cascades" | 🟡 1 |
| 31 | Immutable audit logs, no health data or secrets | `audit_logs` table: no client access, update/delete blocked by trigger, no FK so it survives account deletion | `rls.test.sql`: update/delete rejected; client read rejected; survives deletion | ✅ 1 (storage) · ⬜ 2 (writers) |
| 32 | Verified, idempotent, replay-safe webhooks | Signature check helper + processed-event table | Tests (step 3) | ⬜ 3 |
| 33 | Idempotency keys for payments; hosted Stripe Checkout | Premium tier uses Stripe Checkout | Tests (step 3) | ⬜ 3 |
| 34 | Strict CORS allow-list | No wildcard; same-origin API by default | Header test (step 2) | ⬜ 2 |

## AI-specific (35–37)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 35 | Treat AI input/output as untrusted; schema-validate output; no access to other users' data or write tools | AI routes run server-side with only the requester's data, Zod-validated output, escaped rendering | Tests with injected prompts (step 3) | ⬜ 3 |
| 36 | Per-user AI/photo/OCR quotas and cost caps | `ai_usage` table (server-only, daily counters) | `rls.test.sql`: client read rejected; quota tests (step 3) | 🟡 1 |
| 37 | No PII to AI providers; no-training settings; disclosed in Privacy Policy | Prompt builder strips identifiers | Tests (step 3); Privacy Policy (step 4) | ⬜ 3 |

## Frontend and mobile (38–41)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 38 | CSP with nonces, SRI on third-party scripts, analytics only after consent | `proxy.ts` nonce CSP; consent-gated GA4 loader | Header and consent tests (steps 2 and 4) | ⬜ 2 |
| 39 | Service worker never caches authenticated/personal data; clear caches on logout | Network-only for `/api` and `/app`; logout clears caches and storage | Tests (step 5) | ⬜ 5 |
| 40 | Capacitor: Keychain/Keystore tokens, biometric lock, hidden app-switcher previews, no sensitive logs, consider pinning | Capacitor config and secure storage plugin | Manual checklist (step 5) | ⬜ 5 |
| 41 | `frame-ancestors 'none'`; `Cache-Control: no-store` on sensitive pages | `proxy.ts` headers | Header test (step 2) | ⬜ 2 |

## Supply chain, CI and operations (42–48)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 42 | Lockfile, `npm ci`, no untrusted install scripts, provenance | `package-lock.json`; CI uses `npm ci`; exact versions pinned in step 2 | CI | 🟡 1 |
| 43 | SAST, secret scanning, block merges on high severity | gitleaks in CI now; CodeQL workflow (step 2) | CI | 🟡 1 |
| 44 | Branch protection, required reviews, signed commits, separate environments and keys | GitHub settings + Vercel environments; steps in `docs/DEPLOYMENT.md` | Manual (repo owner) | ⬜ manual |
| 45 | Secret rotation schedule and incident-response runbook | `docs/INCIDENT_RESPONSE.md` | — | ⬜ 2 |
| 46 | WAF/DDoS, SPF/DKIM/DMARC, CAA, `security.txt` | Cloudflare + DNS once a domain exists; `public/.well-known/security.txt` (step 4) | Manual | ⬜ 4 |
| 47 | Error monitoring with PII scrubbing | Sentry with `beforeSend` scrubbing | — | ⬜ 5 |
| 48 | OWASP Top 10 / ASVS L2 review and pre-launch pen-test checklist | `docs/PENTEST_CHECKLIST.md` | — | ⬜ 5 |

## User safety (49–50)

| # | Requirement | Implementation | Tests | Status |
|---|---|---|---|---|
| 49 | Not-medical-advice disclaimer; safe calorie floor; supportive resources; hide-numbers mode | DB check `nutrition_targets.calories between 1200 and 6000`; `profiles.hide_numbers` flag. Sex-specific floors, disclaimer and supportive-resources UI in step 3. | `rls.test.sql`: 800 kcal target rejected | 🟡 1 |
| 50 | Age confirmation; no weight-loss targets for minors | `profiles.age_confirmed_at`; trigger `enforce_minor_goal` blocks `goal = 'lose'` under 18 | `rls.test.sql`: minor + lose rejected, minor + maintain allowed | ✅ 1 (DB) · ⬜ 3 (UI) |
