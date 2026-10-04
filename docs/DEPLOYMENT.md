# Deployment (manual steps)

Manus can't be connected to this project, so build and deploy are done by hand. Everything below works on free tiers.

## One-time setup
1. Create a free account at https://vercel.com and sign in with GitHub.
2. **Add New → Project**, import `Adi-1506/Calorie_Tracker`. Vercel detects Next.js automatically.
3. Under **Settings → Environment Variables**, add every secret listed in `.env.example` (database URL, auth secret, AI keys…). Set separate values for **Preview** and **Production** (security item 44). Never commit `.env` files.
4. Under **Settings → Git**, keep `main` as the production branch. Every pull request gets its own preview URL.
5. On GitHub, **Settings → Branches → Add rule** for `main`: require a pull request, require status checks (CI, CodeQL) to pass, and require signed commits (item 44).

## Every change
1. Code lands as a pull request.
2. Review the diff and the Vercel preview link; CI and security scans must be green.
3. Merge. Vercel deploys `main` to production automatically.

## Rolling back
Vercel → **Deployments** → pick the last good deployment → **Promote to Production**.

## Not covered by Vercel
- **Native mobile app (item 40):** packaging with Capacitor and store submission are done manually with Xcode / Android Studio.
- **WAF, DNS records, email auth (item 46):** configure in Cloudflare (or your DNS provider) once a custom domain exists.
