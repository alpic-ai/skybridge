import {
  auth,
  discoverOAuthProtectedResourceMetadata,
  UnauthorizedError,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { AppsSdkContext, CallToolArgs } from "skybridge/web";
import { useAuthStore } from "@/lib/auth-store.js";
import { useStore } from "@/lib/store.js";
import { useSelectedToolName } from "../nuqs.js";
import { queryClient } from "../query-client.js";
import { BrowserOAuthProvider } from "./browser-oauth-provider.js";
import { McpClient } from "./client.js";

const DEFAULT_SERVER_URL = "http://localhost:3000/mcp";

const client = new McpClient();
let currentAuthProvider: BrowserOAuthProvider | null = null;

export async function connectToServer(): Promise<void> {
  const { setStatus, setRequiresAuth, setError } = useAuthStore.getState();
  setStatus("connecting");
  setError(null);

  await client.close();

  let requiresAuth = false;

  try {
    const resourceMetadata =
      await discoverOAuthProtectedResourceMetadata(DEFAULT_SERVER_URL);
    if (resourceMetadata?.authorization_servers?.length) {
      requiresAuth = true;
    }
  } catch {
    // 404 or network error means no OAuth required
  }

  setRequiresAuth(requiresAuth);

  try {
    if (requiresAuth) {
      currentAuthProvider = new BrowserOAuthProvider();
      await client.connect(DEFAULT_SERVER_URL, currentAuthProvider);
    } else {
      currentAuthProvider = null;
      await client.connect(DEFAULT_SERVER_URL);
    }
    setStatus("authenticated");
    queryClient.invalidateQueries({ queryKey: ["list-tools"] });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      setStatus("unauthenticated");
      return;
    }
    setStatus("error");
    setError(error instanceof Error ? error.message : "Connection failed");
  }
}

export async function finishOAuthCallback(code: string): Promise<void> {
  const provider = new BrowserOAuthProvider();
  await auth(provider, {
    serverUrl: DEFAULT_SERVER_URL,
    authorizationCode: code,
  });
  await connectToServer();
}

export function logout(): void {
  currentAuthProvider?.invalidateCredentials("all");
  currentAuthProvider = null;
  client.close();
  useAuthStore.getState().reset();
  queryClient.invalidateQueries({ queryKey: ["list-tools"] });
}

const defaultOpenaiObject: AppsSdkContext = {
  theme: "light",
  userAgent: {
    device: { type: "desktop" },
    capabilities: { hover: true, touch: false },
  },
  locale: "en-US",
  maxHeight: undefined,
  displayMode: "inline",
  safeArea: {
    insets: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
  },
  toolInput: {},
  toolOutput: null,
  toolResponseMetadata: null,
  view: { mode: "inline" },
  widgetState: null,
};

export const useSuspenseTools = () => {
  const status = useAuthStore((s) => s.status);
  const { data } = useQuery<Tool[]>({
    queryKey: ["list-tools"],
    queryFn: () => client.listTools(),
    enabled: status === "authenticated",
  });
  return data ?? [];
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
        openaiRef: null,
        openaiLogs: [],
        openaiObject: null,
        openInAppUrl: null,
      });
      const response = await client.callTool(toolName, args);
      setToolData(toolName, {
        input: args ?? {},
        response,
        openaiRef: null,
        openaiLogs: [],
        openaiObject: {
          ...defaultOpenaiObject,
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
