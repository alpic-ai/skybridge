import type { ReactNode } from "react";

export default function Doc({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 type-text-xs text-muted-foreground mt-auto">
      <svg
        viewBox="0 0 90 90"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Skybridge"
        className="size-4 shrink-0 mt-0.5"
      >
        <path
          d="M17.2704 89.9987C37.5976 24.3967 65.182 12.9084 89.9996 35.3807V84.1606C89.9996 87.3849 87.3858 89.9987 84.1615 89.9987H17.2704ZM84.1615 0C87.3858 0 89.9996 2.6139 89.9996 5.83819V30.9146C52.0566 -5.26767 14.9006 31.2366 0.000976562 57.6768V5.83819C0.00104114 2.6139 2.61486 2.23904e-08 5.83917 0H84.1615Z"
          fill="currentColor"
        />
      </svg>
      <span>{children}</span>
    </p>
  );
}
