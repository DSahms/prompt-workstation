use crate::models::{Domain, Origin, PromptItem};
use regex::Regex;
use std::sync::OnceLock;

/// Matches both `[VARIABLE_NAME]` and `{{VARIABLE_NAME}}` style placeholders.
/// Captures the inner identifier; only uppercase letters, digits, and underscores.
const VARIABLE_PATTERN: &str = r"\[([A-Z0-9_]+)\]|\{\{([A-Z0-9_]+)\}\}";

static VAR_REGEX: OnceLock<Regex> = OnceLock::new();

fn var_regex() -> &'static Regex {
    VAR_REGEX.get_or_init(|| Regex::new(VARIABLE_PATTERN).expect("valid regex"))
}

/// Extract unique variable identifiers from a piece of content, preserving
/// first-occurrence order.
pub fn extract_variables(content: &str) -> Vec<String> {
    let re = var_regex();
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for cap in re.captures_iter(content) {
        let name = cap
            .get(1)
            .or_else(|| cap.get(2))
            .map(|m| m.as_str())
            .unwrap_or("");
        if !name.is_empty() && seen.insert(name.to_string()) {
            out.push(name.to_string());
        }
    }
    out
}

/// Substitute `[VAR]` and `{{VAR}}` placeholders with the values supplied in
/// `values`. Missing values leave the placeholder intact.
pub fn substitute_variables(content: &str, values: &std::collections::HashMap<String, String>) -> String {
    let re = var_regex();
    re.replace_all(content, |caps: &regex::Captures| {
        let name = caps
            .get(1)
            .or_else(|| caps.get(2))
            .map(|m| m.as_str())
            .unwrap_or("");
        values
            .get(name)
            .cloned()
            .unwrap_or_else(|| caps[0].to_string())
    })
    .to_string()
}

/// Parse a markdown file with optional YAML frontmatter.
/// Returns (frontmatter_yaml, body_markdown).
pub fn split_frontmatter(raw: &str) -> (Option<String>, String) {
    let raw = raw.strip_prefix('\u{feff}').unwrap_or(raw);
    if let Some(rest) = raw.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---\n") {
            let fm = rest[..end].to_string();
            let body = rest[end + 5..].to_string();
            return (Some(fm), body);
        }
        // Handle file that ends with `---` (no trailing newline)
        if let Some(rest2) = rest.strip_suffix("\n---") {
            let fm = rest2.to_string();
            return (Some(fm), String::new());
        }
        if let Some(end) = rest.find("\n---\r\n") {
            let fm = rest[..end].to_string();
            let body = rest[end + 6..].to_string();
            return (Some(fm), body);
        }
    }
    (None, raw.to_string())
}

/// Parse YAML frontmatter into a generic map.
fn parse_frontmatter(fm: &str) -> serde_yaml::Value {
    serde_yaml::from_str(fm).unwrap_or(serde_yaml::Value::Null)
}

/// Import a markdown file (with optional YAML frontmatter) into a PromptItem.
/// Fields not present in the frontmatter default to empty / General.
pub fn import_markdown(raw: &str) -> PromptItem {
    let (fm, body) = split_frontmatter(raw);
    let map = match fm {
        Some(s) => parse_frontmatter(&s),
        None => serde_yaml::Value::Null,
    };

    let get_str = |key: &str| -> Option<String> {
        if let serde_yaml::Value::Mapping(m) = &map {
            m.get(serde_yaml::Value::String(key.to_string()))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        } else {
            None
        }
    };

    let title = get_str("title").unwrap_or_else(|| {
        // Fallback: first non-empty markdown line
        body.lines()
            .find(|l| !l.trim().is_empty())
            .unwrap_or("Untitled Prompt")
            .trim_start_matches('#')
            .trim()
            .to_string()
    });
    let description = get_str("description");
    let domain = Domain::from_str_lossy(&get_str("domain").unwrap_or_default());
    let origin_str = get_str("origin").unwrap_or_else(|| "imported".to_string());
    let origin = Origin::from_str_lossy(&origin_str);

    let tags: Vec<String> = {
        if let serde_yaml::Value::Mapping(m) = &map {
            if let Some(t) = m.get(serde_yaml::Value::String("tags".to_string())) {
                if let Some(seq) = t.as_sequence() {
                    seq.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                } else if let Some(s) = t.as_str() {
                    s.split(',').map(|x| x.trim().to_string()).collect()
                } else {
                    Vec::new()
                }
            } else {
                Vec::new()
            }
        } else {
            Vec::new()
        }
    };

    let detected_variables = extract_variables(&body);
    let now = chrono::Utc::now().to_rfc3339();

    PromptItem {
        id: uuid::Uuid::new_v4().to_string(),
        title,
        description,
        content: body,
        domain,
        tags,
        detected_variables,
        created_at: now.clone(),
        last_modified: now,
        is_favorite: false,
        origin,
    }
}

/// Serialize a PromptItem back into a markdown file with YAML frontmatter.
pub fn export_markdown(item: &PromptItem) -> String {
    let mut fm = String::new();
    fm.push_str("---\n");
    fm.push_str(&format!("title: {}\n", yaml_escape(&item.title)));
    if let Some(desc) = &item.description {
        fm.push_str(&format!("description: {}\n", yaml_escape(desc)));
    }
    fm.push_str(&format!("domain: {}\n", item.domain.as_str()));
    fm.push_str(&format!("origin: {}\n", item.origin.as_str()));
    if item.tags.is_empty() {
        fm.push_str("tags: []\n");
    } else {
        fm.push_str("tags:\n");
        for t in &item.tags {
            fm.push_str(&format!("  - {}\n", yaml_escape(t)));
        }
    }
    if item.detected_variables.is_empty() {
        fm.push_str("detected_variables: []\n");
    } else {
        fm.push_str("detected_variables:\n");
        for v in &item.detected_variables {
            fm.push_str(&format!("  - {}\n", yaml_escape(v)));
        }
    }
    fm.push_str(&format!("is_favorite: {}\n", item.is_favorite));
    fm.push_str(&format!("created_at: {}\n", item.created_at));
    fm.push_str(&format!("last_modified: {}\n", item.last_modified));
    fm.push_str("---\n\n");
    fm.push_str(&item.content);
    if !item.content.ends_with('\n') {
        fm.push('\n');
    }
    fm
}

/// Minimal YAML scalar escaper — wraps strings in quotes if they contain
/// characters that would otherwise be ambiguous in YAML.
fn yaml_escape(s: &str) -> String {
    if s.is_empty() {
        return "\"\"".to_string();
    }
    let needs_quote = s
        .chars()
        .any(|c| c == ':' || c == '#' || c == '\n' || c == '"' || c == '\'' || c == '{' || c == '}' || c == '[' || c == ']');
    if needs_quote {
        let escaped = s.replace('\\', "\\\\").replace('"', "\\\"");
        format!("\"{}\"", escaped)
    } else {
        s.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_bracket_variables() {
        let v = extract_variables("Hello [TARGET_LANG] and [TARGET_LANG] and {{SYSTEM_GOAL}}");
        assert_eq!(v, vec!["TARGET_LANG".to_string(), "SYSTEM_GOAL".to_string()]);
    }

    #[test]
    fn substitutes_variables() {
        let mut map = std::collections::HashMap::new();
        map.insert("NAME".to_string(), "World".to_string());
        let out = substitute_variables("Hello [NAME] and {{OTHER}}", &map);
        assert_eq!(out, "Hello World and {{OTHER}}");
    }

    #[test]
    fn imports_frontmatter() {
        let raw = "---\ntitle: My Prompt\ndomain: Code\ntags:\n  - rust\n  - cli\n---\n\n# Body\n\nHello [TARGET]\n";
        let item = import_markdown(raw);
        assert_eq!(item.title, "My Prompt");
        assert_eq!(item.domain, Domain::Code);
        assert_eq!(item.tags, vec!["rust".to_string(), "cli".to_string()]);
        assert_eq!(item.detected_variables, vec!["TARGET".to_string()]);
        assert!(item.content.contains("Hello [TARGET]"));
    }

    #[test]
    fn roundtrips_export_import() {
        let item = PromptItem::new(
            "Test".to_string(),
            Some("desc".to_string()),
            "Body with [VAR]".to_string(),
            Domain::Writing,
            vec!["a".to_string()],
            Origin::ManualEntry,
        );
        let exported = export_markdown(&item);
        let reimported = import_markdown(&exported);
        assert_eq!(reimported.title, item.title);
        assert_eq!(reimported.domain, item.domain);
        assert_eq!(reimported.tags, item.tags);
        assert_eq!(reimported.detected_variables, item.detected_variables);
    }
}
