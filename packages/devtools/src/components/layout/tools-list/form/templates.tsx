import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@alpic-ai/ui/components/tooltip";
import type {
  ArrayFieldItemTemplateProps,
  ArrayFieldTemplateProps,
  BaseInputTemplateProps,
  DescriptionFieldProps,
  FieldErrorProps,
  FieldTemplateProps,
  IconButtonProps,
  ObjectFieldTemplateProps,
  TitleFieldProps,
} from "@rjsf/utils";
import { getInputProps } from "@rjsf/utils";
import { Plus, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils.js";
import { TruncatedDescription } from "../truncated-description.js";
import {
  denseInputClass,
  descriptionTextClass,
  ghostButtonClass,
} from "./styles.js";

export function BaseInputTemplate(props: BaseInputTemplateProps) {
  const {
    id,
    name,
    value,
    required,
    disabled,
    readonly,
    placeholder,
    schema,
    options,
    onChange,
    onChangeOverride,
    onBlur,
    onFocus,
    rawErrors,
    type,
  } = props;

  const inputProps = {
    ...getInputProps(schema, type, options),
  };
  const hasError = (rawErrors?.length ?? 0) > 0;
  const isNumber = inputProps.type === "number";

  const parse = (raw: string) => {
    if (raw === "") {
      return options.emptyValue;
    }
    if (isNumber) {
      const n = Number(raw);
      return Number.isFinite(n) ? n : raw;
    }
    return raw;
  };

  return (
    <input
      id={id}
      name={name}
      toolparamdescription={schema.description}
      className={denseInputClass}
      value={value ?? ""}
      required={required}
      disabled={disabled || readonly}
      placeholder={placeholder}
      aria-invalid={hasError || undefined}
      onChange={
        onChangeOverride ?? ((event) => onChange(parse(event.target.value)))
      }
      onBlur={(event) => onBlur(id, parse(event.target.value))}
      onFocus={(event) => onFocus(id, parse(event.target.value))}
      {...inputProps}
    />
  );
}

// A field label whose param description is revealed in a tooltip on hover, so
// descriptions stay accessible in the panel without opening a dialog. Falls
// back to a plain label when the param has no description.
function FieldLabel({
  htmlFor,
  label,
  required,
  description,
  className,
}: {
  htmlFor?: string;
  label: ReactNode;
  required?: boolean;
  description?: string;
  className?: string;
}) {
  const content = (
    <>
      {label}
      {required && <span className="ml-1 text-destructive">*</span>}
    </>
  );
  const labelNode = htmlFor ? (
    <label
      htmlFor={htmlFor}
      className={cn(className, description && "w-fit cursor-help")}
    >
      {content}
    </label>
  ) : (
    <div className={cn(className, description && "w-fit cursor-help")}>
      {content}
    </div>
  );

  if (!description) {
    return labelNode;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{labelNode}</TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-pre-wrap text-left font-normal">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

export function FieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    classNames,
    style,
    label,
    required,
    rawDescription,
    rawErrors,
    children,
    errors,
    help,
    hidden,
    schema,
    uiSchema,
  } = props;

  if (hidden) {
    return <div className="hidden">{children}</div>;
  }

  const isContainer = schema.type === "object" || schema.type === "array";
  const hasCustomWidget = Boolean(uiSchema?.["ui:widget"]);
  // Containers normally render their own title via Object/ArrayFieldTemplate.
  // When ui:widget overrides them, that path is skipped — we must render here.
  const rendersOwnTitle = isContainer && !hasCustomWidget;
  const showLabel = !rendersOwnTitle && Boolean(label);
  const hasError = (rawErrors?.length ?? 0) > 0;

  return (
    <div
      className={cn("flex flex-col gap-1", classNames)}
      style={style as CSSProperties}
    >
      {showLabel && (
        <FieldLabel
          htmlFor={id}
          label={label}
          required={required}
          description={rawDescription}
          className={cn(
            "font-mono text-xs text-muted-foreground",
            hasError && "text-destructive",
          )}
        />
      )}
      {/* No label to hang the tooltip on (e.g. array items) — keep it inline. */}
      {!rendersOwnTitle && !showLabel && rawDescription ? (
        <TruncatedDescription
          text={rawDescription}
          title={label}
          className={descriptionTextClass}
        />
      ) : null}
      {children}
      {errors}
      {help}
    </div>
  );
}

export function FieldErrorTemplate(props: FieldErrorProps) {
  if (!props.errors || props.errors.length === 0) {
    return null;
  }
  return (
    <div className="font-mono text-[11px] text-destructive">
      {props.errors.join(", ")}
    </div>
  );
}

export function DescriptionFieldTemplate(props: DescriptionFieldProps) {
  if (!props.description) {
    return null;
  }
  return (
    <p id={props.id} className={descriptionTextClass}>
      {props.description}
    </p>
  );
}

export function TitleFieldTemplate(props: TitleFieldProps) {
  const { id, title, required } = props;
  if (!title) {
    return null;
  }
  return (
    <div id={id} className="font-mono text-xs text-muted-foreground">
      {title}
      {required && <span className="ml-1 text-destructive">*</span>}
    </div>
  );
}

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { fieldPathId, properties, disabled, title, required, schema } = props;
  // rjsf v6 passes `fieldPathId` (renamed from v5's `idSchema`).
  const isRoot = fieldPathId.$id === "root";
  const description = schema.description;

  return (
    <div
      className={cn(
        "flex flex-col",
        isRoot ? "gap-6" : "gap-5 border-l border-border pl-2.5",
      )}
    >
      {!isRoot && title && (
        <FieldLabel
          label={title}
          required={required}
          description={description}
          className="font-mono text-xs text-muted-foreground"
        />
      )}
      {/* No title to hang the tooltip on — keep the description inline. */}
      {!isRoot && !title && description && (
        <p className={descriptionTextClass}>{description}</p>
      )}
      {properties
        .filter((p) => !p.hidden)
        .map((p) => (
          <div key={p.name} aria-disabled={disabled || undefined}>
            {p.content}
          </div>
        ))}
    </div>
  );
}

export function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const {
    items,
    canAdd,
    onAddClick,
    disabled,
    readonly,
    title,
    required,
    schema,
  } = props;
  const description = schema.description;
  return (
    <div className="flex flex-col gap-1.5">
      {title && (
        <FieldLabel
          label={title}
          required={required}
          description={description}
          className="font-mono text-xs text-muted-foreground"
        />
      )}
      {/* No title to hang the tooltip on — keep the description inline. */}
      {!title && description && (
        <p className={descriptionTextClass}>{description}</p>
      )}
      {/* rjsf v6: items is ReactElement[] (pre-rendered ArrayFieldItemTemplate). */}
      {items}
      {canAdd && (
        <button
          type="button"
          className={cn(ghostButtonClass, "self-start")}
          onClick={onAddClick}
          disabled={disabled || readonly}
        >
          <Plus className="size-3" />
          add
        </button>
      )}
    </div>
  );
}

export function ArrayFieldItemTemplate(props: ArrayFieldItemTemplateProps) {
  const { children, index, buttonsProps, hasToolbar } = props;
  const { hasRemove, onRemoveItem, disabled, readonly } = buttonsProps;
  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-1 select-none font-mono text-[11px] text-muted-foreground/50">
        [{index}]
      </span>
      <div className="flex-1 min-w-0">{children}</div>
      {hasToolbar && hasRemove && (
        <button
          type="button"
          className={cn(ghostButtonClass, "mt-0.5 px-1")}
          onClick={onRemoveItem}
          disabled={disabled || readonly}
          aria-label={`Remove item ${index}`}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

function AddButton(props: IconButtonProps) {
  const {
    icon: _icon,
    iconType: _iconType,
    registry: _registry,
    uiSchema: _uiSchema,
    ...rest
  } = props;
  return (
    <button type="button" className={ghostButtonClass} {...rest}>
      <Plus className="size-3" />
      add
    </button>
  );
}

function RemoveButton(props: IconButtonProps) {
  const {
    icon: _icon,
    iconType: _iconType,
    registry: _registry,
    uiSchema: _uiSchema,
    ...rest
  } = props;
  return (
    <button
      type="button"
      className={cn(ghostButtonClass, "px-1")}
      aria-label="Remove"
      {...rest}
    >
      <X className="size-3" />
    </button>
  );
}

function HiddenButton() {
  return null;
}

export const formButtonTemplates = {
  AddButton,
  RemoveButton,
  CopyButton: HiddenButton,
  MoveDownButton: HiddenButton,
  MoveUpButton: HiddenButton,
  ClearButton: HiddenButton,
};
