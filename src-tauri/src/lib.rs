mod commands;
mod db;
mod llm;
mod models;
mod triage;
mod yaml;

use db::DbState;
use commands::SettingsState;
use models::LlmSettings;
use std::sync::Mutex;
use tauri::Manager;

/// Resolve the SQLite database path. Uses the app's local data directory
/// so the catalog persists between launches.
fn resolve_db_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    let dir = app
        .path()
        .app_local_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));
    if let Err(e) = std::fs::create_dir_all(&dir) {
        log::warn!("Failed to create app data dir {:?}: {}", dir, e);
    }
    dir.join("prompt_workstation.db")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Database
            let db_path = resolve_db_path(&app.handle());
            let conn = db::open(db_path.to_str().unwrap_or("prompt_workstation.db"))
                .expect("Failed to initialize SQLite database");
            app.manage(DbState(Mutex::new(conn)));

            // LLM settings (defaults are the hardcoded local endpoints)
            app.manage(SettingsState(Mutex::new(LlmSettings::default())));

            // Seed the catalog with a few starter prompts if empty.
            {
                let db_state: tauri::State<DbState> = app.state();
                let conn = db_state.0.lock().unwrap();
                let existing = db::list_all(&conn).unwrap_or_default();
                if existing.is_empty() {
                    seed_catalog(&conn);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_prompts,
            commands::list_favorites,
            commands::get_prompt,
            commands::save_prompt,
            commands::delete_prompt,
            commands::toggle_favorite,
            commands::import_markdown_file,
            commands::export_markdown_file,
            commands::get_settings,
            commands::save_settings,
            commands::check_endpoint_health,
            commands::triage_level1,
            commands::triage_enrich,
            commands::triage_level3_stream,
            commands::test_chat,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Insert a small set of starter prompts so the catalog isn't empty on first launch.
fn seed_catalog(conn: &rusqlite::Connection) {
    let starters = vec![
        (
            "Rust CLI Tool Builder",
            Some("Generate a complete Rust CLI tool with clap, error handling, and tests."),
            r#"You are a senior Rust engineer. Build a complete, production-ready Rust CLI tool with the following requirements:

## Target
[TARGET_DESCRIPTION]

## CLI Interface
Use `clap` v4 with derive macros. Provide:
- A `--input` / `-i` flag for the primary input
- A `--output` / `-o` flag for the output destination (default: stdout)
- A `--verbose` flag for debug logging

## Constraints
- Use `anyhow` for error handling with context.
- Use `tracing` for structured logging.
- Include at least 3 unit tests covering the core logic.
- Target edition 2021.

## Output
Provide:
1. The full `Cargo.toml`
2. The full `src/main.rs`
3. A short README section explaining usage

Be concise but complete. No placeholders, no TODOs.
"#,
            models::Domain::Code,
            vec!["rust".into(), "cli".into(), "template".into()],
        ),
        (
            "Technical Blog Post Outline",
            Some("Generate a structured outline for a technical blog post."),
            r#"You are a senior technical writer. Create a structured outline for a blog post on:

## Topic
[TOPIC]

## Target Audience
[AUDIENCE_LEVEL]

## Requirements
- Hook the reader in the first paragraph with a concrete scenario.
- Include 3-5 main sections with descriptive H2 headings.
- Under each section, list 2-4 bullet points of what will be covered.
- Suggest one code snippet or diagram placement per major section.
- End with a clear call-to-action.

Output as markdown. Keep total length under 400 words.
"#,
            models::Domain::Writing,
            vec!["blog".into(), "outline".into()],
        ),
        (
            "System Architecture Review",
            Some("Review an architecture diagram and produce a risk assessment."),
            r#"You are a principal systems architect. Review the following architecture description and produce a structured risk assessment.

## System Under Review
[SYSTEM_DESCRIPTION]

## Scale Assumptions
- Daily active users: [DAU]
- Peak QPS: [PEAK_QPS]

## Output Format
### Strengths
- 3-5 bullet points

### Risks (ranked by severity)
For each risk:
- **Risk**: short name
- **Severity**: Critical / High / Medium / Low
- **Why**: 1-2 sentences
- **Mitigation**: concrete recommendation

### Open Questions
- 2-4 questions for the system owner

Be specific. Avoid generic advice.
"#,
            models::Domain::Architecture,
            vec!["review".into(), "risks".into()],
        ),
    ];

    for (title, desc, content, domain, tags) in starters {
        let item = models::PromptItem::new(
            title.to_string(),
            desc.map(|s| s.to_string()),
            content.to_string(),
            domain,
            tags,
            models::Origin::ManualEntry,
        );
        let _ = db::upsert(conn, &item);
    }
}
