# Calorie Tracker

A calorie and nutrition tracker that works as a responsive website and an installable mobile app (PWA), with first-class support for South Indian and Kerala food.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage) · Vercel · Kokonut UI / shadcn/ui · Motion

- [Product spec](docs/SPEC.md)
- [Architecture and data model](docs/ARCHITECTURE.md)
- [Security checklist (all 50 items)](docs/SECURITY_CHECKLIST.md)
- [Deployment](docs/DEPLOYMENT.md)

## Status

Being built in steps, each as its own pull request:

1. **Architecture and database schema** ← current
2. Auth and security
3. Core tracking features
4. Marketing pages and SEO
5. PWA and testing

## Local setup

Requirements: Node.js 22+, npm, and PostgreSQL 16 with `psql` (for the database tests).

```bash
npm ci
cp .env.example .env.local   # fill in values; see comments in the file
npm run dev                  # http://localhost:3000
```

### Supabase

1. Create a free project at https://supabase.com.
2. Copy the project URL and anon key into `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`), and the service-role key into `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is server-only and must never get a `NEXT_PUBLIC_` prefix.
3. Apply the migrations with the Supabase CLI:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run TypeScript |
| `npm run test:db` | Apply all migrations to a throwaway Postgres database and run the RLS tests. Set `DATABASE_URL` to an admin connection (default `postgres://postgres:postgres@localhost:5432/postgres`). |

## Environment variables

See [.env.example](.env.example). Variables starting with `NEXT_PUBLIC_` are sent to the browser; everything else stays on the server.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
