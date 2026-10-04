import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { StickyCta } from "@/components/site/sticky-cta";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      {/* The footer carries extra bottom padding on mobile so the sticky CTA never covers it. */}
      <SiteFooter />
      <StickyCta />
    </>
  );
}
