import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Save,
  Copy,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { useAppStore } from "../store/app";
import type { PromptItem, TriageLevel1Result } from "../types";
import * as api from "../lib/tauri";
import MarkdownRenderer from "./MarkdownRenderer";
import { extractVariables } from "../lib/markdown";

type Step = 1 | 2 | 3;

const US_REGIONS: Record<string, string[]> = {
  Northeast: ["Connecticut", "Maine", "Massachusetts", "New Hampshire", "New Jersey", "New York", "Pennsylvania", "Rhode Island", "Vermont"],
  Southeast: ["Alabama", "Florida", "Georgia", "Kentucky", "Mississippi", "North Carolina", "South Carolina", "Tennessee", "Virginia", "West Virginia"],
  Midwest: ["Illinois", "Indiana", "Iowa", "Kansas", "Michigan", "Minnesota", "Missouri", "Nebraska", "North Dakota", "Ohio", "South Dakota", "Wisconsin"],
  Northwest: ["Alaska", "Idaho", "Oregon", "Washington"],
  Southwest: ["Arizona", "New Mexico", "Oklahoma", "Texas"],
};

export default function TriageWizard() {
  const settings = useAppStore((s) => s.settings);
  const upsertPrompt = useAppStore((s) => s.upsertPrompt);
  const setView = useAppStore((s) => s.setView);
  const selectPrompt = useAppStore((s) => s.selectPrompt);
  const notify = useAppStore((s) => s.notify);

  const [step, setStep] = useState<Step>(1);
  const [persona, setPersona] = useState<"standard" | "deep_research" | "non_fictional">("standard");
  const [seed, setSeed] = useState("");
  const [level1, setLevel1] = useState<TriageLevel1Result | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [streamed, setStreamed] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [bioregionCandidates, setBioregionCandidates] = useState<{name: string}[]>([]);
  const [entityClass, setEntityClass] = useState<"non_fictional" | "fictional">("fictional");
  const [entityTaxonomy, setEntityTaxonomy] = useState<"historical_individual" | "historical_group" | "sole_individual" | "species_population">("sole_individual");
  const [subjectName, setSubjectName] = useState("");
  const [country, setCountry] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [regionFilter, setRegionFilter] = useState("");
  const [timePeriodOrEra, setTimePeriodOrEra] = useState("");
  const [primaryLocations, setPrimaryLocations] = useState("");
  const [bioregion, setBioregion] = useState("");
  const [environmentalShocks, setEnvironmentalShocks] = useState("");
  const [archivalFocus, setArchivalFocus] = useState("");
  const [alternateNames, setAlternateNames] = useState("");
  const [sourceTypes, setSourceTypes] = useState("");
  const [outputFormat, setOutputFormat] = useState("Markdown");

  // Filtered states based on region filter
  const filteredStates: string[] = regionFilter
    ? [...(US_REGIONS[regionFilter as keyof typeof US_REGIONS] || [])]
    : (Object.values(US_REGIONS) as string[][]).flat();

  const streamUnsub = useRef<(() => void) | null>(null);
  const doneUnsub = useRef<(() => void) | null>(null);
  const finishedUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      streamUnsub.current?.();
      doneUnsub.current?.();
      finishedUnsub.current?.();
    };
  }, []);

  async function runLevel1() {
    if (!seed.trim()) {
      notify("Enter a seed prompt first", "err");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.triageLevel1(seed.trim());
      result.researchMode = persona;
      result.entityClass = entityClass;
      result.entityTaxonomy = entityTaxonomy;
      result.subjectName = subjectName || undefined;
      result.timePeriodOrEra = timePeriodOrEra || undefined;
      result.primaryLocations = primaryLocations.split(",").map(s => s.trim()).filter(Boolean);
      result.bioregion = bioregion || undefined;
      result.environmentalShocks = environmentalShocks.split(",").map(s => s.trim()).filter(Boolean);
      result.archivalFocus = archivalFocus.split(",").map(s => s.trim()).filter(Boolean);
      result.alternateNames = alternateNames.split(",").map(s => s.trim()).filter(Boolean);
      result.sourceTypes = sourceTypes.split(",").map(s => s.trim()).filter(Boolean);
      result.outputFormat = outputFormat || undefined;
      setLevel1(result);
      setAnswers(result.missingConstraints.map(() => ""));
      setStep(2);
    } catch (e) {
      const errorMessage = String(e);
      setError(errorMessage);
      notify(`Level 1 failed: ${errorMessage}`, "err");
      if (errorMessage.includes("JSON")) {
        notify("Failed to parse LLM response: Invalid JSON format", "err");
      }
    } finally {
      setBusy(false);
    }
  }

  async function runLevel3() {
    if (!level1) return;
    setStep(3);
    setStreamed("");
    setStreaming(true);
    setError(null);

    // Listen for stream chunks
    streamUnsub.current?.();
    doneUnsub.current?.();
    finishedUnsub.current?.();

    const unSub1 = await api.onStreamEvent("triage-stream", (chunk) => {
      setStreamed((s) => s + chunk);
    });
    streamUnsub.current = unSub1;

    const unSub2 = await api.onStreamEvent("triage-stream:done", () => {
      setStreaming(false);
    });
    doneUnsub.current = unSub2;

    const unSub3 = await api.onStreamEvent("triage-stream-finished", (fullResult) => {
      setStreamed(fullResult);
      setStreaming(false);
    });
    finishedUnsub.current = unSub3;

    try {
      await api.triageLevel3Stream(seed, level1, answers, persona);
    } catch (e) {
      setError(String(e));
      notify(`Level 3 failed: ${String(e)}`, "err");
    } finally {
      setStreaming(false);
    }
  }

  async function runEnrich() {
    if (!seed.trim()) {
      notify("Enter a seed prompt first", "err");
      return;
    }
    setEnriching(true);
    setError(null);
    setBioregionCandidates([]);
    try {
      const geographicScope = [
        selectedStates.length > 0 ? selectedStates.join(", ") : stateRegion,
        country
      ].filter(Boolean).join(", ");
      const result = await api.triageEnrich(seed.trim(), subjectName.trim(), geographicScope, entityClass, entityTaxonomy);
      if (result.subjectName) setSubjectName(result.subjectName);
      if (result.alternateNames && result.alternateNames.length > 0) {
        setAlternateNames(result.alternateNames.join(", "));
      }
      if (result.timePeriodOrEra) setTimePeriodOrEra(result.timePeriodOrEra);
      if (result.primaryLocations && result.primaryLocations.length > 0) {
        setPrimaryLocations(result.primaryLocations.join(", "));
      }
      if (result.bioregion) setBioregion(result.bioregion);
      if (result.environmentalShocks && result.environmentalShocks.length > 0) {
        setEnvironmentalShocks(result.environmentalShocks.join(", "));
      }
      if (result.archivalFocus && result.archivalFocus.length > 0) {
        setArchivalFocus(result.archivalFocus.join(", "));
      }
      if (result.sourceTypes && result.sourceTypes.length > 0) {
        setSourceTypes(result.sourceTypes.join(", "));
      }
      if (result.outputFormat) setOutputFormat(result.outputFormat);
      if (result.bioregionCandidates && result.bioregionCandidates.length > 0) {
        setBioregionCandidates(result.bioregionCandidates.map(c => ({ name: c.name })));
      }
      notify("Details auto-filled from research", "ok");
    } catch (e) {
      const errorMessage = String(e);
      setError(errorMessage);
      notify(`Enrichment failed: ${errorMessage}`, "err");
    } finally {
      setEnriching(false);
    }
  }

  function reset() {
    setStep(1);
    setSeed("");
    setPersona("standard");
    setLevel1(null);
    setAnswers([]);
    setStreamed("");
    setError(null);
    setStreaming(false);
    setEnriching(false);
    setBioregionCandidates([]);
  }

  async function saveToCatalog() {
    if (!streamed) return;
    if (!level1) return;
    const vars = extractVariables(streamed);
    const item: PromptItem = {
      id: "",
      title: level1.suggestedTitle || "Generated Prompt",
      description: `Generated from seed: "${seed.slice(0, 120)}"`,
      content: streamed,
      domain: coerceDomain(level1.domain),
      tags: ["triage-generated", level1.complexity.toLowerCase()],
      detectedVariables: vars,
      createdAt: "",
      lastModified: "",
      isFavorite: false,
      origin: "generated",
    };
    try {
      const saved = await upsertPrompt(item);
      notify(`Saved as "${saved.title}"`);
      selectPrompt(saved.id);
      setView("catalog");
    } catch (e) {
      notify(`Save failed: ${String(e)}`, "err");
    }
  }

  async function copyToClipboard() {
    if (!streamed) return;
    try {
      await navigator.clipboard.writeText(streamed);
      notify("Copied to clipboard");
    } catch (e) {
      notify(`Copy failed: ${String(e)}`, "err");
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg-900">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <header className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">
              3-Tier Intelligence Triage
            </h1>
            <p className="text-sm text-ink-faint">
              Seed → Intent → Refinement → Master prompt
            </p>
          </div>
        </header>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          <StepDot n={1} active={step >= 1} label="Seed" />
          <StepLine active={step >= 2} />
          <StepDot n={2} active={step >= 2} label="Refine" />
          <StepLine active={step >= 3} />
          <StepDot n={3} active={step >= 3} label="Generate" />
        </div>

        {settings && (
          <div className="mb-4 text-[11px] text-ink-faint font-mono px-3 py-2 bg-bg-800 border border-edge rounded-md">
            Active endpoint:{" "}
            <span className="text-accent">
              {settings.activeEndpoint === "freellm"
                ? settings.freellmBaseUrl
                : settings.koboldcppBaseUrl}
            </span>{" "}
            · model{" "}
            <span className="text-accent">
              {settings.activeEndpoint === "freellm"
                ? settings.freellmModel
                : settings.koboldcppModel}
            </span>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <section className="bg-bg-800 border border-edge rounded-lg p-6">
            <h2 className="text-sm font-semibold text-ink mb-2">
              Step 1 · Seed Prompt
            </h2>
            <p className="text-xs text-ink-faint mb-4">
              Describe what you want the prompt to do. A background LLM call will
              analyze the seed to extract domain, complexity, and missing
              constraints.
            </p>
            <textarea
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              rows={4}
              placeholder="e.g. Write a Rust CLI tool to parse log files"
              className="w-full px-4 py-3 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60 resize-none mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  runLevel1();
                }
              }}
            />

            <div className="mb-4">
              <label className="block text-xs font-medium text-ink mb-1.5">
                Subject Name <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Billy the Kid, Bigfoot, Artificial Intelligence, Ford Mustang"
                className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
              />
              <p className="text-[11px] text-ink-faint mt-1.5">
                Who or what is this prompt about? This is the core subject —
                the entity, technology, concept, or topic the corpus will be built around.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Country / Region
                </label>
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setStateRegion(""); }}
                  className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
                >
                  <option value="">-- Select country --</option>
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="Mexico">Mexico</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Ireland">Ireland</option>
                  <option value="Australia">Australia</option>
                  <option value="New Zealand">New Zealand</option>
                  <option value="China">China</option>
                  <option value="Japan">Japan</option>
                  <option value="India">India</option>
                  <option value="Russia">Russia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Italy">Italy</option>
                  <option value="Spain">Spain</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Argentina">Argentina</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Nordic Countries">Nordic Countries</option>
                  <option value="Other">Other (specify below)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">
                  State / Province / Region
                </label>
                {country === "United States" ? (
                  <div className="border border-edge rounded-md bg-bg-900">
                    {/* Region selector */}
                    <div className="flex flex-wrap gap-1.5 p-2 border-b border-edge">
                      <button
                        type="button"
                        onClick={() => setRegionFilter("")}
                        className={`px-2 py-0.5 text-[11px] rounded-md transition-all ${
                          regionFilter === ""
                            ? "bg-accent text-white"
                            : "bg-bg-800 text-ink-faint hover:text-ink"
                        }`}
                      >
                        All
                      </button>
                      {["Northeast", "Southeast", "Midwest", "Northwest", "Southwest"].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRegionFilter(r)}
                          className={`px-2 py-0.5 text-[11px] rounded-md transition-all ${
                            regionFilter === r
                              ? "bg-accent text-white"
                              : "bg-bg-800 text-ink-faint hover:text-ink"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {/* Multi-select state checklist */}
                    <div className="max-h-44 overflow-y-auto p-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <input
                          type="checkbox"
                          checked={filteredStates.length > 0 && filteredStates.every(s => selectedStates.includes(s))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStates(prev => Array.from(new Set([...prev, ...filteredStates])));
                            } else {
                              setSelectedStates(prev => prev.filter(s => !filteredStates.includes(s)));
                            }
                          }}
                          className="w-3.5 h-3.5 accent-accent"
                        />
                        <span className="text-[11px] text-ink-faint">
                          Select all in region
                        </span>
                      </div>
                      {(["Northeast", "Southeast", "Midwest", "Northwest", "Southwest"] as const).map(region => {
                        const statesInRegion = US_REGIONS[region];
                        if (regionFilter && regionFilter !== region) return null;
                        return (
                          <div key={region} className="mb-1.5">
                            <div className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold mb-0.5">
                              {region}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {statesInRegion.map(s => (
                                <label
                                  key={s}
                                  className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-accent"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedStates.includes(s)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedStates(prev => Array.from(new Set([...prev, s])));
                                      } else {
                                        setSelectedStates(prev => prev.filter(x => x !== s));
                                      }
                                    }}
                                    className="w-3.5 h-3.5 accent-accent"
                                  />
                                  <span className={selectedStates.includes(s) ? "text-ink" : "text-ink-faint/70 italic group-hover:text-ink-faint/90 group-hover:text-ink/80"}>{s}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Selected summary */}
                    {selectedStates.length > 0 && (
                      <div className="p-2 border-t border-edge text-[11px] text-ink-faint">
                        Selected: <span className="text-ink font-medium">{selectedStates.join(", ")}</span>
                      </div>
                    )}
                  </div>
                ) : country ? (
                  <input
                    type="text"
                    value={stateRegion}
                    onChange={(e) => setStateRegion(e.target.value)}
                    placeholder="e.g. Ontario, Bavaria, New South Wales"
                    className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
                  />
                ) : (
                  <input
                    type="text"
                    value={stateRegion}
                    onChange={(e) => setStateRegion(e.target.value)}
                    placeholder="e.g. New Jersey, Ontario, Bavaria"
                    className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
                  />
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-ink mb-1.5">
                Compiler Persona / Preset
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPersona("standard")}
                  className={`p-3 text-left border rounded-md transition-all ${
                    persona === "standard"
                      ? "border-accent bg-accent/10 text-ink"
                      : "border-edge bg-bg-900 text-ink-faint hover:border-ink-muted"
                  }`}
                >
                  <div className="text-xs font-semibold text-ink">Standard Architect</div>
                  <div className="text-[11px] text-ink-faint mt-0.5">General-purpose prompt synthesis.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPersona("deep_research")}
                  className={`p-3 text-left border rounded-md transition-all ${
                    persona === "deep_research"
                      ? "border-accent bg-accent/10 text-ink"
                      : "border-edge bg-bg-900 text-ink-faint hover:border-ink-muted"
                  }`}
                >
                  <div className="text-xs font-semibold text-ink">Deep Research</div>
                  <div className="text-[11px] text-ink-faint mt-0.5">StoryKeeper / 3-Level Epistemic Framework & 20+ sections.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPersona("non_fictional")}
                  className={`p-3 text-left border rounded-md transition-all ${
                    persona === "non_fictional"
                      ? "border-accent bg-accent/10 text-ink"
                      : "border-edge bg-bg-900 text-ink-faint hover:border-ink-muted"
                  }`}
                >
                  <div className="text-xs font-semibold text-ink">Non-Fictional</div>
                  <div className="text-[11px] text-ink-faint mt-0.5">85/10/5 corpus weighting, 19 sections.</div>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-ink mb-1.5">
                Entity Class
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setEntityClass("non_fictional"); setEntityTaxonomy("historical_individual"); }}
                  className={`p-3 text-left border rounded-md transition-all ${
                    entityClass === "non_fictional"
                      ? "border-accent bg-accent/10 text-ink"
                      : "border-edge bg-bg-900 text-ink-faint hover:border-ink-muted"
                  }`}
                >
                  <div className="text-xs font-semibold text-ink">Non-Fictional Historical</div>
                  <div className="text-[11px] text-ink-faint mt-0.5">Real persons/groups with archival records.</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setEntityClass("fictional"); setEntityTaxonomy("sole_individual"); }}
                  className={`p-3 text-left border rounded-md transition-all ${
                    entityClass === "fictional"
                      ? "border-accent bg-accent/10 text-ink"
                      : "border-edge bg-bg-900 text-ink-faint hover:border-ink-muted"
                  }`}
                >
                  <div className="text-xs font-semibold text-ink">Fictional / Folkloric</div>
                  <div className="text-[11px] text-ink-faint mt-0.5">Legendary entities, cryptids, fictional characters.</div>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-ink mb-1.5">
                Entity Taxonomy
              </label>
              <div className="grid grid-cols-2 gap-3">
                {entityClass === "non_fictional" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEntityTaxonomy("historical_individual")}
                      className={`p-3 text-left border rounded-md transition-all ${
                        entityTaxonomy === "historical_individual"
                          ? "border-accent bg-accent/10 text-ink"
                          : "border-edge bg-bg-900 text-ink-faint hover:border-ink-muted"
                      }`}
                    >
                      <div className="text-xs font-semibold text-ink">Historical Individual</div>
                      <div className="text-[11px] text-ink-faint mt-0.5">Single person with vital records, genealogy.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntityTaxonomy("historical_group")}
                      className={`p-3 text-left border rounded-md transition-all ${
                        entityTaxonomy === "historical_group"
                          ? "border-accent bg-accent/10 text-ink"
                          : "border-edge bg-bg-900 text-ink-faint hover:border-ink-muted"
                      }`}
                    >
                      <div className="text-xs font-semibold text-ink">Historical Group</div>
                      <div className="text-[11px] text-ink-faint mt-0.5">Communities, organizations, collective records.</div>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setEntityTaxonomy("sole_individual")}
                      className={`p-3 text-left border rounded-md transition-all ${
                        entityTaxonomy === "sole_individual"
                          ? "border-accent bg-accent/10 text-ink"
                          : "border-edge bg-bg-900 text-ink-faint hover:border-ink-muted"
                      }`}
                    >
                      <div className="text-xs font-semibold text-ink">Sole Individual</div>
                      <div className="text-[11px] text-ink-faint mt-0.5">Single legendary/fictional entity.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntityTaxonomy("species_population")}
                      className={`p-3 text-left border rounded-md transition-all ${
                        entityTaxonomy === "species_population"
                          ? "border-accent bg-accent/10 text-ink"
                          : "border-edge bg-bg-900 text-ink-faint hover:border-ink-muted"
                      }`}
                    >
                      <div className="text-xs font-semibold text-ink">Species / Regional Population</div>
                      <div className="text-[11px] text-ink-faint mt-0.5">Localized population with ecological matrix.</div>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mb-4">
              <button
                type="button"
                onClick={runEnrich}
                disabled={enriching || !seed.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 disabled:opacity-50 transition-all"
              >
                {enriching ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Wand2 size={14} />
                )}
                {enriching ? "Researching..." : "Auto-Fill Details"}
              </button>
              <p className="text-[11px] text-ink-faint mt-1.5">
                AI will research the subject and populate aliases, time period, locations, and source types.
              </p>
            </div>

            {entityClass === "fictional" && entityTaxonomy === "species_population" && bioregionCandidates.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Select Bioregion (regional population focus)
                </label>
                <select
                  value={bioregion}
                  onChange={(e) => setBioregion(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
                >
                  <option value="">-- Select a bioregion --</option>
                  {bioregionCandidates.map((c, i) => (
                    <option key={i} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. John Smith, Jersey Devil, Mothman"
                  className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Time Period / Era
                </label>
                <input
                  type="text"
                  value={timePeriodOrEra}
                  onChange={(e) => setTimePeriodOrEra(e.target.value)}
                  placeholder="e.g. 1860-1925, Colonial NJ, 1980-Present"
                  className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-ink mb-1.5">
                Primary Locations (comma-separated)
              </label>
              <input
                type="text"
                value={primaryLocations}
                onChange={(e) => setPrimaryLocations(e.target.value)}
                placeholder="e.g. Leeds Point, NJ; Gifford Pinchot NF, WA; Pine Barrens, NJ"
                className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
              />
            </div>

            {entityClass === "fictional" && entityTaxonomy === "species_population" && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">
                    Bioregion / Micro-Location
                  </label>
                  <input
                    type="text"
                    value={bioregion}
                    onChange={(e) => setBioregion(e.target.value)}
                    placeholder="e.g. Mount St. Helens / Gifford Pinchot NF"
                    className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">
                    Environmental Shocks (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={environmentalShocks}
                    onChange={(e) => setEnvironmentalShocks(e.target.value)}
                    placeholder="e.g. 1980 Eruption, Ash River Contamination"
                    className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-ink mb-1.5">
                Archival Focus (comma-separated)
              </label>
              <input
                type="text"
                value={archivalFocus}
                onChange={(e) => setArchivalFocus(e.target.value)}
                placeholder={entityClass === "non_fictional" ? "e.g. US Federal Census, Local Vital Records, Military Service Logs, Regional Newspapers" : "Optional for fictional entities"}
                className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Alternate Names / Aliases (comma-separated)
                </label>
                <input
                  type="text"
                  value={alternateNames}
                  onChange={(e) => setAlternateNames(e.target.value)}
                  placeholder="e.g. The Leeds Devil, Mother Leeds' 13th Child"
                  className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Output Format
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
                >
                  <option value="Markdown">Markdown</option>
                  <option value="JSON">JSON</option>
                  <option value="Plain Text">Plain Text</option>
                  <option value="YAML">YAML</option>
                </select>
              </div>
            </div>

            {entityClass === "non_fictional" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Source Types (comma-separated)
                </label>
                <input
                  type="text"
                  value={sourceTypes}
                  onChange={(e) => setSourceTypes(e.target.value)}
                  placeholder="e.g. US Federal Census, Local Vital Records, Military Service Logs, Regional Newspapers, Church Registers, Land Deeds"
                  className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60"
                />
              </div>
            )}
            {error && (
              <div className="mb-3 text-xs text-red-300 bg-red-900/30 border border-red-700/40 px-3 py-2 rounded-md font-mono">
                {error}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-ink-faint">⌘/Ctrl + Enter to run</p>
              <button
                onClick={runLevel1}
                disabled={busy || !seed.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Wand2 size={14} />
                )}
                Analyze Intent
              </button>
            </div>
          </section>
        )}

        {/* STEP 2 */}
        {step === 2 && level1 && (
          <section className="bg-bg-800 border border-edge rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-ink mb-1">
                  Step 2 · Refinement Wizard
                </h2>
                <p className="text-xs text-ink-faint">
                  Answer the missing-constraint questions to focus the master
                  prompt.
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
              >
                <ArrowLeft size={12} /> Back
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <Stat label="Suggested Title" value={level1.suggestedTitle || "--"} />
              <Stat label="Domain" value={level1.domain} />
              <Stat label="Complexity" value={level1.complexity} />
            </div>

            <div className="space-y-4">
              {level1.missingConstraints.map((q, i) => (
                <div key={i}>
                  <label className="block text-xs font-medium text-ink mb-1.5">
                    <span className="text-accent mr-1.5">Q{i + 1}.</span>
                    {q}
                  </label>
                  <textarea
                    value={answers[i] ?? ""}
                    onChange={(e) => {
                      const next = [...answers];
                      next[i] = e.target.value;
                      setAnswers(next);
                    }}
                    rows={2}
                    placeholder="Your answer..."
                    className="w-full px-3 py-2 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60 resize-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={runLevel3}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent-hover"
              >
                Compile Master Prompt <ArrowRight size={14} />
              </button>
            </div>
          </section>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <section className="bg-bg-800 border border-edge rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-ink mb-1">
                  Step 3 · Master Architecture Compiler
                </h2>
                <p className="text-xs text-ink-faint">
                  Streaming the final prompt from the local LLM.
                  {streaming && (
                    <span className="text-accent ml-1.5 inline-flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin" /> streaming
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink px-2 py-1"
                >
                  <ArrowLeft size={12} /> Back
                </button>
                <button
                  onClick={runLevel3}
                  disabled={streaming}
                  className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink px-2 py-1 disabled:opacity-50"
                >
                  <RefreshCw size={12} /> Re-run
                </button>
              </div>
            </div>

            <div className="border border-edge rounded-md bg-bg-900 min-h-[280px] max-h-[520px] overflow-y-auto">
              {streamed ? (
                <div className="px-5 py-4">
                  <MarkdownRenderer content={streamed} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-ink-faint text-sm">
                  <Loader2 size={18} className="animate-spin mb-2" />
                  Waiting for first token...
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 text-xs text-red-300 bg-red-900/30 border border-red-700/40 px-3 py-2 rounded-md font-mono">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={copyToClipboard}
                disabled={!streamed}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-bg-700 border border-edge hover:bg-bg-600 disabled:opacity-40"
              >
                <Copy size={13} /> Copy
              </button>
              <button
                onClick={saveToCatalog}
                disabled={!streamed || streaming}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-40"
              >
                <Save size={13} /> Save to Catalog
              </button>
            </div>
          </section>
        )}

        {step === 3 && !streaming && streamed && (
          <div className="mt-4 text-center">
            <button
              onClick={reset}
              className="text-xs text-ink-faint hover:text-ink-muted"
            >
              ↺ Start a new triage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepDot({
  n,
  active,
  label,
}: {
  n: number;
  active: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border ${
          active
            ? "bg-accent text-white border-accent"
            : "bg-bg-700 text-ink-faint border-edge"
        }`}
      >
        {n}
      </div>
      <span
        className={`text-xs ${active ? "text-ink" : "text-ink-faint"}`}
      >
        {label}
      </span>
    </div>
  );
}

function StepLine({ active }: { active: boolean }) {
  return (
    <div
      className={`flex-1 h-px mx-2 ${active ? "bg-accent" : "bg-edge"}`}
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-900 border border-edge rounded-md px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-faint">
        {label}
      </div>
      <div className="text-sm text-ink mt-0.5 truncate">{value}</div>
    </div>
  );
}

function coerceDomain(s: string): PromptItem["domain"] {
  const v = s.trim().toLowerCase();
  if (v === "code") return "Code";
  if (v === "writing") return "Writing";
  if (v === "planning") return "Planning";
  if (v === "architecture") return "Architecture";
  return "General";
}
