use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "PascalCase")]
pub enum Domain {
    Code,
    Writing,
    Planning,
    Architecture,
    General,
}

impl Domain {
    pub fn from_str_lossy(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "code" => Domain::Code,
            "writing" => Domain::Writing,
            "planning" => Domain::Planning,
            "architecture" => Domain::Architecture,
            _ => Domain::General,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Domain::Code => "Code",
            Domain::Writing => "Writing",
            Domain::Planning => "Planning",
            Domain::Architecture => "Architecture",
            Domain::General => "General",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Origin {
    Imported,
    ManualEntry,
    Generated,
}

impl Origin {
    pub fn from_str_lossy(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "manual_entry" | "manual" => Origin::ManualEntry,
            "generated" => Origin::Generated,
            _ => Origin::Imported,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Origin::Imported => "imported",
            Origin::ManualEntry => "manual_entry",
            Origin::Generated => "generated",
        }
    }
}

/// A single prompt template stored in the local catalog.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptItem {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub content: String,
    pub domain: Domain,
    pub tags: Vec<String>,
    pub detected_variables: Vec<String>,
    pub created_at: String,
    pub last_modified: String,
    pub is_favorite: bool,
    pub origin: Origin,
}

impl PromptItem {
    /// Build a new PromptItem with auto-generated id + timestamps and
    /// variables extracted from `content`.
    pub fn new(
        title: String,
        description: Option<String>,
        content: String,
        domain: Domain,
        tags: Vec<String>,
        origin: Origin,
    ) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        let detected_variables = crate::yaml::extract_variables(&content);
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            title,
            description,
            content,
            domain,
            tags,
            detected_variables,
            created_at: now.clone(),
            last_modified: now,
            is_favorite: false,
            origin,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmSettings {
    pub freellm_base_url: String,
    pub freellm_api_key: String,
    pub freellm_model: String,
    pub koboldcpp_base_url: String,
    pub koboldcpp_model: String,
    pub active_endpoint: String,
}

impl Default for LlmSettings {
    fn default() -> Self {
        Self {
            freellm_base_url: "http://127.0.0.1:31415/v1".to_string(),
            freellm_api_key: "freellmapi-2b17fe48864ac41d5db3c181a0332bd0275556e58e8ae16a"
                .to_string(),
            freellm_model: "auto".to_string(),
            koboldcpp_base_url: "http://127.0.0.1:5001/v1".to_string(),
            koboldcpp_model: "koboldcpp/gemma-4-E4B-it-Q8_0".to_string(),
            active_endpoint: "freellm".to_string(),
        }
    }
}

impl LlmSettings {
    /// Returns (base_url, api_key, model) for the currently active endpoint.
    pub fn active_profile(&self) -> (String, String, String) {
        match self.active_endpoint.as_str() {
            "koboldcpp" => (
                self.koboldcpp_base_url.clone(),
                String::new(),
                self.koboldcpp_model.clone(),
            ),
            _ => (
                self.freellm_base_url.clone(),
                self.freellm_api_key.clone(),
                self.freellm_model.clone(),
            ),
        }
    }
}

/// Result of Level 1 intent parsing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriageLevel1Result {
    pub domain: String,
    pub complexity: String,
    #[serde(alias = "missing_constraints")]
    pub missing_constraints: Vec<String>,
    #[serde(alias = "suggested_title")]
    pub suggested_title: Option<String>,
    /// Which generator persona to use: "standard" | "deep_research" | "non_fictional"
    pub research_mode: Option<String>,
    /// Entity class: "non_fictional" | "fictional"
    pub entity_class: Option<String>,
    /// Entity taxonomy:
    /// - For non_fictional: "historical_individual" | "historical_group"
    /// - For fictional: "sole_individual" | "species_population"
    pub entity_taxonomy: Option<String>,
    /// Subject name
    pub subject_name: Option<String>,
    /// Alternate names / aliases (e.g., ["Leeds Devil", "Pine Barren Devil"])
    pub alternate_names: Option<Vec<String>>,
    /// Time period or era (e.g., "1860-1925", "Colonial New Jersey", "1980-Present")
    pub time_period_or_era: Option<String>,
    /// Primary locations
    pub primary_locations: Option<Vec<String>>,
    /// Bioregion name / micro-location (for species/regional entities)
    pub bioregion: Option<String>,
    /// Environmental shocks & cataclysms (for species/regional entities)
    pub environmental_shocks: Option<Vec<String>>,
    /// Archival focus (e.g., ["US Federal Census", "Local Vital Records", "Military Service Logs", "Regional Newspapers"])
    pub archival_focus: Option<Vec<String>>,
    /// Source types for research
    pub source_types: Option<Vec<String>>,
    /// Output format for the generated prompt
    pub output_format: Option<String>,
}

/// Final result of the triage pipeline (after Level 3 streaming completes).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriageFinalResult {
    pub full_prompt: String,
    pub detected_variables: Vec<String>,
}

/// Result of auto-enrichment research.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriageEnrichResult {
    pub subject_name: Option<String>,
    pub alternate_names: Option<Vec<String>>,
    pub time_period_or_era: Option<String>,
    pub primary_locations: Option<Vec<String>>,
    pub bioregion: Option<String>,
    pub bioregion_candidates: Option<Vec<BioregionCandidate>>,
    pub environmental_shocks: Option<Vec<String>>,
    pub archival_focus: Option<Vec<String>>,
    pub source_types: Option<Vec<String>>,
    pub output_format: Option<String>,
}

/// A candidate bioregion for species/regional population entities.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BioregionCandidate {
    pub name: String,
    pub terrain: Option<String>,
    pub flora: Option<String>,
    pub fauna: Option<String>,
    pub climate: Option<String>,
    pub historical_disasters: Option<String>,
    pub industrial_shifts: Option<String>,
    pub dietary_habits: Option<String>,
    pub shelter_types: Option<String>,
    pub sensory_environment: Option<String>,
}
