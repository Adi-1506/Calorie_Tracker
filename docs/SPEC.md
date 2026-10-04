# Product Spec

This is the original brief, kept as the source of truth. Decisions that change or clarify it are listed first.

## Decisions and notes

| Topic | Decision |
|---|---|
| App name | **Kalo** (chosen by the owner on 2026-10-04). |
| Stack | Next.js 16 (App Router) + TypeScript, Tailwind v4, Supabase, Vercel, as specified. In Next.js 16, `middleware.ts` is called `proxy.ts`. |
| Manus | Manus is a separate AI agent and can't be plugged into this workflow. Code is written and pushed as pull requests to this repo, and deployment follows the manual steps in [DEPLOYMENT.md](./DEPLOYMENT.md). |
| Field-level encryption (item 5) | Weight and body measurements are encrypted in the app server (AES-256-GCM, server-only key) before they reach the database, so the database only ever holds ciphertext. Progress photos live in a private bucket with no client access. |
| Security checklist | All 50 items are tracked in [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md). |

---

Build "[APP NAME]", a calorie and nutrition tracker that works as BOTH a responsive website and an installable mobile app (a PWA with manifest, service worker, offline logging, and install prompt; optionally wrapped with Capacitor for the app stores).

STACK (change if you prefer): Next.js (App Router) + TypeScript, Tailwind, Supabase (Postgres, Auth, Storage), Vercel hosting. Keep code clean and modular.

## 1. Core product features

- Onboarding: age, sex, height, weight, activity level, goal (lose / maintain / gain / keto / high-protein / diabetic-friendly), diet type, allergies. Compute BMR/TDEE and suggest calorie and macro targets, all editable.
- Food logging: breakfast, lunch, dinner and snacks. Search, barcode scan (camera), AI photo recognition, voice logging, quick-add calories, recent and favorite foods, copy meal or day, custom foods, recipe builder, recipe URL importer.
- Food database: integrate a licensed or open API (e.g., Open Food Facts, USDA FoodData Central) plus a seeded Indian food dataset (include South Indian and Kerala dishes with home-style portion sizes). Mark entries "verified" vs "user-submitted".
- Nutrients: calories, macros, fiber, sugar, sodium, and 80+ micronutrients, shown as daily rings and weekly charts. Water tracker.
- Adaptive targets: adjust the calorie goal weekly based on the weight trend and logged intake.
- AI coach and meal planner: weekly plans from goals and preferences, grocery list generation, "what can I eat with my remaining macros" suggestions. Keep AI calls server-side only.
- Intermittent fasting timer, streaks, badges, challenges, optional friends and groups.
- Progress: weight, measurements, progress photos (private), trend charts, CSV and PDF export.
- Integrations: Apple Health / Google Fit / Fitbit for exercise calories.
- Reminders and push notifications, dark mode, multi-language, offline mode with sync, a free tier with unlimited basic logging and barcode scanning, and an optional premium tier.
- Accessibility: WCAG 2.2 AA, keyboard navigation, screen-reader labels, sufficient contrast.

## 2. Website / SEO / conversion requirements

- Custom 404 page: branded, with search, popular links and a CTA.
- CTA above the fold on the home page and every landing page ("Start tracking free").
- Internal links: logical linking between home, features, blog, FAQ, pricing, and contact pages.
- Thank-you page: after signup, contact form, and waitlist submissions (also used as the analytics conversion page).
- Breadcrumbs: visible, with BreadcrumbList JSON-LD schema.
- 5 FAQs: on the home page (and relevant pages), with FAQPage schema. Cover accuracy, pricing, data privacy, offline use, and supported devices.
- Response-time promise: visible text such as "We reply to every message within 24 hours", also on the contact page.
- Sticky mobile CTA: a fixed bottom bar on mobile that doesn't cover content or the cookie banner.
- robots.txt and sitemap.xml: block /app, /api and auth routes; allow marketing pages.
- Unique page titles (under 60 characters) and unique meta descriptions (under 160 characters) on every page.
- Social share image: Open Graph and Twitter Card tags, with a 1200x630 image per key page.
- Maps and directions: a Contact/Office page with an embedded map and a "Get directions" link. Add a "Find a nearby dietitian or healthy food store" locator.
- Real reviews from real people only: build a verified-review system where only authenticated users with real accounts can submit a review. Never seed, fabricate, or purchase reviews, and show an empty state until real ones exist. Add Review/AggregateRating schema ONLY from real stored reviews.
- Alt text on all images, and descriptive file names.
- Local schema: LocalBusiness / Organization JSON-LD with address, phone, hours, and geo coordinates.
- PP pages: Privacy Policy and Terms & Conditions (plus Cookie Policy and Refund Policy), linked in the footer and at signup, with explicit consent for health data. Include a GDPR/India DPDP-style data export and account deletion flow.
- Google Analytics (GA4): load after cookie consent, track signup, onboarding completion, first food logged, and conversions. Respect Do Not Track and consent.
- Performance: Core Web Vitals targets (LCP < 2.5s), image optimization, lazy loading.

## 3. Security requirements (non-negotiable)

Items 1–20, plus items 21–50 from section 6, are tracked with their implementation and tests in [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md).

## 4. Deliverables

- Project structure, database schema with RLS policies, and migrations
- Complete code for the pages, API routes and components above
- PWA manifest, service worker, and Capacitor config
- JSON-LD schema snippets, robots.txt, sitemap, and the GA4 setup
- A security checklist file mapping each item to where it is implemented
- Tests for auth, RLS, and input validation
- A README with setup, environment variables, and deployment steps

Build order: architecture and schema, then auth and security, then core tracking features, then the marketing pages and SEO, and finally the PWA and testing.

## 5. UI, motion & build tooling

- UI components: use Kokonut UI (kokonutui.com), which is built on shadcn/ui, Tailwind and Motion, for buttons, cards, inputs, dialogs, toggles, loaders and AI-input components. Copy in only the components actually used, review each for accessibility (focus states, ARIA, contrast), and check its license terms. Fall back to plain shadcn/ui where Kokonut has no equivalent.
- Animation: use Motion (motion.dev, `motion/react`) for animated calorie and macro rings and progress bars, number count-ups on daily totals, page and route transitions, food-log list add/remove/reorder animations, tap and hover micro-interactions, streak and badge celebrations, and skeleton-to-content transitions.
- Motion rules:
  - Respect `prefers-reduced-motion` everywhere (disable or simplify).
  - Use `LazyMotion` with `domAnimation` to keep the bundle small.
  - Animate only `transform` and `opacity` where possible.
  - Never let animation block input or hurt Core Web Vitals (CLS ~0, INP < 200ms).
  - Keep durations short (150–400ms).
- Build and deploy: see the Manus note at the top of this file.

## 6. Additional security

See [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md), items 21–50.
