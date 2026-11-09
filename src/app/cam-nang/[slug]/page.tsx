import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FieldGuideArticle } from "@/components/cam-nang/field-guide-article";
import { Footer } from "@/components/layout/footer";
import { AppShell } from "@/components/layout/layout-components";
import { Navbar } from "@/components/layout/navbar";
import { FIELD_GUIDES, findFieldGuide } from "@/data/field-guides";

export function generateStaticParams() {
  return FIELD_GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = findFieldGuide(slug);
  if (!guide) return {};

  return {
    title: `${guide.title.vi} | Agromind AI`,
    description: guide.summary.vi,
    alternates: { canonical: `/cam-nang/${guide.slug}` },
    openGraph: { title: guide.title.vi, description: guide.summary.vi, url: `/cam-nang/${guide.slug}`, images: [{ url: guide.photo.src, width: guide.photo.width, height: guide.photo.height, alt: guide.photoAlt.vi }] },
  };
}

export default async function FieldGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = findFieldGuide(slug);
  if (!guide) notFound();

  return <AppShell><Navbar /><FieldGuideArticle guide={guide} /><Footer /></AppShell>;
}
