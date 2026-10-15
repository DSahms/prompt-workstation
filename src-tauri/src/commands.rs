use crate::db::{self, DbState};
use crate::llm::{self, ChatMessage};
use crate::models::{LlmSettings, PromptItem, TriageEnrichResult, TriageLevel1Result};
use crate::triage;
use crate::yaml;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

/// Shared LLM settings state.
pub struct SettingsState(pub Mutex<LlmSettings>);

// ---------------------------------------------------------------------------
// Catalog CRUD
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_prompts(db: State<'_, DbState>) -> Result<Vec<PromptItem>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::list_all(&conn)
}

#[tauri::command]
pub fn list_favorites(db: State<'_, DbState>) -> Result<Vec<PromptItem>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::list_favorites(&conn)
}

#[tauri::command]
pub fn get_prompt(db: State<'_, DbState>, id: String) -> Result<PromptItem, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::get(&conn, &id)
}

#[tauri::command]
pub fn save_prompt(db: State<'_, DbState>, mut prompt: PromptItem) -> Result<PromptItem, String> {
    // Re-extract variables in case content changed on the frontend.
    prompt.detected_variables = yaml::extract_variables(&prompt.content);
    prompt.last_modified = chrono::Utc::now().to_rfc3339();
    if prompt.created_at.is_empty() {
        prompt.created_at = prompt.last_modified.clone();
    }
    if prompt.id.is_empty() {
        prompt.id = uuid::Uuid::new_v4().to_string();
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::upsert(&conn, &prompt)?;
    Ok(prompt)
}

#[tauri::command]
pub fn delete_prompt(db: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::delete(&conn, &id)
}

#[tauri::command]
pub fn toggle_favorite(db: State<'_, DbState>, id: String, favorite: bool) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    db::set_favorite(&conn, &id, favorite)
}

// ---------------------------------------------------------------------------
// Markdown import / export
// ---------------------------------------------------------------------------

/// Reads a markdown file from disk and returns a parsed PromptItem (not yet saved).
#[tauri::command]
pub fn import_markdown_file(path: String) -> Result<PromptItem, String> {
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path, e))?;
    Ok(yaml::import_markdown(&raw))
}

/// Writes a PromptItem to disk as markdown with YAML frontmatter.
#[tauri::command]
pub fn export_markdown_file(prompt: PromptItem, path: String) -> Result<(), String> {
    let md = yaml::export_markdown(&prompt);
    std::fs::write(&path, md).map_err(|e| format!("Failed to write {}: {}", path, e))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_settings(state: State<'_, SettingsState>) -> Result<LlmSettings, String> {
    let s = state.0.lock().map_err(|e| e.to_string())?;
    Ok(s.clone())
}

#[tauri::command]
pub fn save_settings(
    state: State<'_, SettingsState>,
    settings: LlmSettings,
) -> Result<LlmSettings, String> {
    let mut s = state.0.lock().map_err(|e| e.to_string())?;
    *s = settings.clone();
    Ok(settings)
}

#[tauri::command]
pub async fn check_endpoint_health(
    base_url: String,
    api_key: String,
) -> Result<serde_json::Value, String> {
    llm::check_health(&base_url, &api_key).await
}

// ---------------------------------------------------------------------------
// Triage engine
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn triage_level1(
    state: State<'_, SettingsState>,
    seed: String,
) -> Result<TriageLevel1Result, String> {
    let settings = {
        let s = state.0.lock().map_err(|e| e.to_string())?;
        s.clone()
    };
    triage::run_level1(&settings, &seed).await
}

#[tauri::command]
pub async fn triage_enrich(
    state: State<'_, SettingsState>,
    seed: String,
    subject_name: String,
    geographic_scope: String,
    entity_class: String,
    entity_taxonomy: String,
) -> Result<TriageEnrichResult, String> {
    let settings = {
        let s = state.0.lock().map_err(|e| e.to_string())?;
        s.clone()
    };
    triage::run_level1_enrich(&settings, &seed, &subject_name, &geographic_scope, &entity_class, &entity_taxonomy).await
}

#[tauri::command]
pub async fn triage_level3_stream(
    app: AppHandle,
    state: State<'_, SettingsState>,
    seed: String,
    level1: TriageLevel1Result,
    answers: Vec<String>,
    persona: Option<String>,
) -> Result<String, String> {
    let settings = {
        let s = state.0.lock().map_err(|e| e.to_string())?;
        s.clone()
    };
    let persona_str = persona.as_deref().unwrap_or("standard");
    let full = triage::run_level3_stream(app.clone(), settings, seed, level1, answers, persona_str).await?;
    let _ = app.emit("triage-stream-finished", &full);
    Ok(full)
}

/// Convenience: free-form chat with the active endpoint (non-streaming).
/// Used by the Settings screen "Test" button.
#[tauri::command]
pub async fn test_chat(
    state: State<'_, SettingsState>,
    prompt: String,
) -> Result<String, String> {
    let settings = {
        let s = state.0.lock().map_err(|e| e.to_string())?;
        s.clone()
    };
    let messages = vec![ChatMessage::user(prompt)];
    llm::chat_completion(&settings, messages, 0.7, false).await
}
