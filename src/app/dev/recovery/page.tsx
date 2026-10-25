import { notFound } from "next/navigation";

import { RecoveryWorkspace } from "@/components/recovery/recovery-workspace";

export const dynamic = "force-dynamic";

export default function RecoveryPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main className="min-h-[100dvh] bg-canvas px-4 py-8 sm:px-6 lg:px-10"><RecoveryWorkspace demo /></main>;
}
