"use client";
import {
  type CSSProperties,
  type ElementType,
  type ReactNode,
  useState,
} from "react";

type Props = {
  options?: ReactNode[];
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export function CopyOption({
  options,
  as: Tag = "span",
  className = "",
  style,
  children,
}: Props) {
  const [index, setIndex] = useState(0);
  const list: ReactNode[] = options?.length ? options : [children];
  const next = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIndex((current) => (current + 1) % list.length);
  };
  const hasMulti = list.length > 1;
  return (
    <Tag className={`sb-copt ${className}`.trim()} style={style}>
      <span className="sb-copt-body">{list[index]}</span>
      {hasMulti && (
        <button
          type="button"
          className="sb-copt-toggle"
          onClick={next}
          title={`Cycle option (${index + 1}/${list.length})`}
          aria-label="Cycle copy option"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 4h7l-2-2M10 8H3l2 2"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="sb-copt-index">
            {index + 1}/{list.length}
          </span>
        </button>
      )}
    </Tag>
  );
}
