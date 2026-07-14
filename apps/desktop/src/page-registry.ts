import {
  Battery,
  BookOpen,
  Bot,
  Brain,
  Camera,
  Clock,
  Cpu,
  FileText,
  FolderGit2,
  FolderLock,
  HardDrive,
  LayoutDashboard,
  Lightbulb,
  Monitor,
  Package,
  Play,
  Settings2,
  Wifi,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";
import { AutostartPage } from "./pages/Autostart";
import { BatteryPage } from "./pages/Battery";
import { ChatPage } from "./pages/Chat";
import { CronPage } from "./pages/Cron";
import { DashboardPage } from "./pages/Dashboard";
import { DisksPage } from "./pages/Disks";
import { DocsPage } from "./pages/Docs";
import { GpuPage } from "./pages/Gpu";
import { HardwarePage } from "./pages/Hardware";
import { LlmPage } from "./pages/Llm";
import { LogsPage } from "./pages/Logs";
import { NetworkPage } from "./pages/Network";
import { PackagesPage } from "./pages/Packages";
import { PasswordsPage } from "./pages/Passwords";
import { ProjectsPage } from "./pages/Projects";
import { RgbPage } from "./pages/Rgb";
import { ServicesPage } from "./pages/Services";
import { SettingsPage } from "./pages/Settings";
import { SnapshotsPage } from "./pages/Snapshots";

export const PAGE_GROUPS = [
  {
    label: "Overview",
    pages: [
      { id: "dashboard", navLabel: "Dashboard", title: "Dashboard", icon: LayoutDashboard, component: DashboardPage },
      { id: "projects", navLabel: "Projects", title: "Projects", icon: FolderGit2, component: ProjectsPage },
      { id: "packages", navLabel: "Packages", title: "Package Manager", icon: Package, component: PackagesPage },
      { id: "hardware", navLabel: "Hardware", title: "Hardware Monitor", icon: Cpu, component: HardwarePage },
      { id: "gpu", navLabel: "GPU", title: "GPU Monitor", icon: Monitor, component: GpuPage },
    ],
  },
  {
    label: "System",
    pages: [
      { id: "snapshots", navLabel: "Snapshots", title: "Btrfs Snapshots", icon: Camera, component: SnapshotsPage },
      { id: "services", navLabel: "Services", title: "System Services", icon: Settings2, component: ServicesPage },
      { id: "autostart", navLabel: "Autostart", title: "Autostart Entries", icon: Play, component: AutostartPage },
      { id: "cron", navLabel: "Cron & Timers", title: "Cron & Timers", icon: Clock, component: CronPage },
    ],
  },
  {
    label: "Peripherals",
    pages: [
      { id: "disks", navLabel: "Disks", title: "Disk Usage", icon: HardDrive, component: DisksPage },
      { id: "network", navLabel: "Network", title: "Network Connections", icon: Wifi, component: NetworkPage },
      { id: "battery", navLabel: "Battery & BT", title: "Battery & Bluetooth", icon: Battery, component: BatteryPage },
      { id: "rgb", navLabel: "RGB", title: "RGB Control", icon: Lightbulb, component: RgbPage },
      { id: "logs", navLabel: "Logs", title: "System Logs", icon: FileText, component: LogsPage },
    ],
  },
  {
    label: "Assistant",
    pages: [
      { id: "chat", navLabel: "Agent Chat", title: "AI Assistant", icon: Bot, component: ChatPage },
      { id: "llm", navLabel: "Tesseract MoE", title: "Tesseract MoE LLM", icon: Brain, component: LlmPage },
      { id: "passwords", navLabel: "Passwords", title: "Password Vault", icon: FolderLock, component: PasswordsPage },
      { id: "docs", navLabel: "Docs", title: "Docs", icon: BookOpen, component: DocsPage },
      { id: "settings", navLabel: "Settings", title: "Settings", icon: Wrench, component: SettingsPage },
    ],
  },
] as const;

export type PageId = (typeof PAGE_GROUPS)[number]["pages"][number]["id"];
export type PageDefinition = {
  id: PageId;
  navLabel: string;
  title: string;
  icon: ComponentType<{ size?: number }>;
  component: ComponentType;
};

export const PAGE_BY_ID = Object.fromEntries(
  PAGE_GROUPS.flatMap((group) => group.pages).map((page) => [page.id, page]),
) as Record<PageId, PageDefinition>;
