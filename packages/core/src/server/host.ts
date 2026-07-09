export type HostKind = "openai" | "claude" | "unknown";

export function hostFromUserAgent(userAgent: string | undefined): HostKind {
  const ua = (userAgent ?? "").toLowerCase();
  if (ua.includes("openai") || ua.includes("chatgpt")) {
    return "openai";
  }
  if (ua === "claude-user") {
    return "claude";
  }
  return "unknown";
}
