import { useHostContext } from "../bridges/index.js";
import type { UnknownObject } from "../types.js";

/** {@link useToolInfo} state before the tool has been invoked. */
export type ToolIdleState = {
  status: "idle";
  isIdle: true;
  isPending: false;
  isSuccess: false;
  input: undefined;
  output: undefined;
  responseMetadata: undefined;
};

/** {@link useToolInfo} state while the tool is executing — `input` is available, output is not yet. */
export type ToolPendingState<ToolInput extends UnknownObject> = {
  status: "pending";
  isIdle: false;
  isPending: true;
  isSuccess: false;
  input: ToolInput;
  output: undefined;
  responseMetadata: undefined;
};

/** {@link useToolInfo} state once the tool returned — `input`, `output`, and `responseMetadata` are all available. */
export type ToolSuccessState<
  ToolInput extends UnknownObject,
  ToolOutput extends UnknownObject,
  ToolResponseMetadata extends UnknownObject,
> = {
  status: "success";
  isIdle: false;
  isPending: false;
  isSuccess: true;
  input: ToolInput;
  output: ToolOutput;
  responseMetadata: ToolResponseMetadata;
};

/**
 * Discriminated union describing the tool invocation that triggered the
 * current view render. Use `isIdle` / `isPending` / `isSuccess` to narrow.
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
  input: Record<string, unknown> | null,
  output: Record<string, unknown> | null,
  responseMetadata: Record<string, unknown> | null,
): "idle" | "pending" | "success" {
  if (input === null) {
    return "idle";
  }
  if (output === null && responseMetadata === null) {
    return "pending";
  }
  return "success";
}

/**
 * Access the tool invocation that produced the current view: its `input`,
 * resulting `output`, and `responseMetadata`. The shape evolves as the tool
 * runs (idle → pending → success), exposed through {@link ToolState}.
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
 * if (!isSuccess) return <Skeleton />;
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

  const status = deriveStatus(input, output, responseMetadata);

  type Input = UnknownObject & TS["input"];
  type Output = UnknownObject & TS["output"];
  type Metadata = UnknownObject & TS["responseMetadata"];

  return {
    input,
    status,
    isIdle: status === "idle",
    isPending: status === "pending",
    isSuccess: status === "success",
    output,
    responseMetadata,
  } as ToolState<Input, Output, Metadata>;
}
