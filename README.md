# Prompt Workstation

A standalone, desktop-native **Prompt Generation, Orchestration, and Catalog Workstation** built with **Tauri v2 (Rust)** + **React + TypeScript + Tailwind CSS**.

Runs entirely against local LLM endpoints. No cloud keys required.

---

## Features

- **Local LLM integration** with two pre-configured endpoints (overridable in Settings):
  - FreeLLM Local API Proxy — `http://127.0.0.1:31415/v1`
  - KoboldCPP Local Engine (Gemma-4-E4B-it Q8_0) — `http://127.0.0.1:5001/v1`
- **Catalog Library** with SQLite persistence, full-text search, domain/tag filters, favorites.
- **Markdown + YAML frontmatter** import / export with automatic variable extraction.
- **Dynamic variable form editor** — auto-detects `[VARIABLE_NAME]` and `{{VARIABLE_NAME}}` placeholders and renders live input fields.
- **Live preview** with real-time substitution and markdown rendering (syntax highlighting via `highlight.js`).
- **3-Tier Intelligence Triage Engine**:
  1. **Level 1** — invisible intent parsing (background JSON-mode LLM call).
  2. **Level 2** — refinement wizard surfaces missing-constraint questions.
  3. **Level 3** — master prompt compiler streams the final prompt via Tauri SSE events.
- **Endpoint health check** + live chat test in Settings.

---

## Prerequisites

Install these on your machine before building:

1. **Rust toolchain** (stable, ≥ 1.77) — https://rustup.rs
2. **Node.js** ≥ 18 and npm
3. **Tauri v2 system dependencies** for your OS:
   - **Linux**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
   - **Windows**: Microsoft Visual Studio C++ Build Tools + WebView2 runtime

---

## Install & Run (Dev Mode)

From the project root (`prompt-workstation/`):

```bash
# 1. Install frontend dependencies
npm install

# 2. Run the Tauri desktop app in dev mode
npm run tauri dev
```

This will:
- Start the Vite dev server on `http://localhost:5173`
- Compile the Rust binary in `src-tauri/`
- Launch the desktop window

The first Rust build takes 2-5 minutes (lots of dependencies). Subsequent builds are much faster.

---

## Production Build

```bash
npm run tauri build
```

Outputs platform installers in `src-tauri/target/release/bundle/`.

---

## Project Layout

```
prompt-workstation/
├── package.json                  # Frontend deps + scripts
├── vite.config.ts                # Vite config (port 5173 for Tauri)
├── tailwind.config.js            # Tailwind theme (custom dark palette)
├── tsconfig.json
├── index.html
├── src/                          # React frontend
│   ├── main.tsx
│   ├── App.tsx                   # Layout shell + view router
│   ├── index.css                 # Tailwind + markdown styles
│   ├── types/index.ts            # TypeScript mirror of Rust models
│   ├── lib/
│   │   ├── tauri.ts              # All Tauri IPC bindings
│   │   └── markdown.ts           # Variable extraction + substitution
│   ├── store/app.ts              # Zustand store (prompts, settings, toasts)
│   └── components/
│       ├── Sidebar.tsx
│       ├── CatalogView.tsx       # 30% pane: search, filters, list
│       ├── DetailPane.tsx        # 70% pane: view/edit/vars + live preview
│       ├── MarkdownRenderer.tsx
│       ├── VariableForm.tsx
│       ├── LivePreview.tsx
│       ├── MetadataEditor.tsx
│       ├── TriageWizard.tsx      # 3-step triage engine UI
│       ├── SettingsView.tsx      # Endpoints + health check + chat test
│       └── Toast.tsx
└── src-tauri/                    # Rust backend
    ├── Cargo.toml
    ├── tauri.conf.json           # Tauri config (window, bundle, dev URL)
    ├── build.rs
    ├── capabilities/default.json # Tauri v2 permission scope
    ├── icons/icon.png            # App icon
    └── src/
        ├── main.rs               # Entry point
        ├── lib.rs                # Tauri builder + state setup + seed data
        ├── models.rs             # PromptItem, Domain, Origin, LlmSettings
        ├── db.rs                 # SQLite (rusqlite) CRUD + migrations
        ├── yaml.rs               # Frontmatter parser + variable regex
        ├── llm.rs                # reqwest SSE streaming client
        ├── triage.rs             # 3-tier engine (Level 1 + Level 3)
        └── commands.rs           # All #[tauri::command] handlers
```

---

## Architecture Notes

### Streaming SSE

The Rust `llm::stream_chat_completion` function:
1. Sends a `POST /chat/completions` with `stream: true` to the active endpoint.
2. Reads the response body as a byte stream via `reqwest::bytes_stream()`.
3. Parses SSE events separated by `\n\n` (or `\r\n\r\n`).
4. For each `data: {...}` line, extracts `choices[0].delta.content` and emits a Tauri event named `triage-stream`.
5. On completion, emits `triage-stream:done` and `triage-stream-finished`.

The React frontend subscribes via `@tauri-apps/api/event` `listen()` and appends chunks to local state — the UI updates in real time as tokens arrive.

### Variable Extraction

Single regex, shared between Rust (`yaml.rs`) and TypeScript (`lib/markdown.ts`):

```
\[([A-Z0-9_]+)\]|\{\{([A-Z0-9_]+)\}\}
```

This catches both `[VARIABLE_NAME]` and `{{VARIABLE_NAME}}` styles. Only uppercase letters, digits, and underscores are recognized as variable names — this avoids false positives on bracketed prose like `[1]` or `[example]`.

### Persistence

SQLite database at `<app_local_data_dir>/prompt_workstation.db`. The schema is created on first launch via `db::open()`. Three starter prompts are seeded if the catalog is empty.

### Settings

LLM settings live in memory (managed by Tauri state) and reset on app restart. The defaults match the hardcoded endpoints from the spec. If you want them to persist across restarts, serialize to a JSON file in `app_local_data_dir` — that's a small extension to `SettingsState`.

---

## Endpoint Notes

### FreeLLM Proxy
- Sends `Authorization: Bearer freellmapi-2b17fe48864ac41d5db3c181a0332bd0275556e58e8ae16a`
- Default model identifier: `gpt-4o-mini` (override in Settings to match what your proxy serves)

### KoboldCPP
- No Authorization header (KoboldCPP doesn't require one by default)
- Default model identifier: `koboldcpp/gemma-4-E4B-it-Q8_0`
- Make sure your KoboldCPP instance was launched with `--port 5001` and the OpenAI-compatible API enabled

---

## Troubleshooting

**`cargo tauri dev` fails to find webkit2gtk** → install Linux system deps (see Prerequisites).

**Endpoint health check returns "Connection refused"** → your local LLM server isn't running. Start FreeLLM proxy on port 31415 or KoboldCPP on port 5001.

**Triage Level 1 fails with "Failed to parse Level 1 JSON"** → the model returned prose instead of JSON. Try a different model or lower the temperature. The system prompt requests strict JSON, but smaller local models sometimes ignore that.

**Streaming tokens don't appear** → check the dev tools console (right-click → Inspect). The frontend listens for `triage-stream` events; if you see them arriving but UI isn't updating, that's a React state issue worth investigating.

**SQLite database location** → on Linux: `~/.local/share/com.local.promptworkstation/prompt_workstation.db`. On macOS: `~/Library/Application Support/com.local.promptworkstation/`. On Windows: `%LOCALAPPDATA%\com.local.promptworkstation\`.

---

## License

MIT — do whatever you want with it.
