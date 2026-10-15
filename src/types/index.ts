/// Shared TypeScript types — mirror of the Rust models in src-tauri/src/models.rs.

export type Domain = "Code" | "Writing" | "Planning" | "Architecture" | "General";
export type Origin = "imported" | "manual_entry" | "generated";

export interface PromptItem {
  id: string;
  title: string;
  description: string | null;
  content: string;
  domain: Domain;
  tags: string[];
  detectedVariables: string[];
  createdAt: string;
  lastModified: string;
  isFavorite: boolean;
  origin: Origin;
}

export interface LlmSettings {
  freellmBaseUrl: string;
  freellmApiKey: string;
  freellmModel: string;
  koboldcppBaseUrl: string;
  koboldcppModel: string;
  activeEndpoint: "freellm" | "koboldcpp";
}

export interface TriageLevel1Result {
  domain: string;
  complexity: string;
  missingConstraints: string[];
  suggestedTitle?: string;
  researchMode?: "standard" | "deep_research" | "non_fictional";
  entityClass?: "non_fictional" | "fictional";
  entityTaxonomy?: "historical_individual" | "historical_group" | "sole_individual" | "species_population";
  subjectName?: string;
  alternateNames?: string[];
  timePeriodOrEra?: string;
  primaryLocations?: string[];
  bioregion?: string;
  environmentalShocks?: string[];
  archivalFocus?: string[];
  sourceTypes?: string[];
  outputFormat?: string;
}

export type ViewKey = "catalog" | "triage" | "favorites" | "settings";

export interface BioregionCandidate {
  name: string;
  terrain?: string;
  flora?: string;
  fauna?: string;
  climate?: string;
  historicalDisasters?: string;
  industrialShifts?: string;
  dietaryHabits?: string;
  shelterTypes?: string;
  sensoryEnvironment?: string;
}

export interface TriageEnrichResult {
  subjectName?: string;
  geographicScope?: string;
  alternateNames?: string[];
  timePeriodOrEra?: string;
  primaryLocations?: string[];
  bioregion?: string;
  bioregionCandidates?: BioregionCandidate[];
  environmentalShocks?: string[];
  archivalFocus?: string[];
  sourceTypes?: string[];
  outputFormat?: string;
}
