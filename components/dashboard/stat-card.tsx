import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

const TONE_COLORS: Record<string, string> = {
  navy: "#0B1E3D",
  gold: "#D4AF37",
  danger: "#DC2626",
  accent: "#2563EB",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "navy",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  tone?: keyof typeof TONE_COLORS;
}) {
  const color = TONE_COLORS[tone];
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-slate-500 tracking-wide">{label}</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-navy">{value}</p>
          {sub && <p className="mt-1 text-xs" style={{ color }}>{sub}</p>}
        </div>
        <div className="rounded-xl p-2.5" style={{ backgroundColor: `${color}14` }}>
          <Icon size={18} style={{ color }} strokeWidth={2.2} />
        </div>
      </div>
    </Card>
  );
}
