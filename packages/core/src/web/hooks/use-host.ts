import type { McpUiHostCapabilities } from "@modelcontextprotocol/ext-apps";
import { useMemo } from "react";
import { useMcpAppContext } from "../bridges/index.js";

/**
 * Known host applications, as normalized slugs. Unrecognized hosts surface
 * their raw `hostInfo.name` string instead.
 */
export type Host =
  | "chatgpt"
  | "claude"
  | "cursor"
  | "goose"
  | "mistral-vibe"
  | "alpic";

const HOST_BY_REPORTED_NAME: Record<string, Host> = {
  chatgpt: "chatgpt",
  Claude: "claude",
  Cursor: "cursor",
  "MCP-UI Host": "goose",
  "Le Chat": "mistral-vibe",
  "alpic-playground": "alpic",
};

/**
 * OpenAI MCP extensions the host advertises. Each flag is `true` only when the
 * host sends `hostCapabilities.experimental["openai/<name>"]`, so every flag is
 * `false` before the handshake and on hosts other than ChatGPT.
 */
export type OpenAIHostCapabilities = {
  /** Read, subscribe to and write the file opened through a file entrypoint. */
  resource: boolean;
  /** Titles, thumbnails and background content in `ui/update-model-context`. */
  modelContext: boolean;
  /** `ui/message` targets and titled items. */
  message: boolean;
  /** Open a local file with `openai/files/open`. */
  files: boolean;
};

export type HostInfo = {
  name: Host | (string & {}) | undefined;
  version: string | undefined;
  /** The host's MCP Apps capabilities, `undefined` until the handshake. */
  capabilities: McpUiHostCapabilities | undefined;
  /** OpenAI MCP extensions the host supports. */
  openai: OpenAIHostCapabilities;
};

/**
 * Identity and capabilities of the host application rendering the view, from
 * the MCP Apps `ui/initialize` handshake. `name` is normalized to a
 * {@link Host} slug when recognized, otherwise the raw string; `name`,
 * `version` and `capabilities` are `undefined` until the handshake resolves
 * (the view renders first and re-renders once it lands).
 *
 * @example
 * ```tsx
 * const { name, openai } = useHost();
 * if (name === "claude") return <ClaudeLayout />;
 * if (openai.files) return <OpenFileButton />;
 * ```
 */
export function useHost(): HostInfo {
  const hostInfo = useMcpAppContext("hostInfo");
  const capabilities = useMcpAppContext("hostCapabilities") ?? undefined;
  const name = hostInfo?.name;
  const openai = useMemo(() => {
    const supports = (extension: string) =>
      capabilities?.experimental?.[`openai/${extension}`] !== undefined;
    return {
      resource: supports("resource"),
      modelContext: supports("modelContext"),
      message: supports("message"),
      files: supports("files"),
    };
  }, [capabilities]);

  return {
    name:
      name !== undefined ? (HOST_BY_REPORTED_NAME[name] ?? name) : undefined,
    version: hostInfo?.version,
    capabilities,
    openai,
  };
}
