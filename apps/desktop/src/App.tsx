import {
  Battery,
  BookOpen,
  Bot,
  Brain,
  Camera,
  ChevronLeft,
  Clock,
  Cpu,
  FileText,
  FolderGit2,
  FolderLock,
  HardDrive,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Monitor,
  Moon,
  Package,
  Play,
  Settings2,
  Sun,
  Wifi,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BRAND_NAME } from "./lib/branding";
import BrandLogo from "./components/brand-logo";
import type { ThemeMode } from "./lib/theme";
import { applyMode, getStoredMode, initTheme } from "./lib/theme";
import { AutostartPage } from "./pages/Autostart";
import { BatteryPage } from "./pages/Battery";
import { ChatPage } from "./pages/Chat";
import { CronPage } from "./pages/Cron";
import { DashboardPage } from "./pages/Dashboard";
import { DisksPage } from "./pages/Disks";
import { DocsPage } from "./pages/Docs";
import { GpuPage } from "./pages/Gpu";
import { HardwarePage } from "./pages/Hardware";
import { LogsPage } from "./pages/Logs";
import { LlmPage } from "./pages/Llm";
import { NetworkPage } from "./pages/Network";
import { PackagesPage } from "./pages/Packages";
import { PasswordsPage } from "./pages/Passwords";
import { ProjectsPage } from "./pages/Projects";
import { RgbPage } from "./pages/Rgb";
import { ServicesPage } from "./pages/Services";
import { SettingsPage } from "./pages/Settings";
import { SnapshotsPage } from "./pages/Snapshots";
import type { PageId } from "./types";

const NAV_GROUPS: { label: string; items: { id: PageId; label: string; icon: React.ReactNode }[] }[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
      { id: "projects", label: "Projects", icon: <FolderGit2 size={18} /> },
      { id: "packages", label: "Packages", icon: <Package size={18} /> },
      { id: "hardware", label: "Hardware", icon: <Cpu size={18} /> },
      { id: "gpu", label: "GPU", icon: <Monitor size={18} /> },
    ],
  },
  {
    label: "System",
    items: [
      { id: "snapshots", label: "Snapshots", icon: <Camera size={18} /> },
      { id: "services", label: "Services", icon: <Settings2 size={18} /> },
      { id: "autostart", label: "Autostart", icon: <Play size={18} /> },
      { id: "cron", label: "Cron & Timers", icon: <Clock size={18} /> },
    ],
  },
  {
    label: "Peripherals",
    items: [
      { id: "disks", label: "Disks", icon: <HardDrive size={18} /> },
      { id: "network", label: "Network", icon: <Wifi size={18} /> },
      { id: "battery", label: "Battery & BT", icon: <Battery size={18} /> },
      { id: "rgb", label: "RGB", icon: <Lightbulb size={18} /> },
      { id: "logs", label: "Logs", icon: <FileText size={18} /> },
    ],
  },
  {
    label: "Assistant",
    items: [
      { id: "chat", label: "Agent Chat", icon: <Bot size={18} /> },
      { id: "llm", label: "Tesseract MoE", icon: <Brain size={18} /> },
      { id: "passwords", label: "Passwords", icon: <FolderLock size={18} /> },
      { id: "docs", label: "Docs", icon: <BookOpen size={18} /> },
      { id: "settings", label: "Settings", icon: <Wrench size={18} /> },
    ],
  },
];

const PAGES: Record<PageId, React.FC> = {
  dashboard: DashboardPage,
  projects: ProjectsPage,
  packages: PackagesPage,
  snapshots: SnapshotsPage,
  services: ServicesPage,
  autostart: AutostartPage,
  cron: CronPage,
  hardware: HardwarePage,
  gpu: GpuPage,
  disks: DisksPage,
  docs: DocsPage,
  network: NetworkPage,
  rgb: RgbPage,
  logs: LogsPage,
  battery: BatteryPage,
  chat: ChatPage,
  llm: LlmPage,
  passwords: PasswordsPage,
  settings: SettingsPage,
};

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  packages: "Package Manager",
  snapshots: "Btrfs Snapshots",
  services: "System Services",
  autostart: "Autostart Entries",
  cron: "Cron & Timers",
  hardware: "Hardware Monitor",
  gpu: "GPU Monitor",
  disks: "Disk Usage",
  docs: "Docs",
  network: "Network Connections",
  rgb: "RGB Control",
  logs: "System Logs",
  battery: "Battery & Bluetooth",
  chat: "AI Assistant",
  llm: "Tesseract MoE LLM",
  passwords: "Password Vault",
  settings: "Settings",
};

export function App() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime] = useState(new Date());
  const [mode, setMode] = useState<ThemeMode>(getStoredMode());

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleMode = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyMode(next);
  };

  const PageComponent = PAGES[page];

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
                <div className="text-xs text-muted-foreground">System Manager</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPage(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                      page === item.id
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border px-3 py-3">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-mono">
                  {time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-xs text-muted-foreground">Arch Linux</span>
              </div>
              <button
                onClick={toggleMode}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {mode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleMode}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {mode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <span className="text-xs text-muted-foreground font-mono">
                {time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <h2 className="text-sm font-semibold">{PAGE_TITLES[page]}</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">
              {time.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 h-full">
            <PageComponent />
          </div>
        </main>
      </div>
    </div>
  );
}
