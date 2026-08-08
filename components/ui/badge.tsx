import { cn } from "@/lib/utils";

const toneStyles: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
  neutral: "bg-slate-100 text-slate-600",
  gold: "bg-gold/10 text-gold",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof toneStyles;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full",
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
