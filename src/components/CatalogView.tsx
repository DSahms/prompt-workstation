import { useMemo, useState } from "react";
import { Search, Star, Trash2, Plus, Upload, FileText } from "lucide-react";
import { useAppStore } from "../store/app";
import type { Domain, PromptItem } from "../types";
import * as api from "../lib/tauri";

const DOMAIN_OPTIONS: (Domain | "All")[] = [
  "All",
  "Code",
  "Writing",
  "Planning",
  "Architecture",
  "General",
];

const DOMAIN_COLORS: Record<Domain, string> = {
  Code: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  Writing: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Planning: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Architecture: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  General: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

interface Props {
  onlyFavorites: boolean;
  prompts: PromptItem[];
}

export default function CatalogView({ onlyFavorites, prompts }: Props) {
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<Domain | "All">("All");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const selectedId = useAppStore((s) => s.selectedId);
  const selectPrompt = useAppStore((s) => s.selectPrompt);
  const refreshCatalog = useAppStore((s) => s.refreshCatalog);
  const toggleFav = useAppStore((s) => s.toggleFav);
  const removePrompt = useAppStore((s) => s.removePrompt);
  const upsertPrompt = useAppStore((s) => s.upsertPrompt);
  const notify = useAppStore((s) => s.notify);
  const setView = useAppStore((s) => s.setView);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    prompts.forEach((p) => p.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [prompts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prompts.filter((p) => {
      if (domainFilter !== "All" && p.domain !== domainFilter) return false;
      if (tagFilter && !p.tags.includes(tagFilter)) return false;
      if (!q) return true;
      const haystack = [
        p.title,
        p.description ?? "",
        p.content,
        p.domain,
        p.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [prompts, query, domainFilter, tagFilter]);

  async function handleNewPrompt() {
    const item: PromptItem = {
      id: "",
      title: "Untitled Prompt",
      description: "",
      content: "",
      domain: "General",
      tags: [],
      detectedVariables: [],
      createdAt: "",
      lastModified: "",
      isFavorite: false,
      origin: "manual_entry",
    };
    const saved = await upsertPrompt(item);
    selectPrompt(saved.id);
    notify("New prompt created");
  }

  async function handleImport() {
    try {
      const imported = await api.importMarkdownFile();
      if (!imported) return;
      const saved = await upsertPrompt(imported);
      selectPrompt(saved.id);
      notify(`Imported: ${saved.title}`);
    } catch (e) {
      notify(`Import failed: ${String(e)}`, "err");
    }
  }

  return (
    <div className="w-[30%] min-w-[340px] max-w-[520px] flex flex-col bg-bg-800 border-r border-edge">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-edge">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            {onlyFavorites ? "Favorites" : "Catalog Library"}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleImport}
              title="Import markdown"
              className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-bg-700 transition-colors"
            >
              <Upload size={15} />
            </button>
            <button
              onClick={handleNewPrompt}
              title="New prompt"
              className="p-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, content, tags..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60 placeholder:text-ink-faint"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {DOMAIN_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDomainFilter(d)}
              className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
                domainFilter === d
                  ? "bg-accent text-white border-accent"
                  : "bg-bg-700 text-ink-muted border-edge hover:text-ink"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {allTags.slice(0, 12).map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(tagFilter === t ? null : t)}
                className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
                  tagFilter === t
                    ? "bg-accent text-white border-accent"
                    : "bg-transparent text-ink-faint border-edge hover:text-ink-muted"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 text-ink-faint">
            <FileText size={28} className="mb-2 opacity-50" />
            <p className="text-sm">No prompts match.</p>
            <button
              onClick={() => setView("triage")}
              className="mt-3 text-xs text-accent hover:underline"
            >
              Generate one with Triage →
            </button>
          </div>
        )}
        <ul className="space-y-1">
          {filtered.map((p) => (
            <li
              key={p.id}
              onClick={() => selectPrompt(p.id)}
              className={`group cursor-pointer rounded-md border px-3 py-2.5 transition-colors ${
                selectedId === p.id
                  ? "bg-accent-soft border-accent/40"
                  : "bg-bg-700 border-edge hover:border-edge/60 hover:bg-bg-600"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 text-[10px] px-1.5 py-0.5 rounded border ${DOMAIN_COLORS[p.domain]}`}
                >
                  {p.domain}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">
                    {p.title}
                  </div>
                  {p.description && (
                    <div className="text-xs text-ink-faint truncate mt-0.5">
                      {p.description}
                    </div>
                  )}
                  {p.detectedVariables.length > 0 && (
                    <div className="text-[10px] text-ink-faint mt-1 font-mono">
                      {p.detectedVariables.length} var
                      {p.detectedVariables.length === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(p.id, p.isFavorite);
                    }}
                    className="p-1 rounded hover:bg-bg-900"
                    title="Toggle favorite"
                  >
                    <Star
                      size={13}
                      className={
                        p.isFavorite
                          ? "text-amber-400 fill-amber-400"
                          : "text-ink-faint"
                      }
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${p.title}"?`)) {
                        removePrompt(p.id);
                        notify("Prompt deleted");
                      }
                    }}
                    className="p-1 rounded hover:bg-bg-900 text-ink-faint hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 py-2 border-t border-edge text-[10px] text-ink-faint flex justify-between">
        <span>
          {filtered.length} of {prompts.length}
        </span>
        <button
          onClick={refreshCatalog}
          className="hover:text-ink-muted transition-colors"
        >
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
