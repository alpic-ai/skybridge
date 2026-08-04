import type { AppsSdkWidgetState, CallToolResponse } from "skybridge/web";

export const TOOL_OUTPUT_WARNING_TOKENS = 5_000;
export const VIEW_STATE_WARNING_TOKENS = 20_000;

export function estimateContextTokens(value: unknown): number {
  try {
    const serialized = JSON.stringify(value);
    if (!serialized) {
      return 0;
    }
    return Math.ceil(new TextEncoder().encode(serialized).length / 4);
  } catch {
    return 0;
  }
}

export function getToolOutputTokenCount(response: CallToolResponse): number {
  const { meta: _meta, ...modelVisibleResponse } = response;
  return estimateContextTokens(modelVisibleResponse);
}

export function getViewStateTokenCount(
  widgetState: AppsSdkWidgetState | null | undefined,
): number {
  return estimateContextTokens(widgetState?.modelContent);
}

export function warnOnLargeToolOutput(
  response: CallToolResponse,
  toolName: string,
): void {
  const tokenCount = getToolOutputTokenCount(response);
  if (tokenCount >= TOOL_OUTPUT_WARNING_TOKENS) {
    console.warn(
      `[skybridge] Tool "${toolName}" returned ${tokenCount} estimated model-visible tokens; this reaches the ${TOOL_OUTPUT_WARNING_TOKENS}-token warning threshold and may overload model context. Content and structured content are included in this estimate.`,
    );
  }
}

export function warnOnLargeViewState(value: unknown, source: string): void {
  const tokenCount = estimateContextTokens(value);
  if (tokenCount >= VIEW_STATE_WARNING_TOKENS) {
    console.warn(
      `[skybridge] ${source} is persisting ${tokenCount} estimated tokens in model-visible view state; this reaches the ${VIEW_STATE_WARNING_TOKENS}-token warning threshold and may overload model context. Persisted view state and data-llm context are included in this estimate.`,
    );
  }
}
