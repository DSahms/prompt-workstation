/// Variable extraction + substitution (frontend mirror of Rust yaml.rs).
/// Keeps the live preview instant without a round-trip per keystroke.

const VAR_REGEX = /\[([A-Z0-9_]+)\]|\{\{([A-Z0-9_]+)\}\}/g;

export function extractVariables(content: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  VAR_REGEX.lastIndex = 0;
  while ((m = VAR_REGEX.exec(content)) !== null) {
    const name = m[1] ?? m[2] ?? "";
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

export function substituteVariables(
  content: string,
  values: Record<string, string>,
): string {
  return content.replace(VAR_REGEX, (match, brack: string | undefined, curly: string | undefined) => {
    const name = brack ?? curly ?? "";
    return values[name] ?? match;
  });
}
