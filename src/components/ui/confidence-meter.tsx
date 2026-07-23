import { cn } from "@/lib/utils";

interface ConfidenceMeterProps {
  score: number; // 0 to 1
  tone?: "default" | "dark";
  className?: string;
}

export function ConfidenceMeter({ score, tone = "default", className }: ConfidenceMeterProps) {
  const percentage = Math.max(0, Math.min(100, Math.round(score * 100)));

  let label = "Độ tin cậy cao";
  let barColor = "bg-leaf";
  let trackColor = "bg-leaf/15";

  if (percentage < 50) {
    label = "Độ tin cậy thấp";
    barColor = "bg-danger";
    trackColor = "bg-danger-soft";
  } else if (percentage < 80) {
    label = "Độ tin cậy khá";
    barColor = "bg-sun";
    trackColor = "bg-sun-soft";
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", tone === "dark" ? "text-on-forest-muted" : "text-ink-soft")}>{label}</span>
        <span className={cn("font-bold", tone === "dark" ? "text-on-forest" : "text-ink")}>{percentage}%</span>
      </div>
      <div className={cn("h-2 w-full overflow-hidden rounded-full", trackColor)}>
        <div
          className={cn("fl-meter h-full rounded-full", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
