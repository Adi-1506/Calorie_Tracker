# Architecture

## Overview

```
Browser / PWA / Capacitor app
        │  HTTPS only
        ▼
Vercel ── Next.js 16 (App Router)
        │   proxy.ts          → session refresh, CSP nonce, security headers
        │   Server Components  → read data with the user's session (RLS applies)
        │   Server Actions / Route Handlers → validated writes (Zod), rate limits
        │   Server-only modules → service-role client, AI calls, encryption
        ▼
Supabase
    Auth      → email/password, email verification, MFA
    Postgres  → all tables RLS-protected (see supabase/migrations)
    Storage   → private "progress-photos" bucket, server-only access
External APIs (server-side only)
    Open Food Facts, USDA FoodData Central, Claude (Anthropic) for AI, Stripe, Turnstile
```

## Food logging (step 3a)

- **Search** runs `search_foods()` in Postgres with the user's session, so RLS limits results to the shared catalogue plus the user's own foods. Results from Open Food Facts and USDA stream in below (`src/lib/food/external.ts`); both are validated and clamped, and a slow or failing source simply contributes nothing.
- **Logging an external product** sends only its id. The server fetches the product again, stores it in the shared catalogue with the service role, and logs it, so nutrient values never come from the browser.
- **Snapshots:** each meal entry stores the calories and macros of the portion at log time (`src/lib/nutrition/snapshot.ts`), so later edits to a food don't rewrite history.
- **Days** follow `profiles.timezone` (taken from the browser at onboarding), so "today" is the user's day, not the server's.
- **Starter catalogue:** about 40 everyday foods from around the world and 40 Indian dishes from many regions, with local names and home portion sizes (katori, piece, tumbler). Any other dish is found through Open Food Facts or USDA, or added as a custom food.

## Principles

- **The database is the last line of defence.** RLS and column-level grants enforce ownership and block mass assignment even if an API route has a bug.
- **Secrets never reach the browser.** Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and other values meant to be public use the `NEXT_PUBLIC_` prefix. Everything else is imported only from `server-only` modules.
- **Health data is minimised and encrypted.** Weight and measurements are encrypted in the server before storage; photos are private and served through short-lived signed URLs.
- **Offline first for logging.** Meal and water entries carry a client-generated `client_id`, so the offline queue can retry safely without creating duplicates.

## Folder structure (target)

```
src/
  app/
    (marketing)/          home, features, pricing, blog, faq, contact, legal pages
    (auth)/               login, signup, reset, verify
    app/                  signed-in app: dashboard, log, progress, coach, settings
    api/                  route handlers (webhooks, uploads, AI)
  components/
    ui/                   Kokonut UI / shadcn components actually used
    motion/               shared Motion wrappers (LazyMotion, reduced-motion aware)
  lib/
    supabase/             browser, server and service-role clients
    validation/           Zod schemas shared by client and server
    nutrition/            BMR/TDEE, macro targets, adaptive targets
    security/             rate limiting, safeFetch (SSRF), crypto helpers
  proxy.ts
supabase/
  migrations/             schema, RLS, storage
  tests/                  RLS tests (run on plain Postgres in CI)
docs/                     spec, architecture, security checklist, deployment
```

## Data model

| Table | Purpose | Access |
|---|---|---|
| `profiles` | Onboarding data, preferences, consent timestamps, server-managed `role` / `is_premium` | Own row; limited columns writable |
| `nutrition_targets` | Calorie and macro targets over time (`calculated` / `manual` / `adaptive`) | Own rows |
| `foods` | Shared catalogue (`owner_id` null: seeded Indian dataset, Open Food Facts, USDA) and private custom foods; nutrients per 100 g + `micronutrients` JSON | Catalogue public; custom foods private |
| `food_servings` | Named portions such as "1 katori (150 g)" | Follows the food |
| `favorite_foods` | Favourites | Own rows |
| `recipes`, `recipe_ingredients` | Recipe builder and URL importer | Own rows |
| `meal_entries` | Food log, with a nutrient snapshot at log time | Own rows |
| `water_logs` | Water tracker | Own rows |
| `weight_logs`, `body_measurements` | Encrypted health data | Own rows |
| `progress_photos` | Photo metadata; files in private storage | Own rows (read/delete only) |
| `fasting_sessions` | Intermittent fasting timer | Own rows |
| `badges`, `user_badges` | Gamification; awards written by the server | Catalogue public; own awards readable |
| `reviews` | Verified reviews from real accounts, moderated before publishing | Published ones public; own review editable |
| `contact_messages`, `ai_usage`, `audit_logs` | Server-only data | No client access |

Recent foods come from `meal_entries`; streaks are computed from logging days. Friends, groups, challenges, push subscriptions, health-app integrations and payments get their own migrations in the steps that build them.
