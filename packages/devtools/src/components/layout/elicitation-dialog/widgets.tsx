import type {
  EnumOptionsType,
  RegistryWidgetsType,
  RJSFSchema,
  WidgetProps,
} from "@rjsf/utils";
import { formWidgets } from "@/components/layout/tools-list/form/index.js";
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

export const elicitationWidgets: RegistryWidgetsType = {
  ...formWidgets,
  OptionsWidget,
};
