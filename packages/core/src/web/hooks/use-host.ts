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

export type HostInfo = {
  name: Host | (string & {}) | undefined;
  version: string | undefined;
};

/**
 * Identity of the host application rendering the view, from the MCP Apps
 * `ui/initialize` handshake. `name` is normalized to a {@link Host} slug when
 * recognized, otherwise the raw string; both fields are `undefined` until the
 * handshake resolves (the view renders first and re-renders once it lands).
 *
 * @example
 * ```tsx
 * const { name } = useHost();
 * if (name === "claude") return <ClaudeLayout />;
 * ```
 */
export function useHost(): HostInfo {
  const hostInfo = useMcpAppContext("hostInfo");
  const name = hostInfo?.name;

  return {
    name:
      name !== undefined ? (HOST_BY_REPORTED_NAME[name] ?? name) : undefined,
    version: hostInfo?.version,
  };
}
