const TOKEN_LIMIT = 4000;
const CHARS_PER_TOKEN = 4;
const CHAR_LIMIT = TOKEN_LIMIT * CHARS_PER_TOKEN;

let hasWarned = false;

function estimateTokens(str: string): number {
  return Math.ceil(str.length / CHARS_PER_TOKEN);
}

export function warnIfExceedsTokenLimit(
  state: unknown,
  source: "setWidgetState" | "data-llm",
): void {
  if (state === null || state === undefined) {
    return;
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(state);
  } catch {
    return;
  }

  if (serialized.length <= CHAR_LIMIT) {
    hasWarned = false;
    return;
  }

  if (hasWarned) {
    return;
  }

  hasWarned = true;
  const estimatedTokens = estimateTokens(serialized);

  const message =
    source === "data-llm"
      ? `[Skybridge] Warning: data-llm content exceeds recommended ${TOKEN_LIMIT} token limit (estimated ~${estimatedTokens} tokens). ` +
        `Large payloads sent via data-llm may impact model performance. ` +
        `Consider reducing the amount of data exposed to the model.`
      : `[Skybridge] Warning: setWidgetState payload exceeds recommended ${TOKEN_LIMIT} token limit (estimated ~${estimatedTokens} tokens). ` +
        `Large payloads sent to the model may impact performance. ` +
        `Keep the payload small and focused on data the model needs.`;

  console.warn(message);
}

export function resetTokenLimitWarning(): void {
  hasWarned = false;
}
