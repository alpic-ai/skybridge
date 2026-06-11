import {
  AccordionContent,
  AccordionItem,
} from "@alpic-ai/ui/components/accordion";
import { Badge } from "@alpic-ai/ui/components/badge";
import { Button } from "@alpic-ai/ui/components/button";
import { Tabs, TabsContent } from "@alpic-ai/ui/components/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@alpic-ai/ui/components/tooltip";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type Form from "@rjsf/core";
import { Form as FormComponent } from "@rjsf/shadcn";
import type { RJSFSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { useKeyPress } from "ahooks";
import { Braces, ClipboardList, Loader2, Play, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CallToolResponse } from "skybridge/web";
import { useAuthStore } from "@/lib/auth-store.js";
import { CopyButton } from "@/lib/copy.js";
import {
  toolRequiresAuth,
  useCallTool,
  useServerInfo,
} from "@/lib/mcp/index.js";
import { useRegisterWebMcpTool } from "@/lib/mcp/webmcp.js";
import { useSelectedToolName } from "@/lib/nuqs.js";
import {
  type SavedInput,
  useSavedInputs,
  useSavedInputsStore,
} from "@/lib/saved-inputs-store.js";
import { useCallToolResult, useStore } from "@/lib/store.js";
import { cn } from "@/lib/utils.js";
import { AccordionTrigger } from "./accordion-trigger.js";
import { buildFormUiSchema, formTemplates, formWidgets } from "./form/index.js";
import { ToolFormTag } from "./form/tool-form-tag.js";
import { SavedInputsDropdown, SaveInputDialog } from "./saved-inputs.js";
import { TruncatedDescription } from "./truncated-description.js";

type TabValue = "form" | "json";

export function ToolItem({ tool }: { tool: Tool }) {
  const { mutateAsync: callTool, isPending } = useCallTool();
  const [selectedTool, setSelectedTool] = useSelectedToolName();
  const isSelected = selectedTool === tool.name;
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const requiresAuth = useAuthStore((s) => s.requiresAuth);
  const formRef = useRef<Form<unknown, RJSFSchema>>(null);
  const result = useCallToolResult(tool.name);
  const { setToolData } = useStore();
  const formData = (result?.input ?? {}) as Record<string, unknown>;
  const setFormData = (data: Record<string, unknown> | null) => {
    setToolData(tool.name, { input: data ?? {} });
  };

  const saved = useSavedInputController(tool, formData);

  const needsSignIn = requiresAuth && toolRequiresAuth(tool) && !isSignedIn;

  const [tab, setTab] = useState<TabValue>("form");
  const [jsonError, setJsonError] = useState(false);

  // Run is disabled when the current input doesn't validate against the schema
  // (or the JSON is malformed).
  const inputInvalid = useMemo(() => {
    const schema = tool.inputSchema as RJSFSchema;
    const hasNoInput =
      !schema?.properties || Object.keys(schema.properties).length === 0;
    if (hasNoInput) {
      return false;
    }
    if (tab === "json" && jsonError) {
      return true;
    }
    return validator.validateFormData(formData, schema).errors.length > 0;
  }, [tool.inputSchema, tab, jsonError, formData]);

  const handleRun = async () => {
    if (needsSignIn) {
      return;
    }
    const schema = tool.inputSchema as RJSFSchema;
    const hasNoInput =
      !schema?.properties || Object.keys(schema.properties).length === 0;

    if (tab === "json" && jsonError) {
      return;
    }

    if (!hasNoInput) {
      const { errors } = validator.validateFormData(formData, schema);
      if (errors.length > 0) {
        if (tab === "form") {
          formRef.current?.validateForm();
        } else {
          setJsonError(true);
        }
        return;
      }
    }
    // Focus this tool so the result view (right pane) shows its output — even
    // when Run was clicked from a collapsed header.
    setSelectedTool(tool.name);
    return await callTool({ toolName: tool.name, args: formData });
  };

  // Enter/⌘Enter run the tool whose input is focused. Scoped per tool so that
  // with several tools open at once only the focused one runs — and never
  // while a dialog (e.g. the save-input modal) is focused.
  const isHotkeyTarget = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target || target.closest("[role=dialog]")) {
      return false;
    }
    return (
      target.closest("[data-tool-name]")?.getAttribute("data-tool-name") ===
      tool.name
    );
  };

  useKeyPress("meta.enter", (event) => {
    if (!isHotkeyTarget(event)) {
      return;
    }
    handleRun();
  });

  useKeyPress(
    "enter",
    (event) => {
      if (!isHotkeyTarget(event)) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "TEXTAREA") {
        return;
      }
      event.preventDefault();
      handleRun();
    },
    { exactMatch: true },
  );

  // Why Run is disabled, surfaced as a tooltip (no reason while it's running).
  let disabledReason: string | null = null;
  if (needsSignIn) {
    disabledReason = "Sign in to call this tool";
  } else if (inputInvalid) {
    disabledReason = "Input is not valid";
  }

  const runButton = (
    <Button
      disabled={isPending || needsSignIn || inputInvalid}
      variant="primary"
      className="disabled:cursor-not-allowed disabled:pointer-events-auto disabled:opacity-100"
      onClick={handleRun}
      icon={
        isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Play className="size-3" />
        )
      }
    >
      Run
    </Button>
  );

  return (
    <AccordionItem
      value={tool.name}
      data-tool-name={tool.name}
      className="border-b border-border transition-colors last:border-b-0 data-[state=closed]:hover:bg-muted/40"
    >
      <AccordionTrigger
        className={cn(
          "font-mono text-xs font-normal text-foreground",
          "no-underline",
        )}
        action={
          <div
            className={cn(
              "flex items-center gap-1.5 transition-opacity hover:opacity-100",
              isSelected ? "opacity-100" : "opacity-50",
            )}
          >
            {saved.savedInputs.length > 0 && (
              <SavedInputsDropdown
                inputs={saved.savedInputs}
                activeKey={saved.activeKey}
                onSelect={saved.loadInput}
                onClear={saved.clearSelection}
                onDelete={saved.removeInput}
              />
            )}
            {disabledReason ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Wrapper so the disabled button still surfaces hover. */}
                  <span className="inline-flex">{runButton}</span>
                </TooltipTrigger>
                <TooltipContent>{disabledReason}</TooltipContent>
              </Tooltip>
            ) : (
              runButton
            )}
          </div>
        }
      >
        <div className="min-w-0 flex-1 truncate text-left text-sm font-medium">
          {tool.name}
        </div>
      </AccordionTrigger>
      {tool.description ? (
        <div className="px-4 pb-3 font-sans">
          <ToolDescription name={tool.name} description={tool.description} />
        </div>
      ) : null}
      <AccordionContent
        className="px-4 pt-0 pb-3 text-foreground"
        // Open/close instantly — disable the accordion slide animation (which
        // the ui component hardcodes on the Content root).
        style={{ animation: "none" }}
      >
        <ToolBody
          tool={tool}
          formData={formData}
          setFormData={setFormData}
          formRef={formRef}
          tab={tab}
          setTab={setTab}
          jsonError={jsonError}
          setJsonError={setJsonError}
          saved={saved}
          inputInvalid={inputInvalid}
          onRun={handleRun}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

type Visibility = "model" | "app";

const VISIBILITY_META: Record<
  Visibility,
  { badgeClass: string; tooltip: string }
> = {
  model: {
    badgeClass: "border-blue-200 bg-blue-100 text-blue-700",
    tooltip: "Visible to and callable by the agent.",
  },
  app: {
    badgeClass: "border-purple-200 bg-purple-100 text-purple-700",
    tooltip: "Callable by the widget on this server only.",
  },
};

function getToolVisibility(tool: Tool): Visibility[] | undefined {
  const meta = tool._meta as Record<string, unknown> | undefined;
  const ui = meta?.ui as { visibility?: unknown } | undefined;
  const fromUi = ui?.visibility;
  const legacy = meta?.["openai/visibility"];
  const candidate = fromUi ?? legacy;
  if (!Array.isArray(candidate)) {
    return undefined;
  }
  const values = candidate.filter(
    (v): v is Visibility => v === "model" || v === "app",
  );
  return values.length > 0 ? values : undefined;
}

// Keep only the fields the current schema still defines, so an input saved
// against an older schema still applies cleanly.
function intersectInputToSchema(
  input: Record<string, unknown>,
  tool: Tool,
): Record<string, unknown> {
  const properties = (tool.inputSchema?.properties ?? {}) as Record<
    string,
    unknown
  >;
  return Object.fromEntries(
    Object.entries(input).filter(([name]) => name in properties),
  );
}

// The tool's description, rendered once in the always-present header (so it
// shows whether the tool is collapsed or expanded). Muted box with the shared
// "... more" truncation.
function ToolDescription({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-2.5 py-2">
      <TruncatedDescription
        text={description}
        title={name}
        className="text-xs text-muted-foreground/70"
      />
    </div>
  );
}

type SavedInputController = {
  serverName: string | undefined;
  savedInputs: SavedInput[];
  activeKey: string | null;
  loadInput: (saved: SavedInput) => void;
  clearSelection: () => void;
  saveFromModal: (key: string) => void;
  removeInput: (key: string) => void;
};

// Saved-input state + actions for one tool, reading/writing the persisted store
// and the session-only active key. Called once per tool so the selector can be
// mirrored in the collapsed header and the expanded input panel off one source.
function useSavedInputController(
  tool: Tool,
  formData: Record<string, unknown>,
): SavedInputController {
  const serverName = useServerInfo()?.name;
  const savedInputs = useSavedInputs(serverName, tool.name);
  const saveInput = useSavedInputsStore((s) => s.saveInput);
  const updateInput = useSavedInputsStore((s) => s.updateInput);
  const deleteInput = useSavedInputsStore((s) => s.deleteInput);
  const setToolData = useStore((s) => s.setToolData);
  const storedActiveKey =
    useCallToolResult(tool.name)?.activeSavedInputKey ?? null;

  // The active input is the saved input the form was last loaded from/saved
  // as. Ignore a stale key whose input was since deleted.
  const activeInput = storedActiveKey
    ? savedInputs.find((entry) => entry.key === storedActiveKey)
    : undefined;
  const activeKey = activeInput ? storedActiveKey : null;

  const loadInput = (saved: SavedInput) => {
    // Both the form and JSON views read this shared input, so both update.
    setToolData(tool.name, {
      input: intersectInputToSchema(saved.input, tool),
      activeSavedInputKey: saved.key,
    });
  };

  // Unselect the active input and clear the form.
  const clearSelection = () => {
    setToolData(tool.name, { input: {}, activeSavedInputKey: null });
  };

  const saveFromModal = (key: string) => {
    if (!serverName) {
      return;
    }
    // An existing key overwrites that input; a new key creates one.
    if (savedInputs.some((entry) => entry.key === key)) {
      updateInput(serverName, tool.name, key, formData);
    } else {
      saveInput(serverName, tool.name, key, formData);
    }
    setToolData(tool.name, { activeSavedInputKey: key });
  };

  const removeInput = (key: string) => {
    if (!serverName) {
      return;
    }
    deleteInput(serverName, tool.name, key);
    if (key === storedActiveKey) {
      setToolData(tool.name, { activeSavedInputKey: null });
    }
  };

  return {
    serverName,
    savedInputs,
    activeKey,
    loadInput,
    clearSelection,
    saveFromModal,
    removeInput,
  };
}

function ToolBody({
  tool,
  formData,
  setFormData,
  formRef,
  tab,
  setTab,
  jsonError,
  setJsonError,
  saved,
  inputInvalid,
  onRun,
}: {
  tool: Tool;
  formData: Record<string, unknown>;
  setFormData: (data: Record<string, unknown> | null) => void;
  formRef: React.RefObject<Form<unknown, RJSFSchema> | null>;
  tab: TabValue;
  setTab: (tab: TabValue) => void;
  jsonError: boolean;
  setJsonError: (value: boolean) => void;
  saved: SavedInputController;
  inputInvalid: boolean;
  onRun: () => Promise<unknown>;
}) {
  const hasInput =
    tool.inputSchema &&
    Object.keys(tool.inputSchema.properties ?? {}).length > 0;

  useRegisterWebMcpTool({
    tool,
    enabled: !hasInput,
    execute: async () => {
      const response = (await onRun()) as
        | Pick<CallToolResponse, "content" | "isError">
        | undefined;
      return (
        response ?? {
          content: [{ type: "text", text: "The tool call was not executed." }],
          isError: true,
        }
      );
    },
  });

  const visibility = getToolVisibility(tool);
  const [saveOpen, setSaveOpen] = useState(false);
  const { serverName, savedInputs, activeKey } = saved;

  const saveButton = (
    <button
      type="button"
      onClick={() => setSaveOpen(true)}
      disabled={inputInvalid}
      title={inputInvalid ? undefined : "Save input"}
      aria-label="Save input"
      className={cn(
        "shrink-0 cursor-pointer text-light-gray-foreground transition-colors hover:text-foreground",
        "disabled:cursor-not-allowed disabled:pointer-events-auto disabled:hover:text-light-gray-foreground",
      )}
    >
      <Save className="size-3.5" />
    </button>
  );

  return (
    <div className="space-y-3">
      {visibility && (
        <div data-testid="tool-visibility" className="flex flex-wrap gap-1">
          {visibility.map((scope) => (
            <Tooltip key={scope}>
              <TooltipTrigger asChild>
                <Badge size="sm" className={VISIBILITY_META[scope].badgeClass}>
                  {scope}
                </Badge>
              </TooltipTrigger>
              <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                  sideOffset={6}
                  className={cn(
                    "z-50 w-fit rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-md",
                    "animate-in fade-in-0 zoom-in-95",
                    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                  )}
                >
                  {VISIBILITY_META[scope].tooltip}
                  <TooltipPrimitive.Arrow
                    width={11}
                    height={5}
                    className="fill-background drop-shadow-[0_1px_0_var(--color-border)]"
                  />
                </TooltipPrimitive.Content>
              </TooltipPrimitive.Portal>
            </Tooltip>
          ))}
        </div>
      )}
      {hasInput && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <div className="flex items-end justify-between gap-2 border-b border-border">
            {/* Left: [save] Input */}
            <div className="flex min-w-0 items-center gap-1 pb-1.5">
              {serverName &&
                (inputInvalid ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">{saveButton}</span>
                    </TooltipTrigger>
                    <TooltipContent>Input is not valid</TooltipContent>
                  </Tooltip>
                ) : (
                  saveButton
                ))}
              {serverName ? (
                <SavedInputsDropdown
                  inputs={savedInputs}
                  activeKey={activeKey}
                  onSelect={saved.loadInput}
                  onClear={saved.clearSelection}
                  onDelete={saved.removeInput}
                />
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  Input
                </span>
              )}
            </div>
            {/* Right: form / json tabs. The active tab's bottom border matches
                the content background, so it reads as a connected tab. -mb-px
                pulls the strip onto the header separator. */}
            <div className="-mb-px flex">
              {(["form", "json"] as const).map((value, index) => {
                const Icon = value === "form" ? ClipboardList : Braces;
                const active = tab === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value)}
                    className={cn(
                      "relative inline-flex h-7 cursor-pointer items-center gap-1.5 border border-border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
                      index === 0 ? "rounded-tl-md" : "-ml-px rounded-tr-md",
                      active
                        ? "z-10 border-b-background bg-background text-foreground"
                        : "bg-muted/40 text-light-gray-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{value}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <TabsContent value="form">
            <FormBody
              tool={tool}
              formData={formData}
              setFormData={setFormData}
              formRef={formRef}
              onRun={onRun}
            />
          </TabsContent>
          {/* -mt-4 cancels the Tabs gap so the textarea's top merges into the
              header separator (its top border). */}
          <TabsContent value="json" className="-mt-4">
            <JsonBody
              formData={formData}
              setFormData={setFormData}
              error={jsonError}
              setError={setJsonError}
            />
          </TabsContent>
        </Tabs>
      )}
      {hasInput && serverName && (
        <SaveInputDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          defaultKey={activeKey ?? ""}
          existingKeys={savedInputs.map((entry) => entry.key)}
          onSave={saved.saveFromModal}
        />
      )}
    </div>
  );
}

function FormBody({
  tool,
  formData,
  setFormData,
  formRef,
  onRun,
}: {
  tool: Tool;
  formData: Record<string, unknown>;
  setFormData: (data: Record<string, unknown> | null) => void;
  formRef: React.RefObject<Form<unknown, RJSFSchema> | null>;
  onRun: () => Promise<unknown>;
}) {
  const schema = tool.inputSchema as RJSFSchema;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const focusable = container.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >(
      'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]):not([type="file"]):not([type="button"]):not([type="submit"]), textarea',
    );
    if (focusable && !focusable.value) {
      focusable.focus();
    }
  }, []);

  return (
    <div ref={containerRef}>
      <FormComponent
        ref={formRef as React.RefObject<Form<unknown, RJSFSchema>>}
        tagName={ToolFormTag(tool)}
        idPrefix={tool.name}
        schema={schema}
        validator={validator}
        uiSchema={buildFormUiSchema(schema)}
        formData={formData}
        onChange={(data) => setFormData(data.formData)}
        onSubmit={(_, event) => {
          const native = event.nativeEvent;
          const run = onRun();
          if (
            native instanceof SubmitEvent &&
            typeof native.respondWith === "function"
          ) {
            native.respondWith(run);
          }
        }}
        showErrorList={false}
        widgets={formWidgets}
        templates={formTemplates}
      />
    </div>
  );
}

function JsonBody({
  formData,
  setFormData,
  error,
  setError,
}: {
  formData: Record<string, unknown>;
  setFormData: (data: Record<string, unknown> | null) => void;
  error: boolean;
  setError: (value: boolean) => void;
}) {
  const [json, setJson] = useState(JSON.stringify(formData, null, 2));
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    setJson(JSON.stringify(formData, null, 2));
  }, [formData]);

  const handleChange = (value: string) => {
    setJson(value);
    try {
      const parsed = JSON.parse(value);
      isInternalUpdate.current = true;
      setFormData(parsed);
      setError(false);
    } catch {
      setError(true);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <textarea
          className={cn(
            "max-h-80 min-h-20 w-full resize-none overflow-auto rounded-b-md border border-t-0 p-2 pr-9 font-mono text-xs field-sizing-content",
            error ? "border-destructive" : "border-border",
          )}
          spellCheck={false}
          value={json}
          onChange={(e) => handleChange(e.target.value)}
        />
        <CopyButton
          value={json}
          label="Copy input"
          className="absolute top-2 right-2 z-10"
        />
      </div>
      {error && (
        <div className="text-xs text-destructive">
          The provided JSON is invalid
        </div>
      )}
    </div>
  );
}
