import Link from "next/link";
import type { ReactNode } from "react";

// Blog posts live in code: no CMS to run or secure. Each post is original,
// written for Kalo users, and avoids medical claims.

export type Post = {
  slug: string;
  title: string;
  description: string;
  published: string; // ISO date
  readMinutes: number;
  body: ReactNode;
};

export const POSTS: Post[] = [
  {
    slug: "how-kalo-sets-your-calorie-target",
    title: "How Kalo works out your calorie target",
    description: "The formula behind your daily calories and macros, why we never go below a safe minimum, and when the weekly check-in nudges it.",
    published: "2026-10-04",
    readMinutes: 4,
    body: (
      <>
        <p>
          When you sign up, Kalo asks for your height, weight, age, sex, activity level and goal. Here&apos;s what we do with those numbers, so
          the target on your screen never feels like magic.
        </p>
        <h2>Step 1: what your body burns at rest</h2>
        <p>
          We estimate your basal metabolic rate (BMR) with the Mifflin-St Jeor equation, one of the most widely used and best-tested formulas
          for adults:
        </p>
        <ul>
          <li>10 × weight in kg</li>
          <li>+ 6.25 × height in cm</li>
          <li>− 5 × age in years</li>
          <li>+ 5 for men, − 161 for women (we use the midpoint if you choose &quot;other&quot;)</li>
        </ul>
        <h2>Step 2: your activity</h2>
        <p>
          BMR is multiplied by an activity factor, from 1.2 for mostly sitting to 1.9 for very active work or training. The result is your
          maintenance calories: roughly what keeps your weight steady.
        </p>
        <h2>Step 3: your goal</h2>
        <p>
          To lose weight we subtract 500 kcal a day, which is a gentle, sustainable pace for most adults. To gain, we add 300 kcal. Keto,
          high-protein and diabetic-friendly goals keep maintenance calories but change the split between protein, carbs and fat.
        </p>
        <p>
          Two safety rules always apply: targets never go below 1,200 kcal (1,500 for men), and if you&apos;re under 18 we never suggest a
          deficit at all.
        </p>
        <h2>Step 4: the weekly check-in</h2>
        <p>
          Formulas are averages, and you aren&apos;t. After about two weeks of logging and a few weigh-ins, Kalo compares what you ate with how
          your weight actually moved. If the two don&apos;t match your goal, it suggests a small change, never more than 150 kcal at a time and
          at most once a week. Nothing changes until you tap to accept it.
        </p>
        <p>
          You can always edit your targets yourself on the Targets page. If you have a medical condition, are pregnant or take medication that
          affects appetite or weight, ask a doctor or registered dietitian what&apos;s right for you.
        </p>
      </>
    ),
  },
  {
    slug: "logging-home-cooked-meals",
    title: "Logging home-cooked meals without the guesswork",
    description: "Practical ways to track dishes made at home: weigh once, build it as a recipe, and use bowls and spoons you already own.",
    published: "2026-10-04",
    readMinutes: 5,
    body: (
      <>
        <p>
          Packaged food is easy: scan the barcode and you&apos;re done. A pot of curry, a tray of lasagne or a plate of fried rice is harder,
          because every kitchen makes it differently. These habits get you close without turning dinner into a lab experiment.
        </p>
        <h2>Build it once as a recipe</h2>
        <p>
          If you cook something often, add it as a recipe: the ingredients you put in the pot and how many servings it makes. Kalo adds up the
          nutrition, and next time you just log &quot;1 serving&quot;. Found the recipe online? Paste the link into the recipe importer and
          match the ingredients it finds.
        </p>
        <h2>Weigh the cooked pot, not just the raw ingredients</h2>
        <p>
          Cooking changes weight: rice and dal soak up water, meat loses it. For the most accurate servings, weigh the finished dish, then weigh
          your portion. Your share of the recipe is your portion weight divided by the total.
        </p>
        <h2>Use the bowls you already have</h2>
        <p>
          Measure your usual bowl, ladle and spoon once with water or on a kitchen scale. A typical small steel bowl (katori) holds about
          150 ml, but yours might not. Once you know, logging &quot;1 bowl of dal&quot; is quick and honest.
        </p>
        <h2>Don&apos;t forget the oil</h2>
        <p>
          One tablespoon of oil or ghee is roughly 120 kcal, and it&apos;s the easiest thing to miss. If you can, log cooking fat as part of the
          recipe rather than guessing per plate.
        </p>
        <h2>When you can&apos;t measure</h2>
        <p>
          Eating out or at a friend&apos;s place? Search for the closest dish, snap a photo and let the AI suggest portions, or use quick add
          with your best estimate. A rough entry beats a blank day, because the trend over weeks matters far more than any single meal.
        </p>
        <p>
          Ready to try it? <Link href="/signup">Start tracking free</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "why-your-weight-jumps-around",
    title: "Why your weight jumps around from day to day",
    description: "Daily weigh-ins swing with water, salt and timing. Here's why, and how Kalo's 7-day trend line shows what's really happening.",
    published: "2026-10-04",
    readMinutes: 3,
    body: (
      <>
        <p>
          You stuck to your plan all week, stepped on the scale, and it went up a kilo. Before you give up, know that this is normal and
          almost never fat.
        </p>
        <h2>What moves the number day to day</h2>
        <ul>
          <li>
            <strong>Water.</strong> Your body holds more water after salty or carb-heavy meals, hard workouts, and at some points in a menstrual
            cycle.
          </li>
          <li>
            <strong>Food still in transit.</strong> The weight of what you ate yesterday is still with you this morning.
          </li>
          <li>
            <strong>Timing.</strong> Morning and evening weights can differ by a kilo or more.
          </li>
        </ul>
        <p>
          To gain one kilo of fat you&apos;d need to eat roughly 7,700 kcal more than you burn. That rarely happens overnight.
        </p>
        <h2>How to weigh in</h2>
        <p>Same time, same scale, similar clothes: first thing in the morning after the bathroom works well for most people.</p>
        <h2>Watch the trend, not the day</h2>
        <p>
          On the Progress page, Kalo draws a 7-day average line through your weigh-ins. Daily dots bounce around; the line shows the direction
          you&apos;re really heading. The weekly check-in on your targets uses that trend too, never a single reading.
        </p>
        <p>
          If watching numbers feels stressful, turn on <strong>Hide numbers</strong> in Settings. You can keep logging and the rings still fill
          up, without the digits.
        </p>
      </>
    ),
  },
];

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}
