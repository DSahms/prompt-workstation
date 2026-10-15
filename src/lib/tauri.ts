import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import type {
  LlmSettings,
  PromptItem,
  TriageEnrichResult,
  TriageLevel1Result,
} from "../types";

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const listPrompts = (): Promise<PromptItem[]> =>
  invoke<PromptItem[]>("list_prompts");

export const listFavorites = (): Promise<PromptItem[]> =>
  invoke<PromptItem[]>("list_favorites");

export const getPrompt = (id: string): Promise<PromptItem> =>
  invoke<PromptItem>("get_prompt", { id });

export const savePrompt = (prompt: PromptItem): Promise<PromptItem> =>
  invoke<PromptItem>("save_prompt", { prompt });

export const deletePrompt = (id: string): Promise<void> =>
  invoke<void>("delete_prompt", { id });

export const toggleFavorite = (id: string, favorite: boolean): Promise<void> =>
  invoke<void>("toggle_favorite", { id, favorite });

// ---------------------------------------------------------------------------
// Markdown import / export (uses native file dialog)
// ---------------------------------------------------------------------------

export async function importMarkdownFile(): Promise<PromptItem | null> {
  const path = await openDialog({
    multiple: false,
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
  });
  if (!path || typeof path !== "string") return null;
  return invoke<PromptItem>("import_markdown_file", { path });
}

export async function exportMarkdownFile(prompt: PromptItem): Promise<void> {
  const safeTitle = prompt.title
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "prompt";
  const path = await saveDialog({
    defaultPath: `${safeTitle}.md`,
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!path) return;
  await invoke<void>("export_markdown_file", { prompt, path });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const getSettings = (): Promise<LlmSettings> =>
  invoke<LlmSettings>("get_settings");

export const saveSettings = (settings: LlmSettings): Promise<LlmSettings> =>
  invoke<LlmSettings>("save_settings", { settings });

export const checkEndpointHealth = (
  baseUrl: string,
  apiKey: string,
): Promise<unknown> =>
  invoke<unknown>("check_endpoint_health", { baseUrl, apiKey });

export const testChat = (prompt: string): Promise<string> =>
  invoke<string>("test_chat", { prompt });

// ---------------------------------------------------------------------------
// Triage engine
// ---------------------------------------------------------------------------

export const triageLevel1 = (seed: string): Promise<TriageLevel1Result> =>
  invoke<TriageLevel1Result>("triage_level1", { seed });

export const triageEnrich = (
  seed: string,
  subjectName: string,
  geographicScope: string,
  entityClass: string,
  entityTaxonomy: string,
): Promise<TriageEnrichResult> =>
  invoke<TriageEnrichResult>("triage_enrich", { seed, subjectName, geographicScope, entityClass, entityTaxonomy });

export const triageLevel3Stream = (
  seed: string,
  level1: TriageLevel1Result,
  answers: string[],
  persona: string,
): Promise<string> =>
  invoke<string>("triage_level3_stream", { seed, level1, answers, persona });

// ---------------------------------------------------------------------------
// Event listeners for streaming
// ---------------------------------------------------------------------------

export function onStreamEvent(
  eventName: string,
  handler: (chunk: string) => void,
): Promise<UnlistenFn> {
  return listen<string>(eventName, (e) => handler(e.payload));
}
