import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CoachChat } from "@/components/app/coach-chat";
import { requireUser } from "@/lib/auth";
import { AI_DAILY_LIMITS } from "@/lib/ai/access";
import { aiConfigured } from "@/lib/ai/provider";
import { aiRemaining } from "@/lib/data/coach";
import { getProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Coach | Calorie Tracker", robots: { index: false } };

export default async function CoachPage() {
  const { user, supabase } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) redirect("/app/onboarding");
  const configured = aiConfigured();

  return (
    <>
      <div>
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight">Coach</h1>
        <p className="text-sm text-muted">Ask about today&apos;s food, meal ideas or what fits your remaining targets.</p>
      </div>
      {configured ? (
        <CoachChat
          consented={Boolean(profile.ai_consent_at)}
          remaining={await aiRemaining(user.id, "coach")}
          dailyLimit={AI_DAILY_LIMITS.coach}
        />
      ) : (
        <p className="notice notice-warn">AI features aren&apos;t set up on this site yet.</p>
      )}
    </>
  );
}
