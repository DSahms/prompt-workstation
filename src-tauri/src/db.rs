use crate::models::{Domain, Origin, PromptItem};
use rusqlite::{params, Connection};
use std::sync::Mutex;

/// Shared DB state managed by Tauri.
pub struct DbState(pub Mutex<Connection>);

const MIGRATION_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    domain TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    detected_variables TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    last_modified TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    origin TEXT NOT NULL DEFAULT 'imported'
);

CREATE INDEX IF NOT EXISTS idx_prompts_title ON prompts(title);
CREATE INDEX IF NOT EXISTS idx_prompts_domain ON prompts(domain);
CREATE INDEX IF NOT EXISTS idx_prompts_favorite ON prompts(is_favorite);
"#;

/// Open (or create) the SQLite database at `path` and run migrations.
pub fn open(path: &str) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|e| format!("Failed to open DB: {}", e))?;
    conn.execute_batch(MIGRATION_SQL)
        .map_err(|e| format!("Migration failed: {}", e))?;
    Ok(conn)
}

fn row_to_prompt(row: &rusqlite::Row) -> rusqlite::Result<PromptItem> {
    let description: Option<String> = row.get("description")?;
    let domain_str: String = row.get("domain")?;
    let tags_json: String = row.get("tags")?;
    let vars_json: String = row.get("detected_variables")?;
    let origin_str: String = row.get("origin")?;
    let is_favorite: i64 = row.get("is_favorite")?;

    let tags: Vec<String> =
        serde_json::from_str(&tags_json).unwrap_or_default();
    let detected_variables: Vec<String> =
        serde_json::from_str(&vars_json).unwrap_or_default();

    Ok(PromptItem {
        id: row.get("id")?,
        title: row.get("title")?,
        description,
        content: row.get("content")?,
        domain: Domain::from_str_lossy(&domain_str),
        tags,
        detected_variables,
        created_at: row.get("created_at")?,
        last_modified: row.get("last_modified")?,
        is_favorite: is_favorite != 0,
        origin: Origin::from_str_lossy(&origin_str),
    })
}

pub fn list_all(conn: &Connection) -> Result<Vec<PromptItem>, String> {
    let mut stmt = conn
        .prepare("SELECT * FROM prompts ORDER BY last_modified DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_prompt)
        .map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

pub fn list_favorites(conn: &Connection) -> Result<Vec<PromptItem>, String> {
    let mut stmt = conn
        .prepare("SELECT * FROM prompts WHERE is_favorite = 1 ORDER BY last_modified DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_prompt)
        .map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

pub fn get(conn: &Connection, id: &str) -> Result<PromptItem, String> {
    conn.query_row(
        "SELECT * FROM prompts WHERE id = ?1",
        params![id],
        row_to_prompt,
    )
    .map_err(|e| format!("Failed to fetch prompt {}: {}", id, e))
}

pub fn upsert(conn: &Connection, p: &PromptItem) -> Result<(), String> {
    let tags_json = serde_json::to_string(&p.tags).map_err(|e| e.to_string())?;
    let vars_json =
        serde_json::to_string(&p.detected_variables).map_err(|e| e.to_string())?;
    conn.execute(
        r#"
        INSERT INTO prompts
          (id, title, description, content, domain, tags, detected_variables,
           created_at, last_modified, is_favorite, origin)
        VALUES
          (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          content = excluded.content,
          domain = excluded.domain,
          tags = excluded.tags,
          detected_variables = excluded.detected_variables,
          last_modified = excluded.last_modified,
          is_favorite = excluded.is_favorite,
          origin = excluded.origin
        "#,
        params![
            p.id,
            p.title,
            p.description,
            p.content,
            p.domain.as_str(),
            tags_json,
            vars_json,
            p.created_at,
            p.last_modified,
            p.is_favorite as i64,
            p.origin.as_str(),
        ],
    )
    .map_err(|e| format!("Upsert failed: {}", e))?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM prompts WHERE id = ?1", params![id])
        .map_err(|e| format!("Delete failed: {}", e))?;
    Ok(())
}

pub fn set_favorite(conn: &Connection, id: &str, fav: bool) -> Result<(), String> {
    conn.execute(
        "UPDATE prompts SET is_favorite = ?1, last_modified = ?2 WHERE id = ?3",
        params![fav as i64, chrono::Utc::now().to_rfc3339(), id],
    )
    .map_err(|e| format!("Favorite toggle failed: {}", e))?;
    Ok(())
}
