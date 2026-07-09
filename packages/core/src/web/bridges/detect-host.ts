import type { Host, HostName } from "./types.js";

type DetectHostOptions = {
  userAgent?: string;
  hostInfoName?: string;
  hasOpenAI: boolean;
};

const HOSTS: Record<HostName, Host> = {
  chatgpt: { name: "chatgpt" },
  claude: { name: "claude" },
  cursor: { name: "cursor" },
  goose: { name: "goose" },
  alpic: { name: "alpic" },
  other: { name: "other" },
};

function normalizeSignal(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function detectHostNameFromSignal(signal: string): HostName | null {
  if (!signal) {
    return null;
  }

  if (signal.includes("alpic")) {
    return "alpic";
  }

  if (signal.includes("claude") || signal.includes("anthropic")) {
    return "claude";
  }

  if (signal.includes("cursor")) {
    return "cursor";
  }

  if (signal.includes("goose")) {
    return "goose";
  }

  if (signal.includes("chatgpt") || signal === "openai") {
    return "chatgpt";
  }

  return null;
}

export function detectHost(options: DetectHostOptions): Host {
  const fromUserAgent = detectHostNameFromSignal(
    normalizeSignal(options.userAgent),
  );
  if (fromUserAgent) {
    return HOSTS[fromUserAgent];
  }

  const fromHostInfo = detectHostNameFromSignal(
    normalizeSignal(options.hostInfoName),
  );
  if (fromHostInfo) {
    return HOSTS[fromHostInfo];
  }

  if (options.hasOpenAI) {
    return HOSTS.chatgpt;
  }

  return HOSTS.other;
}
