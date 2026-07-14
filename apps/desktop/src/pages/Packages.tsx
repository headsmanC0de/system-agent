import { useAsyncData, useDebounced } from "@project/hooks";
import type { OutdatedPackage, PackageInfo } from "@project/types";
import { Card, Modal, Output, SearchInput, StatCard } from "@project/ui";
import { Package } from "lucide-react";
import { useRef, useState } from "react";
import { system } from "../api";

export function PackagesPage() {
  const [pkgs, setPkgs] = useState<PackageInfo[]>([]);
  const [outdated, setOutdated] = useState<OutdatedPackage[]>([]);
  const [orphans, setOrphans] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [packageDetail, setPackageDetail] = useState<string | null>(null);
  const detailRequestRef = useRef<string | null>(null);
  const debouncedSearch = useDebounced(search, 200);
  const [confirmAction, setConfirmAction] = useState<{
    label: string;
    message: string;
    fn: () => Promise<string>;
  } | null>(null);

  const refresh = async () => {
    const [p, o, or] = await Promise.all([system.packages(), system.outdated(), system.orphans()]);
    setPkgs(p);
    setOutdated(o);
    setOrphans(or);
  };

  useAsyncData(refresh);

  const filtered = debouncedSearch
    ? pkgs.filter((p) => p.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : pkgs;

  const closeDetail = () => {
    detailRequestRef.current = null;
    setSelectedPackage(null);
    setPackageDetail(null);
  };

  const handlePackageClick = async (name: string) => {
    detailRequestRef.current = name;
    setSelectedPackage(name);
    setPackageDetail(null);
    let detail: string;
    try {
      detail = await system.packageInfo(name);
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err);
    }
    if (detailRequestRef.current === name) setPackageDetail(detail);
  };

  const run = async (fn: () => Promise<string>, label: string) => {
    setLoading(true);
    setOutput(`Running ${label}...`);
    try {
      const res = await fn();
      setOutput(res);
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <button
            onClick={() =>
              setConfirmAction({
                label: "system upgrade",
                message: `Run a full system upgrade (pacman -Syu) for ${outdated.length} outdated package${outdated.length === 1 ? "" : "s"}? A polkit authentication prompt will appear.`,
                fn: system.updatePackages,
              })
            }
            disabled={loading}
            className="btn-primary"
          >
            Update All
          </button>
          {orphans.length > 0 && (
            <button
              onClick={() =>
                setConfirmAction({
                  label: "remove orphans",
                  message: `Remove ${orphans.length} orphaned package${orphans.length === 1 ? "" : "s"} (pacman -Rns): ${orphans.join(", ")}?`,
                  fn: system.removeOrphans,
                })
              }
              disabled={loading}
              className="btn-danger"
            >
              Remove {orphans.length} Orphans
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Installed" value={pkgs.length} />
        <StatCard label="Updates Available" value={outdated.length} accent={outdated.length > 0} />
        <StatCard label="Orphans" value={orphans.length} accent={orphans.length > 0} />
      </div>

      {outdated.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5">
          <div className="border-b border-primary/20 px-4 py-2 text-sm font-medium text-primary">Updates Available</div>
          <div className="divide-y divide-border/50">
            {outdated.map((p) => (
              <div key={p.name} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="font-mono text-xs">
                  <span className="text-muted-foreground">{p.oldVer}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className="text-primary">{p.newVer}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SearchInput value={search} onChange={setSearch} placeholder="Search packages..." />

      <Card className="p-0">
        <div className="max-h-[400px] overflow-y-auto divide-y divide-border/50">
          {pkgs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Package size={32} className="mb-2 opacity-50" />
              <p>No packages installed</p>
            </div>
          )}
          {filtered.slice(0, 100).map((p) => (
            <div
              key={p.name}
              className="flex cursor-pointer items-center justify-between px-4 py-1.5 text-sm hover:bg-muted/50"
              onClick={() => handlePackageClick(p.name)}
            >
              <span className={`font-medium ${selectedPackage === p.name ? "text-primary" : ""}`}>{p.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{p.version}</span>
            </div>
          ))}
          {pkgs.length > 0 && filtered.length > 100 && (
            <div className="px-4 py-2 text-center text-xs text-muted-foreground">
              Showing 100 of {filtered.length}. Use search to narrow results.
            </div>
          )}
        </div>
      </Card>

      {output && <Output>{output}</Output>}

      <Modal open={selectedPackage !== null} onClose={closeDetail} title={selectedPackage ?? ""}>
        {packageDetail === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Output className="whitespace-pre-wrap">{packageDetail}</Output>
        )}
      </Modal>

      <Modal open={confirmAction !== null} onClose={() => setConfirmAction(null)} title="Confirm action">
        <p className="text-sm">{confirmAction?.message}</p>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={() => setConfirmAction(null)} className="btn-ghost text-xs">
            Cancel
          </button>
          <button
            onClick={() => {
              const action = confirmAction;
              setConfirmAction(null);
              if (action) run(action.fn, action.label);
            }}
            className="btn-danger text-xs"
          >
            Confirm
          </button>
        </div>
      </Modal>
    </div>
  );
}
