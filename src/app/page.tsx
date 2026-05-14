import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { FeaturesSection } from "@/components/home/features-section";
import { HeroSection } from "@/components/home/hero-section";
import { MissionSection } from "@/components/home/mission-section";
import { PlantsSection } from "@/components/home/plants-section";
import { PricingPreviewSection } from "@/components/home/pricing-preview-section";
import { TeamSection } from "@/components/home/team-section";
import { WorkflowSection } from "@/components/home/workflow-section";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <TeamSection />
        <FeaturesSection />
        <PlantsSection />
        <WorkflowSection />
        <MissionSection />
        <PricingPreviewSection />
      </main>
      <Footer />
    </>
  );
}
