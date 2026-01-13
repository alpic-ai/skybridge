import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import type { AppsSdkContext, CallToolArgs } from "skybridge/web";
import { useStore } from "@/lib/store.js";
import { useSelectedToolName } from "../nuqs.js";
import { McpClient } from "./client.js";

const client = new McpClient();

client.connect("http://localhost:3000/mcp").then(() => {
  console.info("Connected to MCP server");
});

const defaultOpenaiObject: AppsSdkContext = {
  theme: "light",
  userAgent: {
    device: { type: "desktop" },
    capabilities: { hover: true, touch: false },
  },
  locale: "en-US",
  maxHeight: 600,
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
  const { data } = useSuspenseQuery<Tool[]>({
    queryKey: ["list-tools"],
    queryFn: () => client.listTools(),
  });
  return data;
};

export const useServerInfo = () => {
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
