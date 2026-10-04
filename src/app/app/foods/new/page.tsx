import type { Metadata } from "next";
import { CustomFoodForm } from "@/components/app/custom-food-form";
import { requireUser } from "@/lib/auth";
import { isIsoDate } from "@/lib/dates";
import { mealSchema } from "@/lib/validation/food";

export const metadata: Metadata = { title: "New food | Calorie Tracker", robots: { index: false } };

export default async function NewFoodPage({ searchParams }: PageProps<"/app/foods/new">) {
  await requireUser();
  const params = await searchParams;
  const meal = mealSchema.safeParse(params.meal);
  const name = typeof params.name === "string" ? params.name.slice(0, 200) : undefined;
  const barcode = typeof params.barcode === "string" && /^[0-9]{8,14}$/.test(params.barcode) ? params.barcode : undefined;

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold">Create a custom food</h1>
      <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
        {barcode
          ? `Copy the nutrition label for barcode ${barcode}. Next time you scan it, it will come straight up.`
          : "Add a home-cooked dish, a local brand or anything else. Only you can see your custom foods."}
      </p>
      <div className="rounded-2xl border border-neutral-200 p-6 shadow-sm dark:border-neutral-800">
        <CustomFoodForm
          meal={meal.success ? meal.data : undefined}
          date={isIsoDate(params.date) ? params.date : undefined}
          name={name}
          barcode={barcode}
        />
      </div>
    </div>
  );
}
