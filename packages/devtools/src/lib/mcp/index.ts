import {
  auth,
  discoverOAuthProtectedResourceMetadata,
  UnauthorizedError,
} from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import type { AppsSdkContext, CallToolArgs } from "skybridge/web";
import { useAuthStore } from "@/lib/auth-store.js";
import { env } from "@/lib/env.js";
import { getInspectorPreferences } from "@/lib/inspector-preferences-store.js";
import { useStore } from "@/lib/store.js";
import { useSelectedToolName } from "../nuqs.js";
import { queryClient } from "../query-client.js";
import { BrowserOAuthProvider } from "./browser-oauth-provider.js";
import { McpClient } from "./client.js";

const client = new McpClient();
let currentAuthProvider: BrowserOAuthProvider | null = null;

const getServerUrl = () => {
  return env.VITE_MCP_SERVER_URL;
};

// SEP-1488 mirrors per-tool security requirements under `_meta.securitySchemes`.
// A tool "requires auth" when it declares schemes and none of them is `noauth`.
function toolRequiresAuth(tool: Tool): boolean {
  const schemes = tool._meta?.securitySchemes as
    | Array<{ type?: string }>
    | undefined;
  if (!schemes || schemes.length === 0) {
    return false;
  }
  return !schemes.some((s) => s?.type === "noauth");
}

function isUnauthorized(error: unknown): boolean {
  if (error instanceof UnauthorizedError) {
    return true;
  }
  if (error instanceof StreamableHTTPError && error.code === 401) {
    return true;
  }
  return false;
}

export async function connectToServer(): Promise<void> {
  const serverUrl = getServerUrl();
  const {
    setStatus,
    setRequiresAuth,
    setHasAuthRequiredTools,
    setIsSignedIn,
    setError,
  } = useAuthStore.getState();
  setStatus("connecting");
  setError(null);

  await client.close();

  let requiresAuth = false;
  try {
    const resourceMetadata =
      await discoverOAuthProtectedResourceMetadata(serverUrl);
    if (resourceMetadata?.authorization_servers?.length) {
      requiresAuth = true;
    }
  } catch {
    // 404 or network error means no OAuth available
  }

  setRequiresAuth(requiresAuth);

  // Attach the provider only when we already hold a token. Otherwise stay
  // anonymous so the SDK doesn't preemptively redirect to /authorize: in
  // mixed-auth mode the server happily serves anonymous requests.
  const provider = requiresAuth ? new BrowserOAuthProvider() : null;
  const hasToken = !!provider?.tokens();
  currentAuthProvider = provider;

  try {
    await client.connect(
      serverUrl,
      hasToken && provider ? provider : undefined,
    );
  } catch (error) {
    if (isUnauthorized(error) && provider) {
      // Server requires auth for the initial handshake. Re-attempt with the
      // provider so the SDK runs the OAuth flow.
      try {
        await client.close();
        await client.connect(serverUrl, provider);
      } catch (retryError) {
        if (isUnauthorized(retryError)) {
          setIsSignedIn(false);
          setHasAuthRequiredTools(false);
          setStatus("unauthenticated");
          return;
        }
        setIsSignedIn(false);
        setHasAuthRequiredTools(false);
        setStatus("error");
        setError(
          retryError instanceof Error
            ? retryError.message
            : "Connection failed",
        );
        return;
      }
    } else {
      setIsSignedIn(false);
      setHasAuthRequiredTools(false);
      setStatus("error");
      setError(error instanceof Error ? error.message : "Connection failed");
      return;
    }
  }

  setIsSignedIn(hasToken);
  setStatus("authenticated");
  queryClient.invalidateQueries({ queryKey: ["list-tools"] });

  // Detect auth-required tools from the live tool list so the UI can gate
  // them behind sign-in without round-tripping through a 401.
  try {
    const tools = await client.listTools();
    setHasAuthRequiredTools(tools.some(toolRequiresAuth));
  } catch {
    setHasAuthRequiredTools(false);
  }
}

export async function signIn(): Promise<void> {
  const serverUrl = getServerUrl();
  const provider = currentAuthProvider ?? new BrowserOAuthProvider();
  currentAuthProvider = provider;
  // Drop any stale client/token state so the SDK runs a fresh DCR + redirect.
  provider.invalidateCredentials("all");
  await auth(provider, { serverUrl });
}

export async function finishOAuthCallback(code: string): Promise<void> {
  const serverUrl = getServerUrl();
  const provider = new BrowserOAuthProvider();
  await auth(provider, {
    serverUrl: serverUrl,
    authorizationCode: code,
  });
  await connectToServer();
}

export async function logout(): Promise<void> {
  currentAuthProvider?.invalidateCredentials("all");
  currentAuthProvider = null;
  await client.close();
  useAuthStore.getState().reset();
  queryClient.invalidateQueries({ queryKey: ["list-tools"] });
}

export { toolRequiresAuth };

const buildInitialOpenaiObject = (): AppsSdkContext => {
  const preferences = getInspectorPreferences();
  return {
    ...preferences,
    view: { mode: preferences.displayMode },
    toolInput: {},
    toolOutput: null,
    toolResponseMetadata: null,
    widgetState: null,
  };
};

export const useSuspenseTools = () => {
  const { data } = useSuspenseQuery<Tool[]>({
    queryKey: ["list-tools"],
    queryFn: () => client.listTools(),
  });
  return data;
};

export const useServerInfo = () => {
  const status = useAuthStore((s) => s.status);
  if (status !== "authenticated") {
    return undefined;
  }
  return client.getServerInfo();
};

export const useCallTool = () => {
  const { setToolData } = useStore();

  return useMutation({
    mutationFn: async ({
      toolName,
      args,
    }: {
      toolName: string;
      args: CallToolArgs;
    }) => {
      setToolData(toolName, {
        input: args ?? {},
        response: undefined,
        durationMs: null,
        openaiRef: null,
        openaiLogs: [],
        openaiObject: null,
        openInAppUrl: null,
      });
      const startedAt = performance.now();
      const response = await client.callTool(toolName, args);
      const durationMs = Math.round(performance.now() - startedAt);
      const completedAt = Date.now();
      setToolData(toolName, {
        input: args ?? {},
        response,
        durationMs,
        openaiRef: null,
        openaiLogs: [
          {
            id: crypto.randomUUID(),
            timestamp: completedAt - durationMs,
            source: "server",
            command: "callTool",
            args: { name: toolName, args: args ?? {} },
            type: "default",
          },
          {
            id: crypto.randomUUID(),
            timestamp: completedAt,
            source: "server",
            command: "callTool response",
            args: response as unknown as Record<string, unknown>,
            type: "response",
          },
        ],
        openaiObject: {
          ...buildInitialOpenaiObject(),
          toolInput: args ?? {},
          toolOutput: response.structuredContent,
          toolResponseMetadata: response.meta ?? null,
          widgetState: null,
        },
        openInAppUrl: null,
      });
      return response;
    },
  });
};

export const useSelectedToolOrNull = () => {
  const [selectedTool] = useSelectedToolName();
  const tools = useSuspenseTools();

  return tools.find((t) => t.name === selectedTool) ?? null;
};

export const useSelectedTool = () => {
  const tool = useSelectedToolOrNull();
  if (!tool) {
    throw new Error("No tool is currently selected");
  }
  return tool;
};

export const useSuspenseResource = (uri?: string) => {
  return useSuspenseQuery({
    queryKey: ["resource", uri],
    queryFn: async () => {
      if (!uri) {
        throw new Error("Resource URI is required");
      }
      const resource = await client.readResource(uri);
      return resource;
    },
  });
};

export default client;
