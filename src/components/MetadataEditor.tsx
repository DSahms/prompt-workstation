import { useEffect, useMemo, useState } from "react";
import { Tag, Plus, X } from "lucide-react";
import type { Domain, PromptItem } from "../types";
import { extractVariables } from "../lib/markdown";

interface Props {
  prompt: PromptItem | null;
  onPatch: (patch: Partial<PromptItem>) => void;
}

const DOMAINS: Domain[] = [
  "Code",
  "Writing",
  "Planning",
  "Architecture",
  "General",
];

export default function MetadataEditor({ prompt, onPatch }: Props) {
  const [tagInput, setTagInput] = useState("");
  const detectedVars = useMemo(
    () => (prompt?.content ? extractVariables(prompt.content) : []),
    [prompt?.content],
  );

  useEffect(() => {
    if (detectedVars.length && prompt) {
      const merged = Array.from(
        new Set([...(prompt.detectedVariables ?? []), ...detectedVars]),
      );
      if (merged.length !== prompt.detectedVariables.length) {
        onPatch({ detectedVariables: merged });
      }
    }
  }, [detectedVars]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!prompt) return null;

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (!t || !prompt) return;
    if (prompt.tags.includes(t)) {
      setTagInput("");
      return;
    }
    onPatch({ tags: [...prompt.tags, t] });
    setTagInput("");
  }

  function removeTag(t: string) {
    if (!prompt) return;
    onPatch({ tags: prompt.tags.filter((x) => x !== t) });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-ink-faint mb-1">
          Title
        </label>
        <input
          type="text"
          value={prompt.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          className="w-full px-3 py-1.5 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
        />
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wider text-ink-faint mb-1">
          Description
        </label>
        <textarea
          value={prompt.description ?? ""}
          onChange={(e) => onPatch({ description: e.target.value })}
          rows={2}
          className="w-full px-3 py-1.5 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink-faint mb-1">
            Domain
          </label>
          <select
            value={prompt.domain}
            onChange={(e) => onPatch({ domain: e.target.value as Domain })}
            className="w-full px-3 py-1.5 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink-faint mb-1">
            Origin
          </label>
          <input
            type="text"
            value={prompt.origin}
            disabled
            className="w-full px-3 py-1.5 text-sm bg-bg-900 border border-edge rounded-md text-ink-muted"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wider text-ink-faint mb-1">
          Tags
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {prompt.tags.length === 0 && (
            <span className="text-xs text-ink-faint">No tags yet</span>
          )}
          {prompt.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-bg-700 border border-edge rounded-full text-ink-muted"
            >
              <Tag size={10} />
              {t}
              <button
                onClick={() => removeTag(t)}
                className="ml-0.5 hover:text-red-400"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="add tag, press Enter"
            className="flex-1 px-3 py-1.5 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
          />
          <button
            onClick={addTag}
            className="px-3 py-1.5 text-sm bg-bg-700 border border-edge rounded-md hover:bg-bg-600"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wider text-ink-faint mb-1">
          Detected Variables ({detectedVars.length})
        </label>
        <div className="flex flex-wrap gap-1.5">
          {detectedVars.length === 0 && (
            <span className="text-xs text-ink-faint font-mono">
              No variables detected. Use [VAR_NAME] or {"{{VAR_NAME}}"}.
            </span>
          )}
          {detectedVars.map((v) => (
            <span
              key={v}
              className="px-2 py-0.5 text-xs font-mono bg-accent-soft border border-accent/30 rounded text-accent"
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
