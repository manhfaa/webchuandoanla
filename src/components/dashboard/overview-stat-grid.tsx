import { Activity, Leaf, TimerReset, TrendingUp } from "lucide-react";

import { Stat } from "@/components/ui/stat";
import { overviewStats } from "@/data/mock/dashboard";

const icons = [Activity, Leaf, TrendingUp, TimerReset];

export function OverviewStatGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {overviewStats.map((item, index) => {
        const Icon = icons[index] ?? Activity;
        return (
          <Stat
            key={item.id}
            label={item.label}
            value={item.value}
            icon={Icon}
            className="hover:-translate-y-px hover:shadow-md"
          />
        );
      })}
    </div>
  );
}
