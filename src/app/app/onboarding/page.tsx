import type { Metadata } from "next";
import { OnboardingForm } from "@/components/app/onboarding-form";
import { requireUser } from "@/lib/auth";
import { getLatestWeightKg, getProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Your details | Calorie Tracker", robots: { index: false } };

export default async function OnboardingPage() {
  const { user, supabase } = await requireUser();
  const [profile, weightKg] = await Promise.all([getProfile(supabase, user.id), getLatestWeightKg(supabase, user.id)]);
  const returning = Boolean(profile?.onboarding_completed_at);

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-1 font-display text-[1.75rem] font-bold tracking-tight">{returning ? "Your details" : "Let's set your daily targets"}</h1>
      <p className="mb-6 text-sm text-muted">
        We use the Mifflin-St Jeor formula to estimate how much energy you burn. You can change every number afterwards.
      </p>
      <div className="card p-5 sm:p-7">
        <OnboardingForm
          defaults={{
            displayName: profile?.display_name ?? undefined,
            dateOfBirth: profile?.date_of_birth ?? undefined,
            sex: profile?.sex ?? undefined,
            heightCm: profile?.height_cm != null ? String(profile.height_cm) : undefined,
            weightKg: weightKg != null ? String(weightKg) : undefined,
            activity: profile?.activity_level ?? undefined,
            goal: profile?.goal ?? undefined,
            dietType: profile?.diet_type ?? undefined,
            allergies: profile?.allergies?.join(", ") || undefined,
          }}
        />
      </div>
    </div>
  );
}
