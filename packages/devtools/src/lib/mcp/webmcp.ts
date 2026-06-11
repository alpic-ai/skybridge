import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { useEffect, useRef } from "react";
import type { CallToolResponse } from "skybridge/web";

// Minimal typings for the WebMCP proposal (https://github.com/webmachinelearning/webmcp).
// Tools registered on `document.modelContext` are discoverable by browser
// agents, which can invoke them against the connected MCP server.
interface ModelContextToolDescriptor {
  name: string;
  description?: string;
  inputSchema?: Tool["inputSchema"];
  execute: (
    args: Record<string, unknown>,
  ) => Promise<Pick<CallToolResponse, "content" | "isError">>;
}

interface ModelContext {
  registerTool: (
    descriptor: ModelContextToolDescriptor,
    options?: { signal?: AbortSignal },
  ) => Promise<void>;
}

declare global {
  /**
   * To align with the fact that tools are effectively per-Document, the WebML CG agreed to move the modelContext getter from the Navigator interface to the Document interface. You can find the full technical details in Issue 173 and PR #184.
   *
   * navigator.modelContext is now deprecated as of Chrome 150.0.7861.0 and will be removed in a future Chrome release.
   * Use document.modelContext instead.
   */
  interface Navigator {
    modelContext?: ModelContext;
  }
  interface Document {
    modelContext?: ModelContext;
  }

  /**
   * Declarative WebMCP additions to `SubmitEvent`
   * (https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md).
   */
  interface SubmitEvent {
    /** True when the form submission was invoked by an agent. */
    readonly agentInvoked?: boolean;
    /**
     * Overrides the default form action and pipes the resolved value back to
     * the agent that invoked the form tool. `preventDefault()` must be called
     * before this method.
     */
    respondWith?(agentResponse: Promise<unknown>): void;
  }
}

/**
 * Declarative WebMCP markers: `<form toolname tooldescription toolautosubmit>`
 * exposes the form as a tool to browser agents, and `toolparamdescription` on
 * form controls documents each input-schema property.
 */
declare module "react" {
  interface FormHTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    /** Boolean attribute — pass an empty string to enable. */
    toolautosubmit?: string;
  }
  interface InputHTMLAttributes<T> {
    toolparamdescription?: string;
  }
  interface TextareaHTMLAttributes<T> {
    toolparamdescription?: string;
  }
  interface SelectHTMLAttributes<T> {
    toolparamdescription?: string;
  }
}

export function useRegisterWebMcpTool({
  tool,
  enabled,
  execute,
}: {
  tool: Tool;
  enabled: boolean;
  execute: () => Promise<Pick<CallToolResponse, "content" | "isError">>;
}) {
  // Keep the latest handler without re-registering on every render.
  const executeRef = useRef(execute);
  useEffect(() => {
    executeRef.current = execute;
  });

  const { name, description, inputSchema } = tool;
  useEffect(() => {
    const modelContext = document.modelContext ?? navigator.modelContext;
    if (!enabled || !modelContext) {
      return;
    }
    const controller = new AbortController();
    void modelContext.registerTool(
      {
        name,
        description,
        inputSchema,
        execute: () => executeRef.current(),
      },
      { signal: controller.signal },
    );
    return () => {
      controller.abort();
    };
  }, [enabled, name, description, inputSchema]);
}
