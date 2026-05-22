import {
  AccordionContent,
  AccordionItem,
} from "@alpic-ai/ui/components/accordion";
import { Button } from "@alpic-ai/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@alpic-ai/ui/components/tabs";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type Form from "@rjsf/core";
import { Form as FormComponent } from "@rjsf/shadcn";
import type {
  FieldErrorProps,
  FieldTemplateProps,
  RJSFSchema,
} from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { useKeyPress } from "ahooks";
import { CornerDownLeft, Loader2, Play } from "lucide-react";
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

  // Plain Enter runs the tool, except in a textarea (JSON tab) where the user
  // is typing multi-line content and needs Enter for newlines.
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
              iconTrailing={
                <kbd
                  aria-label="Press Enter to run"
                  className="inline-flex items-center justify-center rounded border border-primary-foreground/30 px-1 text-[10px] leading-none"
                >
                  <CornerDownLeft className="size-2.5" />
                </kbd>
              }
            >
              Run
            </Button>
          ) : null
        }
      >
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate">{tool.name}</div>
          {!open && tool.description ? (
            <div className="truncate font-sans text-[11px] text-muted-foreground/70">
              {tool.description}
            </div>
          ) : null}
        </div>
      </AccordionTrigger>
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

  return (
    <div className="space-y-3">
      {tool.description && (
        <div className="rounded-md border border-border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground/70">
          {tool.description}
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
