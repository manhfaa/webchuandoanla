import { notFound } from "next/navigation";

import { RecoveryWorkspace } from "@/components/recovery/recovery-workspace";
import { recoveryFeatureEnabled } from "@/lib/recovery-feature";

export default function RecoveryPage() {
  if (!recoveryFeatureEnabled) notFound();
  return <RecoveryWorkspace />;
}
