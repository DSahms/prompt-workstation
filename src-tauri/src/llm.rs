use crate::models::LlmSettings;
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// A single chat message in OpenAI-compatible format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

impl ChatMessage {
    pub fn system(content: impl Into<String>) -> Self {
        Self { role: "system".into(), content: content.into() }
    }
    pub fn user(content: impl Into<String>) -> Self {
        Self { role: "user".into(), content: content.into() }
    }
    pub fn assistant(content: impl Into<String>) -> Self {
        Self { role: "assistant".into(), content: content.into() }
    }
}

/// Build a reqwest client with sensible defaults.
fn http_client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

/// Simple non-streaming chat completion. Returns the assistant message text.
pub async fn chat_completion(
    settings: &LlmSettings,
    messages: Vec<ChatMessage>,
    temperature: f32,
    response_format_json: bool,
) -> Result<String, String> {
    let (base_url, api_key, model) = settings.active_profile();
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let client = http_client()?;
    let mut body = serde_json::json!({
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": false,
    });
    if response_format_json {
        body["response_format"] = serde_json::json!({ "type": "json_object" });
    }

    let mut req = client.post(&url).json(&body);
    if !api_key.is_empty() {
        req = req.header("Authorization", format!("Bearer {}", api_key));
    }

    let resp = req.send().await.map_err(|e| format!("Request failed: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("LLM error {}: {}", status, body));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| format!("Parse failed: {}", e))?;
    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| "Missing content in response".to_string())?
        .to_string();
    Ok(content)
}

/// Streaming chat completion. Emits each text delta as a Tauri event with
/// name `event_name`. Returns the full concatenated content when the stream
/// completes.
pub async fn stream_chat_completion(
    app: AppHandle,
    settings: LlmSettings,
    messages: Vec<ChatMessage>,
    temperature: f32,
    event_name: &str,
) -> Result<String, String> {
    let (base_url, api_key, model) = settings.active_profile();
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let client = http_client()?;
    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": true,
    });

    let mut req = client.post(&url).json(&body);
    if !api_key.is_empty() {
        req = req.header("Authorization", format!("Bearer {}", api_key));
    }
    req = req.header("Accept", "text/event-stream");

    let resp = req.send().await.map_err(|e| format!("Request failed: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("LLM error {}: {}", status, body));
    }

    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();
    let mut full_content = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream read error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // SSE events are separated by a blank line. Handle both \n\n and \r\n\r\n.
        loop {
            let sep = if let Some(i) = buffer.find("\n\n") {
                Some((i, 2))
            } else if let Some(i) = buffer.find("\r\n\r\n") {
                Some((i, 4))
            } else {
                None
            };

            let (idx, sep_len) = match sep {
                Some(v) => v,
                None => break,
            };

            let event_str = buffer[..idx].to_string();
            buffer = buffer[idx + sep_len..].to_string();

            for line in event_str.lines() {
                let line = line.trim_start_matches('\r');
                if let Some(data) = line.strip_prefix("data:") {
                    let data = data.trim();
                    if data == "[DONE]" {
                        continue;
                    }
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(delta) =
                            json["choices"][0]["delta"]["content"].as_str()
                        {
                            if !delta.is_empty() {
                                full_content.push_str(delta);
                                let _ = app.emit(event_name, delta);
                            }
                        }
                    }
                }
            }
        }
    }

    let _ = app.emit(&format!("{}:done", event_name), &full_content);
    Ok(full_content)
}

/// Lightweight health probe used by the Settings screen. Returns the parsed
/// JSON body (or error text).
pub async fn check_health(
    base_url: &str,
    api_key: &str,
) -> Result<serde_json::Value, String> {
    let url = format!("{}/models", base_url.trim_end_matches('/'));
    let client = http_client()?;
    let mut req = client.get(&url);
    if !api_key.is_empty() {
        req = req.header("Authorization", format!("Bearer {}", api_key));
    }
    let resp = req.send().await.map_err(|e| format!("Request failed: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("HTTP {}: {}", status, body));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| format!("Parse failed: {}", e))?;
    Ok(json)
}
