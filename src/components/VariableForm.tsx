import { useMemo } from "react";
import type { PromptItem } from "../types";
import { extractVariables } from "../lib/markdown";

interface Props {
  prompt: PromptItem | null;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

export default function VariableForm({ prompt, values, onChange }: Props) {
  const vars = useMemo(
    () => (prompt?.content ? extractVariables(prompt.content) : []),
    [prompt?.content],
  );

  if (!prompt) return null;
  if (vars.length === 0) {
    return (
      <div className="text-xs text-ink-faint italic px-1">
        No variables detected in this prompt.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vars.map((name) => (
        <div key={name}>
          <label className="block text-[11px] font-mono text-accent mb-1">
            {`{${name}}`}
          </label>
          <textarea
            value={values[name] ?? ""}
            onChange={(e) => onChange(name, e.target.value)}
            rows={2}
            placeholder={`Value for ${name}...`}
            className="w-full px-3 py-1.5 text-sm bg-bg-900 border border-edge rounded-md focus:outline-none focus:border-accent/60 resize-y font-mono"
          />
        </div>
      ))}
    </div>
  );
}
