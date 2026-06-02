"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CheckoutRedirectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get("plan");

  useEffect(() => {
    if (plan && ["grow", "bloom", "elite"].includes(plan)) {
      router.replace(`/dashboard/pricing/checkout/${plan}`);
    } else {
      router.replace("/dashboard/pricing");
    }
  }, [plan, router]);

  return null;
}
