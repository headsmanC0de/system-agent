import { Package } from "lucide-react";
import { useState } from "react";
import { system } from "../api";
import { Card, Output, SearchInput, StatCard } from "../components/ui";
import { useAsyncData } from "../lib/hooks";
import type { OutdatedPackage, PackageInfo } from "../types";

export function PackagesPage() {
  const [pkgs, setPkgs] = useState<PackageInfo[]>([]);
  const [outdated, setOutdated] = useState<OutdatedPackage[]>([]);
  const [orphans, setOrphans] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [packageDetail, setPackageDetail] = useState<string | null>(null);

  const refresh = async () => {
    const [p, o, or] = await Promise.all([system.packages(), system.outdated(), system.orphans()]);
    setPkgs(p);
    setOutdated(o);
    setOrphans(or);
  };

  useAsyncData(refresh);

  const filtered = search ? pkgs.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : pkgs;

  const handlePackageClick = async (name: string) => {
    if (selectedPackage === name) {
      setSelectedPackage(null);
      setPackageDetail(null);
      return;
    }
    setSelectedPackage(name);
    setLoading(true);
    try {
      const detail = await system.packageInfo(name);
      setPackageDetail(detail);
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
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
            onClick={() => run(system.updatePackages, "system upgrade")}
            disabled={loading}
            className="btn-primary"
          >
            Update All
          </button>
          {orphans.length > 0 && (
            <button
              onClick={() => run(system.removeOrphans, "remove orphans")}
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
            <div key={p.name} className="flex items-center justify-between px-4 py-1.5 text-sm hover:bg-muted/50">
              <span
                className={`font-medium cursor-pointer ${selectedPackage === p.name ? "text-primary" : ""}`}
                onClick={() => handlePackageClick(p.name)}
              >
                {p.name}
              </span>
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

      {selectedPackage && (
        <Card>
          <div className="border-b border-border/50 px-4 py-2 text-sm font-medium text-primary">{selectedPackage}</div>
          <Output>{packageDetail ?? "Loading..."}</Output>
        </Card>
      )}
    </div>
  );
}
