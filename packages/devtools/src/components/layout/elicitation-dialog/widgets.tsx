import type {
  EnumOptionsType,
  RegistryWidgetsType,
  RJSFSchema,
  WidgetProps,
} from "@rjsf/utils";
import { formWidgets } from "@/components/layout/tools-list/form/index.js";
import { denseInputClass } from "@/components/layout/tools-list/form/styles.js";
import { cn } from "@/lib/utils.js";

type OptionSchema = RJSFSchema & { "x-openai-thumbnail"?: { src: string } };

function OptionsWidget({
  id,
  value,
  multiple,
  disabled,
  readonly,
  options,
  onChange,
}: WidgetProps) {
  const enumOptions = (options.enumOptions ?? []) as EnumOptionsType[];
  const selected: unknown[] = multiple
    ? Array.isArray(value)
      ? value
      : []
    : [value];
  const toggle = (optionValue: unknown, checked: boolean) => {
    if (!multiple) {
      onChange(optionValue);
      return;
    }
    onChange(
      checked
        ? [...selected, optionValue]
        : selected.filter((v) => v !== optionValue),
    );
  };

  return (
    <div id={id} className="flex flex-col gap-1.5">
      {enumOptions.map((option) => {
        const schema = option.schema as OptionSchema | undefined;
        const thumbnail = schema?.["x-openai-thumbnail"]?.src;
        const checked = selected.includes(option.value);
        return (
          <label
            key={String(option.value)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md border border-border p-2 transition-colors hover:bg-muted",
              checked && "border-ring bg-muted",
            )}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={id}
              checked={checked}
              disabled={disabled || readonly}
              onChange={(event) => toggle(option.value, event.target.checked)}
            />
            {thumbnail && (
              <img
                src={thumbnail}
                alt=""
                className="size-10 shrink-0 rounded object-cover"
              />
            )}
            <span className="flex flex-col">
              <span className="text-xs font-medium">{option.label}</span>
              {schema?.description && (
                <span className="text-xs text-muted-foreground">
                  {schema.description}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function SuggestionsWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  schema,
  onChange,
  rawErrors,
}: WidgetProps) {
  const suggestions = (schema["x-openai-suggestions"] ?? []) as {
    const: string;
    title?: string;
  }[];
  return (
    <>
      <input
        id={id}
        list={`${id}-suggestions`}
        className={denseInputClass}
        value={value ?? ""}
        required={required}
        disabled={disabled || readonly}
        aria-invalid={(rawErrors?.length ?? 0) > 0 || undefined}
        onChange={(event) => onChange(event.target.value || undefined)}
      />
      <datalist id={`${id}-suggestions`}>
        {suggestions.map((suggestion) => (
          <option key={suggestion.const} value={suggestion.const}>
            {suggestion.title}
          </option>
        ))}
      </datalist>
    </>
  );
}

export const elicitationWidgets: RegistryWidgetsType = {
  ...formWidgets,
  OptionsWidget,
  SuggestionsWidget,
};
