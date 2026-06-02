import { useState } from "react";
import { system } from "../api";
import { Badge, Card, Output, SearchInput, StatCard } from "../components/ui";
import { useAsyncData } from "../lib/hooks";
import type { AutostartEntry } from "../types";

export function AutostartPage() {
  const [entries, setEntries] = useState<AutostartEntry[]>([]);
  const [search, setSearch] = useState("");
  const [output, setOutput] = useState("");

  const refresh = async () => {
    setEntries(await system.autostartList());
  };

  useAsyncData(refresh);

  const toggle = async (name: string, enable: boolean) => {
    try {
      const res = await system.autostartToggle(name, enable);
      setOutput(res);
      refresh();
    } catch (e) {
      setOutput(`Error: ${e}`);
    }
  };

  const filtered = search ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())) : entries;

  const enabledCount = entries.filter((e) => e.state === "enabled").length;
  const disabledCount = entries.filter((e) => e.state === "disabled").length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Entries" value={entries.length} />
        <StatCard label="Enabled" value={enabledCount} accent />
        <StatCard label="Disabled" value={disabledCount} />
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search applications..." />

      {output && <Output>{output}</Output>}

      <Card className="p-0">
        <div className="divide-y divide-border/50">
          {filtered.map((e) => (
            <button
              key={`${e.name}-${e.source}`}
              type="button"
              onClick={() => toggle(e.name, e.state !== "enabled")}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
            >
              <div
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  e.state === "enabled" ? "bg-success" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    e.state === "enabled" ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{e.name}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">{e.source}</div>
              </div>

              <Badge variant={e.state === "enabled" ? "success" : "secondary"}>
                {e.state === "enabled" ? "Enabled" : "Disabled"}
              </Badge>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No autostart entries found</div>
          )}
        </div>
      </Card>
    </div>
  );
}
