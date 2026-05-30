import { ORG_NAME, ORG_URL } from "../lib/branding";

interface PoweredByBadgeProps {
  className?: string;
}

export default function PoweredByBadge({ className = "" }: PoweredByBadgeProps) {
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      <span className="text-[10px] text-muted-foreground tracking-wide uppercase">
        Powered by
      </span>
      <a
        href={ORG_URL}
        target="_blank"
        rel="noopener"
        className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
      >
        Forge · {ORG_NAME}
      </a>
    </div>
  );
}
