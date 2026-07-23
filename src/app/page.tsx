import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { CapabilityStrip } from "@/components/home/capability-strip";
import { FeaturesSection } from "@/components/home/features-section";
import { HeroSection } from "@/components/home/hero-section";
import { LeafDiagnosisStory } from "@/components/home/leaf-diagnosis-story";
import { MissionSection } from "@/components/home/mission-section";
import { PlantsSection } from "@/components/home/plants-section";
import { PricingPreviewSection } from "@/components/home/pricing-preview-section";
import { TeamSection } from "@/components/home/team-section";
import { AppShell } from "@/components/layout/layout-components";

export default function HomePage() {
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
        <PricingPreviewSection />
      </main>
      <Footer />
    </AppShell>
  );
}
