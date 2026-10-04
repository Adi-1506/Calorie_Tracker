import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TargetsForm } from "@/components/app/targets-form";
import { requireUser } from "@/lib/auth";
import { getLatestWeightKg, getProfile, getTargets, profileAge, profileToday } from "@/lib/data/profile";
import { CALORIE_FLOOR, suggestTargets } from "@/lib/nutrition/targets";

export const metadata: Metadata = { title: "Your targets | Calorie Tracker", robots: { index: false } };

export default async function TargetsPage({ searchParams }: PageProps<"/app/targets">) {
  const { user, supabase } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) redirect("/app/onboarding");

  const welcome = (await searchParams).welcome === "1";
  const today = profileToday(profile);
  const [targets, weightKg] = await Promise.all([getTargets(supabase, today), getLatestWeightKg(supabase, user.id)]);
  const age = profileAge(profile);
  const suggested =
    weightKg && age && profile.sex && profile.height_cm && profile.activity_level && profile.goal
      ? suggestTargets({
          sex: profile.sex,
          weightKg,
          heightCm: Number(profile.height_cm),
          age,
          activity: profile.activity_level,
          goal: profile.goal,
        })
      : null;

  const current = {
    calories: targets?.calories ?? suggested?.calories ?? 2000,
    proteinG: targets?.protein_g ?? suggested?.proteinG ?? 75,
    carbsG: targets?.carbs_g ?? suggested?.carbsG ?? 250,
    fatG: targets?.fat_g ?? suggested?.fatG ?? 65,
    waterMl: targets?.water_ml ?? suggested?.waterMl ?? 2000,
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold">{welcome ? "Here are your daily targets" : "Your daily targets"}</h1>
      <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
        {welcome
          ? "We worked these out from your details. Keep them, or adjust anything to suit you."
          : "Change any number. New targets apply from today; past days keep the targets they had."}
      </p>
      {suggested && targets?.source === "manual" && (
        <p className="mb-4 rounded-lg bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-900">
          Suggested for you: {suggested.calories} kcal, {suggested.proteinG} g protein, {suggested.carbsG} g carbs, {suggested.fatG} g fat.
        </p>
      )}
      <div className="rounded-2xl border border-neutral-200 p-6 shadow-sm dark:border-neutral-800">
        <TargetsForm current={current} floor={CALORIE_FLOOR[profile.sex ?? "female"]} />
      </div>
      <p className="mt-4 text-sm">
        <Link href="/app/onboarding" className="underline underline-offset-4">
          Update your details
        </Link>{" "}
        to recalculate.
      </p>
    </div>
  );
}
