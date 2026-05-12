import type { CSSProperties, SVGProps } from "react";

export type IconName =
  | "github"
  | "arrow"
  | "copy"
  | "check"
  | "zap"
  | "type"
  | "globe"
  | "sparkle"
  | "react"
  | "shield"
  | "terminal"
  | "sun"
  | "moon"
  | "discord"
  | "play"
  | "refresh"
  | "book"
  | "wand"
  | "puzzle";

export function Icon({
  name,
  size = 18,
  stroke = 1.6,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
}) {
  const s: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const oneStroke: CSSProperties = { strokeWidth: "1px" };
  switch (name) {
    case "github":
      return (
        <svg {...s} fill="currentColor" stroke="none">
          <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.93c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.28 1.19-3.08-.12-.3-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.77.12 3.06.74.8 1.19 1.82 1.19 3.08 0 4.43-2.7 5.4-5.26 5.69.41.35.77 1.05.77 2.12v3.14c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...s}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "copy":
      return (
        <svg {...s}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h9" />
        </svg>
      );
    case "check":
      return (
        <svg {...s}>
          <path d="M5 12l5 5L20 7" />
        </svg>
      );
    case "zap":
      return (
        <svg {...s}>
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      );
    case "type":
      return (
        <svg {...s}>
          <path d="M4 7V5h16v2M9 5v14M15 5v14M9 19h6" style={oneStroke} />
        </svg>
      );
    case "globe":
      return (
        <svg {...s} style={oneStroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...s}>
          <path d="M12 3v4M12 17v4M5 12H1M23 12h-4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
        </svg>
      );
    case "react":
      return (
        <svg {...s} style={oneStroke}>
          <circle cx="12" cy="12" r="2" />
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="4"
            transform="rotate(60 12 12)"
            style={oneStroke}
          />
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="4"
            transform="rotate(120 12 12)"
          />
        </svg>
      );
    case "shield":
      return (
        <svg {...s}>
          <path d="M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z" />
        </svg>
      );
    case "terminal":
      return (
        <svg {...s} style={oneStroke}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 9l3 3-3 3M13 15h4" />
        </svg>
      );
    case "sun":
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case "moon":
      return (
        <svg {...s}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
          <path d="M19.54 5.34A17.5 17.5 0 0 0 15 4l-.2.4a14.6 14.6 0 0 1 4 1.86c-3.7-2-8.6-2-12.4 0A14.6 14.6 0 0 1 10.3 4.4L10 4c-1.6.2-3.1.6-4.6 1.3A19 19 0 0 0 2 17c1.7 1.2 3.4 2 5 2.5l.8-1.1c-.8-.3-1.6-.7-2.3-1.2l.5-.4c3.5 1.6 7.3 1.6 10.8 0l.5.4c-.7.5-1.5.9-2.3 1.2l.8 1.1c1.6-.5 3.3-1.3 5-2.5a19 19 0 0 0-3.4-11.7zM9.1 14.8c-.9 0-1.7-.9-1.7-2s.7-2 1.7-2 1.7.9 1.7 2-.7 2-1.7 2zm5.8 0c-.9 0-1.7-.9-1.7-2s.7-2 1.7-2 1.7.9 1.7 2-.7 2-1.7 2z" />
        </svg>
      );
    case "play":
      return (
        <svg {...s}>
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...s}>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
        </svg>
      );
    case "book":
      return (
        <svg {...s} style={oneStroke}>
          <path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4zM4 16a4 4 0 0 1 4-4h10" />
        </svg>
      );
    case "wand":
      return (
        <svg {...s} style={oneStroke}>
          <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5" />
        </svg>
      );
    case "puzzle":
      return (
        <svg {...s}>
          <path d="M9 4a2 2 0 0 1 4 0v2h4v4a2 2 0 1 1 0 4v4H9v-4a2 2 0 1 0 0-4h0V6h0z" />
        </svg>
      );
    default:
      return null;
  }
}
