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
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils.js";
import {
  denseInputClass,
  descriptionTextClass,
  ghostButtonClass,
} from "./styles.js";

function TruncatedDescription({ id, text }: { id?: string; text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: text is a trigger — reset expanded whenever the prop changes
  useEffect(() => {
    setExpanded(false);
  }, [text]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: text is a trigger — re-check clamping whenever the prop changes
  useEffect(() => {
    if (!expanded) {
      const element = spanRef.current;
      if (element) {
        setIsClamped(element.scrollHeight > element.clientHeight);
      }
    }
  }, [expanded, text]);

  return (
    <p id={id} className={descriptionTextClass}>
      <span ref={spanRef} className={expanded ? undefined : "line-clamp-3"}>
        {text}
      </span>
      {isClamped && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-1 text-[10px] text-muted-foreground underline"
        >
          {expanded ? "see less" : "see more"}
        </button>
      )}
    </p>
  );
}

export function BaseInputTemplate(props: BaseInputTemplateProps) {
  const {
    id,
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
  const showHint = !rendersOwnTitle && Boolean(rawDescription);
  const hasError = (rawErrors?.length ?? 0) > 0;

  return (
    <div className={cn("flex flex-col gap-1", classNames)} style={style}>
      {showLabel && (
        <label
          htmlFor={id}
          className={cn(
            "font-mono text-xs text-muted-foreground",
            hasError && "text-destructive",
          )}
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      {showHint && <TruncatedDescription text={rawDescription as string} />}
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
  return typeof props.description === "string" ? (
    <TruncatedDescription id={props.id} text={props.description} />
  ) : (
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
  const { fieldPathId, properties, description, disabled, title, required } =
    props;
  // rjsf v6 passes `fieldPathId` (renamed from v5's `idSchema`).
  const isRoot = fieldPathId.$id === "root";

  return (
    <div
      className={cn(
        "flex flex-col",
        isRoot ? "gap-6" : "gap-5 border-l border-border pl-2.5",
      )}
    >
      {!isRoot && title && (
        <div className="font-mono text-xs text-muted-foreground">
          {title}
          {required && <span className="ml-1 text-destructive">*</span>}
        </div>
      )}
      {!isRoot &&
        description &&
        (typeof description === "string" ? (
          <TruncatedDescription text={description} />
        ) : (
          <p className={descriptionTextClass}>{description}</p>
        ))}
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
        <div className="font-mono text-xs text-muted-foreground">
          {title}
          {required && <span className="ml-1 text-destructive">*</span>}
        </div>
      )}
      {description && <TruncatedDescription text={description} />}
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
