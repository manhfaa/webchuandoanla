import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
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
  if (plan === "plus") return "Plus";
  if (plan === "pro") return "Pro";
  return "Free";
}
