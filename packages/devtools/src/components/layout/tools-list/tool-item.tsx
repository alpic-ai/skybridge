import {
  AccordionContent,
  AccordionItem,
} from "@alpic-ai/ui/components/accordion";
import { Badge } from "@alpic-ai/ui/components/badge";
import { Button } from "@alpic-ai/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@alpic-ai/ui/components/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@alpic-ai/ui/components/tabs";
import { Tooltip, TooltipTrigger } from "@alpic-ai/ui/components/tooltip";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type Form from "@rjsf/core";
import { Form as FormComponent } from "@rjsf/shadcn";
import type {
  FieldErrorProps,
  FieldTemplateProps,
  RJSFSchema,
} from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { useKeyPress } from "ahooks";
import { Loader2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CopyButton } from "@/lib/copy.js";
import { useCallTool } from "@/lib/mcp/index.js";
import { useCallToolResult, useStore } from "@/lib/store.js";
import { cn } from "@/lib/utils.js";
import { AccordionTrigger } from "./accordion-trigger.js";

type TabValue = "form" | "json";

export function ToolItem({ tool, open }: { tool: Tool; open: boolean }) {
  const { mutateAsync: callTool, isPending } = useCallTool();
  const formRef = useRef<Form<unknown, RJSFSchema>>(null);
  const result = useCallToolResult(tool.name);
  const { setToolData } = useStore();
  const formData = (result?.input ?? {}) as Record<string, unknown>;
  const setFormData = (data: Record<string, unknown> | null) => {
    setToolData(tool.name, { input: data ?? {} });
  };

  const [tab, setTab] = useState<TabValue>("form");
  const [jsonError, setJsonError] = useState(false);

  const handleRun = async () => {
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
    await callTool({ toolName: tool.name, args: formData });
  };

  useKeyPress("meta.enter", () => {
    if (!open) {
      return;
    }
    handleRun();
  });

  useKeyPress(
    "enter",
    (event) => {
      if (!open) {
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

  return (
    <AccordionItem
      value={tool.name}
      className="border-b border-border last:border-b-0"
    >
      <AccordionTrigger
        className={cn(
          "font-mono text-xs font-normal text-foreground",
          "no-underline data-[state=closed]:hover:bg-muted/40",
        )}
        action={
          open ? (
            <Button
              disabled={isPending}
              variant="primary"
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
          ) : null
        }
      >
        <div className="min-w-0 flex-1 truncate text-left">{tool.name}</div>
      </AccordionTrigger>
      {!open && tool.description ? (
        <div aria-hidden="true" className="px-3 pb-3 -mt-1 font-sans">
          <div className="rounded-md border border-border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground/70">
            <span className="line-clamp-2">{tool.description}</span>
          </div>
        </div>
      ) : null}
      <AccordionContent className="px-3 pt-1 pb-3 text-foreground">
        <ToolBody
          tool={tool}
          formData={formData}
          setFormData={setFormData}
          formRef={formRef}
          tab={tab}
          setTab={setTab}
          jsonError={jsonError}
          setJsonError={setJsonError}
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

function ToolBody({
  tool,
  formData,
  setFormData,
  formRef,
  tab,
  setTab,
  jsonError,
  setJsonError,
}: {
  tool: Tool;
  formData: Record<string, unknown>;
  setFormData: (data: Record<string, unknown> | null) => void;
  formRef: React.RefObject<Form<unknown, RJSFSchema> | null>;
  tab: TabValue;
  setTab: (tab: TabValue) => void;
  jsonError: boolean;
  setJsonError: (value: boolean) => void;
}) {
  const hasInput =
    tool.inputSchema &&
    Object.keys(tool.inputSchema.properties ?? {}).length > 0;
  const visibility = getToolVisibility(tool);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  return (
    <div className="space-y-3">
      {(visibility || tool.description) && (
        <div className="space-y-2">
          {visibility && (
            <div data-testid="tool-visibility" className="flex flex-wrap gap-1">
              {visibility.map((scope) => (
                <Tooltip key={scope}>
                  <TooltipTrigger asChild>
                    <Badge
                      size="sm"
                      className={VISIBILITY_META[scope].badgeClass}
                    >
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
          {tool.description && (
            <>
              <button
                type="button"
                onClick={() => setDescriptionOpen(true)}
                className="block w-full cursor-pointer rounded-md border border-border bg-muted/40 px-2.5 py-2 text-left text-xs text-muted-foreground/70 hover:bg-muted/60"
                title="Click to see full description"
              >
                <span className="line-clamp-2">{tool.description}</span>
              </button>
              <Dialog open={descriptionOpen} onOpenChange={setDescriptionOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-mono">{tool.name}</DialogTitle>
                    <DialogDescription className="whitespace-pre-wrap">
                      {tool.description}
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      )}
      {hasInput && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <div className="flex items-center justify-between gap-2">
            <TabsList variant="line">
              <TabsTrigger value="form">form</TabsTrigger>
              <TabsTrigger value="json">json</TabsTrigger>
            </TabsList>
            <CopyButton
              value={JSON.stringify(formData, null, 2)}
              label="Copy input"
            />
          </div>
          <TabsContent value="form">
            <FormBody
              schema={tool.inputSchema as RJSFSchema}
              formData={formData}
              setFormData={setFormData}
              formRef={formRef}
            />
          </TabsContent>
          <TabsContent value="json">
            <JsonBody
              formData={formData}
              setFormData={setFormData}
              error={jsonError}
              setError={setJsonError}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function FormBody({
  schema,
  formData,
  setFormData,
  formRef,
}: {
  schema: RJSFSchema;
  formData: Record<string, unknown>;
  setFormData: (data: Record<string, unknown> | null) => void;
  formRef: React.RefObject<Form<unknown, RJSFSchema> | null>;
}) {
  return (
    <FormComponent
      ref={formRef as React.RefObject<Form<unknown, RJSFSchema>>}
      schema={schema}
      validator={validator}
      uiSchema={{
        "ui:submitButtonOptions": { norender: true },
      }}
      formData={formData}
      onChange={(data) => setFormData(data.formData)}
      showErrorList={false}
      templates={{
        FieldTemplate: (props: FieldTemplateProps) => {
          const { id, classNames, style, label, required, errors, children } =
            props;
          return (
            <div
              className={cn("flex flex-col gap-1.5", classNames)}
              style={style}
            >
              <label
                htmlFor={id}
                className="font-mono text-xs text-muted-foreground"
              >
                {label}
                {required && <span className="ml-1 text-destructive">*</span>}
              </label>
              <div className="flex flex-col gap-1">
                {children}
                {errors}
              </div>
            </div>
          );
        },
        FieldErrorTemplate: (props: FieldErrorProps) =>
          props.errors && props.errors.length > 0 ? (
            <div className="mt-1 text-xs text-destructive">
              {props.errors.join(", ")}
            </div>
          ) : null,
      }}
    />
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
      <textarea
        className={cn(
          "h-40 w-full rounded-md border p-2 font-mono text-xs",
          error ? "border-destructive" : "border-border",
        )}
        spellCheck={false}
        value={json}
        onChange={(e) => handleChange(e.target.value)}
      />
      {error && (
        <div className="text-xs text-destructive">
          The provided JSON is invalid
        </div>
      )}
    </div>
  );
}
