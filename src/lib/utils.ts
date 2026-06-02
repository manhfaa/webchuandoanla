import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function getPlanLabel(plan: string) {
  if (plan === "elite") return "Elite";
  if (plan === "bloom") return "Bloom";
  if (plan === "grow") return "Grow";
  return "Seed";
}

export function getPlanIcon(plan: string) {
  if (plan === "elite") return "👑";
  if (plan === "bloom") return "🌳";
  if (plan === "grow") return "🌿";
  return "🌱";
}
