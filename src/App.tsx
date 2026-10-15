import { useEffect } from "react";
import { useAppStore } from "./store/app";
import Sidebar from "./components/Sidebar";
import CatalogView from "./components/CatalogView";
import DetailPane from "./components/DetailPane";
import TriageWizard from "./components/TriageWizard";
import SettingsView from "./components/SettingsView";
import Toast from "./components/Toast";

export default function App() {
  const view = useAppStore((s) => s.view);
  const refreshCatalog = useAppStore((s) => s.refreshCatalog);
  const loadSettings = useAppStore((s) => s.loadSettings);
  const selectedId = useAppStore((s) => s.selectedId);
  const prompts = useAppStore((s) => s.prompts);
  const favorites = useAppStore((s) => s.favorites);

  useEffect(() => {
    refreshCatalog();
    loadSettings();
  }, [refreshCatalog, loadSettings]);

  const selected =
    prompts.find((p) => p.id === selectedId) ??
    favorites.find((p) => p.id === selectedId) ??
    null;

  const isCatalogView = view === "catalog" || view === "favorites";
  const catalogSource = view === "favorites" ? favorites : prompts;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-900 text-ink">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        {isCatalogView && (
          <>
            <CatalogView
              onlyFavorites={view === "favorites"}
              prompts={catalogSource}
            />
            <DetailPane prompt={selected} />
          </>
        )}
        {view === "triage" && <TriageWizard />}
        {view === "settings" && <SettingsView />}
      </main>
      <Toast />
    </div>
  );
}
