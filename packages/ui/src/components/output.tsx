interface OutputProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
  maxHeight?: string;
}

export function Output({ children, className, maxHeight, ...props }: OutputProps) {
  return (
    <pre
      className={`rounded-xl border bg-card p-4 text-xs font-mono overflow-x-auto ${className || ""}`}
      style={maxHeight ? { maxHeight } : undefined}
      {...props}
    >
      {children}
    </pre>
  );
}