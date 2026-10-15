import { create } from "zustand";
import type { LlmSettings, PromptItem, ViewKey } from "../types";
import * as api from "../lib/tauri";

interface AppState {
  // Navigation
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // Catalog data
  prompts: PromptItem[];
  favorites: PromptItem[];
  selectedId: string | null;
  loadingCatalog: boolean;
  refreshCatalog: () => Promise<void>;
  selectPrompt: (id: string | null) => void;
  removePrompt: (id: string) => Promise<void>;
  upsertPrompt: (p: PromptItem) => Promise<PromptItem>;
  toggleFav: (id: string, current: boolean) => Promise<void>;

  // Settings
  settings: LlmSettings | null;
  loadSettings: () => Promise<void>;
  persistSettings: (s: LlmSettings) => Promise<void>;

  // Toasts
  toast: { message: string; tone: "ok" | "err" } | null;
  notify: (message: string, tone?: "ok" | "err") => void;
  clearToast: () => void;
}

const DEFAULT_SETTINGS: LlmSettings = {
  freellmBaseUrl: "http://127.0.0.1:31415/v1",
  freellmApiKey: "freellmapi-2b17fe48864ac41d5db3c181a0332bd0275556e58e8ae16a",
  freellmModel: "auto",
  koboldcppBaseUrl: "http://127.0.0.1:5001/v1",
  koboldcppModel: "koboldcpp/gemma-4-E4B-it-Q8_0",
  activeEndpoint: "freellm",
};

export const useAppStore = create<AppState>((set, get) => ({
  view: "catalog",
  setView: (v) => set({ view: v, selectedId: null }),

  prompts: [],
  favorites: [],
  selectedId: null,
  loadingCatalog: false,

  refreshCatalog: async () => {
    set({ loadingCatalog: true });
    try {
      const [prompts, favorites] = await Promise.all([
        api.listPrompts(),
        api.listFavorites(),
      ]);
      set({ prompts, favorites, loadingCatalog: false });
    } catch (e) {
      set({ loadingCatalog: false });
      get().notify(`Failed to load catalog: ${String(e)}`, "err");
    }
  },

  selectPrompt: (id) => set({ selectedId: id }),

  removePrompt: async (id) => {
    await api.deletePrompt(id);
    await get().refreshCatalog();
    if (get().selectedId === id) set({ selectedId: null });
  },

  upsertPrompt: async (p) => {
    const saved = await api.savePrompt(p);
    await get().refreshCatalog();
    set({ selectedId: saved.id });
    return saved;
  },

  toggleFav: async (id, current) => {
    await api.toggleFavorite(id, !current);
    await get().refreshCatalog();
  },

  settings: null,
  loadSettings: async () => {
    try {
      const s = await api.getSettings();
      // Ensure freellmModel has a value, fallback to "auto" if empty
      const settingsWithAutoFallback = {
        ...s,
        freellmModel: s.freellmModel || "auto",
        koboldcppModel: s.koboldcppModel || "koboldcpp/gemma-4-E4B-it-Q8_0",
      };
      set({ settings: settingsWithAutoFallback });
    } catch {
      set({ settings: DEFAULT_SETTINGS });
    }
  },
  persistSettings: async (s) => {
    const saved = await api.saveSettings(s);
    set({ settings: saved });
  },

  toast: null,
  notify: (message, tone = "ok") => {
    set({ toast: { message, tone } });
    setTimeout(() => set({ toast: null }), 3500);
  },
  clearToast: () => set({ toast: null }),
}));
