# Kalo

A calorie and nutrition tracker that works as a responsive website and an installable mobile app (PWA). Log any food from anywhere: packaged products by barcode, generic foods, your own recipes, or a quick calorie entry. It also includes a dataset of home-style Indian dishes.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage) · Vercel · Kokonut UI / shadcn/ui · Motion

- [Product spec](docs/SPEC.md)
- [Architecture and data model](docs/ARCHITECTURE.md)
- [Security checklist (all 50 items)](docs/SECURITY_CHECKLIST.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Incident response and secret rotation](docs/INCIDENT_RESPONSE.md)

## Status

Being built in steps, each as its own pull request:

1. Architecture and database schema
2. Auth and security
3. Core tracking features
4. Marketing pages and SEO
5. **PWA and testing** ← current

## Local setup

Requirements: Node.js 22+, npm, and PostgreSQL 16 with `psql` (for the database tests).

```bash
npm ci
cp .env.example .env.local   # fill in values; see comments in the file
npm run dev                  # http://localhost:3000
```

### Supabase (hosted project)

1. Create a free project at https://supabase.com.
2. Apply the migrations with the Supabase CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   Run `npx supabase db push` again whenever you pull changes that add files to `supabase/migrations/`.
3. In the Supabase dashboard:
   - **Authentication → Sign In / Providers → Email:** keep **Confirm email** on, and set the minimum password length to **12**. Turn on **Secure password change**.
   - **Authentication → Multi-Factor:** make sure **TOTP (App Authenticator)** is enabled so users can turn on two-factor login in Settings.
   - **Authentication → URL Configuration:** set **Site URL** to your site (e.g. `http://localhost:3000` for local use, your Vercel URL in production) and add `http://localhost:3000/**` and `https://<your-domain>/**` to **Redirect URLs**.
   - **Authentication → Email Templates:** paste the contents of `supabase/templates/confirmation.html` (Confirm signup), `recovery.html` (Reset password) and `email_change.html` (Change email address). These links work even when the email is opened on another device.
   - The default email sender is heavily rate limited; set up custom SMTP (e.g. Resend's free tier) before launch.
4. Copy the project URL and anon key into `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and the service-role key into `SUPABASE_SERVICE_ROLE_KEY` (**Project Settings → API**). The service-role key is server-only and must never get a `NEXT_PUBLIC_` prefix. Generate `IP_HASH_SALT` with `openssl rand -hex 32` and `HEALTH_DATA_ENCRYPTION_KEY` with `openssl rand -base64 32` (on Windows without OpenSSL: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Keep a safe copy of the encryption key: if it's lost, stored weights can't be read.

### AI features (optional, free)

Meal-photo recognition and the coach use Google Gemini's free tier.

1. Sign in at https://aistudio.google.com/apikey and click **Create API key**.
2. Put it in `.env.local` as `GEMINI_API_KEY=...` (and in Vercel's environment variables for the live site). Never paste it into chats or commit it.
3. Restart `npm run dev`.

Without a key the app still works; the photo and coach features just say they aren't set up. Users are asked before their first AI use, because Google may use free-tier data to improve its products. Each user gets 10 meal photos and 30 coach messages a day, and the whole site is capped at 1,000 AI requests a day.

### Supabase (local, optional)

With Docker running, `npx supabase start` runs the whole stack locally using `supabase/config.toml` and applies the migrations. Emails appear in the local inbox at http://localhost:54324.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Apply all migrations to a throwaway Postgres database and run the RLS tests. Set `DATABASE_URL` to an admin connection (default `postgres://postgres:postgres@localhost:5432/postgres`). |

## Environment variables

See [.env.example](.env.example). Variables starting with `NEXT_PUBLIC_` are sent to the browser; everything else stays on the server.

In Vercel, add `NEXT_PUBLIC_` variables as **Config** and everything else as **Secret**.

Optional site settings (leave blank to hide the matching section):

| Variable | Shows |
|---|---|
| `NEXT_PUBLIC_CONTACT_EMAIL` | Contact email on the contact page and in the legal pages |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4, loaded only after cookie consent |
| `NEXT_PUBLIC_BUSINESS_ADDRESS`, `_PHONE`, `_HOURS`, `_GEO` | Office map, directions link and LocalBusiness schema |

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
