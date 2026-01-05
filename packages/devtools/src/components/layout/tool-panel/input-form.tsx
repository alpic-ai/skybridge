import type Form from "@rjsf/core";
import { Form as FormComponent } from "@rjsf/shadcn";
import type {
  FieldErrorProps,
  FieldTemplateProps,
  RJSFSchema,
  UiSchema,
} from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { useRef } from "react";
import { useSelectedTool } from "@/lib/mcp/index.js";
import { useCallToolResult, useStore } from "@/lib/store.js";
import { cn } from "@/lib/utils.js";
import { Card, CardContent } from "../../ui/card.js";
import { CallToolButton } from "../call-tool-button.js";

const uiSchema: UiSchema = {
  "ui:submitButtonOptions": {
    norender: true,
  },
};

const FormContent = ({
  schema,
  formData,
  setFormData,
  ref,
}: {
  schema: RJSFSchema;
  formData: Record<string, unknown> | null;
  setFormData: (data: Record<string, unknown> | null) => void;
  ref: React.RefObject<Form<unknown, RJSFSchema> | null>;
}) => {
  const hasNoInput =
    !schema ||
    !schema.properties ||
    Object.keys(schema.properties).length === 0;

  if (hasNoInput) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          This tool requires no input
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent>
        <FormComponent
          ref={ref as React.RefObject<Form<unknown, RJSFSchema>>}
          schema={schema ?? {}}
          validator={validator}
          uiSchema={uiSchema}
          formData={formData}
          onChange={(data) => setFormData(data.formData)}
          showErrorList={false}
          templates={{
            FieldTemplate: (props: FieldTemplateProps) => {
              const {
                id,
                classNames,
                style,
                label,
                required,
                errors,
                children,
              } = props;
              return (
                <div
                  className={cn("flex flex-col gap-2", classNames)}
                  style={style}
                >
                  <label htmlFor={id} className="text-sm text-foreground">
                    {label}
                    {required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </label>
                  <div className="flex flex-col gap-2">
                    {children}
                    {errors}
                  </div>
                </div>
              );
            },
            FieldErrorTemplate: (props: FieldErrorProps) =>
              props.errors && props.errors.length > 0 ? (
                <div className="text-sm text-destructive mt-1 flex items-center gap-1">
                  <span>{props.errors.join(", ")}</span>
                </div>
              ) : null,
          }}
        />
      </CardContent>
    </Card>
  );
};

export const InputForm = () => {
  const ref = useRef<Form<unknown, RJSFSchema>>(null);
  const tool = useSelectedTool();
  const { setToolData } = useStore();
  const result = useCallToolResult(tool.name);

  const formData = result?.input ?? {};
  const setFormData = (data: Record<string, unknown> | null) => {
    setToolData(tool.name, {
      input: data ?? {},
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full overflow-hidden border-r border-border",
      )}
    >
      <div className="shrink-0 border-b border-border px-6 py-4 flex items-center justify-between h-[72px]">
        <h2 className="font-semibold text-foreground">{tool.name}</h2>
        <div className="flex items-center gap-2">
          <CallToolButton
            validateForm={async () => {
              if (ref.current === null) {
                return true;
              }

              return await ref.current.validateForm();
            }}
            formData={formData}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 bg-muted/50">
        <FormContent
          key={tool.name}
          schema={tool.inputSchema as RJSFSchema}
          formData={formData}
          setFormData={setFormData}
          ref={ref}
        />
      </div>
    </div>
  );
};
