import { ChevronLeft, Menu, Moon, Sun } from "lucide-react";
import { Activity, useEffect, useState } from "react";
import { isDemoMode } from "./api";
import BrandLogo from "./components/brand-logo";
import PoweredByBadge from "./components/powered-by-badge";
import { BRAND_NAME, BRAND_TAGLINE } from "./lib/branding";
import type { ThemeMode } from "./lib/theme";
import { applyMode, getStoredMode, initTheme } from "./lib/theme";
import { PAGE_BY_ID, PAGE_GROUPS, type PageId } from "./page-registry";

const KEYBOARD_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function LiveClock({ dateOnly = false }: { dateOnly?: boolean }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), dateOnly ? 60_000 : 1_000);
    return () => clearInterval(id);
  }, [dateOnly]);

  return dateOnly
    ? now.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function App() {
  const [page, setPage] = useState<PageId>("dashboard");
  // Pages visited this session stay mounted inside <Activity mode="hidden">:
  // their state (search filters, scroll, expanded rows) survives navigation
  // while React unmounts their effects — polling stops on hidden pages.
  const [visited, setVisited] = useState<ReadonlySet<PageId>>(new Set<PageId>(["dashboard"]));
  const [collapsed, setCollapsed] = useState(false);

  const navigate = (id: PageId) => {
    setVisited((v) => (v.has(id) ? v : new Set(v).add(id)));
    setPage(id);
  };
  const [mode, setMode] = useState<ThemeMode>(getStoredMode());

  useEffect(() => {
    initTheme();
  }, []);

  const toggleMode = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyMode(next);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`flex flex-shrink-0 flex-col border-r border-border bg-card transition-all duration-200 ${
          collapsed ? "w-14" : "w-60"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center text-foreground">
                <BrandLogo size={28} />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">{BRAND_NAME}</div>
                <div className="text-xs text-muted-foreground">{BRAND_TAGLINE}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors ${KEYBOARD_FOCUS}`}
          >
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {PAGE_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.pages.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    aria-current={page === item.id ? "page" : undefined}
                    title={collapsed ? item.navLabel : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                      page === item.id
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    } ${collapsed ? "justify-center" : ""} ${KEYBOARD_FOCUS}`}
                  >
                    <span className="flex-shrink-0">
                      <item.icon size={18} />
                    </span>
                    {!collapsed && item.navLabel}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border px-3 py-3 flex flex-col gap-2">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-mono">
                  <LiveClock />
                </span>
                <span className="text-xs text-muted-foreground">Arch Linux</span>
              </div>
              <button
                onClick={toggleMode}
                className={`flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors ${KEYBOARD_FOCUS}`}
                title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {mode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleMode}
                className={`flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors ${KEYBOARD_FOCUS}`}
                title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {mode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <span className="text-xs text-muted-foreground font-mono">
                <LiveClock />
              </span>
            </div>
          )}
          {!collapsed && <PoweredByBadge />}
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <h2 className="text-sm font-semibold">{PAGE_BY_ID[page].title}</h2>
          <div className="flex items-center gap-3">
            {isDemoMode && (
              <span
                data-testid="mock-mode-banner"
                title="Not running inside the Electron app — showing mock data, not your real system."
                className="rounded-md border border-warning bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning-foreground"
              >
                Demo data (browser mode)
              </span>
            )}
            <span className="text-xs text-muted-foreground font-mono">
              <LiveClock dateOnly />
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 h-full">
            {/* Active page first in DOM order: text queries (and assistive tech
                reading order) resolve to the visible instance, not a hidden one.
                React preserves instances across reorder via the stable key. */}
            {[...visited]
              .sort((a, b) => (a === page ? -1 : b === page ? 1 : 0))
              .map((id) => {
                const PageComponent = PAGE_BY_ID[id].component;
                return (
                  <Activity key={id} mode={id === page ? "visible" : "hidden"}>
                    <PageComponent />
                  </Activity>
                );
              })}
          </div>
        </main>
      </div>
    </div>
  );
}
