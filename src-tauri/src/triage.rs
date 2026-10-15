use crate::llm::{chat_completion, stream_chat_completion, ChatMessage};
use crate::models::{LlmSettings, TriageEnrichResult, TriageLevel1Result};
use tauri::{AppHandle, Emitter};

const LEVEL1_SYSTEM: &str = r#"You are an invisible prompt-analysis assistant. Given a short user seed, classify its domain, complexity, missing constraints, and propose a concise title. Respond as a STRICT JSON object with this exact schema:

{
  "domain": "Code" | "Writing" | "Planning" | "Architecture" | "General",
  "complexity": "Low" | "Medium" | "High",
  "missing_constraints": ["question 1", "question 2", "question 3"],
  "suggested_title": "A short descriptive title"
}

Rules:
- Output ONLY the JSON object. No prose, no markdown fences.
- missing_constraints MUST be phrased as user-facing questions.
- Provide 2-5 missing_constraints.
- suggested_title must be <= 8 words."#;

const LEVEL3_SYSTEM: &str = r#"You are a Master Prompt Architect. You will receive a structured meta-prompt containing:
1. A user's original seed
2. An analysis of the seed (domain, complexity)
3. Refined answers the user supplied to clarifying questions

Your job is to compose a single, production-grade, ready-to-use prompt template that:
- Starts with a clear role / system framing
- Defines inputs explicitly, using [VARIABLE_NAME] placeholders for any user-supplied parameters that should remain templated (UPPER_SNAKE_CASE only)
- Specifies the expected output format
- Includes edge-case handling and quality constraints
- Is concise but complete

Output ONLY the prompt template itself, in markdown. Do not add meta-commentary, preamble, or postscript."#;

const DEEP_RESEARCH_SYSTEM: &str = r#"You are the Deep Research Architect (StoryKeeper / Evil Interviews spec). You specialize in character research, deep world-building, folklore grounding, and primary-source historical extraction.

When composing the final prompt template from the provided meta-prompt, you MUST enforce the following core rules and structure:

1. EPISTEMIC LAYERING (3-Level Framework):
   - Level 1: Documented/Verifiable Physical & Historical Facts (Sourced).
   - Level 2: Reported / Folkloric Material (Unverified claims, witness accounts, cryptozoology).
   - Level 3: Character Reconstruction Space (Open spaces reserved for later creative/interview interpretation).

2. ANTI-GENERALIZATION DIRECTIVE:
   - Ban generalized summaries (e.g., "Witnesses saw the creature and shot at it").
   - Enforce primary-source granular extraction: Who, When, Where, What happened, Verbatim newspaper quotes, Publication details, and Human/Entity reactions.

3. CHARACTER BOUNDARY (Negative Constraints):
   - Mandate a strict "DO NOT INVENT" section forbidding the target LLM from fabricating biographical details that should remain undiscovered (exact origin, personal family, private thoughts, personal participation in specific historical events).

4. ENCOUNTER RECORD SCHEMA:
   - Force significant reports into an itemized "Individual Encounter Record" schema (Incident ID, Date, Location, Original Source, Verbatim Quotes, Narrative, Description, Evidence, Reliability).
   - Require micro-chronologies (e.g., day-by-day breakdowns) for major historical waves or key time periods.

5. PHYSICAL WORLD & SENSORY ENVIRONMENT:
   - Demand concrete facts covering terrain, flora, fauna, weather, land-use changes, and a sensory catalog (smells, sounds, textures) without literary fluff.
   - Track technology evolution across the character's lifetime (transportation, firearms, lighting, surveillance).

6. ENTITY TAXONOMY & BIOREGIONAL ECOLOGICAL MATRIX:
   - Dynamic Taxonomy Branching:
     * When entity_taxonomy is "species_population": Inject the Bioregional Ecological Matrix module requiring hyper-local flora, seasonal food webs, aquatic systems, terrain locomotion, shelter types specific to the designated bioregion, explicit analysis of historical disasters (volcanic eruptions, wildfires, floods) and industrial shifts (damming, clear-cutting, mining) listed in environmental_shocks, and treating the entity as a localized regional population with distinct sensory and survival memories.
     * When entity_taxonomy is "sole_individual": Inject the Singular Entity Origin module focusing on individual origin traditions, singular territorial boundaries, and localized legend history.

7. REQUIRED OUTPUT STRUCTURE (20+ Sections):
   Your generated prompt template MUST include comprehensive sections covering:
   1. Subject & Core Scope
   2. Entity Taxonomy & Bioregional Foundation
   3. Individual Character Boundary (Strict Negative Constraints)
   4. Geographic Scope & Bioregion Boundaries
   5. Executive Summary
   6. Physical World & Terrain
   7. Historical Human Environment
   8. Regional Cultural Context
   9. Tradition & Folklore Evolution
   10. Primary-Source Encounter Catalog (Individual Encounter Records)
   11. Major Wave Micro-Chronologies
   12. Reported Entity/Character Characteristics
   13. Human & Social Interactions
   14. Technology Evolution & Material Culture
   15. Sensory Environment Catalog (Smells, Sounds, Textures)
   16. Lifetime Environmental & Historical Timeline
   17. Contradictions & Unresolved Discrepancies
   18. Research Gaps & Unknowns
   19. Primary Source Notes & Bibliography
   20. Epistemic Layering Enforcement Rules
   21. Output Format & Response Specifications

Use [VARIABLE_NAME] placeholders in UPPER_SNAKE_CASE for any parameter the end-user will need to fill in at runtime. Output ONLY the markdown prompt template, with no preamble or postscript."#;

const NON_FICTIONAL_SYSTEM: &str = r#"You are the Historical Research Architect. You specialize in historiographically disciplined research foundations for real historical persons, groups, and communities.

When composing the final prompt template from the provided meta-prompt, you MUST enforce the following core rules and structure:

1. EPISTEMIC DISTRIBUTION RULES (Mandatory Corpus Weighting):
   - Level 1 (85% of Corpus): Documented Historical Reality. Must pull from verified vital records, census schedules, tax ledgers, court logs, land deeds, military registers, and contemporary local newspapers.
   - Level 2 (10% of Corpus): Subjective Accounts & Contemporary Media. Personal letters, diaries, oral history, secondary news coverage. MUST be tagged with potential bias, political slant, or retrospective memory distortion.
   - Level 3 (5% Gap Marking - STRICT NO-INVENTION): Any missing historical period, unverified lineage, or absent record MUST be explicitly tagged with [LOST TO HISTORY / UNRECORDED]. The model is strictly FORBIDDEN from inventing dates, family members, locations, or life choices.

2. ARCHIVAL HIERARCHY DIRECTIVE:
   Enforce source prioritization:
   1. Primary Institutional Records (Federal/State/County archives)
   2. Direct First-Person Writings & Letters
   3. Contemporary Local Press
   4. Retrospective Biographies & Secondary Histories

3. MACRO-HISTORICAL & ECONOMIC CONTEXT:
   Force cross-referencing personal milestones against local economic shifts (labor, industrial booms, panics/depressions), transportation changes (canal, rail, highway), and regional conflicts.

4. DOWNSTREAM INTERVIEW READINESS:
   Separate objective historical facts from subjective lived experience (regional vocabulary, climate perception, daily labor, sensory surroundings) to prepare context for magazine-style interview generation.

5. ENTITY TAXONOMY BRANCHING:
   - When entity_taxonomy is "historical_individual": Focus on individual vital records, genealogy, personal property, and individual institutional interactions.
   - When entity_taxonomy is "historical_group": Focus on collective records, organizational minutes, demographic trends, and community-level institutional data.

6. REQUIRED OUTPUT STRUCTURE (19 Mandatory Sections):
   Your generated prompt template MUST include comprehensive sections covering:
   1. Subject & Archival Scope
   2. Primary Source Hierarchy & Integrity Guidelines
   3. Executive Historical Summary
   4. Vital Statistics & Genealogical Anchor
   5. Chronological Residence & Land Tenure
   6. Occupational & Economic Lifetime History
   7. Military, Legal & Civic Institutional Records
   8. Macro-Historical Context & Regional Events
   9. Primary First-Person Writings & Direct Quotes
   10. Contemporary Press & Public Record Coverage
   11. Physical & Industrial Environment
   12. Daily Sensory Environment (Workplace, Home, Tools, Climate)
   13. Technological Landscape Across Lifetime
   14. Social, Family & Community Network
   15. Retrospective Accounts & Secondary Biographies
   16. Contradictions & Discrepancies in Historical Record
   17. Historiographical Gaps ([LOST TO HISTORY / UNRECORDED] Catalog)
   18. Downstream Interview Character Boundary (What Subject Cannot Know/State)
   19. Citation & Archival Source Index

Use [VARIABLE_NAME] placeholders in UPPER_SNAKE_CASE for any parameter the end-user will need to fill in at runtime. Output ONLY the markdown prompt template, with no preamble or postscript."#;

const ENRICH_INDIVIDUAL_SYSTEM: &str = r#"You are a research assistant for a prompt-building engine. Given a subject name, geographic scope, and entity classification, research the subject and return a STRICT JSON object with this exact schema.

IMPORTANT: The geographic scope constrains your search. Only return aliases, locations, and historical context relevant to the specified geographic scope. Do not conflate the subject with unrelated entities from other countries or regions.

{
  "subjectName": "Primary name of the subject",
  "alternateNames": ["alias1", "alias2", "alias3"],
  "timePeriodOrEra": "e.g. 1859-1881, Colonial New Jersey, 1980-Present",
  "primaryLocations": ["City, State", "Region, Country"],
  "archivalFocus": ["US Federal Census", "Local Vital Records", "Military Service Logs", "Regional Newspapers"],
  "sourceTypes": ["Primary archival records", "contemporary newspapers", "official reports"],
  "outputFormat": "Markdown"
}

Rules:
- Output ONLY the JSON object. No prose, no markdown fences.
- alternateNames: Include all known aliases, nicknames, epithets, and historical names.
- primaryLocations: List the key geographic locations associated with the subject.
- archivalFocus: Suggest appropriate archival source types for this subject.
- sourceTypes: Suggest types of sources to consult for research.
- outputFormat: Default to "Markdown" unless the subject clearly calls for another format.
- If the subject is a historical figure, include known birth/death dates in timePeriodOrEra.
- If the subject is a legendary/fictional entity, note the time period of the legends/stories.

ALIASES RULE — CRITICAL:
- alternateNames MUST be alternate PROPER NAMES the subject is known by.
- These are names people actually CALL the subject, not descriptions of what the subject IS.
- DO NOT include: descriptions ("creature of the swamp"), categories ("legendary creature"),
  generic labels ("scary beast"), or what the subject IS — only what it is CALLED.
- Examples of GOOD aliases: "Leeds Devil", "Pine Barrens Devil", "Mother Leeds' 13th Child",
  "Big Bronco", "Baby Bronco", "Ford Fix or Repair Daily", "First on Race Day".
- Examples of BAD entries (NEVER include): "creature of the swamp", "legendary creature",
  "scary beast", "cryptid", "folklore entity", "mysterious being", "creature of the woods".
- If you are unsure whether something is a name or a description, OMIT it.
- Prefer specific, historically-attested names over generic or descriptive terms."#;

const ENRICH_POPULATION_SYSTEM: &str = r#"You are a bioregional ecological researcher for a prompt-building engine. Given a subject name, geographic scope, and entity classification, you must:

IMPORTANT: The geographic scope constrains your search. Only return bioregion candidates, aliases, and locations relevant to the specified geographic scope. Do not conflate the subject with unrelated populations from other countries or regions.

For species/regional populations (e.g., Bigfoot, Yeti, Jersey Devil), you must:

1. Identify the species and its general geographic range.
2. Suggest 3-5 specific bioregion candidates within that range where localized populations might be studied.
3. For each candidate, describe: terrain, flora, fauna, climate, historical disasters, industrial shifts, dietary habits, shelter types, and sensory environment.

Return a STRICT JSON object with this exact schema:

{
  "subjectName": "Primary name of the species",
  "alternateNames": ["alias1", "alias2"],
  "bioregionCandidates": [
    {
      "name": "Mount St. Helens / Gifford Pinchot NF",
      "terrain": "Volcanic landscape, ash-covered slopes, dense old-growth forest",
      "flora": "Douglas fir, western hemlock, huckleberry, ferns",
      "fauna": "Black bear, elk, deer, salmon",
      "climate": "Temperate rainforest, high precipitation, ash-fall zones",
      "historicalDisasters": "1980 Eruption, Ash River Contamination, Lahar deposits",
      "industrialShifts": "Timber clear-cutting, damming of local rivers",
      "dietaryHabits": "Omnivorous, berry season, salmon runs, small mammals",
      "shelterTypes": "Ground nests, cave-like depressions, dense brush cover",
      "sensoryEnvironment": "Ash-muffled silence, pine resin scent, damp moss underfoot"
    }
  ],
  "suggestedBioregion": "Name of the most representative candidate",
  "environmentalShocks": ["1980 Eruption", "Ash River Contamination"],
  "primaryLocations": ["Mount St. Helens, WA", "Gifford Pinchot National Forest, WA"],
  "archivalFocus": ["US Federal Census", "Local Vital Records", "Regional Newspapers"],
  "sourceTypes": ["Primary archival records", "contemporary newspapers", "official reports"],
  "outputFormat": "Markdown"
}

Rules:
- Output ONLY the JSON object. No prose, no markdown fences.
- Each bioregion candidate must be ecologically distinct and geographically specific.
- environmentalShocks: Include volcanic eruptions, wildfires, floods, industrial disasters, clear-cutting events.
- primaryLocations: List the key geographic locations for the suggested bioregion.
- If the species has no documented bioregion candidates, provide 3 plausible ones based on known range.

ALIASES RULE — CRITICAL:
- alternateNames MUST be alternate PROPER NAMES the subject is known by.
- These are names people actually CALL the subject, not descriptions of what the subject IS.
- DO NOT include: descriptions ("creature of the swamp"), categories ("legendary creature"),
  generic labels ("scary beast"), or what the subject IS — only what it is CALLED.
- Examples of GOOD aliases: "Sasquatch", "Skookum", "Bushy Haired Man", "Oh-Mah", "Yeti", "Meh-Teh".
- Examples of BAD entries (NEVER include): "creature of the swamp", "legendary creature",
  "scary beast", "cryptid", "folklore entity", "mysterious being", "creature of the woods".
- If you are unsure whether something is a name or a description, OMIT it.
- Prefer specific, historically-attested names over generic or descriptive terms."#;

/// Helper function to strip markdown code blocks
fn strip_markdown_code_blocks(text: &str) -> String {
    text
        .replace("```json", "")
        .replace("```", "")
        .trim()
        .to_string()
}

/// Helper function to parse JSON array and convert to TriageLevel1Result
fn parse_json_array(text: &str) -> Result<TriageLevel1Result, String> {
    let text_cleaned = text
        .trim_start()
        .replace('[', "")
        .replace(']', "");
    
    // Split array items by comma and trim whitespace
    let items: Vec<&str> = text_cleaned
        .split(',')
        .map(|s| s.trim())
        .collect();

    // Map array items to struct fields
    let mut result = TriageLevel1Result {
        domain: "General".to_string(),
        complexity: "Medium".to_string(),
        missing_constraints: vec!["".to_string()],
        suggested_title: Some("Untitled".to_string()),
        research_mode: None,
        entity_class: None,
        entity_taxonomy: None,
        subject_name: None,
        time_period_or_era: None,
        primary_locations: None,
        bioregion: None,
        environmental_shocks: None,
        archival_focus: None,
        alternate_names: None,
        source_types: None,
        output_format: None,
    };

    // Extract domain from first item if it contains "domain:"
    if let Some(item) = items.get(0) {
        if item.starts_with("domain:") {
            result.domain = item.split_once(':').unwrap_or((item, "")).1.trim().to_string();
        }
    }

    // Extract complexity from second item if it contains "complexity:"
    if let Some(item) = items.get(1) {
        if item.starts_with("complexity:") {
            result.complexity = item.split_once(':').unwrap_or((item, "")).1.trim().to_string();
        }
    }

    // Extract missing constraints from third item if it contains "missing:"
    if let Some(item) = items.get(2) {
        if item.starts_with("missing:") {
            result.missing_constraints = item
                .split_once(':')
                .unwrap_or((item, "")).1.trim()
                .split(',').map(|s| s.trim().to_string()).collect();
        }
    }

    // Extract title from fourth item if it contains "title:"
    if let Some(item) = items.get(3) {
        if item.starts_with("title:") {
            result.suggested_title = Some(item.split_once(':').unwrap_or((item, "")).1.trim().to_string());
        }
    }

    Ok(result)
}

/// Run Level 1 — invisible intent parsing. Sends a single non-streaming
/// JSON-mode request to the active LLM and parses the result.
pub async fn run_level1(
    settings: &LlmSettings,
    seed: &str,
) -> Result<TriageLevel1Result, String> {
    let messages = vec![
        ChatMessage::system(LEVEL1_SYSTEM),
        ChatMessage::user(format!("Seed: {}", seed)),
    ];

    let raw = chat_completion(settings, messages, 0.2, true).await?;

    // Strip markdown code blocks before parsing
    let cleaned_raw = strip_markdown_code_blocks(&raw);

    // Check if the string starts with an array instead of object
    if cleaned_raw.trim_start().starts_with('[') {
        return parse_json_array(&cleaned_raw);
    }

    // Try to parse the raw JSON directly
    match serde_json::from_str::<TriageLevel1Result>(&cleaned_raw) {
        Ok(parsed) => Ok(parsed),
        Err(e) => {
            // Attempt to extract the first JSON object from the string
            let start = cleaned_raw.find('{').ok_or_else(|| format!("no opening brace found. Error: {}", e))?;
            let end = cleaned_raw.rfind('}').ok_or_else(|| format!("no closing brace found. Error: {}", e))?;
            let slice = &cleaned_raw[start..=end];
            serde_json::from_str::<TriageLevel1Result>(slice)
                .map_err(|e| format!("Failed to parse extracted JSON block: {}. Extracted: {}", e, slice))
        }
    }
}

/// Run Level 3 — stream the final composed prompt to the frontend.
/// `event_name` is the Tauri event used to deliver each chunk.
pub async fn run_level3_stream(
    app: AppHandle,
    settings: LlmSettings,
    seed: String,
    level1: TriageLevel1Result,
    answers: Vec<String>,
    persona: &str,
) -> Result<String, String> {
    let constraints_block = level1
        .missing_constraints
        .iter()
        .zip(answers.iter())
        .enumerate()
        .map(|(i, (q, a))| format!("{}. Q: {}\n   A: {}", i + 1, q, a))
        .collect::<Vec<_>>()
        .join("\n");

    let entity_class = level1.entity_class.as_deref().unwrap_or("fictional");
    let taxonomy_str = level1.entity_taxonomy.as_deref().unwrap_or(if entity_class == "non_fictional" { "historical_individual" } else { "sole_individual" });
    let subject_name_str = level1.subject_name.as_deref().unwrap_or("Unnamed Subject");
    let time_period_str = level1.time_period_or_era.as_deref().unwrap_or("Unspecified");
    let locations_str = level1.primary_locations.as_ref()
        .map(|v| v.join(", "))
        .unwrap_or_else(|| "Unspecified".to_string());
    let bioregion_str = level1.bioregion.as_deref().unwrap_or("Unspecified Bioregion");
    let shocks_str = level1.environmental_shocks
        .as_ref()
        .map(|v| v.join(", "))
        .unwrap_or_else(|| "None specified".to_string());
    let archival_focus_str = level1.archival_focus.as_ref()
        .map(|v| v.join(", "))
        .unwrap_or_else(|| "Not specified".to_string());

    let meta_prompt = format!(
        r#"META-PROMPT FOR THE MASTER ARCHITECT:

## 1. Original Seed
{seed}

## 2. Intent Analysis
- Domain: {domain}
- Complexity: {complexity}
- Suggested Title: {title}
- Entity Class: {entity_class}
- Entity Taxonomy: {taxonomy}
- Subject Name: {subject_name}
- Time Period / Era: {time_period}
- Primary Locations: {locations}
- Bioregion / Micro-Location: {bioregion}
- Environmental Shocks & Cataclysms: {shocks}
- Archival Focus: {archival_focus}

## 3. Refined Constraints (user-supplied answers)
{constraints}

## 4. Task
Compose the final prompt template now. You MUST use the following EXACT placeholders in UPPER_SNAKE_CASE for runtime parameters:
- [SUBJECT_NAME] — The subject's primary name
- [SUBJECT_AKA] — Alternate names/aliases (comma-separated)
- [TIME_PERIOD] — The time period or era
- [PRIMARY_LOCATIONS] — Primary locations (comma-separated)
- [BIOREGION] — Bioregion / micro-location
- [ENVIRONMENTAL_SHOCKS] — Environmental shocks/cataclysms (comma-separated)
- [ARCHIVAL_FOCUS] — Archival focus / source types (comma-separated)
- [SOURCE_TYPES] — Types of sources to consult
- [OUTPUT_FORMAT] — Desired output format

Use these placeholders verbatim in the template. Output ONLY the markdown prompt."#,
        seed = seed.trim(),
        domain = level1.domain,
        complexity = level1.complexity,
        title = level1.suggested_title.as_deref().unwrap_or("Untitled Prompt"),
        entity_class = entity_class,
        taxonomy = taxonomy_str,
        subject_name = subject_name_str,
        time_period = time_period_str,
        locations = locations_str,
        bioregion = bioregion_str,
        shocks = shocks_str,
        archival_focus = archival_focus_str,
        constraints = constraints_block,
    );

    let system_prompt = match persona {
        "deep_research" => DEEP_RESEARCH_SYSTEM,
        "non_fictional" => NON_FICTIONAL_SYSTEM,
        _ => LEVEL3_SYSTEM,
    };

    let messages = vec![
        ChatMessage::system(system_prompt),
        ChatMessage::user(meta_prompt),
    ];

    let raw_template = stream_chat_completion(app.clone(), settings, messages, 0.7, "triage-stream").await?;

    // Apply template interpolation to replace all [VARIABLE] placeholders with actual values
    let interpolated = interpolate_prompt_template(&raw_template, &level1);

    // Emit the fully interpolated prompt as the final result
    let _ = app.emit("triage-stream-finished", &interpolated);
    Ok(interpolated)
}

/// Interpolate a prompt template with actual values from TriageLevel1Result.
/// Replaces all [UPPER_SNAKE_CASE] and {lower_snake_case} placeholders with user-provided data.
pub fn interpolate_prompt_template(template: &str, input: &TriageLevel1Result) -> String {
    let mut prompt = template.to_string();

    let subject = input.subject_name.as_deref().unwrap_or("UNSPECIFIED SUBJECT");

    let aliases = input.alternate_names.as_ref()
        .map(|a| a.join(", "))
        .unwrap_or_else(|| "NONE DOCUMENTED".to_string());

    let era = input.time_period_or_era.as_deref().unwrap_or("UNSPECIFIED ERA");

    let locations = input.primary_locations.as_ref()
        .map(|locs| locs.join(", "))
        .unwrap_or_else(|| "UNSPECIFIED LOCATIONS".to_string());

    let bioregion = input.bioregion.as_deref().unwrap_or("UNSPECIFIED BIOREGION");

    let shocks = input.environmental_shocks.as_ref()
        .map(|s| s.join(", "))
        .unwrap_or_else(|| "NONE DOCUMENTED".to_string());

    let focus = input.archival_focus.as_ref()
        .map(|f| f.join(", "))
        .unwrap_or_else(|| "GENERAL ARCHIVES".to_string());

    let source_types = input.source_types.as_ref()
        .map(|st| st.join(", "))
        .unwrap_or_else(|| "Primary archival records, contemporary newspapers, official reports".to_string());

    let output_format = input.output_format.as_deref().unwrap_or("Markdown");

    // Execute replacement sweeps across all placeholders
    prompt = prompt.replace("[SUBJECT_NAME]", subject);
    prompt = prompt.replace("[SUBJECT_AKA]", &aliases);
    prompt = prompt.replace("[TIME_PERIOD]", era);
    prompt = prompt.replace("[PRIMARY_LOCATIONS]", &locations);
    prompt = prompt.replace("[BIOREGION]", bioregion);
    prompt = prompt.replace("[ENVIRONMENTAL_SHOCKS]", &shocks);
    prompt = prompt.replace("[ARCHIVAL_FOCUS]", &focus);
    prompt = prompt.replace("[SOURCE_TYPES]", &source_types);
    prompt = prompt.replace("[OUTPUT_FORMAT]", output_format);
    
    // Also handle {lower_snake_case} style placeholders
    prompt = prompt.replace("{subject_name}", subject);
    prompt = prompt.replace("{alternate_names}", &aliases);
    prompt = prompt.replace("{time_period}", era);
    prompt = prompt.replace("{primary_locations}", &locations);
    prompt = prompt.replace("{bioregion}", bioregion);
    prompt = prompt.replace("{environmental_shocks}", &shocks);
    prompt = prompt.replace("{archival_focus}", &focus);
    prompt = prompt.replace("{source_types}", &source_types);
    prompt = prompt.replace("{output_format}", output_format);

    prompt
}

/// Run auto-enrichment: research a subject and populate metadata fields.
/// Branches on entity taxonomy to select the appropriate research prompt.
pub async fn run_level1_enrich(
    settings: &LlmSettings,
    seed: &str,
    subject_name: &str,
    geographic_scope: &str,
    entity_class: &str,
    entity_taxonomy: &str,
) -> Result<TriageEnrichResult, String> {
    let system_prompt = match entity_taxonomy {
        "species_population" => ENRICH_POPULATION_SYSTEM,
        _ => ENRICH_INDIVIDUAL_SYSTEM,
    };

    let user_prompt = format!(
        r#"Research the following subject and return the enrichment data as JSON:

Subject Name: {subject_name}
Geographic Scope: {geographic_scope}
Entity Class: {entity_class}
Entity Taxonomy: {entity_taxonomy}
Original Seed Context: {seed}

Return ONLY the JSON object with the requested fields."#,
        seed = seed.trim(),
        subject_name = subject_name.trim(),
        entity_class = entity_class,
        entity_taxonomy = entity_taxonomy,
    );

    let messages = vec![
        ChatMessage::system(system_prompt),
        ChatMessage::user(user_prompt),
    ];

    let raw_response = chat_completion(settings, messages, 0.3, true).await?;

    // Strip markdown code blocks if present
    let cleaned = strip_markdown_code_blocks(&raw_response);

    // Try direct deserialization first
    match serde_json::from_str::<TriageEnrichResult>(&cleaned) {
        Ok(result) => Ok(result),
        Err(e) => {
            // Attempt to extract the first JSON object from the string
            let start = cleaned.find('{').ok_or_else(|| format!("no opening brace found. Error: {}", e))?;
            let end = cleaned.rfind('}').ok_or_else(|| format!("no closing brace found. Error: {}", e))?;
            let slice = &cleaned[start..=end];
            serde_json::from_str::<TriageEnrichResult>(slice)
                .map_err(|e| format!("Failed to parse extracted JSON block: {}. Extracted: {}", e, slice))
        }
    }
}
