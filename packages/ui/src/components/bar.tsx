import { cn } from "../lib/utils";

interface BarProps {
  label: string;
  value?: string;
  pct: number;
  size?: "sm" | "md";
  colorTiers?: Array<{ threshold: number; color: string }>;
}

export function Bar({ label, value, pct, size = "sm", colorTiers }: BarProps) {
  const getColor = () => {
    if (colorTiers) {
      for (const tier of colorTiers) {
        if (pct >= tier.threshold) return tier.color;
      }
    }
    if (pct >= 90) return "bg-destructive";
    if (pct >= 75) return "bg-warning";
    return "bg-primary";
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-foreground">{label}</span>
          {value && <span className="text-foreground font-medium">{value}</span>}
        </div>
      )}
      <div className={cn("w-full rounded-full bg-secondary", size === "sm" ? "h-1.5" : "h-2")}>
        <div
          className={cn("h-full rounded-full transition-all", getColor())}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
