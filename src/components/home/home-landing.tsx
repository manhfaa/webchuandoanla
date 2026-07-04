"use client";

import { useEffect, useState } from "react";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { cn } from "@/lib/utils";

import { FeaturesSection } from "./features-section";
import { HeroSection } from "./hero-section";
import { MissionSection } from "./mission-section";
import { PlantsSection } from "./plants-section";
import { PricingPreviewSection } from "./pricing-preview-section";
import { TeamSection } from "./team-section";
import { WorkflowSection } from "./workflow-section";

type LandingTheme = "light" | "dark";

const STORAGE_KEY = "agromind-landing-theme";

export function HomeLanding() {
  const [theme, setTheme] = useState<LandingTheme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-[#f9fbf4] text-ink-900 transition-colors duration-300",
        theme === "dark" && "dark bg-[#04180f] text-emerald-50",
      )}
    >
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main id="main-content">
        <HeroSection />
        <WorkflowSection />
        <FeaturesSection />
        <PlantsSection />
        <MissionSection />
        <TeamSection />
        <PricingPreviewSection />
      </main>
      <Footer />
    </div>
  );
}
