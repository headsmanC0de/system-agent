import { useAsyncData } from "@project/hooks";
import type { PasswordDetail, PasswordEntry } from "@project/types";
import { Badge, Card, Output, SearchInput } from "@project/ui";
import { Copy, Eye, EyeOff, FolderLock, KeyRound, Plus, RefreshCw, Shield, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { passwords } from "../api";

export function PasswordsPage() {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<PasswordDetail | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addPath, setAddPath] = useState("");
  const [addContent, setAddContent] = useState("");
  const [addMode, setAddMode] = useState<"insert" | "generate">("insert");
  const [genLen, setGenLen] = useState(24);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await passwords.list();
      setEntries(list);
      setSelected(null);
      setDetail(null);
      setShowPw(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useAsyncData(refresh);

  const select = async (path: string) => {
    setSelected(path);
    setDetail(null);
    setShowPw(false);
    try {
      const d = await passwords.show(path);
      setDetail(d);
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const copy = async (path: string) => {
    try {
      const res = await passwords.copy(path);
      setOutput(res);
      setTimeout(() => setOutput(""), 2000);
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const del = async (path: string) => {
    try {
      const res = await passwords.delete(path);
      setOutput(res);
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const generate = async () => {
    if (!addPath) return;
    try {
      const res = await passwords.generate(addPath, genLen);
      setOutput(res);
      setShowAdd(false);
      setAddPath("");
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const insert = async () => {
    if (!addPath || !addContent) return;
    try {
      const res = await passwords.insert(addPath, addContent);
      setOutput(res);
      setShowAdd(false);
      setAddPath("");
      setAddContent("");
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const filtered = search ? entries.filter((e) => e.path.toLowerCase().includes(search.toLowerCase())) : entries;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <button onClick={refresh} className="btn-secondary flex items-center gap-1.5">
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={() => {
              setShowAdd(true);
              setAddPath("");
              setAddContent("");
              setAddMode("insert");
            }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <KeyRound size={18} className="text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Entries</div>
            <div className="text-xl font-bold">{entries.length}</div>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <Shield size={18} className="text-success-foreground" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Backend</div>
            <div className="text-xl font-bold">pass</div>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
            <FolderLock size={18} className="text-info-foreground" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Storage</div>
            <div className="text-sm font-bold">~/.password-store</div>
          </div>
        </Card>
      </div>

      {output && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">{output}</div>
      )}

      {showAdd && (
        <Card className="border-primary/30">
          <div className="mb-3 text-sm font-medium">New Password</div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Path (e.g. email/work)"
              value={addPath}
              onChange={(e) => setAddPath(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setAddMode("insert")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${addMode === "insert" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setAddMode("generate")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${addMode === "generate" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
              >
                Generate
              </button>
            </div>
            {addMode === "insert" ? (
              <textarea
                placeholder={"password\nusername: user@email.com\nurl: https://..."}
                value={addContent}
                onChange={(e) => setAddContent(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Length:</span>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={genLen}
                  onChange={(e) => setGenLen(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="font-mono text-sm w-8">{genLen}</span>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={addMode === "insert" ? insert : generate} className="btn-primary">
                {addMode === "insert" ? "Save" : "Generate & Copy"}
              </button>
            </div>
          </div>
        </Card>
      )}

      <SearchInput value={search} onChange={setSearch} placeholder="Search passwords..." />

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1 max-h-[500px] overflow-y-auto p-0">
          <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Entries ({filtered.length})
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {loading
                ? "Loading..."
                : entries.length === 0
                  ? "No passwords found. Install 'pass' and set up a GPG key."
                  : "No matching entries."}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((e) => (
                <button
                  key={e.path}
                  onClick={() => select(e.path)}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors ${
                    selected === e.path ? "bg-muted text-foreground" : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <KeyRound size={14} className="flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{e.path}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="col-span-2">
          {selected && detail ? (
            <Card className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-lg font-semibold">{selected}</h3>
                  {detail.username && <div className="text-sm text-muted-foreground">{detail.username}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copy(selected)} className="btn-secondary flex items-center gap-1.5 text-xs">
                    <Copy size={12} />
                    Copy
                  </button>
                  <button onClick={() => del(selected)} className="btn-danger flex items-center gap-1.5 text-xs">
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs text-muted-foreground">Password</div>
                <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 font-mono text-sm">
                  <span className="flex-1 break-all">
                    {showPw ? detail.password : "•".repeat(Math.min(detail.password.length, 32))}
                  </span>
                  <button
                    onClick={() => setShowPw(!showPw)}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {Object.keys(detail.fields).length > 0 && (
                <div>
                  <div className="mb-2 text-xs text-muted-foreground">Fields</div>
                  <div className="space-y-1.5">
                    {Object.entries(detail.fields).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5"
                      >
                        <Badge>{key}</Badge>
                        <span className="flex-1 truncate text-sm font-mono">{val}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(val);
                            setOutput(`Copied ${key}`);
                            setTimeout(() => setOutput(""), 1500);
                          }}
                          aria-label={`Copy ${key}`}
                          className="btn-ghost p-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <details className="group">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Raw output
                </summary>
                <Output maxHeight="max-h-[200px]">{detail.full}</Output>
              </details>
            </Card>
          ) : (
            <Card className="flex h-64 items-center justify-center">
              <div className="text-center">
                <FolderLock size={48} className="mx-auto mb-3 text-muted-foreground/30" />
                <div className="text-sm text-muted-foreground">Select an entry to view details</div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
