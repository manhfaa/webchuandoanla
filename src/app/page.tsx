import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { CapabilityStrip } from "@/components/home/capability-strip";
import { FeaturesSection } from "@/components/home/features-section";
import { HeroSection } from "@/components/home/hero-section";
import { LeafDiagnosisStory } from "@/components/home/leaf-diagnosis-story";
import { MissionSection } from "@/components/home/mission-section";
import { PlantsSection } from "@/components/home/plants-section";
import { PricingPreviewSection } from "@/components/home/pricing-preview-section";
import { PromoBand } from "@/components/home/promo-band";
import { TeamSection } from "@/components/home/team-section";
import { AppShell } from "@/components/layout/layout-components";
import { resolveCampaign } from "@/lib/campaign";

export default async function HomePage() {
  // Resolved on the server so both surfaces ship in the first HTML. Rendering
  // them conditionally here — rather than letting each decide for itself — also
  // keeps their hooks unconditional: a component that returned early before its
  // own effects would change hook count between the campaign being off and on,
  // and crash the page at exactly the moment the campaign starts.
  const campaign = await resolveCampaign();
  const heroPlan = campaign?.surfaces.has("hero") ? campaign.plan : null;
  const bandPlan = campaign?.surfaces.has("band") ? campaign.plan : null;

  return (
    <AppShell>
      <Navbar />
      <main id="main-content">
        <HeroSection campaign={heroPlan} />
        <CapabilityStrip />
        {/* Screen two, right after the capability claims. Previously this sat
            after TeamSection, roughly ten screens down on a phone. The comment
            there claimed PlantsSection's GSAP pin forbade anything above it —
            that was over-cautious: the trigger is built in useLayoutEffect with
            invalidateOnRefresh and refreshed in a mount rAF, so server-rendered
            markup is in the DOM before GSAP ever measures. */}
        {bandPlan ? <PromoBand plan={bandPlan} /> : null}
        <LeafDiagnosisStory />
        <FeaturesSection />
        <PlantsSection />
        <MissionSection />
        <TeamSection />
        <PricingPreviewSection />
      </main>
      <Footer />
    </AppShell>
  );
}
