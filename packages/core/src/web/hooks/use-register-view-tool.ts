import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { useEffect, useRef } from "react";
import { getAdaptor } from "../bridges/index.js";
import type {
  AnyViewToolHandler,
  ViewToolConfig,
  ViewToolHandler,
} from "../bridges/types.js";

/**
 * Register a tool the view exposes to the host and model — the MCP Apps
 * "app-provided tools" feature. A view tool runs *inside the view*: the host
 * discovers it via `tools/list` and invokes it via `tools/call`, and the
 * handler executes against the view's live state. It is the inverse of
 * {@link useCallTool} (which calls a server tool). Registered on mount, removed
 * on unmount; re-registered when `config.name` changes.
 *
 * MCP Apps only — on the Apps SDK (`window.openai`) runtime it is a no-op.
 *
 * @example
 * ```tsx
 * import * as z from "zod";
 * import { useRegisterViewTool } from "skybridge/web";
 *
 * useRegisterViewTool(
 *   {
 *     name: "chess_make_move",
 *     description: "Play a move in algebraic notation, e.g. 'e4' or 'Nf3'.",
 *     inputSchema: { san: z.string() },
 *     annotations: { readOnlyHint: false },
 *   },
 *   ({ san }) => {
 *     const move = game.move(san);
 *     return {
 *       content: [{ type: "text", text: move ? `Played ${move.san}` : "Illegal move" }],
 *       structuredContent: { fen: game.fen() },
 *       isError: !move,
 *     };
 *   },
 * );
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-register-view-tool
 */
export const useRegisterViewTool = <
  TInput extends ZodRawShapeCompat = ZodRawShapeCompat,
>(
  config: ViewToolConfig<TInput>,
  handler: ViewToolHandler<TInput>,
) => {
  const { name } = config;
  const configRef = useRef(config);
  configRef.current = config;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const adaptor = getAdaptor();
    const wrappedHandler: AnyViewToolHandler = (args) =>
      handlerRef.current(args as Parameters<ViewToolHandler<TInput>>[0]);

    return adaptor.registerViewTool(
      { ...configRef.current, name },
      wrappedHandler,
    );
  }, [name]);
};
