import { useHostContext } from "../bridges/index.js";
import type { UnknownObject } from "../types.js";

/**
 * {@link useToolInfo} state before the tool has been invoked.
 *
 * @deprecated `useToolInfo` no longer returns the idle state — it starts in
 * `"pending"` and transitions to `"success"`, so `isIdle` is always `false` at
 * runtime. This type is retained in {@link ToolState} for backwards
 * compatibility and will be removed in the next major.
 */
export type ToolIdleState = {
  status: "idle";
  isIdle: true;
  isPending: false;
  isSuccess: false;
  input: undefined;
  output: undefined;
  responseMetadata: undefined;
};

/**
 * {@link useToolInfo} state while the tool is executing — `output` is not yet
 * available.
 *
 * `input` is optional: the host may render the view before delivering the
 * tool arguments.
 */
export type ToolPendingState<ToolInput extends UnknownObject> = {
  status: "pending";
  isIdle: false;
  isPending: true;
  isSuccess: false;
  input: ToolInput | undefined;
  output: undefined;
  responseMetadata: undefined;
};

/**
 * {@link useToolInfo} state once the tool returned — `output` is available.
 *
 * `input` is optional: the host may not have surfaced the tool arguments by
 * the time `output` arrives.
 */
export type ToolSuccessState<
  ToolInput extends UnknownObject,
  ToolOutput extends UnknownObject,
  ToolResponseMetadata extends UnknownObject,
> = {
  status: "success";
  isIdle: false;
  isPending: false;
  isSuccess: true;
  input: ToolInput | undefined;
  output: ToolOutput;
  responseMetadata: ToolResponseMetadata;
};

/**
 * Discriminated union describing the tool invocation that triggered the
 * current view render. Use `isPending` / `isSuccess` to narrow.
 */
export type ToolState<
  ToolInput extends UnknownObject,
  ToolOutput extends UnknownObject,
  ToolResponseMetadata extends UnknownObject,
> =
  | ToolIdleState
  | ToolPendingState<ToolInput>
  | ToolSuccessState<ToolInput, ToolOutput, ToolResponseMetadata>;

type ToolSignature = {
  input: UnknownObject;
  output: UnknownObject;
  responseMetadata: UnknownObject;
};

function deriveStatus(
  output: Record<string, unknown> | null,
  responseMetadata: Record<string, unknown> | null,
): "pending" | "success" {
  if (output === null && responseMetadata === null) {
    return "pending";
  }
  return "success";
}

/**
 * Access the tool invocation that produced the current view: its `input`,
 * resulting `output`, and `responseMetadata`. The shape evolves as the tool
 * runs (pending → success), exposed through {@link ToolState}.
 *
 * For full input/output typing per tool name, prefer the typed `useToolInfo`
 * returned by {@link generateHelpers} over the generic form.
 *
 * @typeParam TS - Optional partial shape `{ input, output, responseMetadata }`
 * to refine each field's type. When omitted, each typed field resolves to
 * `never` — pass an explicit shape or use the typed helper from
 * {@link generateHelpers} to get usable types.
 *
 * @example
 * ```tsx
 * const { isSuccess, input, output } = useToolInfo<{
 *   input: { query: string };
 *   output: { results: Result[] };
 * }>();
 *
 * if (!isSuccess || !output) return <Skeleton />;
 * return <Results items={output.results} />;
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-tool-info
 */
export function useToolInfo<
  TS extends Partial<ToolSignature> = Record<string, never>,
>() {
  const input = useHostContext("toolInput");
  const output = useHostContext("toolOutput");
  const responseMetadata = useHostContext("toolResponseMetadata");

  const status = deriveStatus(output, responseMetadata);

  type Input = UnknownObject & TS["input"];
  type Output = UnknownObject & TS["output"];
  type Metadata = UnknownObject & TS["responseMetadata"];

  return {
    input: input ?? undefined,
    status,
    isIdle: false,
    isPending: status === "pending",
    isSuccess: status === "success",
    output,
    responseMetadata,
  } as ToolState<Input, Output, Metadata>;
}
