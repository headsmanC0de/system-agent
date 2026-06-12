import { cn } from "../lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  accent?: boolean;
  variant?: "default" | "destructive";
}

export function StatCard({ label, value, accent, variant = "default" }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <div
        className={cn(
          "text-lg font-bold",
          accent && variant === "destructive" ? "text-destructive" : accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
