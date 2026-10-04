import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { applyAdaptiveTarget } from "@/app/app/actions";
import { TargetsForm } from "@/components/app/targets-form";
import { getAdaptiveSuggestion } from "@/lib/data/adaptive";
import { requireUser } from "@/lib/auth";
import { getLatestWeightKg, getProfile, getTargets, profileAge, profileToday } from "@/lib/data/profile";
import { bmr, CALORIE_FLOOR, suggestTargets, tdee } from "@/lib/nutrition/targets";

export const metadata: Metadata = { title: "Your targets | Calorie Tracker", robots: { index: false } };

export default async function TargetsPage({ searchParams }: PageProps<"/app/targets">) {
  const { user, supabase } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) redirect("/app/onboarding");

  const params = await searchParams;
  const welcome = params.welcome === "1";
  const adjusted = params.adjusted === "1";
  const today = profileToday(profile);
  const [targets, weightKg, adaptive] = await Promise.all([
    getTargets(supabase, today),
    getLatestWeightKg(supabase, user.id),
    getAdaptiveSuggestion(supabase, user.id, profile),
  ]);
  const age = profileAge(profile);
  const input =
    weightKg && age && profile.sex && profile.height_cm && profile.activity_level && profile.goal
      ? { sex: profile.sex, weightKg, heightCm: Number(profile.height_cm), age, activity: profile.activity_level, goal: profile.goal }
      : null;
  const suggested = input ? suggestTargets(input) : null;
  const maintenance = input ? Math.round(tdee(bmr(input), input.activity)) : null;

  const current = {
    calories: targets?.calories ?? suggested?.calories ?? 2000,
    proteinG: targets?.protein_g ?? suggested?.proteinG ?? 75,
    carbsG: targets?.carbs_g ?? suggested?.carbsG ?? 250,
    fatG: targets?.fat_g ?? suggested?.fatG ?? 65,
    waterMl: targets?.water_ml ?? suggested?.waterMl ?? 2000,
  };

  const diff = maintenance != null ? current.calories - maintenance : null;
  const explain =
    diff == null || maintenance == null
      ? "Your daily calorie target."
      : Math.abs(diff) < 50
        ? `About the same as your maintenance of ${maintenance.toLocaleString("en")} kcal.`
        : `About ${Math.abs(diff).toLocaleString("en")} kcal ${diff < 0 ? "below" : "above"} your maintenance of ${maintenance.toLocaleString("en")} kcal.`;
  const macros = [
    { label: "Protein", value: current.proteinG, color: "var(--leaf)" },
    { label: "Carbs", value: current.carbsG, color: "var(--carb)" },
    { label: "Fat", value: current.fatG, color: "var(--chili)" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <section aria-labelledby="targets-heading" className="flex flex-col gap-5 rounded-[26px] bg-night p-5 text-on-night sm:p-7">
        <div>
          <h1 id="targets-heading" className="font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-[2.5rem]">
            {welcome ? "Here\u2019s what a good day looks like for you." : "Your daily plate"}
          </h1>
          <p className="mt-2 text-sm text-night-muted">
            {welcome
              ? "We worked these out from your details. Keep them, or adjust anything below."
              : "New targets apply from today; past days keep the targets they had."}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-[22px] bg-turmeric p-5 text-on-turmeric shadow-[6px_6px_0_var(--on-night)]">
          <span className="text-sm font-semibold">Calories per day</span>
          <span className="font-mono text-[3.5rem] font-semibold leading-none tabular-nums">{current.calories.toLocaleString("en")}</span>
          <span className="text-sm">{explain}</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {macros.map((m) => (
            <div key={m.label} className="flex flex-col gap-1 rounded-[18px] border-2 border-on-night px-3 py-3.5">
              <span className="size-3.5 rounded-full" style={{ background: m.color }} aria-hidden="true" />
              <span className="text-[13px] text-night-muted">{m.label}</span>
              <span className="font-mono text-xl font-semibold tabular-nums">{m.value} g</span>
            </div>
          ))}
        </div>
        <p className="flex items-center gap-2.5 text-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--water)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z" />
          </svg>
          <span>
            <span className="font-mono font-semibold">{current.waterMl.toLocaleString("en")} ml</span> water, about {Math.round(current.waterMl / 250)} glasses
          </span>
        </p>
      </section>

      {adjusted && <p className="notice notice-ok">Target updated from your weekly check-in.</p>}
      {adaptive && !adjusted && (
        <section aria-labelledby="adaptive-heading" className="card flex flex-col gap-3 p-5">
          <h2 id="adaptive-heading" className="font-display text-xl font-bold">
            Weekly check-in: try {adaptive.calories.toLocaleString("en")} kcal
          </h2>
          <p className="text-sm">{adaptive.reason}</p>
          <form action={applyAdaptiveTarget} className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary">Use {adaptive.calories.toLocaleString("en")} kcal</button>
            <span className="text-xs text-muted">Or keep your current target. This is an estimate, not medical advice.</span>
          </form>
        </section>
      )}
      {suggested && targets?.source === "manual" && (
        <p className="notice notice-warn">
          Suggested for you: {suggested.calories} kcal, {suggested.proteinG} g protein, {suggested.carbsG} g carbs, {suggested.fatG} g fat.
        </p>
      )}
      <section aria-labelledby="adjust-heading" className="card p-5 sm:p-7">
        <h2 id="adjust-heading" className="mb-4 font-display text-xl font-bold">
          Adjust
        </h2>
        <TargetsForm current={current} floor={CALORIE_FLOOR[profile.sex ?? "female"]} />
      </section>
      <p className="text-sm">
        <Link href="/app/onboarding" className="link">
          Update your details
        </Link>{" "}
        to recalculate.
      </p>
    </div>
  );
}
