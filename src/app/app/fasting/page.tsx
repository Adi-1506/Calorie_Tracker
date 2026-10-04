import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { deleteFast, endFast } from "@/app/app/fasting/actions";
import { FastTimer, StartFastForm } from "@/components/app/fasting";
import { requireUser } from "@/lib/auth";
import { getProfile, profileAge } from "@/lib/data/profile";
import { elapsed } from "@/lib/habits/streak";

export const metadata: Metadata = { title: "Fasting | Kalo", robots: { index: false } };

export default async function FastingPage() {
  const { user, supabase } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) redirect("/app/onboarding");
  const age = profileAge(profile);

  const { data } = await supabase
    .from("fasting_sessions")
    .select("id, started_at, ended_at, target_hours")
    .order("started_at", { ascending: false })
    .limit(15);
  const sessions = data ?? [];
  const open = sessions.find((s) => !s.ended_at) ?? null;
  const past = sessions.filter((s) => s.ended_at);
  // Rendered per request, so reading the clock here is fine; the timer hydrates from it.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();

  return (
    <>
      <div>
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight">Fasting</h1>
        <p className="text-sm text-muted">An intermittent fasting timer. Water, black coffee and plain tea are usually fine while fasting.</p>
      </div>

      {age == null || age < 18 ? (
        <p className="notice notice-warn">The fasting timer is for adults only.</p>
      ) : (
        <section aria-labelledby="fast-heading" className="card flex flex-col gap-5 p-5 sm:p-6">
          <h2 id="fast-heading" className="font-display text-xl font-bold">
            {open ? "You're fasting" : "Start a fast"}
          </h2>
          {open ? (
            <>
              <FastTimer startedAt={open.started_at} targetHours={Number(open.target_hours)} serverNow={serverNow} timeZone={profile.timezone} />
              <form action={endFast} className="flex justify-center">
                <input type="hidden" name="id" value={open.id} />
                <button className="btn btn-ink min-h-12 px-6">End fast</button>
              </form>
            </>
          ) : (
            <StartFastForm />
          )}
          <p className="text-xs text-muted">
            Fasting isn&apos;t right for everyone. Skip it if you&apos;re pregnant or breastfeeding, have diabetes, or have had an eating disorder, and talk to a
            doctor if you&apos;re unsure. Stop if you feel unwell.
          </p>
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="history-heading" className="flex flex-col gap-2.5">
          <h2 id="history-heading" className="eyebrow">
            Recent fasts
          </h2>
          <ul className="card rows px-4">
            {past.map((s) => {
              const { hours, minutes, totalHours } = elapsed(s.started_at, Date.parse(s.ended_at!));
              const reached = totalHours >= Number(s.target_hours);
              return (
                <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: profile.timezone }).format(new Date(s.started_at))}
                  </span>
                  <span className="font-mono tabular-nums">
                    {hours}h {String(minutes).padStart(2, "0")}m / {Number(s.target_hours)}h
                  </span>
                  <span className={`badge ${reached ? "bg-leaf text-surface" : ""}`}>{reached ? "Reached" : "Ended early"}</span>
                  <form action={deleteFast}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-well hover:text-danger" aria-label="Delete this fast">
                      ✕
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
