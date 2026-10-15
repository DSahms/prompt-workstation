import { useMemo } from "react";
import type { PromptItem } from "../types";
import { substituteVariables } from "../lib/markdown";
import MarkdownRenderer from "./MarkdownRenderer";

interface Props {
  prompt: PromptItem | null;
  values: Record<string, string>;
  /** When true, shows the substituted preview. When false, shows raw template. */
  injected: boolean;
}

export default function LivePreview({ prompt, values, injected }: Props) {
  const rendered = useMemo(() => {
    if (!prompt) return "";
    return injected
      ? substituteVariables(prompt.content, values)
      : prompt.content;
  }, [prompt, values, injected]);

  if (!prompt) return null;

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      <MarkdownRenderer content={rendered} />
    </div>
  );
}
