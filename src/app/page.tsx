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
import { fetchPromotedPlan } from "@/lib/server-offer";

export default async function HomePage() {
  // Resolved on the server so the band ships in the first HTML. Rendering it
  // conditionally here — rather than letting the band decide for itself — also
  // keeps the band's hooks unconditional: a component that returns early before
  // its own effects would change hook count between the campaign being off and
  // on, and crash the page at exactly the moment the campaign starts.
  const promoted = await fetchPromotedPlan();

  return (
    <AppShell>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <CapabilityStrip />
        <LeafDiagnosisStory />
        <FeaturesSection />
        <PlantsSection />
        <MissionSection />
        <TeamSection />
        {/* Directly above the pricing block, so the offer lands where the
            grower is already deciding — and below PlantsSection, whose GSAP pin
            measures document height on mount and would be offset by a section
            inserted above it. */}
        {promoted ? <PromoBand plan={promoted} /> : null}
        <PricingPreviewSection />
      </main>
      <Footer />
    </AppShell>
  );
}
