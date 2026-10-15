import { useAppStore } from "../store/app";

export default function Toast() {
  const toast = useAppStore((s) => s.toast);
  const clear = useAppStore((s) => s.clearToast);
  if (!toast) return null;
  const tone =
    toast.tone === "err"
      ? "bg-red-900/90 border-red-700 text-red-100"
      : "bg-emerald-900/90 border-emerald-700 text-emerald-100";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-md border ${tone} shadow-xl text-sm backdrop-blur`}
      onClick={clear}
    >
      {toast.message}
    </div>
  );
}
