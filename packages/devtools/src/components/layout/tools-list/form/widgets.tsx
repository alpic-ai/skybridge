import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSearch,
  ComboboxTrigger,
} from "@alpic-ai/ui/components/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@alpic-ai/ui/components/select";
import { Switch } from "@alpic-ai/ui/components/switch";
import type {
  EnumOptionsType,
  RegistryWidgetsType,
  WidgetProps,
} from "@rjsf/utils";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils.js";
import { denseSelectTriggerClass, denseTextareaClass } from "./styles.js";

function TextareaWidget(props: WidgetProps) {
  const {
    id,
    name,
    value,
    required,
    disabled,
    readonly,
    placeholder,
    options,
    schema,
    onChange,
    onBlur,
    onFocus,
    rawErrors,
  } = props;
  const rows = (options.rows as number | undefined) ?? 3;
  const hasError = (rawErrors?.length ?? 0) > 0;
  return (
    <textarea
      id={id}
      name={name}
      toolparamdescription={schema.description}
      rows={rows}
      className={denseTextareaClass}
      value={value ?? ""}
      required={required}
      disabled={disabled || readonly}
      placeholder={placeholder}
      spellCheck={false}
      aria-invalid={hasError || undefined}
      onChange={(event) =>
        onChange(
          event.target.value === "" ? options.emptyValue : event.target.value,
        )
      }
      onBlur={(event) => onBlur(id, event.target.value)}
      onFocus={(event) => onFocus(id, event.target.value)}
    />
  );
}

function SelectWidget(props: WidgetProps) {
  const {
    id,
    value,
    required,
    disabled,
    readonly,
    placeholder,
    options,
    onChange,
    rawErrors,
  } = props;
  const enumOptions = (options.enumOptions ?? []) as EnumOptionsType[];
  const hasError = (rawErrors?.length ?? 0) > 0;

  return (
    <Select
      value={value === undefined || value === null ? "" : String(value)}
      required={required}
      disabled={disabled || readonly}
      onValueChange={(v) => {
        const match = enumOptions.find((opt) => String(opt.value) === v);
        onChange(match ? match.value : v);
      }}
    >
      <SelectTrigger
        id={id}
        className={cn(denseSelectTriggerClass)}
        aria-invalid={hasError || undefined}
      >
        <SelectValue placeholder={placeholder ?? "Select…"} />
      </SelectTrigger>
      <SelectContent>
        {enumOptions.map((opt) => (
          <SelectItem
            key={String(opt.value)}
            value={String(opt.value)}
            className="font-mono text-xs"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CheckboxWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange } = props;
  return (
    <Switch
      id={id}
      checked={value === true}
      required={required}
      disabled={disabled || readonly}
      onCheckedChange={(checked) => onChange(checked === true)}
    />
  );
}

function CheckboxesWidget(props: WidgetProps) {
  const {
    id,
    value,
    disabled,
    readonly,
    options,
    placeholder,
    rawErrors,
    schema,
  } = props;
  const enumOptions = resolveEnumOptions(options, schema);
  const hasError = (rawErrors?.length ?? 0) > 0;
  return (
    <MultiCombobox
      id={id}
      value={value}
      disabled={disabled || readonly}
      placeholder={placeholder ?? "Select…"}
      enumOptions={enumOptions}
      hasError={hasError}
      onChange={props.onChange}
    />
  );
}

function resolveEnumOptions(
  options: WidgetProps["options"],
  schema: WidgetProps["schema"],
): EnumOptionsType[] {
  const fromOptions = (options.enumOptions ?? []) as EnumOptionsType[];
  if (fromOptions.length > 0) {
    return fromOptions;
  }
  // rjsf only populates enumOptions when it recognises the field as multi-enum
  // (e.g. array<enum> with uniqueItems). When ui:widget routes here without
  // that recognition, fall back to schema.items.enum / schema.enum.
  const items = schema.items;
  const itemSchema =
    items && !Array.isArray(items) && typeof items !== "boolean"
      ? items
      : undefined;
  const rawEnum = itemSchema?.enum ?? schema.enum;
  if (!Array.isArray(rawEnum)) {
    return [];
  }
  return rawEnum.map((v) => ({ value: v, label: String(v) }));
}

function MultiCombobox({
  id,
  value,
  disabled,
  placeholder,
  enumOptions,
  hasError,
  onChange,
}: {
  id: string;
  value: unknown;
  disabled?: boolean;
  placeholder: string;
  enumOptions: EnumOptionsType[];
  hasError: boolean;
  onChange: (next: unknown[]) => void;
}) {
  const selected = Array.isArray(value)
    ? value.filter((v) => v !== undefined && v !== null)
    : [];
  const available = enumOptions.filter(
    (opt) => !selected.some((v) => String(v) === String(opt.value)),
  );
  const [open, setOpen] = useState(false);
  const keepOpenAfterSelect = useRef(false);
  return (
    <div className="flex flex-col gap-1.5">
      <Combobox
        open={open}
        onOpenChange={(next) => {
          if (!next && keepOpenAfterSelect.current) {
            keepOpenAfterSelect.current = false;
            return;
          }
          setOpen(next);
        }}
        value={null}
        onValueChange={(v) => {
          if (v === null) {
            return;
          }
          const match = enumOptions.find((opt) => String(opt.value) === v);
          keepOpenAfterSelect.current = true;
          onChange([...selected, match ? match.value : v]);
        }}
      >
        <ComboboxTrigger
          id={id}
          disabled={disabled || available.length === 0}
          placeholder={placeholder}
          className={cn(denseSelectTriggerClass)}
          aria-invalid={hasError || undefined}
        />
        <ComboboxContent>
          <ComboboxSearch placeholder="Search…" />
          <ComboboxList className="flex flex-col gap-1 py-1">
            <ComboboxEmpty>No results.</ComboboxEmpty>
            {available.map((opt) => (
              <ComboboxItem
                key={String(opt.value)}
                itemValue={String(opt.value)}
                className="mx-1 my-0 px-2 py-1 font-mono text-xs"
              >
                {opt.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {selected.map((v) => {
            const opt = enumOptions.find((o) => String(o.value) === String(v));
            const label = opt?.label ?? String(v);
            return (
              <li key={String(v)}>
                <button
                  type="button"
                  onClick={() =>
                    onChange(selected.filter((s) => String(s) !== String(v)))
                  }
                  disabled={disabled}
                  aria-label={`Remove ${label}`}
                  className={cn(
                    "group inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5",
                    "font-mono text-xs text-foreground transition-colors",
                    "hover:bg-muted hover:text-foreground",
                    "focus-visible:outline-none focus-visible:border-ring focus-visible:border-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <span>{label}</span>
                  <X className="size-3 text-muted-foreground group-hover:text-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const formWidgets: RegistryWidgetsType = {
  TextareaWidget,
  SelectWidget,
  CheckboxWidget,
  CheckboxesWidget,
};
