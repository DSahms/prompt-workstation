import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Download,
  Save,
  Trash2,
  Pencil,
  Eye,
  Code,
  FileText,
  Wand2,
} from "lucide-react";
import { useAppStore } from "../store/app";
import type { PromptItem } from "../types";
import { substituteVariables } from "../lib/markdown";
import * as api from "../lib/tauri";
import MarkdownRenderer from "./MarkdownRenderer";
import VariableForm from "./VariableForm";
import LivePreview from "./LivePreview";
import MetadataEditor from "./MetadataEditor";

type RightTab = "preview" | "raw" | "metadata";
type LeftTab = "view" | "edit" | "vars";

interface Props {
  prompt: PromptItem | null;
}

export default function DetailPane({ prompt }: Props) {
  const upsertPrompt = useAppStore((s) => s.upsertPrompt);
  const removePrompt = useAppStore((s) => s.removePrompt);
  const selectPrompt = useAppStore((s) => s.selectPrompt);
  const notify = useAppStore((s) => s.notify);

  const [draft, setDraft] = useState<PromptItem | null>(prompt);
  const [values, setValues] = useState<Record<string, string>>({});
  const [leftTab, setLeftTab] = useState<LeftTab>("view");
  const [rightTab, setRightTab] = useState<RightTab>("preview");
  const [dirty, setDirty] = useState(false);

  // Re-seed local state whenever selection changes.
  useEffect(() => {
    setDraft(prompt);
    setValues({});
    setDirty(false);
    setLeftTab("view");
    setRightTab("preview");
  }, [prompt?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const injected = useMemo(
    () => (draft ? substituteVariables(draft.content, values) : ""),
    [draft, values],
  );

  function patch(p: Partial<PromptItem>) {
    if (!draft) return;
    setDraft({ ...draft, ...p });
    setDirty(true);
  }

  async function handleSave() {
    if (!draft) return;
    try {
      const saved = await upsertPrompt(draft);
      setDraft(saved);
      setDirty(false);
      selectPrompt(saved.id);
      notify("Prompt saved");
    } catch (e) {
      notify(`Save failed: ${String(e)}`, "err");
    }
  }

  async function handleCopy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(injected);
      notify("Injected prompt copied to clipboard");
    } catch (e) {
      notify(`Copy failed: ${String(e)}`, "err");
    }
  }

  async function handleExport() {
    if (!draft) return;
    try {
      await api.exportMarkdownFile(draft);
      notify("Exported markdown");
    } catch (e) {
      notify(`Export failed: ${String(e)}`, "err");
    }
  }

  async function handleDelete() {
    if (!draft) return;
    if (!confirm(`Delete "${draft.title}"? This cannot be undone.`)) return;
    try {
      await removePrompt(draft.id);
      selectPrompt(null);
      notify("Prompt deleted");
    } catch (e) {
      notify(`Delete failed: ${String(e)}`, "err");
    }
  }

  if (!draft) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-ink-faint">
        <FileText size={36} className="mb-3 opacity-40" />
        <p className="text-sm">Select a prompt from the catalog</p>
        <p className="text-xs mt-1">or create a new one with the + button.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-900 overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-edge flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-ink truncate">
            {draft.title || "Untitled"}
          </h1>
          <p className="text-[11px] text-ink-faint">
            {draft.domain} ·{" "}
            {draft.detectedVariables.length} variable
            {draft.detectedVariables.length === 1 ? "" : "s"} ·{" "}
            {new Date(draft.lastModified || Date.now()).toLocaleString()}
            {dirty && <span className="text-amber-400 ml-2">● unsaved</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            disabled={!injected}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-bg-700 border border-edge hover:bg-bg-600 disabled:opacity-40"
          >
            <Copy size={13} /> Copy
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-bg-700 border border-edge hover:bg-bg-600"
          >
            <Download size={13} /> Export
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-accent text-white hover:bg-accent-hover"
          >
            <Save size={13} /> Save
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-md bg-bg-700 border border-edge text-ink-muted hover:text-red-400 hover:bg-bg-600"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Split workspace */}
      <div className="flex-1 grid grid-cols-2 overflow-hidden">
        {/* LEFT: editor / view */}
        <div className="flex flex-col border-r border-edge overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-edge-soft bg-bg-800">
            <TabBtn active={leftTab === "view"} onClick={() => setLeftTab("view")}>
              <Eye size={12} /> View
            </TabBtn>
            <TabBtn active={leftTab === "edit"} onClick={() => setLeftTab("edit")}>
              <Code size={12} /> Edit
            </TabBtn>
            <TabBtn active={leftTab === "vars"} onClick={() => setLeftTab("vars")}>
              <Wand2 size={12} /> Variables
            </TabBtn>
          </div>
          <div className="flex-1 overflow-hidden">
            {leftTab === "view" && (
              <div className="h-full overflow-y-auto px-5 py-4">
                <MarkdownRenderer content={draft.content} />
              </div>
            )}
            {leftTab === "edit" && (
              <textarea
                value={draft.content}
                onChange={(e) => patch({ content: e.target.value })}
                spellCheck={false}
                className="w-full h-full px-5 py-4 bg-bg-900 text-ink font-mono text-[13px] leading-relaxed resize-none focus:outline-none border-0"
                placeholder="Write your prompt template here. Use [VARIABLE_NAME] or {{VARIABLE_NAME}} for placeholders."
              />
            )}
            {leftTab === "vars" && (
              <div className="h-full overflow-y-auto px-5 py-4">
                <h3 className="text-xs uppercase tracking-wider text-ink-faint mb-3">
                  Variable Inputs
                </h3>
                <VariableForm
                  prompt={draft}
                  values={values}
                  onChange={(name, value) =>
                    setValues((v) => ({ ...v, [name]: value }))
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: live preview / raw / metadata */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-edge-soft bg-bg-800">
            <TabBtn
              active={rightTab === "preview"}
              onClick={() => setRightTab("preview")}
            >
              <Eye size={12} /> Live Preview
            </TabBtn>
            <TabBtn active={rightTab === "raw"} onClick={() => setRightTab("raw")}>
              <Code size={12} /> Injected (raw)
            </TabBtn>
            <TabBtn
              active={rightTab === "metadata"}
              onClick={() => setRightTab("metadata")}
            >
              <Pencil size={12} /> Metadata
            </TabBtn>
          </div>
          <div className="flex-1 overflow-hidden">
            {rightTab === "preview" && (
              <LivePreview prompt={draft} values={values} injected />
            )}
            {rightTab === "raw" && (
              <pre className="h-full overflow-y-auto px-5 py-4 text-[12px] font-mono text-ink whitespace-pre-wrap break-words">
                {injected || "_Fill in variables on the left to see injected output._"}
              </pre>
            )}
            {rightTab === "metadata" && (
              <div className="h-full overflow-y-auto px-5 py-4">
                <MetadataEditor prompt={draft} onPatch={patch} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-wider rounded transition-colors ${
        active
          ? "bg-bg-700 text-ink border border-edge"
          : "text-ink-faint hover:text-ink-muted border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}
