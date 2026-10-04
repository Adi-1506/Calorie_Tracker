# Incident Response and Secret Rotation

Covers security items 2 and 45. Keep this file short enough to follow under pressure.

## Who does what

| Role | Person | Responsibilities |
|---|---|---|
| Incident lead | Repo owner (Adi-1506) | Decides severity, coordinates, writes the post-incident note |
| Fixer | Whoever is available | Rotates keys, ships the fix |

Write down the timeline as you go (what happened, when, what you did).

## Rotation schedule

| Secret | Where it lives | Rotate |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` / anon key | Supabase → Project Settings → API (JWT keys) | Every 6 months, and immediately on any leak |
| Database password | Supabase → Project Settings → Database | Every 6 months |
| `IP_HASH_SALT` | Vercel env | Yearly (old audit hashes stop matching; that's fine) |
| `HEALTH_DATA_ENCRYPTION_KEY` | Vercel env | Only with a re-encryption migration; on leak, rotate and re-encrypt immediately |
| `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile | Yearly |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | Yearly, and immediately on any leak |
| AI / USDA API keys | Provider dashboards | Yearly |

After rotating, update the value in Vercel (Preview and Production separately) and redeploy.

## If a secret is committed to Git

1. **Rotate it first.** Assume it's compromised the moment it was pushed. Removing it from history doesn't un-leak it.
2. Update Vercel and redeploy.
3. Remove it from history:
   ```bash
   pip install git-filter-repo
   git clone --mirror https://github.com/Adi-1506/Calorie_Tracker.git
   cd Calorie_Tracker.git
   printf 'the-leaked-value==>REMOVED\n' > replacements.txt
   git filter-repo --replace-text replacements.txt
   git push --force --mirror
   ```
   (BFG Repo-Cleaner works too: `bfg --replace-text replacements.txt`.)
4. Ask GitHub Support to purge cached views if the repo is public, and tell everyone with a clone to re-clone.
5. Check the provider's logs for use of the old key.

## If user data may have been exposed

1. Contain: revoke keys, take the affected feature offline if needed.
2. Assess: what data, how many users, which time window (check `audit_logs` and Supabase logs).
3. **Notify within legal deadlines:**
   - **India (DPDP Act 2023):** notify the Data Protection Board and affected users without delay, in the form the DPDP Rules prescribe.
   - **EU/UK users (GDPR):** notify the supervisory authority within 72 hours of becoming aware, and affected users without undue delay if the risk is high.
4. Fix the root cause, add a test that would have caught it, and update [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md).
5. Write a short post-incident note: what happened, impact, fix, follow-ups.

## Useful places

- Supabase logs: Dashboard → Logs (auth, API, Postgres)
- Vercel logs: Project → Logs
- Audit trail: `select * from audit_logs order by created_at desc` (service role / SQL editor)
