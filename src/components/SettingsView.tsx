import { useEffect, useState } from "react";
import {
  Server,
  Save,
  Activity,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useAppStore } from "../store/app";
import type { LlmSettings } from "../types";
import * as api from "../lib/tauri";

const DEFAULTS: LlmSettings = {
  freellmBaseUrl: "http://127.0.0.1:31415/v1",
  freellmApiKey: "freellmapi-2b17fe48864ac41d5db3c181a0332bd0275556e58e8ae16a",
  freellmModel: "auto",
  koboldcppBaseUrl: "http://127.0.0.1:5001/v1",
  koboldcppModel: "koboldcpp/gemma-4-E4B-it-Q8_0",
  activeEndpoint: "freellm",
};

type HealthState = "idle" | "checking" | "ok" | "err";

export default function SettingsView() {
  const settings = useAppStore((s) => s.settings);
  const persist = useAppStore((s) => s.persistSettings);
  const notify = useAppStore((s) => s.notify);

  const [form, setForm] = useState<LlmSettings>(settings ?? DEFAULTS);
  const [health, setHealth] = useState<Record<string, HealthState>>({
    freellm: "idle",
    koboldcpp: "idle",
  });
  const [chatTest, setChatTest] = useState<{
    state: HealthState;
    msg: string;
  }>({ state: "idle", msg: "" });
  const [chatPrompt, setChatPrompt] = useState("Say hello in one short sentence.");

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  function update<K extends keyof LlmSettings>(key: K, value: LlmSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    try {
      await persist(form);
      notify("Settings saved");
    } catch (e) {
      notify(`Save failed: ${String(e)}`, "err");
    }
  }

  async function checkHealth(endpoint: "freellm" | "koboldcpp") {
    setHealth((h) => ({ ...h, [endpoint]: "checking" }));
    try {
      const baseUrl =
        endpoint === "freellm" ? form.freellmBaseUrl : form.koboldcppBaseUrl;
      const apiKey = endpoint === "freellm" ? form.freellmApiKey : "";
      await api.checkEndpointHealth(baseUrl, apiKey);
      setHealth((h) => ({ ...h, [endpoint]: "ok" }));
      notify(`Health check passed for ${endpoint}`, "ok");
    } catch (e) {
      setHealth((h) => ({ ...h, [endpoint]: "err" }));
      notify(`Health check failed for ${endpoint}: ${String(e)}`, "err");
    }
  }

  async function runChatTest() {
    setChatTest({ state: "checking", msg: "" });
    try {
      // Make sure current form is persisted before test
      await persist(form);
      const out = await api.testChat(chatPrompt);
      setChatTest({ state: "ok", msg: out });
    } catch (e) {
      setChatTest({ state: "err", msg: String(e) });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg-900">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <header className="mb-8 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center">
            <Server size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Settings & Endpoints</h1>
            <p className="text-sm text-ink-faint">
              Pre-configured for local LLMs. Override any field as needed.
            </p>
          </div>
        </header>

        {/* Active endpoint selector */}
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-ink-faint mb-2">
            Active Endpoint
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <EndpointToggle
              label="FreeLLM Local Proxy"
              active={form.activeEndpoint === "freellm"}
              onClick={() => update("activeEndpoint", "freellm")}
            />
            <EndpointToggle
              label="KoboldCPP (Gemma-4-E4B-it)"
              active={form.activeEndpoint === "koboldcpp"}
              onClick={() => update("activeEndpoint", "koboldcpp")}
            />
          </div>
        </section>

        {/* FreeLLM */}
        <EndpointCard
          title="FreeLLM Local API Proxy"
          subtitle="Default: http://127.0.0.1:31415/v1"
          health={health.freellm}
          onCheck={() => checkHealth("freellm")}
        >
          <Field
            label="Base URL"
            value={form.freellmBaseUrl}
            onChange={(v) => update("freellmBaseUrl", v)}
            mono
          />
          <Field
            label="Authorization Key"
            value={form.freellmApiKey}
            onChange={(v) => update("freellmApiKey", v)}
            mono
            type="password"
          />
          <Field
            label="Model Identifier"
            value={form.freellmModel}
            onChange={(v) => update("freellmModel", v)}
            mono
          />
        </EndpointCard>

        {/* KoboldCPP */}
        <EndpointCard
          title="KoboldCPP Local Engine"
          subtitle="Default: http://127.0.0.1:5001/v1"
          health={health.koboldcpp}
          onCheck={() => checkHealth("koboldcpp")}
        >
          <Field
            label="Base URL"
            value={form.koboldcppBaseUrl}
            onChange={(v) => update("koboldcppBaseUrl", v)}
            mono
          />
          <Field
            label="Model Identifier"
            value={form.koboldcppModel}
            onChange={(v) => update("koboldcppModel", v)}
            mono
          />
          <p className="text-[11px] text-ink-faint">
            KoboldCPP typically requires no Authorization header.
          </p>
        </EndpointCard>

        {/* Chat test */}
        <section className="mb-8 bg-bg-800 border border-edge rounded-lg p-5">
          <h2 className="text-sm font-semibold text-ink mb-1">Live Chat Test</h2>
          <p className="text-xs text-ink-faint mb-3">
            Sends a single non-streaming request through the active endpoint.
          </p>
          <textarea
            value={chatPrompt}
            onChange={(e) => setChatPrompt(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60 resize-none mb-2"
          />
          <button
            onClick={runChatTest}
            disabled={chatTest.state === "checking"}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {chatTest.state === "checking" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
            Send Test
          </button>
          {chatTest.state !== "idle" && (
            <div
              className={`mt-3 px-3 py-2 rounded-md text-xs font-mono break-words ${
                chatTest.state === "ok"
                  ? "bg-emerald-900/30 border border-emerald-700/40 text-emerald-200"
                  : chatTest.state === "err"
                    ? "bg-red-900/30 border border-red-700/40 text-red-200"
                    : "bg-bg-700 border border-edge text-ink-muted"
              }`}
            >
              {chatTest.state === "checking"
                ? "Waiting for response..."
                : chatTest.msg}
            </div>
          )}
        </section>

        {/* Save bar */}
        <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-bg-900/95 backdrop-blur border-t border-edge flex items-center justify-end gap-2">
          <button
            onClick={() => setForm(DEFAULTS)}
            className="px-3 py-1.5 text-xs rounded-md bg-bg-700 border border-edge hover:bg-bg-600"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-md bg-accent text-white hover:bg-accent-hover"
          >
            <Save size={13} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function EndpointToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-left rounded-lg border transition-colors ${
        active
          ? "bg-accent-soft border-accent/50"
          : "bg-bg-800 border-edge hover:bg-bg-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        {active && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-white">
            ACTIVE
          </span>
        )}
      </div>
    </button>
  );
}

function EndpointCard({
  title,
  subtitle,
  health,
  onCheck,
  children,
}: {
  title: string;
  subtitle: string;
  health: HealthState;
  onCheck: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 bg-bg-800 border border-edge rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="text-[11px] text-ink-faint font-mono">{subtitle}</p>
        </div>
        <button
          onClick={onCheck}
          disabled={health === "checking"}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-bg-700 border border-edge hover:bg-bg-600 disabled:opacity-50"
        >
          {health === "checking" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : health === "ok" ? (
            <CheckCircle2 size={12} className="text-emerald-400" />
          ) : health === "err" ? (
            <XCircle size={12} className="text-red-400" />
          ) : (
            <Activity size={12} />
          )}
          {health === "checking"
            ? "Checking..."
            : health === "ok"
              ? "Healthy"
              : health === "err"
                ? "Unreachable"
                : "Check Health"}
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  mono,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-ink-faint mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-1.5 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60 ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}
