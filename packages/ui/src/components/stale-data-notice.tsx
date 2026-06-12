export function StaleDataNotice({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <div className="text-xs text-destructive" role="status" title={error.message} data-testid="stale-data-notice">
      Live data unavailable — retrying…
    </div>
  );
}
