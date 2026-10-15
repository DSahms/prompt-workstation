import {
  Library,
  Sparkles,
  Star,
  Settings,
  TerminalSquare,
} from "lucide-react";
import { useAppStore } from "../store/app";
import type { ViewKey } from "../types";

const NAV: { key: ViewKey; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: "catalog", label: "Catalog Library", icon: Library as any },
  { key: "triage", label: "Triage & Builder", icon: Sparkles as any },
  { key: "favorites", label: "Favorites", icon: Star as any },
  { key: "settings", label: "Settings / Endpoints", icon: Settings as any },
];

export default function Sidebar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  return (
    <aside className="w-60 shrink-0 bg-bg-800 border-r border-edge flex flex-col">
      <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20">
          <TerminalSquare size={18} className="text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-ink">Prompt Workstation</span>
          <span className="text-[10px] uppercase tracking-wider text-ink-faint">
            Local · Tauri v2
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-accent-soft text-ink border border-accent/40"
                  : "text-ink-muted hover:text-ink hover:bg-bg-700 border border-transparent"
              }`}
            >
              <Icon size={16} className={active ? "text-accent" : ""} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-edge text-[10px] text-ink-faint">
        v0.1.0 · Local LLM only
      </div>
    </aside>
  );
}
