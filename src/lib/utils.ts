import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const mergeClasses = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["display", "h1", "h2", "h3", "body-lg", "body", "body-sm", "caption", "overline"],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return mergeClasses(clsx(inputs));
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
